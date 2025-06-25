"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = globalErrorHandler;
exports.asyncHandler = asyncHandler;
exports.notFoundHandler = notFoundHandler;
exports.requestIdHandler = requestIdHandler;
const errors_1 = require("@/utils/errors");
const apiResponse_1 = require("@/utils/apiResponse");
/**
 * Global error handling middleware
 * Should be the last middleware in the stack
 */
function globalErrorHandler(error, _req, res, next) {
    // Log error details
    console.error('Error occurred:', (0, errors_1.getErrorDetails)(error));
    // If response already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(error);
    }
    // Handle operational errors (safe to expose to client)
    if ((0, errors_1.isOperationalError)(error)) {
        const appError = error;
        // Return appropriate response based on status code
        switch (appError.statusCode) {
            case 400:
                apiResponse_1.ApiResponseBuilder.badRequest(res, appError.message, appError.errors);
                break;
            case 401:
                apiResponse_1.ApiResponseBuilder.unauthorized(res, appError.message);
                break;
            case 403:
                apiResponse_1.ApiResponseBuilder.forbidden(res, appError.message);
                break;
            case 404:
                apiResponse_1.ApiResponseBuilder.notFound(res, appError.message);
                break;
            case 409:
                apiResponse_1.ApiResponseBuilder.error(res, appError.message, 409, appError.errors);
                break;
            case 422:
                apiResponse_1.ApiResponseBuilder.validationError(res, appError.errors || [], appError.message);
                break;
            case 429:
                apiResponse_1.ApiResponseBuilder.tooManyRequests(res, appError.message);
                break;
            default:
                apiResponse_1.ApiResponseBuilder.error(res, appError.message, appError.statusCode, appError.errors);
        }
        return;
    }
    // Handle non-operational errors (don't expose details to client)
    const message = process.env.NODE_ENV === 'production'
        ? 'Something went wrong!'
        : error.message || 'Internal server error';
    apiResponse_1.ApiResponseBuilder.internalError(res, message);
}
/**
 * Middleware to catch async errors and pass them to error handler
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * Middleware to handle 404 errors for unmatched routes
 */
function notFoundHandler(req, _res, next) {
    const error = new errors_1.AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, true);
    next(error);
}
/**
 * Middleware to add request ID for tracking
 */
function requestIdHandler(req, res, next) {
    const requestId = req.headers['x-request-id'] ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
}
