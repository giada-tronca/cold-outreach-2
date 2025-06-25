export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly errors?: string[];

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: string[]
  ) {
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

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', errors?: string[]) {
    super(message, 422, true, errors);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, true);
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string = 'External service error') {
    super(message, 502, true);
    this.service = service;
  }
}

export class JobProcessingError extends AppError {
  public readonly jobId?: string;
  public readonly jobType?: string;

  constructor(
    message: string = 'Job processing failed',
    jobId?: string,
    jobType?: string
  ) {
    super(message, 500, true);

    if (jobId) {
      this.jobId = jobId;
    }

    if (jobType) {
      this.jobType = jobType;
    }
  }
}

/**
 * Utility function to check if an error is operational (safe to expose to client)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Utility function to extract error details for logging
 */
export function getErrorDetails(error: Error): {
  message: string;
  stack?: string;
  statusCode?: number;
  timestamp?: string;
  errors?: string[];
  [key: string]: any;
} {
  const details: any = {
    message: error.message,
    stack: error.stack,
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
