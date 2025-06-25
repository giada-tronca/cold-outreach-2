"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkDeleteProspects = bulkDeleteProspects;
exports.bulkUpdateProspectStatus = bulkUpdateProspectStatus;
exports.bulkStartEnrichment = bulkStartEnrichment;
exports.bulkProspectOperation = bulkProspectOperation;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("@/utils/apiResponse");
const errors_1 = require("@/utils/errors");
const prisma = new client_1.PrismaClient();
/**
 * Bulk delete prospects
 */
async function bulkDeleteProspects(req, res) {
    try {
        const { prospectIds } = req.body;
        const result = await prisma.prospect.deleteMany({
            where: { id: { in: prospectIds } },
        });
        apiResponse_1.ApiResponseBuilder.success(res, {
            deletedCount: result.count,
        }, `Successfully deleted ${result.count} prospects`);
    }
    catch (error) {
        console.error('Error bulk deleting prospects:', error);
        throw new errors_1.DatabaseError('Failed to bulk delete prospects');
    }
}
/**
 * Bulk update prospect status
 */
async function bulkUpdateProspectStatus(req, res) {
    try {
        const { prospectIds, status } = req.body;
        const result = await prisma.prospect.updateMany({
            where: { id: { in: prospectIds } },
            data: { status },
        });
        apiResponse_1.ApiResponseBuilder.success(res, {
            updatedCount: result.count,
            newStatus: status,
        }, `Successfully updated status for ${result.count} prospects`);
    }
    catch (error) {
        console.error('Error bulk updating prospect status:', error);
        throw new errors_1.DatabaseError('Failed to bulk update prospect status');
    }
}
/**
 * Bulk start enrichment
 */
async function bulkStartEnrichment(req, res) {
    try {
        const { prospectIds } = req.body;
        // Update prospects to ENRICHING status
        await prisma.prospect.updateMany({
            where: { id: { in: prospectIds } },
            data: { status: 'ENRICHING' },
        });
        apiResponse_1.ApiResponseBuilder.success(res, {
            queuedCount: prospectIds.length,
        }, `Successfully queued enrichment for ${prospectIds.length} prospects`);
    }
    catch (error) {
        console.error('Error bulk starting enrichment:', error);
        throw new errors_1.DatabaseError('Failed to bulk start enrichment');
    }
}
/**
 * Main bulk operation handler
 */
async function bulkProspectOperation(req, res) {
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
                throw new errors_1.ValidationError(`Unknown bulk operation: ${operation}`);
        }
    }
    catch (error) {
        if (error instanceof errors_1.ValidationError) {
            throw error;
        }
        console.error('Error in bulk prospect operation:', error);
        throw new errors_1.DatabaseError('Failed to execute bulk prospect operation');
    }
}
