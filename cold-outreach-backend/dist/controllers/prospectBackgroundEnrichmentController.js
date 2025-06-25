"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueProspectEnrichment = queueProspectEnrichment;
exports.getEnrichmentJobStatus = getEnrichmentJobStatus;
exports.getUserEnrichmentJobs = getUserEnrichmentJobs;
const database_1 = require("@/config/database");
const backgroundJobService_1 = require("@/services/backgroundJobService");
const errors_1 = require("@/utils/errors");
const apiResponse_1 = require("@/utils/apiResponse");
/**
 * Queue prospect enrichment job (creates prospect immediately, enriches in background)
 */
async function queueProspectEnrichment(req, res) {
    try {
        const { linkedinUrl, aiProvider = 'openrouter', email, name, company, position, phone, userId = '1', // Default user ID
        campaignId = 1, } = req.body;
        if (!linkedinUrl) {
            throw new errors_1.BadRequestError('LinkedIn URL is required');
        }
        // Validate LinkedIn URL format
        if (!linkedinUrl.includes('linkedin.com/in/')) {
            throw new errors_1.BadRequestError('Invalid LinkedIn URL format. Must be a LinkedIn profile URL.');
        }
        // Validate AI provider
        if (aiProvider && !['gemini', 'openrouter'].includes(aiProvider)) {
            throw new errors_1.BadRequestError('Invalid AI provider. Must be either "gemini" or "openrouter".');
        }
        console.log(`📋 [ProspectEnrichment]: Processing enrichment request for ${linkedinUrl}`);
        // Step 1: Create prospect immediately (check for duplicates first)
        const prospectData = { linkedinUrl, campaignId };
        if (email)
            prospectData.email = email;
        if (name)
            prospectData.name = name;
        if (company)
            prospectData.company = company;
        if (position)
            prospectData.position = position;
        if (phone)
            prospectData.phone = phone;
        const prospect = await createProspectImmediately(prospectData);
        console.log(`✅ [ProspectEnrichment]: Created/found prospect ID ${prospect.id}`);
        // Step 2: Queue background enrichment job
        const jobId = await backgroundJobService_1.BackgroundJobService.addProspectEnrichmentJob({
            prospectId: prospect.id.toString(),
            userId: userId.toString(),
            linkedinUrl,
            aiProvider,
            enrichmentOptions: {
                includeCompanyInfo: true,
                includePersonalInfo: true,
                includeContactDetails: true,
                includeSocialProfiles: true,
            },
        });
        console.log(`🚀 [ProspectEnrichment]: Queued background job ${jobId} for prospect ${prospect.id}`);
        // Step 3: Return immediate response with job ID
        apiResponse_1.ApiResponseBuilder.success(res, {
            jobId,
            prospect: {
                id: prospect.id,
                email: prospect.email,
                name: prospect.name,
                company: prospect.company,
                position: prospect.position,
                linkedinUrl: prospect.linkedinUrl,
                status: prospect.status,
            },
            message: 'Prospect created and enrichment job queued',
            enrichmentStatus: 'QUEUED',
        }, 'Prospect enrichment started successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError ||
            error instanceof errors_1.BadRequestError ||
            error instanceof errors_1.DatabaseError) {
            throw error;
        }
        console.error('Error queueing prospect enrichment:', error);
        throw new errors_1.DatabaseError('Failed to queue prospect enrichment');
    }
}
/**
 * Get enrichment job status
 */
async function getEnrichmentJobStatus(req, res) {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            throw new errors_1.BadRequestError('Job ID is required');
        }
        const job = backgroundJobService_1.BackgroundJobService.getJob(jobId);
        if (!job) {
            throw new errors_1.NotFoundError('Enrichment job not found');
        }
        apiResponse_1.ApiResponseBuilder.success(res, {
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            result: job.result,
            error: job.error,
        }, 'Job status retrieved successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError || error instanceof errors_1.BadRequestError) {
            throw error;
        }
        console.error('Error getting job status:', error);
        throw new errors_1.DatabaseError('Failed to get job status');
    }
}
/**
 * Get all enrichment jobs for a user
 */
async function getUserEnrichmentJobs(req, res) {
    try {
        const { userId } = req.params;
        if (!userId) {
            throw new errors_1.BadRequestError('User ID is required');
        }
        const jobs = backgroundJobService_1.BackgroundJobService.getJobsByUser(userId);
        apiResponse_1.ApiResponseBuilder.success(res, {
            jobs: jobs.map(job => ({
                jobId: job.id,
                prospectId: job.data.prospectId,
                status: job.status,
                progress: job.progress,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                error: job.error,
            })),
            total: jobs.length,
        }, 'User jobs retrieved successfully');
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError) {
            throw error;
        }
        console.error('Error getting user jobs:', error);
        throw new errors_1.DatabaseError('Failed to get user jobs');
    }
}
/**
 * Create prospect immediately in database (check for duplicates)
 */
async function createProspectImmediately(data) {
    // Using imported prisma client
    // Step 1: Check for existing prospect by email or phone
    let existingProspect = null;
    if (data.email) {
        existingProspect = await database_1.prisma.cOProspects.findFirst({
            where: {
                email: data.email,
                campaignId: data.campaignId
            },
        });
    }
    if (!existingProspect && data.phone) {
        existingProspect = await database_1.prisma.cOProspects.findFirst({
            where: {
                additionalData: {
                    path: ['phone'],
                    equals: data.phone,
                },
                campaignId: data.campaignId
            },
        });
    }
    // Step 2: If prospect exists, return it
    if (existingProspect) {
        console.log(`📋 [ProspectEnrichment]: Found existing prospect ID ${existingProspect.id} for ${data.email || data.phone || data.linkedinUrl}`);
        return existingProspect;
    }
    // Step 3: Create new prospect
    console.log(`📝 [ProspectEnrichment]: Creating new prospect for ${data.email || data.linkedinUrl}`);
    // Generate email if not provided (from LinkedIn URL)
    let email = data.email;
    if (!email) {
        const urlMatch = data.linkedinUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
        if (urlMatch) {
            email = `${urlMatch[1]}@linkedin-prospect.com`;
        }
        else {
            throw new errors_1.BadRequestError('Email is required when LinkedIn URL format is invalid');
        }
    }
    const newProspect = await database_1.prisma.cOProspects.create({
        data: {
            name: data.name || '',
            email: email,
            company: data.company || '',
            position: data.position || '',
            linkedinUrl: data.linkedinUrl,
            status: 'PENDING',
            campaign: {
                connect: { id: data.campaignId }
            },
            additionalData: data.phone ? { phone: data.phone } : {}
        },
        include: {
            campaign: true
        }
    });
    console.log(`✅ [ProspectEnrichment]: Created new prospect ID ${newProspect.id}`);
    return newProspect;
}
