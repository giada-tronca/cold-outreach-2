import { Router } from 'express'
import { ApiResponseBuilder } from '@/utils/apiResponse'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '@/middleware/errorHandler'
import { validateFileUpload } from '@/middleware/validation'
import { fileUploadRateLimit } from '@/middleware/security'
import { BadRequestError, ValidationError } from '@/utils/errors'
import envConfig from '@/config/environment'
import { dataExportQueue } from '@/jobs/queues'
import csvParser from 'csv-parser'
import { createReadStream } from 'fs'

const router = Router()

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads')
const templatesDir = path.join(process.cwd(), 'public', 'templates')
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error)
fs.mkdir(templatesDir, { recursive: true }).catch(console.error)

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadsDir, { recursive: true })
            cb(null, uploadsDir)
        } catch (error) {
            cb(error as Error, uploadsDir)
        }
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4()
        const extension = path.extname(file.originalname)
        const filename = `${uniqueId}${extension}`
        cb(null, filename)
    }
})

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        // Check file type - be flexible with MIME type detection
        const allowedTypes = envConfig.ALLOWED_FILE_TYPES;
        const fileExtension = path.extname(file.originalname).toLowerCase();

        // Check by MIME type first
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true)
            return;
        }

        // Fallback: Check by file extension for CSV files
        if (fileExtension === '.csv' && (file.mimetype === 'application/octet-stream' || file.mimetype === 'text/plain')) {
            // Accept CSV files even if MIME type is incorrectly detected
            cb(null, true)
            return;
        }

        // Reject file
        cb(new ValidationError(`File type ${file.mimetype} not allowed. Please upload a CSV file (.csv extension). Detected MIME type: ${file.mimetype}`))
    },
    limits: {
        fileSize: envConfig.MAX_FILE_SIZE,
        files: 1, // Single file upload for now
    }
})

// File upload progress tracking (in-memory for demo, use Redis in production)
const uploadProgress = new Map<string, {
    uploadId: string
    filename: string
    progress: number
    status: 'uploading' | 'processing' | 'completed' | 'failed'
    message?: string
    fileId?: string
    createdAt: Date
}>()

/**
 * POST /api/uploads
 * Upload a file with progress tracking
 */
router.post('/',
    fileUploadRateLimit,
    upload.single('file'),
    validateFileUpload(),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new BadRequestError('No file uploaded')
        }

        const uploadId = uuidv4()
        const { originalname, filename, path: filePath, mimetype, size } = req.file

        // Initialize progress tracking
        uploadProgress.set(uploadId, {
            uploadId,
            filename: originalname,
            progress: 100, // Upload is complete at this point
            status: 'processing',
            message: 'File uploaded successfully, starting processing...',
            createdAt: new Date()
        })

        // Queue file for processing
        const jobData = {
            uploadId,
            originalName: originalname,
            filename,
            filePath,
            mimetype,
            size,
            userId: 'anonymous' // TODO: Get from authenticated user
        }

        try {
            console.log(`🐛 [Upload Debug]: File details - mimetype: "${mimetype}", filename: "${originalname}", size: ${size}`);

            // Store CSV file information but don't process prospects yet
            if (mimetype === 'text/csv' || originalname.toLowerCase().endsWith('.csv')) {
                console.log(`✅ [Upload Debug]: Detected CSV file, storing for later enrichment processing`);
                console.log(`📄 [Upload Debug]: CSV file will be processed when enrichment job is created`);
            } else {
                console.log(`⚠️ [Upload Debug]: Not a CSV file (mimetype: "${mimetype}"), using generic processing`);

                // Add to general data export queue for processing
                await dataExportQueue.add('process-file', {
                    userId: jobData.userId,
                    exportType: 'prospects' as const,
                    filters: { uploadId },
                    format: 'csv' as const
                }, {
                    priority: 3,
                    delay: 0,
                    attempts: 2
                })
            }

            // Update progress
            const progressData = uploadProgress.get(uploadId)
            if (progressData) {
                progressData.status = 'completed'
                progressData.message = 'File uploaded successfully'
            }

        } catch (error) {
            console.error('Failed to process file upload:', error)

            // Update progress with error
            const progressData = uploadProgress.get(uploadId)
            if (progressData) {
                progressData.status = 'failed'
                progressData.message = 'Failed to process file upload'
            }
        }

        return ApiResponseBuilder.success(res, {
            uploadId,
            message: 'File uploaded successfully and queued for processing',
            filename: originalname,
            size,
            mimetype
        }, 'File upload initiated', 202)
    })
)

