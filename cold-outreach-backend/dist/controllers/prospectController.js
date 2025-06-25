"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.associateProspectsWithCampaign = exports.deleteProspect = exports.updateProspect = exports.createProspect = exports.getGeneratedEmailByProspectId = exports.getProspectById = exports.getAllProspects = exports.ProspectController = void 0;
const apiResponse_1 = require("../utils/apiResponse");
const database_1 = require("../config/database");
// interface ProspectData {
//   errorMessage?: string;
//   jobTitle?: string;
//   phone?: string;
//   location?: string;
//   companyEmployees?: string;
//   companyIndustries?: string[];
//   companyKeywords?: string[];
//   linkedinUrl: string;
//   status: string;
//   additionalData?: any;
//   usesFallback?: boolean;
//   campaign?: any;
//   batch?: any;
//   enrichment?: any;
//   generatedEmail?: any;
//   createdAt: Date | string;
//   updatedAt: Date | string;
// }
// Create a simple logger
const logger = {
    info: (message, ...args) => {
        console.log(`[INFO] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[WARN] ${message}`, ...args);
    },
    debug: (message, ...args) => {
        console.debug(`[DEBUG] ${message}`, ...args);
    }
};
// Helper function to convert BigInt values to numbers for JSON serialization
function convertBigIntToNumber(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === 'bigint')
        return Number(obj);
    if (Array.isArray(obj))
        return obj.map(convertBigIntToNumber);
    if (typeof obj === 'object') {
        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertBigIntToNumber(value);
        }
        return converted;
    }
    return obj;
}
// Transform function to handle prospect data
function transformProspectToResponse(prospect) {
    // Extract additional data fields if they exist
    const additionalData = prospect.additionalData || {};
    // Create base object with required fields
    return {
        id: prospect.id,
        name: prospect.name,
        email: prospect.email,
        company: prospect.company,
        position: prospect.position,
        status: prospect.status,
        uploadId: prospect.uploadId,
        linkedinUrl: prospect.linkedinUrl,
        additionalData: prospect.additionalData,
        usesFallback: prospect.usesFallback,
        metadata: prospect.metadata,
        createdAt: prospect.createdAt instanceof Date ? prospect.createdAt.toISOString() : prospect.createdAt,
        updatedAt: prospect.updatedAt instanceof Date ? prospect.updatedAt.toISOString() : prospect.updatedAt,
        errorMessage: additionalData.errorMessage,
        jobTitle: additionalData.jobTitle,
        phone: additionalData.phone,
        location: additionalData.location,
        companyEmployees: additionalData.companyEmployees,
        companyIndustries: additionalData.companyIndustries,
        companyKeywords: additionalData.companyKeywords,
        // Include campaign data if available
        campaign: prospect.campaign ? {
            id: prospect.campaign.id,
            name: prospect.campaign.name,
            emailSubject: prospect.campaign.emailSubject,
            prompt: prospect.campaign.prompt,
            enrichmentFlags: prospect.campaign.enrichmentFlags,
            serviceId: prospect.campaign.serviceId,
            createdAt: prospect.campaign.createdAt instanceof Date ? prospect.campaign.createdAt.toISOString() : prospect.campaign.createdAt,
            updatedAt: prospect.campaign.updatedAt instanceof Date ? prospect.campaign.updatedAt.toISOString() : prospect.campaign.updatedAt,
        } : null,
        // Include batch data if available
        batch: prospect.batch ? {
            id: prospect.batch.id,
            name: prospect.batch.name,
            status: prospect.batch.status,
            totalProspects: prospect.batch.totalProspects,
            enrichedProspects: prospect.batch.enrichedProspects,
            generatedEmails: prospect.batch.generatedEmails,
            failedProspects: prospect.batch.failedProspects,
            errorMessage: prospect.batch.errorMessage,
            createdAt: prospect.batch.createdAt instanceof Date ? prospect.batch.createdAt.toISOString() : prospect.batch.createdAt,
            updatedAt: prospect.batch.updatedAt instanceof Date ? prospect.batch.updatedAt.toISOString() : prospect.batch.updatedAt,
        } : null,
        // Include enrichment data if available
        enrichment: prospect.enrichment ? {
            prospectId: prospect.enrichment.prospectId,
            companyWebsite: prospect.enrichment.companyWebsite,
            companySummary: prospect.enrichment.companySummary,
            linkedinSummary: prospect.enrichment.linkedinSummary,
            prospectAnalysisSummary: prospect.enrichment.prospectAnalysisSummary,
            techStack: prospect.enrichment.techStack,
            enrichmentStatus: prospect.enrichment.enrichmentStatus,
            builtwithSummary: prospect.enrichment.builtwithSummary,
            enrichedAt: prospect.enrichment.enrichedAt instanceof Date ? prospect.enrichment.enrichedAt.toISOString() : prospect.enrichment.enrichedAt,
            modelUsed: prospect.enrichment.modelUsed,
            createdAt: prospect.enrichment.createdAt instanceof Date ? prospect.enrichment.createdAt.toISOString() : prospect.enrichment.createdAt,
            updatedAt: prospect.enrichment.updatedAt instanceof Date ? prospect.enrichment.updatedAt.toISOString() : prospect.enrichment.updatedAt,
        } : null,
        // Include generated email data if available
        generatedEmail: prospect.generatedEmail ? {
            prospectId: prospect.generatedEmail.prospectId,
            subject: prospect.generatedEmail.subject,
            body: prospect.generatedEmail.body,
            generationStatus: prospect.generatedEmail.generationStatus,
            errorMessage: prospect.generatedEmail.errorMessage,
            language: prospect.generatedEmail.language,
            generatedAt: prospect.generatedEmail.generatedAt instanceof Date ? prospect.generatedEmail.generatedAt.toISOString() : prospect.generatedEmail.generatedAt,
            modelUsed: prospect.generatedEmail.modelUsed,
            generationMetadata: prospect.generatedEmail.generationMetadata,
            createdAt: prospect.generatedEmail.createdAt instanceof Date ? prospect.generatedEmail.createdAt.toISOString() : prospect.generatedEmail.createdAt,
            updatedAt: prospect.generatedEmail.updatedAt instanceof Date ? prospect.generatedEmail.updatedAt.toISOString() : prospect.generatedEmail.updatedAt,
        } : null,
    };
}
class ProspectController {
    async getProspects(req, res) {
        try {
            const { page = '1', limit = '10', search, campaignId, batchId, uploadSession, } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build where clause
            const where = {};
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { company: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (campaignId) {
                where.campaignId = parseInt(campaignId);
            }
            if (batchId) {
                where.batchId = parseInt(batchId);
            }
            // Support for filtering by upload session (to get only uploaded prospects)
            if (uploadSession) {
                where.additionalData = {
                    path: ['uploadSession'],
                    equals: uploadSession,
                };
            }
            // Build dynamic SQL query with conditional filters
            const conditions = [];
            const params = [];
            if (search) {
                conditions.push(`(p.name ILIKE $${params.length + 1} OR p.email ILIKE $${params.length + 1} OR p.company ILIKE $${params.length + 1})`);
                params.push(`%${search}%`);
            }
            if (campaignId) {
                conditions.push(`p.campaign_id = $${params.length + 1}`);
                params.push(parseInt(campaignId));
            }
            if (batchId) {
                conditions.push(`p.batch_id = $${params.length + 1}`);
                params.push(parseInt(batchId));
            }
            if (uploadSession) {
                conditions.push(`p.additional_data->>'uploadSession' = $${params.length + 1}`);
                params.push(uploadSession);
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            // Use raw SQL to bypass Prisma type validation issues with status field
            const prospectQuery = `
                SELECT 
                    p.*,
                    c.id as campaign_id, c.name as campaign_name, c.email_subject, c.prompt,
                    b.id as batch_id, b.name as batch_name, b.status as batch_status, 
                    b.total_prospects, b.enriched_prospects
                FROM "CO_prospects" p
                LEFT JOIN "CO_campaigns" c ON p.campaign_id = c.id
                LEFT JOIN "CO_batches" b ON p.batch_id = b.id
                ${whereClause}
                ORDER BY p.created_at DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `;
            params.push(limitNum, skip);
            const countQuery = `
                SELECT COUNT(*) as total
                FROM "CO_prospects" p
                ${whereClause}
            `;
            const [prospectsResult, totalResult] = await Promise.all([
                database_1.prisma.$queryRawUnsafe(prospectQuery, ...params),
                database_1.prisma.$queryRawUnsafe(countQuery, ...params.slice(0, -2)), // Exclude limit and offset for count
            ]);
            const prospects = convertBigIntToNumber(prospectsResult);
            const total = Number(totalResult[0]?.total) || 0;
            const transformedProspects = prospects.map((prospect) => ({
                ...prospect,
                // Transform snake_case to camelCase for frontend
                id: prospect.id,
                campaignId: prospect.campaign_id,
                batchId: prospect.batch_id,
                name: prospect.name,
                email: prospect.email,
                company: prospect.company,
                position: prospect.position,
                linkedinUrl: prospect.linkedin_url,
                status: prospect.status,
                additionalData: prospect.additional_data,
                errorMessage: prospect.error_message,
                createdAt: prospect.created_at,
                updatedAt: prospect.updated_at,
                jobTitle: prospect.job_title,
                phone: prospect.phone,
                location: prospect.location,
                companyEmployees: prospect.company_employees,
                companyIndustries: prospect.company_industries,
                companyKeywords: prospect.company_keywords,
                usesFallback: prospect.uses_fallback,
                enrichment: prospect.enrichment
                    ? {
                        ...prospect.enrichment,
                        companyWebsite: prospect.enrichment.companyWebsite || undefined,
                        companySummary: prospect.enrichment.companySummary || undefined,
                        linkedinSummary: prospect.enrichment.linkedinSummary || undefined,
                        prospectAnalysisSummary: prospect.enrichment.prospectAnalysisSummary || undefined,
                        builtwithSummary: prospect.enrichment.builtwithSummary || undefined,
                        enrichedAt: prospect.enrichment.enrichedAt || undefined,
                        modelUsed: prospect.enrichment.modelUsed || undefined,
                    }
                    : undefined,
                generatedEmail: prospect.generatedEmail
                    ? {
                        ...prospect.generatedEmail,
                        errorMessage: prospect.generatedEmail.errorMessage || undefined,
                        generatedAt: prospect.generatedEmail.generatedAt || undefined,
                        modelUsed: prospect.generatedEmail.modelUsed || undefined,
                        subject: prospect.generatedEmail.subject || undefined,
                        body: prospect.generatedEmail.body || undefined,
                        language: prospect.generatedEmail.language || undefined,
                    }
                    : undefined,
            }));
            const pagination = (0, apiResponse_1.calculatePagination)(total, pageNum, limitNum);
            apiResponse_1.ApiResponseBuilder.paginated(res, transformedProspects, pagination, 'Prospects retrieved successfully');
        }
        catch (error) {
            logger.error('Error fetching prospects:', error);
            apiResponse_1.ApiResponseBuilder.error(res, 'Failed to fetch prospects');
        }
    }
    async getProspectById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                apiResponse_1.ApiResponseBuilder.badRequest(res, 'Prospect ID is required');
                return;
            }
            // Fetch prospect with all related data using Prisma
            const prospect = await database_1.prisma.cOProspects.findUnique({
                where: { id: parseInt(id) },
                include: {
                    campaign: true,
                    batch: true,
                    enrichment: true,
                    generatedEmail: true,
                },
            });
            if (!prospect) {
                apiResponse_1.ApiResponseBuilder.notFound(res, 'Prospect not found');
                return;
            }
            // Debug log the date format
            console.log('🗓️ [Backend] Raw created_at for single prospect:', prospect.createdAt, 'Type:', typeof prospect.createdAt);
            // Transform the prospect data for frontend consumption
            const transformedProspect = transformProspectToResponse(prospect);
            apiResponse_1.ApiResponseBuilder.success(res, transformedProspect, 'Prospect retrieved successfully');
        }
        catch (error) {
            logger.error('Error fetching prospect:', error);
            apiResponse_1.ApiResponseBuilder.error(res, 'Failed to fetch prospect');
        }
    }
    async getGeneratedEmailByProspectId(req, res) {
        try {
            const { prospectId } = req.params;
            if (!prospectId) {
                apiResponse_1.ApiResponseBuilder.badRequest(res, 'Prospect ID is required');
                return;
            }
            const prospectIdNum = parseInt(prospectId);
            if (isNaN(prospectIdNum)) {
                apiResponse_1.ApiResponseBuilder.badRequest(res, 'Invalid prospect ID');
                return;
            }
            // Fetch generated email for the prospect
            const generatedEmail = await database_1.prisma.cOGeneratedEmails.findUnique({
                where: { prospectId: prospectIdNum },
            });
            if (!generatedEmail) {
                apiResponse_1.ApiResponseBuilder.notFound(res, 'Generated email not found for this prospect');
                return;
            }
            // Transform the generated email data for frontend consumption
            const transformedGeneratedEmail = {
                prospectId: generatedEmail.prospectId,
                subject: generatedEmail.subject || undefined,
                body: generatedEmail.body || undefined,
                generationStatus: generatedEmail.generationStatus,
                errorMessage: generatedEmail.errorMessage || undefined,
                language: generatedEmail.language || undefined,
                generatedAt: generatedEmail.generatedAt
                    ? generatedEmail.generatedAt instanceof Date
                        ? generatedEmail.generatedAt.toISOString()
                        : generatedEmail.generatedAt
                    : undefined,
                modelUsed: generatedEmail.modelUsed || undefined,
                generationMetadata: generatedEmail.generationMetadata || undefined,
                createdAt: generatedEmail.createdAt instanceof Date
                    ? generatedEmail.createdAt.toISOString()
                    : generatedEmail.createdAt,
                updatedAt: generatedEmail.updatedAt instanceof Date
                    ? generatedEmail.updatedAt.toISOString()
                    : generatedEmail.updatedAt,
            };
            apiResponse_1.ApiResponseBuilder.success(res, transformedGeneratedEmail, 'Generated email retrieved successfully');
        }
        catch (error) {
            logger.error('Error fetching generated email:', error);
            apiResponse_1.ApiResponseBuilder.error(res, 'Failed to fetch generated email');
        }
    }
}
exports.ProspectController = ProspectController;
// Export controller functions for use in routes
const controller = new ProspectController();
exports.getAllProspects = controller.getProspects.bind(controller);
exports.getProspectById = controller.getProspectById.bind(controller);
exports.getGeneratedEmailByProspectId = controller.getGeneratedEmailByProspectId.bind(controller);
// Placeholder functions for disabled functionality
const createProspect = async (req, res) => {
    apiResponse_1.ApiResponseBuilder.error(res, 'Create prospect functionality is temporarily disabled', 501);
};
exports.createProspect = createProspect;
const updateProspect = async (req, res) => {
    apiResponse_1.ApiResponseBuilder.error(res, 'Update prospect functionality is temporarily disabled', 501);
};
exports.updateProspect = updateProspect;
const deleteProspect = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            apiResponse_1.ApiResponseBuilder.badRequest(res, 'Prospect ID is required');
            return;
        }
        const prospectId = parseInt(id);
        if (isNaN(prospectId)) {
            apiResponse_1.ApiResponseBuilder.badRequest(res, 'Invalid prospect ID');
            return;
        }
        logger.info(`Attempting to delete prospect ${prospectId}`);
        // Check if prospect exists
        const existingProspect = await database_1.prisma.prospect.findUnique({
            where: { id: prospectId },
        });
        if (!existingProspect) {
            apiResponse_1.ApiResponseBuilder.notFound(res, 'Prospect not found');
            return;
        }
        // Delete prospect and all associated data using transaction
        await database_1.prisma.$transaction(async (tx) => {
            // Delete generated email if exists
            await tx.generatedEmail.deleteMany({
                where: { prospectId },
            });
            // Delete enrichment data if exists
            await tx.prospectEnrichment.deleteMany({
                where: { prospectId },
            });
            // Delete the prospect
            await tx.prospect.delete({
                where: { id: prospectId },
            });
        });
        logger.info(`Successfully deleted prospect ${prospectId}`);
        apiResponse_1.ApiResponseBuilder.success(res, { id: prospectId }, 'Prospect deleted successfully');
    }
    catch (error) {
        logger.error('Error deleting prospect:', error);
        apiResponse_1.ApiResponseBuilder.error(res, 'Failed to delete prospect');
    }
};
exports.deleteProspect = deleteProspect;
/**
 * Associate prospects with a campaign
 * This is used when a campaign is created after prospects are uploaded
 */
