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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jobController_1 = require("@/controllers/jobController");
const sseService_1 = require("@/services/sseService");
const jobValidators_1 = require("@/validators/jobValidators");
const validation_1 = require("@/middleware/validation");
const router = (0, express_1.Router)();
/**
 * Specific routes must come before parameterized routes
 */
/**
 * Worker Health Check
 * GET /api/jobs/health
 */
router.get('/health', jobController_1.JobController.healthCheck);
/**
 * Queue Statistics
 * GET /api/jobs/stats
 */
router.get('/stats', jobController_1.JobController.getQueueStats);
/**
 * SSE Statistics and Debugging
 * GET /api/jobs/sse-stats
 */
router.get('/sse-stats', (req, res) => {
    try {
        const sseService = sseService_1.SSEService.getInstance();
        const stats = sseService.getStats();
        res.json({
            success: true,
            data: {
                ...stats,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error getting SSE stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get SSE statistics',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Job Cleanup (specific routes)
 */
// Clean completed jobs
// POST /api/jobs/clean/completed
router.post('/clean/completed', jobController_1.JobController.cleanCompletedJobs);
// Clean failed jobs
// POST /api/jobs/clean/failed
router.post('/clean/failedJobs', jobController_1.JobController.cleanFailedJobs);
/**
 * Real-time Updates (Server-Sent Events)
 */
// SSE connection for job progress updates
// GET /api/jobs/stream/:userId
router.get('/stream/:userId', jobValidators_1.validateUserIdParam, validation_1.handleValidationErrors, (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        res.status(400).json({
            success: false,
            message: 'User ID is required'
        });
        return;
    }
    const sseHandler = (0, sseService_1.createSSEHandler)(userId);
    sseHandler(req, res);
});
/**
 * Job Management (parameterized routes come after specific ones)
 */
// Get specific job details
// GET /api/jobs/:jobId
router.get('/:jobId', jobValidators_1.validateJobIdParam, validation_1.handleValidationErrors, jobController_1.JobController.getJob);
// Cancel a job
// POST /api/jobs/:jobId/cancel
router.post('/:jobId/cancel', jobValidators_1.validateJobIdParam, jobValidators_1.validateJobActionBody, validation_1.handleValidationErrors, jobController_1.JobController.cancelJob);
// Retry a failed job
// POST /api/jobs/:jobId/retry
router.post('/:jobId/retry', jobValidators_1.validateJobIdParam, jobValidators_1.validateJobActionBody, validation_1.handleValidationErrors, jobController_1.JobController.retryJob);
/**
 * User Job Management
 */
// Get jobs for a specific user
// GET /api/jobs/user/:userId
router.get('/user/:userId', jobValidators_1.validateUserIdParam, jobValidators_1.validateUserJobsQuery, validation_1.handleValidationErrors, jobController_1.JobController.getUserJobs);
/**
 * Queue Management
 */
// Pause a queue
// POST /api/jobs/queue/:queueName/pause
router.post('/queue/:queueName/pause', jobValidators_1.validateQueueNameParam, validation_1.handleValidationErrors, jobController_1.JobController.pauseQueue);
// Resume a queue
// POST /api/jobs/queue/:queueName/resume
router.post('/queue/:queueName/resume', jobValidators_1.validateQueueNameParam, validation_1.handleValidationErrors, jobController_1.JobController.resumeQueue);
/**
 * Job Cleanup - moved to top to avoid route conflicts
 */
/**
 * Batch Processing
 */
// Get batch status
// GET /api/jobs/batch/:batchId
router.get('/batch/:batchId', jobValidators_1.validateBatchIdParam, validation_1.handleValidationErrors, jobController_1.JobController.getBatchStatus);
/**
 * Job Creation Endpoints
 * These endpoints allow creating new jobs programmatically
 */
// Create prospect enrichment job
// POST /api/jobs/enrichment
router.post('/enrichment', jobValidators_1.validateProspectEnrichmentJob, validation_1.handleValidationErrors, async (req, res) => {
    try {
        const { prospectEnrichmentQueue } = await Promise.resolve().then(() => __importStar(require('@/jobs/queues')));
        const job = await prospectEnrichmentQueue.add(`enrichment-${req.body.prospectId}`, req.body, {
            priority: 5,
            attempts: 3,
        });
        res.json({
            success: true,
            message: 'Prospect enrichment job created successfully',
            data: {
                jobId: job.id,
                queueName: job.queueName,
                prospectId: req.body.prospectId,
            },
        });
    }
    catch (error) {
        console.error('Error creating enrichment job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create enrichment job',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
// Create email generation job
// POST /api/jobs/email-generation
router.post('/email-generation', jobValidators_1.validateEmailGenerationJob, validation_1.handleValidationErrors, async (req, res) => {
    try {
        const { emailGenerationQueue } = await Promise.resolve().then(() => __importStar(require('@/jobs/queues')));
        const job = await emailGenerationQueue.add(`email-generation-${req.body.prospectId}`, req.body, {
            priority: 5,
            attempts: 3,
        });
        res.json({
            success: true,
            message: 'Email generation job created successfully',
            data: {
                jobId: job.id,
                queueName: job.queueName,
                prospectId: req.body.prospectId,
                campaignId: req.body.campaignId,
            },
        });
    }
    catch (error) {
        console.error('Error creating email generation job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create email generation job',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
// Create batch enrichment job
// POST /api/jobs/batch-enrichment
router.post('/batch-enrichment', jobValidators_1.validateBatchEnrichmentJob, validation_1.handleValidationErrors, async (req, res) => {
    try {
        const { batchEnrichmentQueue } = await Promise.resolve().then(() => __importStar(require('@/jobs/queues')));
        const job = await batchEnrichmentQueue.add(`batch-enrichment-${req.body.batchId}`, req.body, {
            priority: 3,
            attempts: 3,
        });
        res.json({
            success: true,
            message: 'Batch enrichment job created successfully',
            data: {
                jobId: job.id,
                queueName: job.queueName,
                batchId: req.body.batchId,
                prospectCount: req.body.prospectIds.length,
            },
        });
    }
    catch (error) {
        console.error('Error creating batch enrichment job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create batch enrichment job',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
// Create batch email generation job
// POST /api/jobs/batch-email-generation
router.post('/batch-email-generation', jobValidators_1.validateBatchEmailGenerationJob, validation_1.handleValidationErrors, async (req, res) => {
    try {
        const { batchEmailGenerationQueue } = await Promise.resolve().then(() => __importStar(require('@/jobs/queues')));
        const job = await batchEmailGenerationQueue.add(`batch-email-generation-${req.body.batchId}`, req.body, {
            priority: 3,
            attempts: 3,
        });
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
        });
    }
    catch (error) {
        console.error('Error creating batch email generation job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create batch email generation job',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.default = router;
