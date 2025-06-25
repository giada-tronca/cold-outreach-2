import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { ApiResponseBuilder, calculatePagination } from '../utils/apiResponse';
import { NotFoundError, DatabaseError } from '../utils/errors';

export interface CampaignQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateCampaignData {
  name: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: Record<string, any>;
  serviceId?: number;
}

export interface UpdateCampaignData {
  name?: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: Record<string, any>;
  serviceId?: number;
}

/**
 * Get all campaigns with search, filtering, and pagination
 */
export async function getAllCampaigns(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where: any = {};

    // Search functionality
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { emailSubject: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = { [sortBy as string]: sortOrder as string };

    // Get campaigns with related data
    const [campaigns, totalCount] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          _count: {
            select: {
              prospects: true,
              batches: true,
            },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    const pagination = calculatePagination(totalCount, pageNum, limitNum);

    ApiResponseBuilder.paginated(
      res,
      campaigns,
      pagination,
      'Campaigns retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw new DatabaseError('Failed to fetch campaigns');
  }
}

/**
 * Get campaign by ID
 */
export async function getCampaignById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        prospects: true,
        batches: true,
        _count: {
          select: {
            prospects: true,
            batches: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    ApiResponseBuilder.success(
      res,
      campaign,
      'Campaign retrieved successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error fetching campaign:', error);
    throw new DatabaseError('Failed to fetch campaign');
  }
}

/**
 * Create new campaign
 */
export async function createCampaign(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name, emailSubject, prompt, enrichmentFlags, serviceId } = req.body;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        emailSubject,
        prompt,
        enrichmentFlags,
        serviceId,
      },
    });

    ApiResponseBuilder.created(res, campaign, 'Campaign created successfully');
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw new DatabaseError('Failed to create campaign');
  }
}

/**
 * Update campaign
 */
export async function updateCampaign(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);
    const updateData = req.body;

    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!existingCampaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    ApiResponseBuilder.success(
      res,
      updatedCampaign,
      'Campaign updated successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error updating campaign:', error);
    throw new DatabaseError('Failed to update campaign');
  }
}

/**
 * Delete campaign
 */
export async function deleteCampaign(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);

    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!existingCampaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    ApiResponseBuilder.success(
      res,
      { deletedCampaignId: campaignId },
      'Campaign deleted successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error deleting campaign:', error);
    throw new DatabaseError('Failed to delete campaign');
  }
}
