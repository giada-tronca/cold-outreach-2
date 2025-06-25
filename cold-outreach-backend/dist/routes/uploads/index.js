"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiResponse_1 = require("@/utils/apiResponse");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
const errorHandler_1 = require("@/middleware/errorHandler");
const validation_1 = require("@/middleware/validation");
const security_1 = require("@/middleware/security");
const errors_1 = require("@/utils/errors");
const environment_1 = __importDefault(require("@/config/environment"));
const queues_1 = require("@/jobs/queues");
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = require("fs");
const router = (0, express_1.Router)();
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
const templatesDir = path_1.default.join(process.cwd(), 'public', 'templates');
promises_1.default.mkdir(uploadsDir, { recursive: true }).catch(console.error);
promises_1.default.mkdir(templatesDir, { recursive: true }).catch(console.error);
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await promises_1.default.mkdir(uploadsDir, { recursive: true });
            cb(null, uploadsDir);
        }
        catch (error) {
            cb(error, uploadsDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueId = (0, uuid_1.v4)();
        const extension = path_1.default.extname(file.originalname);
        const filename = `${uniqueId}${extension}`;
        cb(null, filename);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        // Check file type - be flexible with MIME type detection
        const allowedTypes = environment_1.default.ALLOWED_FILE_TYPES;
        const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
        // Check by MIME type first
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        // Fallback: Check by file extension for CSV files
        if (fileExtension === '.csv' && (file.mimetype === 'application/octet-stream' || file.mimetype === 'text/plain')) {
            // Accept CSV files even if MIME type is incorrectly detected
            cb(null, true);
            return;
        }
        // Reject file
        cb(new errors_1.ValidationError(`File type ${file.mimetype} not allowed. Please upload a CSV file (.csv extension). Detected MIME type: ${file.mimetype}`));
    },
    limits: {
        fileSize: environment_1.default.MAX_FILE_SIZE,
        files: 1, // Single file upload for now
    }
});
// File upload progress tracking (in-memory for demo, use Redis in production)
const uploadProgress = new Map();
/**
 * POST /api/uploads
 * Upload a file with progress tracking
 */
router.post('/', security_1.fileUploadRateLimit, upload.single('file'), (0, validation_1.validateFileUpload)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new errors_1.BadRequestError('No file uploaded');
    }
    const uploadId = (0, uuid_1.v4)();
    const { originalname, filename, path: filePath, mimetype, size } = req.file;
    // Initialize progress tracking
    uploadProgress.set(uploadId, {
        uploadId,
        filename: originalname,
        progress: 100, // Upload is complete at this point
        status: 'processing',
        message: 'File uploaded successfully, starting processing...',
        createdAt: new Date()
    });
    // Queue file for processing
    const jobData = {
        uploadId,
        originalName: originalname,
        filename,
        filePath,
        mimetype,
        size,
        userId: 'anonymous' // TODO: Get from authenticated user
    };
    try {
        console.log(`🐛 [Upload Debug]: File details - mimetype: "${mimetype}", filename: "${originalname}", size: ${size}`);
        // Add to CSV import queue if it's a CSV file
        if (mimetype === 'text/csv') {
            console.log(`✅ [Upload Debug]: Detected CSV file, queuing for CSV import processing`);
            await queues_1.csvImportQueue.add('process-csv', {
                filePath,
                userId: jobData.userId,
                mappingConfig: {}, // Default mapping
                workflowSessionId: uploadId
            }, {
                priority: 5,
                delay: 0,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                }
            });
            console.log(`📋 [Upload Debug]: CSV import job queued successfully`);
        }
        else {
            console.log(`⚠️ [Upload Debug]: Not a CSV file (mimetype: "${mimetype}"), using generic processing`);
            // Check if it's actually a CSV by extension
            const isCSVByExtension = originalname.toLowerCase().endsWith('.csv');
            if (isCSVByExtension) {
                console.log(`🔄 [Upload Debug]: File has .csv extension, forcing CSV processing despite mimetype`);
                await queues_1.csvImportQueue.add('process-csv', {
                    filePath,
                    userId: jobData.userId,
                    mappingConfig: {}, // Default mapping
                    workflowSessionId: uploadId
                }, {
                    priority: 5,
                    delay: 0,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    }
                });
                console.log(`📋 [Upload Debug]: CSV import job queued successfully (by extension)`);
            }
            else {
                // Add to general data export queue for processing
                await queues_1.dataExportQueue.add('process-file', {
                    userId: jobData.userId,
                    exportType: 'prospects',
                    filters: { uploadId },
                    format: 'csv'
                }, {
                    priority: 3,
                    delay: 0,
                    attempts: 2
                });
            }
        }
        // Update progress
        const progressData = uploadProgress.get(uploadId);
        if (progressData) {
            progressData.status = 'processing';
            progressData.message = 'File queued for processing';
        }
    }
    catch (error) {
        console.error('Failed to queue file for processing:', error);
        // Update progress with error
        const progressData = uploadProgress.get(uploadId);
        if (progressData) {
            progressData.status = 'failed';
            progressData.message = 'Failed to queue file for processing';
        }
    }
    return apiResponse_1.ApiResponseBuilder.success(res, {
        uploadId,
        message: 'File uploaded successfully and queued for processing',
        filename: originalname,
        size,
        mimetype
    }, 'File upload initiated', 202);
}));
/**
 * GET /api/uploads/:uploadId/progress
 * Get upload progress for a specific upload
 */
