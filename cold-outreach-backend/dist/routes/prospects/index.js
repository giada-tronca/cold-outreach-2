"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiResponse_1 = require("../../utils/apiResponse");
const client_1 = require("@prisma/client");
const validation_1 = require("../../middleware/validation");
const errors_1 = require("../../utils/errors");
const express_validator_1 = require("express-validator");
// Controllers
const prospectController_1 = require("../../controllers/prospectController");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Health check endpoint
router.get('/health', (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { status: 'ok' }, 'Prospects API is healthy');
});
// Define prospect input type
// type ProspectInput = {
//     name: string;
//     email: string;
//     company?: string;
//     position?: string;
//     linkedinUrl?: string;
//     status?: string;
//     additionalData?: Record<string, any>;
// }
// Bulk operations
router.post('/bulk', (0, validation_1.validate)([
    (0, express_validator_1.body)('prospects').isArray().withMessage('Prospects must be an array'),
    (0, express_validator_1.body)('prospects.*.email').isEmail().withMessage('Each prospect must have a valid email'),
    (0, express_validator_1.body)('prospects.*.name').optional().isString().withMessage('Name must be a string'),
    (0, express_validator_1.body)('prospects.*.company').optional().isString().withMessage('Company must be a string'),
    (0, express_validator_1.body)('prospects.*.position').optional().isString().withMessage('Position must be a string'),
    (0, express_validator_1.body)('prospects.*.linkedinUrl').optional().isURL().withMessage('LinkedIn URL must be a valid URL'),
    (0, express_validator_1.body)('batchId').optional().isInt({ min: 1 }).withMessage('Batch ID must be a positive integer'),
    (0, express_validator_1.body)('campaignId').isInt({ min: 1 }).withMessage('Campaign ID is required and must be a positive integer')
]), async (req, res) => {
    try {
        const { prospects, batchId, campaignId } = req.body;
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
                        throw new errors_1.BadRequestError(`Prospect with email ${prospect.email} already exists in this campaign`);
                    }
                }
                const data = {
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
        apiResponse_1.ApiResponseBuilder.success(res, {
            message: `Successfully created ${createdProspects.length} prospects`,
            data: createdProspects
        });
    }
    catch (error) {
        console.error('Error in bulk prospect creation:', error);
        if (error instanceof errors_1.BadRequestError) {
            apiResponse_1.ApiResponseBuilder.error(res, error.message, 400);
        }
        else {
            apiResponse_1.ApiResponseBuilder.error(res, 'Failed to create prospects');
        }
    }
});
// Basic prospect routes
router.get('/', prospectController_1.getAllProspects);
router.get('/:id', prospectController_1.getProspectById);
router.get('/:prospectId/generated-email', prospectController_1.getGeneratedEmailByProspectId);
router.post('/', prospectController_1.createProspect);
router.put('/:id', prospectController_1.updateProspect);
router.delete('/:id', prospectController_1.deleteProspect);
// Campaign association route
router.post('/associate-campaign', (0, validation_1.validate)([]), async (req, res) => {
    try {
        const { uploadId, campaignId } = req.body;
        // Get prospects from the upload session
        const prospects = await prisma.cOProspects.findMany({
            where: {
                additionalData: {
                    path: ['uploadSession'],
                    equals: uploadId
                }
            }
        });
        if (!prospects.length) {
            apiResponse_1.ApiResponseBuilder.notFound(res, 'No prospects found for the given upload ID');
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
        });
        apiResponse_1.ApiResponseBuilder.success(res, {
            message: `Successfully associated ${prospects.length} prospects with campaign ${campaignId}`,
            data: {
                prospectsCount: prospects.length,
                campaignId
            }
        });
    }
    catch (error) {
        console.error('Error associating prospects with campaign:', error);
        apiResponse_1.ApiResponseBuilder.serverError(res, 'Failed to associate prospects with campaign');
    }
});
// Import required controllers for enrichment and analysis
const prospectEnrichmentController_1 = require("../../controllers/prospectEnrichmentController");
const prospectAnalysisController_1 = require("../../controllers/prospectAnalysisController");
// Import CSV processing controllers
const prospectImportController_1 = require("@/controllers/prospectImportController");
// Enrichment Routes
router.get('/enrichments', prospectEnrichmentController_1.getAllEnrichments);
router.get('/enrichments/:prospectId', prospectEnrichmentController_1.getEnrichmentByProspectId);
// Temporarily commented out due to type issues - will fix later
// router.post('/enrichments', createEnrichment)
// router.put('/enrichments/:prospectId', updateEnrichment)
// router.delete('/enrichments/:prospectId', deleteEnrichment)
// Analysis Routes  
router.get('/analyses', prospectAnalysisController_1.getAllAnalyses);
router.get('/analyses/:prospectId', prospectAnalysisController_1.getAnalysisByProspectId);
router.post('/analyses', prospectAnalysisController_1.createAnalysis);
router.put('/analyses/:prospectId', prospectAnalysisController_1.updateAnalysis);
router.delete('/analyses/:prospectId', prospectAnalysisController_1.deleteAnalysis);
router.post('/analyses/:prospectId/upsert', prospectAnalysisController_1.upsertAnalysis);
router.get('/analyses/stats', prospectAnalysisController_1.getAnalysisStats);
// CSV Import Routes
const prospectImportController = new prospectImportController_1.ProspectImportController();
router.post('/import/csv', prospectImportController.importFromCSV.bind(prospectImportController));
router.post('/upload/csv', prospectImportController_1.uploadCSV);
router.get('/import/template', prospectImportController_1.getImportTemplate);
exports.default = router;
