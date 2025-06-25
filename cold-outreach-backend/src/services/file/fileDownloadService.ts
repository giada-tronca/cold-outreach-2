import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { FileStorageService } from './fileStorageService';
import { AppError, BadRequestError, NotFoundError } from '@/utils/errors';

export interface DownloadOptions {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    forceDownload?: boolean;
    customFilename?: string;
    accessToken?: string;
}

export interface DownloadResult {
    success: boolean;
    fileSize: number;
    downloadId: string;
    timestamp: Date;
    error?: string;
}

export interface SecureDownloadLink {
    downloadUrl: string;
    token: string;
    expiresAt: Date;
    fileId: string;
    maxDownloads?: number;
}

export interface DownloadStats {
    totalDownloads: number;
    uniqueUsers: number;
    totalBytes: number;
    topFiles: Array<{
        fileName: string;
        downloads: number;
        size: number;
    }>;
    recentDownloads: Array<{
        fileName: string;
        timestamp: Date;
        userId?: string;
        size: number;
    }>;
}

export class FileDownloadService {
    private static downloadTokens = new Map<string, {
        fileId: string;
        filePath: string;
        expiresAt: Date;
        maxDownloads?: number;
        currentDownloads: number;
        userId?: string;
    }>();

    /**
     * Download file directly to response
     */
    static async downloadFile(
        filePath: string,
        response: Response,
        options: DownloadOptions = {}
    ): Promise<DownloadResult> {
        try {
            // Check if file exists
            const fileInfo = await FileStorageService.getFileInfo(filePath);
            if (!fileInfo.exists) {
                throw new NotFoundError('File not found');
            }

            // Read file
            const fileBuffer = await FileStorageService.readFile(filePath);
            const fileName = options.customFilename || path.basename(filePath);

            // Set response headers
            this.setDownloadHeaders(response, fileName, fileBuffer.length, options.forceDownload);

            // Send file
            response.send(fileBuffer);

            // Track download statistics
            await this.recordDownloadStats(filePath, {
                success: true,
                fileSize: fileBuffer.length,
                downloadId: this.generateDownloadId(),
                timestamp: new Date()
            }, options);

            return {
                success: true,
                fileSize: fileBuffer.length,
                downloadId: this.generateDownloadId(),
                timestamp: new Date()
            };

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Stream file download for large files
     */
    static async streamFileDownload(
        filePath: string,
        response: Response,
        options: DownloadOptions = {}
    ): Promise<DownloadResult> {
        try {
            // Check if file exists
            const fileInfo = await FileStorageService.getFileInfo(filePath);
            if (!fileInfo.exists) {
                throw new NotFoundError('File not found');
            }

            const fullPath = path.join(FileStorageService.getConfig().baseDir, filePath);
            const fileName = options.customFilename || path.basename(filePath);

            // Set response headers
            this.setDownloadHeaders(response, fileName, fileInfo.size, options.forceDownload);

            // Create read stream and pipe to response
            const readStream = fs.createReadStream(fullPath);

            readStream.on('error', (error) => {
                throw new AppError(`Stream error: ${error.message}`, 500);
            });

            readStream.pipe(response);

            // Record download
            const downloadResult: DownloadResult = {
                success: true,
                fileSize: fileInfo.size,
                downloadId: this.generateDownloadId(),
                timestamp: new Date()
            };

            // Track download statistics
            await this.recordDownloadStats(filePath, downloadResult, options);

            return downloadResult;

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Stream download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
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
    ): SecureDownloadLink {
        const token = this.generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + (options.expiresInMinutes || 60));

        // Store token information
        this.downloadTokens.set(token, {
            fileId,
            filePath,
            expiresAt,
            maxDownloads: options.maxDownloads,
            currentDownloads: 0,
            userId: options.userId
        });

        return {
            downloadUrl: `/api/files/download/secure/${token}`,
            token,
            expiresAt,
            fileId,
            maxDownloads: options.maxDownloads
        };
    }

    /**
     * Download file using secure token
     */
    static async downloadFileByToken(
        token: string,
        response: Response,
        options: DownloadOptions = {}
    ): Promise<DownloadResult> {
        try {
            const tokenData = this.downloadTokens.get(token);

            if (!tokenData) {
                throw new BadRequestError('Invalid or expired download token');
            }

            // Check if token is expired
            if (new Date() > tokenData.expiresAt) {
                this.downloadTokens.delete(token);
                throw new BadRequestError('Download token has expired');
            }

            // Check download limit
            if (tokenData.maxDownloads && tokenData.currentDownloads >= tokenData.maxDownloads) {
                this.downloadTokens.delete(token);
                throw new BadRequestError('Download limit exceeded');
            }

            // Increment download count
            tokenData.currentDownloads++;

            // Download file
            const result = await this.downloadFile(tokenData.filePath, response, {
                ...options,
                userId: tokenData.userId
            });

            // Clean up token if it reached max downloads
            if (tokenData.maxDownloads && tokenData.currentDownloads >= tokenData.maxDownloads) {
                this.downloadTokens.delete(token);
            }

            return result;

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `Secure download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Download CSV template
     */
    static async downloadTemplate(
        templateName: string,
        response: Response,
        options: DownloadOptions = {}
    ): Promise<DownloadResult> {
        try {
            const templatePath = path.join('..', 'public', 'templates', `${templateName}.csv`);

            return await this.downloadFile(templatePath, response, {
                ...options,
                customFilename: `${templateName}-template.csv`,
                forceDownload: true
            });

        } catch (error) {
            throw new NotFoundError(`Template '${templateName}' not found`);
        }
    }

    /**
     * Bulk download as ZIP
     */
    static async downloadAsZip(
        filePaths: string[],
        response: Response,
        options: DownloadOptions & { zipFilename?: string } = {}
    ): Promise<DownloadResult> {
        try {
            // This would require a ZIP library like 'archiver'
            // For now, we'll throw an error indicating it's not implemented
            throw new AppError('Bulk ZIP download not yet implemented', 501);

        } catch (error) {
            throw error instanceof AppError ? error : new AppError(
                `ZIP download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Get download statistics
     */
    static async getDownloadStats(options: {
        dateRange?: { start: Date; end: Date };
        userId?: string;
        fileType?: string;
        limit?: number;
    } = {}): Promise<DownloadStats> {
        try {
            // This would typically query the database for download history
            // For now, we'll return mock statistics

            return {
                totalDownloads: 0,
                uniqueUsers: 0,
                totalBytes: 0,
                topFiles: [],
                recentDownloads: []
            };

        } catch (error) {
            throw new AppError(
                `Failed to get download stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    /**
     * Check file access permissions
     */
    static async checkFileAccess(
        filePath: string,
        options: {
            userId?: string;
            requiredPermission?: 'read' | 'download' | 'admin';
        } = {}
    ): Promise<boolean> {
        try {
            // Basic access check - file exists
            const fileInfo = await FileStorageService.getFileInfo(filePath);
            if (!fileInfo.exists) {
                return false;
            }

            // Additional permission checks would go here
            // For now, we'll allow access if file exists
            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Set download response headers
     */
    private static setDownloadHeaders(
        response: Response,
        fileName: string,
        fileSize: number,
        forceDownload?: boolean
    ): void {
        const disposition = forceDownload ? 'attachment' : 'inline';

        response.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
        response.setHeader('Content-Length', fileSize.toString());
        response.setHeader('Content-Type', this.getMimeTypeFromFilename(fileName));
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
    }

    /**
     * Get MIME type from filename
     */
    private static getMimeTypeFromFilename(fileName: string): string {
        const extension = path.extname(fileName).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.zip': 'application/zip'
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }

    /**
     * Generate unique download ID
     */
    private static generateDownloadId(): string {
        return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate secure token
     */
    private static generateSecureToken(): string {
        return `tok_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    }

    /**
     * Record download statistics
     */
    private static async recordDownloadStats(
        filePath: string,
        downloadResult: DownloadResult,
        options: DownloadOptions
    ): Promise<void> {
        try {
            // This would typically save to database
            // For now, we'll just log it
            console.log('Download recorded:', {
                filePath,
                downloadId: downloadResult.downloadId,
                timestamp: downloadResult.timestamp,
                fileSize: downloadResult.fileSize,
                userId: options.userId,
                ipAddress: options.ipAddress
            });

        } catch (error) {
            console.warn('Failed to record download stats:', error);
        }
    }

    /**
     * Clean up expired tokens
     */
    static cleanupExpiredTokens(): number {
        const now = new Date();
        let cleanedCount = 0;

        for (const [token, tokenData] of this.downloadTokens.entries()) {
            if (now > tokenData.expiresAt) {
                this.downloadTokens.delete(token);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * Get active download tokens count
     */
    static getActiveTokensCount(): number {
        this.cleanupExpiredTokens();
        return this.downloadTokens.size;
    }

    /**
     * Revoke download token
     */
    static revokeDownloadToken(token: string): boolean {
        return this.downloadTokens.delete(token);
    }

    /**
     * Get download token info (without sensitive data)
     */
    static getDownloadTokenInfo(token: string): {
        fileId: string;
        expiresAt: Date;
        maxDownloads?: number;
        currentDownloads: number;
    } | null {
        const tokenData = this.downloadTokens.get(token);

        if (!tokenData) {
            return null;
        }

        return {
            fileId: tokenData.fileId,
            expiresAt: tokenData.expiresAt,
            maxDownloads: tokenData.maxDownloads,
            currentDownloads: tokenData.currentDownloads
        };
    }
} 