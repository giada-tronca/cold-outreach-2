"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEnrichment = exports.updateEnrichment = exports.createEnrichment = void 0;
exports.enrichWithLinkedIn = enrichWithLinkedIn;
exports.enrichWithCompanyData = enrichWithCompanyData;
exports.enrichWithTechStack = enrichWithTechStack;
exports.startProspectEnrichment = startProspectEnrichment;
exports.getEnrichmentStatus = getEnrichmentStatus;
exports.getAllEnrichments = getAllEnrichments;
exports.getEnrichmentByProspectId = getEnrichmentByProspectId;
exports.updateEnrichmentStatusBulk = updateEnrichmentStatusBulk;
exports.getEnrichmentStats = getEnrichmentStats;
exports.createEnrichmentBatch = createEnrichmentBatch;
const database_1 = require("@/config/database");
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const prospectEnricher_1 = require("../services/enrichment/prospectEnricher");
/**
 * Enrich prospect with LinkedIn profile using Proxycurl
 * POST /api/prospects/enrich/linkedin
 */
async function enrichWithLinkedIn(req, res) {
    try {
        const { linkedinUrl, aiProvider } = req.body;
        if (!linkedinUrl) {
            throw new errors_1.DatabaseError('LinkedIn URL is required');
        }
        // Validate LinkedIn URL format
        if (!linkedinUrl.includes('linkedin.com/in/')) {
            throw new errors_1.DatabaseError('Invalid LinkedIn URL format. Must be a LinkedIn profile URL.');
        }
        // Validate AI provider
        if (aiProvider && !['gemini', 'openrouter'].includes(aiProvider)) {
            throw new errors_1.DatabaseError('Invalid AI provider. Must be either "gemini" or "openrouter".');
        }
        const result = await prospectEnricher_1.ProspectEnricher.enrichWithProxycurl(linkedinUrl, {
            aiProvider: aiProvider || 'openrouter',
        });
        apiResponse_1.ApiResponseBuilder.success(res, result, result.message);
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError || error instanceof errors_1.DatabaseError) {
            throw error;
        }
        console.error('Error enriching prospect with LinkedIn:', error);
        throw new errors_1.DatabaseError('Failed to enrich prospect with LinkedIn data');
    }
}
/**
 * Enrich prospect with company data using Firecrawl
 * POST /api/prospects/enrich/company
 */
async function enrichWithCompanyData(req, res) {
    try {
        const { prospectId, aiProvider } = req.body;
        if (!prospectId) {
            throw new errors_1.DatabaseError('Prospect ID is required');
        }
        // Validate AI provider
        if (aiProvider && !['gemini', 'openrouter'].includes(aiProvider)) {
            throw new errors_1.DatabaseError('Invalid AI provider. Must be either "gemini" or "openrouter".');
        }
        // Validate prospect exists
        const prospect = await database_1.prisma.cOProspects.findUnique({
            where: { id: parseInt(prospectId) },
        });
        if (!prospect) {
            throw new errors_1.NotFoundError(`Prospect with ID ${prospectId} not found`);
        }
        const result = await prospectEnricher_1.ProspectEnricher.enrichWithCompanyData(parseInt(prospectId), {
            aiProvider: aiProvider || 'openrouter',
        });
        apiResponse_1.ApiResponseBuilder.success(res, result, result.message);
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError || error instanceof errors_1.DatabaseError) {
            throw error;
        }
        console.error('Error enriching prospect with company data:', error);
        throw new errors_1.DatabaseError('Failed to enrich prospect with company data');
    }
}
/**
 * Enrich prospect with tech stack data using BuiltWith via Firecrawl
 * POST /api/prospects/enrich/techstack
 */
