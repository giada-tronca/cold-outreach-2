import { Router, Request, Response } from 'express'
import { ApiResponseBuilder } from '@/utils/apiResponse'
import { validate, asyncHandler } from '@/middleware'
import {
    validateCreateCampaign,
    validateUpdateCampaign,
    validateCampaignId,
    validateCampaignQuery,
    validateCampaignTemplate,
    validateCampaignSettings,
    validateAnalyticsQuery,
    validateBulkOperation
} from '@/validators/campaignValidators'

// Import controllers
import {
    getAllCampaigns,
    getCampaignById,
    createCampaign,
    updateCampaign,
    deleteCampaign
} from '@/controllers/campaignController'

import {
    getAllTemplates,
    createTemplate
} from '@/controllers/campaignTemplateController'

import {
    getCampaignAnalytics,
    getCampaignMetrics,
    compareCampaigns,
    exportCampaignData
} from '@/controllers/campaignAnalyticsController'

import {
    getCampaignSettings,
    updateCampaignSettings,
    resetCampaignSettings,
    getCampaignSchedule,
    updateCampaignSchedule
} from '@/controllers/campaignSettingsController'

const router = Router()

// ==========================================
// SPECIFIC ROUTES (MUST COME BEFORE /:id)
// ==========================================

/**
 * GET /api/campaigns/templates
 * Get all campaign templates
 */
router.get('/templates', asyncHandler(getAllTemplates))

/**
 * POST /api/campaigns/templates
 * Create new campaign template
 */
router.post('/templates',
    validate(validateCampaignTemplate),
    asyncHandler(createTemplate)
)

/**
 * POST /api/campaigns/templates/:id/use
 * Create campaign from template
 */
router.post('/templates/:id/use', (_req: Request, res: Response) => {
    ApiResponseBuilder.success(res, { message: 'Create from template endpoint' }, 'Template usage endpoint')
})

/**
 * GET /api/campaigns/compare
 * Compare multiple campaigns
 */
router.get('/compare', asyncHandler(compareCampaigns))

/**
 * POST /api/campaigns/bulk
 * Bulk operations on campaigns
 */
router.post('/bulk',
    validate(validateBulkOperation),
    (_req: Request, res: Response) => {
        ApiResponseBuilder.success(res, { message: 'Bulk operations endpoint' }, 'Bulk operation completed')
    }
)

// ==========================================
// CAMPAIGN CRUD OPERATIONS
// ==========================================

/**
 * GET /api/campaigns
 * Get all campaigns with search, filtering, and pagination
 */
router.get('/',
    validate(validateCampaignQuery),
    asyncHandler(getAllCampaigns)
)

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/',
    validate(validateCreateCampaign),
    asyncHandler(createCampaign)
)

/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id',
    validate(validateCampaignId),
    asyncHandler(getCampaignById)
)

/**
 * PUT /api/campaigns/:id
 * Update campaign
 */
router.put('/:id',
    validate(validateUpdateCampaign),
    asyncHandler(updateCampaign)
)

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id',
    validate(validateCampaignId),
    asyncHandler(deleteCampaign)
)

// ==========================================
// CAMPAIGN SETTINGS
// ==========================================

/**
 * GET /api/campaigns/:id/settings
 * Get campaign settings
 */
router.get('/:id/settings',
    validate(validateCampaignId),
    asyncHandler(getCampaignSettings)
)

/**
 * PUT /api/campaigns/:id/settings
 * Update campaign settings
 */
router.put('/:id/settings',
    validate(validateCampaignSettings),
    asyncHandler(updateCampaignSettings)
)

/**
 * POST /api/campaigns/:id/settings/reset
 * Reset campaign settings to defaults
 */
router.post('/:id/settings/reset',
    validate(validateCampaignId),
    asyncHandler(resetCampaignSettings)
)

/**
 * GET /api/campaigns/:id/schedule
 * Get campaign schedule
 */
router.get('/:id/schedule',
    validate(validateCampaignId),
    asyncHandler(getCampaignSchedule)
)

/**
 * PUT /api/campaigns/:id/schedule
 * Update campaign schedule
 */
router.put('/:id/schedule',
    validate(validateCampaignId),
    asyncHandler(updateCampaignSchedule)
)

// ==========================================
// CAMPAIGN ANALYTICS
// ==========================================

/**
 * GET /api/campaigns/:id/analytics
 * Get campaign analytics overview
 */
router.get('/:id/analytics',
    validate(validateAnalyticsQuery),
    asyncHandler(getCampaignAnalytics)
)

/**
 * GET /api/campaigns/:id/metrics
 * Get campaign performance metrics over time
 */
router.get('/:id/metrics',
    validate(validateAnalyticsQuery),
    asyncHandler(getCampaignMetrics)
)

/**
 * GET /api/campaigns/:id/export
 * Export campaign data
 */
router.get('/:id/export',
    validate(validateCampaignId),
    asyncHandler(exportCampaignData)
)

// ==========================================
// CAMPAIGN OPERATIONS
// ==========================================

/**
 * POST /api/campaigns/:id/start
 * Start campaign execution
 */
router.post('/:id/start',
    validate(validateCampaignId),
    (_req: Request, res: Response) => {
        ApiResponseBuilder.success(res, { message: 'Campaign start endpoint' }, 'Campaign started')
    }
)

/**
 * POST /api/campaigns/:id/pause
 * Pause campaign execution
 */
router.post('/:id/pause',
    validate(validateCampaignId),
    (_req: Request, res: Response) => {
        ApiResponseBuilder.success(res, { message: 'Campaign pause endpoint' }, 'Campaign paused')
    }
)

/**
 * POST /api/campaigns/:id/resume
 * Resume campaign execution
 */
router.post('/:id/resume',
    validate(validateCampaignId),
    (_req: Request, res: Response) => {
        ApiResponseBuilder.success(res, { message: 'Campaign resume endpoint' }, 'Campaign resumed')
    }
)

/**
 * POST /api/campaigns/:id/cancel
 * Cancel campaign execution
 */
router.post('/:id/cancel',
    validate(validateCampaignId),
    (_req: Request, res: Response) => {
        ApiResponseBuilder.success(res, { message: 'Campaign cancel endpoint' }, 'Campaign cancelled')
    }
)

/**
 * POST /api/campaigns/:id/duplicate
 * Duplicate campaign
 */
router.post('/:id/duplicate',
    validate(validateCampaignId),
    (_req: Request, res: Response) => {
        ApiResponseBuilder.success(res, { message: 'Campaign duplicate endpoint' }, 'Campaign duplicated')
    }
)

export default router 