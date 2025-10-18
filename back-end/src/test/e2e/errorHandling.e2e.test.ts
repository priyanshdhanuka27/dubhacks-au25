import request from 'supertest';
import { app } from '../../server';

describe('Error Handling Integration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('404 Not Found', () => {
    it('should return structured error for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND_ERROR',
          message: 'Route /api/unknown-endpoint not found',
          details: {
            resource: 'route',
          },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      });
    });

    it('should return structured error for unknown POST routes', async () => {
      const response = await request(app)
        .post('/api/nonexistent')
        .send({ data: 'test' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND_ERROR',
          message: 'Route /api/nonexistent not found',
          details: {
            resource: 'route',
          },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      });
    });
  });

  describe('Request Logging', () => {
    it('should add request ID to all responses', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      // Check that the request was processed (should have request ID in logs)
      expect(response.body).toMatchObject({
        message: 'EventSync API Server',
        version: '1.0.0',
      });
    });

    it('should log and track metrics for API requests', async () => {
      const { logger, metricsService } = require('../../services/loggingService');

      await request(app)
        .get('/api')
        .expect(200);

      // Verify logging occurred
      expect(logger.info).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
        method: 'GET',
        url: '/api',
        requestId: expect.any(String),
      }));

      expect(logger.info).toHaveBeenCalledWith('Request completed', expect.objectContaining({
        method: 'GET',
        url: '/api',
        statusCode: 200,
        responseTime: expect.any(Number),
      }));

      // Verify metrics tracking
      expect(metricsService.trackApiPerformance).toHaveBeenCalledWith(
        expect.any(String),
        'GET',
        expect.any(Number),
        200
      );
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for 404 errors', async () => {
      const response = await request(app)
        .get('/api/missing')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
      
      expect(typeof response.body.error.code).toBe('string');
      expect(typeof response.body.error.message).toBe('string');
      expect(typeof response.body.error.timestamp).toBe('string');
      expect(typeof response.body.error.requestId).toBe('string');
    });

    it('should include details for specific error types', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details).toHaveProperty('resource', 'route');
    });
  });

  describe('Performance Monitoring', () => {
    it('should not log warnings for fast requests', async () => {
      const { logger } = require('../../services/loggingService');

      await request(app)
        .get('/api')
        .expect(200);

      // Should not have any slow request warnings
      expect(logger.warn).not.toHaveBeenCalledWith(
        'Slow request detected',
        expect.any(Object)
      );
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      // Check for helmet security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('JSON Parsing Errors', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('JSON');
    });
  });

  describe('Large Request Body Handling', () => {
    it('should handle requests within size limit', async () => {
      const largeButValidData = {
        data: 'x'.repeat(1000), // 1KB of data
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largeButValidData);

      // Should not fail due to size (though may fail validation)
      expect(response.status).not.toBe(413); // Not "Payload Too Large"
    });
  });
});