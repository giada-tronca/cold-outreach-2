"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManagementService = void 0;
const fileStorageService_1 = require("./fileStorageService");
const fileDownloadService_1 = require("./fileDownloadService");
const fileCleanupService_1 = require("./fileCleanupService");
const errors_1 = require("@/utils/errors");
class FileManagementService {
    /**
     * Initialize the file management system
     */
    static initialize(config = {}) {
        if (this.isInitialized) {
            console.warn('FileManagementService already initialized');
            return;
        }
        // Initialize storage service
        if (config.storage) {
            fileStorageService_1.FileStorageService.initialize(config.storage);
        }
        else {
            fileStorageService_1.FileStorageService.initialize();
        }
        // Initialize cleanup service
        if (config.cleanup) {
            fileCleanupService_1.FileCleanupService.initialize(config.cleanup);
        }
        else {
            fileCleanupService_1.FileCleanupService.initialize();
        }
        this.isInitialized = true;
        console.log('FileManagementService initialized successfully');
    }
    /**
     * Upload and store file with full tracking
     */
    static async uploadFile(buffer, originalName, mimeType, options) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            // Store file
            const storageResult = await fileStorageService_1.FileStorageService.storeFile(buffer, originalName, mimeType, {
                campaignId: options.campaignId,
                batchId: options.batchId,
                userId: options.userId,
                fileType: options.fileType,
                isTemporary: options.isTemporary
            });
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed'
            };
        }
    }
    /**
     * Download file with access control and tracking
     */
    static async downloadFile(filePath, response, options = {}) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            // Check file access
            const hasAccess = await fileDownloadService_1.FileDownloadService.checkFileAccess(filePath, {
                userId: options.userId,
                requiredPermission: 'download'
            });
            if (!hasAccess) {
                throw new errors_1.BadRequestError('Access denied to file');
            }
            // Download file
            const downloadResult = await fileDownloadService_1.FileDownloadService.downloadFile(filePath, response, options);
            return {
                success: true,
                details: downloadResult
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Download failed'
            };
        }
    }
    /**
     * Generate secure download link
     */
    static generateSecureDownloadLink(fileId, filePath, options = {}) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            const secureLink = fileDownloadService_1.FileDownloadService.generateSecureDownloadLink(fileId, filePath, options);
            return {
                success: true,
                details: secureLink
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate secure link'
            };
        }
    }
    /**
     * Cleanup files with specified options
     */
    static async cleanupFiles(options = {}) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            const cleanupResult = await fileCleanupService_1.FileCleanupService.performCleanup(options);
            return {
                success: true,
                details: cleanupResult
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Cleanup failed'
            };
        }
    }
    /**
     * Get file information
     */
    static async getFileInfo(filePath) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            const fileInfo = await fileStorageService_1.FileStorageService.getFileInfo(filePath);
            return {
                success: true,
                details: fileInfo
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get file info'
            };
        }
    }
    /**
     * List files in directory
     */
    static async listFiles(relativePath = '', options = {}) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            const files = await fileStorageService_1.FileStorageService.listFiles(relativePath, options);
            return {
                success: true,
                details: { files }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list files'
            };
        }
    }
    /**
     * Delete file
     */
    static async deleteFile(filePath) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            await fileStorageService_1.FileStorageService.deleteFile(filePath);
            // TODO: Update metadata when database is ready
            // await FileMetadataService.markFileAsDeleted(fileId, { userId });
            return {
                success: true,
                details: { deletedPath: filePath }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete file'
            };
        }
    }
    /**
     * Copy file
     */
    static async copyFile(sourceRelativePath, destinationOptions) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            const copyResult = await fileStorageService_1.FileStorageService.copyFile(sourceRelativePath, destinationOptions);
            return {
                success: true,
                details: copyResult
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to copy file'
            };
        }
    }
    /**
     * Move file
     */
    static async moveFile(sourceRelativePath, destinationOptions) {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            const moveResult = await fileStorageService_1.FileStorageService.moveFile(sourceRelativePath, destinationOptions);
            return {
                success: true,
                details: moveResult
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to move file'
            };
        }
    }
    /**
     * Calculate disk usage
     */
    static async getDiskUsage(relativePath = '') {
        try {
            if (!this.isInitialized) {
                this.initialize();
            }
            const usage = await fileStorageService_1.FileStorageService.calculateDiskUsage(relativePath);
            return {
                success: true,
                details: usage
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to calculate disk usage'
            };
        }
    }
    /**
     * Get system status and statistics
     */
    static getSystemStatus() {
        return {
            initialized: this.isInitialized,
            storage: this.isInitialized ? fileStorageService_1.FileStorageService.getConfig() : null,
            cleanup: this.isInitialized ? fileCleanupService_1.FileCleanupService.getConfig() : null,
            downloads: {
                activeTokens: this.isInitialized ? fileDownloadService_1.FileDownloadService.getActiveTokensCount() : 0
            }
        };
    }
    /**
     * Shutdown file management system
     */
    static shutdown() {
        if (this.isInitialized) {
            fileCleanupService_1.FileCleanupService.stopAutomaticCleanup();
            this.isInitialized = false;
            console.log('FileManagementService shutdown complete');
        }
    }
    /**
     * Health check for file management system
     */
    static async healthCheck() {
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
        }
        catch (error) {
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
    static async testStorageHealth() {
        try {
            // Try to write a small test file
            const testBuffer = Buffer.from('health check');
            const result = await fileStorageService_1.FileStorageService.storeFile(testBuffer, 'health-check.txt', 'text/plain', { isTemporary: true });
            // Clean up test file
            await fileStorageService_1.FileStorageService.deleteFile(result.filePath);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Test cleanup health
     */
    static testCleanupHealth() {
        try {
            const cleanupStats = fileCleanupService_1.FileCleanupService.getCleanupStats();
            return cleanupStats.isRunning === fileCleanupService_1.FileCleanupService.getConfig().enableAutomaticCleanup;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Test disk space health
     */
    static async testDiskSpaceHealth() {
        try {
            // const usage = await FileStorageService.calculateDiskUsage();
            // const config = FileStorageService.getConfig();
            // Warning if over 80% of max storage
            // const warningThreshold = config.maxStorageSize * 0.8;
            // return usage.totalSize < warningThreshold;
            // For now, return true as storage health check is disabled
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.FileManagementService = FileManagementService;
FileManagementService.isInitialized = false;
