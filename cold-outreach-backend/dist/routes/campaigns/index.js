"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiResponse_1 = require("@/utils/apiResponse");
const middleware_1 = require("@/middleware");
const campaignValidators_1 = require("@/validators/campaignValidators");
// Import controllers
const campaignController_1 = require("@/controllers/campaignController");
const campaignTemplateController_1 = require("@/controllers/campaignTemplateController");
const campaignAnalyticsController_1 = require("@/controllers/campaignAnalyticsController");
const campaignSettingsController_1 = require("@/controllers/campaignSettingsController");
const router = (0, express_1.Router)();
// ==========================================
// SPECIFIC ROUTES (MUST COME BEFORE /:id)
// ==========================================
/**
 * GET /api/campaigns/templates
 * Get all campaign templates
 */
router.get('/templates', (0, middleware_1.asyncHandler)(campaignTemplateController_1.getAllTemplates));
/**
 * POST /api/campaigns/templates
 * Create new campaign template
 */
router.post('/templates', (0, middleware_1.validate)(campaignValidators_1.validateCampaignTemplate), (0, middleware_1.asyncHandler)(campaignTemplateController_1.createTemplate));
/**
 * POST /api/campaigns/templates/:id/use
 * Create campaign from template
 */
router.post('/templates/:id/use', (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Create from template endpoint' }, 'Template usage endpoint');
});
/**
 * GET /api/campaigns/compare
 * Compare multiple campaigns
 */
router.get('/compare', (0, middleware_1.asyncHandler)(campaignAnalyticsController_1.compareCampaigns));
/**
 * POST /api/campaigns/bulk
 * Bulk operations on campaigns
 */
router.post('/bulk', (0, middleware_1.validate)(campaignValidators_1.validateBulkOperation), (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Bulk operations endpoint' }, 'Bulk operation completed');
});
// ==========================================
// CAMPAIGN CRUD OPERATIONS
// ==========================================
/**
 * GET /api/campaigns
 * Get all campaigns with search, filtering, and pagination
 */
router.get('/', (0, middleware_1.validate)(campaignValidators_1.validateCampaignQuery), (0, middleware_1.asyncHandler)(campaignController_1.getAllCampaigns));
/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', (0, middleware_1.validate)(campaignValidators_1.validateCreateCampaign), (0, middleware_1.asyncHandler)(campaignController_1.createCampaign));
/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (0, middleware_1.asyncHandler)(campaignController_1.getCampaignById));
/**
 * PUT /api/campaigns/:id
 * Update campaign
 */
router.put('/:id', (0, middleware_1.validate)(campaignValidators_1.validateUpdateCampaign), (0, middleware_1.asyncHandler)(campaignController_1.updateCampaign));
/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (0, middleware_1.asyncHandler)(campaignController_1.deleteCampaign));
// ==========================================
// CAMPAIGN SETTINGS
// ==========================================
/**
 * GET /api/campaigns/:id/settings
 * Get campaign settings
 */
router.get('/:id/settings', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (0, middleware_1.asyncHandler)(campaignSettingsController_1.getCampaignSettings));
/**
 * PUT /api/campaigns/:id/settings
 * Update campaign settings
 */
router.put('/:id/settings', (0, middleware_1.validate)(campaignValidators_1.validateCampaignSettings), (0, middleware_1.asyncHandler)(campaignSettingsController_1.updateCampaignSettings));
/**
 * POST /api/campaigns/:id/settings/reset
 * Reset campaign settings to defaults
 */
router.post('/:id/settings/reset', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (0, middleware_1.asyncHandler)(campaignSettingsController_1.resetCampaignSettings));
/**
 * GET /api/campaigns/:id/schedule
 * Get campaign schedule
 */
router.get('/:id/schedule', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (0, middleware_1.asyncHandler)(campaignSettingsController_1.getCampaignSchedule));
/**
 * PUT /api/campaigns/:id/schedule
 * Update campaign schedule
 */
router.put('/:id/schedule', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (0, middleware_1.asyncHandler)(campaignSettingsController_1.updateCampaignSchedule));
// ==========================================
// CAMPAIGN ANALYTICS
// ==========================================
/**
 * GET /api/campaigns/:id/analytics
 * Get campaign analytics overview
 */
router.get('/:id/analytics', (0, middleware_1.validate)(campaignValidators_1.validateAnalyticsQuery), (0, middleware_1.asyncHandler)(campaignAnalyticsController_1.getCampaignAnalytics));
/**
 * GET /api/campaigns/:id/metrics
 * Get campaign performance metrics over time
 */
router.get('/:id/metrics', (0, middleware_1.validate)(campaignValidators_1.validateAnalyticsQuery), (0, middleware_1.asyncHandler)(campaignAnalyticsController_1.getCampaignMetrics));
/**
 * GET /api/campaigns/:id/export
 * Export campaign data
 */
router.get('/:id/export', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (0, middleware_1.asyncHandler)(campaignAnalyticsController_1.exportCampaignData));
// ==========================================
// CAMPAIGN OPERATIONS
// ==========================================
/**
 * POST /api/campaigns/:id/start
 * Start campaign execution
 */
router.post('/:id/start', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Campaign start endpoint' }, 'Campaign started');
});
/**
 * POST /api/campaigns/:id/pause
 * Pause campaign execution
 */
router.post('/:id/pause', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Campaign pause endpoint' }, 'Campaign paused');
});
/**
 * POST /api/campaigns/:id/resume
 * Resume campaign execution
 */
router.post('/:id/resume', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Campaign resume endpoint' }, 'Campaign resumed');
});
/**
 * POST /api/campaigns/:id/cancel
 * Cancel campaign execution
 */
router.post('/:id/cancel', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Campaign cancel endpoint' }, 'Campaign cancelled');
});
/**
 * POST /api/campaigns/:id/duplicate
 * Duplicate campaign
 */
router.post('/:id/duplicate', (0, middleware_1.validate)(campaignValidators_1.validateCampaignId), (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Campaign duplicate endpoint' }, 'Campaign duplicated');
});
exports.default = router;