async function enrichWithTechStack(req, res) {
    try {
        const { prospectId, aiProvider } = req.body;
        if (!prospectId) {
            throw new errors_1.DatabaseError('Prospect ID is required');
        }
        // Validate AI provider
        if (aiProvider && !['gemini', 'openrouter'].includes(aiProvider)) {
            throw new errors_1.DatabaseError('Invalid AI provider. Must be either "gemini" or "openrouter".');
        }
        // Validate prospect exists
        const prospect = await database_1.prisma.cOProspects.findUnique({
            where: { id: parseInt(prospectId) },
        });
        if (!prospect) {
            throw new errors_1.NotFoundError(`Prospect with ID ${prospectId} not found`);
        }
        const result = await prospectEnricher_1.ProspectEnricher.enrichWithTechStack(parseInt(prospectId), {
            aiProvider: aiProvider || 'openrouter',
        });
        apiResponse_1.ApiResponseBuilder.success(res, result, result.message);
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError || error instanceof errors_1.DatabaseError) {
            throw error;
        }
        console.error('Error enriching prospect with tech stack:', error);
        throw new errors_1.DatabaseError('Failed to enrich prospect with tech stack');
    }
}
/**
 * Start enrichment for a prospect
 */
async function startProspectEnrichment(req, res) {
    try {
        const prospectId = parseInt(req.params.id);
        const prospect = await database_1.prisma.cOProspects.findUnique({
            where: { id: prospectId },
        });
        if (!prospect) {
            throw new errors_1.NotFoundError(`Prospect with ID ${prospectId} not found`);
        }
        // Update prospect status to ENRICHING
        await database_1.prisma.cOProspects.update({
            where: { id: prospectId },
            data: { status: 'ENRICHING' },
        });
        // Create enrichment record
        const enrichment = await database_1.prisma.cOProspectEnrichments.upsert({
            where: { prospectId },
            create: {
                prospectId,
                enrichmentStatus: 'PROCESSING',
            },
            update: {
                enrichmentStatus: 'PROCESSING',
            },
        });
        apiResponse_1.ApiResponseBuilder.success(res, {
            prospect: {
                id: prospect.id,
                email: prospect.email,
                status: 'ENRICHING',
            },
            enrichment,
        }, 'Enrichment started successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error starting enrichment:', error);
        throw new errors_1.DatabaseError('Failed to start enrichment');
    }
}
/**
 * Get enrichment status
 */
async function getEnrichmentStatus(req, res) {
    try {
        const prospectId = parseInt(req.params.id);
        const prospect = await database_1.prisma.cOProspects.findUnique({
            where: { id: prospectId },
            include: {
                enrichment: true,
            },
        });
        if (!prospect) {
            throw new errors_1.NotFoundError(`Prospect with ID ${prospectId} not found`);
        }
        apiResponse_1.ApiResponseBuilder.success(res, {
            prospectId,
            status: prospect.status,
            enrichment: prospect.enrichment,
        }, 'Enrichment status retrieved successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error getting enrichment status:', error);
        throw new errors_1.DatabaseError('Failed to get enrichment status');
    }
}
/**
 * Get all enrichments with pagination and filtering
 */
async function getAllEnrichments(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const search = req.query.search;
        const whereClause = {};
        if (status) {
            whereClause.enrichmentStatus = status;
        }
        if (search) {
            whereClause.prospect = {
                OR: [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { company: { contains: search } },
                ],
            };
        }
        const [enrichments, total] = await Promise.all([
            database_1.prisma.cOProspectEnrichments.findMany({
                where: whereClause,
                include: {
                    prospect: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            company: true,
                            position: true,
                            linkedinUrl: true,
                            status: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
            }),
            database_1.prisma.cOProspectEnrichments.count({ where: whereClause }),
        ]);
        const pagination = {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
        apiResponse_1.ApiResponseBuilder.paginated(res, enrichments, pagination, 'Enrichments retrieved successfully');
    }
    catch (error) {
        console.error('Error getting enrichments:', error);
        throw new errors_1.DatabaseError('Failed to retrieve enrichments');
    }
}
/**
 * Get enrichment by prospect ID
 */
async function getEnrichmentByProspectId(req, res) {
    try {
        const prospectId = parseInt(req.params.prospectId);
        if (isNaN(prospectId)) {
            throw new errors_1.DatabaseError('Invalid prospect ID provided');
        }
        const enrichment = await database_1.prisma.cOProspectEnrichments.findUnique({
            where: { prospectId },
            include: {
                prospect: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        company: true,
                        position: true,
                        linkedinUrl: true,
                        status: true,
                    },
                },
            },
        });
        if (!enrichment) {
            throw new errors_1.NotFoundError(`Enrichment for prospect ${prospectId} not found`);
        }
        apiResponse_1.ApiResponseBuilder.success(res, enrichment, 'Enrichment retrieved successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error getting enrichment:', error);
        throw new errors_1.DatabaseError('Failed to retrieve enrichment');
    }
}
/**
 * Update enrichment status in bulk
 */
