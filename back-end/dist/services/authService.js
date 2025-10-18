"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const config_1 = require("../config");
class AuthService {
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({
            region: config_1.config.aws.region,
            ...(config_1.config.aws.dynamodb.endpoint && { endpoint: config_1.config.aws.dynamodb.endpoint }),
            ...(config_1.config.aws.accessKeyId && config_1.config.aws.secretAccessKey && {
                credentials: {
                    accessKeyId: config_1.config.aws.accessKeyId,
                    secretAccessKey: config_1.config.aws.secretAccessKey,
                },
            }),
        });
        this.dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.usersTable = config_1.config.aws.dynamodb.usersTable;
    }
    /**
     * Register a new user with password hashing and validation
     */
    async registerUser(userData) {
        try {
            // Check if user already exists
            const existingUser = await this.getUserByEmail(userData.email);
            if (existingUser) {
                return {
                    success: false,
                    error: 'User with this email already exists'
                };
            }
            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcryptjs_1.default.hash(userData.password, saltRounds);
            // Create user object
            const userId = (0, uuid_1.v4)();
            const now = new Date();
            const userProfile = {
                firstName: userData.firstName,
                lastName: userData.lastName,
                interests: [],
                timezone: userData.timezone
            };
            const userPreferences = {
                eventCategories: [],
                maxDistance: 25,
                priceRange: {
                    min: 0,
                    max: 1000,
                    currency: 'USD'
                },
                notificationSettings: {
                    emailNotifications: true,
                    pushNotifications: false,
                    reminderTime: 60
                }
            };
            const user = {
                userId,
                email: userData.email.toLowerCase(),
                passwordHash,
                profile: userProfile,
                preferences: userPreferences,
                savedEvents: [],
                createdAt: now,
                updatedAt: now
            };
            // Save user to DynamoDB
            await this.dynamoClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.usersTable,
                Item: user,
                ConditionExpression: 'attribute_not_exists(email)'
            }));
            // Generate tokens
            const authToken = this.generateTokens(userId);
            return {
                success: true,
                user: this.sanitizeUser(user),
                token: authToken
            };
        }
        catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: 'Registration failed. Please try again.'
            };
        }
    }
    /**
     * Authenticate user with credentials and generate JWT tokens
     */
    async authenticateUser(credentials) {
        try {
            // Get user by email
            const user = await this.getUserByEmail(credentials.email);
            if (!user) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(credentials.password, user.passwordHash);
            if (!isPasswordValid) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }
            // Update last login timestamp
            await this.updateUserLastLogin(user.userId);
            // Generate tokens
            const authToken = this.generateTokens(user.userId);
            return {
                success: true,
                user: this.sanitizeUser(user),
                token: authToken
            };
        }
        catch (error) {
            console.error('Authentication error:', error);
            return {
                success: false,
                error: 'Authentication failed. Please try again.'
            };
        }
    }
    /**
     * Validate JWT token and return user information
     */
    async validateToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            if (decoded.type !== 'access') {
                return { valid: false, error: 'Invalid token type' };
            }
            // Verify user still exists
            const user = await this.getUserById(decoded.userId);
            if (!user) {
                return { valid: false, error: 'User not found' };
            }
            return { valid: true, userId: decoded.userId };
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return { valid: false, error: 'Token expired' };
            }
            return { valid: false, error: 'Invalid token' };
        }
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwtSecret);
            if (decoded.type !== 'refresh') {
                return {
                    success: false,
                    error: 'Invalid refresh token'
                };
            }
            // Verify user still exists
            const user = await this.getUserById(decoded.userId);
            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }
            // Generate new tokens
            const authToken = this.generateTokens(user.userId);
            return {
                success: true,
                user: this.sanitizeUser(user),
                token: authToken
            };
        }
        catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                error: 'Token refresh failed'
            };
        }
    }
    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        try {
            const result = await this.dynamoClient.send(new lib_dynamodb_1.GetCommand({
                TableName: this.usersTable,
                Key: { email: email.toLowerCase() }
            }));
            return result.Item || null;
        }
        catch (error) {
            console.error('Error getting user by email:', error);
            return null;
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        try {
            const result = await this.dynamoClient.send(new lib_dynamodb_1.GetCommand({
                TableName: this.usersTable,
                Key: { userId }
            }));
            return result.Item || null;
        }
        catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    }
    /**
     * Update user's last login timestamp
     */
    async updateUserLastLogin(userId) {
        try {
            await this.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.usersTable,
                Key: { userId },
                UpdateExpression: 'SET updatedAt = :now',
                ExpressionAttributeValues: {
                    ':now': new Date()
                }
            }));
        }
        catch (error) {
            console.error('Error updating last login:', error);
        }
    }
    /**
     * Generate access and refresh tokens
     */
    generateTokens(userId) {
        // jwt.sign typing requires the secret to be of type Secret
        // and options to match SignOptions; cast here using any to
        // satisfy the TypeScript compiler (secret comes from config).
        const secret = config_1.config.jwtSecret;
        const accessToken = jsonwebtoken_1.default.sign({ userId, type: 'access' }, secret, { expiresIn: config_1.config.jwtExpiresIn });
        const refreshToken = jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, secret, { expiresIn: config_1.config.refreshTokenExpiresIn });
        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setTime(expiresAt.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
        return {
            token: accessToken,
            refreshToken,
            expiresAt,
            userId
        };
    }
    /**
     * Remove sensitive information from user object
     */
    sanitizeUser(user) {
        const { passwordHash, ...sanitizedUser } = user;
        return sanitizedUser;
    }
    /**
     * Validate user registration data
     */
    static validateRegistrationData(userData) {
        const errors = [];
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!userData.email || !emailRegex.test(userData.email)) {
            errors.push('Valid email address is required');
        }
        // Password validation
        if (!userData.password || userData.password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
            errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        }
        // Name validation
        if (!userData.firstName || userData.firstName.trim().length < 2) {
            errors.push('First name must be at least 2 characters long');
        }
        if (!userData.lastName || userData.lastName.trim().length < 2) {
            errors.push('Last name must be at least 2 characters long');
        }
        // Timezone validation
        if (!userData.timezone) {
            errors.push('Timezone is required');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Validate login credentials
     */
    static validateLoginCredentials(credentials) {
        const errors = [];
        if (!credentials.email) {
            errors.push('Email is required');
        }
        if (!credentials.password) {
            errors.push('Password is required');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map