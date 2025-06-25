import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError, getErrorDetails } from '@/utils/errors';
import { ApiResponseBuilder } from '@/utils/apiResponse';

export interface ErrorWithStatus extends Error {
  statusCode?: number;
  status?: string;
}

/**
 * Global error handling middleware
 * Should be the last middleware in the stack
 */
export function globalErrorHandler(
  error: ErrorWithStatus,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error details
  console.error('Error occurred:', getErrorDetails(error));

  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Handle operational errors (safe to expose to client)
  if (isOperationalError(error)) {
    const appError = error as AppError;

    // Return appropriate response based on status code
    switch (appError.statusCode) {
      case 400:
        ApiResponseBuilder.badRequest(res, appError.message, appError.errors);
        break;
      case 401:
        ApiResponseBuilder.unauthorized(res, appError.message);
        break;
      case 403:
        ApiResponseBuilder.forbidden(res, appError.message);
        break;
      case 404:
        ApiResponseBuilder.notFound(res, appError.message);
        break;
      case 409:
        ApiResponseBuilder.error(res, appError.message, 409, appError.errors);
        break;
      case 422:
        ApiResponseBuilder.validationError(
          res,
          appError.errors || [],
          appError.message
        );
        break;
      case 429:
        ApiResponseBuilder.tooManyRequests(res, appError.message);
        break;
      default:
        ApiResponseBuilder.error(
          res,
          appError.message,
          appError.statusCode,
          appError.errors
        );
    }
    return;
  }

  // Handle non-operational errors (don't expose details to client)
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong!'
      : error.message || 'Internal server error';

  ApiResponseBuilder.internalError(res, message);
}

/**
 * Middleware to catch async errors and pass them to error handler
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware to handle 404 errors for unmatched routes
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new AppError(
    `Cannot ${req.method} ${req.originalUrl}`,
    404,
    true
  );
  next(error);
}

/**
 * Middleware to add request ID for tracking
 */
export function requestIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
