import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { ApiResponseBuilder } from '@/utils/apiResponse';
import { NotFoundError, DatabaseError } from '@/utils/errors';

/**
 * Get all services with optional filtering
 */
export async function getAllServices(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { isActive } = req.query;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    ApiResponseBuilder.success(
      res,
      services,
      'Services retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching services:', error);
    throw new DatabaseError('Failed to fetch services');
  }
}

/**
 * Get service by ID
 */
export async function getServiceById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const serviceId = parseInt(req.params.id!);

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${serviceId} not found`);
    }

    ApiResponseBuilder.success(res, service, 'Service retrieved successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error fetching service:', error);
    throw new DatabaseError('Failed to fetch service');
  }
}

/**
 * Create new service
 */
export async function createService(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name, promptTemplate, isActive = true } = req.body;

    const service = await prisma.service.create({
      data: {
        name,
        promptTemplate,
        isActive,
      },
    });

    ApiResponseBuilder.created(res, service, 'Service created successfully');
  } catch (error) {
    console.error('Error creating service:', error);
    throw new DatabaseError('Failed to create service');
  }
}

/**
 * Update service
 */
export async function updateService(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const serviceId = parseInt(req.params.id!);
    const updateData = req.body;

    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService) {
      throw new NotFoundError(`Service with ID ${serviceId} not found`);
    }

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
    });

    ApiResponseBuilder.success(
      res,
      updatedService,
      'Service updated successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error updating service:', error);
    throw new DatabaseError('Failed to update service');
  }
}

/**
 * Delete service
 */
export async function deleteService(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const serviceId = parseInt(req.params.id!);

    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService) {
      throw new NotFoundError(`Service with ID ${serviceId} not found`);
    }

    await prisma.service.delete({
      where: { id: serviceId },
    });

    ApiResponseBuilder.success(
      res,
      {
        deletedServiceId: serviceId,
      },
      'Service deleted successfully'
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error deleting service:', error);
    throw new DatabaseError('Failed to delete service');
  }
}
