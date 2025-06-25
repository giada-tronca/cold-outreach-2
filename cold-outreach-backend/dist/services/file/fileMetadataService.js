"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMetadataService = void 0;
// import { FileUpload, FileHistory, FileOperation, FileStatus } from '@prisma/client';
const client_1 = require("@prisma/client");
const fileStorageService_1 = require("./fileStorageService");
const errors_1 = require("@/utils/errors");
const prisma = new client_1.PrismaClient();
class FileMetadataService {
    /**
     * Create file metadata record
     */
    static async createFileMetadata(options) {
        try {
            const fileMetadata = await prisma.fileUpload.create({
                data: {
                    originalName: options.originalName,
                    fileName: options.fileName,
                    filePath: options.filePath,
                    fileType: options.fileType,
                    mimeType: options.mimeType,
                    fileSize: BigInt(options.fileSize),
                    status: 'UPLOADED',
                    campaignId: options.campaignId,
                    batchId: options.batchId,
                    userId: options.userId,
                    checksum: options.checksum,
                    metadata: options.metadata,
                    expiresAt: options.expiresAt,
                    isTemporary: options.isTemporary || false,
                    parentFileId: options.parentFileId
                }
            });
            return this.convertToFileMetadata(fileMetadata);
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to create file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Get file metadata by ID
     */
    static async getFileMetadata(fileId) {
        try {
            const fileMetadata = await prisma.fileUpload.findUnique({
                where: { id: fileId },
                include: {
                    campaign: { select: { id: true, name: true } },
                    batch: { select: { id: true, name: true } },
                    parentFile: { select: { id: true, originalName: true } },
                    childFiles: { select: { id: true, originalName: true, status: true } }
                }
            });
            return fileMetadata ? this.convertToFileMetadata(fileMetadata) : null;
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Update file metadata
     */
    static async updateFileMetadata(fileId, options) {
        try {
            const fileMetadata = await prisma.fileUpload.update({
                where: { id: fileId },
                data: {
                    status: options.status,
                    processingData: options.processingData,
                    errorMessage: options.errorMessage,
                    metadata: options.metadata,
                    expiresAt: options.expiresAt,
                    updatedAt: new Date()
                }
            });
            return this.convertToFileMetadata(fileMetadata);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                throw new errors_1.NotFoundError('File metadata not found');
            }
            throw new errors_1.AppError(`Failed to update file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Search file metadata with filters
     */
    static async searchFiles(options = {}) {
        try {
            const where = {};
            // Apply filters
            if (options.campaignId)
                where.campaignId = options.campaignId;
            if (options.batchId)
                where.batchId = options.batchId;
            if (options.userId)
                where.userId = options.userId;
            if (options.fileType)
                where.fileType = options.fileType;
            if (options.status)
                where.status = options.status;
            if (options.isTemporary !== undefined)
                where.isTemporary = options.isTemporary;
            if (options.createdAfter || options.createdBefore) {
                where.createdAt = {};
                if (options.createdAfter)
                    where.createdAt.gte = options.createdAfter;
                if (options.createdBefore)
                    where.createdAt.lte = options.createdBefore;
            }
            // Count total records
            const total = await prisma.fileUpload.count({ where });
            // Get paginated results
            const limit = options.limit || 50;
            const offset = options.offset || 0;
            const orderBy = {};
            const sortBy = options.sortBy || 'createdAt';
            const sortOrder = options.sortOrder || 'desc';
            orderBy[sortBy] = sortOrder;
            const files = await prisma.fileUpload.findMany({
                where,
                orderBy,
                take: limit,
                skip: offset,
                include: {
                    campaign: { select: { id: true, name: true } },
                    batch: { select: { id: true, name: true } }
                }
            });
            return {
                files: files.map((file) => this.convertToFileMetadata(file)),
                total,
                hasMore: offset + files.length < total
            };
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Record file download
     */
    static async recordDownload(fileId, metadata) {
        try {
            await prisma.fileUpload.update({
                where: { id: fileId },
                data: {
                    downloadCount: { increment: 1 },
                    lastDownloaded: new Date()
                }
            });
            // Create history record
            await this.createHistoryRecord(fileId, 'DOWNLOAD', metadata);
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to record download: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Mark file as deleted (soft delete)
     */
    static async markFileAsDeleted(fileId, metadata) {
        try {
            await prisma.fileUpload.update({
                where: { id: fileId },
                data: {
                    status: 'DELETED',
                    updatedAt: new Date()
                }
            });
            // Create history record
            await this.createHistoryRecord(fileId, 'DELETE', metadata);
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to mark file as deleted: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Archive old files
     */
    static async archiveOldFiles(olderThanDays = 30, dryRun = false) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const filesToArchive = await prisma.fileUpload.findMany({
                where: {
                    createdAt: { lt: cutoffDate },
                    status: { notIn: ['DELETED', 'ARCHIVED'] },
                    isTemporary: false
                },
                select: { id: true, originalName: true }
            });
            if (dryRun) {
                return {
                    archivedCount: filesToArchive.length,
                    files: filesToArchive.map((f) => f.originalName)
                };
            }
            // Archive files
            await prisma.fileUpload.updateMany({
                where: {
                    id: { in: filesToArchive.map((f) => f.id) }
                },
                data: {
                    status: 'ARCHIVED',
                    updatedAt: new Date()
                }
            });
            // Create history records
            for (const file of filesToArchive) {
                await this.createHistoryRecord(file.id, 'ARCHIVE', {
                    automated: true,
                    cutoffDate: cutoffDate.toISOString()
                });
            }
            return {
                archivedCount: filesToArchive.length,
                files: filesToArchive.map((f) => f.originalName)
            };
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to archive old files: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Get file statistics
     */
    static async getFileStatistics(options = {}) {
        try {
            const where = {};
            if (options.campaignId)
                where.campaignId = options.campaignId;
            if (options.userId)
                where.userId = options.userId;
            if (options.dateRange) {
                where.createdAt = {
                    gte: options.dateRange.start,
                    lte: options.dateRange.end
                };
            }
            // Total files and size
            const aggregates = await prisma.fileUpload.aggregate({
                where,
                _count: { id: true },
                _sum: { fileSize: true }
            });
            // Files by type
            const byType = await prisma.fileUpload.groupBy({
                by: ['fileType'],
                where,
                _count: { id: true },
                _sum: { fileSize: true }
            });
            // Files by status
            const byStatus = await prisma.fileUpload.groupBy({
                by: ['status'],
                where,
                _count: { id: true }
            });
            // Recent activity (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentUploads = await prisma.fileUpload.groupBy({
                by: ['createdAt'],
                where: {
                    ...where,
                    createdAt: { gte: sevenDaysAgo }
                },
                _count: { id: true }
            });
            const recentDownloads = await prisma.fileHistory.groupBy({
                by: ['createdAt'],
                where: {
                    operation: 'DOWNLOAD',
                    createdAt: { gte: sevenDaysAgo }
                },
                _count: { id: true }
            });
            // Process recent activity data
            const activityMap = new Map();
            recentUploads.forEach((upload) => {
                const date = upload.createdAt?.toISOString()?.split('T')[0];
                if (date && !activityMap.has(date))
                    activityMap.set(date, { uploads: 0, downloads: 0 });
                if (date)
                    activityMap.get(date).uploads = upload._count.id;
            });
            recentDownloads.forEach((download) => {
                const date = download.createdAt?.toISOString()?.split('T')[0];
                if (date && !activityMap.has(date))
                    activityMap.set(date, { uploads: 0, downloads: 0 });
                if (date)
                    activityMap.get(date).downloads = download._count.id;
            });
            const recentActivity = Array.from(activityMap.entries()).map(([date, activity]) => ({
                date,
                uploads: activity.uploads,
                downloads: activity.downloads
            }));
            return {
                totalFiles: aggregates._count.id || 0,
                totalSize: aggregates._sum.fileSize || BigInt(0),
                byType: byType.map((item) => ({
                    type: item.fileType,
                    count: item._count.id,
                    size: item._sum.fileSize || BigInt(0)
                })),
                byStatus: byStatus.map((item) => ({
                    status: item.status,
                    count: item._count.id
                })),
                recentActivity
            };
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to get file statistics: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Create file history record
     */
    static async createHistoryRecord(fileId, operation, metadata) {
        try {
            await prisma.fileHistory.create({
                data: {
                    fileId,
                    operation,
                    details: metadata,
                    userId: metadata?.userId,
                    ipAddress: metadata?.ipAddress,
                    userAgent: metadata?.userAgent,
                    success: true,
                    metadata
                }
            });
        }
        catch (error) {
            console.warn('Failed to create file history record:', error);
        }
    }
    /**
     * Convert Prisma model to FileMetadata interface
     */
    static convertToFileMetadata(fileData) {
        return {
            id: fileData.id,
            originalName: fileData.originalName,
            fileName: fileData.fileName,
            filePath: fileData.filePath,
            fileType: fileData.fileType,
            mimeType: fileData.mimeType,
            fileSize: fileData.fileSize,
            status: fileData.status,
            campaignId: fileData.campaignId,
            batchId: fileData.batchId,
            userId: fileData.userId,
            checksum: fileData.checksum,
            metadata: fileData.metadata,
            downloadCount: fileData.downloadCount,
            lastDownloaded: fileData.lastDownloaded,
            expiresAt: fileData.expiresAt,
            isTemporary: fileData.isTemporary,
            parentFileId: fileData.parentFileId,
            processingData: fileData.processingData,
            errorMessage: fileData.errorMessage,
            createdAt: fileData.createdAt,
            updatedAt: fileData.updatedAt
        };
    }
    /**
     * Store file with metadata tracking
     */
    static async storeFileWithMetadata(buffer, originalName, mimeType, options) {
        try {
            // Store file using storage service
            const storageResult = await fileStorageService_1.FileStorageService.storeFile(buffer, originalName, mimeType, {
                campaignId: options.campaignId,
                batchId: options.batchId,
                userId: options.userId,
                fileType: options.fileType,
                isTemporary: options.isTemporary
            });
            // Create metadata record
            const metadataRecord = await this.createFileMetadata({
                originalName,
                fileName: storageResult.fileName,
                filePath: storageResult.filePath,
                fileType: options.fileType,
                mimeType,
                fileSize: storageResult.size,
                campaignId: options.campaignId,
                batchId: options.batchId,
                userId: options.userId,
                checksum: storageResult.checksum,
                metadata: options.metadata,
                expiresAt: options.expiresAt,
                isTemporary: options.isTemporary
            });
            // Create history record
            await this.createHistoryRecord(metadataRecord.id, 'UPLOAD', {
                userId: options.userId,
                fileSize: storageResult.size,
                mimeType
            });
            return {
                storage: storageResult,
                metadata: metadataRecord
            };
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Failed to store file with metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
}
exports.FileMetadataService = FileMetadataService;
