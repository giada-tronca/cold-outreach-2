import { Router } from 'express'
import {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService
} from '@/controllers/serviceController'
import { asyncHandler } from '@/middleware/errorHandler'

const router = Router()

// GET /api/services - Get all services (with optional filtering)
router.get('/', asyncHandler(getAllServices))

// GET /api/services/:id - Get service by ID
router.get('/:id', asyncHandler(getServiceById))

// POST /api/services - Create new service
router.post('/', asyncHandler(createService))

// PUT /api/services/:id - Update service
router.put('/:id', asyncHandler(updateService))

// DELETE /api/services/:id - Delete service
router.delete('/:id', asyncHandler(deleteService))

export default router 