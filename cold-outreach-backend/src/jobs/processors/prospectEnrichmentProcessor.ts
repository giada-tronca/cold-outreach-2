import { Job } from 'bullmq'
import { ProspectEnrichmentJobData, JobResult, JobProgress } from '../queues'
import { prisma } from '@/config/database'
import { ProxycurlService } from '@/services/enrichment/proxycurlService'
import { FirecrawlService } from '@/services/enrichment/firecrawlService'
import { BuiltWithService } from '@/services/enrichment/builtwithService'
import { ApiConfigurationService } from '@/services/enrichment/apiConfigurationService'
import { SSEService } from '@/services/sseService'
import axios from 'axios'

/**
 * Prospect Enrichment Job Processor
 * Handles step-by-step enriching of individual prospects with LLM-generated summaries
 */
export class ProspectEnrichmentProcessor {
    /**
     * Process prospect enrichment job with step-by-step LLM summaries
     */
    static async process(job: Job<ProspectEnrichmentJobData>): Promise<JobResult> {
        const { prospectId, userId, linkedinUrl, aiProvider, llmModelId, services } = job.data
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

            // Step 1: Get prospect from database
            await job.updateProgress({
                progress: 5,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Initializing',
                message: 'Loading prospect data',
                startTime,
            } as JobProgress)

            const prospect = await prisma.cOProspects.findUnique({
                where: { id: parseInt(prospectId) },
                include: {
                    enrichment: true,
                    campaign: true,
                },
            })

            if (!prospect) {
                throw new Error(`Prospect with ID ${prospectId} not found`)
            }

            // Update prospect status to ENRICHING
            await prisma.cOProspects.update({
                where: { id: parseInt(prospectId) },
                data: { status: 'ENRICHING' }
            })

            // Create or update enrichment record
            await prisma.cOProspectEnrichments.upsert({
                where: { prospectId: parseInt(prospectId) },
                create: {
                    prospectId: parseInt(prospectId),
                    enrichmentStatus: 'PROCESSING'
                },
                update: {
                    enrichmentStatus: 'PROCESSING'
                }
            })

            // Step 2: LinkedIn Data Enrichment (if enabled and LinkedIn URL is available)
            let linkedinSummary = null
            if (enabledServices.proxycurl && linkedinUrl) {
                await job.updateProgress({
                    progress: 15,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'LinkedIn Enrichment',
                    message: 'Fetching LinkedIn profile data from Proxycurl',
                    startTime,
                } as JobProgress)

                try {
                    const linkedinData = await ProxycurlService.enrichPersonProfile(linkedinUrl)
                    console.log(`✅ [Enrichment]: LinkedIn data fetched for prospect ${prospectId}`)

                    // Step 3: Generate LinkedIn Summary with LLM
                    await job.updateProgress({
                        progress: 25,
                        total: 1,
                        processed: 0,
                        failed: 0,
                        status: 'LinkedIn Analysis',
                        message: 'Generating LinkedIn summary using AI',
                        startTime,
                    } as JobProgress)

                    linkedinSummary = await this.generateLinkedInSummary(linkedinData, aiProvider, llmModelId)
                    console.log(`✅ [Enrichment]: LinkedIn summary generated for prospect ${prospectId}`)

                    // Send SSE update
                    SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                        prospectId,
                        status: 'linkedin_completed',
                        progress: 25,
                        enrichmentData: { linkedinSummary }
                    })

                } catch (error) {
                    console.error(`❌ [Enrichment]: LinkedIn enrichment failed for prospect ${prospectId}:`, error)
                    // Continue with other enrichments
                }
            } else if (!linkedinUrl) {
                console.log(`⏭️ [Enrichment]: Skipping LinkedIn enrichment for prospect ${prospectId} (no LinkedIn URL provided)`)
            } else {
                console.log(`⏭️ [Enrichment]: Skipping LinkedIn enrichment for prospect ${prospectId} (disabled)`)
            }

            // Step 4: Company Data Enrichment (if enabled)
            let companySummary = null
            if (enabledServices.firecrawl) {
                await job.updateProgress({
                    progress: 35,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'Company Enrichment',
                    message: 'Scraping company website data',
                    startTime,
                } as JobProgress)

                try {
                    const companyWebsite = await this.extractCompanyWebsite(prospect)
                    if (companyWebsite) {
                        // Step 4a: Crawl multiple pages from company website
                        await job.updateProgress({
                            progress: 35,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'Company Crawling',
                            message: 'Crawling company website (up to 10 pages)',
                            startTime,
                        } as JobProgress)

                        // Note: FirecrawlService doesn't yet support llmModelId, it uses default models
                        const crawlResult = await FirecrawlService.crawlAndGenerateCompanySummary(companyWebsite, aiProvider)
                        console.log(`✅ [Enrichment]: Company website crawled (${crawlResult.crawlData.totalPages} pages) for prospect ${prospectId}`)

                        // Step 5: Company summary is already generated by the crawl method
                        await job.updateProgress({
                            progress: 45,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'Company Analysis',
                            message: 'Company summary generated from multi-page content',
                            startTime,
                        } as JobProgress)

                        companySummary = crawlResult.companySummary
                        console.log(`✅ [Enrichment]: Company summary generated for prospect ${prospectId}`)

                        // Send SSE update
                        SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                            prospectId,
                            status: 'company_completed',
                            progress: 45,
                            enrichmentData: { companySummary }
                        })
                    }
                } catch (error) {
                    console.error(`❌ [Enrichment]: Company enrichment failed for prospect ${prospectId}:`, error)
                    // Continue with other enrichments
                }
            } else {
                console.log(`⏭️ [Enrichment]: Skipping company enrichment for prospect ${prospectId} (disabled)`)
            }

            // Step 6: Tech Stack Enrichment (if enabled)
            let builtwithSummary = null
            if (enabledServices.builtwith) {
                await job.updateProgress({
                    progress: 55,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'Tech Stack Enrichment',
                    message: 'Analyzing technology stack with BuiltWith.com',
                    startTime,
                } as JobProgress)

                try {
                    // Extract domain from email address
                    const domain = BuiltWithService.extractDomainFromEmail(prospect.email)
                    if (domain) {
                        console.log(`🔍 [Enrichment]: Using domain ${domain} for BuiltWith analysis from email ${prospect.email}`)

                        // Step 7: Generate comprehensive BuiltWith Summary with AI LLM
                        await job.updateProgress({
                            progress: 65,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'BuiltWith AI Analysis',
                            message: 'Generating comprehensive tech stack summary using AI LLM',
                            startTime,
                        } as JobProgress)

                        // Use the enhanced BuiltWith service that sends ALL data to AI
                        // Note: BuiltWithService doesn't yet support llmModelId, it uses default models
                        builtwithSummary = await BuiltWithService.getBuiltWithSummary(domain, aiProvider)
                        console.log(`✅ [Enrichment]: BuiltWith AI summary generated for prospect ${prospectId}`)

                        // Send SSE update
                        SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                            prospectId,
                            status: 'techstack_completed',
                            progress: 65,
                            enrichmentData: { builtwithSummary }
                        })
                    } else {
                        console.log(`⚠️ [Enrichment]: Could not extract domain from email ${prospect.email} for BuiltWith analysis`)
                    }
                } catch (error) {
                    console.error(`❌ [Enrichment]: BuiltWith enrichment failed for prospect ${prospectId}:`, error)
                    // Continue with prospect analysis
                }
            } else {
                console.log(`⏭️ [Enrichment]: Skipping BuiltWith enrichment for prospect ${prospectId} (disabled)`)
            }

            // Step 8: Generate Prospect Analysis
            await job.updateProgress({
                progress: 75,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Prospect Analysis',
                message: 'Generating comprehensive prospect analysis',
                startTime,
            } as JobProgress)

            let prospectAnalysisSummary = null
            try {
                const enrichmentData = {
                    linkedinSummary,
                    companySummary,
                    builtwithSummary
                }

                prospectAnalysisSummary = await this.generateProspectAnalysis(prospect, enrichmentData, aiProvider, llmModelId)
                console.log(`✅ [Enrichment]: Prospect analysis generated for prospect ${prospectId}`)

                // Send SSE update
                SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                    prospectId,
                    status: 'analysis_completed',
                    progress: 75,
                    enrichmentData: { prospectAnalysisSummary }
                })

            } catch (error) {
                console.error(`❌ [Enrichment]: Prospect analysis failed for prospect ${prospectId}:`, error)
                // Continue to save what we have
            }

            // Step 9: Save all summaries to database
            await job.updateProgress({
                progress: 85,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Saving Data',
                message: 'Saving enrichment data to database',
                startTime,
            } as JobProgress)

            await prisma.cOProspectEnrichments.update({
                where: { prospectId: parseInt(prospectId) },
                data: {
                    linkedinSummary,
                    companySummary,
                    builtwithSummary,
                    prospectAnalysisSummary,
                    enrichmentStatus: 'COMPLETED',
                    modelUsed: aiProvider,
                    enrichedAt: new Date()
                }
            })

            // Update prospect status
            await prisma.cOProspects.update({
                where: { id: parseInt(prospectId) },
                data: { status: 'ENRICHED' }
            })

            // Final progress update
            await job.updateProgress({
                progress: 100,
                total: 1,
                processed: 1,
                failed: 0,
                status: 'Completed',
                message: 'Prospect enrichment completed successfully',
                startTime,
            } as JobProgress)

            // Send final SSE update
            SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId,
                status: 'completed',
                progress: 100,
                enrichmentData: {
                    linkedinSummary,
                    companySummary,
                    builtwithSummary,
                    prospectAnalysisSummary
                }
            })

            console.log(`✅ [Enrichment]: Completed step-by-step enrichment for prospect ${prospectId}`)

            return {
                success: true,
                message: 'Prospect enrichment completed successfully',
                data: {
                    prospectId,
                    enrichmentData: {
                        linkedinSummary,
                        companySummary,
                        builtwithSummary,
                        prospectAnalysisSummary
                    },
                    processingTime: Date.now() - startTime.getTime()
                },
                summary: {
                    total: 1,
                    processed: 1,
                    failed: 0,
                    skipped: 0,
                },
            }

        } catch (error) {
            console.error(`❌ [Enrichment]: Failed to enrich prospect ${prospectId}:`, error)

            // Update prospect status to failed
            await prisma.cOProspects.update({
                where: { id: parseInt(prospectId) },
                data: { status: 'FAILED' }
            }).catch(() => { }) // Ignore errors in error handling

            await prisma.cOProspectEnrichments.upsert({
                where: { prospectId: parseInt(prospectId) },
                create: {
                    prospectId: parseInt(prospectId),
                    enrichmentStatus: 'FAILED'
                },
                update: {
                    enrichmentStatus: 'FAILED'
                }
            }).catch(() => { }) // Ignore errors in error handling

            // Update job progress to reflect failure
            await job.updateProgress({
                progress: 100,
                total: 1,
                processed: 0,
                failed: 1,
                status: 'Failed',
                message: 'Prospect enrichment failed with error',
                startTime,
            } as JobProgress)

            // Send failure SSE update
            SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error)
            })

            return {
                success: false,
                message: 'Prospect enrichment failed',
                errors: [error instanceof Error ? error.message : String(error)],
                summary: {
                    total: 1,
                    processed: 0,
                    failed: 1,
                    skipped: 0,
                },
            }
        }
    }

    /**
     * Generate LinkedIn summary using LLM and database prompt
     */
    private static async generateLinkedInSummary(linkedinData: any, aiProvider: 'gemini' | 'openrouter', llmModelId?: string): Promise<string> {
        try {
            const prompt = await ApiConfigurationService.getPrompt('linkedin_summary_prompt')
            const linkedinDataText = this.formatLinkedInData(linkedinData)
            const finalPrompt = prompt.replace('{linkedin_data_placeholder}', linkedinDataText)

            if (aiProvider === 'gemini') {
                return await this.generateSummaryWithGemini(finalPrompt, llmModelId)
            } else {
                return await this.generateSummaryWithOpenRouter(finalPrompt, llmModelId)
            }
        } catch (error) {
            console.error('Failed to generate LinkedIn summary:', error)
            return 'LinkedIn summary generation failed'
        }
    }

    // Note: Company summaries are now generated directly by FirecrawlService.crawlAndGenerateCompanySummary()

    // Note: generateTechStackSummary method removed - now handled by BuiltWithService.getBuiltWithSummary()

    /**
     * Generate prospect analysis using LLM and database prompt
     */
    private static async generateProspectAnalysis(prospect: any, enrichmentData: any, aiProvider: 'gemini' | 'openrouter', llmModelId?: string): Promise<string> {
        try {
            const prompt = await ApiConfigurationService.getPrompt('prospect_analysis_prompt')

            // Prepare individual data sections to match prompt placeholders
            const scalarlyInfo = this.prepareScalarlyInfo(prospect)
            const linkedinInfo = enrichmentData.linkedinSummary || 'No LinkedIn data available'
            const firecrawlInfo = enrichmentData.companySummary || 'No company data available'
            const builtwithInfo = enrichmentData.builtwithSummary || 'No technology stack data available'

            // Replace all placeholders in the prompt
            const finalPrompt = prompt
                .replace('${SCALARLY_INFO}', scalarlyInfo)
                .replace('${LINKEDIN_INFO}', linkedinInfo)
                .replace('${FIRECRAWL_INFO}', firecrawlInfo)
                .replace('${BUILTWITH_INFO}', builtwithInfo)

            if (aiProvider === 'gemini') {
                return await this.generateSummaryWithGemini(finalPrompt, llmModelId)
            } else {
                return await this.generateSummaryWithOpenRouter(finalPrompt, llmModelId)
            }
        } catch (error) {
            console.error('Failed to generate prospect analysis:', error)
            return 'Prospect analysis generation failed'
        }
    }

    /**
     * Prepare Scalarly info (prospect basic information)
     */
    private static prepareScalarlyInfo(prospect: any): string {
        const sections: string[] = []

        sections.push('=== PROSPECT BASIC INFORMATION ===')
        if (prospect.name) sections.push(`Name: ${prospect.name}`)
        if (prospect.email) sections.push(`Email: ${prospect.email}`)
        if (prospect.company) sections.push(`Company: ${prospect.company}`)
        if (prospect.position) sections.push(`Position: ${prospect.position}`)
        if (prospect.linkedinUrl) sections.push(`LinkedIn: ${prospect.linkedinUrl}`)
        if (prospect.phone) sections.push(`Phone: ${prospect.phone}`)
        if (prospect.location) sections.push(`Location: ${prospect.location}`)

        return sections.join('\n')
    }

    /**
     * Generate summary using Google Gemini
     */
    private static async generateSummaryWithGemini(prompt: string, llmModelId?: string): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey')

            console.log(`🤖 [ProspectEnrichment]: Using Gemini model: gemini-2.0-flash-exp (from ${llmModelId || 'default'})`)

            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 500,
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 seconds
            })

            const aiSummary = response.data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!aiSummary) {
                throw new Error('No AI summary returned from Gemini API')
            }

            console.log('✅ [ProspectEnrichment]: Successfully generated summary with Gemini gemini-2.0-flash-exp')
            return aiSummary
        } catch (error) {
            console.error('Failed to generate summary with Gemini:', error)
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate summary using OpenRouter with retry logic
     */
    private static async generateSummaryWithOpenRouter(prompt: string, llmModelId?: string): Promise<string> {
        const maxRetries = 3
        let lastError: Error | null = null

        // Require explicit model selection - NO DEFAULT FALLBACK
        if (!llmModelId) {
            throw new Error('OpenRouter requires explicit model selection. Please select a model from step 2.')
        }

        let actualModel: string;
        let maxTokens: number;
        let useTemperature: boolean;

        switch (llmModelId) {
            case 'openrouter-o1-mini':
                actualModel = 'openai/o1-mini'
                maxTokens = 8000 // Increased from 2000 to handle reasoning + response
                useTemperature = false // o1-mini doesn't support temperature
                break
            case 'openrouter-gemini-2.5-pro':
                actualModel = 'google/gemini-2.5-pro'
                maxTokens = 6000 // Increased from 3000 for more comprehensive responses
                useTemperature = true
                break
            case 'openrouter-gemini-2.5-flash':
                actualModel = 'google/gemini-2.0-flash-001'
                maxTokens = 6000 // Increased from 3000 for more comprehensive responses
                useTemperature = true
                break
            default:
                throw new Error(`Unknown or unsupported LLM model: '${llmModelId}'. Supported models: openrouter-o1-mini, openrouter-gemini-2.5-pro, openrouter-gemini-2.5-flash`)
        }

        console.log(`🤖 [ProspectEnrichment]: Using OpenRouter model: ${actualModel} (from ${llmModelId})`)

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')

                console.log(`🔗 [ProspectEnrichment]: Making OpenRouter API call (attempt ${attempt}/${maxRetries}) with model ${actualModel}...`)
                console.log(`🔍 [ProspectEnrichment]: Request config: maxTokens=${maxTokens}, temperature=${useTemperature ? '0.7' : 'N/A'}`)

                const requestBody: any = {
                    model: actualModel,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                }

                // Add appropriate token parameter based on model type
                if (actualModel.includes('gemini')) {
                    requestBody.max_tokens = maxTokens; // Gemini models use max_tokens
                } else {
                    requestBody.max_completion_tokens = maxTokens; // O1 models use max_completion_tokens
                }

                // Add temperature for models that support it
                if (useTemperature) {
                    requestBody.temperature = 0.7
                }

                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', requestBody, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000 // Increased from 90s to 120s for O1-Mini reasoning
                })

                console.log('🔍 [ProspectEnrichment]: OpenRouter response status:', response.status)
                console.log('🔍 [ProspectEnrichment]: OpenRouter response choices length:', response.data?.choices?.length || 0)

                const aiSummary = response.data.choices[0]?.message?.content?.trim()
                if (!aiSummary) {
                    console.error('❌ [ProspectEnrichment]: OpenRouter returned empty response:', JSON.stringify(response.data, null, 2))
                    throw new Error('No AI summary returned from OpenRouter API')
                }

                console.log(`✅ [ProspectEnrichment]: Successfully generated summary with OpenRouter ${actualModel}`)
                return aiSummary

            } catch (error: any) {
                lastError = error
                console.error(`❌ [ProspectEnrichment]: OpenRouter API call failed (attempt ${attempt}/${maxRetries}):`, error.message)

                if (attempt === maxRetries) {
                    break
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
            }
        }

        console.error(`❌ [ProspectEnrichment]: All ${maxRetries} attempts failed. Last error:`, lastError?.message)
        throw lastError || new Error('OpenRouter API calls failed after multiple attempts')
    }

    /**
     * Helper methods for data formatting
     */
    private static formatLinkedInData(data: any): string {
        const parts: string[] = []
        if (data.fullName) parts.push(`Name: ${data.fullName}`)
        if (data.headline) parts.push(`Title: ${data.headline}`)
        if (data.currentPosition) {
            parts.push(`Current Role: ${data.currentPosition.title} at ${data.currentPosition.company}`)
        }
        if (data.location) parts.push(`Location: ${data.location}`)
        if (data.summary) parts.push(`Summary: ${data.summary}`)
        if (data.experience) {
            parts.push(`Experience: ${JSON.stringify(data.experience)}`)
        }
        return parts.join('\n') || 'No LinkedIn data available'
    }

    // Note: formatCompanyData removed - company data is now formatted directly by FirecrawlService

    // Note: formatTechStackData method removed - data formatting now handled by BuiltWithService.formatBuiltWithDataForAI()



    private static async extractCompanyWebsite(prospect: any): Promise<string | null> {
        // First try to extract from prospect email domain (most reliable)
        if (prospect.email) {
            const emailDomain = prospect.email.split('@')[1]
            if (emailDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'live.com'].includes(emailDomain)) {
                // Use the email domain as the company website
                const websiteUrl = `https://www.${emailDomain}`
                console.log(`🔍 [Enrichment]: Extracted company website from email domain: ${websiteUrl}`)
                return websiteUrl
            }
        }

        // Fallback: Try to guess from company name (less reliable)
        if (prospect.company) {
            const cleanCompanyName = prospect.company.toLowerCase()
                .replace(/\s+/g, '')  // Remove spaces
                .replace(/[^a-z0-9]/g, '')  // Remove special characters
                .replace(/(ltd|llc|inc|corp|co|srl|spa|gmbh)$/i, '')  // Remove common company suffixes

            if (cleanCompanyName.length > 2) {
                const guessedUrl = `https://www.${cleanCompanyName}.com`
                console.log(`🔍 [Enrichment]: Guessed company website from company name: ${guessedUrl}`)
                return guessedUrl
            }
        }

        console.log(`⚠️ [Enrichment]: Could not extract company website for prospect ${prospect.id}`)
        return null
    }

    // Note: extractDomain method removed - now handled by BuiltWithService.extractDomainFromEmail()

    /**
     * Handle job completion
     */
    static async onCompleted(job: Job<ProspectEnrichmentJobData>, result: JobResult) {
        console.log(`✅ [Enrichment]: Job ${job.id} completed successfully`)

        // Send SSE update about job completion
        const { prospectId, userId, workflowSessionId } = job.data
        SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
            prospectId,
            status: 'completed',
            enrichmentData: result.data?.enrichmentData
        })

        // Update batch job progress if this job belongs to a workflow session
        if (workflowSessionId) {
            await this.updateBatchJobProgress(workflowSessionId, prospectId, result.success, result.data?.enrichmentData)
        }
    }

    /**
     * Handle job failure
     */
    static async onFailed(job: Job<ProspectEnrichmentJobData>, error: Error) {
        console.error(`❌ [Enrichment]: Job ${job.id} failed:`, error)

        // Send SSE update about job failure
        const { prospectId, userId, workflowSessionId } = job.data
        SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
            prospectId,
            status: 'failed',
            error: error.message
        })

        // Update batch job progress if this job belongs to a workflow session
        if (workflowSessionId) {
            await this.updateBatchJobProgress(workflowSessionId, prospectId, false, null, error.message)
        }
    }

    /**
 * Update batch job progress when individual jobs complete
 */
    private static async updateBatchJobProgress(workflowSessionId: string, prospectId: string, success: boolean, enrichmentData?: any, errorMessage?: string) {
        try {
            // Import the function dynamically to avoid circular imports
            const { updateEnrichmentJobProgress } = await import('@/routes/enrichment')
            await updateEnrichmentJobProgress(workflowSessionId, prospectId, success, enrichmentData, errorMessage)
        } catch (error) {
            console.error('Failed to update batch job progress:', error)
        }
    }
} 