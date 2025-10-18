import { bedrockService, CrawlerConfig, CrawlerStatus } from './bedrockService';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

export interface CrawlerConfigWithId extends CrawlerConfig {
  configId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CrawlerService {
  private dynamoClient: DynamoDBDocumentClient;
  private configTableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId!,
        secretAccessKey: config.aws.secretAccessKey!,
      },
      ...(config.aws.dynamodb.endpoint && { endpoint: config.aws.dynamodb.endpoint }),
    });
    
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.configTableName = 'eventsync-crawler-configs';
  }

  /**
   * Create a new crawler configuration
   */
  async createCrawlerConfig(
    name: string,
    crawlerConfig: CrawlerConfig,
    description?: string
  ): Promise<CrawlerConfigWithId> {
    const configId = `crawler-${Date.now()}`;
    const now = new Date();

    const configWithId: CrawlerConfigWithId = {
      configId,
      name,
      description,
      ...crawlerConfig,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.dynamoClient.send(new PutCommand({
        TableName: this.configTableName,
        Item: configWithId,
      }));

      return configWithId;
    } catch (error) {
      console.error('Error creating crawler config:', error);
      throw new Error('Failed to create crawler configuration');
    }
  }

  /**
   * Get crawler configuration by ID
   */
  async getCrawlerConfig(configId: string): Promise<CrawlerConfigWithId | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.configTableName,
        Key: { configId },
      }));

      return result.Item as CrawlerConfigWithId || null;
    } catch (error) {
      console.error('Error getting crawler config:', error);
      throw new Error('Failed to retrieve crawler configuration');
    }
  }

  /**
   * Update crawler configuration
   */
  async updateCrawlerConfig(
    configId: string,
    updates: Partial<CrawlerConfig & { name?: string; description?: string; isActive?: boolean }>
  ): Promise<CrawlerConfigWithId> {
    try {
      const updateExpression = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression dynamically
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      // Always update the updatedAt timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date();

      const result = await this.dynamoClient.send(new UpdateCommand({
        TableName: this.configTableName,
        Key: { configId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }));

      return result.Attributes as CrawlerConfigWithId;
    } catch (error) {
      console.error('Error updating crawler config:', error);
      throw new Error('Failed to update crawler configuration');
    }
  }

  /**
   * Start crawler with specific configuration
   */
  async startCrawler(configId: string): Promise<CrawlerStatus> {
    try {
      const crawlerConfig = await this.getCrawlerConfig(configId);
      if (!crawlerConfig) {
        throw new Error('Crawler configuration not found');
      }

      // Configure Bedrock with the crawler settings
      await bedrockService.configureCrawler({
        seedUrls: crawlerConfig.seedUrls,
        inclusionFilters: crawlerConfig.inclusionFilters,
        exclusionFilters: crawlerConfig.exclusionFilters,
        crawlDepth: crawlerConfig.crawlDepth,
        maxPages: crawlerConfig.maxPages,
      });

      // Start the crawler
      const status = await bedrockService.startCrawler();

      // Update config to active if crawler started successfully
      if (status.status === 'RUNNING') {
        await this.updateCrawlerConfig(configId, { isActive: true });
      }

      return status;
    } catch (error) {
      console.error('Error starting crawler:', error);
      throw new Error('Failed to start crawler');
    }
  }

  /**
   * Stop crawler
   */
  async stopCrawler(configId: string): Promise<CrawlerStatus> {
    try {
      const status = await bedrockService.stopCrawler();

      // Update config to inactive
      await this.updateCrawlerConfig(configId, { isActive: false });

      return status;
    } catch (error) {
      console.error('Error stopping crawler:', error);
      throw new Error('Failed to stop crawler');
    }
  }

  /**
   * Get crawler status
   */
  async getCrawlerStatus(): Promise<CrawlerStatus> {
    try {
      return await bedrockService.getCrawlerStatus();
    } catch (error) {
      console.error('Error getting crawler status:', error);
      throw new Error('Failed to get crawler status');
    }
  }

  /**
   * Get default crawler configuration for event websites
   */
  getDefaultEventCrawlerConfig(): CrawlerConfig {
    return {
      seedUrls: [
        'https://www.eventbrite.com',
        'https://www.meetup.com',
        'https://www.facebook.com/events',
        'https://allevents.in',
        'https://www.ticketmaster.com',
      ],
      inclusionFilters: [
        '**/events/**',
        '**/event/**',
        '**meetup**',
        '**eventbrite**',
        '**concert**',
        '**festival**',
        '**conference**',
        '**workshop**',
        '**seminar**',
      ],
      exclusionFilters: [
        '**/admin/**',
        '**/login/**',
        '**/register/**',
        '**/checkout/**',
        '**/cart/**',
        '**pdf**',
        '**jpg**',
        '**png**',
        '**gif**',
        '**css**',
        '**js**',
      ],
      crawlDepth: 3,
      maxPages: 5000,
    };
  }

  /**
   * Initialize default crawler configuration
   */
  async initializeDefaultConfig(): Promise<CrawlerConfigWithId> {
    const defaultConfig = this.getDefaultEventCrawlerConfig();
    
    return await this.createCrawlerConfig(
      'Default Event Crawler',
      defaultConfig,
      'Default configuration for crawling popular event websites'
    );
  }
}

export const crawlerService = new CrawlerService();