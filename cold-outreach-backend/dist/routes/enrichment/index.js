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
exports.updateEnrichmentJobProgress = updateEnrichmentJobProgress;
const express_1 = require("express");
const database_1 = require("@/config/database");
const apiResponse_1 = require("@/utils/apiResponse");
const middleware_1 = require("@/middleware");
const errors_1 = require("@/utils/errors");
const queues_1 = require("@/jobs/queues");
const csvHelpers_1 = require("../../utils/csvHelpers");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const enrichmentJobs = new Map();
const sseClients = new Map(); // jobId -> Set of SSE connections
// Map to track which workflowSessionId corresponds to which jobId for SSE updates
const workflowToJobMapping = new Map();
// SSE Helper function
const sendSSEEvent = (jobId, type, payload) => {
    const clients = sseClients.get(jobId);
    if (clients) {
        const data = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
        clients.forEach(client => {
            try {
                client.write(`data: ${data}\n\n`);
            }
            catch (error) {
                console.error('Failed to send SSE event:', error);
                clients.delete(client);
            }
        });
    }
};
// MOCK DATA REMOVED - no more fake prospect generation
// MOCK PROCESSING FUNCTIONS REMOVED - now uses only real enrichment processing
// Real enrichment job processor using API services
const processRealEnrichmentJob = async (job) => {
    try {
        job.status = 'running';
        job.startedAt = new Date().toISOString();
        const { EnrichmentService } = await Promise.resolve().then(() => __importStar(require('@/services/enrichment')));
        sendSSEEvent(job.id, 'job_status', job);
        // Extract prospect IDs and use real enrichment service
        const prospectIds = job.prospects.map(p => parseInt(p.id));
        // Configure enrichment
        const enrichmentConfig = {
            services: {
                proxycurl: true,
                firecrawl: true,
                builtwith: true
            },
            options: {
                skipErrors: true,
                saveRawData: false
            }
        };
        console.log(`🔍 [Real Enrichment]: Starting enrichment for ${prospectIds.length} prospects`);
        // Process prospects with real API calls
        const enrichmentResults = await EnrichmentService.enrichProspects(prospectIds, enrichmentConfig);
        // Update job with results
        for (let i = 0; i < enrichmentResults.length; i++) {
            const result = enrichmentResults[i];
            const prospect = job.prospects.find(p => parseInt(p.id) === result.prospectId);
            if (prospect) {
                prospect.status = result.success ? 'completed' : 'failed';
                prospect.progress = 100;
                prospect.processingTime = result.processingTime || 0;
                prospect.completedAt = new Date().toISOString();
                if (result.success) {
                    prospect.enrichedData = {
                        linkedin: result.data?.personData?.profileUrl,
                        phone: result.data?.personData?.currentPosition?.company,
                        jobTitle: result.data?.personData?.headline,
                        companySize: result.data?.companyData?.size,
                        industry: result.data?.companyData?.industry,
                        website: result.data?.websiteData?.url,
                        techStack: result.data?.techStack?.technologies
                    };
                    job.completedProspects++;
                }
                else {
                    prospect.errors = result.errors || ['Enrichment failed'];
                    job.failedProspects++;
                    // Add error to job
                    job.errors.push({
                        id: (0, uuid_1.v4)(),
                        message: `Failed to enrich prospect: ${prospect.name}`,
                        severity: 'error',
                        timestamp: new Date().toISOString(),
                        prospectId: prospect.id
                    });
                }
                job.processedProspects++;
                job.progress = Math.round((job.processedProspects / job.totalProspects) * 100);
                sendSSEEvent(job.id, 'prospect_update', prospect);
                sendSSEEvent(job.id, 'job_status', job);
            }
        }
        if (job.status === 'running') {
            // Determine final status based on results
            const successRate = job.totalProspects > 0 ? (job.completedProspects / job.totalProspects) : 0;
            if (job.completedProspects === 0) {
                // All prospects failed
                job.status = 'failed';
                sendSSEEvent(job.id, 'job_failed', {
                    ...job,
                    message: 'All prospects failed enrichment',
                    successRate: 0
                });
            }
            else if (successRate >= 0.8) {
                // 80% or more success rate - consider successful
                job.status = 'completed';
                job.progress = 100;
                sendSSEEvent(job.id, 'job_complete', {
                    ...job,
                    message: 'Enrichment completed successfully',
                    successRate: Math.round(successRate * 100)
                });
            }
            else {
                // Partial success - completed with warnings
                job.status = 'completed_with_errors';
                job.progress = 100;
                sendSSEEvent(job.id, 'job_complete_with_errors', {
                    ...job,
                    message: `Enrichment completed with ${job.failedProspects} failures (${Math.round(successRate * 100)}% success rate)`,
                    successRate: Math.round(successRate * 100)
                });
            }
        }
        console.log(`✅ [Real Enrichment]: Completed enrichment job ${job.id}`);
    }
    catch (error) {
        job.status = 'failed';
        job.errors.push({
            id: (0, uuid_1.v4)(),
            message: `Real enrichment job processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            timestamp: new Date().toISOString()
        });
        sendSSEEvent(job.id, 'error', { message: error instanceof Error ? error.message : 'Job processing failed' });
        console.error(`❌ [Real Enrichment]: Job ${job.id} failed:`, error);
    }
    finally {
        job.updatedAt = new Date().toISOString();
        enrichmentJobs.set(job.id, job);
    }
};
/**
 * Update enrichment job progress when individual BullMQ jobs complete
 */
async function updateEnrichmentJobProgress(workflowSessionId, prospectId, success, enrichmentData, errorMessage) {
    try {
        // Find the job ID associated with this workflow session
        const jobId = workflowToJobMapping.get(workflowSessionId);
        if (!jobId) {
            console.log(`⚠️ [Batch Progress]: No job ID found for workflow session ${workflowSessionId}`);
            return;
        }
        // Get the job from our tracking map
        const job = enrichmentJobs.get(jobId);
        if (!job) {
            console.log(`⚠️ [Batch Progress]: No job found for ID ${jobId}`);
            return;
        }
        // Find the prospect in the job
        const prospect = job.prospects.find(p => p.id === prospectId);
        if (!prospect) {
            console.log(`⚠️ [Batch Progress]: Prospect ${prospectId} not found in job ${jobId}`);
            return;
        }
        // Update prospect status
        prospect.status = success ? 'completed' : 'failed';
        prospect.progress = 100;
        prospect.completedAt = new Date().toISOString();
        if (success) {
            prospect.enrichedData = enrichmentData;
            job.completedProspects++;
        }
        else {
            prospect.errors = [errorMessage || 'Enrichment failed'];
            job.failedProspects++;
            job.errors.push({
                id: (0, uuid_1.v4)(),
                message: `Failed to enrich prospect: ${prospect.name}`,
                severity: 'error',
                timestamp: new Date().toISOString(),
                prospectId: prospect.id
            });
        }
        // Update job counters
        job.processedProspects++;
        job.progress = Math.round((job.processedProspects / job.totalProspects) * 100);
        job.updatedAt = new Date().toISOString();
        // Send SSE updates
        sendSSEEvent(jobId, 'prospect_update', prospect);
        sendSSEEvent(jobId, 'job_status', job);
        // Check if job is complete
        if (job.processedProspects >= job.totalProspects) {
            const successRate = job.totalProspects > 0 ? (job.completedProspects / job.totalProspects) : 0;
            if (job.completedProspects === 0) {
                job.status = 'failed';
                sendSSEEvent(jobId, 'job_failed', {
                    ...job,
                    message: 'All prospects failed enrichment',
                    successRate: 0
                });
            }
            else if (successRate >= 0.8) {
                job.status = 'completed';
                job.progress = 100;
                sendSSEEvent(jobId, 'job_complete', {
                    ...job,
                    message: 'Enrichment completed successfully',
                    successRate: Math.round(successRate * 100)
                });
            }
            else {
                job.status = 'completed_with_errors';
                job.progress = 100;
                sendSSEEvent(jobId, 'job_complete_with_errors', {
                    ...job,
                    message: `Enrichment completed with ${job.failedProspects} failures (${Math.round(successRate * 100)}% success rate)`,
                    successRate: Math.round(successRate * 100)
                });
            }
            console.log(`✅ [Batch Progress]: Job ${jobId} completed with ${job.completedProspects}/${job.totalProspects} successful enrichments`);
        }
        // Update the job in our map
        enrichmentJobs.set(jobId, job);
        console.log(`📊 [Batch Progress]: Updated job ${jobId} - ${job.processedProspects}/${job.totalProspects} processed (${job.progress}%)`);
    }
    catch (error) {
        console.error('Failed to update enrichment job progress:', error);
    }
}
/**
 * POST /api/enrichment/jobs
 * Create enrichment jobs using proper BullMQ background job system
 */
router.post('/jobs', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { configuration, campaignId, csvData } = req.body;
    if (!configuration) {
        throw new errors_1.BadRequestError('Missing required field: configuration');
    }
    if (!campaignId) {
        throw new errors_1.BadRequestError('Campaign ID is required');
    }
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
        throw new errors_1.BadRequestError('CSV data is required for enrichment');
    }
    // STEP 1: Create batch FIRST (no prospect creation at this stage)
    console.log('📋 [Enrichment]: Creating batch for enrichment session');
    const batchName = `Enrichment Batch - ${new Date().toISOString()}`;
    const batch = await database_1.prisma.cOBatches.create({
        data: {
            name: batchName,
            campaign: {
                connect: { id: parseInt(campaignId) }
            },
            status: 'PROCESSING',
            totalProspects: csvData.length // Set total from CSV data
        }
    });
    console.log('✅ [Enrichment]: Created batch', batch.id);
    // STEP 2: Individual Job Creation - Create parallel jobs based on concurrency setting
    console.log(`📊 [Enrichment]: Processing ${csvData.length} prospects from CSV data`);
    // Validate and prepare enrichment configuration
    const concurrency = Math.max(1, Math.min(configuration.concurrency || 2, 10)); // Limit to 10 max
    const aiProvider = configuration.aiProvider || 'openrouter';
    const llmModelId = configuration.llmModelId;
    const services = configuration.services || [];
    console.log(`🚀 [Enrichment]: Creating ${concurrency} parallel enrichment jobs for ${csvData.length} prospects`);
    console.log(`🤖 [Enrichment]: Using AI provider: ${aiProvider}${llmModelId ? ` (${llmModelId})` : ''}`);
    console.log(`🔧 [Enrichment]: Services enabled: ${services.join(', ')}`);
    // Create individual enrichment jobs based on concurrency setting
    const batchId = `batch-${Date.now()}`;
    const jobPromises = [];
    // Create jobs for each prospect from CSV data (no database creation yet)
    for (let i = 0; i < csvData.length; i++) {
        const prospectData = csvData[i];
        // Extract prospect information from CSV row
        const extractedProspect = (0, csvHelpers_1.extractProspectFromRow)(prospectData);
        // Determine what enrichment we can do for this prospect
        const canEnrichLinkedIn = !!(extractedProspect.linkedinUrl && services.includes('LinkedIn'));
        const canEnrichCompany = !!(extractedProspect.company && services.includes('Company'));
        const canEnrichTechStack = !!(extractedProspect.company && services.includes('TechStack'));
        // Create job data for this prospect
        const jobData = {
            prospectId: `csv-${i}`, // Temporary ID for CSV prospects
            userId: 'default-user', // Use consistent userId for now - TODO: Get from auth context
            linkedinUrl: extractedProspect.linkedinUrl || '',
            aiProvider: aiProvider,
            llmModelId,
            enrichmentOptions: {
                includeCompanyInfo: canEnrichCompany,
                includePersonalInfo: canEnrichLinkedIn,
                includeContactDetails: canEnrichLinkedIn,
                includeSocialProfiles: canEnrichLinkedIn
            },
            services: {
                proxycurl: canEnrichLinkedIn,
                firecrawl: canEnrichCompany,
                builtwith: canEnrichTechStack
            },
            configuration: {
                websitePages: configuration.websitePages || 3,
                retryAttempts: configuration.retryAttempts || 2,
                concurrency: concurrency
            },
            // Include CSV data for prospect creation during processing
            csvData: {
                ...extractedProspect,
                campaignId: parseInt(campaignId),
                batchId: batch.id,
                csvRowIndex: i
            }
        };
        // Add job to queue
        jobPromises.push(queues_1.prospectEnrichmentQueue.add(`enrichment-${batchId}-csv-${i}`, jobData, {
            attempts: configuration.retryAttempts || 2,
            backoff: {
                type: 'exponential',
                delay: 5000
            }
        }));
        // If we've created 'concurrency' number of jobs, wait a bit before creating more
        // This ensures parallel processing according to user's setting
        if ((i + 1) % concurrency === 0) {
            console.log(`⚡ [Enrichment]: Created batch of ${concurrency} jobs (${i + 1}/${csvData.length})`);
        }
    }
    const createdJobs = await Promise.all(jobPromises);
    console.log(`✅ [Enrichment]: Created ${createdJobs.length} individual enrichment jobs with ${concurrency} parallel processing`);
    // Create a batch tracking record
    const batchJob = {
        id: batchId,
        status: 'running',
        totalProspects: csvData.length,
        processedProspects: 0,
        completedProspects: 0,
        failedProspects: 0,
        currentBatch: 1,
        totalBatches: Math.ceil(csvData.length / concurrency),
        progress: 0,
        startedAt: new Date().toISOString(),
        processingRate: 0,
        configuration: {
            ...configuration,
            campaignId: parseInt(campaignId),
            concurrency,
            aiProvider,
            llmModelId
        },
        prospects: csvData.map((row, index) => {
            const extracted = (0, csvHelpers_1.extractProspectFromRow)(row);
            return {
                id: `csv-${index}`,
                name: extracted.name || `Prospect-${index}`,
                email: extracted.email || '',
                company: extracted.company || '',
                title: extracted.position || '',
                status: 'pending',
                progress: 0,
                retryCount: 0
            };
        }),
        errors: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        batchId: batch.id.toString()
    };
    // Store the job tracking information
    enrichmentJobs.set(batchId, batchJob);
    return apiResponse_1.ApiResponseBuilder.success(res, batchJob, 'Enrichment jobs created and queued successfully', 201);
}));
/**
 * GET /api/enrichment/jobs/:jobId
 * Get enrichment job status (for batch tracking)
 */
router.get('/jobs/:jobId', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new errors_1.BadRequestError('Job ID is required');
    }
    // For now, return a mock status since we're using individual jobs
    // In a real implementation, you'd track batch progress
    const mockJob = {
        id: jobId,
        status: 'running',
        totalProspects: 0,
        processedProspects: 0,
        completedProspects: 0,
        failedProspects: 0,
        progress: 0,
        message: 'Job status tracking not fully implemented for individual jobs'
    };
    return apiResponse_1.ApiResponseBuilder.success(res, mockJob, 'Job status retrieved');
}));
/**
 * GET /api/enrichment/jobs/:jobId/progress
 * SSE endpoint for real-time progress updates
 */
router.get('/jobs/:jobId/progress', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new errors_1.BadRequestError('Job ID is required');
    }
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    // Add client to SSE clients
    if (!sseClients.has(jobId)) {
        sseClients.set(jobId, new Set());
    }
    sseClients.get(jobId).add(res);
    // Send initial connection confirmation
    const initialData = JSON.stringify({
        type: 'connected',
        payload: {
            message: 'SSE connection established for job progress',
            jobId,
            timestamp: new Date().toISOString()
        }
    });
    res.write(`data: ${initialData}\n\n`);
    // Handle client disconnect
    req.on('close', () => {
        const clients = sseClients.get(jobId);
        if (clients) {
            clients.delete(res);
            if (clients.size === 0) {
                sseClients.delete(jobId);
            }
        }
    });
    req.on('error', () => {
        const clients = sseClients.get(jobId);
        if (clients) {
            clients.delete(res);
            if (clients.size === 0) {
                sseClients.delete(jobId);
            }
        }
    });
}));
/**
 * POST /api/enrichment/jobs/:jobId/pause
 * Pause enrichment job
 */
router.post('/jobs/:jobId/pause', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new errors_1.BadRequestError('Job ID is required');
    }
    const job = enrichmentJobs.get(jobId);
    if (!job) {
        throw new errors_1.NotFoundError('Enrichment job not found');
    }
    if (job.status !== 'running') {
        throw new errors_1.BadRequestError('Job is not currently running');
    }
    job.status = 'paused';
    job.updatedAt = new Date().toISOString();
    enrichmentJobs.set(jobId, job);
    sendSSEEvent(jobId, 'job_status', job);
    return apiResponse_1.ApiResponseBuilder.success(res, job, 'Job paused successfully');
}));
/**
 * POST /api/enrichment/jobs/:jobId/resume
 * Resume enrichment job
 */
router.post('/jobs/:jobId/resume', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new errors_1.BadRequestError('Job ID is required');
    }
    const job = enrichmentJobs.get(jobId);
    if (!job) {
        throw new errors_1.NotFoundError('Enrichment job not found');
    }
    if (job.status !== 'paused') {
        throw new errors_1.BadRequestError('Job is not currently paused');
    }
    job.status = 'running';
    job.updatedAt = new Date().toISOString();
    enrichmentJobs.set(jobId, job);
    // Resume real enrichment processing
    processRealEnrichmentJob(job);
    sendSSEEvent(jobId, 'job_status', job);
    return apiResponse_1.ApiResponseBuilder.success(res, job, 'Job resumed successfully');
}));
/**
 * POST /api/enrichment/jobs/:jobId/cancel
 * Cancel enrichment job
 */
router.post('/jobs/:jobId/cancel', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new errors_1.BadRequestError('Job ID is required');
    }
    const job = enrichmentJobs.get(jobId);
    if (!job) {
        throw new errors_1.NotFoundError('Enrichment job not found');
    }
    if (!['running', 'paused', 'pending'].includes(job.status)) {
        throw new errors_1.BadRequestError('Job cannot be cancelled in current status');
    }
    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    enrichmentJobs.set(jobId, job);
    sendSSEEvent(jobId, 'job_status', job);
    // Clean up SSE connections
    const clients = sseClients.get(jobId);
    if (clients) {
        clients.forEach(client => {
            try {
                client.end();
            }
            catch (error) {
                console.error('Error closing SSE connection:', error);
            }
        });
        sseClients.delete(jobId);
    }
    return apiResponse_1.ApiResponseBuilder.success(res, job, 'Job cancelled successfully');
}));
/**
 * POST /api/enrichment/jobs/:jobId/retry
 * Retry failed prospects in enrichment job
 */
router.post('/jobs/:jobId/retry', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new errors_1.BadRequestError('Job ID is required');
    }
    const job = enrichmentJobs.get(jobId);
    if (!job) {
        throw new errors_1.NotFoundError('Enrichment job not found');
    }
    // Reset failed prospects
    const failedProspects = job.prospects.filter(p => p.status === 'failed');
    if (failedProspects.length === 0) {
        throw new errors_1.BadRequestError('No failed prospects to retry');
    }
    failedProspects.forEach(prospect => {
        prospect.status = 'pending';
        prospect.progress = 0;
        prospect.retryCount = (prospect.retryCount || 0) + 1;
        prospect.errors = [];
    });
    // Adjust counters
    job.failedProspects = 0;
    job.processedProspects -= failedProspects.length;
    job.progress = Math.round((job.processedProspects / job.totalProspects) * 100);
    job.updatedAt = new Date().toISOString();
    enrichmentJobs.set(jobId, job);
    // If job was completed but had failures, restart it with real enrichment
    if (job.status === 'completed') {
        job.status = 'running';
        processRealEnrichmentJob(job);
    }
    sendSSEEvent(jobId, 'job_status', job);
    return apiResponse_1.ApiResponseBuilder.success(res, {
        retriedCount: failedProspects.length,
        job
    }, `Retrying ${failedProspects.length} failed prospects`);
}));
/**
 * DELETE /api/enrichment/jobs/:jobId
 * Delete enrichment job
 */
router.delete('/jobs/:jobId', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        throw new errors_1.BadRequestError('Job ID is required');
    }
    const job = enrichmentJobs.get(jobId);
    if (!job) {
        throw new errors_1.NotFoundError('Enrichment job not found');
    }
    // Clean up SSE connections
    const clients = sseClients.get(jobId);
    if (clients) {
        clients.forEach(client => {
            try {
                client.end();
            }
            catch (error) {
                console.error('Error closing SSE connection:', error);
            }
        });
        sseClients.delete(jobId);
    }
    enrichmentJobs.delete(jobId);
    return apiResponse_1.ApiResponseBuilder.success(res, { jobId }, 'Job deleted successfully');
}));
/**
 * GET /api/enrichment/jobs
 * Get all enrichment jobs (with pagination)
 */
router.get('/jobs', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20, status, workflowSessionId } = req.query;
    let jobs = Array.from(enrichmentJobs.values());
    // Filter by status
    if (status) {
        jobs = jobs.filter(job => job.status === status);
    }
    // Filter by workflow session
    if (workflowSessionId) {
        jobs = jobs.filter(job => job.workflowSessionId === workflowSessionId);
    }
    // Sort by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedJobs = jobs.slice(startIndex, endIndex);
    return apiResponse_1.ApiResponseBuilder.success(res, {
        jobs: paginatedJobs,
        pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(jobs.length / limitNum),
            totalItems: jobs.length,
            hasNextPage: endIndex < jobs.length,
            hasPrevPage: pageNum > 1
        }
    }, 'Jobs retrieved successfully');
}));
// Clean up completed jobs periodically (every hour)
setInterval(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    for (const [jobId, job] of enrichmentJobs.entries()) {
        const jobTime = new Date(job.updatedAt).getTime();
        // Clean up completed/cancelled jobs older than 1 hour
        if (['completed', 'completed_with_errors', 'cancelled', 'failed'].includes(job.status) && jobTime < oneHourAgo) {
            enrichmentJobs.delete(jobId);
            // Clean up SSE connections
            const clients = sseClients.get(jobId);
            if (clients) {
                clients.forEach(client => {
                    try {
                        client.end();
                    }
                    catch (error) {
                        console.error('Error closing SSE connection:', error);
                    }
                });
                sseClients.delete(jobId);
            }
        }
    }
}, 60 * 60 * 1000); // Run every hour
// Create enrichment batch
router.post('/batches', (0, middleware_1.asyncHandler)(async (req, res) => {
    const { configuration, campaignId } = req.body;
    if (!configuration) {
        throw new errors_1.BadRequestError('Missing required field: configuration');
    }
    if (!campaignId) {
        throw new errors_1.BadRequestError('Campaign ID is required');
    }
    const batch = await database_1.prisma.cOBatches.create({
        data: {
            name: `Enrichment Batch - ${new Date().toISOString()}`,
            status: 'PENDING',
            campaignId: parseInt(campaignId),
            totalProspects: 0,
            enrichedProspects: 0,
            generatedEmails: 0,
            failedProspects: 0
        }
    });
    return apiResponse_1.ApiResponseBuilder.success(res, batch);
}));
exports.default = router;
