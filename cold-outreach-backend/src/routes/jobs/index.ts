import { Router, Request, Response } from 'express'
import { JobController } from '@/controllers/jobController'
import { createSSEHandler } from '@/services/sseService'
import {
    validateJobIdParam,
    validateUserIdParam,
    validateBatchIdParam,
    validateQueueNameParam,
    validateUserJobsQuery,
    validateJobActionBody,
    validateProspectEnrichmentJob,
    validateEmailGenerationJob,
    validateBatchEnrichmentJob,
    validateBatchEmailGenerationJob,
} from '@/validators/jobValidators'
import { handleValidationErrors } from '@/middleware/validation'

const router = Router()

/**
 * Real-time Updates (Server-Sent Events)
 */

// SSE connection for job progress updates
// GET /api/jobs/stream/:userId
router.get(
    '/stream/:userId',
    validateUserIdParam,
    handleValidationErrors,
    (req: Request, res: Response) => {
        const { userId } = req.params
        if (!userId) {
            res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
            return;
        }
        const sseHandler = createSSEHandler(userId)
        sseHandler(req, res)
    }
)

/**
 * Queue Statistics
 * GET /api/jobs/stats
 */
router.get('/stats', JobController.getQueueStats)

/**
 * Worker Health Check
 * GET /api/jobs/health
 */
router.get('/health', JobController.healthCheck)

/**
 * Job Management
 */

// Get specific job details
// GET /api/jobs/:jobId
router.get(
    '/:jobId',
    validateJobIdParam,
    handleValidationErrors,
    JobController.getJob
)

// Cancel a job
// POST /api/jobs/:jobId/cancel
router.post(
    '/:jobId/cancel',
    validateJobIdParam,
    validateJobActionBody,
    handleValidationErrors,
    JobController.cancelJob
)

// Retry a failed job
// POST /api/jobs/:jobId/retry
router.post(
    '/:jobId/retry',
    validateJobIdParam,
    validateJobActionBody,
    handleValidationErrors,
    JobController.retryJob
)

/**
 * User Job Management
 */

// Get jobs for a specific user
// GET /api/jobs/user/:userId
router.get(
    '/user/:userId',
    validateUserIdParam,
    validateUserJobsQuery,
    handleValidationErrors,
    JobController.getUserJobs
)

/**
 * Queue Management
 */

// Pause a queue
// POST /api/jobs/queue/:queueName/pause
router.post(
    '/queue/:queueName/pause',
    validateQueueNameParam,
    handleValidationErrors,
    JobController.pauseQueue
)

// Resume a queue
// POST /api/jobs/queue/:queueName/resume
router.post(
    '/queue/:queueName/resume',
    validateQueueNameParam,
    handleValidationErrors,
    JobController.resumeQueue
)

/**
 * Job Cleanup
 */

// Clean completed jobs
// POST /api/jobs/clean/completed
router.post('/clean/completed', JobController.cleanCompletedJobs)

// Clean failed jobs
// POST /api/jobs/clean/failed
router.post('/clean/failedJobs', JobController.cleanFailedJobs)

/**
 * Batch Processing
 */

// Get batch status
// GET /api/jobs/batch/:batchId
router.get(
    '/batch/:batchId',
    validateBatchIdParam,
    handleValidationErrors,
    JobController.getBatchStatus
)

/**
 * Job Creation Endpoints
 * These endpoints allow creating new jobs programmatically
 */

// Create prospect enrichment job
// POST /api/jobs/enrichment
router.post(
    '/enrichment',
    validateProspectEnrichmentJob,
    handleValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { prospectEnrichmentQueue } = await import('@/jobs/queues')

            const job = await prospectEnrichmentQueue.add(
                `enrichment-${req.body.prospectId}`,
                req.body,
                {
                    priority: 5,
                    attempts: 3,
                }
            )

            res.json({
                success: true,
                message: 'Prospect enrichment job created successfully',
                data: {
                    jobId: job.id,
                    queueName: job.queueName,
                    prospectId: req.body.prospectId,
                },
            })
        } catch (error) {
            console.error('Error creating enrichment job:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create enrichment job',
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }
)

// Create email generation job
// POST /api/jobs/email-generation
router.post(
    '/email-generation',
    validateEmailGenerationJob,
    handleValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { emailGenerationQueue } = await import('@/jobs/queues')

            const job = await emailGenerationQueue.add(
                `email-generation-${req.body.prospectId}`,
                req.body,
                {
                    priority: 5,
                    attempts: 3,
                }
            )

            res.json({
                success: true,
                message: 'Email generation job created successfully',
                data: {
                    jobId: job.id,
                    queueName: job.queueName,
                    prospectId: req.body.prospectId,
                    campaignId: req.body.campaignId,
                },
            })
        } catch (error) {
            console.error('Error creating email generation job:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create email generation job',
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }
)

// Create batch enrichment job
// POST /api/jobs/batch-enrichment
router.post(
    '/batch-enrichment',
    validateBatchEnrichmentJob,
    handleValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { batchEnrichmentQueue } = await import('@/jobs/queues')

            const job = await batchEnrichmentQueue.add(
                `batch-enrichment-${req.body.batchId}`,
                req.body,
                {
                    priority: 3,
                    attempts: 3,
                }
            )

            res.json({
                success: true,
                message: 'Batch enrichment job created successfully',
                data: {
                    jobId: job.id,
                    queueName: job.queueName,
                    batchId: req.body.batchId,
                    prospectCount: req.body.prospectIds.length,
                },
            })
        } catch (error) {
            console.error('Error creating batch enrichment job:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create batch enrichment job',
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }
)

// Create batch email generation job
// POST /api/jobs/batch-email-generation
router.post(
    '/batch-email-generation',
    validateBatchEmailGenerationJob,
    handleValidationErrors,
    async (req: Request, res: Response) => {
        try {
            const { batchEmailGenerationQueue } = await import('@/jobs/queues')

            const job = await batchEmailGenerationQueue.add(
                `batch-email-generation-${req.body.batchId}`,
                req.body,
                {
                    priority: 3,
                    attempts: 3,
                }
            )

            res.json({
                success: true,
                message: 'Batch email generation job created successfully',
                data: {
                    jobId: job.id,
                    queueName: job.queueName,
                    batchId: req.body.batchId,
                    prospectCount: req.body.prospectIds.length,
                    campaignId: req.body.campaignId,
                },
            })
        } catch (error) {
            console.error('Error creating batch email generation job:', error)
            res.status(500).json({
                success: false,
                message: 'Failed to create batch email generation job',
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }
)

export default router 