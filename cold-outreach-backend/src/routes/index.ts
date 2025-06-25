import { Router } from 'express';
import { ApiResponseBuilder } from '@/utils/apiResponse';
import { prisma } from '@/config/database';

// Import route modules
import authRoutes from './auth';
import campaignRoutes from './campaigns';
import prospectRoutes from './prospects';
import uploadRoutes from './uploads';
import workflowRoutes from './workflow';
import enrichmentRoutes from './enrichment';
import emailGenerationRoutes from './email-generation';
import serviceRoutes from './services';
import jobRoutes from './jobs';

const router = Router();

// Health check endpoint
router.get('/health', async (_req, res) => {
  try {
    // Simple database health check
    await prisma.$queryRaw`SELECT 1 as test`;
    const dbHealthy = true;

    // Get basic database stats
    const [campaigns, prospects] = await Promise.all([
      prisma.campaign.count().catch(() => 0),
      prisma.prospect.count().catch(() => 0),
    ]);

    ApiResponseBuilder.success(
      res,
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        database: {
          connected: dbHealthy,
          stats: { campaigns, prospects },
        },
      },
      'API is healthy'
    );
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        database: {
          connected: false,
          error:
            error instanceof Error ? error.message : 'Unknown database error',
        },
      },
    });
  }
});

