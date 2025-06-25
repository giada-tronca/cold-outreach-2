"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileCleanupService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fileStorageService_1 = require("./fileStorageService");
const errors_1 = require("@/utils/errors");
class FileCleanupService {
    /**
     * Initialize cleanup service with configuration
     */
    static initialize(config = {}) {
        this.config = { ...this.DEFAULT_CONFIG, ...config };
        if (this.config.enableAutomaticCleanup) {
            this.startAutomaticCleanup();
        }
    }
    /**
     * Start automatic cleanup process
     */
    static startAutomaticCleanup() {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
        }
        this.cleanupIntervalId = setInterval(async () => {
            try {
                await this.performAutomaticCleanup();
            }
            catch (error) {
                console.error('Automatic cleanup failed:', error);
            }
        }, this.config.cleanupIntervalMinutes * 60 * 1000);
        console.log(`Automatic file cleanup started. Interval: ${this.config.cleanupIntervalMinutes} minutes`);
    }
    /**
     * Stop automatic cleanup process
     */
    static stopAutomaticCleanup() {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
            console.log('Automatic file cleanup stopped');
        }
    }
    /**
     * Perform comprehensive cleanup
     */
    static async performCleanup(options = {}) {
        const result = {
            filesDeleted: 0,
            spaceCleaned: 0,
            errors: [],
            details: []
        };
        try {
            // Cleanup temporary files
            if (options.includeTemporary !== false) {
                const tempResult = await this.cleanupTemporaryFiles(options);
                this.mergeResults(result, tempResult);
            }
            // Cleanup archived files
            if (options.includeArchived) {
                const archivedResult = await this.cleanupArchivedFiles(options);
                this.mergeResults(result, archivedResult);
            }
            // Cleanup deleted files
            if (options.includeDeleted) {
                const deletedResult = await this.cleanupDeletedFiles(options);
                this.mergeResults(result, deletedResult);
            }
            // Cleanup old files based on age
            if (options.olderThanDays) {
                const oldFilesResult = await this.cleanupOldFiles(options.olderThanDays, options);
                this.mergeResults(result, oldFilesResult);
            }
            // Cleanup by campaign or user
            if (options.campaignId || options.userId) {
                const targetedResult = await this.cleanupTargetedFiles(options);
                this.mergeResults(result, targetedResult);
            }
            return result;
        }
        catch (error) {
            result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }
    /**
     * Cleanup temporary files
     */
    static async cleanupTemporaryFiles(options = {}) {
        const result = {
            filesDeleted: 0,
            spaceCleaned: 0,
            errors: [],
            details: []
        };
        try {
            const cutoffTime = new Date();
            cutoffTime.setMinutes(cutoffTime.getMinutes() - this.config.tempFileRetentionMinutes);
            const files = await fileStorageService_1.FileStorageService.listFiles('temp', {
                recursive: true,
                includeStats: true
            });
            for (const file of files) {
                try {
                    if (!file.stats || file.stats.isDirectory)
                        continue;
                    if (file.stats.createdAt > cutoffTime)
                        continue;
                    if (!options.dryRun) {
                        await fileStorageService_1.FileStorageService.deleteFile(file.path);
                    }
                    result.filesDeleted++;
                    result.spaceCleaned += file.stats.size;
                    result.details.push({
                        filePath: file.path,
                        action: 'deleted',
                        reason: 'Temporary file cleanup',
                        size: file.stats.size
                    });
                }
                catch (error) {
                    const errorMsg = `Failed to delete ${file.path}`;
                    result.errors.push(errorMsg);
                }
            }
            return result;
        }
        catch (error) {
            result.errors.push('Failed to cleanup temporary files');
            return result;
        }
    }
    /**
     * Cleanup archived files
     */
    static async cleanupArchivedFiles(options = {}) {
        const result = {
            filesDeleted: 0,
            spaceCleaned: 0,
            errors: [],
            details: []
        };
        try {
            // This would typically query the database for archived files
            // For now, we'll implement basic file system cleanup
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.archivedFileRetentionDays);
            // Get all files and filter by age
            const allFiles = await fileStorageService_1.FileStorageService.listFiles('', {
                recursive: true,
                includeStats: true,
                filter: (name) => !name.startsWith('temp') && !name.startsWith('.')
            });
            let processedCount = 0;
            const maxFiles = options.maxFilesToProcess || Infinity;
            for (const file of allFiles) {
                if (processedCount >= maxFiles)
                    break;
                try {
                    if (!file.stats || file.stats.isDirectory)
                        continue;
                    if (file.stats.createdAt > cutoffDate)
                        continue;
                    // Check if file looks like it should be archived (based on naming convention)
                    if (!file.name.includes('archive') && !file.path.includes('archive'))
                        continue;
                    const fullPath = path_1.default.join(fileStorageService_1.FileStorageService.getConfig().baseDir, file.path);
                    if (!options.dryRun) {
                        await fs_1.default.promises.unlink(fullPath);
                    }
                    result.filesDeleted++;
                    result.spaceCleaned += file.stats.size;
                    result.details.push({
                        filePath: file.path,
                        action: 'deleted',
                        reason: `Archived file older than ${this.config.archivedFileRetentionDays} days`,
                        size: file.stats.size
                    });
                    processedCount++;
                }
                catch (error) {
                    const errorMsg = `Failed to delete archived file ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    result.details.push({
                        filePath: file.path,
                        action: 'error',
                        reason: errorMsg
                    });
                }
            }
            return result;
        }
        catch (error) {
            result.errors.push(`Failed to cleanup archived files: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }
    /**
     * Cleanup deleted files (permanent deletion)
     */
    static async cleanupDeletedFiles(options = {}) {
        const result = {
            filesDeleted: 0,
            spaceCleaned: 0,
            errors: [],
            details: []
        };
        try {
            // This would typically query the database for files marked as deleted
            // and permanently remove them after the retention period
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.deletedFileRetentionDays);
            // For demonstration, we'll look for files in a 'deleted' directory
            const deletedFiles = await fileStorageService_1.FileStorageService.listFiles('deleted', {
                recursive: true,
                includeStats: true
            }).catch(() => []); // Ignore if deleted directory doesn't exist
            let processedCount = 0;
            const maxFiles = options.maxFilesToProcess || Infinity;
            for (const file of deletedFiles) {
                if (processedCount >= maxFiles)
                    break;
                try {
                    if (!file.stats || file.stats.isDirectory)
                        continue;
                    if (file.stats.modifiedAt > cutoffDate)
                        continue;
                    const fullPath = path_1.default.join(fileStorageService_1.FileStorageService.getConfig().baseDir, file.path);
                    if (!options.dryRun) {
                        await fs_1.default.promises.unlink(fullPath);
                    }
                    result.filesDeleted++;
                    result.spaceCleaned += file.stats.size;
                    result.details.push({
                        filePath: file.path,
                        action: 'deleted',
                        reason: `Deleted file older than ${this.config.deletedFileRetentionDays} days (permanent removal)`,
                        size: file.stats.size
                    });
                    processedCount++;
                }
                catch (error) {
                    const errorMsg = `Failed to permanently delete ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    result.details.push({
                        filePath: file.path,
                        action: 'error',
                        reason: errorMsg
                    });
                }
            }
            return result;
        }
        catch (error) {
            result.errors.push(`Failed to cleanup deleted files: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }
    /**
     * Cleanup old files based on age
     */
    static async cleanupOldFiles(olderThanDays, options = {}) {
        const result = {
            filesDeleted: 0,
            spaceCleaned: 0,
            errors: [],
            details: []
        };
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const allFiles = await fileStorageService_1.FileStorageService.listFiles('', {
                recursive: true,
                includeStats: true,
                filter: (name) => !name.startsWith('.') && !name.includes('template')
            });
            let processedCount = 0;
            const maxFiles = options.maxFilesToProcess || Infinity;
            for (const file of allFiles) {
                if (processedCount >= maxFiles)
                    break;
                try {
                    if (!file.stats || file.stats.isDirectory)
                        continue;
                    if (file.stats.createdAt > cutoffDate)
                        continue;
                    const fullPath = path_1.default.join(fileStorageService_1.FileStorageService.getConfig().baseDir, file.path);
                    if (!options.dryRun) {
                        await fs_1.default.promises.unlink(fullPath);
                    }
                    result.filesDeleted++;
                    result.spaceCleaned += file.stats.size;
                    result.details.push({
                        filePath: file.path,
                        action: 'deleted',
                        reason: `File older than ${olderThanDays} days`,
                        size: file.stats.size
                    });
                    processedCount++;
                }
                catch (error) {
                    const errorMsg = `Failed to delete old file ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    result.details.push({
                        filePath: file.path,
                        action: 'error',
                        reason: errorMsg
                    });
                }
            }
            return result;
        }
        catch (error) {
            result.errors.push(`Failed to cleanup old files: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }
    /**
     * Cleanup files for specific campaign or user
     */
    static async cleanupTargetedFiles(options) {
        const result = {
            filesDeleted: 0,
            spaceCleaned: 0,
            errors: [],
            details: []
        };
        try {
            let targetPath = '';
            if (options.campaignId) {
                targetPath = `campaigns/${options.campaignId}`;
            }
            else if (options.userId) {
                targetPath = `users/${options.userId}`;
            }
            if (!targetPath) {
                result.errors.push('No campaign ID or user ID provided for targeted cleanup');
                return result;
            }
            const targetFiles = await fileStorageService_1.FileStorageService.listFiles(targetPath, {
                recursive: true,
                includeStats: true
            }).catch(() => []); // Ignore if directory doesn't exist
            let processedCount = 0;
            const maxFiles = options.maxFilesToProcess || Infinity;
            for (const file of targetFiles) {
                if (processedCount >= maxFiles)
                    break;
                try {
                    if (!file.stats || file.stats.isDirectory)
                        continue;
                    const fullPath = path_1.default.join(fileStorageService_1.FileStorageService.getConfig().baseDir, file.path);
                    if (!options.dryRun) {
                        await fs_1.default.promises.unlink(fullPath);
                    }
                    result.filesDeleted++;
                    result.spaceCleaned += file.stats.size;
                    result.details.push({
                        filePath: file.path,
                        action: 'deleted',
                        reason: `Targeted cleanup for ${options.campaignId ? 'campaign' : 'user'} ${options.campaignId || options.userId}`,
                        size: file.stats.size
                    });
                    processedCount++;
                }
                catch (error) {
                    const errorMsg = `Failed to delete targeted file ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    result.details.push({
                        filePath: file.path,
                        action: 'error',
                        reason: errorMsg
                    });
                }
            }
            return result;
        }
        catch (error) {
            result.errors.push(`Failed to cleanup targeted files: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }
    /**
     * Check storage usage and perform cleanup if needed
     */
    static async checkStorageAndCleanup() {
        try {
            const usage = await fileStorageService_1.FileStorageService.calculateDiskUsage();
            if (usage.totalSize <= this.config.maxStorageSize) {
                return {
                    filesDeleted: 0,
                    spaceCleaned: 0,
                    errors: [],
                    details: [{
                            filePath: 'storage-check',
                            action: 'archived',
                            reason: `Storage usage ${usage.totalSize} bytes is within limit of ${this.config.maxStorageSize} bytes`
                        }]
                };
            }
            // Storage is over limit, perform cleanup
            const cleanupOptions = {
                includeTemporary: true,
                includeArchived: true,
                olderThanDays: 7, // Start with files older than 7 days
                maxFilesToProcess: 1000
            };
            return await this.performCleanup(cleanupOptions);
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to check storage and cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Perform automatic cleanup
     */
    static async performAutomaticCleanup() {
        console.log('Starting automatic file cleanup...');
        try {
            const result = await this.performCleanup({
                includeTemporary: true,
                includeArchived: false,
                includeDeleted: false,
                dryRun: false,
                maxFilesToProcess: 500
            });
            console.log(`Automatic cleanup completed: ${result.filesDeleted} files deleted, ${result.spaceCleaned} bytes cleaned`);
            if (result.errors.length > 0) {
                console.warn('Cleanup errors:', result.errors);
            }
        }
        catch (error) {
            console.error('Automatic cleanup failed:', error);
        }
    }
    /**
     * Merge cleanup results
     */
    static mergeResults(target, source) {
        target.filesDeleted += source.filesDeleted;
        target.spaceCleaned += source.spaceCleaned;
        target.errors.push(...source.errors);
        target.details.push(...source.details);
    }
    /**
     * Get cleanup configuration
     */
    static getConfig() {
        return { ...this.config };
    }
    /**
     * Update cleanup configuration
     */
    static updateConfig(config) {
        this.config = { ...this.config, ...config };
        if (this.config.enableAutomaticCleanup && !this.cleanupIntervalId) {
            this.startAutomaticCleanup();
        }
        else if (!this.config.enableAutomaticCleanup && this.cleanupIntervalId) {
            this.stopAutomaticCleanup();
        }
    }
    /**
     * Get cleanup statistics
     */
    static getCleanupStats() {
        let nextCleanupEstimate;
        if (this.cleanupIntervalId) {
            nextCleanupEstimate = new Date();
            nextCleanupEstimate.setMinutes(nextCleanupEstimate.getMinutes() + this.config.cleanupIntervalMinutes);
        }
        return {
            isRunning: !!this.cleanupIntervalId,
            intervalMinutes: this.config.cleanupIntervalMinutes,
            nextCleanupEstimate,
            config: this.getConfig()
        };
    }
}
exports.FileCleanupService = FileCleanupService;
_a = FileCleanupService;
FileCleanupService.DEFAULT_CONFIG = {
    tempFileRetentionMinutes: 60, // 1 hour
    archivedFileRetentionDays: 90, // 3 months
    deletedFileRetentionDays: 30, // 1 month
    maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
    enableAutomaticCleanup: true,
    cleanupIntervalMinutes: 60 // 1 hour
};
FileCleanupService.config = _a.DEFAULT_CONFIG;
FileCleanupService.cleanupIntervalId = null;
