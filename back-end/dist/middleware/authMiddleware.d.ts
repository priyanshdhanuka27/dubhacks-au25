import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
            };
        }
    }
}
export declare class AuthMiddleware {
    private authService;
    constructor();
    /**
     * Middleware to authenticate JWT tokens
     */
    authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Optional authentication middleware - doesn't fail if no token provided
     */
    optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const authMiddleware: AuthMiddleware;
//# sourceMappingURL=authMiddleware.d.ts.map