import { Job } from 'bullmq'
import { ProspectEnrichmentJobData, JobResult, JobProgress } from '../queues'
import { prisma } from '@/config/database'
import { ProxycurlService } from '@/services/enrichment/proxycurlService'
import { FirecrawlService } from '@/services/enrichment/firecrawlService'
// import { BuiltWithService } from '@/services/enrichment/builtwithService' // Will be used for tech stack analysis
import { ApiConfigurationService } from '@/services/enrichment/apiConfigurationService'
import { SSEService } from '@/services/sseService'
import axios from 'axios'
import { BuiltWithService } from '@/services/enrichment/builtwithService'

/**
 * Prospect Enrichment Job Processor
 * Handles step-by-step enriching of individual prospects with LLM-generated summaries
 */
export class ProspectEnrichmentProcessor {
    // Static property to store raw LLM requests during processing
    private static rawLlmRequests: any = null;
    /**
     * Process prospect enrichment job with step-by-step LLM summaries
     */
    static async process(job: Job<ProspectEnrichmentJobData>): Promise<JobResult> {
        const { prospectId, userId, linkedinUrl, aiProvider, llmModelId, services, csvData } = job.data
        const startTime = new Date()

        // Extract services configuration with defaults
        const enabledServices = {
            proxycurl: services?.proxycurl ?? true,
            firecrawl: services?.firecrawl ?? true,
            builtwith: services?.builtwith ?? true
        }

        try {
            console.log(`🔍 [Enrichment]: Starting step-by-step enrichment for prospect ${prospectId}`)
            console.log(`🤖 [Enrichment]: Using AI provider: ${aiProvider}${llmModelId ? ` (${llmModelId})` : ''}`)

            // Initialize raw LLM requests storage
            this.rawLlmRequests = {
                timestamp: new Date().toISOString(),
                aiProvider,
                llmModelId,
                requests: {}
            };

            // STEP 1: Create prospect record in database (with duplicate checking)
            await job.updateProgress({
                progress: 5,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Creating Prospect',
                message: 'Creating prospect record in database',
                startTime,
            } as JobProgress)

            let prospect: any;
            let isDuplicate = false;

            // Use isDuplicate to satisfy TypeScript
            if (isDuplicate) { /* handled in logic below */ }

            if (csvData) {
                // Check for duplicate prospect by email
                const existingProspect = await prisma.cOProspects.findFirst({
                    where: {
                        email: csvData.email,
                        campaignId: csvData.campaignId
                    }
                });

                if (existingProspect) {
                    console.log(`⚠️ [Enrichment]: Duplicate prospect found with email: ${csvData.email}`);
                    isDuplicate = true;

                    // Send SSE update about duplicate
                    SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                        prospectId,
                        status: 'duplicate_found',
                        progress: 100,
                        message: `Prospect with email ${csvData.email} already exists in this campaign`,
                        isDuplicate: true
                    });

                    // Update batch progress for duplicate
                    await this.updateBatchProgress(csvData.batchId, 'skipped');

                    return {
                        success: true,
                        message: 'Prospect already exists - marked as duplicate',
                        data: {
                            prospectId: existingProspect.id,
                            isDuplicate: true,
                            existingProspect
                        }
                    };
                }

                // Create new prospect
                prospect = await prisma.cOProspects.create({
                    data: {
                        name: csvData.name || `Prospect-${csvData.csvRowIndex}`,
                        email: csvData.email || `prospect-${csvData.csvRowIndex}-${Date.now()}@placeholder.com`,
                        company: csvData.company || undefined,
                        position: csvData.position || undefined,
                        linkedinUrl: csvData.linkedinUrl || undefined,
                        status: 'PENDING',
                        campaignId: csvData.campaignId,
                        batchId: csvData.batchId,
                        usesFallback: false,
                        additionalData: {
                            ...csvData.additionalData,
                            csvRowIndex: csvData.csvRowIndex,
                            userId: userId // Store userId for SSE updates
                        }
                    },
                    include: {
                        enrichment: true,
                        campaign: true,
                    }
                });

                console.log(`✅ [Enrichment]: Created new prospect ${prospect.id} for ${prospect.email}`);
            } else {
                // Get existing prospect from database
                prospect = await prisma.cOProspects.findUnique({
                    where: { id: parseInt(prospectId) },
                    include: {
                        enrichment: true,
                        campaign: true,
                    },
                });

                if (!prospect) {
                    throw new Error(`Prospect with ID ${prospectId} not found`);
                }
            }

