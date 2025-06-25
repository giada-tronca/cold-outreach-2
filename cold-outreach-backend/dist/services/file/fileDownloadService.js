"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDownloadService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fileStorageService_1 = require("./fileStorageService");
const errors_1 = require("@/utils/errors");
class FileDownloadService {
    /**
     * Download file directly to response
     */
    static async downloadFile(filePath, response, options = {}) {
        try {
            // Check if file exists
            const fileInfo = await fileStorageService_1.FileStorageService.getFileInfo(filePath);
            if (!fileInfo.exists) {
                throw new errors_1.NotFoundError('File not found');
            }
            // Read file
            const fileBuffer = await fileStorageService_1.FileStorageService.readFile(filePath);
            const fileName = options.customFilename || path_1.default.basename(filePath);
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
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Stream file download for large files
     */
    static async streamFileDownload(filePath, response, options = {}) {
        try {
            // Check if file exists
            const fileInfo = await fileStorageService_1.FileStorageService.getFileInfo(filePath);
            if (!fileInfo.exists) {
                throw new errors_1.NotFoundError('File not found');
            }
            const fullPath = path_1.default.join(fileStorageService_1.FileStorageService.getConfig().baseDir, filePath);
            const fileName = options.customFilename || path_1.default.basename(filePath);
            // Set response headers
            this.setDownloadHeaders(response, fileName, fileInfo.size, options.forceDownload);
            // Create read stream and pipe to response
            const readStream = fs_1.default.createReadStream(fullPath);
            readStream.on('error', (error) => {
                throw new errors_1.AppError(`Stream error: ${error.message}`, 500);
            });
            readStream.pipe(response);
            // Record download
            const downloadResult = {
                success: true,
                fileSize: fileInfo.size,
                downloadId: this.generateDownloadId(),
                timestamp: new Date()
            };
            // Track download statistics
            await this.recordDownloadStats(filePath, downloadResult, options);
            return downloadResult;
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Stream download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Generate secure download link
     */
    static generateSecureDownloadLink(fileId, filePath, options = {}) {
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
    static async downloadFileByToken(token, response, options = {}) {
        try {
            const tokenData = this.downloadTokens.get(token);
            if (!tokenData) {
                throw new errors_1.BadRequestError('Invalid or expired download token');
            }
            // Check if token is expired
            if (new Date() > tokenData.expiresAt) {
                this.downloadTokens.delete(token);
                throw new errors_1.BadRequestError('Download token has expired');
            }
            // Check download limit
            if (tokenData.maxDownloads && tokenData.currentDownloads >= tokenData.maxDownloads) {
                this.downloadTokens.delete(token);
                throw new errors_1.BadRequestError('Download limit exceeded');
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
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`Secure download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Download CSV template
     */
    static async downloadTemplate(templateName, response, options = {}) {
        try {
            const templatePath = path_1.default.join('..', 'public', 'templates', `${templateName}.csv`);
            return await this.downloadFile(templatePath, response, {
                ...options,
                customFilename: `${templateName}-template.csv`,
                forceDownload: true
            });
        }
        catch (error) {
            throw new errors_1.NotFoundError(`Template '${templateName}' not found`);
        }
    }
    /**
     * Bulk download as ZIP
     */
    static async downloadAsZip(filePaths, response, options = {}) {
        try {
            // This would require a ZIP library like 'archiver'
            // For now, we'll throw an error indicating it's not implemented
            throw new errors_1.AppError('Bulk ZIP download not yet implemented', 501);
        }
        catch (error) {
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(`ZIP download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Get download statistics
     */
    static async getDownloadStats(options = {}) {
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
        }
        catch (error) {
            throw new errors_1.AppError(`Failed to get download stats: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Check file access permissions
     */
    static async checkFileAccess(filePath, options = {}) {
        try {
            // Basic access check - file exists
            const fileInfo = await fileStorageService_1.FileStorageService.getFileInfo(filePath);
            if (!fileInfo.exists) {
                return false;
            }
            // Additional permission checks would go here
            // For now, we'll allow access if file exists
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Set download response headers
     */
    static setDownloadHeaders(response, fileName, fileSize, forceDownload) {
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
    static getMimeTypeFromFilename(fileName) {
        const extension = path_1.default.extname(fileName).toLowerCase();
        const mimeTypes = {
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
    static generateDownloadId() {
        return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate secure token
     */
    static generateSecureToken() {
        return `tok_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    }
    /**
     * Record download statistics
     */
    static async recordDownloadStats(filePath, downloadResult, options) {
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
        }
        catch (error) {
            console.warn('Failed to record download stats:', error);
        }
    }
    /**
     * Clean up expired tokens
     */
    static cleanupExpiredTokens() {
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
    static getActiveTokensCount() {
        this.cleanupExpiredTokens();
        return this.downloadTokens.size;
    }
    /**
     * Revoke download token
     */
    static revokeDownloadToken(token) {
        return this.downloadTokens.delete(token);
    }
    /**
     * Get download token info (without sensitive data)
     */
    static getDownloadTokenInfo(token) {
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
exports.FileDownloadService = FileDownloadService;
FileDownloadService.downloadTokens = new Map();
