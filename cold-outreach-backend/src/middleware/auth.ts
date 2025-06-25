import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
    [key: string]: any;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware to verify JWT token and authenticate user
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    throw new UnauthorizedError('Access token required');
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload = jwt.verify(token, jwtSecret) as JWTPayload;

    // Add user info to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      ...(payload.role && { role: payload.role }),
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRole = req.user.role || 'user';

    if (!roles.includes(userRole)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
}

/**
 * Middleware to check if user owns the resource or has admin role
 */
export function requireOwnershipOrAdmin(userIdField: string = 'userId') {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    const currentUserId = req.user.id;
    const userRole = req.user.role || 'user';

    // Allow if user owns the resource or is admin
    if (resourceUserId === currentUserId || userRole === 'admin') {
      next();
      return;
    }

    throw new ForbiddenError('Access denied: insufficient permissions');
  };
}

/**
 * Optional authentication middleware (doesn't throw if no token)
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    // No token provided, continue without authentication
    next();
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      next();
      return;
    }

    const payload = jwt.verify(token, jwtSecret) as JWTPayload;

    // Add user info to request if token is valid
    req.user = {
      id: payload.userId,
      email: payload.email,
      ...(payload.role && { role: payload.role }),
    };

    next();
  } catch (error) {
    // Invalid token, but don't throw error - just continue without auth
    next();
  }
}

/**
 * Utility function to generate JWT token
 * TODO: Fix JWT typing issue
 */
export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  // Temporary implementation - fix JWT types later
  return jwt.sign(payload as any, jwtSecret, { expiresIn } as any);
}

/**
 * Utility function to verify token without throwing
 */
export function verifyTokenSafe(token: string): JWTPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return null;
    }

    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch {
    return null;
  }
}
