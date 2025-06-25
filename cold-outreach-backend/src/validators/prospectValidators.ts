import { body, param, query } from 'express-validator';

/**
 * Validation for creating a new prospect
 */
export const validateCreateProspect = [
  body('campaignId')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name must not exceed 255 characters'),

  body('position')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Position must not exceed 255 characters'),

  body('linkedinUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('LinkedIn URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('LinkedIn URL must not exceed 500 characters'),
];

/**
 * Validation for updating a prospect
 */
export const validateUpdateProspect = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Prospect ID must be a positive integer'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company name must not exceed 255 characters'),

  body('position')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Position must not exceed 255 characters'),

  body('linkedinUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('LinkedIn URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('LinkedIn URL must not exceed 500 characters'),

  body('status')
    .optional()
    .isIn([
      'PENDING',
      'ENRICHING',
      'ENRICHED',
      'GENERATING',
      'COMPLETED',
      'FAILED',
    ])
    .withMessage(
      'Status must be one of: PENDING, ENRICHING, ENRICHED, GENERATING, COMPLETED, FAILED'
    ),

  body('additionalData')
    .optional()
    .isObject()
    .withMessage('Additional data must be a valid object'),
];

/**
 * Validation for prospect ID parameter
 */
export const validateProspectId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Prospect ID must be a positive integer'),
];

/**
 * Validation for prospect queries (list, search, filter)
 */
export const validateProspectQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Search term must not exceed 255 characters'),

  query('campaignId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),

  query('batchId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Batch ID must be a positive integer'),

  query('status')
    .optional()
    .isIn([
      'PENDING',
      'ENRICHING',
      'ENRICHED',
      'GENERATING',
      'COMPLETED',
      'FAILED',
    ])
    .withMessage(
      'Status must be one of: PENDING, ENRICHING, ENRICHED, GENERATING, COMPLETED, FAILED'
    ),

  query('company')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company filter must not exceed 255 characters'),

  query('hasEnrichment')
    .optional()
    .isBoolean()
    .withMessage('hasEnrichment must be a boolean value'),

  query('hasGeneratedEmail')
    .optional()
    .isBoolean()
    .withMessage('hasGeneratedEmail must be a boolean value'),

  query('sortBy')
    .optional()
    .isIn([
      'name',
      'email',
      'company',
      'position',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .withMessage(
      'Sort field must be one of: name, email, company, position, status, createdAt, updatedAt'
    ),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO8601 date'),
];

/**
 * Validation for bulk prospect operations
 */
export const validateBulkProspectOperation = [
  body('prospectIds')
    .isArray({ min: 1 })
    .withMessage('Prospect IDs must be a non-empty array'),

  body('prospectIds.*')
    .isInt({ min: 1 })
    .withMessage('Each prospect ID must be a positive integer'),

  body('operation')
    .isIn([
      'delete',
      'updateStatus',
      'assignToBatch',
      'startEnrichment',
      'generateEmails',
      'export',
    ])
    .withMessage(
      'Operation must be one of: delete, updateStatus, assignToBatch, startEnrichment, generateEmails, export'
    ),

  body('data')
    .optional()
    .isObject()
    .withMessage('Operation data must be a valid object'),

  body('data.status')
    .if(body('operation').equals('updateStatus'))
    .isIn([
      'PENDING',
      'ENRICHING',
      'ENRICHED',
      'GENERATING',
      'COMPLETED',
      'FAILED',
    ])
    .withMessage('Status must be valid when operation is updateStatus'),

  body('data.batchId')
    .if(body('operation').equals('assignToBatch'))
    .isInt({ min: 1 })
    .withMessage('Batch ID must be provided when operation is assignToBatch'),
];

/**
 * Validation for CSV import
 */
export const validateCSVImport = [
  body('campaignId')
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),

  body('batchName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Batch name must be between 1 and 255 characters'),

  body('mapping')
    .isObject()
    .withMessage('Column mapping must be a valid object'),

  body('mapping.email')
    .isString()
    .withMessage('Email column mapping is required'),

  body('mapping.name')
    .optional()
    .isString()
    .withMessage('Name column mapping must be a string'),

  body('mapping.company')
    .optional()
    .isString()
    .withMessage('Company column mapping must be a string'),

  body('mapping.position')
    .optional()
    .isString()
    .withMessage('Position column mapping must be a string'),

  body('mapping.linkedinUrl')
    .optional()
    .isString()
    .withMessage('LinkedIn URL column mapping must be a string'),

  body('skipDuplicates')
    .optional()
    .isBoolean()
    .withMessage('Skip duplicates must be a boolean value'),

  body('validateEmails')
    .optional()
    .isBoolean()
    .withMessage('Validate emails must be a boolean value'),
];

/**
 * Validation for enrichment operations
 */
export const validateEnrichmentOperation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Prospect ID must be a positive integer'),

  body('services')
    .optional()
    .isArray()
    .withMessage('Services must be an array'),

  body('services.*')
    .optional()
    .isIn(['linkedin', 'company', 'techStack', 'analysis'])
    .withMessage(
      'Each service must be one of: linkedin, company, techStack, analysis'
    ),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high'])
    .withMessage('Priority must be one of: low, normal, high'),

  body('forceRefresh')
    .optional()
    .isBoolean()
    .withMessage('Force refresh must be a boolean value'),
];

/**
 * Validation for prospect export
 */
