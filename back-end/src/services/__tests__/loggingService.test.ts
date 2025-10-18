import { MetricsService, HealthCheckService, logger } from '../loggingService';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutMetricDataCommand: jest.fn(),
}));

jest.mock('winston-cloudwatch', () => {
  return jest.fn().mockImplementation(() => ({
    log: jest.fn(),
  }));
});

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = MetricsService.getInstance();
    // Clear any existing metrics
    (metricsService as any).metricsBuffer = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackUserEngagement', () => {
    it('should track user engagement metrics', () => {
      metricsService.trackUserEngagement('Search', 'user123');

      const buffer = (metricsService as any).metricsBuffer;
      expect(buffer).toHaveLength(1);
      expect(buffer[0]).toMatchObject({
        metricName: 'UserEngagement',
        value: 1,
        unit: 'Count',
        dimensions: {
          Action: 'Search',
          Environment: 'test',
          UserId: 'user123',
        },
      });
    });

    it('should track user engagement without userId', () => {
      metricsService.trackUserEngagement('Login');

      const buffer = (metricsService as any).metricsBuffer;
      expect(buffer).toHaveLength(1);
      expect(buffer[0].dimensions).not.toHaveProperty('UserId');
    });
  });

  describe('trackApiPerformance', () => {
    it('should track API performance metrics', () => {
      metricsService.trackApiPerformance('/api/search', 'POST', 150, 200);

      const buffer = (metricsService as any).metricsBuffer;
      expect(buffer).toHaveLength(2); // Response time + request count

      const responseTimeMetric = buffer.find((m: any) => m.metricName === 'ApiResponseTime');
      const requestMetric = buffer.find((m: any) => m.metricName === 'ApiRequests');

      expect(responseTimeMetric).toMatchObject({
        metricName: 'ApiResponseTime',
        value: 150,
        unit: 'Milliseconds',
        dimensions: {
          Endpoint: '/api/search',
          Method: 'POST',
          StatusCode: '200',
          Environment: 'test',
        },
      });

      expect(requestMetric).toMatchObject({
        metricName: 'ApiRequests',
        value: 1,
        unit: 'Count',
      });
    });
  });

  describe('trackSearchPerformance', () => {
    it('should track search performance metrics', () => {
      metricsService.trackSearchPerformance('semantic', 25, 300);

      const buffer = (metricsService as any).metricsBuffer;
      expect(buffer).toHaveLength(2);

      const responseTimeMetric = buffer.find((m: any) => m.metricName === 'SearchResponseTime');
      const resultsMetric = buffer.find((m: any) => m.metricName === 'SearchResults');

      expect(responseTimeMetric).toMatchObject({
        value: 300,
        unit: 'Milliseconds',
        dimensions: {
          QueryType: 'semantic',
          Environment: 'test',
        },
      });

      expect(resultsMetric).toMatchObject({
        value: 25,
        unit: 'Count',
      });
    });
  });

  describe('trackError', () => {
    it('should track error metrics', () => {
      metricsService.trackError('ValidationError', '/api/events');

      const buffer = (metricsService as any).metricsBuffer;
      expect(buffer).toHaveLength(1);
      expect(buffer[0]).toMatchObject({
        metricName: 'Errors',
        value: 1,
        unit: 'Count',
        dimensions: {
          ErrorType: 'ValidationError',
          Environment: 'test',
          Endpoint: '/api/events',
        },
      });
    });
  });

  describe('trackCalendarIntegration', () => {
    it('should track calendar integration metrics', () => {
      metricsService.trackCalendarIntegration('Download');

      const buffer = (metricsService as any).metricsBuffer;
      expect(buffer).toHaveLength(1);
      expect(buffer[0]).toMatchObject({
        metricName: 'CalendarIntegration',
        value: 1,
        unit: 'Count',
        dimensions: {
          Action: 'Download',
          Environment: 'test',
        },
      });
    });
  });
});

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;

  beforeEach(() => {
    healthCheckService = HealthCheckService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerHealthCheck', () => {
    it('should register a health check', () => {
      const mockCheck = jest.fn().mockResolvedValue(true);
      healthCheckService.registerHealthCheck('test-service', mockCheck);

      const checks = (healthCheckService as any).healthChecks;
      expect(checks.has('test-service')).toBe(true);
    });
  });

  describe('runHealthChecks', () => {
    it('should run all registered health checks and return healthy status', async () => {
      const mockCheck1 = jest.fn().mockResolvedValue(true);
      const mockCheck2 = jest.fn().mockResolvedValue(true);

      healthCheckService.registerHealthCheck('service1', mockCheck1);
      healthCheckService.registerHealthCheck('service2', mockCheck2);

      const result = await healthCheckService.runHealthChecks();

      expect(result.status).toBe('healthy');
      expect(result.checks).toEqual({
        service1: true,
        service2: true,
      });
      expect(result.timestamp).toBeDefined();
      expect(mockCheck1).toHaveBeenCalled();
      expect(mockCheck2).toHaveBeenCalled();
    });

    it('should return unhealthy status when a check fails', async () => {
      const mockCheck1 = jest.fn().mockResolvedValue(true);
      const mockCheck2 = jest.fn().mockResolvedValue(false);

      healthCheckService.registerHealthCheck('service1', mockCheck1);
      healthCheckService.registerHealthCheck('service2', mockCheck2);

      const result = await healthCheckService.runHealthChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks).toEqual({
        service1: true,
        service2: false,
      });
    });

    it('should handle health check exceptions', async () => {
      const mockCheck = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      healthCheckService.registerHealthCheck('failing-service', mockCheck);

      const result = await healthCheckService.runHealthChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['failing-service']).toBe(false);
    });
  });
});

describe('Logger', () => {
  it('should be defined and have required methods', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });
});