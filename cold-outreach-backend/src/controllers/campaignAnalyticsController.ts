import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseBuilder } from '@/utils/apiResponse';
import { NotFoundError, DatabaseError } from '@/utils/errors';

const prisma = new PrismaClient();

/**
 * Get campaign analytics overview
 */
export async function getCampaignAnalytics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        prospects: {
          include: {
            enrichment: true,
            generatedEmail: true,
          },
        },
        batches: true,
      },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    // Calculate analytics
    const totalProspects = campaign.prospects.length;
    const enrichedProspects = campaign.prospects.filter(p =>
      ['ENRICHED', 'GENERATING', 'COMPLETED'].includes(p.status)
    ).length;
    const generatedEmails = campaign.prospects.filter(
      p => p.status === 'COMPLETED'
    ).length;
    const failedProspects = campaign.prospects.filter(
      p => p.status === 'FAILED'
    ).length;
    const pendingProspects = campaign.prospects.filter(
      p => p.status === 'PENDING'
    ).length;
    const processingProspects = campaign.prospects.filter(p =>
      ['ENRICHING', 'GENERATING'].includes(p.status)
    ).length;

    // Calculate rates
    const successRate =
      totalProspects > 0 ? (generatedEmails / totalProspects) * 100 : 0;
    const enrichmentRate =
      totalProspects > 0 ? (enrichedProspects / totalProspects) * 100 : 0;
    const failureRate =
      totalProspects > 0 ? (failedProspects / totalProspects) * 100 : 0;

    // Batch statistics
    const batchStats = campaign.batches.map(batch => ({
      id: batch.id,
      name: batch.name,
      status: batch.status,
      totalProspects: batch.totalProspects,
      enrichedProspects: batch.enrichedProspects,
      generatedEmails: batch.generatedEmails,
      failedProspects: batch.failedProspects,
      successRate:
        batch.totalProspects > 0
          ? (batch.generatedEmails / batch.totalProspects) * 100
          : 0,
    }));

    const analytics = {
      campaignId,
      campaignName: campaign.name,
      overview: {
        totalProspects,
        enrichedProspects,
        generatedEmails,
        failedProspects,
        pendingProspects,
        processingProspects,
      },
      rates: {
        successRate: Number(successRate.toFixed(2)),
        enrichmentRate: Number(enrichmentRate.toFixed(2)),
        failureRate: Number(failureRate.toFixed(2)),
      },
      batches: batchStats,
      timeline: {
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    };

    ApiResponseBuilder.success(
      res,
      analytics,
      'Campaign analytics retrieved successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error fetching campaign analytics:', error);
    throw new DatabaseError('Failed to fetch campaign analytics');
  }
}

/**
 * Get campaign performance metrics over time
 */
export async function getCampaignMetrics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);
    const { startDate, endDate, granularity = 'day' } = req.query;

    // Mock time-series data (in production, query actual data)
    const mockMetrics = {
      campaignId,
      period: {
        startDate: startDate || '2024-06-01',
        endDate: endDate || '2024-06-22',
        granularity,
      },
      metrics: [
        {
          date: '2024-06-20',
          prospectsAdded: 25,
          prospectsEnriched: 22,
          emailsGenerated: 20,
          failed: 3,
          successRate: 80,
        },
        {
          date: '2024-06-21',
          prospectsAdded: 30,
          prospectsEnriched: 28,
          emailsGenerated: 25,
          failed: 2,
          successRate: 83.3,
        },
        {
          date: '2024-06-22',
          prospectsAdded: 18,
          prospectsEnriched: 15,
          emailsGenerated: 14,
          failed: 1,
          successRate: 77.8,
        },
      ],
      summary: {
        totalPeriodProspects: 73,
        averageSuccessRate: 80.4,
        peakDay: '2024-06-21',
        lowestDay: '2024-06-22',
      },
    };

    ApiResponseBuilder.success(
      res,
      mockMetrics,
      'Campaign metrics retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    throw new DatabaseError('Failed to fetch campaign metrics');
  }
}

/**
 * Get campaign comparison analytics
 */
export async function compareCampaigns(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignIds = (req.query.campaignIds as string)
      ?.split(',')
      .map(id => parseInt(id));

    if (!campaignIds || campaignIds.length < 2) {
      ApiResponseBuilder.badRequest(
        res,
        'At least 2 campaign IDs are required for comparison'
      );
      return;
    }

    // Mock comparison data
    const comparison = {
      campaigns: campaignIds.map(id => ({
        id,
        name: `Campaign ${id}`,
        totalProspects: Math.floor(Math.random() * 500) + 100,
        successRate: Math.floor(Math.random() * 40) + 60,
        enrichmentRate: Math.floor(Math.random() * 30) + 70,
        avgTimeToComplete: Math.floor(Math.random() * 120) + 60, // minutes
      })),
      insights: [
        'Campaign with highest success rate shows 15% better prospect targeting',
        'Enrichment quality correlates with 23% higher email generation success',
        'Campaigns with custom prompts perform 18% better on average',
      ],
    };

    ApiResponseBuilder.success(
      res,
      comparison,
      'Campaign comparison retrieved successfully'
    );
  } catch (error) {
    console.error('Error comparing campaigns:', error);
    throw new DatabaseError('Failed to compare campaigns');
  }
}

/**
 * Export campaign analytics data
 */
export async function exportCampaignData(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);
    const { format = 'csv' } = req.query;

    // Mock export data
    const exportData = {
      campaignId,
      format,
      downloadUrl: `/api/campaigns/${campaignId}/download/${format}`,
      generatedAt: new Date().toISOString(),
      estimatedSize: '2.3MB',
      recordCount: 1247,
    };

    ApiResponseBuilder.success(res, exportData, 'Export prepared successfully');
  } catch (error) {
    console.error('Error preparing export:', error);
    throw new DatabaseError('Failed to prepare export');
  }
}
