import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  
  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    
    // DynamoDB configuration
    dynamodb: {
      usersTable: process.env.DYNAMODB_USERS_TABLE || 'eventsync-users',
      eventsTable: process.env.DYNAMODB_EVENTS_TABLE || 'eventsync-events',
      endpoint: process.env.DYNAMODB_ENDPOINT, // For local development
    },
    
    // OpenSearch configuration
    opensearch: {
      endpoint: process.env.OPENSEARCH_ENDPOINT,
      region: process.env.OPENSEARCH_REGION || 'us-east-1',
      indexName: process.env.OPENSEARCH_INDEX_NAME || 'eventsync-events',
    },
    
    // Bedrock configuration
    bedrock: {
      region: process.env.BEDROCK_REGION || 'us-east-1',
      knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID,
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      embeddingModelId: process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0',
    },
    
    // CloudWatch configuration
    cloudwatch: {
      logGroupName: process.env.CLOUDWATCH_LOG_GROUP || '/aws/lambda/eventsync',
      region: process.env.CLOUDWATCH_REGION || 'us-east-1',
    },
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  },
  
  // Search configuration
  search: {
    maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || '50'),
    defaultRadius: parseInt(process.env.SEARCH_DEFAULT_RADIUS || '25'), // miles
  },
  
  // Calendar configuration
  calendar: {
    icsFileTTL: parseInt(process.env.ICS_FILE_TTL || '3600'), // 1 hour in seconds
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'AWS_REGION',
  'DYNAMODB_USERS_TABLE',
  'DYNAMODB_EVENTS_TABLE',
  'OPENSEARCH_ENDPOINT',
  'BEDROCK_KNOWLEDGE_BASE_ID',
];

export function validateConfig(): void {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}