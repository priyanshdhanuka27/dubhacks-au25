import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';
import { config } from '../config';

// CloudWatch client for custom metrics
const cloudWatchClient = new CloudWatchClient({
  region: config.aws.cloudwatch.region,
  credentials: config.aws.accessKeyId && config.aws.secretAccessKey ? {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  } : undefined,
});

// Winston logger configuration
const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        service: 'eventsync-backend',
        environment: config.nodeEnv,
        ...meta,
      });
    })
  ),
  defaultMeta: {
    service: 'eventsync-backend',
    environment: config.nodeEnv,
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add CloudWatch transport for production
if (config.nodeEnv === 'production' && config.aws.accessKeyId) {
  logger.add(
    new WinstonCloudWatch({
      logGroupName: config.aws.cloudwatch.logGroupName,
      logStreamName: `eventsync-backend-${new Date().toISOString().split('T')[0]}`,
      awsRegion: config.aws.cloudwatch.region,
      awsAccessKeyId: config.aws.accessKeyId,
      awsSecretKey: config.aws.secretAccessKey,
      messageFormatter: ({ level, message, additionalInfo }) => {
        return JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          service: 'eventsync-backend',
          ...additionalInfo,
        });
      },
    })
  );
}

// Metrics interface
interface MetricData {
  metricName: string;
  value: number;
  unit?: StandardUnit;
  dimensions?: Record<string, string>;
  timestamp?: Date;
}

// Application metrics tracking
export class MetricsService {
  private static instance: MetricsService;
  private metricsBuffer: MetricData[] = [];
  private flushInterval: NodeJS.Timeout;

  private constructor() {
    // Flush metrics every 60 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 60000);
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // Track user engagement metrics
  public trackUserEngagement(action: string, userId?: string): void {
    this.addMetric({
      metricName: 'UserEngagement',
      value: 1,
      unit: StandardUnit.Count,
      dimensions: {
        Action: action,
        Environment: config.nodeEnv,
        ...(userId && { UserId: userId }),
      },
    });
  }

  // Track API performance metrics
  public trackApiPerformance(endpoint: string, method: string, responseTime: number, statusCode: number): void {
    this.addMetric({
      metricName: 'ApiResponseTime',
      value: responseTime,
      unit: StandardUnit.Milliseconds,
      dimensions: {
        Endpoint: endpoint,
        Method: method,
        StatusCode: statusCode.toString(),
        Environment: config.nodeEnv,
      },
    });

    this.addMetric({
      metricName: 'ApiRequests',
      value: 1,
      unit: StandardUnit.Count,
      dimensions: {
        Endpoint: endpoint,
        Method: method,
        StatusCode: statusCode.toString(),
        Environment: config.nodeEnv,
      },
    });
  }

  // Track search performance
  public trackSearchPerformance(queryType: string, resultCount: number, responseTime: number): void {
    this.addMetric({
      metricName: 'SearchResponseTime',
      value: responseTime,
      unit: StandardUnit.Milliseconds,
      dimensions: {
        QueryType: queryType,
        Environment: config.nodeEnv,
      },
    });

    this.addMetric({
      metricName: 'SearchResults',
      value: resultCount,
      unit: StandardUnit.Count,
      dimensions: {
        QueryType: queryType,
        Environment: config.nodeEnv,
      },
    });
  }

  // Track error metrics
  public trackError(errorType: string, endpoint?: string): void {
    this.addMetric({
      metricName: 'Errors',
      value: 1,
      unit: StandardUnit.Count,
      dimensions: {
        ErrorType: errorType,
        Environment: config.nodeEnv,
        ...(endpoint && { Endpoint: endpoint }),
      },
    });
  }

  // Track calendar integration usage
  public trackCalendarIntegration(action: string): void {
    this.addMetric({
      metricName: 'CalendarIntegration',
      value: 1,
      unit: StandardUnit.Count,
      dimensions: {
        Action: action,
        Environment: config.nodeEnv,
      },
    });
  }

  private addMetric(metric: MetricData): void {
    this.metricsBuffer.push({
      ...metric,
      timestamp: metric.timestamp || new Date(),
    });

    // Flush immediately if buffer is getting large
    if (this.metricsBuffer.length >= 20) {
      this.flushMetrics();
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Group metrics by namespace for efficient sending
      const metricsByNamespace = metricsToFlush.reduce((acc, metric) => {
        const namespace = 'EventSync/Application';
        if (!acc[namespace]) acc[namespace] = [];
        acc[namespace].push(metric);
        return acc;
      }, {} as Record<string, MetricData[]>);

      for (const [namespace, metrics] of Object.entries(metricsByNamespace)) {
        const metricData = metrics.map(metric => ({
          MetricName: metric.metricName,
          Value: metric.value,
          Unit: metric.unit || StandardUnit.Count,
          Timestamp: metric.timestamp,
          Dimensions: metric.dimensions ? Object.entries(metric.dimensions).map(([Name, Value]) => ({
            Name,
            Value,
          })) : undefined,
        }));

        const command = new PutMetricDataCommand({
          Namespace: namespace,
          MetricData: metricData,
        });

        await cloudWatchClient.send(command);
      }

      logger.debug(`Flushed ${metricsToFlush.length} metrics to CloudWatch`);
    } catch (error) {
      logger.error('Failed to flush metrics to CloudWatch:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  public async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushMetrics();
  }
}

// Health check service
export class HealthCheckService {
  private static instance: HealthCheckService;
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();

  private constructor() {}

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  public registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
  }

  public async runHealthChecks(): Promise<{ status: string; checks: Record<string, boolean>; timestamp: string }> {
    const results: Record<string, boolean> = {};
    let overallStatus = 'healthy';

    for (const [name, check] of this.healthChecks) {
      try {
        results[name] = await check();
        if (!results[name]) {
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        logger.error(`Health check failed for ${name}:`, error);
        results[name] = false;
        overallStatus = 'unhealthy';
      }
    }

    const healthStatus = {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString(),
    };

    // Track health check metrics
    const metricsService = MetricsService.getInstance();
    metricsService.trackUserEngagement('HealthCheck');
    
    if (overallStatus === 'unhealthy') {
      metricsService.trackError('HealthCheckFailure');
    }

    return healthStatus;
  }
}

// Export logger and services
export { logger };
export const metricsService = MetricsService.getInstance();
export const healthCheckService = HealthCheckService.getInstance();