router.get('/:uploadId/progress', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { uploadId } = req.params;
    if (!uploadId) {
        throw new errors_1.BadRequestError('Upload ID is required');
    }
    const progress = uploadProgress.get(uploadId);
    if (!progress) {
        throw new errors_1.BadRequestError('Upload ID not found or expired');
    }
    return apiResponse_1.ApiResponseBuilder.success(res, progress, 'Upload progress retrieved');
}));
/**
 * GET /api/uploads/progress
 * Get progress for all active uploads (for the current user)
 */
router.get('/progress', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // In production, filter by user ID and use persistent storage
    const allProgress = Array.from(uploadProgress.values())
        .filter(p => {
        // Remove old entries (older than 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return p.createdAt > oneHourAgo;
    })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return apiResponse_1.ApiResponseBuilder.success(res, {
        uploads: allProgress,
        count: allProgress.length
    }, 'All upload progress retrieved');
}));
/**
 * DELETE /api/uploads/:uploadId
 * Cancel an upload or delete uploaded file
 */
router.delete('/:uploadId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { uploadId } = req.params;
    if (!uploadId) {
        throw new errors_1.BadRequestError('Upload ID is required');
    }
    const progress = uploadProgress.get(uploadId);
    if (!progress) {
        throw new errors_1.BadRequestError('Upload ID not found');
    }
    // Remove from progress tracking
    uploadProgress.delete(uploadId);
    // Try to delete the physical file
    try {
        if (progress.fileId) {
            const filePath = path_1.default.join(uploadsDir, progress.fileId);
            await promises_1.default.unlink(filePath);
        }
    }
    catch (error) {
        console.error('Failed to delete file:', error);
        // Don't throw error if file deletion fails
    }
    return apiResponse_1.ApiResponseBuilder.success(res, { uploadId }, 'Upload cancelled and file deleted');
}));
/**
 * POST /api/uploads/validate
 * Validate file before upload (pre-flight check)
 */
router.post('/validate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { filename, size, mimetype } = req.body;
    if (!filename || !size || !mimetype) {
        throw new errors_1.BadRequestError('Missing file information: filename, size, and mimetype are required');
    }
    // Validate file type
    if (!environment_1.default.ALLOWED_FILE_TYPES.includes(mimetype)) {
        throw new errors_1.ValidationError(`File type ${mimetype} not allowed. Allowed types: ${environment_1.default.ALLOWED_FILE_TYPES.join(', ')}`);
    }
    // Validate file size
    if (size > environment_1.default.MAX_FILE_SIZE) {
        throw new errors_1.ValidationError(`File size ${size} bytes exceeds maximum allowed size of ${environment_1.default.MAX_FILE_SIZE} bytes`);
    }
    return apiResponse_1.ApiResponseBuilder.success(res, {
        valid: true,
        maxSize: environment_1.default.MAX_FILE_SIZE,
        allowedTypes: environment_1.default.ALLOWED_FILE_TYPES
    }, 'File validation passed');
}));
/**
 * GET /api/uploads/config
 * Get upload configuration for the frontend
 */
router.get('/config', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    return apiResponse_1.ApiResponseBuilder.success(res, {
        maxFileSize: environment_1.default.MAX_FILE_SIZE,
        maxFileSizeMB: Math.floor(environment_1.default.MAX_FILE_SIZE / 1024 / 1024),
        allowedFileTypes: environment_1.default.ALLOWED_FILE_TYPES,
        allowedExtensions: environment_1.default.ALLOWED_FILE_TYPES.map(type => {
            const extensions = {
                'text/csv': '.csv',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'text/plain': '.txt'
            };
            return extensions[type] || type;
        }).filter(Boolean)
    }, 'Upload configuration retrieved');
}));
/**
 * GET /api/uploads/template
 * Download CSV template file
 */
router.get('/template', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const templatePath = path_1.default.join(templatesDir, 'prospect-template.csv');
    try {
        // Check if template file exists
        await promises_1.default.access(templatePath);
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="prospect-template.csv"');
        // Stream the file
        res.sendFile(templatePath);
    }
    catch (error) {
        throw new errors_1.BadRequestError('Template file not found');
    }
}));
/**
 * GET /api/uploads/:uploadId/preview
 * Get CSV preview and validation for an uploaded file
 */
