import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseBuilder } from '@/utils/apiResponse';
import { DatabaseError, ValidationError } from '@/utils/errors';

const prisma = new PrismaClient();

/**
 * Bulk delete prospects
 */
export async function bulkDeleteProspects(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { prospectIds } = req.body;

    const result = await prisma.prospect.deleteMany({
      where: { id: { in: prospectIds } },
    });

    ApiResponseBuilder.success(
      res,
      {
        deletedCount: result.count,
      },
      `Successfully deleted ${result.count} prospects`
    );
  } catch (error) {
    console.error('Error bulk deleting prospects:', error);
    throw new DatabaseError('Failed to bulk delete prospects');
  }
}

/**
 * Bulk update prospect status
 */
export async function bulkUpdateProspectStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { prospectIds, status } = req.body;

    const result = await prisma.prospect.updateMany({
      where: { id: { in: prospectIds } },
      data: { status },
    });

    ApiResponseBuilder.success(
      res,
      {
        updatedCount: result.count,
        newStatus: status,
      },
      `Successfully updated status for ${result.count} prospects`
    );
  } catch (error) {
    console.error('Error bulk updating prospect status:', error);
    throw new DatabaseError('Failed to bulk update prospect status');
  }
}

/**
 * Bulk start enrichment
 */
export async function bulkStartEnrichment(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { prospectIds } = req.body;

    // Update prospects to ENRICHING status
    await prisma.prospect.updateMany({
      where: { id: { in: prospectIds } },
      data: { status: 'ENRICHING' },
    });

    ApiResponseBuilder.success(
      res,
      {
        queuedCount: prospectIds.length,
      },
      `Successfully queued enrichment for ${prospectIds.length} prospects`
    );
  } catch (error) {
    console.error('Error bulk starting enrichment:', error);
    throw new DatabaseError('Failed to bulk start enrichment');
  }
}

/**
 * Main bulk operation handler
 */
export async function bulkProspectOperation(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { operation } = req.body;

    switch (operation) {
      case 'delete':
        await bulkDeleteProspects(req, res);
        break;
      case 'updateStatus':
        await bulkUpdateProspectStatus(req, res);
        break;
      case 'startEnrichment':
        await bulkStartEnrichment(req, res);
        break;

      default:
        throw new ValidationError(`Unknown bulk operation: ${operation}`);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    console.error('Error in bulk prospect operation:', error);
    throw new DatabaseError('Failed to execute bulk prospect operation');
  }
}
