import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { ApiResponseBuilder } from '../utils/apiResponse';
import { NotFoundError, DatabaseError, BadRequestError } from '../utils/errors';
import { ProspectEnricher } from '../services/enrichment/prospectEnricher';
import { Prisma } from '@prisma/client';

/**
 * Enrich prospect with LinkedIn profile using Proxycurl
 * POST /api/prospects/enrich/linkedin
 */
export async function enrichWithLinkedIn(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { linkedinUrl, aiProvider } = req.body;

    if (!linkedinUrl) {
      throw new DatabaseError('LinkedIn URL is required');
    }

    // Validate LinkedIn URL format
    if (!linkedinUrl.includes('linkedin.com/in/')) {
      throw new DatabaseError(
        'Invalid LinkedIn URL format. Must be a LinkedIn profile URL.'
      );
    }

    // Validate AI provider
    if (aiProvider && !['gemini', 'openrouter'].includes(aiProvider)) {
      throw new DatabaseError(
        'Invalid AI provider. Must be either "gemini" or "openrouter".'
      );
    }

    const result = await ProspectEnricher.enrichWithProxycurl(linkedinUrl, {
      aiProvider: aiProvider || 'openrouter',
    });

    ApiResponseBuilder.success(res, result, result.message);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    console.error('Error enriching prospect with LinkedIn:', error);
    throw new DatabaseError('Failed to enrich prospect with LinkedIn data');
  }
}

/**
 * Enrich prospect with company data using Firecrawl
 * POST /api/prospects/enrich/company
 */
export async function enrichWithCompanyData(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { prospectId, aiProvider } = req.body;

    if (!prospectId) {
      throw new DatabaseError('Prospect ID is required');
    }

    // Validate AI provider
    if (aiProvider && !['gemini', 'openrouter'].includes(aiProvider)) {
      throw new DatabaseError(
        'Invalid AI provider. Must be either "gemini" or "openrouter".'
      );
    }

    // Validate prospect exists
    const prospect = await prisma.cOProspects.findUnique({
      where: { id: parseInt(prospectId) },
    });

    if (!prospect) {
      throw new NotFoundError(`Prospect with ID ${prospectId} not found`);
    }

    const result = await ProspectEnricher.enrichWithCompanyData(
      parseInt(prospectId),
      {
        aiProvider: aiProvider || 'openrouter',
      }
    );

    ApiResponseBuilder.success(res, result, result.message);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    console.error('Error enriching prospect with company data:', error);
    throw new DatabaseError('Failed to enrich prospect with company data');
  }
}

/**
 * Enrich prospect with tech stack data using BuiltWith via Firecrawl
 * POST /api/prospects/enrich/techstack
 */
export async function enrichWithTechStack(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { prospectId, aiProvider } = req.body;

    if (!prospectId) {
      throw new DatabaseError('Prospect ID is required');
    }

    // Validate AI provider
    if (aiProvider && !['gemini', 'openrouter'].includes(aiProvider)) {
      throw new DatabaseError(
        'Invalid AI provider. Must be either "gemini" or "openrouter".'
      );
    }

    // Validate prospect exists
    const prospect = await prisma.cOProspects.findUnique({
      where: { id: parseInt(prospectId) },
    });

    if (!prospect) {
      throw new NotFoundError(`Prospect with ID ${prospectId} not found`);
    }

    const result = await ProspectEnricher.enrichWithTechStack(
      parseInt(prospectId),
      {
        aiProvider: aiProvider || 'openrouter',
      }
    );

    ApiResponseBuilder.success(res, result, result.message);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    console.error('Error enriching prospect with tech stack:', error);
    throw new DatabaseError('Failed to enrich prospect with tech stack');
  }
}

/**
 * Start enrichment for a prospect
 */