// Database health check endpoint
router.get('/health/database', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1 as test`;

    // Get database stats
    const [campaigns, prospects, batches] = await Promise.all([
      prisma.campaign.count().catch(() => 0),
      prisma.prospect.count().catch(() => 0),
      prisma.batch.count().catch(() => 0),
    ]);

    ApiResponseBuilder.success(
      res,
      {
        status: 'connected',
        timestamp: new Date().toISOString(),
        stats: { campaigns, prospects, batches },
        database_url: process.env.DATABASE_URL ? 'configured' : 'missing',
      },
      'Database is healthy'
    );
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      data: {
        status: 'disconnected',
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : 'Unknown database error',
        database_url: process.env.DATABASE_URL ? 'configured' : 'missing',
      },
    });
  }
});

// API information endpoint
router.get('/info', (_req, res) => {
  ApiResponseBuilder.success(
    res,
    {
      name: 'Cold Outreach AI API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: '/api/auth',
        campaigns: '/api/campaigns',
        prospects: '/api/prospects',
        uploads: '/api/uploads',
        workflow: '/api/workflow',
        enrichment: '/api/enrichment',
        services: '/api/services',
      },
      documentation: process.env.API_DOCS_URL || null,
    },
    'API information'
  );
});

// Temporary upload config endpoint (until full uploads route is fixed)
router.get('/uploads/config', (_req, res) => {
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  ApiResponseBuilder.success(
    res,
    {
      maxFileSize,
      maxFileSizeMB: Math.floor(maxFileSize / 1024 / 1024),
      allowedFileTypes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
      allowedExtensions: ['.csv', '.txt'],
    },
    'Upload configuration retrieved'
  );
});

// Temporary workflow sessions endpoint (until full workflow route is fixed)
router.post('/workflow/sessions', (req, res) => {
  try {
    const { type, configuration } = req.body;

    const mockSession = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type || 'PROSPECT_ENRICHMENT',
      status: 'ACTIVE',
      currentStep: 0,
      configuration: configuration || {},
      progress: {
        current: 0,
        total: 4,
        percentage: 0,
      },
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    ApiResponseBuilder.success(
      res,
      mockSession,
      'Workflow session created successfully'
    );
  } catch (error) {
    ApiResponseBuilder.error(
      res,
      error instanceof Error
        ? error.message
        : 'Failed to create workflow session',
      500
    );
  }
});

// Temporary workflow session update endpoint
router.patch('/workflow/sessions/:sessionId/step', (req, res) => {
  const { sessionId } = req.params;
  const { step, nextStep } = req.body;

  try {
    ApiResponseBuilder.success(
      res,
      {
        sessionId,
        currentStep: nextStep || step + 1,
        status: 'UPDATED',
        updatedAt: new Date().toISOString(),
      },
      'Workflow step updated successfully'
    );
  } catch (error) {
    ApiResponseBuilder.error(
      res,
      error instanceof Error ? error.message : 'Failed to update workflow step',
      500
    );
  }
});

// Temporary workflow step start endpoint
router.post(
  '/workflow/sessions/:sessionId/steps/:stepName/start',
  (req, res) => {
    const { sessionId, stepName } = req.params;
    const { data } = req.body;

    try {
      if (!sessionId || !stepName) {
        ApiResponseBuilder.error(
          res,
          'Missing required parameters: sessionId or stepName',
          400
        );
        return;
      }

      ApiResponseBuilder.success(
        res,
        {
          sessionId,
          stepName,
          status: 'STARTED',
          data: data || {},
          startedAt: new Date().toISOString(),
        },
        `Workflow step ${stepName} started successfully`
      );
    } catch (error) {
      ApiResponseBuilder.error(
        res,
        error instanceof Error
          ? error.message
          : 'Failed to start workflow step',
        500
      );
    }
  }
);

// Temporary workflow step complete endpoint
router.post(
  '/workflow/sessions/:sessionId/steps/:stepName/complete',
  (req, res) => {
    const sessionId = req.params.sessionId;
    const stepName = req.params.stepName;
    const { stepData } = req.body;

    try {
      if (!sessionId || !stepName) {
        ApiResponseBuilder.error(
          res,
          'Missing required parameters: sessionId or stepName',
          400
        );
        return;
      }

      ApiResponseBuilder.success(
        res,
        {
          sessionId,
          stepName,
          status: 'COMPLETED',
          stepData: stepData || {},
          completedAt: new Date().toISOString(),
        },
        `Workflow step ${stepName} completed successfully`
      );
    } catch (error) {
      ApiResponseBuilder.error(
        res,
        error instanceof Error
          ? error.message
          : 'Failed to complete workflow step',
        500
      );
    }
  }
);

// Temporary upload validation endpoint
// DISABLED: Now using real uploads route
/*
router.post('/uploads/validate', (req, res) => {
    try {
        const { filename, size, mimetype } = req.body

        // Basic validation
        if (!filename || !size || !mimetype) {
            ApiResponseBuilder.error(res, 'Missing required fields: filename, size, mimetype', 400)
            return
        }

        // File size validation (10MB max)
        const maxFileSize = 10 * 1024 * 1024
        if (size > maxFileSize) {
            ApiResponseBuilder.error(res, `File size (${Math.round(size / 1024 / 1024)}MB) exceeds maximum allowed size of 10MB`, 400)
            return
        }

        // File type validation
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
        if (!allowedTypes.includes(mimetype)) {
            ApiResponseBuilder.error(res, `File type "${mimetype}" is not supported. Only CSV files are allowed.`, 400)
            return
        }

        ApiResponseBuilder.success(res, {
            valid: true,
            filename,
            size,
            mimetype
        }, 'File validation successful')
    } catch (error) {
        ApiResponseBuilder.error(res,
            error instanceof Error ? error.message : 'File validation failed',
            500
        )
    }
})
*/

// Temporary upload endpoint (processes CSV in-memory, no database storage)
// DISABLED: Now using real uploads route
/*
router.post('/uploads', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            ApiResponseBuilder.error(res, 'No file uploaded', 400)
            return
        }

        const file = req.file
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const filename = (file as any).originalname || 'unknown.csv'

        // Save file to disk for later processing
        const fs = require('fs').promises
        const path = require('path')
        const uploadsDir = path.join(process.cwd(), 'uploads')

        // Ensure uploads directory exists
        try {
            await fs.mkdir(uploadsDir, { recursive: true })
        } catch (mkdirError) {
            console.warn('Failed to create uploads directory:', mkdirError)
        }

        // Save file with uploadId as filename for later retrieval
        const filePath = path.join(uploadsDir, `${uploadId}.csv`)
        try {
            await fs.writeFile(filePath, file.buffer)
            console.log('📁 Saved uploaded file to:', filePath)
        } catch (saveError) {
            console.error('❌ Failed to save file to disk:', saveError)
            // Continue with in-memory processing even if save fails
        }

        // Parse CSV content
        const csvContent = file.buffer.toString('utf-8')
        const lines = csvContent.split('\n').filter(line => line.trim())

        if (lines.length < 2) {
            ApiResponseBuilder.error(res, 'CSV file must contain at least a header row and one data row', 400)
            return
        }

        // Parse headers
        const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) || []

        // Parse first few rows for preview
        const previewRows = lines.slice(1, 11).map(line => {
            return line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        })

        // Count total rows (excluding header)
        const totalRows = lines.length - 1

        // Basic validation for required columns
        const requiredColumns = ['name', 'email', 'company']
        const foundColumns = requiredColumns.map(required => {
            const found = headers.find(header =>
                header.toLowerCase().includes(required.toLowerCase())
            )
            return { name: required, found: !!found, mapping: found || null }
        })

        const validRows = totalRows // Assume all valid for now
        const invalidRows = 0

        ApiResponseBuilder.success(res, {
            uploadId,
            filename,
            size: file.size,
            preview: {
                headers,
                rows: previewRows,
                totalRows,
                validRows,
                invalidRows,
                requiredColumns: foundColumns
            },
            validation: {
                isValid: foundColumns.every(col => col.found),
                errors: foundColumns.filter(col => !col.found).map(col => ({
                    row: 0,
                    column: col.name,
                    error: `Required column '${col.name}' not found`,
                    severity: 'error'
                })),
                summary: {
                    totalRows,
                    validRows,
                    invalidRows,
                    errorCount: foundColumns.filter(col => !col.found).length,
                    warningCount: 0
                }
            }
        }, 'File uploaded and processed successfully')
    } catch (error) {
        console.error('Upload processing error:', error)
        ApiResponseBuilder.error(res,
            error instanceof Error ? error.message : 'Failed to process uploaded file',
            500
        )
    }
})
*/

// CSV import is now handled by the real prospectImportController via /api/prospects/import/csv

// Temporary enrichment endpoints removed - using real enrichment routes

// Temporary enrichment job progress endpoint removed - using real SSE endpoint from enrichmentRoutes

// Mount route modules
router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/prospects', prospectRoutes);
router.use('/uploads', uploadRoutes); // Re-enabled - compilation errors are fixed
router.use('/workflow', workflowRoutes);
router.use('/enrichment', enrichmentRoutes); // Re-enabled for SSE support
router.use('/email-generation', emailGenerationRoutes);
router.use('/services', serviceRoutes);
router.use('/jobs', jobRoutes); // SSE support for real-time job updates

export default router;
