"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidationErrors = handleValidationErrors;
exports.validate = validate;
exports.validatePagination = validatePagination;
exports.validateFileUpload = validateFileUpload;
exports.validateUuid = validateUuid;
exports.sanitizeBody = sanitizeBody;
exports.validateContentType = validateContentType;
const express_validator_1 = require("express-validator");
const errors_1 = require("@/utils/errors");
/**
 * Middleware to handle validation errors from express-validator
 */
function handleValidationErrors(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => {
            if (error.type === 'field') {
                return `${error.path}: ${error.msg}`;
            }
            return error.msg;
        });
        throw new errors_1.ValidationError('Validation failed', errorMessages);
    }
    next();
}
/**
 * Higher-order function to create validation middleware chain
 */
function validate(validations) {
    return [...validations, handleValidationErrors];
}
/**
 * Pagination validation middleware
 */
function validatePagination(req, res, next) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    // Validate page
    if (page < 1) {
        throw new errors_1.ValidationError('Page must be greater than 0');
    }
    // Validate limit (max 100 to prevent abuse)
    if (limit < 1 || limit > 100) {
        throw new errors_1.ValidationError('Limit must be between 1 and 100');
    }
    // Add validated values to request
    req.query.page = page.toString();
    req.query.limit = limit.toString();
    next();
}
/**
 * File upload validation middleware
 */
function validateFileUpload(allowedTypes = ['text/csv'], maxSize = 10 * 1024 * 1024 // 10MB default
) {
    return (req, res, next) => {
        if (!req.file) {
            throw new errors_1.ValidationError('No file uploaded');
        }
        // Check file type - be flexible with MIME type detection
        const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
        const isValidMimeType = allowedTypes.includes(req.file.mimetype);
        // Accept if MIME type is correct OR if it's a CSV file with common misdetected MIME types
        const isValidCSV = fileExtension === 'csv' &&
            (req.file.mimetype === 'text/csv' ||
                req.file.mimetype === 'application/octet-stream' ||
                req.file.mimetype === 'text/plain');
        if (!isValidMimeType && !isValidCSV) {
            throw new errors_1.ValidationError(`Invalid file type. Please upload a CSV file. Detected: ${req.file.mimetype}`);
        }
        // Check file size
        if (req.file.size > maxSize) {
            throw new errors_1.ValidationError(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
        }
        next();
    };
}
/**
 * Custom validation for UUID parameters
 */
function validateUuid(paramName) {
    return (req, res, next) => {
        const uuid = req.params[paramName];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuid || !uuidRegex.test(uuid)) {
            throw new errors_1.ValidationError(`Invalid ${paramName} format`);
        }
        next();
    };
}
/**
 * Sanitize request body by removing unwanted fields
 */
function sanitizeBody(allowedFields) {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            const sanitized = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    sanitized[field] = req.body[field];
                }
            }
            req.body = sanitized;
        }
        next();
    };
}
/**
 * Validate request content type
 */
function validateContentType(expectedType = 'application/json') {
    return (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'DELETE') {
            const contentType = req.headers['content-type'];
            if (!contentType || !contentType.includes(expectedType)) {
                throw new errors_1.ValidationError(`Invalid content type. Expected: ${expectedType}`);
            }
        }
        next();
    };
}
