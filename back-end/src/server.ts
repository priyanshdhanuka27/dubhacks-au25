import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { logger, healthCheckService, metricsService } from './services/loggingService';
import { requestLoggingMiddleware, errorLoggingMiddleware, performanceMiddleware } from './middleware/loggingMiddleware';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandling';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import searchRoutes from './routes/searchRoutes';
import userRoutes from './routes/userRoutes';

// Validate configuration on startup
validateConfig();

const app = express();

// Logging and monitoring middleware (before other middleware)
app.use(requestLoggingMiddleware);
app.use(performanceMiddleware);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Register health checks
healthCheckService.registerHealthCheck('database', async () => {
  try {
    // Simple DynamoDB health check - this would be implemented in database service
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
});

healthCheckService.registerHealthCheck('bedrock', async () => {
  try {
    // Simple Bedrock health check - this would be implemented in bedrock service
    return true;
  } catch (error) {
    logger.error('Bedrock health check failed:', error);
    return false;
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await healthCheckService.runHealthChecks();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      ...healthStatus,
      version: '1.0.0',
    });
  } catch (error) {
    logger.error('Health check endpoint error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }
});

// Detailed health check endpoint
app.get('/health/detailed', async (req, res) => {
  try {
    const healthStatus = await healthCheckService.runHealthChecks();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      ...healthStatus,
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: config.nodeEnv,
    });
  } catch (error) {
    logger.error('Detailed health check endpoint error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Detailed health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: 'EventSync API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      events: '/api/events',
      search: '/api/search',
      calendar: '/api/calendar',
      users: '/api/users',
    },
  });
});

// 404 handler (must be after all routes)
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorLoggingMiddleware);
app.use(globalErrorHandler);

const server = app.listen(config.port, () => {
  logger.info('EventSync API Server started', {
    port: config.port,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
  
  console.log(`🚀 EventSync API Server running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await metricsService.shutdown();
      logger.info('Metrics service shutdown complete');
    } catch (error) {
      logger.error('Error during metrics service shutdown:', error);
    }
    
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await metricsService.shutdown();
      logger.info('Metrics service shutdown complete');
    } catch (error) {
      logger.error('Error during metrics service shutdown:', error);
    }
    
    process.exit(0);
  });
});

export { app, server };