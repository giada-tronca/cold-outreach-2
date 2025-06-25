"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJobStatus = updateJobStatus;
const express_1 = require("express");
const errorHandler_1 = require("@/middleware/errorHandler");
const apiResponse_1 = require("@/utils/apiResponse");
const database_1 = require("@/config/database");
const queues_1 = require("@/jobs/queues");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const router = (0, express_1.Router)();
// Store job tracking similar to enrichment jobs
const emailGenerationJobs = new Map();
const workflowToJobMapping = new Map();
const sseClients = new Map(); // jobId -> Set of SSE connections
// SSE event sending function (matching enrichment pattern)
const sendSSEEvent = (jobId, type, payload) => {
    const clients = sseClients.get(jobId);
    if (!clients || clients.size === 0) {
        console.log(`📡 [Email Generation SSE]: No clients connected for job ${jobId}`);
        return;
    }
    const eventData = JSON.stringify({
        type,
        payload,
        timestamp: new Date().toISOString()
    });
    console.log(`📡 [Email Generation SSE]: Sending ${type} event to ${clients.size} clients for job ${jobId}`);
    clients.forEach(client => {
        try {
            client.write(`data: ${eventData}\n\n`);
        }
        catch (error) {
            console.error(`📡 [Email Generation SSE]: Error sending to client:`, error);
            clients.delete(client);
        }
    });
};
// Function to update job status when individual jobs complete
async function updateJobStatus(batchId, completedProspectId, success, emailData) {
    const job = emailGenerationJobs.get(batchId);
    if (!job)
        return;
    // Update the specific prospect
    const prospectIndex = job.prospects.findIndex((p) => p.id === completedProspectId.toString());
    if (prospectIndex !== -1) {
        job.prospects[prospectIndex].status = success ? 'completed' : 'failed';
        job.prospects[prospectIndex].progress = 100;
        if (success && emailData) {
            job.prospects[prospectIndex].generatedEmail = {
                subject: emailData.subject,
                body: emailData.body,
                preview: emailData.preview || emailData.body.substring(0, 100) + '...'
            };
        }
        else if (!success) {
            job.prospects[prospectIndex].errors = job.prospects[prospectIndex].errors || [];
            job.prospects[prospectIndex].errors.push('Email generation failed');
        }
    }
    // Update overall job status
    if (success) {
        job.completedProspects++;
    }
    else {
        job.failedProspects++;
    }
    job.processedProspects++;
    job.progress = Math.round((job.processedProspects / job.totalProspects) * 100);
    job.updatedAt = new Date().toISOString();
    // Check if job is complete
    if (job.processedProspects >= job.totalProspects) {
        job.status = 'completed';
        // Generate CSV when job completes
        try {
            const csvUrl = await generateEmailCSV(job.configuration.campaignId, batchId);
            job.csvDownloadUrl = csvUrl;
            console.log(`✅ [EmailGeneration]: CSV generated for job ${batchId}: ${csvUrl}`);
        }
        catch (error) {
            console.error(`❌ [EmailGeneration]: Failed to generate CSV for job ${batchId}:`, error);
        }
    }
    emailGenerationJobs.set(batchId, job);
    // Send SSE updates (matching enrichment pattern)
    sendSSEEvent(batchId, 'job_status', job);
    // Check if job is complete (matching enrichment completion logic)
    if (job.processedProspects >= job.totalProspects) {
        const successRate = job.totalProspects > 0 ? (job.completedProspects / job.totalProspects) : 0;
        if (job.completedProspects === 0) {
            job.status = 'failed';
            sendSSEEvent(batchId, 'job_failed', {
                ...job,
                message: 'All email generations failed',
                successRate: 0
            });
        }
        else if (successRate >= 0.8) {
            job.status = 'completed';
            job.progress = 100;
            sendSSEEvent(batchId, 'job_complete', {
                ...job,
                message: 'Email generation completed successfully',
                successRate: Math.round(successRate * 100)
            });
        }
        else {
            job.status = 'completed_with_errors';
            job.progress = 100;
            sendSSEEvent(batchId, 'job_complete_with_errors', {
                ...job,
                message: `Email generation completed with ${job.failedProspects} failures (${Math.round(successRate * 100)}% success rate)`,
                successRate: Math.round(successRate * 100)
            });
        }
        console.log(`✅ [Email Generation Batch Progress]: Job ${batchId} completed with ${job.completedProspects}/${job.totalProspects} successful generations`);
    }
}
// Function to generate CSV with prospect data + email subject + email body
async function generateEmailCSV(campaignId, jobId) {
    try {
        // Get all prospects with their generated emails
        const prospects = await database_1.prisma.cOProspects.findMany({
            where: {
                campaignId: campaignId,
                status: 'ENRICHED'
            },
            include: {
                generatedEmail: true,
                enrichment: true
            }
        });
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
            'Email Body'
        ];
        const csvRows = prospects.map(prospect => {
            const generatedEmail = prospect.generatedEmail;
            // Safely access phone and location from additionalData or direct properties
            const phone = prospect.phone || prospect.additionalData?.phone || '';
            const location = prospect.location || prospect.additionalData?.location || '';
            return [
                prospect.name || '',
                prospect.email || '',
                prospect.company || '',
                prospect.position || '',
                prospect.linkedinUrl || '',
                phone,
                location,
                prospect.enrichment?.industry || '',
                prospect.enrichment?.companySize || '',
                prospect.enrichment?.techStack?.join(', ') || '',
                generatedEmail?.subject || '',
                generatedEmail?.body || ''
            ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`);
        });
        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        // Save CSV file
        const filename = `email-campaign-${campaignId}-${jobId}-${Date.now()}.csv`;
        const filepath = path_1.default.join(process.cwd(), 'uploads', filename);
        await promises_1.default.writeFile(filepath, csvContent, 'utf-8');
        return `/api/email-generation/download/${filename}`;
    }
    catch (error) {
        console.error('Error generating CSV:', error);
        throw error;
    }
}
// Create email generation jobs
// POST /api/email-generation/jobs
router.post('/jobs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    console.log('📧 [EmailGeneration]: Received email generation job request:', req.body);
    const { campaignId, workflowSessionId, configuration } = req.body;
    const { parallelism = 2, aiProvider = 'openrouter', llmModelId } = configuration || {};
    const validAiProvider = aiProvider === 'gemini' ? 'gemini' : 'openrouter';
    console.log(`📧 [EmailGeneration]: Creating email generation jobs for campaign ${campaignId} using ${validAiProvider}${llmModelId ? ` (${llmModelId})` : ''}`);
    if (!campaignId) {
        return apiResponse_1.ApiResponseBuilder.error(res, 'Campaign ID is required', 400);
    }
    // Generate batch ID for this job
    const batchId = `email-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📧 [EmailGeneration]: Creating email generation jobs for campaign ${campaignId}`);
    try {
        // Get all prospects from the campaign that have been enriched
        const prospects = await database_1.prisma.cOProspects.findMany({
            where: {
                campaignId: parseInt(campaignId),
                status: 'ENRICHED' // Only generate emails for enriched prospects
            }
        });
        console.log(`📧 [EmailGeneration]: Found ${prospects.length} enriched prospects for email generation`);
        if (prospects.length === 0) {
            return apiResponse_1.ApiResponseBuilder.error(res, 'No enriched prospects found for email generation', 400);
        }
        // Create individual email generation jobs with parallelism control
        const jobPromises = [];
        const finalWorkflowSessionId = workflowSessionId || `email-gen-session-${Date.now()}`;
        // Process prospects in batches based on parallelism setting
        for (let i = 0; i < parallelism; i++) {
            const prospectsForThisJob = prospects.filter((_, index) => index % parallelism === i);
            if (prospectsForThisJob.length === 0)
                continue;
            // Create individual jobs for each prospect in this batch
            for (const prospect of prospectsForThisJob) {
                const jobData = {
                    prospectId: prospect.id,
                    campaignId: parseInt(campaignId),
                    userId: 'user123', // Fixed: Use correct user ID for SSE
                    aiProvider: validAiProvider,
                    llmModelId: llmModelId, // Add specific LLM model ID
                    workflowSessionId: finalWorkflowSessionId,
                    batchId: batchId // Add batch ID for tracking
                };
                const jobPromise = queues_1.emailGenerationQueue.add(`email-generation-${prospect.id}-${Date.now()}`, jobData, {
                    priority: 5,
                    attempts: 3,
                    delay: i * 1000, // Stagger job starts by 1 second per batch
                });
                jobPromises.push(jobPromise);
            }
        }
        // Wait for all jobs to be created
        const createdJobs = await Promise.all(jobPromises);
        console.log(`✅ [EmailGeneration]: Created ${createdJobs.length} individual email generation jobs`);
        // Create a batch tracking record
        const batchJob = {
            id: batchId,
            workflowSessionId: finalWorkflowSessionId,
            status: 'running',
            totalProspects: createdJobs.length,
            processedProspects: 0,
            completedProspects: 0,
            failedProspects: 0,
            progress: 0,
            configuration: {
                campaignId: parseInt(campaignId),
                parallelism,
                aiProvider: validAiProvider
            },
            prospects: prospects.map(prospect => ({
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
            updatedAt: new Date().toISOString()
        };
        // Store the job in our tracking map
        emailGenerationJobs.set(batchId, batchJob);
        // Store the workflow-to-job mapping for SSE updates
        workflowToJobMapping.set(finalWorkflowSessionId, batchId);
        return apiResponse_1.ApiResponseBuilder.success(res, batchJob, 'Email generation jobs created and queued successfully', 201);
    }
    catch (error) {
        console.error('❌ [EmailGeneration]: Error creating email generation jobs:', error);
        return apiResponse_1.ApiResponseBuilder.error(res, 'Failed to create email generation jobs', 500);
    }
}));
// Get email generation job status
// GET /api/email-generation/jobs/:jobId
router.get('/jobs/:jobId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        return apiResponse_1.ApiResponseBuilder.error(res, 'Job ID is required', 400);
    }
    const job = emailGenerationJobs.get(jobId);
    if (!job) {
        return apiResponse_1.ApiResponseBuilder.error(res, 'Email generation job not found', 404);
    }
    return apiResponse_1.ApiResponseBuilder.success(res, job, 'Email generation job status retrieved successfully');
}));
// CSV Download endpoint
// GET /api/email-generation/download/:filename
router.get('/download/:filename', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { filename } = req.params;
    if (!filename || !filename.endsWith('.csv')) {
        return apiResponse_1.ApiResponseBuilder.error(res, 'Invalid filename', 400);
    }
    const filepath = path_1.default.join(process.cwd(), 'uploads', filename);
    try {
        await promises_1.default.access(filepath);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.sendFile(filepath);
    }
    catch (error) {
        return apiResponse_1.ApiResponseBuilder.error(res, 'File not found', 404);
    }
}));
// SSE endpoint for real-time progress updates (matching enrichment pattern)
// GET /api/email-generation/jobs/:jobId/progress
router.get('/jobs/:jobId/progress', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
        apiResponse_1.ApiResponseBuilder.error(res, 'Job ID is required', 400);
        return;
    }
    // Check if job exists
    const job = emailGenerationJobs.get(jobId);
    if (!job) {
        apiResponse_1.ApiResponseBuilder.error(res, 'Email generation job not found', 404);
        return;
    }
    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({
        type: 'connection',
        message: 'SSE connection established for email generation job progress',
        jobId: jobId,
        timestamp: new Date().toISOString()
    })}\n\n`);
    // Add client to SSE clients (matching enrichment pattern)
    if (!sseClients.has(jobId)) {
        sseClients.set(jobId, new Set());
    }
    sseClients.get(jobId).add(res);
    // Send initial connection confirmation
    const initialData = JSON.stringify({
        type: 'connected',
        payload: {
            message: 'SSE connection established for email generation job progress',
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
    console.log(`📡 [Email Generation SSE]: Client connected to job ${jobId} progress stream`);
    // Note: For SSE endpoints, we don't return immediately as the connection stays open
}));
exports.default = router;
