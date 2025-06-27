"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProspectEnrichmentProcessor = void 0;
const database_1 = require("@/config/database");
const proxycurlService_1 = require("@/services/enrichment/proxycurlService");
const firecrawlService_1 = require("@/services/enrichment/firecrawlService");
// import { BuiltWithService } from '@/services/enrichment/builtwithService' // Will be used for tech stack analysis
const apiConfigurationService_1 = require("@/services/enrichment/apiConfigurationService");
const sseService_1 = require("@/services/sseService");
const templateHelpers_1 = require("@/utils/templateHelpers");
const axios_1 = __importDefault(require("axios"));
const builtwithService_1 = require("@/services/enrichment/builtwithService");
/**
 * Prospect Enrichment Job Processor
 * Handles step-by-step enriching of individual prospects with LLM-generated summaries
 */
class ProspectEnrichmentProcessor {
    /**
     * Process prospect enrichment job with step-by-step LLM summaries
     */
    static async process(job) {
        const { prospectId, userId, linkedinUrl, aiProvider, llmModelId, services, csvData } = job.data;
        const startTime = new Date();
        // Extract services configuration with defaults
        const enabledServices = {
            proxycurl: services?.proxycurl ?? true,
            firecrawl: services?.firecrawl ?? true,
            builtwith: services?.builtwith ?? true
        };
        try {
            console.log(`🔍 [Enrichment]: Starting step-by-step enrichment for prospect ${prospectId}`);
            console.log(`🤖 [Enrichment]: Using AI provider: ${aiProvider}${llmModelId ? ` (${llmModelId})` : ''}`);
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
            });
            let prospect;
            let isExistingProspect = false;
            let existingProspectInfo = null;
            if (csvData) {
                // Check for duplicate prospect by email
                const existingProspect = await database_1.prisma.cOProspects.findFirst({
                    where: {
                        email: csvData.email,
                        campaignId: csvData.campaignId
                    },
                    include: {
                        enrichment: true,
                        campaign: true,
                    }
                });
                if (existingProspect) {
                    console.log(`⚠️ [Enrichment]: Existing prospect found with email: ${csvData.email}`);
                    isExistingProspect = true;
                    prospect = existingProspect;
                    // Prepare detailed existing prospect information
                    existingProspectInfo = {
                        prospectId: existingProspect.id,
                        enrichmentExists: !!existingProspect.enrichment,
                        enrichmentId: existingProspect.enrichment?.prospectId || null,
                        enrichmentRecord: existingProspect.enrichment || null
                    };
                    console.log(`✅ [Enrichment]: Using existing prospect ${prospect.id} for enrichment`);
                }
                else {
                    // Create new prospect
                    prospect = await database_1.prisma.cOProspects.create({
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
                }
            }
            else {
                // Get existing prospect from database
                prospect = await database_1.prisma.cOProspects.findUnique({
                    where: { id: parseInt(prospectId) },
                    include: {
                        enrichment: true,
                        campaign: true,
                    },
                });
                if (!prospect) {
                    throw new Error(`Prospect with ID ${prospectId} not found`);
                }
                // This is an existing prospect since we're processing by ID
                isExistingProspect = true;
                existingProspectInfo = {
                    prospectId: prospect.id,
                    enrichmentExists: !!prospect.enrichment,
                    enrichmentId: prospect.enrichment?.prospectId || null,
                    enrichmentRecord: prospect.enrichment || null
                };
            }
            // Update prospect status to ENRICHING
            await database_1.prisma.cOProspects.update({
                where: { id: prospect.id },
                data: { status: 'ENRICHING' }
            });
            // Create enrichment record ONLY if prospect is new (not existing)
            if (!isExistingProspect) {
                await database_1.prisma.cOProspectEnrichments.create({
                    data: {
                        prospectId: prospect.id,
                        enrichmentStatus: 'PROCESSING'
                    }
                });
                console.log(`✅ [Enrichment]: Created new enrichment record for prospect ${prospect.id}`);
            }
            else {
                // For existing prospects, update the enrichment status if record exists
                if (prospect.enrichment) {
                    await database_1.prisma.cOProspectEnrichments.update({
                        where: { prospectId: prospect.id },
                        data: { enrichmentStatus: 'PROCESSING' }
                    });
                    console.log(`✅ [Enrichment]: Updated existing enrichment record for prospect ${prospect.id}`);
                }
                else {
                    console.log(`⚠️ [Enrichment]: Existing prospect ${prospect.id} has no enrichment record, but we won't create a new one as per business rules`);
                }
            }
            // STEP 2: LinkedIn Data Enrichment (if enabled and LinkedIn URL is available)
            let linkedinSummary = null;
            if (enabledServices.proxycurl && (prospect.linkedinUrl || linkedinUrl)) {
                // Check if LinkedIn summary already exists for existing prospects
                if (isExistingProspect && existingProspectInfo?.enrichmentRecord?.linkedinSummary) {
                    console.log(`⏭️ [Enrichment]: LinkedIn summary already exists for prospect ${prospect.id}, skipping generation`);
                    linkedinSummary = existingProspectInfo.enrichmentRecord.linkedinSummary;
                }
                else {
                    await job.updateProgress({
                        progress: 15,
                        total: 1,
                        processed: 0,
                        failed: 0,
                        status: 'LinkedIn Enrichment',
                        message: 'Fetching LinkedIn profile data from Proxycurl',
                        startTime,
                    });
                    try {
                        const urlToUse = prospect.linkedinUrl || linkedinUrl;
                        const linkedinData = await proxycurlService_1.ProxycurlService.enrichPersonProfile(urlToUse, aiProvider, llmModelId);
                        console.log(`✅ [Enrichment]: LinkedIn data fetched for prospect ${prospect.id}`);
                        // Generate LinkedIn Summary with user's selected AI model
                        await job.updateProgress({
                            progress: 25,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'LinkedIn Analysis',
                            message: 'Generating LinkedIn profile summary using AI',
                            startTime,
                        });
                        linkedinSummary = await this.generateLinkedInSummary(linkedinData, aiProvider, llmModelId, isExistingProspect, existingProspectInfo);
                        console.log(`✅ [Enrichment]: LinkedIn summary generated for prospect ${prospect.id}`);
                    }
                    catch (error) {
                        console.error(`❌ [Enrichment]: LinkedIn enrichment failed for prospect ${prospect.id}:`, error);
                        // Continue with other enrichment steps
                    }
                }
            }
            else {
                console.log(`⏭️ [Enrichment]: LinkedIn enrichment disabled or no URL available for prospect ${prospect.id}`);
            }
            // STEP 3: Company Data Enrichment (if enabled)
            let companySummary = null;
            if (enabledServices.firecrawl) {
                // Check if company summary already exists for existing prospects
                if (isExistingProspect && existingProspectInfo?.enrichmentRecord?.companySummary) {
                    console.log(`⏭️ [Enrichment]: Company summary already exists for prospect ${prospect.id}, skipping generation`);
                    companySummary = existingProspectInfo.enrichmentRecord.companySummary;
                }
                else {
                    await job.updateProgress({
                        progress: 35,
                        total: 1,
                        processed: 0,
                        failed: 0,
                        status: 'Company Enrichment',
                        message: 'Analyzing company website with Firecrawl',
                        startTime,
                    });
                    try {
                        // Get company website from email domain only
                        const companyWebsite = await this.extractCompanyWebsite(prospect);
                        if (companyWebsite) {
                            console.log(`🌐 [Enrichment]: Company website found: ${companyWebsite}`);
                            const scrapedData = await firecrawlService_1.FirecrawlService.scrapeCompanyWebsite(companyWebsite);
                            console.log(`✅ [Enrichment]: Company website scraped for prospect ${prospect.id}`);
                            // Generate company summary
                            await job.updateProgress({
                                progress: 50,
                                total: 1,
                                processed: 0,
                                failed: 0,
                                status: 'Company Analysis',
                                message: 'Generating company summary using AI',
                                startTime,
                            });
                            // Convert CompanyWebsiteData to the format expected by formatMultiPageContent
                            const formattedPages = [{
                                    content: scrapedData.content,
                                    markdown: scrapedData.markdown || '',
                                    html: undefined,
                                    metadata: {
                                        title: scrapedData.title || '',
                                        description: scrapedData.description || '',
                                        language: scrapedData.metadata?.language || 'en',
                                        sourceURL: scrapedData.url,
                                        statusCode: scrapedData.metadata?.statusCode || 200
                                    }
                                }];
                            const formattedContent = this.formatMultiPageContent(formattedPages);
                            companySummary = await this.generateCompanySummary(formattedContent, companyWebsite, aiProvider, llmModelId, isExistingProspect, existingProspectInfo);
                            console.log(`✅ [Enrichment]: Company summary generated for prospect ${prospect.id}`);
                        }
                        else {
                            console.log(`⏭️ [Enrichment]: No company website found for prospect ${prospect.id}`);
                        }
                    }
                    catch (error) {
                        console.error(`❌ [Enrichment]: Company enrichment failed for prospect ${prospect.id}:`, error);
                        // Continue with other enrichment steps
                    }
                }
            }
            else {
                console.log(`⏭️ [Enrichment]: Company enrichment disabled for prospect ${prospect.id}`);
            }
            // STEP 4: Tech Stack Analysis (if enabled)
            let builtwithSummary = null;
            if (enabledServices.builtwith) {
                // Check if builtwith summary already exists for existing prospects
                if (isExistingProspect && existingProspectInfo?.enrichmentRecord?.builtwithSummary) {
                    console.log(`⏭️ [Enrichment]: BuiltWith summary already exists for prospect ${prospect.id}, skipping generation`);
                    builtwithSummary = existingProspectInfo.enrichmentRecord.builtwithSummary;
                }
                else {
                    await job.updateProgress({
                        progress: 60,
                        total: 1,
                        processed: 0,
                        failed: 0,
                        status: 'Tech Stack Analysis',
                        message: 'Analyzing technology stack with BuiltWith',
                        startTime,
                    });
                    try {
                        // Get company domain for BuiltWith analysis
                        const companyWebsite = await this.extractCompanyWebsite(prospect);
                        if (companyWebsite) {
                            // Extract domain from URL
                            const domain = companyWebsite.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                            console.log(`🔍 [Enrichment]: Analyzing tech stack for domain: ${domain}`);
                            const builtwithData = await builtwithService_1.BuiltWithService.getTechStack(domain);
                            if (builtwithData && Object.keys(builtwithData).length > 0) {
                                console.log(`✅ [Enrichment]: Tech stack data fetched for prospect ${prospect.id}`);
                                // Generate tech stack summary
                                await job.updateProgress({
                                    progress: 75,
                                    total: 1,
                                    processed: 0,
                                    failed: 0,
                                    status: 'Tech Stack Analysis',
                                    message: 'Generating technology stack summary using AI',
                                    startTime,
                                });
                                // Generate tech stack summary
                                builtwithSummary = await this.generateTechStackSummary(JSON.stringify(builtwithData, null, 2), domain, aiProvider, llmModelId, isExistingProspect, existingProspectInfo);
                                console.log(`✅ [Enrichment]: Tech stack summary generated for prospect ${prospect.id}`);
                            }
                            else {
                                console.log(`⚠️ [Enrichment]: No tech stack data found for domain: ${domain}`);
                            }
                        }
                        else {
                            console.log(`⏭️ [Enrichment]: No company website found for tech stack analysis for prospect ${prospect.id}`);
                        }
                    }
                    catch (error) {
                        console.error(`❌ [Enrichment]: Tech stack analysis failed for prospect ${prospect.id}:`, error);
                        // Continue with prospect analysis
                    }
                }
            }
            else {
                console.log(`⏭️ [Enrichment]: Tech stack analysis disabled for prospect ${prospect.id}`);
            }
            // STEP 5: Final Prospect Analysis
            let prospectAnalysisSummary = null;
            // Check if prospect analysis summary already exists for existing prospects
            if (isExistingProspect && existingProspectInfo?.enrichmentRecord?.prospectAnalysisSummary) {
                console.log(`⏭️ [Enrichment]: Prospect analysis summary already exists for prospect ${prospect.id}, skipping generation`);
                prospectAnalysisSummary = existingProspectInfo.enrichmentRecord.prospectAnalysisSummary;
            }
            else {
                await job.updateProgress({
                    progress: 80,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'Prospect Analysis',
                    message: 'Generating comprehensive prospect analysis',
                    startTime,
                });
                try {
                    const enrichmentData = {
                        linkedinSummary,
                        companySummary,
                        builtwithSummary
                    };
                    prospectAnalysisSummary = await this.generateProspectAnalysis(prospect, enrichmentData, aiProvider, llmModelId, isExistingProspect, existingProspectInfo);
                    console.log(`✅ [Enrichment]: Prospect analysis completed for prospect ${prospect.id}`);
                }
                catch (error) {
                    console.error(`❌ [Enrichment]: Prospect analysis failed for prospect ${prospect.id}:`, error);
                    // Continue to save what we have
                }
            }
            // STEP 6: Save enrichment data to database
            await job.updateProgress({
                progress: 95,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Saving Results',
                message: 'Saving enrichment data to database',
                startTime,
            });
            try {
                // Only update enrichment record if it exists (for existing prospects) or if we created one (for new prospects)
                if (prospect.enrichment || !isExistingProspect) {
                    await database_1.prisma.cOProspectEnrichments.upsert({
                        where: { prospectId: prospect.id },
                        create: {
                            prospectId: prospect.id,
                            enrichmentStatus: 'COMPLETED',
                            linkedinSummary,
                            companySummary,
                            builtwithSummary,
                            prospectAnalysisSummary,
                            techStack: this.rawLlmRequests
                        },
                        update: {
                            enrichmentStatus: 'COMPLETED',
                            linkedinSummary,
                            companySummary,
                            builtwithSummary,
                            prospectAnalysisSummary,
                            techStack: this.rawLlmRequests
                        }
                    });
                }
                // Update prospect status
                await database_1.prisma.cOProspects.update({
                    where: { id: prospect.id },
                    data: { status: 'ENRICHED' }
                });
                // Update batch progress
                await this.updateBatchProgress(csvData?.batchId || prospect.batchId, 'completed');
                console.log(`✅ [Enrichment]: Enrichment data saved for prospect ${prospect.id}`);
            }
            catch (error) {
                console.error(`❌ [Enrichment]: Failed to save enrichment data for prospect ${prospect.id}:`, error);
                throw error;
            }
            // Send final completion update
            sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId: prospect.id.toString(),
                status: 'completed',
                progress: 100,
                message: `Enrichment completed successfully${isExistingProspect ? ' for existing prospect' : ''}`,
                enrichmentData: {
                    linkedinSummary,
                    companySummary,
                    builtwithSummary,
                    prospectAnalysisSummary
                }
            });
            return {
                success: true,
                message: `Prospect enrichment completed successfully${isExistingProspect ? ' for existing prospect' : ''}`,
                data: {
                    prospectId: prospect.id,
                    isExistingProspect,
                    enrichmentData: {
                        linkedinSummary,
                        companySummary,
                        builtwithSummary,
                        prospectAnalysisSummary
                    }
                }
            };
        }
        catch (error) {
            console.error(`❌ [Enrichment]: Job failed for prospect ${prospectId}:`, error);
            // Update batch progress for failure
            if (csvData?.batchId) {
                await this.updateBatchProgress(csvData.batchId, 'failed');
            }
            // Send error update
            sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId: prospectId.toString(),
                status: 'error',
                progress: 100,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
            throw error;
        }
    }
    /**
     * Generate LinkedIn summary using selected AI model
     */
    static async generateLinkedInSummary(linkedinData, aiProvider, llmModelId, isExistingProspect = false, existingProspectInfo = null) {
        const formattedData = this.formatLinkedInData(linkedinData);
        // Fetch LinkedIn summary prompt from database
        const promptRecord = await database_1.prisma.cOPrompts.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        let prompt = `Please analyze this LinkedIn profile data and provide a comprehensive summary focusing on:
1. Professional background and current role
2. Key skills and expertise areas
3. Career progression and achievements
4. Education and certifications
5. Potential business interests and pain points

LinkedIn Data:
${formattedData}

Please provide a well-structured, professional summary that would be useful for sales outreach.`;
        // Use database prompt if available
        if (promptRecord?.linkedinSummaryPrompt) {
            prompt = (0, templateHelpers_1.replaceTemplateVariables)(promptRecord.linkedinSummaryPrompt, {
                LINKEDIN_PROFILE_DATA: formattedData
            });
        }
        // Store raw request data
        this.rawLlmRequests.requests.linkedinSummary = {
            timestamp: new Date().toISOString(),
            type: 'linkedin_summary',
            prompt,
            formattedData,
            aiProvider,
            llmModelId,
            isExistingProspect,
            existingProspectInfo
        };
        let summary;
        let apiRequestData;
        let apiResponseData;
        if (aiProvider === 'gemini') {
            const result = await this.generateSummaryWithGeminiAndTrack(prompt, llmModelId, 'linkedinSummary');
            summary = result.summary;
            apiRequestData = result.requestData;
            apiResponseData = result.responseData;
        }
        else {
            const result = await this.generateSummaryWithOpenRouterAndTrack(prompt, llmModelId, 'linkedinSummary');
            summary = result.summary;
            apiRequestData = result.requestData;
            apiResponseData = result.responseData;
        }
        // Store API request/response data in rawLlmRequests for final storage
        this.rawLlmRequests.requests.linkedinSummary.apiRequest = apiRequestData;
        this.rawLlmRequests.requests.linkedinSummary.apiResponse = apiResponseData;
        return summary;
    }
    /**
     * Generate tech stack summary using selected AI model
     */
    static async generateTechStackSummary(builtwithData, domain, aiProvider, llmModelId, isExistingProspect = false, existingProspectInfo = null) {
        try {
            // Fetch tech stack summary prompt from database
            let techStackPrompt = `Please analyze this BuiltWith technology data for ${domain} and provide a comprehensive summary focusing on:
1. Core technologies and frameworks used
2. Development stack (frontend, backend, database)
3. Marketing and analytics tools
4. Infrastructure and hosting solutions
5. Potential technology needs and opportunities

BuiltWith Data:
${builtwithData}

Please provide a well-structured summary that highlights the company's technical sophistication and potential technology needs.`;
            try {
                const promptRecord = await database_1.prisma.cOPrompts.findFirst({
                    where: { isActive: true },
                    select: { techStackPrompt: true }
                });
                if (promptRecord?.techStackPrompt) {
                    techStackPrompt = (0, templateHelpers_1.replaceTemplateVariables)(promptRecord.techStackPrompt, {
                        BUILTWITH_RAW_MD_DATA: builtwithData
                    });
                    console.log('✅ [Enrichment]: Using tech stack summary prompt from database');
                }
                else {
                    console.log('⚠️ [Enrichment]: No active tech stack summary prompt found in database, using default');
                }
            }
            catch (error) {
                console.error('❌ [Enrichment]: Error fetching tech stack summary prompt from database:', error);
                console.log('⚠️ [Enrichment]: Falling back to default tech stack summary prompt');
            }
            let summary = '';
            let requestData = {};
            let responseData = {};
            if (aiProvider === 'gemini') {
                const result = await this.generateSummaryWithGeminiAndTrack(techStackPrompt, llmModelId, 'builtwith_summary');
                summary = result.summary;
                requestData = result.requestData;
                responseData = result.responseData;
            }
            else {
                const result = await this.generateSummaryWithOpenRouterAndTrack(techStackPrompt, llmModelId, 'builtwith_summary');
                summary = result.summary;
                requestData = result.requestData;
                responseData = result.responseData;
            }
            // Store API request/response data in rawLlmRequests for final storage
            this.rawLlmRequests.requests.builtwithSummary = {
                timestamp: new Date().toISOString(),
                type: 'builtwith_summary',
                prompt: techStackPrompt,
                builtwithData,
                domain,
                aiProvider,
                llmModelId,
                isExistingProspect,
                existingProspectInfo,
                apiRequest: requestData,
                apiResponse: responseData
            };
            return summary;
        }
        catch (error) {
            console.error('❌ [Enrichment]: Error generating tech stack summary:', error);
            throw error;
        }
    }
    /**
     * Generate comprehensive prospect analysis using selected AI model
     */
    static async generateProspectAnalysis(prospect, enrichmentData, aiProvider, llmModelId, isExistingProspect = false, existingProspectInfo = null) {
        try {
            const prospectInfo = this.prepareScalarlyInfo(prospect);
            // Fetch prospect analysis prompt from database
            let prospectAnalysisPrompt = `Please provide a comprehensive analysis of this prospect combining all available enrichment data:

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
            try {
                const promptRecord = await database_1.prisma.cOPrompts.findFirst({
                    where: { isActive: true },
                    select: { prospectAnalysisPrompt: true }
                });
                if (promptRecord?.prospectAnalysisPrompt) {
                    // Get self company info from API configuration
                    const selfCompanyInfo = await apiConfigurationService_1.ApiConfigurationService.getSelfCompanyInfo();
                    prospectAnalysisPrompt = (0, templateHelpers_1.replaceTemplateVariables)(promptRecord.prospectAnalysisPrompt, {
                        SELF_COMPANY_INFO: selfCompanyInfo || 'Company information not configured',
                        LINKEDIN_INFO: enrichmentData.linkedinSummary || 'LinkedIn information not available',
                        FIRECRAWL_INFO: enrichmentData.companySummary || 'Company website information not available',
                        BUILTWITH_INFO: enrichmentData.builtwithSummary || 'Technology stack information not available'
                    });
                    console.log('✅ [Enrichment]: Using prospect analysis prompt from database');
                }
                else {
                    console.log('⚠️ [Enrichment]: No active prospect analysis prompt found in database, using default');
                }
            }
            catch (error) {
                console.error('❌ [Enrichment]: Error fetching prospect analysis prompt from database:', error);
                console.log('⚠️ [Enrichment]: Falling back to default prospect analysis prompt');
            }
            let summary = '';
            let requestData = {};
            let responseData = {};
            if (aiProvider === 'gemini') {
                const result = await this.generateSummaryWithGeminiAndTrack(prospectAnalysisPrompt, llmModelId, 'prospect_analysis_summary');
                summary = result.summary;
                requestData = result.requestData;
                responseData = result.responseData;
            }
            else {
                const result = await this.generateSummaryWithOpenRouterAndTrack(prospectAnalysisPrompt, llmModelId, 'prospect_analysis_summary');
                summary = result.summary;
                requestData = result.requestData;
                responseData = result.responseData;
            }
            // Store API request/response data in rawLlmRequests for final storage
            this.rawLlmRequests.requests.prospectAnalysis = {
                timestamp: new Date().toISOString(),
                type: 'prospect_analysis_summary',
                prompt: prospectAnalysisPrompt,
                prospectInfo,
                enrichmentData,
                aiProvider,
                llmModelId,
                isExistingProspect,
                existingProspectInfo,
                apiRequest: requestData,
                apiResponse: responseData
            };
            return summary;
        }
        catch (error) {
            console.error('❌ [Enrichment]: Error generating prospect analysis:', error);
            throw error;
        }
    }
    /**
     * Prepare prospect information for analysis
     */
    static prepareScalarlyInfo(prospect) {
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
    static async generateCompanySummary(formattedContent, companyWebsite, aiProvider, llmModelId, isExistingProspect = false, existingProspectInfo = null) {
        try {
            // Fetch company summary prompt from database
            let companySummaryPrompt = `Based on the following company website content, generate a comprehensive summary that includes:
1. Company overview and main business focus
2. Products or services offered
3. Target market and industry position
4. Key value propositions
5. Company culture and values (if mentioned)
6. Recent news or developments (if any)

Please provide a concise but informative summary in 3-4 paragraphs.

Company website content:
${formattedContent}`;
            try {
                const promptRecord = await database_1.prisma.cOPrompts.findFirst({
                    where: { isActive: true },
                    select: { companySummaryPrompt: true }
                });
                if (promptRecord?.companySummaryPrompt) {
                    companySummaryPrompt = (0, templateHelpers_1.replaceTemplateVariables)(promptRecord.companySummaryPrompt, {
                        WEBSITE_CONTENT: formattedContent
                    });
                    console.log('✅ [Enrichment]: Using company summary prompt from database');
                }
                else {
                    console.log('⚠️ [Enrichment]: No active company summary prompt found in database, using default');
                }
            }
            catch (error) {
                console.error('❌ [Enrichment]: Error fetching company summary prompt from database:', error);
                console.log('⚠️ [Enrichment]: Falling back to default company summary prompt');
            }
            let summary = '';
            let requestData = {};
            let responseData = {};
            if (aiProvider === 'gemini') {
                const result = await this.generateSummaryWithGeminiAndTrack(companySummaryPrompt, llmModelId, 'company_summary');
                summary = result.summary;
                requestData = result.requestData;
                responseData = result.responseData;
            }
            else {
                const result = await this.generateSummaryWithOpenRouterAndTrack(companySummaryPrompt, llmModelId, 'company_summary');
                summary = result.summary;
                requestData = result.requestData;
                responseData = result.responseData;
            }
            // Store API request/response data in rawLlmRequests for final storage
            this.rawLlmRequests.requests.companySummary = {
                timestamp: new Date().toISOString(),
                type: 'company_summary',
                prompt: companySummaryPrompt,
                formattedContent,
                companyWebsite,
                aiProvider,
                llmModelId,
                isExistingProspect,
                existingProspectInfo,
                apiRequest: requestData,
                apiResponse: responseData
            };
            return summary;
        }
        catch (error) {
            console.error('❌ [Enrichment]: Error generating company summary:', error);
            throw error;
        }
    }
    /**
     * Format multi-page content for AI analysis
     */
    static formatMultiPageContent(pages) {
        const formattedPages = [];
        pages.forEach((page, index) => {
            // Prioritize markdown field for v1 API
            const content = page.markdown || page.content || '';
            const url = page.metadata?.sourceURL || '';
            if (index === 0) {
                // First page is the home page
                formattedPages.push(`home page (${url}): ${content}`);
            }
            else {
                // Subsequent pages are pg1, pg2, etc.
                formattedPages.push(`pg${index} (${url}): ${content}`);
            }
        });
        return formattedPages.join('\n\n---PAGE_SEPARATOR---\n\n');
    }
    /**
     * Format LinkedIn data for analysis
     */
    static formatLinkedInData(data) {
        if (!data)
            return 'No LinkedIn data available';
        return `
Full Name: ${data.full_name || 'Not available'}
Headline: ${data.headline || 'Not available'}
Summary: ${data.summary || 'Not available'}
Location: ${data.city ? `${data.city}, ${data.state || ''} ${data.country || ''}`.trim() : 'Not available'}
Industry: ${data.industry || 'Not available'}
Current Company: ${data.experiences?.[0]?.company || 'Not available'}
Current Position: ${data.experiences?.[0]?.title || 'Not available'}
Education: ${data.education?.map((edu) => `${edu.degree_name || ''} at ${edu.school || ''}`).join(', ') || 'Not available'}
Skills: ${data.skills?.join(', ') || 'Not available'}
        `.trim();
    }
    /**
     * Extract company website from prospect data or email domain
     */
    static async extractCompanyWebsite(prospect) {
        // Extract company website only from email domain
        if (prospect.email) {
            try {
                // Extract domain from email (e.g., rob@bob.com -> bob.com)
                const emailParts = prospect.email.split('@');
                if (emailParts.length === 2) {
                    const domain = emailParts[1].toLowerCase();
                    // Skip common email providers
                    const commonProviders = [
                        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
                        'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
                        'yandex.com', 'zoho.com', 'fastmail.com'
                    ];
                    if (!commonProviders.includes(domain)) {
                        const websiteUrl = `https://${domain}`;
                        console.log(`🌐 [Enrichment]: Extracted company website from email: ${websiteUrl}`);
                        return websiteUrl;
                    }
                    else {
                        console.log(`⏭️ [Enrichment]: Skipping common email provider: ${domain}`);
                    }
                }
            }
            catch (error) {
                console.error(`❌ [Enrichment]: Error extracting domain from email ${prospect.email}:`, error);
            }
        }
        console.log(`⏭️ [Enrichment]: No company website could be extracted from email for prospect ${prospect.id}`);
        return null;
    }
    /**
     * Handle job completion
     */
    static async onCompleted(job, result) {
        console.log(`✅ [Enrichment]: Job ${job.id} completed successfully`);
        // Update batch progress if this job was part of a batch
        if (job.data.csvData?.batchId) {
            const status = result.data?.isDuplicate ? 'skipped' : 'completed';
            await this.updateBatchProgress(job.data.csvData.batchId, status);
        }
        // Send final SSE update for job completion
        sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(job.data.userId, {
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
    static async onFailed(job, error) {
        console.error(`❌ [Enrichment]: Job ${job.id} failed:`, error);
        // Update batch progress if this job was part of a batch
        if (job.data.csvData?.batchId) {
            await this.updateBatchProgress(job.data.csvData.batchId, 'failed');
        }
        // Send error notification via SSE
        sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(job.data.userId, {
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
    static async updateBatchProgress(batchId, status) {
        try {
            if (!batchId)
                return;
            const batch = await database_1.prisma.cOBatches.findUnique({
                where: { id: batchId }
            });
            if (!batch)
                return;
            if (status === 'completed') {
                await database_1.prisma.cOBatches.update({
                    where: { id: batchId },
                    data: { enrichedProspects: { increment: 1 } }
                });
            }
            else if (status === 'failed') {
                await database_1.prisma.cOBatches.update({
                    where: { id: batchId },
                    data: { failedProspects: { increment: 1 } }
                });
            }
        }
        catch (error) {
            console.error('Error updating batch progress:', error);
        }
    }
    /**
     * Generate summary with Gemini and track API request/response
     */
    static async generateSummaryWithGeminiAndTrack(prompt, llmModelId, requestType) {
        let requestData;
        try {
            const apiKey = await apiConfigurationService_1.ApiConfigurationService.getApiKey('geminiApiKey');
            if (!apiKey) {
                throw new Error('Gemini API key not configured');
            }
            // Check if llmModelId is provided from frontend
            if (!llmModelId) {
                console.error('❌ [Enrichment]: No AI model provided from frontend. llmModelId is required.');
                throw new Error('No AI model specified. Please select a model in the frontend.');
            }
            // Map our custom model IDs to actual Gemini model names
            let model;
            switch (llmModelId) {
                case 'gemini-2.0-flash-exp':
                    model = 'gemini-2.0-flash-exp';
                    break;
                case 'gemini-2.0-flash':
                    model = 'gemini-2.0-flash';
                    break;
                case 'gemini-1.5-pro':
                    model = 'gemini-1.5-pro';
                    break;
                case 'gemini-1.5-flash':
                    model = 'gemini-1.5-flash';
                    break;
                default:
                    console.error(`❌ [Enrichment]: Unknown AI model ID from frontend: ${llmModelId}. No fallback model will be used.`);
                    throw new Error(`Unknown AI model: ${llmModelId}. Please select a valid model in the frontend.`);
            }
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
            requestData = {
                contents: [{
                        parts: [{ text: prompt }]
                    }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
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
            const response = await axios_1.default.post(endpoint, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                timeout: 30000
            });
            const responseData = response.data;
            if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return {
                    summary: responseData.candidates[0].content.parts[0].text,
                    requestData,
                    responseData
                };
            }
            else {
                throw new Error('Invalid response format from Gemini API');
            }
        }
        catch (error) {
            // Log the input data that was fed to the API when it fails
            console.error('❌ [Enrichment]: Gemini API failed with input data:', {
                model: requestData?.model || 'unknown',
                promptLength: prompt?.length || 0,
                promptPreview: prompt?.substring(0, 200) + '...',
                requestType: requestType || 'unknown',
                timestamp: new Date().toISOString()
            });
            // Log concise error information without the full response
            if (axios_1.default.isAxiosError(error)) {
                console.error('❌ [Enrichment]: Gemini API error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    message: error.message,
                    errorType: 'axios_error'
                });
            }
            else {
                console.error('❌ [Enrichment]: Gemini API error:', error instanceof Error ? error.message : 'Unknown error');
            }
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate summary with OpenRouter and track API request/response
     */
    static async generateSummaryWithOpenRouterAndTrack(prompt, llmModelId, requestType) {
        let requestBody;
        let model = '';
        try {
            const apiKey = await apiConfigurationService_1.ApiConfigurationService.getApiKey('openrouterApiKey');
            if (!apiKey) {
                throw new Error('OpenRouter API key not configured');
            }
            // Check if llmModelId is provided from frontend
            if (!llmModelId) {
                console.error('❌ [Enrichment]: No AI model provided from frontend. llmModelId is required.');
                throw new Error('No AI model specified. Please select a model in the frontend.');
            }
            // Map our custom model IDs to actual OpenRouter model names
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
                    console.error(`❌ [Enrichment]: Unknown AI model ID from frontend: ${llmModelId}. No fallback model will be used.`);
                    throw new Error(`Unknown AI model: ${llmModelId}. Please select a valid model in the frontend.`);
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
            const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', requestBody, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                    'X-Title': 'Cold Outreach AI'
                },
                timeout: 30000
            });
            const responseData = response.data;
            if (responseData?.choices?.[0]?.message?.content) {
                return {
                    summary: responseData.choices[0].message.content,
                    requestData: requestBody,
                    responseData
                };
            }
            else {
                throw new Error('Invalid response format from OpenRouter API');
            }
        }
        catch (error) {
            // Log the input data that was fed to the API when it fails
            console.error('❌ [Enrichment]: OpenRouter API failed with input data:', {
                model: model || 'unknown',
                promptLength: prompt?.length || 0,
                promptPreview: prompt?.substring(0, 200) + '...',
                requestType: requestType || 'unknown',
                requestBody: requestBody ? {
                    model: requestBody.model,
                    temperature: requestBody.temperature,
                    max_tokens: requestBody.max_tokens,
                    messageCount: requestBody.messages?.length || 0
                } : null,
                timestamp: new Date().toISOString()
            });
            // Log concise error information without the full response to prevent log clutter
            if (axios_1.default.isAxiosError(error)) {
                console.error('❌ [Enrichment]: OpenRouter API error (response truncated to prevent log clutter):', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    message: error.message,
                    errorType: 'axios_error',
                    hasResponseData: !!error.response?.data,
                    responseDataKeys: error.response?.data ? Object.keys(error.response.data) : []
                });
            }
            else {
                console.error('❌ [Enrichment]: OpenRouter API error:', error instanceof Error ? error.message : 'Unknown error');
            }
            throw new Error(`OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.ProspectEnrichmentProcessor = ProspectEnrichmentProcessor;
// Static property to store raw LLM requests during processing
ProspectEnrichmentProcessor.rawLlmRequests = null;
