"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailGenerationProcessor = void 0;
const database_1 = require("@/config/database");
const aiService_1 = require("@/services/ai/aiService");
const sseService_1 = require("@/services/sseService");
const email_generation_1 = require("@/routes/email-generation");
/**
 * Email Generation Job Processor
 * Handles generating personalized emails using AI
 */
class EmailGenerationProcessor {
    /**
     * Process email generation job
     */
    static async process(job) {
        const { prospectId, campaignId, aiProvider, llmModelId, userId = 'user123', batchId } = job.data;
        const startTime = new Date();
        const sseService = sseService_1.SSEService.getInstance();
        try {
            console.log(`📧 [Email Generation]: Starting email generation for prospect ${prospectId} using ${aiProvider}${llmModelId ? ` (${llmModelId})` : ''}`);
            // Send SSE update for process start
            sseService.sendEmailGenerationUpdate(userId, {
                prospectId: prospectId.toString(),
                campaignId: campaignId.toString(),
                status: 'processing'
            });
            // Update job progress
            const initialProgress = {
                progress: 0,
                total: 1,
                processed: 0,
                failed: 0,
                status: 'Starting email generation',
                message: 'Initializing AI email generation',
                startTime,
            };
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(initialProgress));
            await job.updateProgress(initialProgress);
            // Step 1: Get prospect data with enrichment
            const step1Progress = { progress: 10, message: 'Fetching prospect data...' };
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step1Progress));
            await job.updateProgress(step1Progress);
            const prospect = await database_1.prisma.cOProspects.findUnique({
                where: { id: prospectId },
                include: {
                    enrichment: true
                }
            });
            if (!prospect) {
                throw new Error(`Prospect with ID ${prospectId} not found`);
            }
            // Step 2: Get campaign prompts
            const step2Progress = { progress: 20, message: 'Fetching campaign configuration...' };
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step2Progress));
            await job.updateProgress(step2Progress);
            const campaign = await database_1.prisma.cOCampaigns.findUnique({
                where: { id: campaignId }
            });
            if (!campaign) {
                throw new Error(`Campaign with ID ${campaignId} not found`);
            }
            if (!campaign.emailSubject || !campaign.prompt) {
                throw new Error('Campaign missing email subject or prompt configuration');
            }
            // Step 3: Generate email subject
            const step3Progress = { progress: 40, message: 'Generating email subject...' };
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step3Progress));
            await job.updateProgress(step3Progress);
            const emailSubject = await aiService_1.AIService.generateEmailSubject(campaign.emailSubject, {
                ...prospect,
                enrichment: prospect.enrichment
            }, aiProvider, llmModelId);
            // Step 4: Generate email body
            const step4Progress = { progress: 70, message: 'Generating email body...' };
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step4Progress));
            await job.updateProgress(step4Progress);
            const emailBody = await aiService_1.AIService.generateEmailBody(campaign.prompt, {
                ...prospect,
                enrichment: prospect.enrichment
            }, aiProvider, llmModelId);
            // Step 5: Save to database
            const step5Progress = { progress: 90, message: 'Saving generated email...' };
            console.log(`📊 [email-generation]: Job ${job.id} progress:`, JSON.stringify(step5Progress));
            await job.updateProgress(step5Progress);
            // Determine the actual model used for database storage
            let modelUsed;
            if (aiProvider === 'gemini') {
                modelUsed = 'gemini-2.0-flash-exp';
            }
            else {
                // OpenRouter models
                switch (llmModelId) {
                    case 'openrouter-o1-mini':
                        modelUsed = 'openai/o1-mini';
                        break;
                    case 'openrouter-gemini-2.5-pro':
                        modelUsed = 'google/gemini-pro-2.5';
                        break;
                    case 'openrouter-gemini-2.5-flash':
                        modelUsed = 'google/gemini-2.0-flash-exp';
                        break;
                    default:
                        modelUsed = 'openai/o1-mini'; // Default fallback
                        break;
                }
            }
            await database_1.prisma.cOGeneratedEmails.upsert({
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
            });
            // Final progress update
            const finalProgress = {
                progress: 100,
                total: 1,
                processed: 1,
                failed: 0,
                status: 'Completed',
                message: 'Email generation completed successfully',
                startTime,
            };
            console.log(`📊 [email-generation]: Job ${job.id} final progress:`, JSON.stringify(finalProgress));
            await job.updateProgress(finalProgress);
            // Send SSE update for completion
            sseService.sendEmailGenerationUpdate(userId, {
                prospectId: prospectId.toString(),
                campaignId: campaignId.toString(),
                status: 'completed',
                emailId: prospectId.toString(),
                subject: emailSubject,
                preview: emailBody.substring(0, 100) + '...'
            });
            // Update batch job status if batchId is provided
            if (batchId) {
                await (0, email_generation_1.updateJobStatus)(batchId, prospectId, true, {
                    subject: emailSubject,
                    body: emailBody,
                    preview: emailBody.substring(0, 100) + '...'
                });
            }
            console.log(`✅ [Email Generation]: Completed email generation for prospect ${prospectId}`);
            return {
                success: true,
                message: 'Email generation completed successfully',
                data: {
                    prospectId,
                    subject: emailSubject,
                    body: emailBody,
                    preview: emailBody.substring(0, 100) + '...',
                    modelUsed
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
            console.error(`❌ [Email Generation]: Failed to generate email for prospect ${prospectId}:`, error);
            // Send SSE update for failure
            sseService.sendEmailGenerationUpdate(userId, {
                prospectId: prospectId.toString(),
                campaignId: campaignId.toString(),
                status: 'failed',
                error: error instanceof Error ? error.message : String(error)
            });
            // Update batch job status if batchId is provided
            if (batchId) {
                await (0, email_generation_1.updateJobStatus)(batchId, prospectId, false);
            }
            // Save error to database
            try {
                await database_1.prisma.cOGeneratedEmails.upsert({
                    where: { prospectId },
                    update: {
                        generationStatus: 'FAILED',
                        errorMessage: error instanceof Error ? error.message : String(error),
                        generationMetadata: {
                            campaignId,
                            aiProvider,
                            failedAt: new Date().toISOString(),
                            errorDetails: error instanceof Error ? error.stack : String(error)
                        }
                    },
                    create: {
                        prospectId,
                        generationStatus: 'FAILED',
                        errorMessage: error instanceof Error ? error.message : String(error),
                        generationMetadata: {
                            campaignId,
                            aiProvider,
                            failedAt: new Date().toISOString(),
                            errorDetails: error instanceof Error ? error.stack : String(error)
                        }
                    }
                });
            }
            catch (dbError) {
                console.error(`❌ [Email Generation]: Failed to save error to database:`, dbError);
            }
            return {
                success: false,
                message: 'Email generation failed',
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
     * Handle job failure
     */
    static async onFailed(job, error) {
        console.error(`❌ [Email Generation]: Job ${job.id} failed:`, error);
    }
    /**
     * Handle job completion
     */
    static async onCompleted(job, result) {
        console.log(`✅ [Email Generation]: Job ${job.id} completed successfully`);
    }
}
exports.EmailGenerationProcessor = EmailGenerationProcessor;
