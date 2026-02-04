const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      throw jwtError;
    }

    // Get user from database with retry logic for connection issues
    let user;
    let retries = 2;
    let lastError;

    while (retries > 0) {
      try {
        user = await getSharedPrismaClient().user.findUnique({
          where: { id: decoded.userId },
          include: {
            companies: true
          }
        });
        break; // Success, exit retry loop
      } catch (dbError) {
        lastError = dbError;
        retries--;

        // Check if it's a connection error worth retrying
        const isConnectionError =
          dbError.message?.includes('Engine is not yet connected') ||
          dbError.message?.includes('Connection') ||
          dbError.message?.includes('timeout') ||
          dbError.code === 'P1001' ||
          dbError.code === 'P1008' ||
          dbError.code === 'P1017';

        if (isConnectionError && retries > 0) {
          console.warn(`[AUTH] Database connection issue, retrying... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
          continue;
        }

        // Log the actual error for debugging
        console.error('[AUTH ERROR] Database query failed:', {
          error: dbError.message,
          code: dbError.code,
          userId: decoded.userId,
          path: req.path
        });

        return res.status(503).json({
          error: 'Database temporarily unavailable',
          code: 'DB_CONNECTION_ERROR'
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // ⚡ FIX: Use companyId from Header (x-company-id) if available, otherwise token, otherwise fallback to database
    // This allows different browser tabs to operate in different company contexts
    const activeCompanyId = req.headers['x-company-id'] || decoded.companyId || user.companyId;

    // Get company details & Security check: Verify user still has access
    let activeCompany = user.company;
    let activeRole = decoded.role || user.role;
    let userCompany = null;

    // 🛡️ SECURITY Check: Verify the user belongs to this company (not a Zombie session)
    // Super Admin is exempt from this check
    if (user.role !== 'SUPER_ADMIN') {
      // Ensure activeCompanyId is a valid string for Prisma
      const safeCompanyId = String(activeCompanyId || '');
      if (!safeCompanyId || safeCompanyId === '[object Object]') {
        console.error(`[AUTH] INVALID company ID attempted: "${activeCompanyId}" by ${user.email} (Path: ${req.path})`);
        return res.status(400).json({ error: 'Invalid active company ID context' });
      }

      try {
        userCompany = await getSharedPrismaClient().userCompany.findUnique({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: safeCompanyId
            }
          }
        });
      } catch (prismaError) {
        console.error(`[AUTH] Membership verification failed:`, prismaError.message);
        return res.status(500).json({ error: 'Database error during membership check' });
      }

      if (!userCompany || !userCompany.isActive) {
        // Fallback check: maybe the user just has user.companyId set and no userCompany record yet
        if (safeCompanyId === user.companyId) {
          console.log(`[AUTH] User ${user.email} belongs to primary company ${safeCompanyId} but has no UserCompany record. Allowing.`);
        } else {
          console.warn(`[AUTH] Access Denied: User ${user.email} is not a member of company ${safeCompanyId}`);
          return res.status(403).json({
            error: 'User no longer has access to this company',
            code: 'ACCESS_REVOKED',
            requestedCompanyId: safeCompanyId,
            userPrimaryCompany: user.companyId
          });
        }
      }

      // ⚡ FIX: Use role from userCompany if available (company-specific role)
      if (userCompany && userCompany.role) {
        activeRole = userCompany.role;
      }
    }

    if (activeCompanyId !== user.companyId) {
      // Fetch the specific company details
      activeCompany = await getSharedPrismaClient().company.findUnique({
        where: { id: activeCompanyId }
      });

      if (!activeCompany) {
        return res.status(403).json({
          error: 'Current company context is invalid',
          code: 'INVALID_COMPANY_CONTEXT'
        });
      }
    } else if (!userCompany) {
      // Even if same company, check userCompany for role if it exists (if not already fetched)
      userCompany = await getSharedPrismaClient().userCompany.findFirst({
        where: {
          userId: user.id,
          companyId: activeCompanyId,
          isActive: true
        }
      });

      if (userCompany && userCompany.role) {
        activeRole = userCompany.role;
      }
    }

    // Add user info to request
    req.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: activeRole,
      companyId: activeCompanyId,
      company: activeCompany
    };

    // Security logging (development only - in production, use proper logging service)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] Authenticated access: ${user.email} (${user.companyId}) - ${req.method} ${req.path}`);
      console.log(`[AUTH] req.user summary:`, { id: req.user.id, email: req.user.email, companyId: req.user.companyId });
    }

    // Ensure companyId is set (critical check) - except for SUPER_ADMIN
    if (!req.user.companyId && user.role !== 'SUPER_ADMIN') {
      console.error('[AUTH ERROR] User authenticated but companyId is missing:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        path: req.path
      });
      return res.status(403).json({
        error: 'User must be associated with a company',
        code: 'COMPANY_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('[AUTH ERROR] Unexpected error:', {
      error: error.message,
      stack: error.stack?.substring(0, 500),
      path: req.path
    });

    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Log role check for debugging
    console.log(`🔐 [ROLE-CHECK] Path: ${req.path}, User Role: ${req.user.role}, Allowed Roles: [${allowedRoles.join(', ')}]`);

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ [ROLE-CHECK] Access denied - User role "${req.user.role}" not in allowed roles [${allowedRoles.join(', ')}]`);
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role,
        message: `المستخدم الحالي لديه دور "${req.user.role}" ولكن المطلوب أحد الأدوار: [${allowedRoles.join(', ')}]`
      });
    }

    console.log(`✅ [ROLE-CHECK] Access granted - User role "${req.user.role}" is allowed`);
    next();
  };
};

/**
 * Company isolation middleware
 * Ensures user can only access their company's data
 */
const requireCompanyAccess = (req, res, next) => {
  if (!req.user || !req.user.companyId) {
    return res.status(401).json({
      error: 'Company authentication required',
      code: 'COMPANY_AUTH_REQUIRED'
    });
  }

  // Add companyId to request for easy access
  req.companyId = req.user.companyId;

  next();
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      include: {
        companies: true
      }
    });

    if (user) {
      const activeCompanyId = decoded.companyId || user.companyId;
      const activeRole = decoded.role || user.role;

      let activeCompany = user.companies;

      // 🛡️ SECURITY Check for Optional Auth
      if (activeCompanyId && activeCompanyId !== user.companyId && user.role !== 'SUPER_ADMIN') {
        const userCompany = await getSharedPrismaClient().userCompany.findUnique({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: activeCompanyId
            }
          }
        });

        if (!userCompany || !userCompany.isActive) {
          // If revoked, we treat it as unauthenticated for optionalAuth
          return next();
        }
      }

      if (activeCompanyId && activeCompanyId !== user.companyId) {
        activeCompany = await getSharedPrismaClient().company.findUnique({
          where: { id: activeCompanyId }
        });
      }

      if (activeCompanyId) {
        req.user = {
          id: user.id,
          email: user.email,
          role: activeRole,
          companyId: activeCompanyId,
          company: activeCompany
        };
      }
    }

    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    next();
  }
};

module.exports = {
  requireAuth,
  requireRole,
  requireCompanyAccess,
  optionalAuth
};

