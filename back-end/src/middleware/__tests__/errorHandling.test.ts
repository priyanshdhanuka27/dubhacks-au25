import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  handleValidationError,
  handleDatabaseError,
  handleExternalServiceError,
} from '../errorHandling';

// Mock the logging service
jest.mock('../../services/loggingService', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  metricsService: {
    trackError: jest.fn(),
  },
}));

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with field and value', () => {
      const error = new ValidationError('Invalid email', 'email', 'invalid-email');
      
      expect(error.message).toBe('Invalid email');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('email');
      expect(error.value).toBe('invalid-email');
    });
  });

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError with default message', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('AUTHENTICATION_ERROR');
    });

    it('should create an AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with resource', () => {
      const error = new NotFoundError('User not found', 'user');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND_ERROR');
      expect(error.resource).toBe('user');
    });
  });
});

describe('Error Handlers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      requestId: 'test-request-id',
      method: 'GET',
      url: '/test',
      route: { path: '/test' },
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      ip: '127.0.0.1',
      originalUrl: '/test',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('globalErrorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new ValidationError('Invalid input', 'name', 'test');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: {
            field: 'name',
            value: 'test',
          },
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
    });

    it('should handle generic Error correctly', () => {
      const error = new Error('Generic error');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      
      globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async function that throws error', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('notFoundHandler', () => {
    it('should create NotFoundError for unknown route', () => {
      mockRequest.originalUrl = '/unknown-route';
      
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route /unknown-route not found',
          statusCode: 404,
          errorCode: 'NOT_FOUND_ERROR',
          resource: 'route',
        })
      );
    });
  });

  describe('handleValidationError', () => {
    it('should handle Joi validation error', () => {
      const joiError = {
        isJoi: true,
        details: [{
          message: 'Email is required',
          path: ['email'],
          context: { value: undefined },
        }],
      };

      const result = handleValidationError(joiError);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Email is required');
      expect(result.field).toBe('email');
    });

    it('should return original error if not Joi error', () => {
      const originalError = new Error('Not a Joi error');
      const result = handleValidationError(originalError);

      expect(result).toBe(originalError);
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle ResourceNotFoundException', () => {
      const dbError = { name: 'ResourceNotFoundException' };
      const result = handleDatabaseError(dbError, 'findUser');

      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.message).toBe('Resource not found in database');
    });

    it('should handle ConditionalCheckFailedException', () => {
      const dbError = { name: 'ConditionalCheckFailedException' };
      const result = handleDatabaseError(dbError, 'createUser');

      expect(result).toBeInstanceOf(ConflictError);
      expect(result.message).toBe('Resource already exists or condition not met');
    });

    it('should handle ProvisionedThroughputExceededException', () => {
      const dbError = { name: 'ProvisionedThroughputExceededException' };
      const result = handleDatabaseError(dbError, 'query');

      expect(result).toBeInstanceOf(RateLimitError);
      expect(result.message).toBe('Database capacity exceeded, please try again later');
    });

    it('should handle ValidationException', () => {
      const dbError = { name: 'ValidationException' };
      const result = handleDatabaseError(dbError, 'putItem');

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Invalid data format for database operation');
    });

    it('should handle generic database error', () => {
      const dbError = { name: 'UnknownDatabaseError' };
      const result = handleDatabaseError(dbError, 'operation');

      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toBe('Database operation failed');
      expect((result as DatabaseError).operation).toBe('operation');
    });
  });

  describe('handleExternalServiceError', () => {
    it('should handle rate limit error', () => {
      const serviceError = {
        response: { status: 429 },
      };
      const result = handleExternalServiceError(serviceError, 'Bedrock');

      expect(result).toBeInstanceOf(RateLimitError);
      expect(result.message).toBe('Bedrock rate limit exceeded');
    });

    it('should handle server error', () => {
      const serviceError = {
        response: { status: 500 },
      };
      const result = handleExternalServiceError(serviceError, 'OpenSearch');

      expect(result).toBeInstanceOf(ExternalServiceError);
      expect(result.message).toBe('OpenSearch service temporarily unavailable');
      expect((result as ExternalServiceError).service).toBe('OpenSearch');
    });

    it('should handle error with response message', () => {
      const serviceError = {
        response: {
          status: 400,
          data: { message: 'Invalid query format' },
        },
      };
      const result = handleExternalServiceError(serviceError, 'Bedrock');

      expect(result).toBeInstanceOf(ExternalServiceError);
      expect(result.message).toBe('Invalid query format');
    });

    it('should handle error with generic message', () => {
      const serviceError = {
        message: 'Network timeout',
      };
      const result = handleExternalServiceError(serviceError, 'DynamoDB');

      expect(result).toBeInstanceOf(ExternalServiceError);
      expect(result.message).toBe('Network timeout');
    });
  });
});