"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProspectEnrichmentProcessor = void 0;
const database_1 = require("@/config/database");
const proxycurlService_1 = require("@/services/enrichment/proxycurlService");
const firecrawlService_1 = require("@/services/enrichment/firecrawlService");
const builtwithService_1 = require("@/services/enrichment/builtwithService");
const apiConfigurationService_1 = require("@/services/enrichment/apiConfigurationService");
const sseService_1 = require("@/services/sseService");
const axios_1 = __importDefault(require("axios"));
/**
 * Prospect Enrichment Job Processor
 * Handles step-by-step enriching of individual prospects with LLM-generated summaries
 */
class ProspectEnrichmentProcessor {
    /**
     * Process prospect enrichment job with step-by-step LLM summaries
     */
    static async process(job) {
        const { prospectId, userId, linkedinUrl, aiProvider, llmModelId, services } = job.data;
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
            // Step 1: Get prospect from database
            await job.updateProgress({
                progress: 5,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Initializing',
                message: 'Loading prospect data',
                startTime,
            });
            const prospect = await database_1.prisma.cOProspects.findUnique({
                where: { id: parseInt(prospectId) },
                include: {
                    enrichment: true,
                    campaign: true,
                },
            });
            if (!prospect) {
                throw new Error(`Prospect with ID ${prospectId} not found`);
            }
            // Update prospect status to ENRICHING
            await database_1.prisma.cOProspects.update({
                where: { id: parseInt(prospectId) },
                data: { status: 'ENRICHING' }
            });
            // Create or update enrichment record
            await database_1.prisma.cOProspectEnrichments.upsert({
                where: { prospectId: parseInt(prospectId) },
                create: {
                    prospectId: parseInt(prospectId),
                    enrichmentStatus: 'PROCESSING'
                },
                update: {
                    enrichmentStatus: 'PROCESSING'
                }
            });
            // Step 2: LinkedIn Data Enrichment (if enabled)
            let linkedinSummary = null;
            if (enabledServices.proxycurl) {
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
                    const linkedinData = await proxycurlService_1.ProxycurlService.enrichPersonProfile(linkedinUrl);
                    console.log(`✅ [Enrichment]: LinkedIn data fetched for prospect ${prospectId}`);
                    // Step 3: Generate LinkedIn Summary with LLM
                    await job.updateProgress({
                        progress: 25,
                        total: 1,
                        processed: 0,
                        failed: 0,
                        status: 'LinkedIn Analysis',
                        message: 'Generating LinkedIn summary using AI',
                        startTime,
                    });
                    linkedinSummary = await this.generateLinkedInSummary(linkedinData, aiProvider, llmModelId);
                    console.log(`✅ [Enrichment]: LinkedIn summary generated for prospect ${prospectId}`);
                    // Send SSE update
                    sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                        prospectId,
                        status: 'linkedin_completed',
                        progress: 25,
                        enrichmentData: { linkedinSummary }
                    });
                }
                catch (error) {
                    console.error(`❌ [Enrichment]: LinkedIn enrichment failed for prospect ${prospectId}:`, error);
                    // Continue with other enrichments
                }
            }
            else {
                console.log(`⏭️ [Enrichment]: Skipping LinkedIn enrichment for prospect ${prospectId} (disabled)`);
            }
            // Step 4: Company Data Enrichment (if enabled)
            let companySummary = null;
            if (enabledServices.firecrawl) {
                await job.updateProgress({
                    progress: 35,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'Company Enrichment',
                    message: 'Scraping company website data',
                    startTime,
                });
                try {
                    const companyWebsite = await this.extractCompanyWebsite(prospect);
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
                        });
                        // Note: FirecrawlService doesn't yet support llmModelId, it uses default models
                        const crawlResult = await firecrawlService_1.FirecrawlService.crawlAndGenerateCompanySummary(companyWebsite, aiProvider);
                        console.log(`✅ [Enrichment]: Company website crawled (${crawlResult.crawlData.totalPages} pages) for prospect ${prospectId}`);
                        // Step 5: Company summary is already generated by the crawl method
                        await job.updateProgress({
                            progress: 45,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'Company Analysis',
                            message: 'Company summary generated from multi-page content',
                            startTime,
                        });
                        companySummary = crawlResult.companySummary;
                        console.log(`✅ [Enrichment]: Company summary generated for prospect ${prospectId}`);
                        // Send SSE update
                        sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                            prospectId,
                            status: 'company_completed',
                            progress: 45,
                            enrichmentData: { companySummary }
                        });
                    }
                }
                catch (error) {
                    console.error(`❌ [Enrichment]: Company enrichment failed for prospect ${prospectId}:`, error);
                    // Continue with other enrichments
                }
            }
            else {
                console.log(`⏭️ [Enrichment]: Skipping company enrichment for prospect ${prospectId} (disabled)`);
            }
            // Step 6: Tech Stack Enrichment (if enabled)
            let builtwithSummary = null;
            if (enabledServices.builtwith) {
                await job.updateProgress({
                    progress: 55,
                    total: 1,
                    processed: 0,
                    failed: 0,
                    status: 'Tech Stack Enrichment',
                    message: 'Analyzing technology stack with BuiltWith.com',
                    startTime,
                });
                try {
                    // Extract domain from email address
                    const domain = builtwithService_1.BuiltWithService.extractDomainFromEmail(prospect.email);
                    if (domain) {
                        console.log(`🔍 [Enrichment]: Using domain ${domain} for BuiltWith analysis from email ${prospect.email}`);
                        // Step 7: Generate comprehensive BuiltWith Summary with AI LLM
                        await job.updateProgress({
                            progress: 65,
                            total: 1,
                            processed: 0,
                            failed: 0,
                            status: 'BuiltWith AI Analysis',
                            message: 'Generating comprehensive tech stack summary using AI LLM',
                            startTime,
                        });
                        // Use the enhanced BuiltWith service that sends ALL data to AI
                        // Note: BuiltWithService doesn't yet support llmModelId, it uses default models
                        builtwithSummary = await builtwithService_1.BuiltWithService.getBuiltWithSummary(domain, aiProvider);
                        console.log(`✅ [Enrichment]: BuiltWith AI summary generated for prospect ${prospectId}`);
                        // Send SSE update
                        sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                            prospectId,
                            status: 'techstack_completed',
                            progress: 65,
                            enrichmentData: { builtwithSummary }
                        });
                    }
                    else {
                        console.log(`⚠️ [Enrichment]: Could not extract domain from email ${prospect.email} for BuiltWith analysis`);
                    }
                }
                catch (error) {
                    console.error(`❌ [Enrichment]: BuiltWith enrichment failed for prospect ${prospectId}:`, error);
                    // Continue with prospect analysis
                }
            }
            else {
                console.log(`⏭️ [Enrichment]: Skipping BuiltWith enrichment for prospect ${prospectId} (disabled)`);
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
            });
            let prospectAnalysisSummary = null;
            try {
                const enrichmentData = {
                    linkedinSummary,
                    companySummary,
                    builtwithSummary
                };
                prospectAnalysisSummary = await this.generateProspectAnalysis(prospect, enrichmentData, aiProvider, llmModelId);
                console.log(`✅ [Enrichment]: Prospect analysis generated for prospect ${prospectId}`);
                // Send SSE update
                sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                    prospectId,
                    status: 'analysis_completed',
                    progress: 75,
                    enrichmentData: { prospectAnalysisSummary }
                });
            }
            catch (error) {
                console.error(`❌ [Enrichment]: Prospect analysis failed for prospect ${prospectId}:`, error);
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
            });
            await database_1.prisma.cOProspectEnrichments.update({
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
            });
            // Update prospect status
            await database_1.prisma.cOProspects.update({
                where: { id: parseInt(prospectId) },
                data: { status: 'ENRICHED' }
            });
            // Final progress update
            await job.updateProgress({
                progress: 100,
                total: 1,
                processed: 1,
                failed: 0,
                status: 'Completed',
                message: 'Prospect enrichment completed successfully',
                startTime,
            });
            // Send final SSE update
            sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId,
                status: 'completed',
                progress: 100,
                enrichmentData: {
                    linkedinSummary,
                    companySummary,
                    builtwithSummary,
                    prospectAnalysisSummary
                }
            });
            console.log(`✅ [Enrichment]: Completed step-by-step enrichment for prospect ${prospectId}`);
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
            };
        }
        catch (error) {
            console.error(`❌ [Enrichment]: Failed to enrich prospect ${prospectId}:`, error);
            // Update prospect status to failed
            await database_1.prisma.cOProspects.update({
                where: { id: parseInt(prospectId) },
                data: { status: 'FAILED' }
            }).catch(() => { }); // Ignore errors in error handling
            await database_1.prisma.cOProspectEnrichments.upsert({
                where: { prospectId: parseInt(prospectId) },
                create: {
                    prospectId: parseInt(prospectId),
                    enrichmentStatus: 'FAILED'
                },
                update: {
                    enrichmentStatus: 'FAILED'
                }
            }).catch(() => { }); // Ignore errors in error handling
            // Update job progress to reflect failure
            await job.updateProgress({
                progress: 100,
                total: 1,
                processed: 0,
                failed: 1,
                status: 'Failed',
                message: 'Prospect enrichment failed with error',
                startTime,
            });
            // Send failure SSE update
            sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
                prospectId,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error)
            });
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
            };
        }
    }
    /**
     * Generate LinkedIn summary using LLM and database prompt
     */
    static async generateLinkedInSummary(linkedinData, aiProvider, llmModelId) {
        try {
            const prompt = await apiConfigurationService_1.ApiConfigurationService.getPrompt('linkedin_summary_prompt');
            const linkedinDataText = this.formatLinkedInData(linkedinData);
            const finalPrompt = prompt.replace('{linkedin_data_placeholder}', linkedinDataText);
            if (aiProvider === 'gemini') {
                return await this.generateSummaryWithGemini(finalPrompt, llmModelId);
            }
            else {
                return await this.generateSummaryWithOpenRouter(finalPrompt, llmModelId);
            }
        }
        catch (error) {
            console.error('Failed to generate LinkedIn summary:', error);
            return 'LinkedIn summary generation failed';
        }
    }
    // Note: Company summaries are now generated directly by FirecrawlService.crawlAndGenerateCompanySummary()
    // Note: generateTechStackSummary method removed - now handled by BuiltWithService.getBuiltWithSummary()
    /**
     * Generate prospect analysis using LLM and database prompt
     */
    static async generateProspectAnalysis(prospect, enrichmentData, aiProvider, llmModelId) {
        try {
            const prompt = await apiConfigurationService_1.ApiConfigurationService.getPrompt('prospect_analysis_prompt');
            // Prepare individual data sections to match prompt placeholders
            const scalarlyInfo = this.prepareScalarlyInfo(prospect);
            const linkedinInfo = enrichmentData.linkedinSummary || 'No LinkedIn data available';
            const firecrawlInfo = enrichmentData.companySummary || 'No company data available';
            const builtwithInfo = enrichmentData.builtwithSummary || 'No technology stack data available';
            // Replace all placeholders in the prompt
            const finalPrompt = prompt
                .replace('${SCALARLY_INFO}', scalarlyInfo)
                .replace('${LINKEDIN_INFO}', linkedinInfo)
                .replace('${FIRECRAWL_INFO}', firecrawlInfo)
                .replace('${BUILTWITH_INFO}', builtwithInfo);
            if (aiProvider === 'gemini') {
                return await this.generateSummaryWithGemini(finalPrompt, llmModelId);
            }
            else {
                return await this.generateSummaryWithOpenRouter(finalPrompt, llmModelId);
            }
        }
        catch (error) {
            console.error('Failed to generate prospect analysis:', error);
            return 'Prospect analysis generation failed';
        }
    }
    /**
     * Prepare Scalarly info (prospect basic information)
     */
    static prepareScalarlyInfo(prospect) {
        const sections = [];
        sections.push('=== PROSPECT BASIC INFORMATION ===');
        if (prospect.name)
            sections.push(`Name: ${prospect.name}`);
        if (prospect.email)
            sections.push(`Email: ${prospect.email}`);
        if (prospect.company)
            sections.push(`Company: ${prospect.company}`);
        if (prospect.position)
            sections.push(`Position: ${prospect.position}`);
        if (prospect.linkedinUrl)
            sections.push(`LinkedIn: ${prospect.linkedinUrl}`);
        if (prospect.phone)
            sections.push(`Phone: ${prospect.phone}`);
        if (prospect.location)
            sections.push(`Location: ${prospect.location}`);
        return sections.join('\n');
    }
    /**
     * Generate summary using Google Gemini
     */
    static async generateSummaryWithGemini(prompt, llmModelId) {
        try {
            const apiKey = await apiConfigurationService_1.ApiConfigurationService.getApiKey('geminiApiKey');
            console.log(`🤖 [ProspectEnrichment]: Using Gemini model: gemini-2.0-flash-exp (from ${llmModelId || 'default'})`);
            const response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
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
            });
            const aiSummary = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!aiSummary) {
                throw new Error('No AI summary returned from Gemini API');
            }
            console.log('✅ [ProspectEnrichment]: Successfully generated summary with Gemini gemini-2.0-flash-exp');
            return aiSummary;
        }
        catch (error) {
            console.error('Failed to generate summary with Gemini:', error);
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Generate summary using OpenRouter with retry logic
     */
    static async generateSummaryWithOpenRouter(prompt, llmModelId) {
        const maxRetries = 3;
        let lastError = null;
        // Require explicit model selection - NO DEFAULT FALLBACK
        if (!llmModelId) {
            throw new Error('OpenRouter requires explicit model selection. Please select a model from step 2.');
        }
        let actualModel;
        let maxTokens;
        let useTemperature;
        switch (llmModelId) {
            case 'openrouter-o1-mini':
                actualModel = 'openai/o1-mini';
                maxTokens = 8000; // Increased from 2000 to handle reasoning + response
                useTemperature = false; // o1-mini doesn't support temperature
                break;
            case 'openrouter-gemini-2.5-pro':
                actualModel = 'google/gemini-pro-2.5';
                maxTokens = 6000; // Increased from 3000 for more comprehensive responses
                useTemperature = true;
                break;
            case 'openrouter-gemini-2.5-flash':
                actualModel = 'google/gemini-2.0-flash-exp';
                maxTokens = 6000; // Increased from 3000 for more comprehensive responses
                useTemperature = true;
                break;
            default:
                throw new Error(`Unknown or unsupported LLM model: '${llmModelId}'. Supported models: openrouter-o1-mini, openrouter-gemini-2.5-pro, openrouter-gemini-2.5-flash`);
        }
        console.log(`🤖 [ProspectEnrichment]: Using OpenRouter model: ${actualModel} (from ${llmModelId})`);
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const apiKey = await apiConfigurationService_1.ApiConfigurationService.getApiKey('openrouterApiKey');
                console.log(`🔗 [ProspectEnrichment]: Making OpenRouter API call (attempt ${attempt}/${maxRetries}) with model ${actualModel}...`);
                console.log(`🔍 [ProspectEnrichment]: Request config: maxTokens=${maxTokens}, temperature=${useTemperature ? '0.7' : 'N/A'}`);
                const requestBody = {
                    model: actualModel,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_completion_tokens: maxTokens
                };
                // Add temperature for models that support it
                if (useTemperature) {
                    requestBody.temperature = 0.7;
                }
                const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', requestBody, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000 // Increased from 90s to 120s for O1-Mini reasoning
                });
                console.log('🔍 [ProspectEnrichment]: OpenRouter response status:', response.status);
                console.log('🔍 [ProspectEnrichment]: OpenRouter response choices length:', response.data?.choices?.length || 0);
                const aiSummary = response.data.choices[0]?.message?.content?.trim();
                if (!aiSummary) {
                    console.error('❌ [ProspectEnrichment]: OpenRouter returned empty response:', JSON.stringify(response.data, null, 2));
                    throw new Error('No AI summary returned from OpenRouter API');
                }
                console.log(`✅ [ProspectEnrichment]: Successfully generated summary with OpenRouter ${actualModel}`);
                return aiSummary;
            }
            catch (error) {
                lastError = error;
                console.error(`❌ [ProspectEnrichment]: OpenRouter API call failed (attempt ${attempt}/${maxRetries}):`, error.message);
                if (attempt === maxRetries) {
                    break;
                }
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        console.error(`❌ [ProspectEnrichment]: All ${maxRetries} attempts failed. Last error:`, lastError?.message);
        throw lastError || new Error('OpenRouter API calls failed after multiple attempts');
    }
    /**
     * Helper methods for data formatting
     */
    static formatLinkedInData(data) {
        const parts = [];
        if (data.fullName)
            parts.push(`Name: ${data.fullName}`);
        if (data.headline)
            parts.push(`Title: ${data.headline}`);
        if (data.currentPosition) {
            parts.push(`Current Role: ${data.currentPosition.title} at ${data.currentPosition.company}`);
        }
        if (data.location)
            parts.push(`Location: ${data.location}`);
        if (data.summary)
            parts.push(`Summary: ${data.summary}`);
        if (data.experience) {
            parts.push(`Experience: ${JSON.stringify(data.experience)}`);
        }
        return parts.join('\n') || 'No LinkedIn data available';
    }
    // Note: formatCompanyData removed - company data is now formatted directly by FirecrawlService
    // Note: formatTechStackData method removed - data formatting now handled by BuiltWithService.formatBuiltWithDataForAI()
    static async extractCompanyWebsite(prospect) {
        // First try to extract from prospect email domain (most reliable)
        if (prospect.email) {
            const emailDomain = prospect.email.split('@')[1];
            if (emailDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'live.com'].includes(emailDomain)) {
                // Use the email domain as the company website
                const websiteUrl = `https://www.${emailDomain}`;
                console.log(`🔍 [Enrichment]: Extracted company website from email domain: ${websiteUrl}`);
                return websiteUrl;
            }
        }
        // Fallback: Try to guess from company name (less reliable)
        if (prospect.company) {
            const cleanCompanyName = prospect.company.toLowerCase()
                .replace(/\s+/g, '') // Remove spaces
                .replace(/[^a-z0-9]/g, '') // Remove special characters
                .replace(/(ltd|llc|inc|corp|co|srl|spa|gmbh)$/i, ''); // Remove common company suffixes
            if (cleanCompanyName.length > 2) {
                const guessedUrl = `https://www.${cleanCompanyName}.com`;
                console.log(`🔍 [Enrichment]: Guessed company website from company name: ${guessedUrl}`);
                return guessedUrl;
            }
        }
        console.log(`⚠️ [Enrichment]: Could not extract company website for prospect ${prospect.id}`);
        return null;
    }
    // Note: extractDomain method removed - now handled by BuiltWithService.extractDomainFromEmail()
    /**
     * Handle job completion
     */
    static async onCompleted(job, result) {
        console.log(`✅ [Enrichment]: Job ${job.id} completed successfully`);
        // Send SSE update about job completion
        const { prospectId, userId, workflowSessionId } = job.data;
        sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
            prospectId,
            status: 'completed',
            enrichmentData: result.data?.enrichmentData
        });
        // Update batch job progress if this job belongs to a workflow session
        if (workflowSessionId) {
            await this.updateBatchJobProgress(workflowSessionId, prospectId, result.success, result.data?.enrichmentData);
        }
    }
    /**
     * Handle job failure
     */
    static async onFailed(job, error) {
        console.error(`❌ [Enrichment]: Job ${job.id} failed:`, error);
        // Send SSE update about job failure
        const { prospectId, userId, workflowSessionId } = job.data;
        sseService_1.SSEService.getInstance().sendProspectEnrichmentUpdate(userId, {
            prospectId,
            status: 'failed',
            error: error.message
        });
        // Update batch job progress if this job belongs to a workflow session
        if (workflowSessionId) {
            await this.updateBatchJobProgress(workflowSessionId, prospectId, false, null, error.message);
        }
    }
    /**
 * Update batch job progress when individual jobs complete
 */
    static async updateBatchJobProgress(workflowSessionId, prospectId, success, enrichmentData, errorMessage) {
        try {
            // Import the function dynamically to avoid circular imports
            const { updateEnrichmentJobProgress } = await Promise.resolve().then(() => __importStar(require('@/routes/enrichment')));
            await updateEnrichmentJobProgress(workflowSessionId, prospectId, success, enrichmentData, errorMessage);
        }
        catch (error) {
            console.error('Failed to update batch job progress:', error);
        }
    }
}
exports.ProspectEnrichmentProcessor = ProspectEnrichmentProcessor;
