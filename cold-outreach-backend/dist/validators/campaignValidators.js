"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBulkOperation = exports.validateAnalyticsQuery = exports.validateCampaignSettings = exports.validateCampaignTemplate = exports.validateCampaignQuery = exports.validateCampaignId = exports.validateUpdateCampaign = exports.validateCreateCampaign = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validation for creating a new campaign
 */
exports.validateCreateCampaign = [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Campaign name must be between 1 and 255 characters'),
    (0, express_validator_1.body)('emailSubject')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Email subject must not exceed 500 characters'),
    (0, express_validator_1.body)('prompt')
        .optional()
        .isString()
        .withMessage('Prompt must be a valid string'),
    (0, express_validator_1.body)('enrichmentFlags')
        .optional()
        .custom((value) => {
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
        .withMessage('Enrichment flags must be null, an array of strings, or an object with boolean values'),
    (0, express_validator_1.body)('serviceId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Service ID must be a positive integer')
];
/**
 * Validation for updating a campaign
 */
exports.validateUpdateCampaign = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Campaign ID must be a positive integer'),
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Campaign name must be between 1 and 255 characters'),
    (0, express_validator_1.body)('emailSubject')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Email subject must not exceed 500 characters'),
    (0, express_validator_1.body)('prompt')
        .optional()
        .isString()
        .withMessage('Prompt must be a valid string'),
    (0, express_validator_1.body)('enrichmentFlags')
        .optional()
        .custom((value) => {
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
        .withMessage('Enrichment flags must be null, an array of strings, or an object with boolean values'),
    (0, express_validator_1.body)('serviceId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Service ID must be a positive integer')
];
/**
 * Validation for campaign ID parameter
 */
exports.validateCampaignId = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Campaign ID must be a positive integer')
];
/**
 * Validation for campaign queries (list, search, filter)
 */
exports.validateCampaignQuery = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('search')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Search term must not exceed 255 characters'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['active', 'paused', 'completed', 'archived'])
        .withMessage('Status must be one of: active, paused, completed, archived'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['name', 'createdAt', 'updatedAt', 'totalProspects'])
        .withMessage('Sort field must be one of: name, createdAt, updatedAt, totalProspects'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
];
/**
 * Validation for campaign template operations
 */
exports.validateCampaignTemplate = [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Template name must be between 1 and 255 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Template description must not exceed 1000 characters'),
    (0, express_validator_1.body)('emailSubject')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Email subject must be between 1 and 500 characters'),
    (0, express_validator_1.body)('prompt')
        .trim()
        .isLength({ min: 10 })
        .withMessage('Prompt must be at least 10 characters long'),
    (0, express_validator_1.body)('enrichmentFlags')
        .custom((value) => {
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
        .withMessage('Enrichment flags must be null, an array of strings, or an object with boolean values'),
    (0, express_validator_1.body)('category')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Category must not exceed 100 characters'),
    (0, express_validator_1.body)('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean value')
];
/**
 * Validation for campaign settings
 */
exports.validateCampaignSettings = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Campaign ID must be a positive integer'),
    (0, express_validator_1.body)('settings')
        .isObject()
        .withMessage('Settings must be a valid object'),
    (0, express_validator_1.body)('settings.batchSize')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Batch size must be between 1 and 1000'),
    (0, express_validator_1.body)('settings.delayBetweenEmails')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Delay between emails must be a non-negative integer'),
    (0, express_validator_1.body)('settings.maxRetriesOnFailure')
        .optional()
        .isInt({ min: 0, max: 10 })
        .withMessage('Max retries must be between 0 and 10'),
    (0, express_validator_1.body)('settings.enableAnalytics')
        .optional()
        .isBoolean()
        .withMessage('Enable analytics must be a boolean'),
    (0, express_validator_1.body)('settings.autoArchiveAfterDays')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Auto archive days must be a positive integer')
];
/**
 * Validation for analytics query parameters
 */
exports.validateAnalyticsQuery = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Campaign ID must be a positive integer'),
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO8601 date'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO8601 date'),
    (0, express_validator_1.query)('granularity')
        .optional()
        .isIn(['day', 'week', 'month'])
        .withMessage('Granularity must be one of: day, week, month'),
    (0, express_validator_1.query)('metrics')
        .optional()
        .custom((value) => {
        const validMetrics = [
            'prospects', 'enriched', 'generated', 'failed',
            'successRate', 'enrichmentRate', 'generationRate'
        ];
        const metrics = Array.isArray(value) ? value : [value];
        const isValid = metrics.every(metric => validMetrics.includes(metric));
        if (!isValid) {
            throw new Error(`Invalid metrics. Must be one of: ${validMetrics.join(', ')}`);
        }
        return true;
    })
];
/**
 * Validation for bulk operations
 */
exports.validateBulkOperation = [
    (0, express_validator_1.body)('campaignIds')
        .isArray({ min: 1 })
        .withMessage('Campaign IDs must be a non-empty array'),
    (0, express_validator_1.body)('campaignIds.*')
        .isInt({ min: 1 })
        .withMessage('Each campaign ID must be a positive integer'),
    (0, express_validator_1.body)('operation')
        .isIn(['archive', 'delete', 'pause', 'resume'])
        .withMessage('Operation must be one of: archive, delete, pause, resume')
];
