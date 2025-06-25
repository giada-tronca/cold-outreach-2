import { FileStorageService } from './fileStorageService';
import { FileDownloadService, DownloadOptions } from './fileDownloadService';
import { FileCleanupService, CleanupOptions } from './fileCleanupService';
import { BadRequestError } from '@/utils/errors';
import { Response } from 'express';

export interface FileUploadOptions {
    campaignId?: number;
    batchId?: number;
    userId?: string;
    fileType: 'CSV_UPLOAD' | 'CSV_TEMPLATE' | 'REPORT' | 'EXPORT' | 'ATTACHMENT';
    isTemporary?: boolean;
    expiresAt?: Date;
    metadata?: any;
}

export interface FileManagementConfig {
    storage: {
        baseDir: string;
        maxFileSize: number;
        allowedMimeTypes: string[];
    };
    cleanup: {
        tempFileRetentionMinutes: number;
        enableAutomaticCleanup: boolean;
        cleanupIntervalMinutes: number;
    };
    downloads: {
        enableSecureLinks: boolean;
        defaultTokenExpiryMinutes: number;
    };
}

export interface FileOperationResult {
    success: boolean;
    fileId?: string;
    error?: string;
    details?: any;
}

export class FileManagementService {
    private static isInitialized = false;

    /**
     * Initialize the file management system
     */
    static initialize(config: Partial<FileManagementConfig> = {}): void {
        if (this.isInitialized) {
            console.warn('FileManagementService already initialized');
            return;
        }

        // Initialize storage service
        if (config.storage) {
            FileStorageService.initialize(config.storage);
        } else {
            FileStorageService.initialize();
        }

        // Initialize cleanup service
        if (config.cleanup) {
            FileCleanupService.initialize(config.cleanup);
        } else {
            FileCleanupService.initialize();
        }

        this.isInitialized = true;
        console.log('FileManagementService initialized successfully');
    }

    /**
     * Upload and store file with full tracking
     */
    static async uploadFile(
        buffer: Buffer,
        originalName: string,
        mimeType: string,
        options: FileUploadOptions
    ): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            // Store file
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

            // TODO: Create metadata record when database is ready
            // const metadataResult = await FileMetadataService.createFileMetadata({
            //   originalName,
            //   fileName: storageResult.fileName,
            //   filePath: storageResult.filePath,
            //   fileType: options.fileType,
            //   mimeType,
            //   fileSize: storageResult.size,
            //   campaignId: options.campaignId,
            //   batchId: options.batchId,
            //   userId: options.userId,
            //   checksum: storageResult.checksum,
            //   metadata: options.metadata,
            //   expiresAt: options.expiresAt,
            //   isTemporary: options.isTemporary
            // });