export const validateProspectExport = [
  query('campaignId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),

  query('batchId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Batch ID must be a positive integer'),

  query('status')
    .optional()
    .isIn([
      'PENDING',
      'ENRICHING',
      'ENRICHED',
      'GENERATING',
      'COMPLETED',
      'FAILED',
    ])
    .withMessage('Status filter must be valid'),

  query('format')
    .optional()
    .isIn(['csv', 'json', 'xlsx'])
    .withMessage('Export format must be one of: csv, json, xlsx'),

  query('includeEnrichment')
    .optional()
    .isBoolean()
    .withMessage('Include enrichment must be a boolean value'),

  query('includeEmails')
    .optional()
    .isBoolean()
    .withMessage('Include emails must be a boolean value'),

  query('columns')
    .optional()
    .custom(value => {
      const validColumns = [
        'name',
        'email',
        'company',
        'position',
        'linkedinUrl',
        'status',
        'companyWebsite',
        'companySummary',
        'techStack',
        'marketPosition',
        'emailSubject',
        'emailBody',
        'createdAt',
        'updatedAt',
      ];
      const columns = Array.isArray(value) ? value : [value];
      const isValid = columns.every(col => validColumns.includes(col));
      if (!isValid) {
        throw new Error(
          `Invalid columns. Must be one of: ${validColumns.join(', ')}`
        );
      }
      return true;
    }),
];

/**
 * Validation for prospect analytics
 */
export const validateProspectAnalytics = [
  query('campaignId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Campaign ID must be a positive integer'),

  query('batchId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Batch ID must be a positive integer'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO8601 date'),

  query('groupBy')
    .optional()
    .isIn(['status', 'company', 'batch', 'date'])
    .withMessage('Group by must be one of: status, company, batch, date'),

  query('metrics')
    .optional()
    .custom(value => {
      const validMetrics = [
        'total',
        'enriched',
        'generated',
        'failed',
        'successRate',
        'enrichmentRate',
        'conversionRate',
        'avgProcessingTime',
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
 * Validation for creating prospect enrichment
 */
export const createEnrichmentSchema = {
  prospectId: {
    isInt: {
      options: { min: 1 },
      errorMessage: 'Prospect ID must be a positive integer',
    },
  },
  enrichmentStatus: {
    optional: true,
    isIn: {
      options: [['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']],
      errorMessage:
        'Enrichment status must be one of: PENDING, PROCESSING, COMPLETED, FAILED',
    },
  },
  companyWebsite: {
    optional: true,
    isURL: {
      errorMessage: 'Company website must be a valid URL',
    },
  },
  companySummary: {
    optional: true,
    isLength: {
      options: { max: 10000 },
      errorMessage: 'Company summary must not exceed 10000 characters',
    },
  },
  linkedinSummary: {
    optional: true,
    isLength: {
      options: { max: 10000 },
      errorMessage: 'LinkedIn summary must not exceed 10000 characters',
    },
  },
  prospectAnalysisSummary: {
    optional: true,
    isLength: {
      options: { max: 10000 },
      errorMessage:
        'Prospect analysis summary must not exceed 10000 characters',
    },
  },
};

/**
 * Validation for updating prospect enrichment
 */
export const updateEnrichmentSchema = {
  enrichmentStatus: {
    optional: true,
    isIn: {
      options: [['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']],
      errorMessage:
        'Enrichment status must be one of: PENDING, PROCESSING, COMPLETED, FAILED',
    },
  },
  companyWebsite: {
    optional: true,
    isURL: {
      errorMessage: 'Company website must be a valid URL',
    },
  },
  companySummary: {
    optional: true,
    isLength: {
      options: { max: 10000 },
      errorMessage: 'Company summary must not exceed 10000 characters',
    },
  },
  linkedinSummary: {
    optional: true,
    isLength: {
      options: { max: 10000 },
      errorMessage: 'LinkedIn summary must not exceed 10000 characters',
    },
  },
  prospectAnalysisSummary: {
    optional: true,
    isLength: {
      options: { max: 10000 },
      errorMessage:
        'Prospect analysis summary must not exceed 10000 characters',
    },
  },
};

/**
 * Validation for creating prospect analysis
 */
export const createAnalysisSchema = {
  prospectId: {
    isInt: {
      options: { min: 1 },
      errorMessage: 'Prospect ID must be a positive integer',
    },
  },
  marketPosition: {
    optional: true,
    isLength: {
      options: { max: 5000 },
      errorMessage: 'Market position must not exceed 5000 characters',
    },
  },
  suggestedApproach: {
    optional: true,
    isLength: {
      options: { max: 5000 },
      errorMessage: 'Suggested approach must not exceed 5000 characters',
    },
  },
  executiveSummary: {
    optional: true,
    isLength: {
      options: { max: 10000 },
      errorMessage: 'Executive summary must not exceed 10000 characters',
    },
  },
  confidenceScore: {
    optional: true,
    isFloat: {
      options: { min: 0, max: 1 },
      errorMessage: 'Confidence score must be a number between 0 and 1',
    },
  },
};

/**
 * Validation for updating prospect analysis
 */
export const updateAnalysisSchema = {
  marketPosition: {
    optional: true,
    isLength: {
      options: { max: 5000 },
      errorMessage: 'Market position must not exceed 5000 characters',
    },
  },
  suggestedApproach: {
    optional: true,
    isLength: {
      options: { max: 5000 },
      errorMessage: 'Suggested approach must not exceed 5000 characters',
    },
  },
  executiveSummary: {
    optional: true,
    isLength: {
      options: { max: 10000 },
      errorMessage: 'Executive summary must not exceed 10000 characters',
    },
  },
  confidenceScore: {
    optional: true,
    isFloat: {
      options: { min: 0, max: 1 },
      errorMessage: 'Confidence score must be a number between 0 and 1',
    },
  },
};

/**
 * Validation for upsert prospect analysis
 */
export const upsertAnalysisSchema = createAnalysisSchema;
