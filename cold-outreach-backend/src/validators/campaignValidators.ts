import { body, param, query } from 'express-validator';

/**
 * Validation for creating a new campaign
 */
export const validateCreateCampaign = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Campaign name must be between 1 and 255 characters'),

  body('emailSubject')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Email subject must not exceed 500 characters'),

  body('prompt')
    .optional()
    .isString()
    .withMessage('Prompt must be a valid string'),

  body('enrichmentFlags')
    .optional()
    .custom(value => {
      // Allow null, arrays, or objects
      if (value === null || value === undefined) {
        return true;
      }
      if (Array.isArray(value)) {
        // Validate array contains only strings
        return value.every(item => typeof item === 'string');
      }
      if (typeof value === 'object') {
        // Validate object contains only boolean values
        return Object.values(value).every(val => typeof val === 'boolean');
      }
      return false;
    })
    .withMessage(
      'Enrichment flags must be null, an array of strings, or an object with boolean values'
    ),

  body('serviceId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Service ID must be a positive integer'),
];

/**
 * Validation for updating a campaign
 */
export const validateUpdateCampaign = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Campaign name must be between 1 and 255 characters'),

  body('emailSubject')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Email subject must not exceed 500 characters'),

  body('prompt')
    .optional()
    .isString()
    .withMessage('Prompt must be a valid string'),

  body('enrichmentFlags')
    .optional()
    .custom(value => {
      // Allow null, arrays, or objects
      if (value === null || value === undefined) {
        return true;
      }
      if (Array.isArray(value)) {
        // Validate array contains only strings
        return value.every(item => typeof item === 'string');
      }
      if (typeof value === 'object') {
        // Validate object contains only boolean values
        return Object.values(value).every(val => typeof val === 'boolean');
      }
      return false;
    })
    .withMessage(
      'Enrichment flags must be null, an array of strings, or an object with boolean values'
    ),

  body('serviceId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Service ID must be a positive integer'),
];

/**
 * Validation for campaign ID parameter
 */
export const validateCampaignId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),
];

/**
 * Validation for campaign queries (list, search, filter)
 */
export const validateCampaignQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search term must not exceed 255 characters'),

  query('status')
    .optional()
    .isIn(['active', 'paused', 'completed', 'archived'])
    .withMessage('Status must be one of: active, paused, completed, archived'),

  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt', 'totalProspects'])
    .withMessage(
      'Sort field must be one of: name, createdAt, updatedAt, totalProspects'
    ),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

/**
 * Validation for campaign template operations
 */
export const validateCampaignTemplate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Template name must be between 1 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Template description must not exceed 1000 characters'),

  body('emailSubject')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Email subject must be between 1 and 500 characters'),

  body('prompt')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Prompt must be at least 10 characters long'),

  body('enrichmentFlags')
    .custom(value => {
      // Allow null, arrays, or objects
      if (value === null || value === undefined) {
        return true;
      }
      if (Array.isArray(value)) {
        // Validate array contains only strings
        return value.every(item => typeof item === 'string');
      }
      if (typeof value === 'object') {
        // Validate object contains only boolean values
        return Object.values(value).every(val => typeof val === 'boolean');
      }
      return false;
    })
    .withMessage(
      'Enrichment flags must be null, an array of strings, or an object with boolean values'
    ),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value'),
];

/**
 * Validation for campaign settings
 */
export const validateCampaignSettings = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),

  body('settings').isObject().withMessage('Settings must be a valid object'),

  body('settings.batchSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Batch size must be between 1 and 1000'),

  body('settings.delayBetweenEmails')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Delay between emails must be a non-negative integer'),

  body('settings.maxRetriesOnFailure')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Max retries must be between 0 and 10'),

  body('settings.enableAnalytics')
    .optional()
    .isBoolean()
    .withMessage('Enable analytics must be a boolean'),

  body('settings.autoArchiveAfterDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Auto archive days must be a positive integer'),
];

/**
 * Validation for analytics query parameters
 */
export const validateAnalyticsQuery = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO8601 date'),

  query('granularity')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Granularity must be one of: day, week, month'),

  query('metrics')
    .optional()
    .custom(value => {
      const validMetrics = [
        'prospects',
        'enriched',
        'generated',
        'failed',
        'successRate',
        'enrichmentRate',
        'generationRate',
      ];
      const metrics = Array.isArray(value) ? value : [value];
      const isValid = metrics.every(metric => validMetrics.includes(metric));
      if (!isValid) {
        throw new Error(
          `Invalid metrics. Must be one of: ${validMetrics.join(', ')}`
        );
      }
      return true;
    }),
];

/**
 * Validation for bulk operations
 */
export const validateBulkOperation = [
  body('campaignIds')
    .isArray({ min: 1 })
    .withMessage('Campaign IDs must be a non-empty array'),

  body('campaignIds.*')
    .isInt({ min: 1 })
    .withMessage('Each campaign ID must be a positive integer'),

  body('operation')
    .isIn(['archive', 'delete', 'pause', 'resume'])
    .withMessage('Operation must be one of: archive, delete, pause, resume'),
];
