"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponseBuilder = void 0;
exports.calculatePagination = calculatePagination;
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
class ApiResponseBuilder {
    /**
     * Success response
     */
    static success(res, data, message = 'Success', statusCode = 200, meta) {
        const response = {
            success: true,
            message,
            ...(data !== undefined && { data }),
            meta: {
                timestamp: new Date().toISOString(),
                ...meta
            }
        };
        return res.status(statusCode).json(response);
    }
    /**
     * Created response (201)
     */
    static created(res, data, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }
    /**
     * No content response (204)
     */
    static noContent(res) {
        return res.status(204).send();
    }
    /**
     * Error response
     */
    static error(res, message = 'An error occurred', statusCode = 500, errors, data) {
        const response = {
            success: false,
            message,
            ...(errors && { errors }),
            ...(data !== undefined && { data }),
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        return res.status(statusCode).json(response);
    }
    /**
     * Bad request response (400)
     */
    static badRequest(res, message = 'Bad request', errors) {
        return this.error(res, message, 400, errors);
    }
    /**
     * Unauthorized response (401)
     */
    static unauthorized(res, message = 'Unauthorized') {
        return this.error(res, message, 401);
    }
    /**
     * Forbidden response (403)
     */
    static forbidden(res, message = 'Forbidden') {
        return this.error(res, message, 403);
    }
    /**
     * Not found response (404)
     */
    static notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404);
    }
    /**
     * Validation error response (422)
     */
    static validationError(res, errors, message = 'Validation failed') {
        return this.error(res, message, 422, errors);
    }
    /**
     * Too many requests response (429)
     */
    static tooManyRequests(res, message = 'Too many requests') {
        return this.error(res, message, 429);
    }
    /**
     * Internal server error response (500)
     */
    static internalError(res, message = 'Internal server error') {
        return this.error(res, message, 500);
    }
    /**
     * Paginated response
     */
    static paginated(res, data, pagination, message = 'Success') {
        const response = {
            success: true,
            message,
            data,
            pagination: {
                currentPage: pagination.page,
                totalPages: pagination.pages,
                totalItems: pagination.total,
                itemsPerPage: pagination.limit,
                hasNext: pagination.hasNext,
                hasPrev: pagination.hasPrev
            },
            meta: {
                timestamp: new Date().toISOString(),
                total: pagination.total,
                page: pagination.page,
                limit: pagination.limit,
                pages: pagination.pages
            }
        };
        return res.status(200).json(response);
    }
}
exports.ApiResponseBuilder = ApiResponseBuilder;
/**
 * Utility function to calculate pagination metadata
 */
function calculatePagination(total, page, limit) {
    const pages = Math.ceil(total / limit);
    return {
        total,
        page,
        limit,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
    };
}
/**
 * Create success response object (without sending response)
 */
function createSuccessResponse(data, message = 'Success') {
    return {
        success: true,
        message,
        ...(data !== undefined && { data }),
        meta: {
            timestamp: new Date().toISOString()
        }
    };
}
/**
 * Create error response object (without sending response)
 */
function createErrorResponse(message = 'An error occurred', errors) {
    return {
        success: false,
        message,
        ...(errors && { errors: Array.isArray(errors) ? errors : [errors] }),
        meta: {
            timestamp: new Date().toISOString()
        }
    };
}
