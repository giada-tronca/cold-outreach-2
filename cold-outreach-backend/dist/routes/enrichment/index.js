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
const apiResponse_1 = require("@/utils/apiResponse");
const errorHandler_1 = require("@/middleware/errorHandler");
const errors_1 = require("@/utils/errors");
const uuid_1 = require("uuid");
const database_1 = require("@/config/database");
const queues_1 = require("@/jobs/queues");
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
router.post('/jobs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { workflowSessionId, configuration, campaignId, prospectIds } = req.body;
    if (!workflowSessionId || !configuration) {
        throw new errors_1.BadRequestError('Missing required fields: workflowSessionId and configuration');
    }
    let dbProspects;
    if (prospectIds && Array.isArray(prospectIds) && prospectIds.length > 0) {
        // Get specific prospects by IDs
        dbProspects = await database_1.prisma.cOProspects.findMany({
            where: {
                id: { in: prospectIds }
            },
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                position: true,
                linkedinUrl: true,
                status: true
            }
        });
        console.log(`🔍 [Enrichment]: Found ${dbProspects.length} prospects to enrich by IDs`);
    }
    else if (campaignId) {
        // Get prospects by campaign ID that don't have a batchId yet (i.e., from CSV upload)
        dbProspects = await database_1.prisma.cOProspects.findMany({
            where: {
                campaignId: parseInt(campaignId),
                batchId: null // Only get prospects that haven't been assigned to a batch yet
            },
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                position: true,
                linkedinUrl: true,
                status: true,
                additionalData: true
            }
        });
        console.log(`🔍 [Enrichment]: Found ${dbProspects.length} prospects to enrich for campaign ${campaignId} (unprocessed prospects only)`);
    }
    else {
        throw new errors_1.BadRequestError('Either campaignId or prospectIds is required');
    }
    if (dbProspects.length === 0) {
        throw new errors_1.BadRequestError('No prospects found to enrich. Please upload a CSV file or ensure prospects exist for the selected campaign.');
    }
    // Create batch for tracking this enrichment session
    let batch = null;
    if (campaignId) {
        console.log('📋 [Enrichment]: Creating batch for enrichment session');
        const batchName = `Enrichment Batch - ${new Date().toISOString()}`;
        batch = await database_1.prisma.cOBatches.create({
            data: {
                campaignId: parseInt(campaignId),
                name: batchName,
                status: 'PROCESSING',
                totalProspects: dbProspects.length
            }
        });
        console.log('✅ [Enrichment]: Created batch', batch.id);
        // Assign the batch ID to all these prospects
        await database_1.prisma.cOProspects.updateMany({
            where: {
                id: { in: dbProspects.map(p => p.id) }
            },
            data: {
                batchId: batch.id
            }
        });
        console.log(`✅ [Enrichment]: Assigned batch ${batch.id} to ${dbProspects.length} prospects`);
    }
    // Validate configuration
    const concurrency = Math.max(1, Math.min(configuration.concurrency || 3, 10)); // Limit to 10 max
    const aiProvider = configuration.aiProvider || 'openrouter';
    const llmModelId = configuration.llmModelId; // Extract specific LLM model ID
    console.log(`🔍 [Enrichment Backend Debug]: Received configuration:`, JSON.stringify(configuration, null, 2));
    console.log(`🔍 [Enrichment Backend Debug]: Extracted aiProvider:`, aiProvider);
    console.log(`🔍 [Enrichment Backend Debug]: Extracted llmModelId:`, llmModelId);
    console.log(`🔍 [Enrichment Backend Debug]: aiProvider type:`, typeof aiProvider);
    console.log(`🚀 [Enrichment]: Creating ${concurrency} parallel enrichment jobs for ${dbProspects.length} prospects`);
    // Create individual enrichment jobs based on concurrency setting
    const jobPromises = [];
    const batchId = `batch-${Date.now()}`;
    // Split prospects into batches based on concurrency
    const prospectsPerJob = Math.ceil(dbProspects.length / concurrency);
    for (let i = 0; i < concurrency; i++) {
        const startIndex = i * prospectsPerJob;
        const endIndex = Math.min(startIndex + prospectsPerJob, dbProspects.length);
        const prospectsForThisJob = dbProspects.slice(startIndex, endIndex);
        if (prospectsForThisJob.length === 0)
            break;
        // Create individual jobs for each prospect in this batch
        for (const prospect of prospectsForThisJob) {
            // Check which services are requested
            const services = configuration.services || [];
            const requestedServices = Array.isArray(services) ? services : Object.keys(services).filter(key => services[key]);
            // Determine what enrichment we can do for this prospect
            const canEnrichLinkedIn = !!(prospect.linkedinUrl &&
                (requestedServices.includes('LinkedIn') || requestedServices.includes('proxycurl')));
            const canEnrichCompany = !!(prospect.company &&
                (requestedServices.includes('Company') || requestedServices.includes('firecrawl')));
            const canEnrichTechStack = !!(prospect.company &&
                (requestedServices.includes('TechStack') || requestedServices.includes('builtwith')));
            // Skip if we can't do any enrichment for this prospect
            if (!canEnrichLinkedIn && !canEnrichCompany && !canEnrichTechStack) {
                console.log(`⚠️ [Enrichment]: Skipping prospect ${prospect.id} - no enrichment possible with available data`);
                console.log(`   - LinkedIn: ${prospect.linkedinUrl ? 'available' : 'missing'} (requested: ${requestedServices.includes('LinkedIn')})`);
                console.log(`   - Company: ${prospect.company ? 'available' : 'missing'} (requested: ${requestedServices.includes('Company')})`);
                console.log(`   - TechStack: ${prospect.company ? 'available' : 'missing'} (requested: ${requestedServices.includes('TechStack')})`);
                continue;
            }
            // For now, if LinkedIn URL is missing but other services are available, create a dummy LinkedIn URL
            // This is a temporary workaround until we refactor the job processor to handle multiple service types
            const linkedinUrl = prospect.linkedinUrl || `https://linkedin.com/in/dummy-${prospect.id}`;
            console.log(`✅ [Enrichment]: Creating job for prospect ${prospect.id} (${prospect.name})`);
            console.log(`   - Services: ${requestedServices.join(', ')}`);
            console.log(`   - LinkedIn URL: ${prospect.linkedinUrl ? 'provided' : 'using dummy'}`);
            const jobData = {
                prospectId: prospect.id.toString(),
                userId: 'system', // TODO: Get from auth context
                linkedinUrl: linkedinUrl,
                aiProvider: aiProvider,
                llmModelId: llmModelId,
                workflowSessionId,
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
                }
            };
            const jobPromise = queues_1.prospectEnrichmentQueue.add(`enrichment-${prospect.id}-${Date.now()}`, jobData, {
                priority: 5,
                attempts: 3,
                delay: i * 2000, // Stagger job starts by 2 seconds per batch
            });
            jobPromises.push(jobPromise);
        }
    }
    // Wait for all jobs to be created
    const createdJobs = await Promise.all(jobPromises);
    console.log(`✅ [Enrichment]: Created ${createdJobs.length} individual enrichment jobs`);
    // Create a batch tracking record with proper prospect data
    const batchJob = {
        id: batchId,
        workflowSessionId,
        status: 'running',
        totalProspects: createdJobs.length,
        processedProspects: 0,
        completedProspects: 0,
        failedProspects: 0,
        currentBatch: 1,
        totalBatches: Math.ceil(createdJobs.length / concurrency),
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
        prospects: dbProspects.map(prospect => ({
            id: prospect.id.toString(),
            name: prospect.name || '',
            email: prospect.email || '',
            company: prospect.company || '',
            title: prospect.position || '',
            status: 'pending',
            progress: 0,
            retryCount: 0
        })),
        errors: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        batchId: batch?.id?.toString() // Include the database batch ID for frontend querying
    };
    // Store the job in our tracking map
    enrichmentJobs.set(batchId, batchJob);
    // Store the workflow-to-job mapping for SSE updates
    workflowToJobMapping.set(workflowSessionId, batchId);
    return apiResponse_1.ApiResponseBuilder.success(res, batchJob, 'Enrichment jobs created and queued successfully', 201);
}));
/**
 * GET /api/enrichment/jobs/:jobId
 * Get enrichment job status (for batch tracking)
 */
router.get('/jobs/:jobId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.get('/jobs/:jobId/progress', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.post('/jobs/:jobId/pause', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.post('/jobs/:jobId/resume', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.post('/jobs/:jobId/cancel', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.post('/jobs/:jobId/retry', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.delete('/jobs/:jobId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.get('/jobs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
exports.default = router;