            return {
                success: true,
                fileId: storageResult.fileId,
                details: {
                    storage: storageResult,
                    // metadata: metadataResult
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed'
            };
        }
    }

    /**
     * Download file with access control and tracking
     */
    static async downloadFile(
        filePath: string,
        response: Response,
        options: DownloadOptions = {}
    ): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            // Check file access
            const hasAccess = await FileDownloadService.checkFileAccess(filePath, {
                userId: options.userId,
                requiredPermission: 'download'
            });

            if (!hasAccess) {
                throw new BadRequestError('Access denied to file');
            }

            // Download file
            const downloadResult = await FileDownloadService.downloadFile(
                filePath,
                response,
                options
            );

            return {
                success: true,
                details: downloadResult
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Download failed'
            };
        }
    }

    /**
     * Generate secure download link
     */
    static generateSecureDownloadLink(
        fileId: string,
        filePath: string,
        options: {
            expiresInMinutes?: number;
            maxDownloads?: number;
            userId?: string;
        } = {}
    ): FileOperationResult {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            const secureLink = FileDownloadService.generateSecureDownloadLink(
                fileId,
                filePath,
                options
            );

            return {
                success: true,
                details: secureLink
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate secure link'
            };
        }
    }

    /**
     * Cleanup files with specified options
     */
    static async cleanupFiles(options: CleanupOptions = {}): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            const cleanupResult = await FileCleanupService.performCleanup(options);

            return {
                success: true,
                details: cleanupResult
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Cleanup failed'
            };
        }
    }

    /**
     * Get file information
     */
    static async getFileInfo(filePath: string): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            const fileInfo = await FileStorageService.getFileInfo(filePath);

            return {
                success: true,
                details: fileInfo
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get file info'
            };
        }
    }

    /**
     * List files in directory
     */
    static async listFiles(
        relativePath: string = '',
        options: {
            recursive?: boolean;
            includeStats?: boolean;
            filter?: (name: string) => boolean;
        } = {}
    ): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            const files = await FileStorageService.listFiles(relativePath, options);

            return {
                success: true,
                details: { files }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list files'
            };
        }
    }

    /**
     * Delete file
     */
    static async deleteFile(filePath: string): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            await FileStorageService.deleteFile(filePath);

            // TODO: Update metadata when database is ready
            // await FileMetadataService.markFileAsDeleted(fileId, { userId });

            return {
                success: true,
                details: { deletedPath: filePath }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete file'
            };
        }
    }

    /**
     * Copy file
     */
    static async copyFile(
        sourceRelativePath: string,
        destinationOptions: {
            campaignId?: number;
            batchId?: number;
            userId?: string;
            fileType?: string;
            originalName?: string;
        }
    ): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            const copyResult = await FileStorageService.copyFile(
                sourceRelativePath,
                destinationOptions
            );

            return {
                success: true,
                details: copyResult
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to copy file'
            };
        }
    }

    /**
     * Move file
     */
    static async moveFile(
        sourceRelativePath: string,
        destinationOptions: {
            campaignId?: number;
            batchId?: number;
            userId?: string;
            fileType?: string;
            originalName?: string;
        }
    ): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            const moveResult = await FileStorageService.moveFile(
                sourceRelativePath,
                destinationOptions
            );

            return {
                success: true,
                details: moveResult
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to move file'
            };
        }
    }

    /**
     * Calculate disk usage
     */
    static async getDiskUsage(relativePath: string = ''): Promise<FileOperationResult> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            const usage = await FileStorageService.calculateDiskUsage(relativePath);

            return {
                success: true,
                details: usage
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to calculate disk usage'
            };
        }
    }

    /**
     * Get system status and statistics
     */
    static getSystemStatus(): {
        initialized: boolean;
        storage: any;
        cleanup: any;
        downloads: {
            activeTokens: number;
        };
    } {
        return {
            initialized: this.isInitialized,
            storage: this.isInitialized ? FileStorageService.getConfig() : null,
            cleanup: this.isInitialized ? FileCleanupService.getConfig() : null,
            downloads: {
                activeTokens: this.isInitialized ? FileDownloadService.getActiveTokensCount() : 0
            }
        };
    }

    /**
     * Shutdown file management system
     */
    static shutdown(): void {
        if (this.isInitialized) {
            FileCleanupService.stopAutomaticCleanup();
            this.isInitialized = false;
            console.log('FileManagementService shutdown complete');
        }
    }

    /**
     * Health check for file management system
     */
    static async healthCheck(): Promise<{
        status: 'healthy' | 'warning' | 'error';
        checks: {
            storage: boolean;
            cleanup: boolean;
            diskSpace: boolean;
        };
        details: any;
    }> {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }

            // Check storage
            const storageCheck = await this.testStorageHealth();

            // Check cleanup service
            const cleanupCheck = this.testCleanupHealth();

            // Check disk space
            const diskSpaceCheck = await this.testDiskSpaceHealth();

            const allHealthy = storageCheck && cleanupCheck && diskSpaceCheck;
            const anyIssues = !storageCheck || !cleanupCheck || !diskSpaceCheck;

            return {
                status: allHealthy ? 'healthy' : anyIssues ? 'warning' : 'error',
                checks: {
                    storage: storageCheck,
                    cleanup: cleanupCheck,
                    diskSpace: diskSpaceCheck
                },
                details: {
                    timestamp: new Date(),
                    systemStatus: this.getSystemStatus()
                }
            };

        } catch (error) {
            return {
                status: 'error',
                checks: {
                    storage: false,
                    cleanup: false,
                    diskSpace: false
                },
                details: {
                    error: error instanceof Error ? error.message : 'Health check failed'
                }
            };
        }
    }

    /**
     * Test storage health
     */
    private static async testStorageHealth(): Promise<boolean> {
        try {
            // Try to write a small test file
            const testBuffer = Buffer.from('health check');
            const result = await FileStorageService.storeFile(
                testBuffer,
                'health-check.txt',
                'text/plain',
                { isTemporary: true }
            );

            // Clean up test file
            await FileStorageService.deleteFile(result.filePath);

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Test cleanup health
     */
    private static testCleanupHealth(): boolean {
        try {
            const cleanupStats = FileCleanupService.getCleanupStats();
            return cleanupStats.isRunning === FileCleanupService.getConfig().enableAutomaticCleanup;
        } catch (error) {
            return false;
        }
    }

    /**
     * Test disk space health
     */
    private static async testDiskSpaceHealth(): Promise<boolean> {
        try {
            // const usage = await FileStorageService.calculateDiskUsage();
            // const config = FileStorageService.getConfig();

            // Warning if over 80% of max storage
            // const warningThreshold = config.maxStorageSize * 0.8;
            // return usage.totalSize < warningThreshold;

            // For now, return true as storage health check is disabled
            return true;
        } catch (error) {
            return false;
        }
    }
} 