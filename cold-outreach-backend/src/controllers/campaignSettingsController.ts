import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseBuilder } from '@/utils/apiResponse';
import { NotFoundError, DatabaseError } from '@/utils/errors';

const prisma = new PrismaClient();

interface CampaignSettings {
  batchSize: number;
  delayBetweenEmails: number;
  maxRetriesOnFailure: number;
  enableAnalytics: boolean;
  autoArchiveAfterDays: number;
  enrichmentSettings: {
    includeTechStack: boolean;
    includeCompanyInfo: boolean;
    includeLinkedInData: boolean;
    includeMarketPosition: boolean;
  };
  emailSettings: {
    personalizeSubject: boolean;
    includeUnsubscribeLink: boolean;
    trackOpens: boolean;
    trackClicks: boolean;
  };
  schedulingSettings: {
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    workingDays: number[];
    respectRecipientTimezone: boolean;
  };
}

/**
 * Get campaign settings
 */
export async function getCampaignSettings(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    // Default settings (in production, these could be stored in a separate settings table)
    const defaultSettings: CampaignSettings = {
      batchSize: 50,
      delayBetweenEmails: 300000, // 5 minutes in milliseconds
      maxRetriesOnFailure: 3,
      enableAnalytics: true,
      autoArchiveAfterDays: 30,
      enrichmentSettings: {
        includeTechStack: true,
        includeCompanyInfo: true,
        includeLinkedInData: true,
        includeMarketPosition: false,
      },
      emailSettings: {
        personalizeSubject: true,
        includeUnsubscribeLink: true,
        trackOpens: true,
        trackClicks: true,
      },
      schedulingSettings: {
        timezone: 'UTC',
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
        workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        respectRecipientTimezone: false,
      },
    };

    // Merge with any stored settings from enrichmentFlags
    const settings = {
      ...defaultSettings,
      enrichmentSettings: {
        ...defaultSettings.enrichmentSettings,
        ...(campaign.enrichmentFlags as any),
      },
    };

    ApiResponseBuilder.success(
      res,
      {
        campaignId,
        campaignName: campaign.name,
        settings,
      },
      'Campaign settings retrieved successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error fetching campaign settings:', error);
    throw new DatabaseError('Failed to fetch campaign settings');
  }
}

/**
 * Update campaign settings
 */
export async function updateCampaignSettings(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);
    const { settings } = req.body;

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    // Update enrichment flags with enrichment settings
    const updatedEnrichmentFlags = {
      ...(campaign.enrichmentFlags as any),
      ...settings.enrichmentSettings,
    };

    // Update campaign with new enrichment flags
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        enrichmentFlags: updatedEnrichmentFlags,
      },
    });

    // In production, you'd store the full settings in a separate table
    const responseSettings = {
      campaignId,
      settings: {
        ...settings,
        enrichmentSettings: updatedEnrichmentFlags,
      },
      updatedAt: updatedCampaign.updatedAt,
    };

    ApiResponseBuilder.success(
      res,
      responseSettings,
      'Campaign settings updated successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error updating campaign settings:', error);
    throw new DatabaseError('Failed to update campaign settings');
  }
}

/**
 * Reset campaign settings to defaults
 */
export async function resetCampaignSettings(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError(`Campaign with ID ${campaignId} not found`);
    }

    // Reset to default enrichment flags
    const defaultEnrichmentFlags = {
      includeTechStack: true,
      includeCompanyInfo: true,
      includeLinkedInData: true,
      includeMarketPosition: false,
    };

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        enrichmentFlags: defaultEnrichmentFlags,
      },
    });

    ApiResponseBuilder.success(
      res,
      {
        campaignId,
        message: 'Settings reset to defaults',
        resetAt: updatedCampaign.updatedAt,
      },
      'Campaign settings reset successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error resetting campaign settings:', error);
    throw new DatabaseError('Failed to reset campaign settings');
  }
}

/**
 * Get campaign scheduling status
 */
export async function getCampaignSchedule(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);

    // Mock scheduling data
    const schedule = {
      campaignId,
      isScheduled: false,
      scheduledStart: null,
      scheduledEnd: null,
      status: 'ready',
      nextExecutionTime: null,
      recurringSettings: null,
      estimatedDuration: '2-3 hours',
      estimatedCompletion: '2024-06-23T15:30:00Z',
    };

    ApiResponseBuilder.success(
      res,
      schedule,
      'Campaign schedule retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching campaign schedule:', error);
    throw new DatabaseError('Failed to fetch campaign schedule');
  }
}

/**
 * Update campaign schedule
 */
export async function updateCampaignSchedule(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const campaignId = parseInt(req.params.id!);
    const { scheduleSettings } = req.body;

    // Mock schedule update
    const updatedSchedule = {
      campaignId,
      isScheduled: true,
      scheduledStart: scheduleSettings.startTime,
      scheduledEnd: scheduleSettings.endTime,
      status: 'scheduled',
      updatedAt: new Date().toISOString(),
    };

    ApiResponseBuilder.success(
      res,
      updatedSchedule,
      'Campaign schedule updated successfully'
    );
  } catch (error) {
    console.error('Error updating campaign schedule:', error);
    throw new DatabaseError('Failed to update campaign schedule');
  }
}
