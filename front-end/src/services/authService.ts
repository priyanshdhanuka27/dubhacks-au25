import axios, { AxiosResponse } from 'axios';
import { config } from '../config';
import { 
  LoginCredentials, 
  RegisterData, 
  User, 
  ApiResponse 
} from '../types';

export interface AuthToken {
  token: string;
  refreshToken: string;
  expiresAt: Date;
  userId: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  token?: AuthToken;
  error?: string;
}

class AuthService {
  private baseURL: string;

  constructor() {
    this.baseURL = config.api.baseUrl;
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<AuthResult> {
    try {
      const response: AxiosResponse<ApiResponse<AuthResult>> = await axios.post(
        `${this.baseURL}/auth/register`,
        {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          timezone: userData.timezone
        },
        {
          timeout: config.api.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.data) {
        const authResult = response.data.data;
        
        // Store tokens and user data
        if (authResult.token) {
          this.storeAuthData(authResult.token, authResult.user);
        }
        
        return authResult;
      }

      return {
        success: false,
        error: response.data.error || 'Registration failed'
      };

    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.message) {
        return {
          success: false,
          error: error.response.data.message
        };
      }
      
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response: AxiosResponse<ApiResponse<AuthResult>> = await axios.post(
        `${this.baseURL}/auth/login`,
        credentials,
        {
          timeout: config.api.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.data) {
        const authResult = response.data.data;
        
        // Store tokens and user data
        if (authResult.token) {
          this.storeAuthData(authResult.token, authResult.user);
        }
        
        return authResult;
      }

      return {
        success: false,
        error: response.data.error || 'Login failed'
      };

    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.data?.message) {
        return {
          success: false,
          error: error.response.data.message
        };
      }
      
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = this.getStoredToken();
      
      if (token) {
        // Call logout endpoint
        await axios.delete(`${this.baseURL}/auth/logout`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: config.api.timeout
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Always clear local storage
      this.clearAuthData();
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthResult> {
    try {
      const refreshToken = this.getStoredRefreshToken();
      
      if (!refreshToken) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      const response: AxiosResponse<ApiResponse<AuthResult>> = await axios.post(
        `${this.baseURL}/auth/refresh`,
        { refreshToken },
        {
          timeout: config.api.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.data) {
        const authResult = response.data.data;
        
        // Store new tokens and user data
        if (authResult.token) {
          this.storeAuthData(authResult.token, authResult.user);
        }
        
        return authResult;
      }

      // If refresh fails, clear stored data
      this.clearAuthData();
      
      return {
        success: false,
        error: response.data.error || 'Token refresh failed'
      };

    } catch (error: any) {
      console.error('Token refresh error:', error);
      
      // Clear stored data on refresh failure
      this.clearAuthData();
      
      return {
        success: false,
        error: 'Session expired. Please log in again.'
      };
    }
  }

  /**
   * Get current user from storage
   */
  getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem(config.auth.userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get stored access token
   */
  getStoredToken(): string | null {
    return localStorage.getItem(config.auth.tokenKey);
  }

  /**
   * Get stored refresh token
   */
  getStoredRefreshToken(): string | null {
    return localStorage.getItem(config.auth.refreshTokenKey);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  /**
   * Store authentication data in localStorage
   */
  private storeAuthData(authToken: AuthToken, user?: Omit<User, 'passwordHash'>): void {
    try {
      localStorage.setItem(config.auth.tokenKey, authToken.token);
      localStorage.setItem(config.auth.refreshTokenKey, authToken.refreshToken);
      
      if (user) {
        localStorage.setItem(config.auth.userKey, JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }

  /**
   * Clear authentication data from localStorage
   */
  private clearAuthData(): void {
    try {
      localStorage.removeItem(config.auth.tokenKey);
      localStorage.removeItem(config.auth.refreshTokenKey);
      localStorage.removeItem(config.auth.userKey);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Validate registration data
   */
  static validateRegistrationData(data: RegisterData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.push('Please enter a valid email address');
    }

    // Password validation
    if (!data.password || data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    // Confirm password validation
    if (data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }

    // Name validation
    if (!data.firstName || data.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters long');
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters long');
    }

    // Timezone validation
    if (!data.timezone) {
      errors.push('Please select a timezone');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate login credentials
   */
  static validateLoginCredentials(credentials: LoginCredentials): { isValid: boolean; errors: string[] } {
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

export const authService = new AuthService();