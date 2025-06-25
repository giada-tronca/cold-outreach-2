"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCampaigns = getAllCampaigns;
exports.getCampaignById = getCampaignById;
exports.createCampaign = createCampaign;
exports.updateCampaign = updateCampaign;
exports.deleteCampaign = deleteCampaign;
const database_1 = require("../config/database");
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
/**
 * Get all campaigns with search, filtering, and pagination
 */
async function getAllCampaigns(req, res) {
    try {
        const { page = '1', limit = '10', search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build where clause for filtering
        const where = {};
        // Search functionality
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { emailSubject: { contains: search, mode: 'insensitive' } }
            ];
        }
        // Build orderBy clause
        const orderBy = { [sortBy]: sortOrder };
        // Get campaigns with related data
        const [campaigns, totalCount] = await Promise.all([
            database_1.prisma.campaign.findMany({
                where,
                skip,
                take: limitNum,
                orderBy,
                include: {
                    _count: {
                        select: {
                            prospects: true,
                            batches: true
                        }
                    }
                }
            }),
            database_1.prisma.campaign.count({ where })
        ]);
        const pagination = (0, apiResponse_1.calculatePagination)(totalCount, pageNum, limitNum);
        apiResponse_1.ApiResponseBuilder.paginated(res, campaigns, pagination, 'Campaigns retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching campaigns:', error);
        throw new errors_1.DatabaseError('Failed to fetch campaigns');
    }
}
/**
 * Get campaign by ID
 */
async function getCampaignById(req, res) {
    try {
        const campaignId = parseInt(req.params.id);
        const campaign = await database_1.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: {
                prospects: true,
                batches: true,
                _count: {
                    select: {
                        prospects: true,
                        batches: true
                    }
                }
            }
        });
        if (!campaign) {
            throw new errors_1.NotFoundError(`Campaign with ID ${campaignId} not found`);
        }
        apiResponse_1.ApiResponseBuilder.success(res, campaign, 'Campaign retrieved successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error fetching campaign:', error);
        throw new errors_1.DatabaseError('Failed to fetch campaign');
    }
}
/**
 * Create new campaign
 */
async function createCampaign(req, res) {
    try {
        const { name, emailSubject, prompt, enrichmentFlags, serviceId } = req.body;
        const campaign = await database_1.prisma.campaign.create({
            data: {
                name,
                emailSubject,
                prompt,
                enrichmentFlags,
                serviceId
            }
        });
        apiResponse_1.ApiResponseBuilder.created(res, campaign, 'Campaign created successfully');
    }
    catch (error) {
        console.error('Error creating campaign:', error);
        throw new errors_1.DatabaseError('Failed to create campaign');
    }
}
/**
 * Update campaign
 */
async function updateCampaign(req, res) {
    try {
        const campaignId = parseInt(req.params.id);
        const updateData = req.body;
        const existingCampaign = await database_1.prisma.campaign.findUnique({
            where: { id: campaignId }
        });
        if (!existingCampaign) {
            throw new errors_1.NotFoundError(`Campaign with ID ${campaignId} not found`);
        }
        const updatedCampaign = await database_1.prisma.campaign.update({
            where: { id: campaignId },
            data: updateData
        });
        apiResponse_1.ApiResponseBuilder.success(res, updatedCampaign, 'Campaign updated successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error updating campaign:', error);
        throw new errors_1.DatabaseError('Failed to update campaign');
    }
}
/**
 * Delete campaign
 */
async function deleteCampaign(req, res) {
    try {
        const campaignId = parseInt(req.params.id);
        const existingCampaign = await database_1.prisma.campaign.findUnique({
            where: { id: campaignId }
        });
        if (!existingCampaign) {
            throw new errors_1.NotFoundError(`Campaign with ID ${campaignId} not found`);
        }
        await database_1.prisma.campaign.delete({
            where: { id: campaignId }
        });
        apiResponse_1.ApiResponseBuilder.success(res, { deletedCampaignId: campaignId }, 'Campaign deleted successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error deleting campaign:', error);
        throw new errors_1.DatabaseError('Failed to delete campaign');
    }
}
