import { Request, Response, NextFunction } from 'express';
import { logger, metricsService } from '../services/loggingService';
import { config } from '../config';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public field?: string;
  public value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  public resource?: string;

  constructor(message: string = 'Resource not found', resource?: string) {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.resource = resource;
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  public service?: string;

  constructor(message: string, service?: string) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

export class DatabaseError extends AppError {
  public operation?: string;

  constructor(message: string, operation?: string) {
    super(message, 500, 'DATABASE_ERROR');
    this.operation = operation;
  }
}

// Error response formatter
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    stack?: string;
  };
}

function formatErrorResponse(error: Error, req: Request): ErrorResponse {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const errorCode = isAppError ? error.errorCode || 'UNKNOWN_ERROR' : 'INTERNAL_SERVER_ERROR';

  const response: ErrorResponse = {
    error: {
      code: errorCode,
      message: isAppError ? error.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  };

  // Add additional details for specific error types
  if (error instanceof ValidationError) {
    response.error.details = {
      field: error.field,
      value: error.value,
    };
  } else if (error instanceof NotFoundError) {
    response.error.details = {
      resource: error.resource,
    };
  } else if (error instanceof ExternalServiceError) {
    response.error.details = {
      service: error.service,
    };
  } else if (error instanceof DatabaseError) {
    response.error.details = {
      operation: error.operation,
    };
  }

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    response.error.stack = error.stack;
  }

  return response;
}

// Global error handling middleware
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;

  // Log error with appropriate level
  if (statusCode >= 500) {
    logger.error('Server error occurred', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        id: req.requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.warn('Client error occurred', {
      error: {
        name: error.name,
        message: error.message,
        code: isAppError ? error.errorCode : undefined,
      },
      request: {
        id: req.requestId,
        method: req.method,
        url: req.url,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Track error metrics
  const errorType = isAppError ? error.errorCode || error.name : 'UnhandledError';
  metricsService.trackError(errorType, req.route?.path || req.url);

  // Send formatted error response
  const errorResponse = formatErrorResponse(error, req);
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`, 'route');
  next(error);
};

// Validation error handler for Joi
export const handleValidationError = (error: any): ValidationError => {
  if (error.isJoi) {
    const details = error.details[0];
    return new ValidationError(
      details.message,
      details.path?.join('.'),
      details.context?.value
    );
  }
  return error;
};

// Database error handler
export const handleDatabaseError = (error: any, operation?: string): DatabaseError | AppError => {
  // Handle DynamoDB specific errors
  if (error.name === 'ResourceNotFoundException') {
    return new NotFoundError('Resource not found in database');
  }
  
  if (error.name === 'ConditionalCheckFailedException') {
    return new ConflictError('Resource already exists or condition not met');
  }
  
  if (error.name === 'ProvisionedThroughputExceededException') {
    return new RateLimitError('Database capacity exceeded, please try again later');
  }
  
  if (error.name === 'ValidationException') {
    return new ValidationError('Invalid data format for database operation');
  }

  // Generic database error
  return new DatabaseError(
    'Database operation failed',
    operation
  );
};

// External service error handler
export const handleExternalServiceError = (error: any, service: string): ExternalServiceError => {
  let message = `${service} service error`;
  
  if (error.response?.status === 429) {
    return new RateLimitError(`${service} rate limit exceeded`);
  }
  
  if (error.response?.status >= 500) {
    message = `${service} service temporarily unavailable`;
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error.message) {
    message = error.message;
  }

  return new ExternalServiceError(message, service);
};