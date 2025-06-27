import { Job } from 'bullmq'
import { EmailGenerationJobData, JobResult } from '../queues'
import { prisma } from '@/config/database'
import { SSEService } from '@/services/sseService'



/**
 * Email Generation Job Processor
 * Handles generating personalized emails using AI (following enrichment patterns)
 */
export class EmailGenerationProcessor {
    /**
     * Process email generation job
     */
    static async process(job: Job<EmailGenerationJobData>): Promise<JobResult> {
        const { prospectId, campaignId, userId, aiProvider, llmModelId, configuration } = job.data
        const sseService = SSEService.getInstance()

        console.log(`�� [Email Generation] Starting email generation for prospect ${prospectId}`)

        try {
            // Get prospect data with enrichment information and campaign data
            console.log(`   📊 Fetching prospect data...`)
            const prospect = await prisma.cOProspects.findUnique({
                where: { id: prospectId },
                include: {
                    enrichment: true,
                    campaign: true
                }
            })

            if (!prospect) {
                const errorMsg = `Prospect ${prospectId} not found`
                console.log(`   ❌ ${errorMsg}`)

                // Send failure SSE update
                sseService.sendEmailGenerationUpdate(userId, {
                    prospectId: prospectId.toString(),
                    campaignId: campaignId.toString(),
                    status: 'error',
                    error: errorMsg
                })

                throw new Error(errorMsg)
            }

            console.log(`   ✅ Prospect found: ${prospect.name} (${prospect.email})`)
            console.log(`   📈 Status: ${prospect.status}`)

            // Validate campaign data and email templates
            if (!prospect.campaign) {
                const errorMsg = `Campaign not found for prospect ${prospectId}`
                console.log(`   ❌ ${errorMsg}`)

                sseService.sendEmailGenerationUpdate(userId, {
                    prospectId: prospectId.toString(),
                    campaignId: campaignId.toString(),
                    status: 'error',
                    error: errorMsg
                })

                throw new Error(errorMsg)
            }

            const emailSubjectTemplate = prospect.campaign.emailSubject
            const emailBodyTemplate = prospect.campaign.prompt

            if (!emailSubjectTemplate || !emailBodyTemplate) {
                const errorMsg = `Campaign ${campaignId} missing email templates (subject: ${!!emailSubjectTemplate}, body: ${!!emailBodyTemplate})`
                console.log(`   ❌ ${errorMsg}`)

                sseService.sendEmailGenerationUpdate(userId, {
                    prospectId: prospectId.toString(),
                    campaignId: campaignId.toString(),
                    status: 'error',
                    error: errorMsg
                })

                throw new Error(errorMsg)
            }

            console.log(`   ✅ Email templates loaded from campaign ${campaignId}`)
            console.log(`   📧 Subject template: "${emailSubjectTemplate.substring(0, 50)}..."`)
            console.log(`   📄 Body template: "${emailBodyTemplate.substring(0, 50)}..."`)

            // Build context from enrichment data
            console.log(`   🔍 Building comprehensive context...`)
            const enrichmentData = prospect.enrichment

            let context = ''

            // Add basic prospect info
            context += `**Prospect Information:**\n`
            context += `- Name: ${prospect.name}\n`
            context += `- Email: ${prospect.email}\n`
            context += `- Company: ${prospect.company || 'Not specified'}\n`
            context += `- Position: ${prospect.position || 'Not specified'}\n`
            if (prospect.linkedinUrl) context += `- LinkedIn: ${prospect.linkedinUrl}\n`

            // Get phone and location from additionalData
            const additionalData = prospect.additionalData as any
            if (additionalData?.location) context += `- Location: ${additionalData.location}\n`
            if (additionalData?.phone) context += `- Phone: ${additionalData.phone}\n`
            context += '\n'

            // Add enrichment summaries if available
            if (enrichmentData) {
                console.log(`   📋 Adding enrichment summaries...`)

                if (enrichmentData.companySummary) {
                    context += `**Company Summary:**\n${enrichmentData.companySummary}\n\n`
                }

                if (enrichmentData.linkedinSummary) {
                    context += `**LinkedIn Summary:**\n${enrichmentData.linkedinSummary}\n\n`
                }

                if (enrichmentData.builtwithSummary) {
                    context += `**Technology Stack Summary:**\n${enrichmentData.builtwithSummary}\n\n`
                }

                if (enrichmentData.prospectAnalysisSummary) {
                    context += `**Prospect Analysis Summary:**\n${enrichmentData.prospectAnalysisSummary}\n\n`
                }
            } else {
                console.log(`   ⚠️  No enrichment data available`)
                context += `**Note:** No enrichment data available for this prospect.\n\n`
            }

            console.log(`   ✅ Context built (${context.length} characters)`)

            // Extract first name for personalization
            const firstName = prospect.name.split(' ')[0] || prospect.name
            console.log(`   👤 First name extracted: ${firstName}`)

            // Generate email subject with variable replacement
            console.log(`   📝 Generating email subject...`)
            const subjectWithVariables = emailSubjectTemplate.replace(/\$\{first_name\}/g, firstName)

            console.log(`   🤖 Sending subject to AI for generation...`)
            const subjectPrompt = `Create a professional, engaging email subject line based on this template: "${subjectWithVariables}". Make it personalized and compelling for sales outreach. Return only the subject line without quotes.`

            let generatedSubject: string;
            if (aiProvider === 'gemini') {
                const result = await this.generateWithGemini(subjectPrompt, llmModelId);
                generatedSubject = result;
            } else {
                const result = await this.generateWithOpenRouter(subjectPrompt, llmModelId);
                generatedSubject = result;
            }

            console.log(`   ✅ Subject generated: "${generatedSubject}"`)

            // Generate email body with comprehensive variable replacement
            console.log(`   📄 Generating email body...`)
            let bodyWithVariables = emailBodyTemplate
                .replace(/\$\{first_name\}/g, firstName)
                .replace(/\$\{language\}/g, configuration?.language || 'English')
                .replace(/\$\{calendar_link\}/g, configuration?.calendarLink || '')
                .replace(/\$\{CONTEXT\}/g, context)

            console.log(`   🤖 Sending body to AI for generation...`)
            const bodyPrompt = `Create a professional, personalized sales email based on this template: "${bodyWithVariables}". Use the context provided to make it highly relevant and engaging. Maintain a professional tone and include a clear call-to-action. Return only the email body content.`

            let generatedBody: string;
            if (aiProvider === 'gemini') {
                const result = await this.generateWithGemini(bodyPrompt, llmModelId);
                generatedBody = result;
            } else {
                const result = await this.generateWithOpenRouter(bodyPrompt, llmModelId);
                generatedBody = result;
            }

            console.log(`   ✅ Body generated (${generatedBody.length} characters)`)

            // Store the generated email
            console.log(`   💾 Saving generated email to database...`)
            const emailRecord = await prisma.cOGeneratedEmails.create({
                data: {
                    prospectId: prospectId,
                    subject: generatedSubject,
                    body: generatedBody,
                    generationStatus: 'COMPLETED',
                    language: configuration?.language || 'English',
                    generatedAt: new Date(),
                    modelUsed: `${aiProvider}${llmModelId ? `-${llmModelId}` : ''}`,
                    generationMetadata: {
                        aiProvider: aiProvider,
                        llmModelId: llmModelId,
                        language: configuration?.language || 'English',
                        calendarLink: configuration?.calendarLink || '',
                        originalSubject: emailSubjectTemplate,
                        originalBody: emailBodyTemplate,
                        generatedAt: new Date().toISOString(),
                        contextLength: context.length,
                        processingTime: Date.now() - (job.processedOn || Date.now())
                    }
                }
            })

            // Update prospect status to EMAIL_GENERATED
            await prisma.cOProspects.update({
                where: { id: prospectId },
                data: { status: 'EMAIL_GENERATED' }
            })

            console.log(`   ✅ Email saved for prospect: ${emailRecord.prospectId}`)
            console.log(`   📊 Prospect status updated to: EMAIL_GENERATED`)

            // Send completion SSE update (ONLY on completion)
            sseService.sendEmailGenerationUpdate(userId, {
                prospectId: prospectId.toString(),
                campaignId: campaignId.toString(),
                status: 'completed',
                subject: generatedSubject,
                preview: generatedBody.substring(0, 100) + '...'
            })

            console.log(`   🎉 Email generation completed successfully for prospect ${prospectId}`)
            console.log(`   📡 SSE completion update sent to user ${userId}\n`)

            return {
                success: true,
                message: `Email generated successfully for prospect ${prospectId}`,
                data: {
                    prospectId,
                    subject: generatedSubject,
                    body: generatedBody
                }
            }

        } catch (error) {
            console.log(`   ❌ Email generation failed for prospect ${prospectId}:`)
            console.log(`   💥 Error: ${error instanceof Error ? error.message : 'Unknown error'}`)

            // Send failure SSE update (ONLY on failure)
            sseService.sendEmailGenerationUpdate(userId, {
                prospectId: prospectId.toString(),
                campaignId: campaignId.toString(),
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            })

            console.log(`   📡 SSE failure update sent to user ${userId}\n`)

            throw error
        }
    }

