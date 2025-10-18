import { AuthService } from '../authService';
import { UserRegistration, UserCredentials } from '../../types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockDynamoClient: any;

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

    authService = new AuthService();
  });

  describe('registerUser', () => {
    const validUserData: UserRegistration = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'John',
      lastName: 'Doe',
      timezone: 'America/New_York'
    };

    it('should successfully register a new user', async () => {
      // Mock that user doesn't exist
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });
      
      // Mock password hashing
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      
      // Mock successful user creation
      mockDynamoClient.send.mockResolvedValueOnce({});
      
      // Mock JWT token generation
      (mockedJwt.sign as jest.Mock).mockReturnValueOnce('access-token');
      (mockedJwt.sign as jest.Mock).mockReturnValueOnce('refresh-token');

      const result = await authService.registerUser(validUserData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.token?.token).toBe('access-token');
      expect(result.token?.refreshToken).toBe('refresh-token');
      
      // Verify password was hashed
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('TestPassword123', 12);
      
      // Verify user was saved to DynamoDB
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });

    it('should fail when user already exists', async () => {
      // Mock that user already exists
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { email: 'test@example.com', userId: 'existing-user' }
      });

      const result = await authService.registerUser(validUserData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User with this email already exists');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      // Mock that user doesn't exist (first call)
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });
      // Mock password hashing succeeds
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      // Mock database error on user creation (second call)
      mockDynamoClient.send.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await authService.registerUser(validUserData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed. Please try again.');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });
  });

  describe('authenticateUser', () => {
    const validCredentials: UserCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123'
    };

    const mockUser = {
      userId: 'test-user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        interests: [],
        timezone: 'America/New_York'
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

    it('should successfully authenticate user with valid credentials', async () => {
      // Mock user exists
      mockDynamoClient.send.mockResolvedValueOnce({ Item: mockUser });
      
      // Mock password comparison
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      // Mock update last login
      mockDynamoClient.send.mockResolvedValueOnce({});
      
      // Mock JWT token generation
      (mockedJwt.sign as jest.Mock).mockReturnValueOnce('access-token');
      (mockedJwt.sign as jest.Mock).mockReturnValueOnce('refresh-token');

      const result = await authService.authenticateUser(validCredentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user?.userId).toBe('test-user-id');
      expect(result.token?.token).toBe('access-token');
      
      // Verify password was compared
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('TestPassword123', 'hashed-password');
    });

    it('should fail with invalid email', async () => {
      // Mock user doesn't exist
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });

      const result = await authService.authenticateUser(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should fail with invalid password', async () => {
      // Mock user exists
      mockDynamoClient.send.mockResolvedValueOnce({ Item: mockUser });
      
      // Mock password comparison fails
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.authenticateUser(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error on getUserByEmail
      mockDynamoClient.send.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await authService.authenticateUser(validCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed. Please try again.');
    });
  });

  describe('validateToken', () => {
    it('should successfully validate a valid access token', async () => {
      const mockDecoded = { userId: 'test-user-id', type: 'access' };
      
      // Mock JWT verification
      (mockedJwt.verify as jest.Mock).mockReturnValue(mockDecoded as any);
      
      // Mock user exists
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { userId: 'test-user-id', email: 'test@example.com' }
      });

      const result = await authService.validateToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('test-user-id');
      expect(result.error).toBeUndefined();
    });

    it('should fail with invalid token type', async () => {
      const mockDecoded = { userId: 'test-user-id', type: 'refresh' };
      
      // Mock JWT verification
      (mockedJwt.verify as jest.Mock).mockReturnValue(mockDecoded as any);

      const result = await authService.validateToken('invalid-type-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token type');
      expect(result.userId).toBeUndefined();
    });

    it('should fail when user no longer exists', async () => {
      const mockDecoded = { userId: 'test-user-id', type: 'access' };
      
      // Mock JWT verification
      (mockedJwt.verify as jest.Mock).mockReturnValue(mockDecoded as any);
      
      // Mock user doesn't exist
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });

      const result = await authService.validateToken('valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.userId).toBeUndefined();
    });

    it('should handle expired tokens', async () => {
      // Mock JWT verification throws TokenExpiredError
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      (mockedJwt.verify as jest.Mock).mockImplementation(() => {
        throw expiredError;
      });

      const result = await authService.validateToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.userId).toBeUndefined();
    });

    it('should handle invalid tokens', async () => {
      // Mock JWT verification throws generic error
      (mockedJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.userId).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    const mockUser = {
      userId: 'test-user-id',
      email: 'test@example.com',
      profile: { firstName: 'John', lastName: 'Doe' }
    };

    it('should successfully refresh token with valid refresh token', async () => {
      const mockDecoded = { userId: 'test-user-id', type: 'refresh' };
      
      // Mock JWT verification
      (mockedJwt.verify as jest.Mock).mockReturnValue(mockDecoded as any);
      
      // Mock user exists
      mockDynamoClient.send.mockResolvedValueOnce({ Item: mockUser });
      
      // Mock new token generation
      (mockedJwt.sign as jest.Mock).mockReturnValueOnce('new-access-token');
      (mockedJwt.sign as jest.Mock).mockReturnValueOnce('new-refresh-token');

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token?.token).toBe('new-access-token');
      expect(result.token?.refreshToken).toBe('new-refresh-token');
    });

    it('should fail with invalid refresh token type', async () => {
      const mockDecoded = { userId: 'test-user-id', type: 'access' };
      
      // Mock JWT verification
      (mockedJwt.verify as jest.Mock).mockReturnValue(mockDecoded as any);

      const result = await authService.refreshToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should fail when user no longer exists', async () => {
      const mockDecoded = { userId: 'test-user-id', type: 'refresh' };
      
      // Mock JWT verification
      (mockedJwt.verify as jest.Mock).mockReturnValue(mockDecoded as any);
      
      // Mock user doesn't exist
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });
  });

  describe('validateRegistrationData', () => {
    it('should validate correct registration data', () => {
      const validData: UserRegistration = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York'
      };

      const result = AuthService.validateRegistrationData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const invalidData: UserRegistration = {
        email: 'invalid-email',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York'
      };

      const result = AuthService.validateRegistrationData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid email address is required');
    });

    it('should reject weak password', () => {
      const invalidData: UserRegistration = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York'
      };

      const result = AuthService.validateRegistrationData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    });

    it('should reject short names', () => {
      const invalidData: UserRegistration = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'J',
        lastName: 'D',
        timezone: 'America/New_York'
      };

      const result = AuthService.validateRegistrationData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('First name must be at least 2 characters long');
      expect(result.errors).toContain('Last name must be at least 2 characters long');
    });

    it('should require timezone', () => {
      const invalidData: UserRegistration = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
        timezone: ''
      };

      const result = AuthService.validateRegistrationData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timezone is required');
    });
  });

  describe('validateLoginCredentials', () => {
    it('should validate correct login credentials', () => {
      const validCredentials: UserCredentials = {
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const result = AuthService.validateLoginCredentials(validCredentials);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require email and password', () => {
      const invalidCredentials: UserCredentials = {
        email: '',
        password: ''
      };

      const result = AuthService.validateLoginCredentials(invalidCredentials);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
      expect(result.errors).toContain('Password is required');
    });
  });
});