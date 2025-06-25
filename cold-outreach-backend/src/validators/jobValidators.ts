import { body, param, query } from 'express-validator';

/**
 * Job ID validation
 */
export function validateJobId(jobId: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!jobId) {
    errors.push('Job ID is required');
  } else if (typeof jobId !== 'string') {
    errors.push('Job ID must be a string');
  } else if (jobId.trim().length === 0) {
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
export function validateUserId(userId: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!userId) {
    errors.push('User ID is required');
  } else if (typeof userId !== 'string') {
    errors.push('User ID must be a string');
  } else if (userId.trim().length === 0) {
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
export const validateJobIdParam = [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
    .isString()
    .withMessage('Job ID must be a string')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Job ID cannot be empty'),
];

// Validate user ID parameter
export const validateUserIdParam = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
    .trim()
    .isLength({ min: 1 })
    .withMessage('User ID cannot be empty'),
];

// Validate batch ID parameter
export const validateBatchIdParam = [
  param('batchId')
    .notEmpty()
    .withMessage('Batch ID is required')
    .isString()
    .withMessage('Batch ID must be a string')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Batch ID cannot be empty'),
];

// Validate queue name parameter
export const validateQueueNameParam = [
  param('queueName')
    .notEmpty()
    .withMessage('Queue name is required')
    .isString()
    .withMessage('Queue name must be a string')
    .trim()
    .isIn([
      'prospect-enrichment',
      'email-generation',
      'batch-enrichment',
      'batch-email-generation',
      'csv-import',
      'data-export',
    ])
    .withMessage('Invalid queue name'),
];

// Validate user jobs query parameters
export const validateUserJobsQuery = [
  query('states')
    .optional()
    .isString()
    .withMessage('States must be a string')
    .custom(value => {
      const validStates = [
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused',
      ];
      const states = value.split(',');
      const invalidStates = states.filter(
        (state: string) => !validStates.includes(state.trim())
      );
      if (invalidStates.length > 0) {
        throw new Error(`Invalid states: ${invalidStates.join(', ')}`);
      }
      return true;
    }),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),

  query('queueName')
    .optional()
    .isString()
    .withMessage('Queue name must be a string')
    .isIn([
      'prospect-enrichment',
      'email-generation',
      'batch-enrichment',
      'batch-email-generation',
      'csv-import',
      'data-export',
    ])
    .withMessage('Invalid queue name'),
];

// Validate job action body
export const validateJobActionBody = [
  body('queueName')
    .optional()
    .isString()
    .withMessage('Queue name must be a string')
    .isIn([
      'prospect-enrichment',
      'email-generation',
      'batch-enrichment',
      'batch-email-generation',
      'csv-import',
      'data-export',
    ])
    .withMessage('Invalid queue name'),
];

// Validate prospect enrichment job data
export const validateProspectEnrichmentJob = [
  body('prospectId')
    .notEmpty()
    .withMessage('Prospect ID is required')
    .isString()
    .withMessage('Prospect ID must be a string'),

  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string'),

  body('workflowSessionId')
    .optional()
    .isString()
    .withMessage('Workflow session ID must be a string'),

  body('enrichmentOptions')
    .notEmpty()
    .withMessage('Enrichment options are required')
    .isObject()
    .withMessage('Enrichment options must be an object'),

  body('enrichmentOptions.includeCompanyInfo')
    .isBoolean()
    .withMessage('Include company info must be a boolean'),

  body('enrichmentOptions.includePersonalInfo')
    .isBoolean()
    .withMessage('Include personal info must be a boolean'),

  body('enrichmentOptions.includeContactDetails')
    .isBoolean()
    .withMessage('Include contact details must be a boolean'),

  body('enrichmentOptions.includeSocialProfiles')
    .isBoolean()
    .withMessage('Include social profiles must be a boolean'),
];

// Validate email generation job data
export const validateEmailGenerationJob = [
  body('prospectId')
    .notEmpty()
    .withMessage('Prospect ID is required')
    .isString()
    .withMessage('Prospect ID must be a string'),

  body('campaignId')
    .notEmpty()
    .withMessage('Campaign ID is required')
    .isString()
    .withMessage('Campaign ID must be a string'),

  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string'),

  body('templateId')
    .optional()
    .isString()
    .withMessage('Template ID must be a string'),

  body('customPrompt')
    .optional()
    .isString()
    .withMessage('Custom prompt must be a string')
    .isLength({ max: 1000 })
    .withMessage('Custom prompt must be less than 1000 characters'),

  body('workflowSessionId')
    .optional()
    .isString()
    .withMessage('Workflow session ID must be a string'),
];

// Validate batch enrichment job data
export const validateBatchEnrichmentJob = [
  body('prospectIds')
    .notEmpty()
    .withMessage('Prospect IDs are required')
    .isArray()
    .withMessage('Prospect IDs must be an array')
    .custom(value => {
      if (value.length === 0) {
        throw new Error('At least one prospect ID is required');
      }
      if (value.length > 1000) {
        throw new Error('Maximum 1000 prospects allowed per batch');
      }
      return true;
    }),

  body('prospectIds.*')
    .isString()
    .withMessage('Each prospect ID must be a string'),

  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string'),

  body('batchId')
    .notEmpty()
    .withMessage('Batch ID is required')
    .isString()
    .withMessage('Batch ID must be a string'),

  body('workflowSessionId')
    .optional()
    .isString()
    .withMessage('Workflow session ID must be a string'),

  body('enrichmentOptions')
    .notEmpty()
    .withMessage('Enrichment options are required')
    .isObject()
    .withMessage('Enrichment options must be an object'),
];

// Validate batch email generation job data
export const validateBatchEmailGenerationJob = [
  body('prospectIds')
    .notEmpty()
    .withMessage('Prospect IDs are required')
    .isArray()
    .withMessage('Prospect IDs must be an array')
    .custom(value => {
      if (value.length === 0) {
        throw new Error('At least one prospect ID is required');
      }
      if (value.length > 1000) {
        throw new Error('Maximum 1000 prospects allowed per batch');
      }
      return true;
    }),

  body('campaignId')
    .notEmpty()
    .withMessage('Campaign ID is required')
    .isString()
    .withMessage('Campaign ID must be a string'),

  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string'),

  body('batchId')
    .notEmpty()
    .withMessage('Batch ID is required')
    .isString()
    .withMessage('Batch ID must be a string'),
];
