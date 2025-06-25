"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCampaignSettings = getCampaignSettings;
exports.updateCampaignSettings = updateCampaignSettings;
exports.resetCampaignSettings = resetCampaignSettings;
exports.getCampaignSchedule = getCampaignSchedule;
exports.updateCampaignSchedule = updateCampaignSchedule;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("@/utils/apiResponse");
const errors_1 = require("@/utils/errors");
const prisma = new client_1.PrismaClient();
/**
 * Get campaign settings
 */
async function getCampaignSettings(req, res) {
    try {
        const campaignId = parseInt(req.params.id);
        // Check if campaign exists
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId }
        });
        if (!campaign) {
            throw new errors_1.NotFoundError(`Campaign with ID ${campaignId} not found`);
        }
        // Default settings (in production, these could be stored in a separate settings table)
        const defaultSettings = {
            batchSize: 50,
            delayBetweenEmails: 300000, // 5 minutes in milliseconds
            maxRetriesOnFailure: 3,
            enableAnalytics: true,
            autoArchiveAfterDays: 30,
            enrichmentSettings: {
                includeTechStack: true,
                includeCompanyInfo: true,
                includeLinkedInData: true,
                includeMarketPosition: false
            },
            emailSettings: {
                personalizeSubject: true,
                includeUnsubscribeLink: true,
                trackOpens: true,
                trackClicks: true
            },
            schedulingSettings: {
                timezone: 'UTC',
                workingHours: {
                    start: '09:00',
                    end: '17:00'
                },
                workingDays: [1, 2, 3, 4, 5], // Monday to Friday
                respectRecipientTimezone: false
            }
        };
        // Merge with any stored settings from enrichmentFlags
        const settings = {
            ...defaultSettings,
            enrichmentSettings: {
                ...defaultSettings.enrichmentSettings,
                ...campaign.enrichmentFlags
            }
        };
        apiResponse_1.ApiResponseBuilder.success(res, {
            campaignId,
            campaignName: campaign.name,
            settings
        }, 'Campaign settings retrieved successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error fetching campaign settings:', error);
        throw new errors_1.DatabaseError('Failed to fetch campaign settings');
    }
}
/**
 * Update campaign settings
 */
async function updateCampaignSettings(req, res) {
    try {
        const campaignId = parseInt(req.params.id);
        const { settings } = req.body;
        // Check if campaign exists
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId }
        });
        if (!campaign) {
            throw new errors_1.NotFoundError(`Campaign with ID ${campaignId} not found`);
        }
        // Update enrichment flags with enrichment settings
        const updatedEnrichmentFlags = {
            ...campaign.enrichmentFlags,
            ...settings.enrichmentSettings
        };
        // Update campaign with new enrichment flags
        const updatedCampaign = await prisma.campaign.update({
            where: { id: campaignId },
            data: {
                enrichmentFlags: updatedEnrichmentFlags
            }
        });
        // In production, you'd store the full settings in a separate table
        const responseSettings = {
            campaignId,
            settings: {
                ...settings,
                enrichmentSettings: updatedEnrichmentFlags
            },
            updatedAt: updatedCampaign.updatedAt
        };
        apiResponse_1.ApiResponseBuilder.success(res, responseSettings, 'Campaign settings updated successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error updating campaign settings:', error);
        throw new errors_1.DatabaseError('Failed to update campaign settings');
    }
}
/**
 * Reset campaign settings to defaults
 */
async function resetCampaignSettings(req, res) {
    try {
        const campaignId = parseInt(req.params.id);
        // Check if campaign exists
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId }
        });
        if (!campaign) {
            throw new errors_1.NotFoundError(`Campaign with ID ${campaignId} not found`);
        }
        // Reset to default enrichment flags
        const defaultEnrichmentFlags = {
            includeTechStack: true,
            includeCompanyInfo: true,
            includeLinkedInData: true,
            includeMarketPosition: false
        };
        const updatedCampaign = await prisma.campaign.update({
            where: { id: campaignId },
            data: {
                enrichmentFlags: defaultEnrichmentFlags
            }
        });
        apiResponse_1.ApiResponseBuilder.success(res, {
            campaignId,
            message: 'Settings reset to defaults',
            resetAt: updatedCampaign.updatedAt
        }, 'Campaign settings reset successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error resetting campaign settings:', error);
        throw new errors_1.DatabaseError('Failed to reset campaign settings');
    }
}
/**
 * Get campaign scheduling status
 */
async function getCampaignSchedule(req, res) {
    try {
        const campaignId = parseInt(req.params.id);
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
            estimatedCompletion: '2024-06-23T15:30:00Z'
        };
        apiResponse_1.ApiResponseBuilder.success(res, schedule, 'Campaign schedule retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching campaign schedule:', error);
        throw new errors_1.DatabaseError('Failed to fetch campaign schedule');
    }
}
/**
 * Update campaign schedule
 */
async function updateCampaignSchedule(req, res) {
    try {
        const campaignId = parseInt(req.params.id);
        const { scheduleSettings } = req.body;
        // Mock schedule update
        const updatedSchedule = {
            campaignId,
            isScheduled: true,
            scheduledStart: scheduleSettings.startTime,
            scheduledEnd: scheduleSettings.endTime,
            status: 'scheduled',
            updatedAt: new Date().toISOString()
        };
        apiResponse_1.ApiResponseBuilder.success(res, updatedSchedule, 'Campaign schedule updated successfully');
    }
    catch (error) {
        console.error('Error updating campaign schedule:', error);
        throw new errors_1.DatabaseError('Failed to update campaign schedule');
    }
}
