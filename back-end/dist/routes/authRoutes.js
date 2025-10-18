"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const authService_1 = require("../services/authService");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const authService = new authService_1.AuthService();
// Validation schemas
const registrationSchema = joi_1.default.object({
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required'
    }),
    firstName: joi_1.default.string().min(2).max(50).required().messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
    }),
    lastName: joi_1.default.string().min(2).max(50).required().messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
    }),
    timezone: joi_1.default.string().required().messages({
        'any.required': 'Timezone is required'
    })
});
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string().required().messages({
        'any.required': 'Password is required'
    })
});
const refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string().required().messages({
        'any.required': 'Refresh token is required'
    })
});
/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = registrationSchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: 'Validation failed',
                message: error.details.map(detail => detail.message).join(', ')
            };
            res.status(400).json(response);
            return;
        }
        const userData = value;
        // Additional server-side validation
        const validation = authService_1.AuthService.validateRegistrationData(userData);
        if (!validation.isValid) {
            const response = {
                success: false,
                error: 'Validation failed',
                message: validation.errors.join(', ')
            };
            res.status(400).json(response);
            return;
        }
        // Register user
        const result = await authService.registerUser(userData);
        if (!result.success) {
            const statusCode = result.error?.includes('already exists') ? 409 : 400;
            const response = {
                success: false,
                error: result.error || 'Registration failed',
                message: result.error || 'Unable to create user account'
            };
            res.status(statusCode).json(response);
            return;
        }
        const response = {
            success: true,
            data: result,
            message: 'User registered successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Registration endpoint error:', error);
        const response = {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred during registration'
        };
        res.status(500).json(response);
    }
});
/**
 * POST /auth/login
 * Authenticate user and return access tokens
 */
router.post('/login', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: 'Validation failed',
                message: error.details.map(detail => detail.message).join(', ')
            };
            res.status(400).json(response);
            return;
        }
        const credentials = value;
        // Additional server-side validation
        const validation = authService_1.AuthService.validateLoginCredentials(credentials);
        if (!validation.isValid) {
            const response = {
                success: false,
                error: 'Validation failed',
                message: validation.errors.join(', ')
            };
            res.status(400).json(response);
            return;
        }
        // Authenticate user
        const result = await authService.authenticateUser(credentials);
        if (!result.success) {
            const response = {
                success: false,
                error: result.error || 'Authentication failed',
                message: result.error || 'Invalid credentials provided'
            };
            res.status(401).json(response);
            return;
        }
        const response = {
            success: true,
            data: result,
            message: 'Login successful'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Login endpoint error:', error);
        const response = {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred during login'
        };
        res.status(500).json(response);
    }
});
/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = refreshTokenSchema.validate(req.body);
        if (error) {
            const response = {
                success: false,
                error: 'Validation failed',
                message: error.details.map(detail => detail.message).join(', ')
            };
            res.status(400).json(response);
            return;
        }
        const { refreshToken } = value;
        // Refresh token
        const result = await authService.refreshToken(refreshToken);
        if (!result.success) {
            const response = {
                success: false,
                error: result.error || 'Token refresh failed',
                message: result.error || 'Unable to refresh access token'
            };
            res.status(401).json(response);
            return;
        }
        const response = {
            success: true,
            data: result,
            message: 'Token refreshed successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Token refresh endpoint error:', error);
        const response = {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred during token refresh'
        };
        res.status(500).json(response);
    }
});
/**
 * DELETE /auth/logout
 * Logout user (client-side token removal)
 */
router.delete('/logout', authMiddleware_1.authMiddleware.authenticate, async (req, res) => {
    try {
        // In a stateless JWT system, logout is primarily handled client-side
        // by removing the tokens from storage. This endpoint serves as a confirmation
        // and could be extended to maintain a token blacklist if needed.
        const response = {
            success: true,
            message: 'Logout successful'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Logout endpoint error:', error);
        const response = {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred during logout'
        };
        res.status(500).json(response);
    }
});
/**
 * GET /auth/me
 * Get current user information (protected route for testing authentication)
 */
router.get('/me', authMiddleware_1.authMiddleware.authenticate, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            const response = {
                success: false,
                error: 'User not found',
                message: 'Unable to retrieve user information'
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            data: { userId },
            message: 'User information retrieved successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Get user info endpoint error:', error);
        const response = {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred while retrieving user information'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map