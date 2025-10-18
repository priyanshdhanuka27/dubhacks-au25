import { Request, Response, NextFunction } from 'express';
import { logger, metricsService } from '../services/loggingService';

// Extend Request interface to include timing
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestId?: string;
    }
  }
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Request logging middleware
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.startTime = Date.now();
  req.requestId = generateRequestId();

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Log response
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
    });

    // Track metrics
    metricsService.trackApiPerformance(
      req.route?.path || req.url,
      req.method,
      responseTime,
      res.statusCode
    );

    // Track user engagement for specific endpoints
    if (req.url.includes('/search')) {
      metricsService.trackUserEngagement('Search');
    } else if (req.url.includes('/events') && req.method === 'POST') {
      metricsService.trackUserEngagement('EventSubmission');
    } else if (req.url.includes('/calendar')) {
      metricsService.trackCalendarIntegration('Download');
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logging middleware
export const errorLoggingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const responseTime = Date.now() - (req.startTime || Date.now());

  // Log error with context
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    responseTime,
    timestamp: new Date().toISOString(),
  });

  // Track error metrics
  metricsService.trackError(error.name, req.route?.path || req.url);

  next(error);
};

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log slow requests (> 2 seconds)
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString(),
      });

      metricsService.trackError('SlowRequest', req.route?.path || req.url);
    }
  });

  next();
};