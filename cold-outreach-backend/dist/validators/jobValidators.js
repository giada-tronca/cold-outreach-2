"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBatchEmailGenerationJob = exports.validateBatchEnrichmentJob = exports.validateEmailGenerationJob = exports.validateProspectEnrichmentJob = exports.validateJobActionBody = exports.validateUserJobsQuery = exports.validateQueueNameParam = exports.validateBatchIdParam = exports.validateUserIdParam = exports.validateJobIdParam = void 0;
exports.validateJobId = validateJobId;
exports.validateUserId = validateUserId;
const express_validator_1 = require("express-validator");
/**
 * Job ID validation
 */
function validateJobId(jobId) {
    const errors = [];
    if (!jobId) {
        errors.push('Job ID is required');
    }
    else if (typeof jobId !== 'string') {
        errors.push('Job ID must be a string');
    }
    else if (jobId.trim().length === 0) {
        errors.push('Job ID cannot be empty');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * User ID validation
 */
function validateUserId(userId) {
    const errors = [];
    if (!userId) {
        errors.push('User ID is required');
    }
    else if (typeof userId !== 'string') {
        errors.push('User ID must be a string');
    }
    else if (userId.trim().length === 0) {
        errors.push('User ID cannot be empty');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * Express-validator middleware for job endpoints
 */
// Validate job ID parameter
exports.validateJobIdParam = [
    (0, express_validator_1.param)('jobId')
        .notEmpty()
        .withMessage('Job ID is required')
        .isString()
        .withMessage('Job ID must be a string')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Job ID cannot be empty'),
];
// Validate user ID parameter
exports.validateUserIdParam = [
    (0, express_validator_1.param)('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isString()
        .withMessage('User ID must be a string')
        .trim()
        .isLength({ min: 1 })
        .withMessage('User ID cannot be empty'),
];
// Validate batch ID parameter
exports.validateBatchIdParam = [
    (0, express_validator_1.param)('batchId')
        .notEmpty()
        .withMessage('Batch ID is required')
        .isString()
        .withMessage('Batch ID must be a string')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Batch ID cannot be empty'),
];
// Validate queue name parameter
exports.validateQueueNameParam = [
    (0, express_validator_1.param)('queueName')
        .notEmpty()
        .withMessage('Queue name is required')
        .isString()
        .withMessage('Queue name must be a string')
        .trim()
        .isIn(['prospect-enrichment', 'email-generation', 'batch-enrichment', 'batch-email-generation', 'csv-import', 'data-export'])
        .withMessage('Invalid queue name'),
];
// Validate user jobs query parameters
exports.validateUserJobsQuery = [
    (0, express_validator_1.query)('states')
        .optional()
        .isString()
        .withMessage('States must be a string')
        .custom((value) => {
        const validStates = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'];
        const states = value.split(',');
        const invalidStates = states.filter((state) => !validStates.includes(state.trim()));
        if (invalidStates.length > 0) {
            throw new Error(`Invalid states: ${invalidStates.join(', ')}`);
        }
        return true;
    }),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be an integer between 1 and 100'),
    (0, express_validator_1.query)('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
    (0, express_validator_1.query)('queueName')
        .optional()
        .isString()
        .withMessage('Queue name must be a string')
        .isIn(['prospect-enrichment', 'email-generation', 'batch-enrichment', 'batch-email-generation', 'csv-import', 'data-export'])
        .withMessage('Invalid queue name'),
];
// Validate job action body
exports.validateJobActionBody = [
    (0, express_validator_1.body)('queueName')
        .optional()
        .isString()
        .withMessage('Queue name must be a string')
        .isIn(['prospect-enrichment', 'email-generation', 'batch-enrichment', 'batch-email-generation', 'csv-import', 'data-export'])
        .withMessage('Invalid queue name'),
];
// Validate prospect enrichment job data
exports.validateProspectEnrichmentJob = [
    (0, express_validator_1.body)('prospectId')
        .notEmpty()
        .withMessage('Prospect ID is required')
        .isString()
        .withMessage('Prospect ID must be a string'),
    (0, express_validator_1.body)('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isString()
        .withMessage('User ID must be a string'),
    (0, express_validator_1.body)('workflowSessionId')
        .optional()
        .isString()
        .withMessage('Workflow session ID must be a string'),
    (0, express_validator_1.body)('enrichmentOptions')
        .notEmpty()
        .withMessage('Enrichment options are required')
        .isObject()
        .withMessage('Enrichment options must be an object'),
    (0, express_validator_1.body)('enrichmentOptions.includeCompanyInfo')
        .isBoolean()
        .withMessage('Include company info must be a boolean'),
    (0, express_validator_1.body)('enrichmentOptions.includePersonalInfo')
        .isBoolean()
        .withMessage('Include personal info must be a boolean'),
    (0, express_validator_1.body)('enrichmentOptions.includeContactDetails')
        .isBoolean()
        .withMessage('Include contact details must be a boolean'),
    (0, express_validator_1.body)('enrichmentOptions.includeSocialProfiles')
        .isBoolean()
        .withMessage('Include social profiles must be a boolean'),
];
// Validate email generation job data
exports.validateEmailGenerationJob = [
    (0, express_validator_1.body)('prospectId')
        .notEmpty()
        .withMessage('Prospect ID is required')
        .isString()
        .withMessage('Prospect ID must be a string'),
    (0, express_validator_1.body)('campaignId')
        .notEmpty()
        .withMessage('Campaign ID is required')
        .isString()
        .withMessage('Campaign ID must be a string'),
    (0, express_validator_1.body)('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isString()
        .withMessage('User ID must be a string'),
    (0, express_validator_1.body)('templateId')
        .optional()
        .isString()
        .withMessage('Template ID must be a string'),
    (0, express_validator_1.body)('customPrompt')
        .optional()
        .isString()
        .withMessage('Custom prompt must be a string')
        .isLength({ max: 1000 })
        .withMessage('Custom prompt must be less than 1000 characters'),
    (0, express_validator_1.body)('workflowSessionId')
        .optional()
        .isString()
        .withMessage('Workflow session ID must be a string'),
];
// Validate batch enrichment job data
exports.validateBatchEnrichmentJob = [
    (0, express_validator_1.body)('prospectIds')
        .notEmpty()
        .withMessage('Prospect IDs are required')
        .isArray()
        .withMessage('Prospect IDs must be an array')
        .custom((value) => {
        if (value.length === 0) {
            throw new Error('At least one prospect ID is required');
        }
        if (value.length > 1000) {
            throw new Error('Maximum 1000 prospects allowed per batch');
        }
        return true;
    }),
    (0, express_validator_1.body)('prospectIds.*')
        .isString()
        .withMessage('Each prospect ID must be a string'),
    (0, express_validator_1.body)('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isString()
        .withMessage('User ID must be a string'),
    (0, express_validator_1.body)('batchId')
        .notEmpty()
        .withMessage('Batch ID is required')
        .isString()
        .withMessage('Batch ID must be a string'),
    (0, express_validator_1.body)('workflowSessionId')
        .optional()
        .isString()
        .withMessage('Workflow session ID must be a string'),
    (0, express_validator_1.body)('enrichmentOptions')
        .notEmpty()
        .withMessage('Enrichment options are required')
        .isObject()
        .withMessage('Enrichment options must be an object'),
];
// Validate batch email generation job data
exports.validateBatchEmailGenerationJob = [
    (0, express_validator_1.body)('prospectIds')
        .notEmpty()
        .withMessage('Prospect IDs are required')
        .isArray()
        .withMessage('Prospect IDs must be an array')
        .custom((value) => {
        if (value.length === 0) {
            throw new Error('At least one prospect ID is required');
        }
        if (value.length > 1000) {
            throw new Error('Maximum 1000 prospects allowed per batch');
        }
        return true;
    }),
    (0, express_validator_1.body)('campaignId')
        .notEmpty()
        .withMessage('Campaign ID is required')
        .isString()
        .withMessage('Campaign ID must be a string'),
    (0, express_validator_1.body)('userId')
        .notEmpty()
        .withMessage('User ID is required')
        .isString()
        .withMessage('User ID must be a string'),
    (0, express_validator_1.body)('batchId')
        .notEmpty()
        .withMessage('Batch ID is required')
        .isString()
        .withMessage('Batch ID must be a string'),
];
