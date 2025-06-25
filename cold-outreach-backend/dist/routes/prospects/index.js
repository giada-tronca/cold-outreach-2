"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiResponse_1 = require("../../utils/apiResponse");
// Controllers
const prospectController_1 = require("../../controllers/prospectController");
const router = (0, express_1.Router)();
// Health check endpoint
router.get('/health', (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { status: 'ok' }, 'Prospects API is healthy');
});
// Basic prospect routes
router.get('/', prospectController_1.getAllProspects);
router.get('/:id', prospectController_1.getProspectById);
router.get('/:prospectId/generated-email', prospectController_1.getGeneratedEmailByProspectId);
router.post('/', prospectController_1.createProspect);
router.put('/:id', prospectController_1.updateProspect);
router.delete('/:id', prospectController_1.deleteProspect);
// Campaign association route
router.post('/associate-campaign', prospectController_1.associateProspectsWithCampaign);
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