/**
 * GET /api/uploads/:uploadId/progress
 * Get upload progress for a specific upload
 */
router.get('/:uploadId/progress', asyncHandler(async (req, res) => {
    const { uploadId } = req.params

    if (!uploadId) {
        throw new BadRequestError('Upload ID is required')
    }

    const progress = uploadProgress.get(uploadId)

    if (!progress) {
        throw new BadRequestError('Upload ID not found or expired')
    }

    return ApiResponseBuilder.success(res, progress, 'Upload progress retrieved')
}))

/**
 * GET /api/uploads/progress
 * Get progress for all active uploads (for the current user)
 */
router.get('/progress', asyncHandler(async (req, res) => {
    // In production, filter by user ID and use persistent storage
    const allProgress = Array.from(uploadProgress.values())
        .filter(p => {
            // Remove old entries (older than 1 hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
            return p.createdAt > oneHourAgo
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return ApiResponseBuilder.success(res, {
        uploads: allProgress,
        count: allProgress.length
    }, 'All upload progress retrieved')
}))

/**
 * DELETE /api/uploads/:uploadId
 * Cancel an upload or delete uploaded file
 */
router.delete('/:uploadId', asyncHandler(async (req, res) => {
    const { uploadId } = req.params

    if (!uploadId) {
        throw new BadRequestError('Upload ID is required')
    }

    const progress = uploadProgress.get(uploadId)

    if (!progress) {
        throw new BadRequestError('Upload ID not found')
    }

    // Remove from progress tracking
    uploadProgress.delete(uploadId)

    // Try to delete the physical file
    try {
        if (progress.fileId) {
            const filePath = path.join(uploadsDir, progress.fileId)
            await fs.unlink(filePath)
        }
    } catch (error) {
        console.error('Failed to delete file:', error)
        // Don't throw error if file deletion fails
    }

    return ApiResponseBuilder.success(res, { uploadId }, 'Upload cancelled and file deleted')
}))

/**
 * POST /api/uploads/validate
 * Validate file before upload (pre-flight check)
 */
router.post('/validate', asyncHandler(async (req, res) => {
    const { filename, size, mimetype } = req.body

    if (!filename || !size || !mimetype) {
        throw new BadRequestError('Missing file information: filename, size, and mimetype are required')
    }

    // Validate file type
    if (!envConfig.ALLOWED_FILE_TYPES.includes(mimetype)) {
        throw new ValidationError(`File type ${mimetype} not allowed. Allowed types: ${envConfig.ALLOWED_FILE_TYPES.join(', ')}`)
    }

    // Validate file size
    if (size > envConfig.MAX_FILE_SIZE) {
        throw new ValidationError(`File size ${size} bytes exceeds maximum allowed size of ${envConfig.MAX_FILE_SIZE} bytes`)
    }

    return ApiResponseBuilder.success(res, {
        valid: true,
        maxSize: envConfig.MAX_FILE_SIZE,
        allowedTypes: envConfig.ALLOWED_FILE_TYPES
    }, 'File validation passed')
}))

/**
 * GET /api/uploads/config
 * Get upload configuration for the frontend
 */
router.get('/config', asyncHandler(async (req, res) => {
    return ApiResponseBuilder.success(res, {
        maxFileSize: envConfig.MAX_FILE_SIZE,
        maxFileSizeMB: Math.floor(envConfig.MAX_FILE_SIZE / 1024 / 1024),
        allowedFileTypes: envConfig.ALLOWED_FILE_TYPES,
        allowedExtensions: envConfig.ALLOWED_FILE_TYPES.map(type => {
            const extensions: Record<string, string> = {
                'text/csv': '.csv',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'text/plain': '.txt'
            }
            return extensions[type] || type
        }).filter(Boolean)
    }, 'Upload configuration retrieved')
}))

/**
 * GET /api/uploads/template
 * Download CSV template file
 */
router.get('/template', asyncHandler(async (req, res) => {
    const templatePath = path.join(templatesDir, 'prospect-template.csv')

    try {
        // Check if template file exists
        await fs.access(templatePath)

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="prospect-template.csv"')

        // Stream the file
        res.sendFile(templatePath)
    } catch (error) {
        throw new BadRequestError('Template file not found')
    }
}))

/**
 * GET /api/uploads/:uploadId/preview
 * Get CSV preview and validation for an uploaded file
 */
router.get('/:uploadId/preview', asyncHandler(async (req, res) => {
    const { uploadId } = req.params

    if (!uploadId) {
        throw new BadRequestError('Upload ID is required')
    }

    const progress = uploadProgress.get(uploadId)

    if (!progress) {
        throw new BadRequestError('Upload ID not found')
    }

    // Find the actual file in uploads directory
    const files = await fs.readdir(uploadsDir)
    const uploadPrefix = uploadId.split('-')[0]
    const uploadFile = files.find(file => uploadPrefix && file.includes(uploadPrefix))

    if (!uploadFile) {
        throw new BadRequestError('Upload file not found')
    }

    const filePath = path.join(uploadsDir, uploadFile)

    try {
        // Parse CSV and create preview
        const headers: string[] = []
        const rows: string[][] = []
        let totalRows = 0
        let validRows = 0
        let invalidRows = 0
        const validationErrors: Array<{
            row: number
            column: string
            value: string
            error: string
            severity: 'error' | 'warning'
        }> = []

        const requiredColumns = [
            { name: 'Name', found: false, mapping: null as string | null },
            { name: 'Email', found: false, mapping: null as string | null },
            { name: 'Company', found: false, mapping: null as string | null },
            { name: 'Title', found: false, mapping: null as string | null }
        ]

        return new Promise((resolve, reject) => {
            createReadStream(filePath)
                .pipe(csvParser())
                .on('headers', (headerList: string[]) => {
                    headers.push(...headerList)

                    // Check for required columns
                    headerList.forEach(header => {
                        const normalizedHeader = header.toLowerCase().trim()

                        requiredColumns.forEach(req => {
                            const normalizedRequired = req.name.toLowerCase()
                            if (normalizedHeader.includes(normalizedRequired) ||
                                normalizedRequired.includes(normalizedHeader)) {
                                req.found = true
                                req.mapping = header
                            }
                        })
                    })
                })
                .on('data', (data: Record<string, string>) => {
                    totalRows++

                    if (rows.length < 10) { // Only store first 10 rows for preview
                        const rowData = headers.map(header => data[header] || '')
                        rows.push(rowData)
                    }

                    // Validate row data
                    let hasErrors = false
                    headers.forEach((header, index) => {
                        const value = data[header] || ''
                        const normalizedHeader = header.toLowerCase().trim()

                        // Email validation
                        if (normalizedHeader.includes('email') && value) {
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                            if (!emailRegex.test(value)) {
                                validationErrors.push({
                                    row: totalRows,
                                    column: header,
                                    value,
                                    error: 'Invalid email format',
                                    severity: 'error'
                                })
                                hasErrors = true
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
                            })
                            hasErrors = true
                        }

                        // Company validation
                        if (normalizedHeader.includes('company') && (!value || value.trim().length < 1)) {
                            validationErrors.push({
                                row: totalRows,
                                column: header,
                                value,
                                error: 'Company name is recommended',
                                severity: 'warning'
                            })
                        }
                    })

                    if (hasErrors) {
                        invalidRows++
                    } else {
                        validRows++
                    }
                })
                .on('end', () => {
                    // Update progress to completed
                    if (progress) {
                        progress.status = 'completed'
                        progress.progress = 100
                        progress.message = 'CSV processing completed'
                    }

                    resolve(ApiResponseBuilder.success(res, {
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
                    }, 'CSV preview generated successfully'))
                })
                .on('error', (error: Error) => {
                    console.error('CSV parsing error:', error)

                    // Update progress to failed
                    if (progress) {
                        progress.status = 'failed'
                        progress.message = 'Failed to parse CSV file'
                    }

                    reject(new BadRequestError('Failed to parse CSV file: ' + error.message))
                })
        })

    } catch (error) {
        console.error('Failed to generate CSV preview:', error)
        throw new BadRequestError('Failed to generate CSV preview')
    }
}))

// Clean up old progress entries periodically
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    for (const [uploadId, progress] of uploadProgress.entries()) {
        if (progress.createdAt < oneHourAgo) {
            uploadProgress.delete(uploadId)
        }
    }
}, 15 * 60 * 1000) // Clean up every 15 minutes

export default router 