async function updateEnrichmentStatusBulk(req, res) {
    try {
        const { prospectIds, status } = req.body;
        if (!prospectIds ||
            !Array.isArray(prospectIds) ||
            prospectIds.length === 0) {
            throw new errors_1.DatabaseError('Invalid prospect IDs');
        }
        const updateData = {
            enrichmentStatus: status,
            updatedAt: new Date(),
        };
        if (status === 'COMPLETED') {
            updateData.enrichedAt = new Date();
        }
        const updatedCount = await database_1.prisma.cOProspectEnrichments.updateMany({
            where: {
                prospectId: { in: prospectIds },
            },
            data: updateData,
        });
        apiResponse_1.ApiResponseBuilder.success(res, { updatedCount: updatedCount.count }, `Updated ${updatedCount.count} enrichment(s) successfully`);
    }
    catch (error) {
        if (error instanceof errors_1.DatabaseError) {
            throw error;
        }
        console.error('Error updating enrichment status:', error);
        throw new errors_1.DatabaseError('Failed to update enrichment status');
    }
}
/**
 * Get enrichment statistics
 */
async function getEnrichmentStats(req, res) {
    try {
        const campaignId = req.params.campaignId
            ? parseInt(req.params.campaignId)
            : undefined;
        const whereClause = {};
        if (campaignId) {
            whereClause.prospect = { campaignId };
        }
        const stats = await database_1.prisma.cOProspectEnrichments.groupBy({
            by: ['enrichmentStatus'],
            where: whereClause,
            _count: { prospectId: true },
        });
        const formattedStats = stats.reduce((acc, stat) => {
            acc[stat.enrichmentStatus] = stat._count.prospectId;
            return acc;
        }, {});
        // Get total prospects
        const totalProspects = campaignId
            ? await database_1.prisma.cOProspects.count({ where: { campaignId } })
            : await database_1.prisma.cOProspects.count();
        apiResponse_1.ApiResponseBuilder.success(res, {
            stats: formattedStats,
            totalProspects,
            enrichedProspects: Object.values(formattedStats).reduce((sum, count) => sum + count, 0),
        }, 'Enrichment statistics retrieved successfully');
    }
    catch (error) {
        console.error('Error getting enrichment stats:', error);
        throw new errors_1.DatabaseError('Failed to retrieve enrichment statistics');
    }
}
const createEnrichment = async (req, res) => {
    try {
        const { prospectId } = req.body;
        if (!prospectId) {
            return apiResponse_1.ApiResponseBuilder.error(res, 'Prospect ID is required', 400);
        }
        const prospect = await database_1.prisma.cOProspects.findUnique({
            where: { id: parseInt(prospectId) },
        });
        if (!prospect) {
            return apiResponse_1.ApiResponseBuilder.notFound(res, 'Prospect not found');
        }
        const enrichment = await database_1.prisma.cOProspectEnrichments.create({
            data: {
                prospectId: parseInt(prospectId),
                enrichmentStatus: 'PENDING',
            },
        });
        return apiResponse_1.ApiResponseBuilder.success(res, enrichment, 'Enrichment created successfully');
    }
    catch (error) {
        console.error('Error creating enrichment:', error);
        return apiResponse_1.ApiResponseBuilder.error(res, 'Failed to create enrichment');
    }
};
exports.createEnrichment = createEnrichment;
const updateEnrichment = async (req, res) => {
    try {
        const { prospectId } = req.params;
        const updates = req.body;
        if (!prospectId) {
            return apiResponse_1.ApiResponseBuilder.error(res, 'Prospect ID is required', 400);
        }
        const enrichment = await database_1.prisma.cOProspectEnrichments.update({
            where: { prospectId: parseInt(prospectId) },
            data: updates,
        });
        return apiResponse_1.ApiResponseBuilder.success(res, enrichment, 'Enrichment updated successfully');
    }
    catch (error) {
        console.error('Error updating enrichment:', error);
        return apiResponse_1.ApiResponseBuilder.error(res, 'Failed to update enrichment');
    }
};
exports.updateEnrichment = updateEnrichment;
const deleteEnrichment = async (req, res) => {
    try {
        const { prospectId } = req.params;
        if (!prospectId) {
            return apiResponse_1.ApiResponseBuilder.error(res, 'Prospect ID is required', 400);
        }
        await database_1.prisma.cOProspectEnrichments.delete({
            where: { prospectId: parseInt(prospectId) },
        });
        return apiResponse_1.ApiResponseBuilder.success(res, null, 'Enrichment deleted successfully');
    }
    catch (error) {
        console.error('Error deleting enrichment:', error);
        return apiResponse_1.ApiResponseBuilder.error(res, 'Failed to delete enrichment');
    }
};
exports.deleteEnrichment = deleteEnrichment;
/**
 * Create a new enrichment batch
 * POST /api/enrichment/batches
 */
