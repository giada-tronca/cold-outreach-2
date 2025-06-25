import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppError, BadRequestError } from '@/utils/errors';

export interface FileStorageConfig {
    baseDir: string;
    maxFileSize: number;
    allowedMimeTypes: string[];
    retentionDays: number;
    compressionEnabled: boolean;
}

export interface StorageResult {
    fileId: string;
    filePath: string;
    fileName: string;
    checksum: string;
    size: number;
}

export interface FileInfo {
    exists: boolean;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    isDirectory: boolean;
    checksum?: string;
}

export class FileStorageService {
    private static readonly DEFAULT_CONFIG: FileStorageConfig = {
        baseDir: path.join(process.cwd(), 'uploads'),
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

    private static config: FileStorageConfig = this.DEFAULT_CONFIG;

    /**
     * Initialize storage with custom configuration
     */
    static initialize(config: Partial<FileStorageConfig> = {}): void {
        this.config = { ...this.DEFAULT_CONFIG, ...config };
        this.ensureDirectoriesExist();
    }

    /**
     * Store a file in the organized directory structure
     */
    static async storeFile(
        buffer: Buffer,
        originalName: string,
        mimeType: string,
        options: {
            campaignId?: number;
            batchId?: number;
            userId?: string;
            fileType?: string;
            isTemporary?: boolean;
        } = {}
    ): Promise<StorageResult> {
        try {
            // Validate file
            this.validateFile(buffer, mimeType);

            // Generate file metadata
            const fileId = this.generateFileId();
            const checksum = this.calculateChecksum(buffer);
            const fileExtension = path.extname(originalName);
            const fileName = `${fileId}${fileExtension}`;

            // Determine storage path
            const storagePath = this.getStoragePath(options);
            const filePath = path.join(storagePath, fileName);

            // Ensure directory exists
            await this.ensureDirectoryExists(storagePath);

            // Write file
            await fs.promises.writeFile(filePath, buffer);

            return {
                fileId,
                filePath: path.relative(this.config.baseDir, filePath),
                fileName,
                checksum,
                size: buffer.length
            };

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Failed to store file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Store file from upload path
     */
    static async storeFileFromPath(
        sourcePath: string,
        originalName: string,
        mimeType: string,
        options: {
            campaignId?: number;
            batchId?: number;
            userId?: string;
            fileType?: string;
            isTemporary?: boolean;
            moveFile?: boolean;
        } = {}
    ): Promise<StorageResult> {
        try {
            // Read file
            const buffer = await fs.promises.readFile(sourcePath);

            // Store file
            const result = await this.storeFile(buffer, originalName, mimeType, options);

            // Move or delete source file if requested
            if (options.moveFile) {
                try {
                    await fs.promises.unlink(sourcePath);
                } catch (error) {
                    console.warn(`Failed to delete source file ${sourcePath}:`, error);
                }
            }

            return result;

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Failed to store file from path: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Retrieve file information
     */
    static async getFileInfo(relativePath: string): Promise<FileInfo> {
        try {
            const fullPath = path.join(this.config.baseDir, relativePath);

            if (!fs.existsSync(fullPath)) {
                return {
                    exists: false,
                    size: 0,
                    createdAt: new Date(),
                    modifiedAt: new Date(),
                    isDirectory: false
                };
            }

            const stats = await fs.promises.stat(fullPath);
            let checksum: string | undefined;

            if (!stats.isDirectory()) {
                const buffer = await fs.promises.readFile(fullPath);
                checksum = this.calculateChecksum(buffer);
            }

            const result: FileInfo = {
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

        } catch (error) {
            throw new AppError(
                `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Read file content
     */
    static async readFile(relativePath: string): Promise<Buffer> {
        try {
            const fullPath = path.join(this.config.baseDir, relativePath);

            if (!fs.existsSync(fullPath)) {
                throw new BadRequestError('File not found');
            }

            return await fs.promises.readFile(fullPath);

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Copy file to new location
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
    ): Promise<StorageResult> {
        try {
            const sourceFullPath = path.join(this.config.baseDir, sourceRelativePath);

            if (!fs.existsSync(sourceFullPath)) {
                throw new BadRequestError('Source file not found');
            }

            const buffer = await fs.promises.readFile(sourceFullPath);
            const originalName = destinationOptions.originalName || path.basename(sourceRelativePath);

            // Determine MIME type from extension
            const mimeType = this.getMimeTypeFromExtension(path.extname(originalName));

            return await this.storeFile(buffer, originalName, mimeType, destinationOptions);

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Move file to new location
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
    ): Promise<StorageResult> {
        try {
            const result = await this.copyFile(sourceRelativePath, destinationOptions);

            // Delete source file
            await this.deleteFile(sourceRelativePath);

            return result;

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Delete file
     */
    static async deleteFile(relativePath: string): Promise<void> {
        try {
            const fullPath = path.join(this.config.baseDir, relativePath);

            if (fs.existsSync(fullPath)) {
                await fs.promises.unlink(fullPath);
            }

        } catch (error) {
            throw new AppError(
                `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
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
    ): Promise<Array<{ name: string; path: string; stats?: FileInfo }>> {
        try {
            const fullPath = path.join(this.config.baseDir, relativePath);

            if (!fs.existsSync(fullPath)) {
                return [];
            }

            const items = await fs.promises.readdir(fullPath);
            const results: Array<{ name: string; path: string; stats?: FileInfo }> = [];

            for (const item of items) {
                if (options.filter && !options.filter(item)) {
                    continue;
                }

                const itemPath = path.join(relativePath, item);
                const result: { name: string; path: string; stats?: FileInfo } = {
                    name: item,
                    path: itemPath
                };

                if (options.includeStats) {
                    result.stats = await this.getFileInfo(itemPath);
                }

                results.push(result);

                // Recursive listing
                if (options.recursive) {
                    const itemFullPath = path.join(fullPath, item);
                    const stats = await fs.promises.stat(itemFullPath);

                    if (stats.isDirectory()) {
                        const subItems = await this.listFiles(itemPath, options);
                        results.push(...subItems);
                    }
                }
            }

            return results;

        } catch (error) {
            throw new AppError(
                `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Calculate disk usage
     */
    static async calculateDiskUsage(relativePath: string = ''): Promise<{
        totalSize: number;
        fileCount: number;
        directoryCount: number;
    }> {
        try {
            const fullPath = path.join(this.config.baseDir, relativePath);

            if (!fs.existsSync(fullPath)) {
                return { totalSize: 0, fileCount: 0, directoryCount: 0 };
            }

            let totalSize = 0;
            let fileCount = 0;
            let directoryCount = 0;

            const calculateRecursive = async (dirPath: string): Promise<void> => {
                const items = await fs.promises.readdir(dirPath);

                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    const stats = await fs.promises.stat(itemPath);

                    if (stats.isDirectory()) {
                        directoryCount++;
                        await calculateRecursive(itemPath);
                    } else {
                        fileCount++;
                        totalSize += stats.size;
                    }
                }
            };

            await calculateRecursive(fullPath);

            return { totalSize, fileCount, directoryCount };

        } catch (error) {
            throw new AppError(
                `Failed to calculate disk usage: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Validate file before storage
     */
    private static validateFile(buffer: Buffer, mimeType: string): void {
        // Check file size
        if (buffer.length > this.config.maxFileSize) {
            throw new BadRequestError(
                `File size ${buffer.length} exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
            );
        }

        // Check MIME type
        if (this.config.allowedMimeTypes.length > 0 && !this.config.allowedMimeTypes.includes(mimeType)) {
            throw new BadRequestError(
                `File type ${mimeType} is not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`
            );
        }

        // Check for empty file
        if (buffer.length === 0) {
            throw new BadRequestError('Cannot store empty file');
        }
    }

    /**
     * Generate unique file ID
     */
    private static generateFileId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `${timestamp}_${random}`;
    }

    /**
     * Calculate file checksum (SHA-256)
     */
    private static calculateChecksum(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Get organized storage path based on options
     */
    private static getStoragePath(options: {
        campaignId?: number;
        batchId?: number;
        userId?: string;
        fileType?: string;
        isTemporary?: boolean;
    }): string {
        const basePath = this.config.baseDir;

        if (options.isTemporary) {
            return path.join(basePath, 'temp');
        }

        if (options.campaignId) {
            if (options.batchId) {
                return path.join(basePath, 'campaigns', options.campaignId.toString(), 'batches', options.batchId.toString());
            }
            return path.join(basePath, 'campaigns', options.campaignId.toString());
        }

        if (options.userId) {
            return path.join(basePath, 'users', options.userId);
        }

        if (options.fileType) {
            return path.join(basePath, 'types', options.fileType);
        }

        return path.join(basePath, 'general');
    }

    /**
     * Ensure directory exists
     */
    private static async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
        } catch (error) {
            throw new AppError(
                `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Ensure required directories exist
     */
    private static ensureDirectoriesExist(): void {
        const requiredDirs = [
            this.config.baseDir,
            path.join(this.config.baseDir, 'temp'),
            path.join(this.config.baseDir, 'campaigns'),
            path.join(this.config.baseDir, 'users'),
            path.join(this.config.baseDir, 'types'),
            path.join(this.config.baseDir, 'general'),
            path.join(this.config.baseDir, 'templates'),
            path.join(this.config.baseDir, 'exports')
        ];

        requiredDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Get MIME type from file extension
     */
    private static getMimeTypeFromExtension(extension: string): string {
        const mimeMap: Record<string, string> = {
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
    static getConfig(): FileStorageConfig {
        return { ...this.config };
    }

    /**
     * Update storage configuration
     */
    static updateConfig(config: Partial<FileStorageConfig>): void {
        this.config = { ...this.config, ...config };
        this.ensureDirectoriesExist();
    }
} 