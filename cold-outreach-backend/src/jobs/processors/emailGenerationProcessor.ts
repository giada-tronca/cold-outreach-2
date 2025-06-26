import { Job } from 'bullmq'
import { EmailGenerationJobData, JobResult } from '../queues'
import { prisma } from '@/config/database'
import { SSEService } from '@/services/sseService'
import { ApiConfigurationService } from '@/services/enrichment/apiConfigurationService'
import axios from 'axios'

/**
 * Email Generation Job Processor
 * Handles generating personalized emails using AI (following enrichment patterns)
 */
export class EmailGenerationProcessor {
    /**
     * Process email generation job
     */
    static async process(job: Job<EmailGenerationJobData>): Promise<JobResult> {
        const { prospectId, campaignId, aiProvider, llmModelId, userId = 'default-user' } = job.data
        const startTime = new Date()
        const sseService = SSEService.getInstance()

        try {
            console.log(`📧 [Email Generation]: Starting email generation for prospect ${prospectId} using ${aiProvider}${llmModelId ? ` (${llmModelId})` : ''}`)

            // Send SSE update for process start
            sseService.sendEmailGenerationUpdate(userId, {
                prospectId: prospectId.toString(),
                campaignId: campaignId.toString(),
                status: 'processing'
            })

            // Update job progress
            const initialProgress = {
                progress: 0,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Starting email generation',
                message: 'Initializing AI email generation',
                startTime,
            }
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(initialProgress))
            await job.updateProgress(initialProgress)

            // Step 1: Get prospect data with enrichment
            const step1Progress = { progress: 10, message: 'Fetching prospect data...' }
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step1Progress))
            await job.updateProgress(step1Progress)

            const prospect = await prisma.cOProspects.findUnique({
                where: { id: prospectId },
                include: {
                    enrichment: true
                }
            })

            if (!prospect) {
                throw new Error(`Prospect with ID ${prospectId} not found`)
            }

            // Step 2: Get campaign prompts
            const step2Progress = { progress: 20, message: 'Fetching campaign configuration...' }
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step2Progress))
            await job.updateProgress(step2Progress)

            const campaign = await prisma.cOCampaigns.findUnique({
                where: { id: campaignId }
            })

            if (!campaign) {
                throw new Error(`Campaign with ID ${campaignId} not found`)
            }

            if (!campaign.emailSubject || !campaign.prompt) {
                throw new Error('Campaign missing email subject or prompt configuration')
            }

            // Step 3: Generate email subject using enrichment AI patterns
            const step3Progress = { progress: 40, message: 'Generating email subject...' }
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step3Progress))
            await job.updateProgress(step3Progress)

            const emailSubject = await this.generateEmailSubject(
                campaign.emailSubject,
                {
                    ...prospect,
                    enrichment: prospect.enrichment
                },
                aiProvider,
                llmModelId
            )

            // Step 4: Generate email body using enrichment AI patterns
            const step4Progress = { progress: 70, message: 'Generating email body...' }
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step4Progress))
            await job.updateProgress(step4Progress)

            const emailBody = await this.generateEmailBody(
                campaign.prompt,
                {
                    ...prospect,
                    enrichment: prospect.enrichment
                },
                aiProvider,
                llmModelId
            )

            // Step 5: Save to database
            const step5Progress = { progress: 90, message: 'Saving generated email...' }
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step5Progress))
            await job.updateProgress(step5Progress)

            // Determine the actual model used for database storage
            let modelUsed: string;
            if (aiProvider === 'gemini') {
                modelUsed = 'gemini-2.0-flash-exp';
            } else {
                // OpenRouter models
                switch (llmModelId) {
                    case 'openrouter-o1-mini':
                        modelUsed = 'openai/o1-mini';
                        break;
                    case 'openrouter-gemini-2.5-pro':
                        modelUsed = 'google/gemini-2.5-pro';
                        break;
                    case 'openrouter-gemini-2.5-flash':
                        modelUsed = 'google/gemini-2.5-flash';
                        break;
                    default:
                        modelUsed = 'openai/o1-mini'; // Default fallback
                        break;
                }
            }

            await prisma.cOGeneratedEmails.upsert({
                where: { prospectId },
                update: {
                    subject: emailSubject,
                    body: emailBody,
                    generationStatus: 'COMPLETED',
                    errorMessage: null,
                    generatedAt: new Date(),
                    modelUsed,
                    generationMetadata: {
                        campaignId,
                        aiProvider,
                        llmModelId: llmModelId || 'default',
                        generatedAt: new Date().toISOString(),
                        processingTime: Date.now() - startTime.getTime()
                    }
                },
                create: {
                    prospectId,
                    subject: emailSubject,
                    body: emailBody,
                    generationStatus: 'COMPLETED',
                    generatedAt: new Date(),
                    modelUsed,
                    generationMetadata: {
                        campaignId,
                        aiProvider,
                        llmModelId: llmModelId || 'default',
                        generatedAt: new Date().toISOString(),
                        processingTime: Date.now() - startTime.getTime()
                    }
                }
            })

            // Final progress update
            const finalProgress = {
                progress: 100,
                total: 1,
                processed: 1,
                failed: 0,
                status: 'Completed',
                message: 'Email generation completed successfully',
                startTime,
            }
            console.log(`📊 [email-generation]: Job ${job.id} final progress:`, JSON.stringify(finalProgress))
            await job.updateProgress(finalProgress)

            // Send SSE update for completion
            sseService.sendEmailGenerationUpdate(userId, {
                prospectId: prospectId.toString(),
                campaignId: campaignId.toString(),
                status: 'completed',
                emailId: prospectId.toString(),
                subject: emailSubject,
                preview: emailBody.substring(0, 100) + '...'
            })

            console.log(`✅ [Email Generation]: Completed email generation for prospect ${prospectId}`)

            return {
                success: true,
                message: `Email generated successfully for prospect ${prospectId}`,
                data: {
                    prospectId,
                    subject: emailSubject,
                    body: emailBody,
                    preview: emailBody.substring(0, 100) + '...',
                    processingTime: Date.now() - startTime.getTime()
                }
            }
        } catch (error) {
            console.error(`❌ [Email Generation]: Failed for prospect ${prospectId}:`, error)

            // Send SSE update for failure
            sseService.sendEmailGenerationUpdate(userId, {
                prospectId: prospectId.toString(),
                campaignId: campaignId.toString(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            })

            // Update database with error
            await prisma.cOGeneratedEmails.upsert({
                where: { prospectId },
                update: {
                    generationStatus: 'FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    generatedAt: new Date()
                },
                create: {
                    prospectId,
                    generationStatus: 'FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    generatedAt: new Date()
                }
            })

            throw error
        }
    }

    /**
     * Generate email subject using AI (following enrichment patterns)
     */
    private static async generateEmailSubject(
        subjectTemplate: string,
        prospectData: any,
        aiProvider: 'gemini' | 'openrouter',
        llmModelId?: string
    ): Promise<string> {
        console.log(`📧 [AIService]: Generating email subject with provider: ${aiProvider}, model: ${llmModelId}`)

        const prompt = this.buildEmailSubjectPrompt(subjectTemplate, prospectData)

        if (aiProvider === 'gemini') {
            return await this.generateWithGemini(prompt, llmModelId, 8000, 0.8)
        } else {
            return await this.generateWithOpenRouter(prompt, llmModelId, 8000, 0.8)
        }
    }

    /**
     * Generate email body using AI (following enrichment patterns)
     */
    private static async generateEmailBody(
        bodyTemplate: string,
        prospectData: any,
        aiProvider: 'gemini' | 'openrouter',
        llmModelId?: string
    ): Promise<string> {
        console.log(`📧 [AIService]: Generating email body with provider: ${aiProvider}, model: ${llmModelId}`)

        const prompt = this.buildEmailBodyPrompt(bodyTemplate, prospectData)

        if (aiProvider === 'gemini') {
            return await this.generateWithGemini(prompt, llmModelId, 12000, 0.7)
        } else {
            return await this.generateWithOpenRouter(prompt, llmModelId, 12000, 0.7)
        }
    }

    /**
     * Generate content using Google Gemini (following enrichment patterns)
     */
    private static async generateWithGemini(
        prompt: string,
        llmModelId?: string,
        maxTokens: number = 8000,
        temperature: number = 0.7
    ): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey')
            if (!apiKey) {
                throw new Error('Google Gemini API key not configured')
            }

            const model = llmModelId || 'gemini-2.0-flash-exp'
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

            console.log(`🤖 [AIService]: Generating content with Gemini ${model} (${maxTokens} tokens max)`)

            const requestData = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: maxTokens,
                }
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
            )

            console.log(`🔍 [AIService]: Gemini response status: ${response.status}`)

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                const content = response.data.candidates[0].content.parts[0].text
                console.log(`✅ [AIService]: Generated content with Gemini ${model}`)
                return content.trim()
            } else {
                throw new Error('Invalid response format from Gemini API')
            }
        } catch (error) {
            console.error('❌ [AIService]: Gemini generation failed:', error)
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Generate content using OpenRouter (following enrichment patterns)
     */
    private static async generateWithOpenRouter(
        prompt: string,
        llmModelId?: string,
        maxTokens: number = 8000,
        temperature: number = 0.7
    ): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')
            if (!apiKey) {
                throw new Error('OpenRouter API key not configured')
            }

            // Map our custom model IDs to actual OpenRouter model names
            let model: string
            let requestBody: any

            switch (llmModelId) {
                case 'openrouter-o1-mini':
                    model = 'openai/o1-mini'
                    // o1-mini doesn't support temperature or max_tokens
                    requestBody = {
                        model,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    }
                    break
                case 'openrouter-gemini-2.5-pro':
                    model = 'google/gemini-2.5-pro'
                    requestBody = {
                        model,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        temperature,
                        max_tokens: maxTokens
                    }
                    break
                case 'openrouter-gemini-2.5-flash':
                    model = 'google/gemini-2.5-flash'
                    requestBody = {
                        model,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        temperature,
                        max_tokens: maxTokens
                    }
                    break
                default:
                    // Default to o1-mini if no specific model or unknown model
                    model = 'openai/o1-mini'
                    requestBody = {
                        model,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    }
                    break
            }

            console.log(`🤖 [AIService]: Generating content with OpenRouter ${model.split('/')[1]} (${maxTokens} tokens max)`)
            console.log(`🔍 [AIService]: Request config: maxTokens=${maxTokens}, temperature=${temperature}`)
            console.log(`🔍 [AIService]: Using model ID: ${model}`)

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
            )

            console.log(`🔍 [AIService]: OpenRouter response status: ${response.status}`)

            const content = response.data.choices?.[0]?.message?.content
            const finishReason = response.data.choices?.[0]?.finish_reason
            const reasoningTokens = response.data.usage?.completion_tokens_details?.reasoning_tokens

            if (!content) {
                throw new Error('No content returned from OpenRouter API')
            }

            console.log(`✅ [AIService]: Generated content with OpenRouter ${model.split('/')[1]}`)
            console.log(`🔍 [AIService]: Finish reason: ${finishReason}`)
            if (reasoningTokens) {
                console.log(`🧠 [AIService]: Reasoning tokens used: ${reasoningTokens}`)
            }

            return content.trim()
        } catch (error) {
            console.error('❌ [AIService]: OpenRouter generation failed:', error)
            throw new Error(`OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Build email subject prompt with prospect data
     */
    private static buildEmailSubjectPrompt(subjectTemplate: string, prospectData: any): string {
        const prospectInfo = this.formatProspectData(prospectData)

        return `
You are an expert email marketing specialist. Generate a compelling, personalized email subject line based on the following template and prospect information.

SUBJECT TEMPLATE:
${subjectTemplate}

PROSPECT INFORMATION:
${prospectInfo}

INSTRUCTIONS:
1. Replace any placeholders in the template (like {{name}}, {{company}}, etc.) with actual prospect data
2. Keep the subject line under 50 characters if possible
3. Make it personal and engaging
4. Avoid spam trigger words
5. Create urgency or curiosity when appropriate
6. Return ONLY the subject line, nothing else

SUBJECT LINE:
        `.trim()
    }

    /**
     * Build email body prompt with prospect data
     */
    private static buildEmailBodyPrompt(bodyTemplate: string, prospectData: any): string {
        const prospectInfo = this.formatProspectData(prospectData)

        return `
You are an expert email marketing specialist. Generate a compelling, personalized email body based on the following template and prospect information.

EMAIL TEMPLATE:
${bodyTemplate}

PROSPECT INFORMATION:
${prospectInfo}

INSTRUCTIONS:
1. Replace any placeholders in the template (like {{name}}, {{company}}, etc.) with actual prospect data
2. Keep the tone professional but friendly
3. Personalize based on the prospect's company, role, and background
4. Include specific details from their LinkedIn or company information when relevant
5. Make the email conversational and valuable
6. Include a clear call-to-action
7. Keep the email concise (2-3 paragraphs max)
8. Return ONLY the email body, nothing else

EMAIL BODY:
        `.trim()
    }

    /**
     * Format prospect data for AI prompts
     */
    private static formatProspectData(prospectData: any): string {
        const enrichment = prospectData.enrichment

        return `
Name: ${prospectData.name || 'Not available'}
Email: ${prospectData.email || 'Not available'}
Company: ${prospectData.company || 'Not available'}
Position: ${prospectData.position || 'Not available'}
LinkedIn URL: ${prospectData.linkedinUrl || 'Not available'}

${enrichment?.linkedinSummary ? `LinkedIn Summary: ${enrichment.linkedinSummary}` : ''}
${enrichment?.companySummary ? `Company Summary: ${enrichment.companySummary}` : ''}
${enrichment?.techStackSummary ? `Tech Stack: ${enrichment.techStackSummary}` : ''}
${enrichment?.prospectAnalysis ? `Prospect Analysis: ${enrichment.prospectAnalysis}` : ''}
        `.trim()
    }

    /**
     * Handle job completion
     */
    static async onCompleted(job: Job<EmailGenerationJobData>, result: JobResult) {
        console.log(`✅ [Email Generation]: Job ${job.id} completed successfully`)

        // Check if all prospects for this campaign are processed and trigger CSV generation
        await this.checkAndGenerateCSV(job.data.campaignId, job.data.userId)

        // Update stored job status if it exists
        await this.updateStoredJobStatus(job.data.campaignId, job.data.prospectId, true)
    }

    /**
     * Handle job failure
     */
    static async onFailed(job: Job<EmailGenerationJobData>, error: Error) {
        console.error(`❌ [Email Generation]: Job ${job.id} failed:`, error)

        // Still check for CSV generation in case other jobs completed
        await this.checkAndGenerateCSV(job.data.campaignId, job.data.userId)

        // Update stored job status if it exists
        await this.updateStoredJobStatus(job.data.campaignId, job.data.prospectId, false)
    }

    /**
     * Update stored job status in emailGenerationJobs map
     */
    static async updateStoredJobStatus(campaignId: number, prospectId: number, success: boolean) {
        // Import the emailGenerationJobs map from the routes file
        const { emailGenerationJobs } = require('../../routes/email-generation/index')

        // Find the job by campaign ID
        for (const [jobId, job] of emailGenerationJobs.entries()) {
            if (job.configuration.campaignId === campaignId) {
                // Update the specific prospect
                const prospectIndex = job.prospects.findIndex((p: any) => p.id === prospectId.toString())
                if (prospectIndex !== -1) {
                    job.prospects[prospectIndex].status = success ? 'completed' : 'failed'
                    job.prospects[prospectIndex].progress = 100
                }

                // Update overall job status
                if (success) {
                    job.completedProspects++
                } else {
                    job.failedProspects++
                }
                job.processedProspects++
                job.progress = Math.min(100, Math.round((job.processedProspects / job.totalProspects) * 100))
                job.updatedAt = new Date().toISOString()

                // Check if job is complete
                if (job.processedProspects >= job.totalProspects) {
                    job.status = 'completed'
                }

                // Update the job in the map
                emailGenerationJobs.set(jobId, job)
                break
            }
        }
    }

    /**
     * Check if all prospects are processed and generate CSV if complete
     */
    private static async checkAndGenerateCSV(campaignId: number, userId: string) {
        try {
            // Get all prospects for this campaign
            const allProspects = await prisma.cOProspects.findMany({
                where: {
                    campaignId: campaignId,
                    status: 'ENRICHED'
                }
            })

            // Get all prospects with generated emails
            const prospectsWithEmails = await prisma.cOGeneratedEmails.findMany({
                where: {
                    prospect: {
                        campaignId: campaignId
                    }
                }
            })

            console.log(`📊 [Email Generation]: Campaign ${campaignId} - ${prospectsWithEmails.length}/${allProspects.length} prospects have generated emails`)

            // If all prospects have been processed (either completed or failed), generate CSV
            if (prospectsWithEmails.length === allProspects.length) {
                console.log(`📄 [Email Generation]: All prospects processed for campaign ${campaignId}, generating CSV...`)

                const csvUrl = await this.generateEmailCSV(campaignId)

                // Send SSE notification about CSV completion
                const sseService = SSEService.getInstance()
                sseService.sendNotification(userId, {
                    type: 'success',
                    title: 'Email Generation Complete',
                    message: 'All emails have been generated successfully. CSV file is ready for download.',
                    action: {
                        label: 'Download CSV',
                        url: csvUrl
                    }
                })

                console.log(`✅ [Email Generation]: CSV generated for campaign ${campaignId}: ${csvUrl}`)
            }
        } catch (error) {
            console.error(`❌ [Email Generation]: Error checking CSV generation for campaign ${campaignId}:`, error)
        }
    }

    /**
     * Generate CSV file with all prospect data and generated emails
     */
    private static async generateEmailCSV(campaignId: number): Promise<string> {
        try {
            // Get all prospects with their generated emails
            const prospects = await prisma.cOProspects.findMany({
                where: {
                    campaignId: campaignId,
                    status: 'ENRICHED'
                },
                include: {
                    generatedEmail: true,
                    enrichment: true
                }
            })

            // Create CSV content
            const csvHeaders = [
                'Name',
                'Email',
                'Company',
                'Position',
                'LinkedIn URL',
                'Phone',
                'Location',
                'Industry',
                'Company Size',
                'Tech Stack',
                'Email Subject',
                'Email Body',
                'Generation Status',
                'Generated At'
            ]

            const csvRows = prospects.map(prospect => {
                const generatedEmail = prospect.generatedEmail
                // Safely access phone and location from additionalData or direct properties
                const phone = (prospect as any).phone || (prospect as any).additionalData?.phone || '';
                const location = (prospect as any).location || (prospect as any).additionalData?.location || '';

                // Safely handle techStack - it could be an array, string, or object
                let techStackStr = '';
                if (prospect.enrichment?.techStack) {
                    const techStack = (prospect.enrichment as any).techStack;
                    if (Array.isArray(techStack)) {
                        techStackStr = techStack.join(', ');
                    } else if (typeof techStack === 'string') {
                        techStackStr = techStack;
                    } else if (typeof techStack === 'object') {
                        // Handle object case - extract meaningful values
                        techStackStr = Object.values(techStack).filter(Boolean).join(', ');
                    }
                }

                return [
                    prospect.name || '',
                    prospect.email || '',
                    prospect.company || '',
                    prospect.position || '',
                    prospect.linkedinUrl || '',
                    phone,
                    location,
                    (prospect.enrichment as any)?.industry || '',
                    (prospect.enrichment as any)?.companySize || '',
                    techStackStr,
                    generatedEmail?.subject || '',
                    generatedEmail?.body || '',
                    generatedEmail?.generationStatus || 'NOT_GENERATED',
                    generatedEmail?.generatedAt ? new Date(generatedEmail.generatedAt).toISOString() : ''
                ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`)
            })

            const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')

            // Save CSV file
            const filename = `email-campaign-${campaignId}-${Date.now()}.csv`
            const fs = require('fs').promises
            const path = require('path')
            const filepath = path.join(process.cwd(), 'uploads', filename)

            await fs.writeFile(filepath, csvContent, 'utf-8')

            return `/api/email-generation/download/${filename}`
        } catch (error) {
            console.error('Error generating CSV:', error)
            throw error
        }
    }
} 