export async function startProspectEnrichment(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const prospectId = parseInt(req.params.id!);

    const prospect = await prisma.cOProspects.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new NotFoundError(`Prospect with ID ${prospectId} not found`);
    }

    // Update prospect status to ENRICHING
    await prisma.cOProspects.update({
      where: { id: prospectId },
      data: { status: 'ENRICHING' },
    });

    // Create enrichment record
    const enrichment = await prisma.cOProspectEnrichments.upsert({
      where: { prospectId },
      create: {
        prospectId,
        enrichmentStatus: 'PROCESSING',
      },
      update: {
        enrichmentStatus: 'PROCESSING',
      },
    });

    ApiResponseBuilder.success(
      res,
      {
        prospect: {
          id: prospect.id,
          email: prospect.email,
          status: 'ENRICHING',
        },
        enrichment,
      },
      'Enrichment started successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error starting enrichment:', error);
    throw new DatabaseError('Failed to start enrichment');
  }
}

/**
 * Get enrichment status
 */
export async function getEnrichmentStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const prospectId = parseInt(req.params.id!);

    const prospect = await prisma.cOProspects.findUnique({
      where: { id: prospectId },
      include: {
        enrichment: true,
      },
    });

    if (!prospect) {
      throw new NotFoundError(`Prospect with ID ${prospectId} not found`);
    }

    ApiResponseBuilder.success(
      res,
      {
        prospectId,
        status: prospect.status,
        enrichment: prospect.enrichment,
      },
      'Enrichment status retrieved successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error getting enrichment status:', error);
    throw new DatabaseError('Failed to get enrichment status');
  }
}

/**
 * Get all enrichments with pagination and filtering
 */
export async function getAllEnrichments(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const whereClause: any = {};

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
      prisma.cOProspectEnrichments.findMany({
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
      prisma.cOProspectEnrichments.count({ where: whereClause }),
    ]);

    const pagination = {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
    ApiResponseBuilder.paginated(
      res,
      enrichments,
      pagination,
      'Enrichments retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting enrichments:', error);
    throw new DatabaseError('Failed to retrieve enrichments');
  }
}

/**
 * Get enrichment by prospect ID
 */
export async function getEnrichmentByProspectId(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const prospectId = parseInt(req.params.prospectId!);

    if (isNaN(prospectId)) {
      throw new DatabaseError('Invalid prospect ID provided');
    }

    const enrichment = await prisma.cOProspectEnrichments.findUnique({
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
      throw new NotFoundError(
        `Enrichment for prospect ${prospectId} not found`
      );
    }

    ApiResponseBuilder.success(
      res,
      enrichment,
      'Enrichment retrieved successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error getting enrichment:', error);
    throw new DatabaseError('Failed to retrieve enrichment');
  }
}

/**
 * Update enrichment status in bulk
 */
export async function updateEnrichmentStatusBulk(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { prospectIds, status } = req.body;

    if (
      !prospectIds ||
      !Array.isArray(prospectIds) ||
      prospectIds.length === 0
    ) {
      throw new DatabaseError('Invalid prospect IDs');
    }

    const updateData: any = {
      enrichmentStatus: status,
      updatedAt: new Date(),
    };

    if (status === 'COMPLETED') {
      updateData.enrichedAt = new Date();
    }

    const updatedCount = await prisma.cOProspectEnrichments.updateMany({
      where: {
        prospectId: { in: prospectIds },
      },
      data: updateData,
    });

    ApiResponseBuilder.success(
      res,
      { updatedCount: updatedCount.count },
      `Updated ${updatedCount.count} enrichment(s) successfully`
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    console.error('Error updating enrichment status:', error);
    throw new DatabaseError('Failed to update enrichment status');
  }
}

/**
 * Get enrichment statistics
 */
export async function getEnrichmentStats(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = req.params.campaignId
      ? parseInt(req.params.campaignId)
      : undefined;

    const whereClause: any = {};
    if (campaignId) {
      whereClause.prospect = { campaignId };
    }

    const stats = await prisma.cOProspectEnrichments.groupBy({
      by: ['enrichmentStatus'],
      where: whereClause,
      _count: { prospectId: true },
    });

    const formattedStats = stats.reduce((acc: any, stat) => {
      acc[stat.enrichmentStatus] = stat._count.prospectId;
      return acc;
    }, {});

    // Get total prospects
    const totalProspects = campaignId
      ? await prisma.cOProspects.count({ where: { campaignId } })
      : await prisma.cOProspects.count();

    ApiResponseBuilder.success(
      res,
      {
        stats: formattedStats,
        totalProspects,
        enrichedProspects: Object.values(formattedStats).reduce(
          (sum: number, count: any) => sum + count,
          0
        ),
      },
      'Enrichment statistics retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting enrichment stats:', error);
    throw new DatabaseError('Failed to retrieve enrichment statistics');
  }
}

