import { Request, Response } from 'express';
import { QueueManager, allQueues } from '@/jobs/queues';
import { WorkerManager } from '@/jobs/workers';
import { prisma } from '@/config/database';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/utils/apiResponse';
import { validateJobId, validateUserId } from '@/validators/jobValidators';

/**
 * Job Controller
 * Handles job monitoring, status tracking, and management
 */
export class JobController {
  /**
   * Get job queue statistics
   * GET /api/jobs/stats
   */
  static async getQueueStats(req: Request, res: Response) {
    try {
      const [queueStats, workerStats] = await Promise.all([
        QueueManager.getQueueStats(),
        WorkerManager.getWorkerStats(),
      ]);

      const response = createSuccessResponse({
        queues: queueStats,
        workers: workerStats,
        summary: {
          totalQueues: queueStats.length,
          totalWorkers: workerStats.length,
          activeJobs: queueStats.reduce(
            (sum, queue: any) => sum + (queue.active || 0),
            0
          ),
          waitingJobs: queueStats.reduce(
            (sum, queue: any) => sum + (queue.waiting || 0),
            0
          ),
          failedJobs: queueStats.reduce(
            (sum, queue: any) => sum + (queue.failed || 0),
            0
          ),
          runningWorkers: workerStats.filter(worker => worker.isRunning).length,
        },
      });

      res.json(response);
    } catch (error) {
      console.error('Error getting queue stats:', error);
      const response = createErrorResponse(
        'Failed to get queue statistics',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  /**
   * Get specific job details
   * GET /api/jobs/:jobId
   */
  static async getJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { queueName } = req.query;

      if (!jobId) {
        const response = createErrorResponse(
          'Job ID is required',
          'Job ID parameter is missing'
        );
        res.status(400).json(response);
        return;
      }

      // Validate job ID
      const validation = validateJobId(jobId);
      if (!validation.isValid) {
        const response = createErrorResponse(
          'Invalid job ID',
          validation.errors
        );
        res.status(400).json(response);
        return;
      }

      // Find job in queues
      const job = await QueueManager.getJob(jobId, queueName as string);

      if (!job) {
        const response = createErrorResponse(
          'Job not found',
          `Job with ID ${jobId} not found`
        );
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

      const response = createSuccessResponse(jobDetails);
      res.json(response);
    } catch (error) {
      console.error('Error getting job:', error);
      const response = createErrorResponse(
        'Failed to get job details',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  /**
   * Get jobs for a specific user
   * GET /api/jobs/user/:userId
   */
  static async getUserJobs(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        states = 'waiting,active,completed,failed',
        limit = '50',
        offset = '0',
        queueName,
      } = req.query;

      if (!userId) {
        const response = createErrorResponse(
          'User ID is required',
          'User ID parameter is missing'
        );
        res.status(400).json(response);
        return;
      }

      // Validate user ID
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        const response = createErrorResponse(
          'Invalid user ID',
          validation.errors
        );
        res.status(400).json(response);
        return;
      }

      const stateArray = (states as string).split(',');
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      // Get jobs for user
      const userJobs = await QueueManager.getJobsByUser(userId, stateArray);

      // Filter by queue if specified
      let filteredJobs = userJobs;
      if (queueName) {
        filteredJobs = userJobs.filter(job => job.queueName === queueName);
      }

      // Apply pagination
      const paginatedJobs = filteredJobs.slice(offsetNum, offsetNum + limitNum);

      // Format job data
      const formattedJobs = await Promise.all(
        paginatedJobs.map(async job => ({
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
            ...((job.data as any).prospectId && {
              prospectId: (job.data as any).prospectId,
            }),
            ...((job.data as any).campaignId && {
              campaignId: (job.data as any).campaignId,
            }),
            ...((job.data as any).batchId && {
              batchId: (job.data as any).batchId,
            }),
            ...((job.data as any).workflowSessionId && {
              workflowSessionId: (job.data as any).workflowSessionId,
            }),
          },
        }))
      );

      const response = createSuccessResponse({
        jobs: formattedJobs,
        pagination: {
          total: filteredJobs.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredJobs.length,
        },
      });

      res.json(response);
    } catch (error) {
      console.error('Error getting user jobs:', error);
      const response = createErrorResponse(
        'Failed to get user jobs',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  /**
   * Cancel a job
   * POST /api/jobs/:jobId/cancel
   */
  static async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { queueName } = req.body;

      if (!jobId) {
        const response = createErrorResponse(
          'Job ID is required',
          'Job ID parameter is missing'
        );
        res.status(400).json(response);
        return;
      }

      // Validate job ID
      const validation = validateJobId(jobId);
      if (!validation.isValid) {
        const response = createErrorResponse(
          'Invalid job ID',
          validation.errors
        );
        res.status(400).json(response);
        return;
      }

      // Cancel the job
      const cancelled = await QueueManager.cancelJob(jobId, queueName);

      if (!cancelled) {
        const response = createErrorResponse(
          'Job not found',
          `Job with ID ${jobId} not found or already completed`
        );
        res.status(404).json(response);
        return;
      }

      const response = createSuccessResponse({
        message: 'Job cancelled successfully',
        jobId,
      });

      res.json(response);
    } catch (error) {
      console.error('Error cancelling job:', error);
      const response = createErrorResponse(
        'Failed to cancel job',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  /**
   * Retry a failed job
   * POST /api/jobs/:jobId/retry
   */
  static async retryJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { queueName } = req.body;

      if (!jobId) {
        const response = createErrorResponse(
          'Job ID is required',
          'Job ID parameter is missing'
        );
        res.status(400).json(response);
        return;
      }

      // Validate job ID
      const validation = validateJobId(jobId);
      if (!validation.isValid) {
        const response = createErrorResponse(
          'Invalid job ID',
          validation.errors
        );
        res.status(400).json(response);
        return;
      }

      // Find the job
      const job = await QueueManager.getJob(jobId, queueName);

      if (!job) {
        const response = createErrorResponse(
          'Job not found',
          `Job with ID ${jobId} not found`
        );
        res.status(404).json(response);
        return;
      }

      // Check if job can be retried
      const state = await job.getState();
      if (state !== 'failed') {
        const response = createErrorResponse(
          'Job cannot be retried',
          `Job is in '${state}' state, only failed jobs can be retried`
        );
        res.status(400).json(response);
        return;
      }

      // Retry the job
      await job.retry();

      const response = createSuccessResponse({
        message: 'Job queued for retry',
        jobId,
      });

      res.json(response);
    } catch (error) {
      console.error('Error retrying job:', error);
      const response = createErrorResponse(
        'Failed to retry job',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  /**
   * Pause/Resume queue
   * POST /api/jobs/queue/:queueName/pause
   * POST /api/jobs/queue/:queueName/resume
   */
  static async pauseQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;

      const queue = allQueues.find(q => q.name === queueName);
      if (!queue) {
        const response = createErrorResponse(
          'Queue not found',
          `Queue '${queueName}' not found`
        );
        res.status(404).json(response);
        return;
      }

      await queue.pause();

      const response = createSuccessResponse({
        message: `Queue '${queueName}' paused successfully`,
        queueName,
      });

      res.json(response);
    } catch (error) {
      console.error('Error pausing queue:', error);
      const response = createErrorResponse(
        'Failed to pause queue',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  static async resumeQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;

      const queue = allQueues.find(q => q.name === queueName);
      if (!queue) {
        const response = createErrorResponse(
          'Queue not found',
          `Queue '${queueName}' not found`
        );
        res.status(404).json(response);
        return;
      }

      await queue.resume();

      const response = createSuccessResponse({
        message: `Queue '${queueName}' resumed successfully`,
        queueName,
      });

      res.json(response);
    } catch (error) {
      console.error('Error resuming queue:', error);
      const response = createErrorResponse(
        'Failed to resume queue',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  /**
   * Clean completed/failed jobs
   * POST /api/jobs/clean/completed
   * POST /api/jobs/clean/failed
   */
  static async cleanCompletedJobs(req: Request, res: Response): Promise<void> {
    try {
      const results = await QueueManager.cleanCompletedJobs();

      const response = createSuccessResponse({
        message: 'Completed jobs cleaned successfully',
        results,
      });

      res.json(response);
    } catch (error) {
      console.error('Error cleaning completed jobs:', error);
      const response = createErrorResponse(
        'Failed to clean completed jobs',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  static async cleanFailedJobs(req: Request, res: Response): Promise<void> {
    try {
      const results = await QueueManager.cleanFailedJobs();

      const response = createSuccessResponse({
        message: 'Failed jobs cleaned successfully',
        results,
      });

      res.json(response);
    } catch (error) {
      console.error('Error cleaning failed jobs:', error);
      const response = createErrorResponse(
        'Failed to clean failed jobs',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  /**
   * Get batch processing status
   * GET /api/jobs/batch/:batchId
   */
  static async getBatchStatus(req: Request, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;

      if (!batchId) {
        const response = createErrorResponse(
          'Batch ID is required',
          'Batch ID parameter is missing'
        );
        res.status(400).json(response);
        return;
      }

      // Parse batch ID to integer
      const batchIdInt = parseInt(batchId, 10);
      if (isNaN(batchIdInt)) {
        const response = createErrorResponse(
          'Invalid batch ID',
          'Batch ID must be a valid number'
        );
        res.status(400).json(response);
        return;
      }

      // Get batch from database
      // Database is available via imported prisma
      const batch = await prisma.batch.findUnique({
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
        const response = createErrorResponse(
          'Batch not found',
          `Batch with ID ${batchId} not found`
        );
        res.status(404).json(response);
        return;
      }

      const response = createSuccessResponse(batch);
      res.json(response);
    } catch (error) {
      console.error('Error getting batch status:', error);
      const response = createErrorResponse(
        'Failed to get batch status',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }

  /**
   * Worker health check
   * GET /api/jobs/health
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await WorkerManager.healthCheck();

      const response = createSuccessResponse(health);

      // Return 503 if unhealthy
      if (!health.healthy) {
        res.status(503).json(response);
        return;
      }

      res.json(response);
    } catch (error) {
      console.error('Error checking worker health:', error);
      const response = createErrorResponse(
        'Failed to check worker health',
        error instanceof Error ? error.message : String(error)
      );
      res.status(500).json(response);
    }
  }
}
