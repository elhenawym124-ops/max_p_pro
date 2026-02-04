import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '@/config/database';
import { config } from '@/config';
import { AuthenticationError, AuthorizationError } from '@/middleware/errorHandler';
import { UserRole, Permission, ROLE_PERMISSIONS } from '@/types/shared';

/**
 * Authentication and Authorization Middleware
 * 
 * Handles JWT token verification and permission checking
 */

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        companyId: string;
        permissions: Permission[];
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  companyId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Get user from database
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        companyId: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.isActive) {
      throw new AuthenticationError('User account is disabled');
    }

    // ⚡ FIX: Prioritize companyId and role from token for session isolation
    const activeCompanyId = decoded.companyId || user.companyId;
    const activeRole = (decoded.role || user.role) as UserRole;

    // 🛡️ SECURITY Check: Verify the user still belongs to this company (not a Zombie session)
    if (user.role !== UserRole.SUPER_ADMIN && activeCompanyId !== user.companyId) {
      const prisma = getPrismaClient();
      const userCompany = await prisma.userCompany.findUnique({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: activeCompanyId
          }
        }
      });

      if (!userCompany || !userCompany.isActive) {
        throw new AuthenticationError('User no longer has access to this company');
      }
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: activeRole,
      companyId: activeCompanyId,
      permissions: ROLE_PERMISSIONS[activeRole],
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication - doesn't throw error if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await authenticateToken(req, res, next);
    } else {
      next();
    }
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Check if user has required role
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user has required permission
 */
export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const hasPermission = permissions.some(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user has all required permissions
 */
export const requireAllPermissions = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const hasAllPermissions = permissions.every(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user belongs to the same company as the resource
 */
export const requireSameCompany = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  // This middleware should be used after resource validation
  // The resource should be attached to req.resource
  const resource = (req as any).resource;

  if (resource && resource.companyId !== req.user.companyId) {
    return next(new AuthorizationError('Access denied to this resource'));
  }

  next();
};

/**
 * Check if user is super admin
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (req.user.role !== UserRole.SUPER_ADMIN) {
    return next(new AuthorizationError('Super admin access required'));
  }

  next();
};

/**
 * Check if user is company admin or higher
 */
export const requireCompanyAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN];

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AuthorizationError('Company admin access required'));
  }

  next();
};

/**
 * Check if user is manager or higher
 */
export const requireManager = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  const allowedRoles = [
    UserRole.SUPER_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.MANAGER,
  ];

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AuthorizationError('Manager access required'));
  }

  next();
};

/**
 * Check if user can access their own resource or has admin privileges
 */
export const requireOwnershipOrAdmin = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Super admins and company admins can access any resource
    const adminRoles = [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN];
    if (adminRoles.includes(req.user.role)) {
      return next();
    }

    // Check ownership
    const resource = (req as any).resource;
    const resourceUserId = resource?.[userIdField] || req.params.userId || req.params.id;

    if (resourceUserId !== req.user.id) {
      return next(new AuthorizationError('Access denied to this resource'));
    }

    next();
  };
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This would typically use Redis or in-memory store
  // For now, we'll use a simple in-memory approach
  const ip = req.ip;
  const key = `auth_attempts_${ip}`;

  // In a real implementation, you'd use Redis or a proper rate limiting library
  // This is just a placeholder
  next();
};
