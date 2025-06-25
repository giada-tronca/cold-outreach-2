"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobController = void 0;
const queues_1 = require("@/jobs/queues");
const workers_1 = require("@/jobs/workers");
const database_1 = require("@/config/database");
const apiResponse_1 = require("@/utils/apiResponse");
const jobValidators_1 = require("@/validators/jobValidators");
/**
 * Job Controller
 * Handles job monitoring, status tracking, and management
 */
class JobController {
    /**
     * Get job queue statistics
     * GET /api/jobs/stats
     */
    static async getQueueStats(req, res) {
        try {
            const [queueStats, workerStats] = await Promise.all([
                queues_1.QueueManager.getQueueStats(),
                workers_1.WorkerManager.getWorkerStats(),
            ]);
            const response = (0, apiResponse_1.createSuccessResponse)({
                queues: queueStats,
                workers: workerStats,
                summary: {
                    totalQueues: queueStats.length,
                    totalWorkers: workerStats.length,
                    activeJobs: queueStats.reduce((sum, queue) => sum + (queue.active || 0), 0),
                    waitingJobs: queueStats.reduce((sum, queue) => sum + (queue.waiting || 0), 0),
                    failedJobs: queueStats.reduce((sum, queue) => sum + (queue.failed || 0), 0),
                    runningWorkers: workerStats.filter(worker => worker.isRunning).length,
                },
            });
            res.json(response);
        }
        catch (error) {
            console.error('Error getting queue stats:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to get queue statistics', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    /**
     * Get specific job details
     * GET /api/jobs/:jobId
     */
    static async getJob(req, res) {
        try {
            const { jobId } = req.params;
            const { queueName } = req.query;
            if (!jobId) {
                const response = (0, apiResponse_1.createErrorResponse)('Job ID is required', 'Job ID parameter is missing');
                res.status(400).json(response);
                return;
            }
            // Validate job ID
            const validation = (0, jobValidators_1.validateJobId)(jobId);
            if (!validation.isValid) {
                const response = (0, apiResponse_1.createErrorResponse)('Invalid job ID', validation.errors);
                res.status(400).json(response);
                return;
            }
            // Find job in queues
            const job = await queues_1.QueueManager.getJob(jobId, queueName);
            if (!job) {
                const response = (0, apiResponse_1.createErrorResponse)('Job not found', `Job with ID ${jobId} not found`);
                res.status(404).json(response);
                return;
            }
            // Get job details
            const jobDetails = {
                id: job.id,
                name: job.name,
                queueName: job.queueName,
                data: job.data,
                progress: job.progress,
                state: await job.getState(),
                created: job.timestamp,
                processed: job.processedOn,
                finished: job.finishedOn,
                failed: job.failedReason,
                attempts: job.attemptsMade,
                maxAttempts: job.opts.attempts,
                delay: job.opts.delay,
                priority: job.opts.priority,
                returnValue: job.returnvalue,
            };
            const response = (0, apiResponse_1.createSuccessResponse)(jobDetails);
            res.json(response);
        }
        catch (error) {
            console.error('Error getting job:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to get job details', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    /**
     * Get jobs for a specific user
     * GET /api/jobs/user/:userId
     */
    static async getUserJobs(req, res) {
        try {
            const { userId } = req.params;
            const { states = 'waiting,active,completed,failed', limit = '50', offset = '0', queueName, } = req.query;
            if (!userId) {
                const response = (0, apiResponse_1.createErrorResponse)('User ID is required', 'User ID parameter is missing');
                res.status(400).json(response);
                return;
            }
            // Validate user ID
            const validation = (0, jobValidators_1.validateUserId)(userId);
            if (!validation.isValid) {
                const response = (0, apiResponse_1.createErrorResponse)('Invalid user ID', validation.errors);
                res.status(400).json(response);
                return;
            }
            const stateArray = states.split(',');
            const limitNum = parseInt(limit, 10);
            const offsetNum = parseInt(offset, 10);
            // Get jobs for user
            const userJobs = await queues_1.QueueManager.getJobsByUser(userId, stateArray);
            // Filter by queue if specified
            let filteredJobs = userJobs;
            if (queueName) {
                filteredJobs = userJobs.filter(job => job.queueName === queueName);
            }
            // Apply pagination
            const paginatedJobs = filteredJobs.slice(offsetNum, offsetNum + limitNum);
            // Format job data
            const formattedJobs = await Promise.all(paginatedJobs.map(async (job) => ({
                id: job.id,
                name: job.name,
                queueName: job.queueName,
                state: await job.getState(),
                progress: job.progress,
                created: job.timestamp,
                processed: job.processedOn,
                finished: job.finishedOn,
                failed: job.failedReason,
                data: {
                    // Include only non-sensitive data
                    ...(job.data.prospectId && {
                        prospectId: job.data.prospectId,
                    }),
                    ...(job.data.campaignId && {
                        campaignId: job.data.campaignId,
                    }),
                    ...(job.data.batchId && {
                        batchId: job.data.batchId,
                    }),
                    ...(job.data.workflowSessionId && {
                        workflowSessionId: job.data.workflowSessionId,
                    }),
                },
            })));
            const response = (0, apiResponse_1.createSuccessResponse)({
                jobs: formattedJobs,
                pagination: {
                    total: filteredJobs.length,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + limitNum < filteredJobs.length,
                },
            });
            res.json(response);
        }
        catch (error) {
            console.error('Error getting user jobs:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to get user jobs', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    /**
     * Cancel a job
     * POST /api/jobs/:jobId/cancel
     */
    static async cancelJob(req, res) {
        try {
            const { jobId } = req.params;
            const { queueName } = req.body;
            if (!jobId) {
                const response = (0, apiResponse_1.createErrorResponse)('Job ID is required', 'Job ID parameter is missing');
                res.status(400).json(response);
                return;
            }
            // Validate job ID
            const validation = (0, jobValidators_1.validateJobId)(jobId);
            if (!validation.isValid) {
                const response = (0, apiResponse_1.createErrorResponse)('Invalid job ID', validation.errors);
                res.status(400).json(response);
                return;
            }
            // Cancel the job
            const cancelled = await queues_1.QueueManager.cancelJob(jobId, queueName);
            if (!cancelled) {
                const response = (0, apiResponse_1.createErrorResponse)('Job not found', `Job with ID ${jobId} not found or already completed`);
                res.status(404).json(response);
                return;
            }
            const response = (0, apiResponse_1.createSuccessResponse)({
                message: 'Job cancelled successfully',
                jobId,
            });
            res.json(response);
        }
        catch (error) {
            console.error('Error cancelling job:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to cancel job', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    /**
     * Retry a failed job
     * POST /api/jobs/:jobId/retry
     */
    static async retryJob(req, res) {
        try {
            const { jobId } = req.params;
            const { queueName } = req.body;
            if (!jobId) {
                const response = (0, apiResponse_1.createErrorResponse)('Job ID is required', 'Job ID parameter is missing');
                res.status(400).json(response);
                return;
            }
            // Validate job ID
            const validation = (0, jobValidators_1.validateJobId)(jobId);
            if (!validation.isValid) {
                const response = (0, apiResponse_1.createErrorResponse)('Invalid job ID', validation.errors);
                res.status(400).json(response);
                return;
            }
            // Find the job
            const job = await queues_1.QueueManager.getJob(jobId, queueName);
            if (!job) {
                const response = (0, apiResponse_1.createErrorResponse)('Job not found', `Job with ID ${jobId} not found`);
                res.status(404).json(response);
                return;
            }
            // Check if job can be retried
            const state = await job.getState();
            if (state !== 'failed') {
                const response = (0, apiResponse_1.createErrorResponse)('Job cannot be retried', `Job is in '${state}' state, only failed jobs can be retried`);
                res.status(400).json(response);
                return;
            }
            // Retry the job
            await job.retry();
            const response = (0, apiResponse_1.createSuccessResponse)({
                message: 'Job queued for retry',
                jobId,
            });
            res.json(response);
        }
        catch (error) {
            console.error('Error retrying job:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to retry job', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    /**
     * Pause/Resume queue
     * POST /api/jobs/queue/:queueName/pause
     * POST /api/jobs/queue/:queueName/resume
     */
    static async pauseQueue(req, res) {
        try {
            const { queueName } = req.params;
            const queue = queues_1.allQueues.find(q => q.name === queueName);
            if (!queue) {
                const response = (0, apiResponse_1.createErrorResponse)('Queue not found', `Queue '${queueName}' not found`);
                res.status(404).json(response);
                return;
            }
            await queue.pause();
            const response = (0, apiResponse_1.createSuccessResponse)({
                message: `Queue '${queueName}' paused successfully`,
                queueName,
            });
            res.json(response);
        }
        catch (error) {
            console.error('Error pausing queue:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to pause queue', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    static async resumeQueue(req, res) {
        try {
            const { queueName } = req.params;
            const queue = queues_1.allQueues.find(q => q.name === queueName);
            if (!queue) {
                const response = (0, apiResponse_1.createErrorResponse)('Queue not found', `Queue '${queueName}' not found`);
                res.status(404).json(response);
                return;
            }
            await queue.resume();
            const response = (0, apiResponse_1.createSuccessResponse)({
                message: `Queue '${queueName}' resumed successfully`,
                queueName,
            });
            res.json(response);
        }
        catch (error) {
            console.error('Error resuming queue:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to resume queue', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    /**
     * Clean completed/failed jobs
     * POST /api/jobs/clean/completed
     * POST /api/jobs/clean/failed
     */
    static async cleanCompletedJobs(req, res) {
        try {
            const results = await queues_1.QueueManager.cleanCompletedJobs();
            const response = (0, apiResponse_1.createSuccessResponse)({
                message: 'Completed jobs cleaned successfully',
                results,
            });
            res.json(response);
        }
        catch (error) {
            console.error('Error cleaning completed jobs:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to clean completed jobs', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    static async cleanFailedJobs(req, res) {
        try {
            const results = await queues_1.QueueManager.cleanFailedJobs();
            const response = (0, apiResponse_1.createSuccessResponse)({
                message: 'Failed jobs cleaned successfully',
                results,
            });
            res.json(response);
        }
        catch (error) {
            console.error('Error cleaning failed jobs:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to clean failed jobs', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    /**
     * Get batch processing status
     * GET /api/jobs/batch/:batchId
     */
    static async getBatchStatus(req, res) {
        try {
            const { batchId } = req.params;
            if (!batchId) {
                const response = (0, apiResponse_1.createErrorResponse)('Batch ID is required', 'Batch ID parameter is missing');
                res.status(400).json(response);
                return;
            }
            // Parse batch ID to integer
            const batchIdInt = parseInt(batchId, 10);
            if (isNaN(batchIdInt)) {
                const response = (0, apiResponse_1.createErrorResponse)('Invalid batch ID', 'Batch ID must be a valid number');
                res.status(400).json(response);
                return;
            }
            // Get batch from database
            // Database is available via imported prisma
            const batch = await database_1.prisma.batch.findUnique({
                where: { id: batchIdInt },
                include: {
                    campaign: {
                        select: { id: true, name: true },
                    },
                    prospects: {
                        select: { id: true, status: true },
                    },
                },
            });
            if (!batch) {
                const response = (0, apiResponse_1.createErrorResponse)('Batch not found', `Batch with ID ${batchId} not found`);
                res.status(404).json(response);
                return;
            }
            const response = (0, apiResponse_1.createSuccessResponse)(batch);
            res.json(response);
        }
        catch (error) {
            console.error('Error getting batch status:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to get batch status', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
    /**
     * Worker health check
     * GET /api/jobs/health
     */
    static async healthCheck(req, res) {
        try {
            const health = await workers_1.WorkerManager.healthCheck();
            const response = (0, apiResponse_1.createSuccessResponse)(health);
            // Return 503 if unhealthy
            if (!health.healthy) {
                res.status(503).json(response);
                return;
            }
            res.json(response);
        }
        catch (error) {
            console.error('Error checking worker health:', error);
            const response = (0, apiResponse_1.createErrorResponse)('Failed to check worker health', error instanceof Error ? error.message : String(error));
            res.status(500).json(response);
        }
    }
}
exports.JobController = JobController;
