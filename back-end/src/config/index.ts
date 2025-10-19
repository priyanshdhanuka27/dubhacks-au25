import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Also load default .env file as fallback
dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'production',
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  
  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    // Only use access keys for local development
    // In production (Lambda, App Runner, ECS), IAM roles are used automatically
    accessKeyId: process.env.NODE_ENV === 'development' ? process.env.AWS_ACCESS_KEY_ID : undefined,
    secretAccessKey: process.env.NODE_ENV === 'development' ? process.env.AWS_SECRET_ACCESS_KEY : undefined,
    
    // DynamoDB configuration
    dynamodb: {
      usersTable: process.env.DYNAMODB_TABLE_USERS || process.env.DYNAMODB_USERS_TABLE || 'eventsync-dev-users',
      eventsTable: process.env.DYNAMODB_TABLE_EVENTS || process.env.DYNAMODB_EVENTS_TABLE || 'eventsync-dev-events',
      endpoint: process.env.DYNAMODB_ENDPOINT, // For local DynamoDB
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
];

// Additional required vars for production
const productionRequiredVars = [
  'OPENSEARCH_ENDPOINT',
  'BEDROCK_KNOWLEDGE_BASE_ID',
];

export function validateConfig(): void {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  // Check production-specific vars only in production
  if (process.env.NODE_ENV === 'production') {
    const missingProdVars = productionRequiredVars.filter(varName => !process.env[varName]);
    missingVars.push(...missingProdVars);
  }
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    console.log('Available deployment options:');
    console.log('1. AWS App Runner (recommended)');
    console.log('2. AWS Lambda + API Gateway');
    console.log('3. AWS ECS Fargate');
    console.log('4. Local development with AWS credentials');
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}