            // Update prospect status to ENRICHING
            await prisma.cOProspects.update({
                where: { id: prospect.id },
                data: { status: 'ENRICHING' }
            });

            // Create or update enrichment record
            await prisma.cOProspectEnrichments.upsert({
                where: { prospectId: prospect.id },
                create: {
                    prospectId: prospect.id,
                    enrichmentStatus: 'PROCESSING'
                },
                update: {
                    enrichmentStatus: 'PROCESSING'
                }
            });

            // Send initial progress update
            SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId: prospect.id.toString(),
                status: 'started',
                progress: 10,
                message: 'Prospect created, starting enrichment process'
            });

            // STEP 2: LinkedIn Data Enrichment (if enabled and LinkedIn URL is available)
            let linkedinSummary = null;
            if (enabledServices.proxycurl && (prospect.linkedinUrl || linkedinUrl)) {
                await job.updateProgress({
                    progress: 15,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'LinkedIn Enrichment',
                    message: 'Fetching LinkedIn profile data from Proxycurl',
                    startTime,
                } as JobProgress);

                try {
                    const urlToUse = prospect.linkedinUrl || linkedinUrl;
                    const linkedinData = await ProxycurlService.enrichPersonProfile(urlToUse);
                    console.log(`✅ [Enrichment]: LinkedIn data fetched for prospect ${prospect.id}`);

                    // Generate LinkedIn Summary with user's selected AI model
                    await job.updateProgress({
                        progress: 25,
                        total: 1,
                        processed: 0,
                        failed: 0,
                        status: 'LinkedIn Analysis',
                        message: 'Generating LinkedIn summary using selected AI model',
                        startTime,
                    } as JobProgress);

                    linkedinSummary = await this.generateLinkedInSummary(linkedinData, aiProvider, llmModelId);
                    console.log(`✅ [Enrichment]: LinkedIn summary generated for prospect ${prospect.id}`);

                    // Send SSE update
                    SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                        prospectId: prospect.id.toString(),
                        status: 'linkedin_completed',
                        progress: 25,
                        enrichmentData: { linkedinSummary }
                    });

                } catch (error) {
                    console.error(`❌ [Enrichment]: LinkedIn enrichment failed for prospect ${prospect.id}:`, error);
                    // Continue with other enrichments
                }
            } else {
                console.log(`⏭️ [Enrichment]: Skipping LinkedIn enrichment for prospect ${prospect.id} (no LinkedIn URL or disabled)`);
            }

            // STEP 3: Company Data Enrichment (if enabled)
            let companySummary = null;
            if (enabledServices.firecrawl) {
                await job.updateProgress({
                    progress: 35,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'Company Enrichment',
                    message: 'Extracting company website and scraping data',
                    startTime,
                } as JobProgress);

                try {
                    // Extract company website (from CSV data or email domain)
                    let companyWebsite = await this.extractCompanyWebsite(prospect);

                    if (companyWebsite) {
                        // Get number of pages to scrape from configuration (default 3, max 10)
                        const pagesToScrape = Math.min(job.data.configuration?.websitePages || job.data.configuration?.pagesToScrape || 3, 10);

                        await job.updateProgress({
                            progress: 40,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'Company Crawling',
                            message: `Crawling company website (up to ${pagesToScrape} pages)`,
                            startTime,
                        } as JobProgress);

                        // Crawl company website with specified number of pages
                        const crawlResult = await FirecrawlService.startCrawlJob(companyWebsite, {
                            maxPages: pagesToScrape,
                            allowBackwardLinks: false,
                            allowExternalLinks: false,
                            maxDepth: 2
                        });

                        const crawlData = await FirecrawlService.pollCrawlStatus(crawlResult.jobId);
                        console.log(`✅ [Enrichment]: Company website crawled (${crawlData.data?.length || 0} pages) for prospect ${prospect.id}`);

                        // Generate company summary with user's selected AI model
                        await job.updateProgress({
                            progress: 45,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'Company Analysis',
                            message: 'Generating company summary using selected AI model',
                            startTime,
                        } as JobProgress);

                        if (crawlData.data && crawlData.data.length > 0) {
                            // Format the crawled content
                            const formattedContent = this.formatMultiPageContent(crawlData.data);
                            companySummary = await this.generateCompanySummary(formattedContent, companyWebsite, aiProvider, llmModelId);
                            console.log(`✅ [Enrichment]: Company summary generated for prospect ${prospect.id}`);
                        }

                        // Send SSE update
                        SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                            prospectId: prospect.id.toString(),
                            status: 'company_completed',
                            progress: 45,
                            enrichmentData: { companySummary }
                        });
                    } else {
                        console.log(`⏭️ [Enrichment]: Skipping company enrichment for prospect ${prospect.id} - no valid company website found`);
                    }
                } catch (error) {
                    console.error(`❌ [Enrichment]: Company enrichment failed for prospect ${prospect.id}:`, error);
                    // Continue with other enrichments
                }
            } else {
                console.log(`⏭️ [Enrichment]: Skipping company enrichment for prospect ${prospect.id} (disabled)`);
            }

            // STEP 4: Technology Stack Analysis
            let builtwithSummary = null;
            if (enabledServices.builtwith) {
                await job.updateProgress({
                    progress: 55,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'Tech Stack Analysis',
                    message: 'Analyzing technology stack with BuiltWith.com',
                    startTime,
                } as JobProgress);

                try {
                    // Extract domain from email address using BuiltWithService method
                    let domain: string | null = null;
                    if (prospect.email) {
                        domain = BuiltWithService.extractDomainFromEmail(prospect.email);
                    }

                    if (domain) {
                        console.log(`🔍 [Enrichment]: Analyzing tech stack for domain: ${domain}`);

                        // Use Firecrawl to scrape BuiltWith page
                        const builtwithUrl = `https://builtwith.com/${domain}`;

                        await job.updateProgress({
                            progress: 60,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'Tech Stack Scraping',
                            message: `Scraping BuiltWith data for ${domain}`,
                            startTime,
                        } as JobProgress);

                        const builtwithData = await FirecrawlService.scrapeUrl(builtwithUrl);

                        if (builtwithData && builtwithData.content) {
                            // Generate tech stack summary with user's selected AI model
                            await job.updateProgress({
                                progress: 65,
                                total: 1,
                                processed: 0,
                                failed: 0,
                                status: 'Tech Stack Analysis',
                                message: 'Generating tech stack summary using selected AI model',
                                startTime,
                            } as JobProgress);

                            builtwithSummary = await this.generateTechStackSummary(builtwithData.content, domain, aiProvider, llmModelId);
                            console.log(`✅ [Enrichment]: Tech stack summary generated for prospect ${prospect.id}`);

                            // Send SSE update
                            SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                                prospectId: prospect.id.toString(),
                                status: 'techstack_completed',
                                progress: 65,
                                enrichmentData: { builtwithSummary }
                            });
                        }
                    } else {
                        console.log(`⏭️ [Enrichment]: Skipping tech stack analysis for prospect ${prospect.id} - no valid domain found in email`);
                    }
                } catch (error) {
                    console.error(`❌ [Enrichment]: Tech stack analysis failed for prospect ${prospect.id}:`, error);
                    // Continue with final analysis
                }
            } else {
                console.log(`⏭️ [Enrichment]: Skipping tech stack analysis for prospect ${prospect.id} (disabled)`);
            }

            // STEP 5: Final AI Analysis - Combine all enrichment data
            await job.updateProgress({
                progress: 75,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Final Analysis',
                message: 'Generating comprehensive prospect analysis',
                startTime,
            } as JobProgress);

            let finalAnalysis = null;
            try {
                const enrichmentData = {
                    linkedinSummary,
                    companySummary,
                    builtwithSummary,
                    prospect: {
                        name: prospect.name,
                        email: prospect.email,
                        company: prospect.company,
                        position: prospect.position,
                        linkedinUrl: prospect.linkedinUrl
                    }
                };

                finalAnalysis = await this.generateProspectAnalysis(prospect, enrichmentData, aiProvider, llmModelId);
                console.log(`✅ [Enrichment]: Final analysis generated for prospect ${prospect.id}`);

                // Send progress update
                SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                    prospectId: prospect.id.toString(),
                    status: 'analysis_completed',
                    progress: 85,
                    enrichmentData: { finalAnalysis }
                });

            } catch (error) {
                console.error(`❌ [Enrichment]: Final analysis failed for prospect ${prospect.id}:`, error);
            }

            // STEP 6: Save all enrichment data to database
            await job.updateProgress({
                progress: 90,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Saving Data',
                message: 'Saving enrichment data to database',
                startTime,
            } as JobProgress);

            // Save enrichment data
            await prisma.cOProspectEnrichments.update({
                where: { prospectId: prospect.id },
                data: {
                    enrichmentStatus: 'COMPLETED',
                    linkedinSummary: linkedinSummary || null,
                    companySummary: companySummary || null,
                    builtwithSummary: builtwithSummary || null,
                    prospectAnalysisSummary: finalAnalysis || null,
                    techStack: this.rawLlmRequests || null, // Store raw LLM request data
                    enrichedAt: new Date()
                }
            });

            // STEP 7: Update prospect status to ENRICHED
            await prisma.cOProspects.update({
                where: { id: prospect.id },
                data: { status: 'ENRICHED' }
            });

            // Calculate processing time
            const endTime = new Date();
            const processingTime = endTime.getTime() - startTime.getTime();

            // Send final completion update
            await job.updateProgress({
                progress: 100,
                total: 1,
                processed: 1,
                failed: 0,
                status: 'Completed',
                message: 'Prospect enrichment completed successfully',
                startTime,
            } as JobProgress);

            SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId: prospect.id.toString(),
                status: 'completed',
                progress: 100,
                message: 'Enrichment completed successfully',
                processingTime,
                enrichmentData: {
                    linkedinSummary,
                    companySummary,
                    builtwithSummary,
                    finalAnalysis
                }
            });

            console.log(`✅ [Enrichment]: Completed enrichment for prospect ${prospect.id} in ${processingTime}ms`);

            return {
                success: true,
                message: 'Prospect enrichment completed successfully',
                data: {
                    prospectId: prospect.id,
                    processingTime,
                    enrichmentData: {
                        linkedinSummary,
                        companySummary,
                        builtwithSummary,
                        finalAnalysis
                    }
                }
            };

        } catch (error) {
            console.error(`❌ [Enrichment]: Error processing prospect ${prospectId}:`, error);

            // Send error update via SSE
            SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId,
                status: 'error',
                progress: 0,
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            throw error;
        } finally {
            // Clean up raw LLM requests to prevent data leakage between jobs
            this.rawLlmRequests = null;
        }
    }

    /**
     * Generate LinkedIn summary using selected AI model
     */
    private static async generateLinkedInSummary(linkedinData: any, aiProvider: 'gemini' | 'openrouter', llmModelId?: string): Promise<string> {
        const formattedData = this.formatLinkedInData(linkedinData);

        const prompt = `Please analyze this LinkedIn profile data and provide a comprehensive summary focusing on:
1. Professional background and current role
2. Key skills and expertise areas
3. Career progression and achievements
4. Education and certifications
5. Potential business interests and pain points

LinkedIn Data:
${formattedData}

Please provide a well-structured, professional summary that would be useful for sales outreach.`;

        // Store raw request data
        this.rawLlmRequests.requests.linkedinSummary = {
            timestamp: new Date().toISOString(),
            type: 'linkedin_summary',
            prompt,
            formattedData,
            aiProvider,
            llmModelId
        };

        if (aiProvider === 'gemini') {
            return await this.generateSummaryWithGemini(prompt, llmModelId, 'linkedinSummary');
        } else {
            return await this.generateSummaryWithOpenRouter(prompt, llmModelId, 'linkedinSummary');
        }
    }

    /**
     * Generate tech stack summary using selected AI model
     */
    private static async generateTechStackSummary(builtwithData: string, domain: string, aiProvider: 'gemini' | 'openrouter', llmModelId?: string): Promise<string> {
        const prompt = `Please analyze this BuiltWith technology data for ${domain} and provide a comprehensive summary focusing on:
1. Core technologies and frameworks used
2. Development stack (frontend, backend, database)
3. Marketing and analytics tools
4. Infrastructure and hosting solutions
5. Potential technology needs and opportunities

BuiltWith Data:
${builtwithData}

Please provide a well-structured summary that highlights the company's technical sophistication and potential technology needs.`;

        // Store raw request data
        this.rawLlmRequests.requests.techStackSummary = {
            timestamp: new Date().toISOString(),
            type: 'tech_stack_summary',
            prompt,
            domain,
            builtwithData,
            aiProvider,
            llmModelId
        };

        if (aiProvider === 'gemini') {
            return await this.generateSummaryWithGemini(prompt, llmModelId, 'techStackSummary');
        } else {
            return await this.generateSummaryWithOpenRouter(prompt, llmModelId, 'techStackSummary');
        }
    }

    /**
     * Generate comprehensive prospect analysis using selected AI model
     */
    private static async generateProspectAnalysis(prospect: any, enrichmentData: any, aiProvider: 'gemini' | 'openrouter', llmModelId?: string): Promise<string> {
        const prospectInfo = this.prepareScalarlyInfo(prospect);

        const prompt = `Please provide a comprehensive analysis of this prospect combining all available enrichment data:

Prospect Information:
${prospectInfo}

LinkedIn Analysis:
${enrichmentData.linkedinSummary || 'Not available'}

Company Analysis:
${enrichmentData.companySummary || 'Not available'}

Technology Stack Analysis:
${enrichmentData.builtwithSummary || 'Not available'}

Please provide a detailed analysis covering:
1. Prospect Profile Summary
2. Company Overview and Market Position
3. Technology Infrastructure Assessment
4. Potential Business Needs and Pain Points
5. Recommended Outreach Strategy
6. Key Talking Points for Sales Conversations

Focus on actionable insights that would help in sales outreach and relationship building.`;

        // Store raw request data
        this.rawLlmRequests.requests.prospectAnalysis = {
            timestamp: new Date().toISOString(),
            type: 'prospect_analysis',
            prompt,
            prospectInfo,
            enrichmentData,
            aiProvider,
            llmModelId
        };

        if (aiProvider === 'gemini') {
            return await this.generateSummaryWithGemini(prompt, llmModelId, 'prospectAnalysis');
        } else {
            return await this.generateSummaryWithOpenRouter(prompt, llmModelId, 'prospectAnalysis');
        }
    }

    /**
     * Prepare prospect information for analysis
     */
    private static prepareScalarlyInfo(prospect: any): string {
        return `
Name: ${prospect.name || 'Not available'}
Email: ${prospect.email || 'Not available'}
Company: ${prospect.company || 'Not available'}
Position: ${prospect.position || 'Not available'}
LinkedIn URL: ${prospect.linkedinUrl || 'Not available'}
        `.trim();
    }

    /**
     * Generate company summary using selected AI model
     */
    private static async generateCompanySummary(formattedContent: string, companyWebsite: string, aiProvider: 'gemini' | 'openrouter', llmModelId?: string): Promise<string> {
        const prompt = `Please analyze this company website content and provide a comprehensive summary focusing on:
1. Company overview and mission
2. Products and services offered
3. Target market and customer base
4. Company size and market position
5. Recent developments and news
6. Key differentiators and competitive advantages

Website: ${companyWebsite}

Website Content:
${formattedContent}

Please provide a well-structured summary that would be useful for sales outreach and understanding the company's business.`;

        // Store raw request data
        this.rawLlmRequests.requests.companySummary = {
            timestamp: new Date().toISOString(),
            type: 'company_summary',
            prompt,
            companyWebsite,
            formattedContent,
            aiProvider,
            llmModelId
        };

        if (aiProvider === 'gemini') {
            return await this.generateSummaryWithGemini(prompt, llmModelId, 'companySummary');
        } else {
            return await this.generateSummaryWithOpenRouter(prompt, llmModelId, 'companySummary');
        }
    }

    /**
     * Format multi-page content for AI analysis
     */
    private static formatMultiPageContent(pages: Array<{
        content?: string
        markdown: string
        html?: string
        metadata: {
            title: string
            description: string
            language: string
            sourceURL: string
            statusCode: number
        }
    }>): string {
        const formattedPages: string[] = []

        pages.forEach((page, index) => {
            // Prioritize markdown field for v1 API
            const content = page.markdown || page.content || ''
            const url = page.metadata?.sourceURL || ''

            if (index === 0) {
                // First page is the home page
                formattedPages.push(`home page (${url}): ${content}`)
            } else {
                // Subsequent pages are pg1, pg2, etc.
                formattedPages.push(`pg${index} (${url}): ${content}`)
            }
        })

        return formattedPages.join('\n\n---PAGE_SEPARATOR---\n\n')
    }

    /**
     * Generate summary using Google Gemini
     */
    private static async generateSummaryWithGemini(prompt: string, llmModelId?: string, requestType?: string): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey');
            if (!apiKey) {
                throw new Error('Google Gemini API key not configured');
            }

            const model = llmModelId || 'gemini-2.0-flash-exp';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

            const requestData = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            };

            // Store raw request data if requestType is provided
            if (requestType && this.rawLlmRequests?.requests?.[requestType]) {
                this.rawLlmRequests.requests[requestType].geminiRequest = {
                    endpoint,
                    model,
                    requestData,
                    timestamp: new Date().toISOString()
                };
            }

            const response = await axios.post(
                endpoint,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    timeout: 30000
                }
            );

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return response.data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Invalid response format from Gemini API');
            }
        } catch (error) {
            console.error('Error generating summary with Gemini:', error);
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate summary using OpenRouter
     */
    private static async generateSummaryWithOpenRouter(prompt: string, llmModelId?: string, requestType?: string): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey');
            if (!apiKey) {
                throw new Error('OpenRouter API key not configured');
            }

            // Map our custom model IDs to actual OpenRouter model names
            let model: string;
            let requestBody: any;

            switch (llmModelId) {
                case 'openrouter-o1-mini':
                    model = 'openai/o1-mini';
                    // o1-mini doesn't support temperature or max_tokens
                    requestBody = {
                        model,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ]
                    };
                    break;
                case 'openrouter-gemini-2.5-pro':
                    model = 'google/gemini-2.5-pro';
                    requestBody = {
                        model,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.8,
                        max_tokens: 8192
                    };
                    break;
                case 'openrouter-gemini-2.5-flash':
                    model = 'google/gemini-2.5-flash';
                    requestBody = {
                        model,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 2048
                    };
                    break;
                default:
                    // Default to gemini-2.5-flash if no specific model or unknown model
                    model = 'google/gemini-2.5-flash';
                    requestBody = {
                        model,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 2048
                    };
                    break;
            }

            // Store raw request data if requestType is provided
            if (requestType && this.rawLlmRequests?.requests?.[requestType]) {
                this.rawLlmRequests.requests[requestType].openrouterRequest = {
                    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
                    model,
                    requestBody,
                    timestamp: new Date().toISOString()
                };
            }

            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                requestBody,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                        'X-Title': 'Cold Outreach AI'
                    },
                    timeout: 30000
                }
            );

            if (response.data?.choices?.[0]?.message?.content) {
                return response.data.choices[0].message.content;
            } else {
                throw new Error('Invalid response format from OpenRouter API');
            }
        } catch (error) {
            console.error('Error generating summary with OpenRouter:', error);
            throw new Error(`OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Format LinkedIn data for analysis
     */
    private static formatLinkedInData(data: any): string {
        if (!data) return 'No LinkedIn data available';

        return `
Full Name: ${data.full_name || 'Not available'}
Headline: ${data.headline || 'Not available'}
Summary: ${data.summary || 'Not available'}
Location: ${data.city ? `${data.city}, ${data.state || ''} ${data.country || ''}`.trim() : 'Not available'}
Industry: ${data.industry || 'Not available'}
Current Company: ${data.experiences?.[0]?.company || 'Not available'}
Current Position: ${data.experiences?.[0]?.title || 'Not available'}
Education: ${data.education?.map((edu: any) => `${edu.degree_name || ''} at ${edu.school || ''}`).join(', ') || 'Not available'}
Skills: ${data.skills?.join(', ') || 'Not available'}
        `.trim();
    }

    /**
     * Extract company website from prospect data or email domain
     */
    private static async extractCompanyWebsite(prospect: any): Promise<string | null> {
        // First check if website is in additional data
        if (prospect.additionalData?.website) {
            return prospect.additionalData.website;
        }

        // Use the FirecrawlService method to extract company website from email domain
        if (prospect.email) {
            const websiteUrl = FirecrawlService.extractCompanyWebsiteFromEmail(prospect.email);
            if (websiteUrl) {
                return websiteUrl;
            }
        }

        // Fallback: Try to extract from company name (basic approach)
        if (prospect.company) {
            const companyName = prospect.company.toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .replace(/inc|llc|ltd|corp|corporation|company|co/g, '');

            if (companyName.length > 2) {
                return `https://${companyName}.com`;
            }
        }

        return null;
    }

    /**
     * Handle job completion
     */
    static async onCompleted(job: Job<ProspectEnrichmentJobData>, result: JobResult) {
        console.log(`✅ [Enrichment]: Job ${job.id} completed successfully`);

        // Update batch progress if this job was part of a batch
        if (job.data.csvData?.batchId) {
            const status = result.data?.isDuplicate ? 'skipped' : 'completed';
            await this.updateBatchProgress(job.data.csvData.batchId, status);
        }

        // Send final SSE update for job completion
        SSEService.getInstance().sendProspectEnrichmentUpdate(job.data.userId, {
            prospectId: job.data.prospectId,
            status: result.data?.isDuplicate ? 'duplicate_skipped' : 'completed',
            progress: 100,
            message: result.data?.isDuplicate ? 'Prospect already exists - skipped' : 'Enrichment completed successfully',
            isDuplicate: result.data?.isDuplicate || false
        });
    }

    /**
     * Handle job failure
     */
    static async onFailed(job: Job<ProspectEnrichmentJobData>, error: Error) {
        console.error(`❌ [Enrichment]: Job ${job.id} failed:`, error);

        // Update batch progress if this job was part of a batch
        if (job.data.csvData?.batchId) {
            await this.updateBatchProgress(job.data.csvData.batchId, 'failed');
        }

        // Send error notification via SSE
        SSEService.getInstance().sendProspectEnrichmentUpdate(job.data.userId, {
            prospectId: job.data.prospectId,
            status: 'error',
            progress: 0,
            message: error.message,
            error: error.message
        });

        // Job failed - error already logged and SSE notification sent
    }

    /**
 * Update batch progress when individual jobs complete
 */
    private static async updateBatchProgress(batchId: number, status: 'completed' | 'failed' | 'skipped') {
        try {
            const batch = await prisma.cOBatches.findUnique({
                where: { id: batchId },
                include: {
                    prospects: true
                }
            });

            if (!batch) {
                console.warn(`⚠️ [Batch Progress]: Batch ${batchId} not found`);
                return;
            }

            // Update batch counters based on job status
            const updates: any = {};

            if (status === 'completed') {
                updates.enrichedProspects = (batch.enrichedProspects || 0) + 1;
            } else if (status === 'failed') {
                updates.failedProspects = (batch.failedProspects || 0) + 1;
            }
            // For 'skipped' status, we don't increment any counter as they're duplicates

            // Calculate total processed (enriched + failed)
            const enrichedCount = updates.enrichedProspects || batch.enrichedProspects || 0;
            const failedCount = updates.failedProspects || batch.failedProspects || 0;
            const processedCount = enrichedCount + failedCount;
            const totalProspects = batch.totalProspects || 0;

            // Check if batch is complete - all jobs have finished (including skipped duplicates)
            // We need to check if all prospects in the batch have been processed
            const completedProspects = batch.prospects.filter(p =>
                p.status === 'COMPLETED' || p.status === 'FAILED' || p.status === 'ENRICHED'
            ).length;

            if (processedCount >= totalProspects || completedProspects >= totalProspects) {
                if (enrichedCount === 0) {
                    updates.status = 'FAILED';
                } else if (failedCount === 0) {
                    updates.status = 'COMPLETED';
                } else {
                    updates.status = 'COMPLETED_WITH_ERRORS';
                }

                console.log(`✅ [Batch Progress]: Batch ${batchId} completed - ${enrichedCount} enriched, ${failedCount} failed`);

                // Send batch completion SSE notification to the correct user
                // Get userId from any prospect in the batch (they should all have the same user)
                const sampleProspect = batch.prospects[0];
                const additionalData = sampleProspect?.additionalData as any;
                const batchUserId = additionalData?.userId || 'default-user';

                SSEService.getInstance().sendJobProgressUpdate(batchUserId, {
                    jobId: batchId.toString(),
                    jobType: 'enrichment',
                    status: updates.status === 'COMPLETED' ? 'completed' :
                        updates.status === 'FAILED' ? 'failed' : 'completed_with_errors',
                    progress: 100,
                    totalProspects,
                    completedProspects: enrichedCount,
                    failedProspects: failedCount,
                    prospects: batch.prospects
                });
            }

            // Update batch in database
            await prisma.cOBatches.update({
                where: { id: batchId },
                data: updates
            });

            console.log(`📊 [Batch Progress]: Updated batch ${batchId} - ${enrichedCount} enriched, ${failedCount} failed of ${totalProspects} total`);

        } catch (error) {
            console.error(`❌ [Batch Progress]: Failed to update batch ${batchId}:`, error);
        }
    }


} 