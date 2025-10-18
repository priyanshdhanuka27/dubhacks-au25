import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../authMiddleware';
import { AuthService } from '../../services/authService';

// Mock AuthService
jest.mock('../../services/authService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock AuthService instance
    mockAuthService = {
      validateToken: jest.fn(),
    } as any;

    // Mock AuthService constructor to return our mock instance
    MockedAuthService.mockImplementation(() => mockAuthService);

    authMiddleware = new AuthMiddleware();

    // Setup mock request, response, and next function
    mockRequest = {
      headers: {},
      user: undefined
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid Bearer token', async () => {
      // Setup valid authorization header
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      // Mock successful token validation
      mockAuthService.validateToken.mockResolvedValue({
        valid: true,
        userId: 'test-user-id'
      });

      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({ userId: 'test-user-id' });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      // No authorization header
      mockRequest.headers = {};

      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid access token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization format', async () => {
      // Invalid authorization format (not Bearer)
      mockRequest.headers = {
        authorization: 'Basic invalid-format'
      };

      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid access token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      // Mock token validation failure
      mockAuthService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token'
      });

      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('invalid-token');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
        message: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      };

      // Mock token validation failure with expired error
      mockAuthService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Token expired'
      });

      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('expired-token');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
        message: 'Token expired'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle authentication service errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      // Mock service error
      mockAuthService.validateToken.mockRejectedValue(new Error('Service unavailable'));

      await authMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication error',
        message: 'Internal server error during authentication'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate user with valid Bearer token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      // Mock successful token validation
      mockAuthService.validateToken.mockResolvedValue({
        valid: true,
        userId: 'test-user-id'
      });

      await authMiddleware.optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({ userId: 'test-user-id' });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      // No authorization header
      mockRequest.headers = {};

      await authMiddleware.optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      // Mock token validation failure
      mockAuthService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token'
      });

      await authMiddleware.optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('invalid-token');
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication on service errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      // Mock service error
      mockAuthService.validateToken.mockRejectedValue(new Error('Service unavailable'));

      await authMiddleware.optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication with malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'Basic invalid-format'
      };

      await authMiddleware.optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});