import { config } from '../config';

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

// Mock AWS services for testing
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_USERS_TABLE = 'test-eventsync-users';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';

// Increase test timeout for async operations
jest.setTimeout(10000);

// Global test setup
beforeAll(async () => {
  // Any global setup can go here
});

afterAll(async () => {
  // Any global cleanup can go here
});