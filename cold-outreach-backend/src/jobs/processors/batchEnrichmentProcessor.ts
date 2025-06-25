import { Job } from 'bullmq'
import { BatchEnrichmentJobData, JobResult, JobProgress } from '../queues'
import { EnrichmentService } from '@/services/enrichment'

/**
 * Batch Enrichment Job Processor
 * Handles enriching multiple prospects simultaneously
 */
export class BatchEnrichmentProcessor {
    /**
     * Process batch enrichment job
     */
    static async process(job: Job<BatchEnrichmentJobData>): Promise<JobResult> {
        const { prospectIds } = job.data
        const startTime = new Date()
        const total = prospectIds.length

        try {
            console.log(`🔍 [Batch Enrichment]: Starting batch enrichment for ${total} prospects`)

            // Update job progress
            await job.updateProgress({
                progress: 0,
                total,
                processed: 0,
                failed: 0,
                status: 'Starting batch enrichment',
                message: `Initializing enrichment for ${total} prospects`,
                startTime,
            } as JobProgress)

            // Track processing results
            const results = {
                processed: 0,
                failed: 0,
                skipped: 0,
                errors: [] as string[],
            }

            // Configure enrichment services
            const enrichmentConfig = {
                services: {
                    proxycurl: true,
                    firecrawl: true,
                    builtwith: true
                },
                options: {
                    skipErrors: true, // Continue if one service fails
                    saveRawData: false // Don't save raw API responses to save space
                }
            }

            // Use the EnrichmentService to process prospects with proper rate limiting
            const enrichmentResults = await EnrichmentService.enrichProspects(
                prospectIds.map(id => parseInt(id)),
                enrichmentConfig
            )

            // Track progress as results come in
            for (let i = 0; i < enrichmentResults.length; i++) {
                const enrichmentResult = enrichmentResults[i]!
                const prospectId = enrichmentResult.prospectId

                try {
                    // Update current item in progress
                    await job.updateProgress({
                        progress: Math.floor(((i + 1) / total) * 100),
                        total,
                        processed: results.processed,
                        failed: results.failed,
                        status: 'Processing prospects',
                        message: `Processing prospect ${i + 1} of ${total}`,
                        currentItem: `Prospect ${prospectId}`,
                        startTime,
                    } as JobProgress)

                    if (enrichmentResult.success) {
                        results.processed++
                        console.log(`✅ [Batch Enrichment]: Successfully enriched prospect ${prospectId}`)
                    } else {
                        results.failed++
                        const errorMessages = enrichmentResult.errors?.join(', ') || 'Unknown error'
                        results.errors.push(`Prospect ${prospectId}: ${errorMessages}`)
                        console.error(`❌ [Batch Enrichment]: Failed to enrich prospect ${prospectId}:`, errorMessages)
                    }

                } catch (error) {
                    results.failed++
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    results.errors.push(`Prospect ${prospectId}: ${errorMessage}`)
                    console.error(`❌ [Batch Enrichment]: Failed to enrich prospect ${prospectId}:`, error)
                }
            }

            // Final progress update
            await job.updateProgress({
                progress: 100,
                total,
                processed: results.processed,
                failed: results.failed,
                status: 'Completed',
                message: `Batch enrichment completed: ${results.processed} processed, ${results.failed} failed`,
                startTime,
            } as JobProgress)

            console.log(`✅ [Batch Enrichment]: Completed batch enrichment for ${total} prospects`)

            return {
                success: true,
                message: `Batch enrichment completed: ${results.processed}/${total} prospects processed successfully`,
                data: { batchId: 'mock-batch-id', totalProcessed: results.processed },
                summary: {
                    total,
                    processed: results.processed,
                    failed: results.failed,
                    skipped: results.skipped,
                },
                errors: results.errors,
            }

        } catch (error) {
            console.error(`❌ [Batch Enrichment]: Batch enrichment failed:`, error)

            return {
                success: false,
                message: 'Batch enrichment failed',
                errors: [error instanceof Error ? error.message : String(error)],
                summary: {
                    total,
                    processed: 0,
                    failed: total,
                    skipped: 0,
                },
            }
        }
    }

    /**
     * Handle job failure
     */
    static async onFailed(job: Job<BatchEnrichmentJobData>, error: Error) {
        console.error(`❌ [Batch Enrichment]: Job ${job.id} failed:`, error)
    }

    /**
     * Handle job completion
     */
    static async onCompleted(job: Job<BatchEnrichmentJobData>, result: JobResult) {
        console.log(`✅ [Batch Enrichment]: Job ${job.id} completed successfully`)
    }
} 