const associateProspectsWithCampaign = async (req, res) => {
    try {
        const { campaignId, uploadId } = req.body;
        if (!campaignId) {
            apiResponse_1.ApiResponseBuilder.badRequest(res, 'Campaign ID is required');
            return;
        }
        if (!uploadId) {
            apiResponse_1.ApiResponseBuilder.badRequest(res, 'Upload ID is required');
            return;
        }
        const campaignIdNum = parseInt(campaignId);
        if (isNaN(campaignIdNum)) {
            apiResponse_1.ApiResponseBuilder.badRequest(res, 'Invalid campaign ID');
            return;
        }
        logger.info(`Associating prospects from upload ${uploadId} with campaign ${campaignIdNum}`);
        console.log(`[PROSPECT CONTROLLER] Request body:`, req.body);
        // First verify the campaign exists
        const campaign = await database_1.prisma.cOCampaigns.findUnique({
            where: { id: campaignIdNum },
        });
        if (!campaign) {
            apiResponse_1.ApiResponseBuilder.notFound(res, 'Campaign not found');
            return;
        }
        // Instead of looking for NULL campaign_id, look for recently created prospects
        // that were created with a temporary/default campaign during CSV upload
        // We'll find prospects created in the last 2 hours that aren't already in the target campaign
        const updateQuery = `
            UPDATE "CO_prospects" 
            SET campaign_id = $1, updated_at = NOW()
            WHERE campaign_id != $1 
            AND created_at > NOW() - INTERVAL '2 hours'
            AND (
                additional_data::text LIKE '%${uploadId}%' OR
                created_at > NOW() - INTERVAL '30 minutes'
            )
        `;
        const result = await database_1.prisma.$executeRawUnsafe(updateQuery, campaignIdNum);
        logger.info(`Updated ${result} prospects to associate with campaign ${campaignIdNum}`);
        // Also create a batch record for tracking
        const batch = await database_1.prisma.cOBatches.create({
            data: {
                name: `Upload ${uploadId} - Associated with Campaign`,
                campaignId: campaignIdNum,
                totalProspects: Number(result),
                status: 'UPLOADED',
            },
        });
        // Update the prospects with the batch ID as well
        if (result > 0) {
            const updateBatchQuery = `
                UPDATE "CO_prospects" 
                SET batch_id = $1
                WHERE campaign_id = $2 AND batch_id IS NULL
            `;
            await database_1.prisma.$executeRawUnsafe(updateBatchQuery, batch.id, campaignIdNum);
        }
        apiResponse_1.ApiResponseBuilder.success(res, {
            campaignId: campaignIdNum,
            prospectsUpdated: Number(result),
            batchId: batch.id,
            uploadId,
        }, `Successfully associated ${result} prospects with campaign`);
    }
    catch (error) {
        logger.error('Error associating prospects with campaign:', error);
        apiResponse_1.ApiResponseBuilder.error(res, 'Failed to associate prospects with campaign');
    }
};
exports.associateProspectsWithCampaign = associateProspectsWithCampaign;
