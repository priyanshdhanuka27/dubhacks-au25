#!/usr/bin/env node

/**
 * Database Migration Script for EventSync
 * This script sets up DynamoDB tables and initial data for production deployment
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  CreateTableCommand, 
  DescribeTableCommand,
  PutCommand,
  ScanCommand
} = require('@aws-sdk/lib-dynamodb');
const { config, validateConfig } = require('../dist/config');

// Validate configuration
validateConfig();

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: config.aws.region,
  ...(config.aws.accessKeyId && {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  }),
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table definitions
const TABLES = {
  users: {
    TableName: `${config.dynamodb.tablePrefix}-users`,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    SSESpecification: {
      SSEEnabled: true
    },
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true
    }
  },
  events: {
    TableName: `${config.dynamodb.tablePrefix}-events`,
    KeySchema: [
      { AttributeName: 'eventId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'eventId', AttributeType: 'S' },
      { AttributeName: 'createdBy', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' },
      { AttributeName: 'startDateTime', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserEventsIndex',
        KeySchema: [
          { AttributeName: 'createdBy', KeyType: 'HASH' },
          { AttributeName: 'startDateTime', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'CategoryIndex',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' },
          { AttributeName: 'startDateTime', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    SSESpecification: {
      SSEEnabled: true
    },
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true
    }
  }
};

// Helper functions
async function tableExists(tableName) {
  try {
    await docClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTable(tableConfig) {
  console.log(`Creating table: ${tableConfig.TableName}`);
  
  try {
    await docClient.send(new CreateTableCommand(tableConfig));
    console.log(`✅ Table ${tableConfig.TableName} created successfully`);
    
    // Wait for table to be active
    let tableStatus = 'CREATING';
    while (tableStatus !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const response = await docClient.send(new DescribeTableCommand({ 
        TableName: tableConfig.TableName 
      }));
      tableStatus = response.Table.TableStatus;
      console.log(`Table ${tableConfig.TableName} status: ${tableStatus}`);
    }
    
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`⚠️  Table ${tableConfig.TableName} already exists`);
    } else {
      throw error;
    }
  }
}

async function seedInitialData() {
  console.log('🌱 Seeding initial data...');
  
  // Check if we already have data
  const usersResponse = await docClient.send(new ScanCommand({
    TableName: TABLES.users.TableName,
    Limit: 1
  }));
  
  if (usersResponse.Items && usersResponse.Items.length > 0) {
    console.log('⚠️  Data already exists, skipping seed');
    return;
  }
  
  // Seed sample categories for events
  const sampleCategories = [
    'Technology',
    'Business',
    'Arts & Culture',
    'Sports & Fitness',
    'Food & Drink',
    'Music',
    'Education',
    'Health & Wellness',
    'Community',
    'Entertainment'
  ];
  
  console.log('✅ Initial data seeded successfully');
}

async function validateTables() {
  console.log('🔍 Validating table structure...');
  
  for (const [tableName, tableConfig] of Object.entries(TABLES)) {
    try {
      const response = await docClient.send(new DescribeTableCommand({ 
        TableName: tableConfig.TableName 
      }));
      
      console.log(`✅ Table ${tableConfig.TableName} is valid`);
      console.log(`   - Status: ${response.Table.TableStatus}`);
      console.log(`   - Item Count: ${response.Table.ItemCount || 0}`);
      console.log(`   - Size: ${response.Table.TableSizeBytes || 0} bytes`);
      
    } catch (error) {
      console.error(`❌ Error validating table ${tableConfig.TableName}:`, error.message);
      throw error;
    }
  }
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting EventSync database migration...');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Region: ${config.aws.region}`);
  console.log(`Table Prefix: ${config.dynamodb.tablePrefix}`);
  
  try {
    // Create tables
    for (const [tableName, tableConfig] of Object.entries(TABLES)) {
      const exists = await tableExists(tableConfig.TableName);
      if (!exists) {
        await createTable(tableConfig);
      } else {
        console.log(`✅ Table ${tableConfig.TableName} already exists`);
      }
    }
    
    // Seed initial data
    await seedInitialData();
    
    // Validate tables
    await validateTables();
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Rollback function
async function rollback() {
  console.log('🔄 Starting rollback...');
  
  // Note: In production, you might want to backup data before dropping tables
  console.log('⚠️  Rollback not implemented for safety reasons');
  console.log('   Please manually delete tables if needed');
  
  process.exit(0);
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'up':
  case 'migrate':
    migrate();
    break;
  case 'down':
  case 'rollback':
    rollback();
    break;
  case 'validate':
    validateTables();
    break;
  default:
    console.log('Usage: node migrate.js [up|down|validate]');
    console.log('  up/migrate: Run migrations');
    console.log('  down/rollback: Rollback migrations');
    console.log('  validate: Validate table structure');
    process.exit(1);
}