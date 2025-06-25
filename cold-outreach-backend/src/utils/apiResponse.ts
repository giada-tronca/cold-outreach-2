import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ApiResponseBuilder {
  /**
   * Success response
   */
  static success<T>(
    res: Response,
    data?: T,
    message: string = 'Success',
    statusCode: number = 200,
    meta?: Partial<ApiResponse['meta']>
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      ...(data !== undefined && { data }),
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Created response (201)
   */
  static created<T>(
    res: Response,
    data?: T,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  /**
   * No content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Error response
   */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    errors?: string[],
    data?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      ...(errors && { errors }),
      ...(data !== undefined && { data }),
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Bad request response (400)
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request',
    errors?: string[]
  ): Response {
    return this.error(res, message, 400, errors);
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized'
  ): Response {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  /**
   * Not found response (404)
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, 404);
  }

  /**
   * Validation error response (422)
   */
  static validationError(
    res: Response,
    errors: string[],
    message: string = 'Validation failed'
  ): Response {
    return this.error(res, message, 422, errors);
  }

  /**
   * Too many requests response (429)
   */
  static tooManyRequests(
    res: Response,
    message: string = 'Too many requests'
  ): Response {
    return this.error(res, message, 429);
  }

  /**
   * Internal server error response (500)
   */
  static internalError(
    res: Response,
    message: string = 'Internal server error'
  ): Response {
    return this.error(res, message, 500);
  }

  /**
   * Paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message: string = 'Success'
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.page,
        totalPages: pagination.pages,
        totalItems: pagination.total,
        itemsPerPage: pagination.limit,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev,
      },
      meta: {
        timestamp: new Date().toISOString(),
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        pages: pagination.pages,
      },
    };

    return res.status(200).json(response);
  }

  static serverError(res: Response, message: string = 'Internal server error') {
    return this.error(res, message, 500);
  }
}

/**
 * Utility function to calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const pages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

/**
 * Create success response object (without sending response)
 */
export function createSuccessResponse<T>(
  data?: T,
  message: string = 'Success'
): ApiResponse<T> {
  return {
    success: true,
    message,
    ...(data !== undefined && { data }),
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create error response object (without sending response)
 */
export function createErrorResponse(
  message: string = 'An error occurred',
  errors?: string | string[]
): ApiResponse {
  return {
    success: false,
    message,
    ...(errors && { errors: Array.isArray(errors) ? errors : [errors] }),
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
