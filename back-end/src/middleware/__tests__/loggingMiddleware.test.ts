import { Request, Response, NextFunction } from 'express';
import {
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  performanceMiddleware,
} from '../loggingMiddleware';

// Mock the logging service
jest.mock('../../services/loggingService', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  metricsService: {
    trackApiPerformance: jest.fn(),
    trackUserEngagement: jest.fn(),
    trackCalendarIntegration: jest.fn(),
    trackError: jest.fn(),
  },
}));

describe('Logging Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      ip: '127.0.0.1',
      route: { path: '/api/test' },
      originalUrl: '/api/test',
    };

    mockResponse = {
      statusCode: 200,
      end: jest.fn().mockReturnThis(),
      on: jest.fn(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('requestLoggingMiddleware', () => {
    it('should add requestId and startTime to request', () => {
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.requestId).toBeDefined();
      expect(mockRequest.startTime).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log incoming request', () => {
      const { logger } = require('../../services/loggingService');
      
      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Incoming request', {
        requestId: mockRequest.requestId,
        method: 'GET',
        url: '/api/test',
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1',
        timestamp: expect.any(String),
      });
    });

    it('should override res.end to log response', () => {
      const originalEnd = mockResponse.end;
      mockRequest.startTime = Date.now() - 100; // 100ms ago

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response end
      (mockResponse.end as jest.Mock)();

      const { logger, metricsService } = require('../../services/loggingService');

      expect(logger.info).toHaveBeenCalledWith('Request completed', {
        requestId: mockRequest.requestId,
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(metricsService.trackApiPerformance).toHaveBeenCalledWith(
        '/api/test',
        'GET',
        expect.any(Number),
        200
      );
    });

    it('should track search engagement for search endpoints', () => {
      mockRequest.url = '/api/search';
      mockRequest.startTime = Date.now();

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response end
      (mockResponse.end as jest.Mock)();

      const { metricsService } = require('../../services/loggingService');
      expect(metricsService.trackUserEngagement).toHaveBeenCalledWith('Search');
    });

    it('should track event submission for POST /events', () => {
      mockRequest.url = '/api/events';
      mockRequest.method = 'POST';
      mockRequest.startTime = Date.now();

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response end
      (mockResponse.end as jest.Mock)();

      const { metricsService } = require('../../services/loggingService');
      expect(metricsService.trackUserEngagement).toHaveBeenCalledWith('EventSubmission');
    });

    it('should track calendar integration for calendar endpoints', () => {
      mockRequest.url = '/api/calendar';
      mockRequest.startTime = Date.now();

      requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response end
      (mockResponse.end as jest.Mock)();

      const { metricsService } = require('../../services/loggingService');
      expect(metricsService.trackCalendarIntegration).toHaveBeenCalledWith('Download');
    });
  });

  describe('errorLoggingMiddleware', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      mockRequest.startTime = Date.now() - 200;
      mockRequest.requestId = 'test-request-id';

      errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const { logger, metricsService } = require('../../services/loggingService');

      expect(logger.error).toHaveBeenCalledWith('Request error', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/test',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String),
        },
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(metricsService.trackError).toHaveBeenCalledWith('Error', '/api/test');
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle missing startTime gracefully', () => {
      const error = new Error('Test error');
      mockRequest.requestId = 'test-request-id';
      // Don't set startTime

      errorLoggingMiddleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      const { logger } = require('../../services/loggingService');
      expect(logger.error).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('performanceMiddleware', () => {
    beforeEach(() => {
      // Mock process.hrtime.bigint
      const mockHrtime = jest.spyOn(process.hrtime, 'bigint');
      mockHrtime
        .mockReturnValueOnce(BigInt(1000000000)) // Start time
        .mockReturnValueOnce(BigInt(3500000000)); // End time (3.5 seconds later)
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log slow requests', () => {
      mockRequest.requestId = 'test-request-id';
      mockResponse.statusCode = 200;

      performanceMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response finish
      const finishCallback = (mockResponse.on as jest.Mock).mock.calls.find(
        call => call[0] === 'finish'
      )[1];
      finishCallback();

      const { logger, metricsService } = require('../../services/loggingService');

      expect(logger.warn).toHaveBeenCalledWith('Slow request detected', {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/test',
        duration: 2500, // 3.5 seconds - 1 second = 2.5 seconds in milliseconds
        statusCode: 200,
        timestamp: expect.any(String),
      });

      expect(metricsService.trackError).toHaveBeenCalledWith('SlowRequest', '/api/test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not log fast requests', () => {
      // Mock fast request (500ms)
      const mockHrtime = jest.spyOn(process.hrtime, 'bigint');
      mockHrtime
        .mockReturnValueOnce(BigInt(1000000000)) // Start time
        .mockReturnValueOnce(BigInt(1500000000)); // End time (0.5 seconds later)

      performanceMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response finish
      const finishCallback = (mockResponse.on as jest.Mock).mock.calls.find(
        call => call[0] === 'finish'
      )[1];
      finishCallback();

      const { logger, metricsService } = require('../../services/loggingService');

      expect(logger.warn).not.toHaveBeenCalled();
      expect(metricsService.trackError).not.toHaveBeenCalled();
    });
  });
});