export const createEnrichment = async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.body;

    if (!prospectId) {
      return ApiResponseBuilder.error(res, 'Prospect ID is required', 400);
    }

    const prospect = await prisma.cOProspects.findUnique({
      where: { id: parseInt(prospectId) },
    });

    if (!prospect) {
      return ApiResponseBuilder.notFound(res, 'Prospect not found');
    }

    const enrichment = await prisma.cOProspectEnrichments.create({
      data: {
        prospectId: parseInt(prospectId),
        enrichmentStatus: 'PENDING',
      },
    });

    return ApiResponseBuilder.success(
      res,
      enrichment,
      'Enrichment created successfully'
    );
  } catch (error) {
    console.error('Error creating enrichment:', error);
    return ApiResponseBuilder.error(res, 'Failed to create enrichment');
  }
};

export const updateEnrichment = async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.params;
    const updates = req.body;

    if (!prospectId) {
      return ApiResponseBuilder.error(res, 'Prospect ID is required', 400);
    }

    const enrichment = await prisma.cOProspectEnrichments.update({
      where: { prospectId: parseInt(prospectId) },
      data: updates,
    });

    return ApiResponseBuilder.success(
      res,
      enrichment,
      'Enrichment updated successfully'
    );
  } catch (error) {
    console.error('Error updating enrichment:', error);
    return ApiResponseBuilder.error(res, 'Failed to update enrichment');
  }
};

export const deleteEnrichment = async (req: Request, res: Response) => {
  try {
    const { prospectId } = req.params;

    if (!prospectId) {
      return ApiResponseBuilder.error(res, 'Prospect ID is required', 400);
    }

    await prisma.cOProspectEnrichments.delete({
      where: { prospectId: parseInt(prospectId) },
    });

    return ApiResponseBuilder.success(
      res,
      null,
      'Enrichment deleted successfully'
    );
  } catch (error) {
    console.error('Error deleting enrichment:', error);
    return ApiResponseBuilder.error(res, 'Failed to delete enrichment');
  }
};

/**
 * Create a new enrichment batch
 * POST /api/enrichment/batches
 */
export async function createEnrichmentBatch(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { workflowSessionId, configuration, campaignId } = req.body;

    if (!workflowSessionId) {
      throw new BadRequestError('Missing required field: workflowSessionId');
    }

    // Get workflow session to access configuration
    const workflowSession = await prisma.cOWorkflowSessions.findUnique({
      where: { id: workflowSessionId }
    });

    if (!workflowSession) {
      throw new NotFoundError('Workflow session not found');
    }

    // Use configuration from workflow session if not provided in request
    const enrichmentConfig = configuration || workflowSession.configurationData;

    if (!enrichmentConfig) {
      throw new BadRequestError('Missing required field: configuration');
    }

    if (!campaignId) {
      throw new BadRequestError('Campaign ID is required');
    }

    // Create batch data with proper typing
    const batchData: Prisma.COBatchesCreateInput = {
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
    const batch = await prisma.cOBatches.create({
      data: batchData,
      include: {
        campaign: true
      }
    });

    // Update campaign with enrichment configuration
    await prisma.cOCampaigns.update({
      where: { id: parseInt(campaignId.toString()) },
      data: {
        enrichmentFlags: enrichmentConfig
      }
    });

    // Return success response
    ApiResponseBuilder.success(res, {
      batch,
      message: 'Enrichment batch created successfully'
    });
  } catch (error) {
    console.error('Error creating enrichment batch:', error);
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      ApiResponseBuilder.error(res, error.message, error.statusCode);
    } else {
      ApiResponseBuilder.error(res, 'Failed to create enrichment batch', 500);
    }
  }
}
