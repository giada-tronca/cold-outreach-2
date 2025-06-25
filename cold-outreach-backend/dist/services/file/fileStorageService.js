"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const errors_1 = require("@/utils/errors");
class FileStorageService {
    /**
     * Initialize storage with custom configuration
     */
    static initialize(config = {}) {
        this.config = { ...this.DEFAULT_CONFIG, ...config };
        this.ensureDirectoriesExist();
    }
    /**
     * Store a file in the organized directory structure
     */
    static async storeFile(buffer, originalName, mimeType, options = {}) {
        try {
            // Validate file
            this.validateFile(buffer, mimeType);
            // Generate file metadata
            const fileId = this.generateFileId();
            const checksum = this.calculateChecksum(buffer);
            const fileExtension = path_1.default.extname(originalName);
            const fileName = `${fileId}${fileExtension}`;
            // Determine storage path
            const storagePath = this.getStoragePath(options);
            const filePath = path_1.default.join(storagePath, fileName);
            // Ensure directory exists
            await this.ensureDirectoryExists(storagePath);
            // Write file
            await fs_1.default.promises.writeFile(filePath, buffer);
            return {
                fileId,
                filePath: path_1.default.relative(this.config.baseDir, filePath),
                fileName,
                checksum,
                size: buffer.length
            };
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Failed to store file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Store file from upload path
     */
    static async storeFileFromPath(sourcePath, originalName, mimeType, options = {}) {
        try {
            // Read file
            const buffer = await fs_1.default.promises.readFile(sourcePath);
            // Store file
            const result = await this.storeFile(buffer, originalName, mimeType, options);
            // Move or delete source file if requested
            if (options.moveFile) {
                try {
                    await fs_1.default.promises.unlink(sourcePath);
                }
                catch (error) {
                    console.warn(`Failed to delete source file ${sourcePath}:`, error);
                }
            }
            return result;
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Failed to store file from path: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Retrieve file information
     */
    static async getFileInfo(relativePath) {
        try {
            const fullPath = path_1.default.join(this.config.baseDir, relativePath);
            if (!fs_1.default.existsSync(fullPath)) {
                return {
                    exists: false,
                    size: 0,
                    createdAt: new Date(),
                    modifiedAt: new Date(),
                    isDirectory: false
                };
            }
            const stats = await fs_1.default.promises.stat(fullPath);
            let checksum;
            if (!stats.isDirectory()) {
                const buffer = await fs_1.default.promises.readFile(fullPath);
                checksum = this.calculateChecksum(buffer);
            }
            const result = {
                exists: true,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                isDirectory: stats.isDirectory()
            };
            if (checksum) {
                result.checksum = checksum;
            }
            return result;
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Read file content
     */
    static async readFile(relativePath) {
        try {
            const fullPath = path_1.default.join(this.config.baseDir, relativePath);
            if (!fs_1.default.existsSync(fullPath)) {
                throw new errors_1.BadRequestError('File not found');
            }
            return await fs_1.default.promises.readFile(fullPath);
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Copy file to new location
     */
    static async copyFile(sourceRelativePath, destinationOptions) {
        try {
            const sourceFullPath = path_1.default.join(this.config.baseDir, sourceRelativePath);
            if (!fs_1.default.existsSync(sourceFullPath)) {
                throw new errors_1.BadRequestError('Source file not found');
            }
            const buffer = await fs_1.default.promises.readFile(sourceFullPath);
            const originalName = destinationOptions.originalName || path_1.default.basename(sourceRelativePath);
            // Determine MIME type from extension
            const mimeType = this.getMimeTypeFromExtension(path_1.default.extname(originalName));
            return await this.storeFile(buffer, originalName, mimeType, destinationOptions);
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Move file to new location
     */
    static async moveFile(sourceRelativePath, destinationOptions) {
        try {
            const result = await this.copyFile(sourceRelativePath, destinationOptions);
            // Delete source file
            await this.deleteFile(sourceRelativePath);
            return result;
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Delete file
     */
    static async deleteFile(relativePath) {
        try {
            const fullPath = path_1.default.join(this.config.baseDir, relativePath);
            if (fs_1.default.existsSync(fullPath)) {
                await fs_1.default.promises.unlink(fullPath);
            }
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * List files in directory
     */
    static async listFiles(relativePath = '', options = {}) {
        try {
            const fullPath = path_1.default.join(this.config.baseDir, relativePath);
            if (!fs_1.default.existsSync(fullPath)) {
                return [];
            }
            const items = await fs_1.default.promises.readdir(fullPath);
            const results = [];
            for (const item of items) {
                if (options.filter && !options.filter(item)) {
                    continue;
                }
                const itemPath = path_1.default.join(relativePath, item);
                const result = {
                    name: item,
                    path: itemPath
                };
                if (options.includeStats) {
                    result.stats = await this.getFileInfo(itemPath);
                }
                results.push(result);
                // Recursive listing
                if (options.recursive) {
                    const itemFullPath = path_1.default.join(fullPath, item);
                    const stats = await fs_1.default.promises.stat(itemFullPath);
                    if (stats.isDirectory()) {
                        const subItems = await this.listFiles(itemPath, options);
                        results.push(...subItems);
                    }
                }
            }
            return results;
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Calculate disk usage
     */
    static async calculateDiskUsage(relativePath = '') {
        try {
            const fullPath = path_1.default.join(this.config.baseDir, relativePath);
            if (!fs_1.default.existsSync(fullPath)) {
                return { totalSize: 0, fileCount: 0, directoryCount: 0 };
            }
            let totalSize = 0;
            let fileCount = 0;
            let directoryCount = 0;
            const calculateRecursive = async (dirPath) => {
                const items = await fs_1.default.promises.readdir(dirPath);
                for (const item of items) {
                    const itemPath = path_1.default.join(dirPath, item);
                    const stats = await fs_1.default.promises.stat(itemPath);
                    if (stats.isDirectory()) {
                        directoryCount++;
                        await calculateRecursive(itemPath);
                    }
                    else {
                        fileCount++;
                        totalSize += stats.size;
                    }
                }
            };
            await calculateRecursive(fullPath);
            return { totalSize, fileCount, directoryCount };
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to calculate disk usage: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Validate file before storage
     */
    static validateFile(buffer, mimeType) {
        // Check file size
        if (buffer.length > this.config.maxFileSize) {
            throw new errors_1.BadRequestError(`File size ${buffer.length} exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
        }
        // Check MIME type
        if (this.config.allowedMimeTypes.length > 0 && !this.config.allowedMimeTypes.includes(mimeType)) {
            throw new errors_1.BadRequestError(`File type ${mimeType} is not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`);
        }
        // Check for empty file
        if (buffer.length === 0) {
            throw new errors_1.BadRequestError('Cannot store empty file');
        }
    }
    /**
     * Generate unique file ID
     */
    static generateFileId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `${timestamp}_${random}`;
    }
    /**
     * Calculate file checksum (SHA-256)
     */
    static calculateChecksum(buffer) {
        return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
    }
    /**
     * Get organized storage path based on options
     */
    static getStoragePath(options) {
        const basePath = this.config.baseDir;
        if (options.isTemporary) {
            return path_1.default.join(basePath, 'temp');
        }
        if (options.campaignId) {
            if (options.batchId) {
                return path_1.default.join(basePath, 'campaigns', options.campaignId.toString(), 'batches', options.batchId.toString());
            }
            return path_1.default.join(basePath, 'campaigns', options.campaignId.toString());
        }
        if (options.userId) {
            return path_1.default.join(basePath, 'users', options.userId);
        }
        if (options.fileType) {
            return path_1.default.join(basePath, 'types', options.fileType);
        }
        return path_1.default.join(basePath, 'general');
    }
    /**
     * Ensure directory exists
     */
    static async ensureDirectoryExists(dirPath) {
        try {
            await fs_1.default.promises.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Ensure required directories exist
     */
    static ensureDirectoriesExist() {
        const requiredDirs = [
            this.config.baseDir,
            path_1.default.join(this.config.baseDir, 'temp'),
            path_1.default.join(this.config.baseDir, 'campaigns'),
            path_1.default.join(this.config.baseDir, 'users'),
            path_1.default.join(this.config.baseDir, 'types'),
            path_1.default.join(this.config.baseDir, 'general'),
            path_1.default.join(this.config.baseDir, 'templates'),
            path_1.default.join(this.config.baseDir, 'exports')
        ];
        requiredDirs.forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        });
    }
    /**
     * Get MIME type from file extension
     */
    static getMimeTypeFromExtension(extension) {
        const mimeMap = {
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        return mimeMap[extension.toLowerCase()] || 'application/octet-stream';
    }
    /**
     * Get storage configuration
     */
    static getConfig() {
        return { ...this.config };
    }
    /**
     * Update storage configuration
     */
    static updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.ensureDirectoriesExist();
    }
}
exports.FileStorageService = FileStorageService;
_a = FileStorageService;
FileStorageService.DEFAULT_CONFIG = {
    baseDir: path_1.default.join(process.cwd(), 'uploads'),
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: [
        'text/csv',
        'application/json',
        'text/plain',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    retentionDays: 30,
    compressionEnabled: false
};
FileStorageService.config = _a.DEFAULT_CONFIG;
