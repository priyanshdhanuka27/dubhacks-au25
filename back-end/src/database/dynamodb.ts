import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: config.aws.region,
  ...(config.aws.accessKeyId && config.aws.secretAccessKey && {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  }),
  ...(config.aws.dynamodb.endpoint && {
    endpoint: config.aws.dynamodb.endpoint,
  }),
});

// Create document client for easier operations
export const docClient = DynamoDBDocumentClient.from(client);

// Table names
export const TABLES = {
  USERS: config.aws.dynamodb.usersTable,
  EVENTS: config.aws.dynamodb.eventsTable,
} as const;

// Generic database operations
export class DynamoDBService {
  /**
   * Put an item into a table
   */
  async putItem<T extends Record<string, any>>(tableName: string, item: T): Promise<void> {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });
    
    await docClient.send(command);
  }

  /**
   * Get an item from a table by key
   */
  async getItem<T extends Record<string, any>>(tableName: string, key: Record<string, any>): Promise<T | null> {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });
    
    const result = await docClient.send(command);
    return result.Item as T || null;
  }

  /**
   * Update an item in a table
   */
  async updateItem<T extends Record<string, any>>(
    tableName: string, 
    key: Record<string, any>, 
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<T | null> {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const result = await docClient.send(command);
    return result.Attributes as T || null;
  }

  /**
   * Delete an item from a table
   */
  async deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });
    
    await docClient.send(command);
  }

  /**
   * Query items from a table
   */
  async queryItems<T extends Record<string, any>>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    indexName?: string,
    limit?: number
  ): Promise<T[]> {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: indexName,
      Limit: limit,
    });
    
    const result = await docClient.send(command);
    return result.Items as T[] || [];
  }

  /**
   * Scan items from a table (use sparingly)
   */
  async scanItems<T extends Record<string, any>>(
    tableName: string,
    filterExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    limit?: number
  ): Promise<T[]> {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
    });
    
    const result = await docClient.send(command);
    return result.Items as T[] || [];
  }

  /**
   * Batch get items from multiple tables
   */
  async batchGetItems<T extends Record<string, any>>(requests: Array<{ tableName: string; keys: Record<string, any>[] }>): Promise<Record<string, T[]>> {
    const requestItems: Record<string, any> = {};
    
    requests.forEach(({ tableName, keys }) => {
      requestItems[tableName] = {
        Keys: keys,
      };
    });

    const command = new BatchGetCommand({
      RequestItems: requestItems,
    });
    
    const result = await docClient.send(command);
    return result.Responses as Record<string, T[]> || {};
  }

  /**
   * Batch write items (put/delete) to tables
   */
  async batchWriteItems(requests: Array<{ tableName: string; putRequests?: any[]; deleteRequests?: Record<string, any>[] }>): Promise<void> {
    const requestItems: Record<string, any> = {};
    
    requests.forEach(({ tableName, putRequests, deleteRequests }) => {
      const tableRequests: any[] = [];
      
      if (putRequests) {
        putRequests.forEach(item => {
          tableRequests.push({ PutRequest: { Item: item } });
        });
      }
      
      if (deleteRequests) {
        deleteRequests.forEach(key => {
          tableRequests.push({ DeleteRequest: { Key: key } });
        });
      }
      
      if (tableRequests.length > 0) {
        requestItems[tableName] = tableRequests;
      }
    });

    const command = new BatchWriteCommand({
      RequestItems: requestItems,
    });
    
    await docClient.send(command);
  }
}

// Export singleton instance
export const dynamoDBService = new DynamoDBService();