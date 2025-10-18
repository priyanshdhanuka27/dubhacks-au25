import request from 'supertest';
import express from 'express';
import authRoutes from '../authRoutes';
import { AuthService } from '../../services/authService';

// Mock AuthService
jest.mock('../../services/authService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

// Mock static methods
const mockValidateRegistrationData = jest.fn();
const mockValidateLoginCredentials = jest.fn();
AuthService.validateRegistrationData = mockValidateRegistrationData;
AuthService.validateLoginCredentials = mockValidateLoginCredentials;

describe('Auth Routes Integration Tests', () => {
  let app: express.Application;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock AuthService instance
    mockAuthService = {
      registerUser: jest.fn(),
      authenticateUser: jest.fn(),
      refreshToken: jest.fn(),
      validateToken: jest.fn(),
    } as any;

    // Mock AuthService constructor to return our mock instance
    MockedAuthService.mockImplementation(() => mockAuthService);

    // Mock static validation methods
    mockValidateRegistrationData.mockReturnValue({ isValid: true, errors: [] });
    mockValidateLoginCredentials.mockReturnValue({ isValid: true, errors: [] });

    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  describe('POST /auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'John',
      lastName: 'Doe',
      timezone: 'America/New_York'
    };

    it('should successfully register a new user', async () => {
      const mockResult = {
        success: true,
        user: {
          userId: 'test-user-id',
          email: 'test@example.com',
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
        },
        token: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: new Date(),
          userId: 'test-user-id'
        }
      };

      // Ensure validation passes
      mockValidateRegistrationData.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.registerUser.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.message).toBe('User registered successfully');
      expect(mockAuthService.registerUser).toHaveBeenCalledWith(validRegistrationData);
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Please provide a valid email address');
      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
    });

    it('should reject registration with weak password', async () => {
      const invalidData = {
        ...validRegistrationData,
        password: 'weak'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Password must be at least 8 characters long');
      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
    });

    it('should reject registration with missing required fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing other required fields
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
    });

    it('should handle user already exists error', async () => {
      const mockResult = {
        success: false,
        error: 'User with this email already exists'
      };

      // Ensure validation passes
      mockValidateRegistrationData.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.registerUser.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should handle service errors', async () => {
      mockAuthService.registerUser.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('An unexpected error occurred during registration');
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'TestPassword123'
    };

    it('should successfully authenticate user', async () => {
      const mockResult = {
        success: true,
        user: {
          userId: 'test-user-id',
          email: 'test@example.com',
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
        },
        token: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: new Date(),
          userId: 'test-user-id'
        }
      };

      // Ensure validation passes
      mockValidateLoginCredentials.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.authenticateUser.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.message).toBe('Login successful');
      expect(mockAuthService.authenticateUser).toHaveBeenCalledWith(validLoginData);
    });

    it('should reject login with invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Please provide a valid email address');
      expect(mockAuthService.authenticateUser).not.toHaveBeenCalled();
    });

    it('should reject login with missing credentials', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Password is required');
      expect(mockAuthService.authenticateUser).not.toHaveBeenCalled();
    });

    it('should handle invalid credentials', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid credentials'
      };

      // Ensure validation passes
      mockValidateLoginCredentials.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.authenticateUser.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should handle service errors', async () => {
      mockAuthService.authenticateUser.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('An unexpected error occurred during login');
    });
  });

  describe('POST /auth/refresh', () => {
    const validRefreshData = {
      refreshToken: 'valid-refresh-token'
    };

    it('should successfully refresh token', async () => {
      const mockResult = {
        success: true,
        user: {
          userId: 'test-user-id',
          email: 'test@example.com',
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
        },
        token: {
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: new Date(),
          userId: 'test-user-id'
        }
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/auth/refresh')
        .send(validRefreshData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should reject refresh with missing token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('Refresh token is required');
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('should handle invalid refresh token', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid refresh token'
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/auth/refresh')
        .send(validRefreshData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('should handle service errors', async () => {
      mockAuthService.refreshToken.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/auth/refresh')
        .send(validRefreshData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('An unexpected error occurred during token refresh');
    });
  });

  describe('DELETE /auth/logout', () => {
    it('should successfully logout authenticated user', async () => {
      // Mock successful token validation for middleware
      mockAuthService.validateToken.mockResolvedValue({
        valid: true,
        userId: 'test-user-id'
      });

      const response = await request(app)
        .delete('/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .delete('/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject logout with invalid token', async () => {
      // Mock token validation failure
      mockAuthService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token'
      });

      const response = await request(app)
        .delete('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user information for authenticated user', async () => {
      // Mock successful token validation for middleware
      mockAuthService.validateToken.mockResolvedValue({
        valid: true,
        userId: 'test-user-id'
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ userId: 'test-user-id' });
      expect(response.body.message).toBe('User information retrieved successfully');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      // Mock token validation failure
      mockAuthService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token'
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });
});