router.get('/:uploadId/preview', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { uploadId } = req.params;
    if (!uploadId) {
        throw new errors_1.BadRequestError('Upload ID is required');
    }
    const progress = uploadProgress.get(uploadId);
    if (!progress) {
        throw new errors_1.BadRequestError('Upload ID not found');
    }
    // Find the actual file in uploads directory
    const files = await promises_1.default.readdir(uploadsDir);
    const uploadPrefix = uploadId.split('-')[0];
    const uploadFile = files.find(file => uploadPrefix && file.includes(uploadPrefix));
    if (!uploadFile) {
        throw new errors_1.BadRequestError('Upload file not found');
    }
    const filePath = path_1.default.join(uploadsDir, uploadFile);
    try {
        // Parse CSV and create preview
        const headers = [];
        const rows = [];
        let totalRows = 0;
        let validRows = 0;
        let invalidRows = 0;
        const validationErrors = [];
        const requiredColumns = [
            { name: 'Name', found: false, mapping: null },
            { name: 'Email', found: false, mapping: null },
            { name: 'Company', found: false, mapping: null },
            { name: 'Title', found: false, mapping: null }
        ];
        return new Promise((resolve, reject) => {
            (0, fs_1.createReadStream)(filePath)
                .pipe((0, csv_parser_1.default)())
                .on('headers', (headerList) => {
                headers.push(...headerList);
                // Check for required columns
                headerList.forEach(header => {
                    const normalizedHeader = header.toLowerCase().trim();
                    requiredColumns.forEach(req => {
                        const normalizedRequired = req.name.toLowerCase();
                        if (normalizedHeader.includes(normalizedRequired) ||
                            normalizedRequired.includes(normalizedHeader)) {
                            req.found = true;
                            req.mapping = header;
                        }
                    });
                });
            })
                .on('data', (data) => {
                totalRows++;
                if (rows.length < 10) { // Only store first 10 rows for preview
                    const rowData = headers.map(header => data[header] || '');
                    rows.push(rowData);
                }
                // Validate row data
                let hasErrors = false;
                headers.forEach((header, index) => {
                    const value = data[header] || '';
                    const normalizedHeader = header.toLowerCase().trim();
                    // Email validation
                    if (normalizedHeader.includes('email') && value) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                            validationErrors.push({
                                row: totalRows,
                                column: header,
                                value,
                                error: 'Invalid email format',
                                severity: 'error'
                            });
                            hasErrors = true;
                        }
                    }
                    // Name validation
                    if (normalizedHeader.includes('name') && (!value || value.trim().length < 2)) {
                        validationErrors.push({
                            row: totalRows,
                            column: header,
                            value,
                            error: 'Name is required and must be at least 2 characters',
                            severity: 'error'
                        });
                        hasErrors = true;
                    }
                    // Company validation
                    if (normalizedHeader.includes('company') && (!value || value.trim().length < 1)) {
                        validationErrors.push({
                            row: totalRows,
                            column: header,
                            value,
                            error: 'Company name is recommended',
                            severity: 'warning'
                        });
                    }
                });
                if (hasErrors) {
                    invalidRows++;
                }
                else {
                    validRows++;
                }
            })
                .on('end', () => {
                // Update progress to completed
                if (progress) {
                    progress.status = 'completed';
                    progress.progress = 100;
                    progress.message = 'CSV processing completed';
                }
                resolve(apiResponse_1.ApiResponseBuilder.success(res, {
                    preview: {
                        headers,
                        rows,
                        totalRows,
                        validRows,
                        invalidRows,
                        requiredColumns
                    },
                    validation: {
                        isValid: invalidRows === 0,
                        errors: validationErrors.slice(0, 100), // Limit to first 100 errors
                        summary: {
                            totalRows,
                            validRows,
                            invalidRows,
                            errorCount: validationErrors.filter(e => e.severity === 'error').length,
                            warningCount: validationErrors.filter(e => e.severity === 'warning').length
                        }
                    }
                }, 'CSV preview generated successfully'));
            })
                .on('error', (error) => {
                console.error('CSV parsing error:', error);
                // Update progress to failed
                if (progress) {
                    progress.status = 'failed';
                    progress.message = 'Failed to parse CSV file';
                }
                reject(new errors_1.BadRequestError('Failed to parse CSV file: ' + error.message));
            });
        });
    }
    catch (error) {
        console.error('Failed to generate CSV preview:', error);
        throw new errors_1.BadRequestError('Failed to generate CSV preview');
    }
}));
// Clean up old progress entries periodically
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [uploadId, progress] of uploadProgress.entries()) {
        if (progress.createdAt < oneHourAgo) {
            uploadProgress.delete(uploadId);
        }
    }
}, 15 * 60 * 1000); // Clean up every 15 minutes
exports.default = router;