async function createEnrichmentBatch(req, res) {
    try {
        const { workflowSessionId, configuration, campaignId } = req.body;
        if (!workflowSessionId) {
            throw new errors_1.BadRequestError('Missing required field: workflowSessionId');
        }
        // Get workflow session to access configuration
        const workflowSession = await database_1.prisma.cOWorkflowSessions.findUnique({
            where: { id: workflowSessionId }
        });
        if (!workflowSession) {
            throw new errors_1.NotFoundError('Workflow session not found');
        }
        // Use configuration from workflow session if not provided in request
        const enrichmentConfig = configuration || workflowSession.configurationData;
        if (!enrichmentConfig) {
            throw new errors_1.BadRequestError('Missing required field: configuration');
        }
        if (!campaignId) {
            throw new errors_1.BadRequestError('Campaign ID is required');
        }
        // Create batch data with proper typing
        const batchData = {
            name: `Enrichment Batch ${new Date().toISOString()}`,
            status: 'PENDING',
            totalProspects: 0,
            enrichedProspects: 0,
            generatedEmails: 0,
            failedProspects: 0,
            campaign: {
                connect: { id: parseInt(campaignId.toString()) }
            }
        };
        // Create a new batch
        const batch = await database_1.prisma.cOBatches.create({
            data: batchData,
            include: {
                campaign: true
            }
        });
        // Update campaign with enrichment configuration
        await database_1.prisma.cOCampaigns.update({
            where: { id: parseInt(campaignId.toString()) },
            data: {
                enrichmentFlags: enrichmentConfig
            }
        });
        // Return success response
        apiResponse_1.ApiResponseBuilder.success(res, {
            batch,
            message: 'Enrichment batch created successfully'
        });
    }
    catch (error) {
        console.error('Error creating enrichment batch:', error);
        if (error instanceof errors_1.BadRequestError || error instanceof errors_1.NotFoundError) {
            apiResponse_1.ApiResponseBuilder.error(res, error.message, error.statusCode);
        }
        else {
            apiResponse_1.ApiResponseBuilder.error(res, 'Failed to create enrichment batch', 500);
        }
    }
}
