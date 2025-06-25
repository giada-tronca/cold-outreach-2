"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobProcessingError = exports.ExternalServiceError = exports.DatabaseError = exports.TooManyRequestsError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.BadRequestError = exports.ValidationError = exports.AppError = void 0;
exports.isOperationalError = isOperationalError;
exports.getErrorDetails = getErrorDetails;
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, errors) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        if (errors) {
            this.errors = errors;
        }
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message = 'Validation failed', errors) {
        super(message, 422, true, errors);
    }
}
exports.ValidationError = ValidationError;
class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400, true);
    }
}
exports.BadRequestError = BadRequestError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, true);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, true);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, true);
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, true);
    }
}
exports.ConflictError = ConflictError;
class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, true);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, 500, true);
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends AppError {
    constructor(service, message = 'External service error') {
        super(message, 502, true);
        this.service = service;
    }
}
exports.ExternalServiceError = ExternalServiceError;
class JobProcessingError extends AppError {
    constructor(message = 'Job processing failed', jobId, jobType) {
        super(message, 500, true);
        if (jobId) {
            this.jobId = jobId;
        }
        if (jobType) {
            this.jobType = jobType;
        }
    }
}
exports.JobProcessingError = JobProcessingError;
/**
 * Utility function to check if an error is operational (safe to expose to client)
 */
function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}
/**
 * Utility function to extract error details for logging
 */
function getErrorDetails(error) {
    const details = {
        message: error.message,
        stack: error.stack
    };
    if (error instanceof AppError) {
        details.statusCode = error.statusCode;
        details.timestamp = error.timestamp;
        details.isOperational = error.isOperational;
        if (error.errors) {
            details.errors = error.errors;
        }
        // Add specific error details
        if (error instanceof ExternalServiceError) {
            details.service = error.service;
        }
        if (error instanceof JobProcessingError) {
            details.jobId = error.jobId;
            details.jobType = error.jobType;
        }
    }
    return details;
}
