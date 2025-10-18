import { UserCredentials, UserRegistration, AuthResult } from '../types';
export declare class AuthService {
    private dynamoClient;
    private usersTable;
    constructor();
    /**
     * Register a new user with password hashing and validation
     */
    registerUser(userData: UserRegistration): Promise<AuthResult>;
    /**
     * Authenticate user with credentials and generate JWT tokens
     */
    authenticateUser(credentials: UserCredentials): Promise<AuthResult>;
    /**
     * Validate JWT token and return user information
     */
    validateToken(token: string): Promise<{
        valid: boolean;
        userId?: string;
        error?: string;
    }>;
    /**
     * Refresh access token using refresh token
     */
    refreshToken(refreshToken: string): Promise<AuthResult>;
    /**
     * Get user by email
     */
    private getUserByEmail;
    /**
     * Get user by ID
     */
    private getUserById;
    /**
     * Update user's last login timestamp
     */
    private updateUserLastLogin;
    /**
     * Generate access and refresh tokens
     */
    private generateTokens;
    /**
     * Remove sensitive information from user object
     */
    private sanitizeUser;
    /**
     * Validate user registration data
     */
    static validateRegistrationData(userData: UserRegistration): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Validate login credentials
     */
    static validateLoginCredentials(credentials: UserCredentials): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=authService.d.ts.map