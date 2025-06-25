"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllServices = getAllServices;
exports.getServiceById = getServiceById;
exports.createService = createService;
exports.updateService = updateService;
exports.deleteService = deleteService;
const database_1 = require("@/config/database");
const apiResponse_1 = require("@/utils/apiResponse");
const errors_1 = require("@/utils/errors");
/**
 * Get all services with optional filtering
 */
async function getAllServices(req, res) {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        const services = await database_1.prisma.service.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        apiResponse_1.ApiResponseBuilder.success(res, services, 'Services retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching services:', error);
        throw new errors_1.DatabaseError('Failed to fetch services');
    }
}
/**
 * Get service by ID
 */
async function getServiceById(req, res) {
    try {
        const serviceId = parseInt(req.params.id);
        const service = await database_1.prisma.service.findUnique({
            where: { id: serviceId }
        });
        if (!service) {
            throw new errors_1.NotFoundError(`Service with ID ${serviceId} not found`);
        }
        apiResponse_1.ApiResponseBuilder.success(res, service, 'Service retrieved successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error fetching service:', error);
        throw new errors_1.DatabaseError('Failed to fetch service');
    }
}
/**
 * Create new service
 */
async function createService(req, res) {
    try {
        const { name, promptTemplate, isActive = true } = req.body;
        const service = await database_1.prisma.service.create({
            data: {
                name,
                promptTemplate,
                isActive
            }
        });
        apiResponse_1.ApiResponseBuilder.created(res, service, 'Service created successfully');
    }
    catch (error) {
        console.error('Error creating service:', error);
        throw new errors_1.DatabaseError('Failed to create service');
    }
}
/**
 * Update service
 */
async function updateService(req, res) {
    try {
        const serviceId = parseInt(req.params.id);
        const updateData = req.body;
        const existingService = await database_1.prisma.service.findUnique({
            where: { id: serviceId }
        });
        if (!existingService) {
            throw new errors_1.NotFoundError(`Service with ID ${serviceId} not found`);
        }
        const updatedService = await database_1.prisma.service.update({
            where: { id: serviceId },
            data: updateData
        });
        apiResponse_1.ApiResponseBuilder.success(res, updatedService, 'Service updated successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error updating service:', error);
        throw new errors_1.DatabaseError('Failed to update service');
    }
}
/**
 * Delete service
 */
async function deleteService(req, res) {
    try {
        const serviceId = parseInt(req.params.id);
        const existingService = await database_1.prisma.service.findUnique({
            where: { id: serviceId }
        });
        if (!existingService) {
            throw new errors_1.NotFoundError(`Service with ID ${serviceId} not found`);
        }
        await database_1.prisma.service.delete({
            where: { id: serviceId }
        });
        apiResponse_1.ApiResponseBuilder.success(res, {
            deletedServiceId: serviceId
        }, 'Service deleted successfully');
    }
    catch (error) {
        if (error instanceof errors_1.NotFoundError) {
            throw error;
        }
        console.error('Error deleting service:', error);
        throw new errors_1.DatabaseError('Failed to delete service');
    }
}
