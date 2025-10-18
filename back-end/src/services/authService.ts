import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { 
  User, 
  UserCredentials, 
  UserRegistration, 
  AuthToken, 
  AuthResult,
  UserProfile,
  UserPreferences 
} from '../types';

export class AuthService {
  private dynamoClient: DynamoDBDocumentClient;
  private usersTable: string;

  constructor() {
    const client = new DynamoDBClient({
      region: config.aws.region,
      ...(config.aws.dynamodb.endpoint && { endpoint: config.aws.dynamodb.endpoint }),
      ...(config.aws.accessKeyId && config.aws.secretAccessKey && {
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      }),
    });
    
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.usersTable = config.aws.dynamodb.usersTable;
  }

  /**
   * Register a new user with password hashing and validation
   */
  async registerUser(userData: UserRegistration): Promise<AuthResult> {
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
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Create user object
      const userId = uuidv4();
      const now = new Date();
      
      const userProfile: UserProfile = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        interests: [],
        timezone: userData.timezone
      };

      const userPreferences: UserPreferences = {
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

      const user: User = {
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
      await this.dynamoClient.send(new PutCommand({
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

    } catch (error) {
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
  async authenticateUser(credentials: UserCredentials): Promise<AuthResult> {
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
      const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
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

    } catch (error) {
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
  async validateToken(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; type: string };
      
      if (decoded.type !== 'access') {
        return { valid: false, error: 'Invalid token type' };
      }

      // Verify user still exists
      const user = await this.getUserById(decoded.userId);
      if (!user) {
        return { valid: false, error: 'User not found' };
      }

      return { valid: true, userId: decoded.userId };

    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired' };
      }
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as { userId: string; type: string };
      
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

    } catch (error) {
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
  private async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.dynamoClient.send(new GetCommand({
      TableName: this.usersTable,
      Key: { email: email.toLowerCase() }
    }));

    return result.Item as User || null;
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string): Promise<User | null> {
    const result = await this.dynamoClient.send(new GetCommand({
      TableName: this.usersTable,
      Key: { userId }
    }));

    return result.Item as User || null;
  }

  /**
   * Update user's last login timestamp
   */
  private async updateUserLastLogin(userId: string): Promise<void> {
    try {
      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.usersTable,
        Key: { userId },
        UpdateExpression: 'SET updatedAt = :now',
        ExpressionAttributeValues: {
          ':now': new Date()
        }
      }));
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(userId: string): AuthToken {
    // jwt.sign typing requires the secret to be of type Secret
    // and options to match SignOptions; cast here using any to
    // satisfy the TypeScript compiler (secret comes from config).
    const secret: any = config.jwtSecret as any;
    const accessToken = jwt.sign(
      { userId, type: 'access' } as any,
      secret,
      { expiresIn: config.jwtExpiresIn } as any
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' } as any,
      secret,
      { expiresIn: config.refreshTokenExpiresIn } as any
    );

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
  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Validate user registration data
   */
  static validateRegistrationData(userData: UserRegistration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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
  static validateLoginCredentials(credentials: UserCredentials): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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