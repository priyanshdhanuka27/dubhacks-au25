import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware to authenticate JWT tokens
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Access token required',
          message: 'Please provide a valid access token'
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      const validation = await this.authService.validateToken(token);
      
      if (!validation.valid) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: validation.error || 'Token validation failed'
        });
        return;
      }

      // Add user information to request
      req.user = {
        userId: validation.userId!
      };

      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication error',
        message: 'Internal server error during authentication'
      });
    }
  };

  /**
   * Optional authentication middleware - doesn't fail if no token provided
   */
  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        next();
        return;
      }

      const token = authHeader.substring(7);
      const validation = await this.authService.validateToken(token);
      
      if (validation.valid) {
        req.user = {
          userId: validation.userId!
        };
      }

      next();
    } catch (error) {
      console.error('Optional authentication middleware error:', error);
      // Continue without authentication on error
      next();
    }
  };
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware();