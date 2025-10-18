import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from '../../routes/authRoutes';
import { config } from '../../config';

// Mock AWS SDK for E2E tests
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('Authentication End-to-End Tests', () => {
  let app: express.Application;
  let mockDynamoClient: any;

  beforeAll(() => {
    // Create Express app similar to production setup
    app = express();
    
    // Middleware
    app.use(helmet());
    app.use(cors(config.cors));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Routes
    app.use('/auth', authRoutes);
    
    // Error handling middleware
    app.use((err: any, req: any, res: any, next: any) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    });
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock DynamoDB client
    mockDynamoClient = {
      send: jest.fn()
    };

    // Mock DynamoDBDocumentClient.from
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockDynamoClient);
  });

  describe('Complete User Registration and Authentication Flow', () => {
    const testUser = {
      email: 'e2e-test@example.com',
      password: 'TestPassword123',
      firstName: 'E2E',
      lastName: 'Test',
      timezone: 'America/New_York'
    };

    it('should complete full registration and login flow', async () => {
      // Step 1: Register new user
      // Mock that user doesn't exist
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });
      // Mock successful user creation
      mockDynamoClient.send.mockResolvedValueOnce({});

      const registrationResponse = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.data.user.email).toBe(testUser.email);
      expect(registrationResponse.body.data.token.token).toBeDefined();
      expect(registrationResponse.body.data.token.refreshToken).toBeDefined();

      const { token, refreshToken } = registrationResponse.body.data.token;

      // Step 2: Use access token to access protected route
      // Mock user exists for token validation
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { userId: registrationResponse.body.data.user.userId }
      });

      const protectedResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(protectedResponse.body.success).toBe(true);
      expect(protectedResponse.body.data.userId).toBe(registrationResponse.body.data.user.userId);

      // Step 3: Logout
      // Mock user exists for token validation
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { userId: registrationResponse.body.data.user.userId }
      });

      const logoutResponse = await request(app)
        .delete('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.message).toBe('Logout successful');

      // Step 4: Login with same credentials
      const mockUserData = {
        userId: registrationResponse.body.data.user.userId,
        email: testUser.email,
        passwordHash: 'hashed-password',
        profile: {
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          interests: [],
          timezone: testUser.timezone
        },
        preferences: {
          eventCategories: [],
          maxDistance: 25,
          priceRange: { min: 0, max: 1000, currency: 'USD' },
          notificationSettings: {
            emailNotifications: true,
            pushNotifications: false,
            reminderTime: 60
          }
        },
        savedEvents: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock user exists for login
      mockDynamoClient.send.mockResolvedValueOnce({ Item: mockUserData });
      // Mock update last login
      mockDynamoClient.send.mockResolvedValueOnce({});

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.email).toBe(testUser.email);
      expect(loginResponse.body.data.token.token).toBeDefined();
      expect(loginResponse.body.data.token.refreshToken).toBeDefined();

      // Step 5: Refresh token
      // Mock user exists for refresh token validation
      mockDynamoClient.send.mockResolvedValueOnce({ Item: mockUserData });

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: loginResponse.body.data.token.refreshToken
        })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.token.token).toBeDefined();
      expect(refreshResponse.body.data.token.refreshToken).toBeDefined();
      expect(refreshResponse.body.data.user.userId).toBe(registrationResponse.body.data.user.userId);
    });

    it('should prevent duplicate user registration', async () => {
      // Mock that user already exists
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { email: testUser.email, userId: 'existing-user-id' }
      });

      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should handle invalid login credentials', async () => {
      // Mock user doesn't exist
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject access to protected routes without token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject access to protected routes with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Input Validation End-to-End', () => {
    it('should validate registration input comprehensively', async () => {
      const invalidRegistrationData = {
        email: 'invalid-email',
        password: 'weak',
        firstName: 'J',
        lastName: 'D'
        // Missing timezone
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidRegistrationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Please provide a valid email address');
      expect(response.body.message).toContain('Password must be at least 8 characters long');
      expect(response.body.message).toContain('First name must be at least 2 characters long');
      expect(response.body.message).toContain('Last name must be at least 2 characters long');
      expect(response.body.message).toContain('Timezone is required');
    });

    it('should validate login input', async () => {
      const invalidLoginData = {
        email: 'invalid-email'
        // Missing password
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidLoginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Please provide a valid email address');
      expect(response.body.message).toContain('Password is required');
    });

    it('should validate refresh token input', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Refresh token is required');
    });
  });

  describe('Security End-to-End Tests', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express should handle malformed JSON and return 400
      expect(response.status).toBe(400);
    });

    it('should handle oversized requests', async () => {
      const oversizedData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'A'.repeat(10000), // Very long string
        lastName: 'Doe',
        timezone: 'America/New_York'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(oversizedData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      // Helmet should add security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });

  describe('Error Handling End-to-End', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database connection error
      mockDynamoClient.send.mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
          firstName: 'John',
          lastName: 'Doe',
          timezone: 'America/New_York'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('An unexpected error occurred during registration');
    });

    it('should handle service unavailable errors', async () => {
      // Mock service error during login
      mockDynamoClient.send.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('An unexpected error occurred during login');
    });
  });
});