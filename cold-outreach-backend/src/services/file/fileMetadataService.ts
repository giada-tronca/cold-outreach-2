// import { FileUpload, FileHistory, FileOperation, FileStatus } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { FileStorageService, StorageResult } from './fileStorageService';
import { AppError, NotFoundError } from '@/utils/errors';

const prisma = new PrismaClient();

export interface FileMetadata {
    id: string;
    originalName: string;
    fileName: string;
    filePath: string;
    fileType: string;
    mimeType: string;
    fileSize: bigint;
    status: string;
    campaignId?: number;
    batchId?: number;
    userId?: string;
    checksum?: string;
    metadata?: any;
    downloadCount: number;
    lastDownloaded?: Date;
    expiresAt?: Date;
    isTemporary: boolean;
    parentFileId?: string;
    processingData?: any;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateFileMetadataOptions {
    originalName: string;
    fileName: string;
    filePath: string;
    fileType: 'CSV_UPLOAD' | 'CSV_TEMPLATE' | 'REPORT' | 'EXPORT' | 'ATTACHMENT';
    mimeType: string;
    fileSize: number;
    campaignId?: number;
    batchId?: number;
    userId?: string;
    checksum?: string;
    metadata?: any;
    expiresAt?: Date;
    isTemporary?: boolean;
    parentFileId?: string;
}

export interface UpdateFileMetadataOptions {
    status?: 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DELETED' | 'ARCHIVED';
    processingData?: any;
    errorMessage?: string;
    metadata?: any;
    expiresAt?: Date;
}

export interface FileSearchOptions {
    campaignId?: number;
    batchId?: number;
    userId?: string;
    fileType?: string;
    status?: string;
    isTemporary?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'fileSize' | 'downloadCount';
    sortOrder?: 'asc' | 'desc';
}

export class FileMetadataService {
    /**
     * Create file metadata record
     */
    static async createFileMetadata(options: CreateFileMetadataOptions): Promise<FileMetadata> {
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

        } catch (error) {
            throw new AppError(
                `Failed to create file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Get file metadata by ID
     */
    static async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
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

        } catch (error) {
            throw new AppError(
                `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Update file metadata
     */
    static async updateFileMetadata(
        fileId: string,
        options: UpdateFileMetadataOptions
    ): Promise<FileMetadata> {
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

        } catch (error) {
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                throw new NotFoundError('File metadata not found');
            }
            throw new AppError(
                `Failed to update file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Search file metadata with filters
     */
    static async searchFiles(options: FileSearchOptions = {}): Promise<{
        files: FileMetadata[];
        total: number;
        hasMore: boolean;
    }> {
        try {
            const where: any = {};

            // Apply filters
            if (options.campaignId) where.campaignId = options.campaignId;
            if (options.batchId) where.batchId = options.batchId;
            if (options.userId) where.userId = options.userId;
            if (options.fileType) where.fileType = options.fileType;
            if (options.status) where.status = options.status;
            if (options.isTemporary !== undefined) where.isTemporary = options.isTemporary;

            if (options.createdAfter || options.createdBefore) {
                where.createdAt = {};
                if (options.createdAfter) where.createdAt.gte = options.createdAfter;
                if (options.createdBefore) where.createdAt.lte = options.createdBefore;
            }

            // Count total records
            const total = await prisma.fileUpload.count({ where });

            // Get paginated results
            const limit = options.limit || 50;
            const offset = options.offset || 0;

            const orderBy: any = {};
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
                files: files.map((file: any) => this.convertToFileMetadata(file)),
                total,
                hasMore: offset + files.length < total
            };

        } catch (error) {
            throw new AppError(
                `Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Record file download
     */
    static async recordDownload(
        fileId: string,
        metadata?: { userId?: string; ipAddress?: string; userAgent?: string }
    ): Promise<void> {
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

        } catch (error) {
            throw new AppError(
                `Failed to record download: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Mark file as deleted (soft delete)
     */
    static async markFileAsDeleted(
        fileId: string,
        metadata?: { userId?: string; reason?: string }
    ): Promise<void> {
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

        } catch (error) {
            throw new AppError(
                `Failed to mark file as deleted: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Archive old files
     */
    static async archiveOldFiles(
        olderThanDays: number = 30,
        dryRun: boolean = false
    ): Promise<{ archivedCount: number; files: string[] }> {
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
                    files: filesToArchive.map((f: any) => f.originalName)
                };
            }

            // Archive files
            await prisma.fileUpload.updateMany({
                where: {
                    id: { in: filesToArchive.map((f: any) => f.id) }
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
                files: filesToArchive.map((f: any) => f.originalName)
            };

        } catch (error) {
            throw new AppError(
                `Failed to archive old files: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Get file statistics
     */
    static async getFileStatistics(options: {
        campaignId?: number;
        userId?: string;
        dateRange?: { start: Date; end: Date };
    } = {}): Promise<{
        totalFiles: number;
        totalSize: bigint;
        byType: Array<{ type: string; count: number; size: bigint }>;
        byStatus: Array<{ status: string; count: number }>;
        recentActivity: Array<{ date: string; uploads: number; downloads: number }>;
    }> {
        try {
            const where: any = {};
            if (options.campaignId) where.campaignId = options.campaignId;
            if (options.userId) where.userId = options.userId;
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
            const activityMap = new Map<string, { uploads: number; downloads: number }>();

            recentUploads.forEach((upload: any) => {
                const date = upload.createdAt?.toISOString()?.split('T')[0];
                if (date && !activityMap.has(date)) activityMap.set(date, { uploads: 0, downloads: 0 });
                if (date) activityMap.get(date)!.uploads = upload._count.id;
            });

            recentDownloads.forEach((download: any) => {
                const date = download.createdAt?.toISOString()?.split('T')[0];
                if (date && !activityMap.has(date)) activityMap.set(date, { uploads: 0, downloads: 0 });
                if (date) activityMap.get(date)!.downloads = download._count.id;
            });

            const recentActivity = Array.from(activityMap.entries()).map(([date, activity]) => ({
                date,
                uploads: activity.uploads,
                downloads: activity.downloads
            }));

            return {
                totalFiles: aggregates._count.id || 0,
                totalSize: aggregates._sum.fileSize || BigInt(0),
                byType: byType.map((item: any) => ({
                    type: item.fileType,
                    count: item._count.id,
                    size: item._sum.fileSize || BigInt(0)
                })),
                byStatus: byStatus.map((item: any) => ({
                    status: item.status,
                    count: item._count.id
                })),
                recentActivity
            };

        } catch (error) {
            throw new AppError(
                `Failed to get file statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Create file history record
     */
    private static async createHistoryRecord(
        fileId: string,
        operation: 'UPLOAD' | 'DOWNLOAD' | 'PROCESS' | 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'CLEANUP',
        metadata?: any
    ): Promise<void> {
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
        } catch (error) {
            console.warn('Failed to create file history record:', error);
        }
    }

    /**
     * Convert Prisma model to FileMetadata interface
     */
    private static convertToFileMetadata(fileData: any): FileMetadata {
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
    static async storeFileWithMetadata(
        buffer: Buffer,
        originalName: string,
        mimeType: string,
        options: {
            campaignId?: number;
            batchId?: number;
            userId?: string;
            fileType: 'CSV_UPLOAD' | 'CSV_TEMPLATE' | 'REPORT' | 'EXPORT' | 'ATTACHMENT';
            isTemporary?: boolean;
            expiresAt?: Date;
            metadata?: any;
        }
    ): Promise<{ storage: StorageResult; metadata: FileMetadata }> {
        try {
            // Store file using storage service
            const storageResult = await FileStorageService.storeFile(
                buffer,
                originalName,
                mimeType,
                {
                    campaignId: options.campaignId,
                    batchId: options.batchId,
                    userId: options.userId,
                    fileType: options.fileType,
                    isTemporary: options.isTemporary
                }
            );

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

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Failed to store file with metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }
} 