    /**
     * Generate content using Gemini API with proper model selection
     */
    private static async generateWithGemini(prompt: string, llmModelId?: string): Promise<string> {
        try {
            const { ApiConfigurationService } = await import('@/services/enrichment/apiConfigurationService')
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey')
            if (!apiKey) {
                throw new Error('Gemini API key not configured')
            }

            // Check if llmModelId is provided from frontend
            if (!llmModelId) {
                console.error('❌ [Email Generation]: No AI model provided from frontend. llmModelId is required.')
                throw new Error('No AI model specified. Please select a model in the frontend.')
            }

            // Map our custom model IDs to actual Gemini model names
            let model: string
            switch (llmModelId) {
                case 'gemini-2.0-flash-exp':
                    model = 'gemini-2.0-flash-exp'
                    break
                case 'gemini-2.0-flash':
                    model = 'gemini-2.0-flash'
                    break
                case 'gemini-1.5-pro':
                    model = 'gemini-1.5-pro'
                    break
                case 'gemini-1.5-flash':
                    model = 'gemini-1.5-flash'
                    break
                default:
                    console.error(`❌ [Email Generation]: Unknown AI model ID from frontend: ${llmModelId}. No fallback model will be used.`)
                    throw new Error(`Unknown AI model: ${llmModelId}. Please select a valid model in the frontend.`)
            }

            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

            const requestData = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            }

            const { default: axios } = await import('axios')
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

            const responseData = response.data

            if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return responseData.candidates[0].content.parts[0].text
            } else {
                throw new Error('Invalid response format from Gemini API')
            }
        } catch (error) {
            console.error('❌ [Email Generation]: Gemini API error:', error instanceof Error ? error.message : 'Unknown error')
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Generate content using OpenRouter API with proper model selection
     */
    private static async generateWithOpenRouter(prompt: string, llmModelId?: string): Promise<string> {
        try {
            const { ApiConfigurationService } = await import('@/services/enrichment/apiConfigurationService')
            const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')
            if (!apiKey) {
                throw new Error('OpenRouter API key not configured')
            }

            // Check if llmModelId is provided from frontend
            if (!llmModelId) {
                console.error('❌ [Email Generation]: No AI model provided from frontend. llmModelId is required.')
                throw new Error('No AI model specified. Please select a model in the frontend.')
            }

            // Map our custom model IDs to actual OpenRouter model names
            let model: string
            let requestBody: any

            switch (llmModelId) {
                case 'openrouter-o1-mini':
                    model = 'openai/o1-mini'
                    requestBody = {
                        model,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ]
                    }
                    break
                case 'openrouter-gemini-2.5-pro':
                    model = 'google/gemini-2.5-pro'
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
                    }
                    break
                case 'openrouter-gemini-2.5-flash':
                    model = 'google/gemini-2.5-flash'
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
                    }
                    break
                default:
                    console.error(`❌ [Email Generation]: Unknown AI model ID from frontend: ${llmModelId}. No fallback model will be used.`)
                    throw new Error(`Unknown AI model: ${llmModelId}. Please select a valid model in the frontend.`)
            }

            const { default: axios } = await import('axios')
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

            const responseData = response.data

            if (responseData?.choices?.[0]?.message?.content) {
                return responseData.choices[0].message.content
            } else {
                throw new Error('Invalid response format from OpenRouter API')
            }
        } catch (error) {
            console.error('❌ [Email Generation]: OpenRouter API error:', error instanceof Error ? error.message : 'Unknown error')
            throw new Error(`OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Handle job completion
     */
    static async onCompleted(job: Job<EmailGenerationJobData>, result: JobResult) {
        const { prospectId } = job.data

        console.log(`✅ [Email Generation] Job completed for prospect ${prospectId}`)
        console.log(`   📊 Result: ${result.message}`)
        console.log(`   ⏱️  Processing time: ${Date.now() - job.processedOn!}ms\n`)
    }

    /**
     * Handle job failure
     */
    static async onFailed(job: Job<EmailGenerationJobData>, error: Error) {
        const { prospectId } = job.data

        console.log(`❌ [Email Generation] Job failed for prospect ${prospectId}`)
        console.log(`   💥 Error: ${error.message}`)
        console.log(`   🔄 Attempts: ${job.attemptsMade}/${job.opts.attempts}\n`)
    }
} 