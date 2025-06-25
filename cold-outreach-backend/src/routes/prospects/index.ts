import { Router, Request, Response } from 'express'
import { ApiResponseBuilder } from '../../utils/apiResponse'
import { PrismaClient, Prisma } from '@prisma/client'
import { validate } from '../../middleware/validation'
import { z } from 'zod'
import { BadRequestError } from '../../utils/errors'
import { body } from 'express-validator'

// Controllers
import {
    getAllProspects,
    getProspectById,
    getGeneratedEmailByProspectId,
    createProspect,
    updateProspect,
    deleteProspect,
    associateProspectsWithCampaign
} from '../../controllers/prospectController'

const router = Router()
const prisma = new PrismaClient()

// Health check endpoint
router.get('/health', (_req, res) => {
    ApiResponseBuilder.success(res, { status: 'ok' }, 'Prospects API is healthy')
})

// Define prospect input type
type ProspectInput = {
    name: string;
    email: string;
    company?: string;
    position?: string;
    linkedinUrl?: string;
    status?: string;
    additionalData?: Record<string, any>;
}

// Bulk operations
router.post('/bulk', validate([
    body('prospects').isArray().withMessage('Prospects must be an array'),
    body('prospects.*.email').isEmail().withMessage('Each prospect must have a valid email'),
    body('prospects.*.name').optional().isString().withMessage('Name must be a string'),
    body('prospects.*.company').optional().isString().withMessage('Company must be a string'),
    body('prospects.*.position').optional().isString().withMessage('Position must be a string'),
    body('prospects.*.linkedinUrl').optional().isURL().withMessage('LinkedIn URL must be a valid URL'),
    body('batchId').optional().isInt({ min: 1 }).withMessage('Batch ID must be a positive integer'),
    body('campaignId').isInt({ min: 1 }).withMessage('Campaign ID is required and must be a positive integer')
]), async (req: Request, res: Response): Promise<void> => {
    try {
        const { prospects, batchId, campaignId } = req.body as {
            prospects: Array<{
                name?: string;
                email: string;
                company?: string;
                position?: string;
                linkedinUrl?: string;
                status?: string;
                additionalData?: Record<string, any>;
            }>;
            batchId?: number;
            campaignId: number;
        };

        // Create all prospects in a transaction
        const createdProspects = await prisma.$transaction(async (tx) => {
            return await Promise.all(prospects.map(async (prospect) => {
                // Check for duplicate email in the same campaign
                if (prospect.email) {
                    const existingProspect = await tx.cOProspects.findFirst({
                        where: {
                            email: prospect.email,
                            campaignId: campaignId
                        }
                    });

                    if (existingProspect) {
                        throw new BadRequestError(`Prospect with email ${prospect.email} already exists in this campaign`);
                    }
                }

                const data: Prisma.COProspectsCreateInput = {
                    name: prospect.name || '',
                    email: prospect.email,
                    company: prospect.company || '',
                    position: prospect.position || '',
                    linkedinUrl: prospect.linkedinUrl,
                    status: prospect.status || 'PENDING',
                    additionalData: prospect.additionalData || {},
                    campaign: {
                        connect: { id: campaignId }
                    },
                    ...(batchId && {
                        batch: {
                            connect: { id: batchId }
                        }
                    })
                };

                return await tx.cOProspects.create({
                    data,
                    include: {
                        campaign: true,
                        batch: true
                    }
                });
            }));
        });

        // Update batch total prospects count if a batch was specified
        if (batchId) {
            await prisma.cOBatches.update({
                where: { id: batchId },
                data: {
                    totalProspects: {
                        increment: createdProspects.length
                    }
                }
            });
        }

        ApiResponseBuilder.success(res, {
            message: `Successfully created ${createdProspects.length} prospects`,
            data: createdProspects
        });
    } catch (error) {
        console.error('Error in bulk prospect creation:', error);
        if (error instanceof BadRequestError) {
            ApiResponseBuilder.error(res, error.message, 400);
        } else {
            ApiResponseBuilder.error(res, 'Failed to create prospects');
        }
    }
});

// Basic prospect routes
router.get('/', getAllProspects)
router.get('/:id', getProspectById)
router.get('/:prospectId/generated-email', getGeneratedEmailByProspectId)
router.post('/', createProspect)
router.put('/:id', updateProspect)
router.delete('/:id', deleteProspect)

// Campaign association route
router.post('/associate-campaign', validate([]), async (req: Request, res: Response): Promise<void> => {
    try {
        const { uploadId, campaignId } = req.body as {
            uploadId: string;
            campaignId: number;
        };

        // Get prospects from the upload session
        const prospects = await prisma.cOProspects.findMany({
            where: {
                additionalData: {
                    path: ['uploadSession'],
                    equals: uploadId
                }
            }
        })

        if (!prospects.length) {
            ApiResponseBuilder.notFound(res, 'No prospects found for the given upload ID')
            return;
        }

        // Update all prospects to associate them with the campaign
        await prisma.cOProspects.updateMany({
            where: {
                additionalData: {
                    path: ['uploadSession'],
                    equals: uploadId
                }
            },
            data: {
                campaignId
            }
        })

        ApiResponseBuilder.success(res, {
            message: `Successfully associated ${prospects.length} prospects with campaign ${campaignId}`,
            data: {
                prospectsCount: prospects.length,
                campaignId
            }
        });
    } catch (error) {
        console.error('Error associating prospects with campaign:', error)
        ApiResponseBuilder.serverError(res, 'Failed to associate prospects with campaign');
    }
})

// Import required controllers for enrichment and analysis
import {
    getAllEnrichments,
    getEnrichmentByProspectId,
    // createEnrichment,
    // updateEnrichment,
    // deleteEnrichment
} from '../../controllers/prospectEnrichmentController'

import {
    getAllAnalyses,
    getAnalysisByProspectId,
    createAnalysis,
    updateAnalysis,
    deleteAnalysis,
    upsertAnalysis,
    getAnalysisStats
} from '../../controllers/prospectAnalysisController'

// Import CSV processing controllers
import {
    uploadCSV,
    getImportTemplate,
    ProspectImportController
} from '@/controllers/prospectImportController'

// Enrichment Routes
router.get('/enrichments', getAllEnrichments)
router.get('/enrichments/:prospectId', getEnrichmentByProspectId)
// Temporarily commented out due to type issues - will fix later
// router.post('/enrichments', createEnrichment)
// router.put('/enrichments/:prospectId', updateEnrichment)
// router.delete('/enrichments/:prospectId', deleteEnrichment)

// Analysis Routes  
router.get('/analyses', getAllAnalyses)
router.get('/analyses/:prospectId', getAnalysisByProspectId)
router.post('/analyses', createAnalysis)
router.put('/analyses/:prospectId', updateAnalysis)
router.delete('/analyses/:prospectId', deleteAnalysis)
router.post('/analyses/:prospectId/upsert', upsertAnalysis)
router.get('/analyses/stats', getAnalysisStats)

// CSV Import Routes
const prospectImportController = new ProspectImportController()
router.post('/import/csv', prospectImportController.importFromCSV.bind(prospectImportController))
router.post('/upload/csv', uploadCSV)
router.get('/import/template', getImportTemplate)

export default router
export default router 