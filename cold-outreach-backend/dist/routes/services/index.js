"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceController_1 = require("@/controllers/serviceController");
const errorHandler_1 = require("@/middleware/errorHandler");
const router = (0, express_1.Router)();
// GET /api/services - Get all services (with optional filtering)
router.get('/', (0, errorHandler_1.asyncHandler)(serviceController_1.getAllServices));
// GET /api/services/:id - Get service by ID
router.get('/:id', (0, errorHandler_1.asyncHandler)(serviceController_1.getServiceById));
// POST /api/services - Create new service
router.post('/', (0, errorHandler_1.asyncHandler)(serviceController_1.createService));
// PUT /api/services/:id - Update service
router.put('/:id', (0, errorHandler_1.asyncHandler)(serviceController_1.updateService));
// DELETE /api/services/:id - Delete service
router.delete('/:id', (0, errorHandler_1.asyncHandler)(serviceController_1.deleteService));
exports.default = router;
