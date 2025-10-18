import request from 'supertest';
import { app } from '../../server';
import { healthCheckService } from '../../services/loggingService';

describe('Health Check Endpoints', () => {
  beforeEach(() => {
    // Clear any existing health checks
    (healthCheckService as any).healthChecks.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return healthy status when all checks pass', async () => {
      // Register mock health checks
      healthCheckService.registerHealthCheck('database', async () => true);
      healthCheckService.registerHealthCheck('bedrock', async () => true);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        checks: {
          database: true,
          bedrock: true,
        },
        version: '1.0.0',
        timestamp: expect.any(String),
      });
    });

    it('should return unhealthy status when a check fails', async () => {
      // Register mock health checks with one failing
      healthCheckService.registerHealthCheck('database', async () => true);
      healthCheckService.registerHealthCheck('bedrock', async () => false);

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        checks: {
          database: true,
          bedrock: false,
        },
        version: '1.0.0',
        timestamp: expect.any(String),
      });
    });

    it('should handle health check exceptions', async () => {
      // Register mock health check that throws
      healthCheckService.registerHealthCheck('failing-service', async () => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        checks: {
          'failing-service': false,
        },
        version: '1.0.0',
        timestamp: expect.any(String),
      });
    });

    it('should return error status when health check service fails', async () => {
      // Mock the runHealthChecks method to throw
      jest.spyOn(healthCheckService, 'runHealthChecks').mockRejectedValue(
        new Error('Health check service error')
      );

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Health check failed',
        timestamp: expect.any(String),
        version: '1.0.0',
      });
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      // Register mock health checks
      healthCheckService.registerHealthCheck('database', async () => true);
      healthCheckService.registerHealthCheck('bedrock', async () => true);

      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        checks: {
          database: true,
          bedrock: true,
        },
        version: '1.0.0',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: {
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number),
          arrayBuffers: expect.any(Number),
        },
        environment: 'test',
      });
    });

    it('should return unhealthy status with detailed info when checks fail', async () => {
      // Register mock health checks with one failing
      healthCheckService.registerHealthCheck('database', async () => false);

      const response = await request(app)
        .get('/health/detailed')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        checks: {
          database: false,
        },
        version: '1.0.0',
        uptime: expect.any(Number),
        memory: expect.any(Object),
        environment: 'test',
      });
    });

    it('should handle detailed health check service errors', async () => {
      // Mock the runHealthChecks method to throw
      jest.spyOn(healthCheckService, 'runHealthChecks').mockRejectedValue(
        new Error('Detailed health check error')
      );

      const response = await request(app)
        .get('/health/detailed')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Detailed health check failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Health check integration with logging', () => {
    it('should track metrics when health checks are performed', async () => {
      const { metricsService } = require('../../services/loggingService');
      
      // Register a health check
      healthCheckService.registerHealthCheck('test-service', async () => true);

      await request(app)
        .get('/health')
        .expect(200);

      // Verify that user engagement was tracked
      expect(metricsService.trackUserEngagement).toHaveBeenCalledWith('HealthCheck');
    });

    it('should track error metrics when health checks fail', async () => {
      const { metricsService } = require('../../services/loggingService');
      
      // Register a failing health check
      healthCheckService.registerHealthCheck('failing-service', async () => false);

      await request(app)
        .get('/health')
        .expect(503);

      // Verify that error was tracked
      expect(metricsService.trackError).toHaveBeenCalledWith('HealthCheckFailure');
    });
  });
});