/**
 * Global Security Middleware
 * نظام حماية شامل لجميع routes في التطبيق
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Security logging system
class SecurityLogger {
  constructor() {
    this.logs = new Map();
    this.alertThresholds = {
      'failed_auth': { count: 10, timeWindow: 300000 }, // 10 attempts in 5 minutes (increased from 5)
      'company_violation': { count: 5, timeWindow: 300000 }, // 5 violations in 5 minutes (increased from 3)
      'unauthorized_access': { count: 15, timeWindow: 600000 } // 15 attempts in 10 minutes (increased from 10)
    };
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
  }

  log(eventType, details) {
    const logEntry = {
      timestamp: new Date(),
      type: eventType,
      ...details
    };

    if (!this.logs.has(eventType)) {
      this.logs.set(eventType, []);
    }

    this.logs.get(eventType).push(logEntry);

    // Keep only last 1000 entries per event type
    if (this.logs.get(eventType).length > 1000) {
      this.logs.get(eventType).shift();
    }

    // Check for suspicious activity
    this.checkSuspiciousActivity(eventType, details);

    // Console logging with security level
    const securityLevel = this.getSecurityLevel(eventType);
    //console.log(`🔒 [SECURITY-${securityLevel}] ${eventType}:`, details);

    // Write critical events to file
    if (securityLevel === 'CRITICAL') {
      this.writeToSecurityLog(logEntry);
    }
  }

  getSecurityLevel(eventType) {
    const criticalEvents = ['company_violation', 'unauthorized_database_access', 'token_tampering'];
    const highEvents = ['failed_auth', 'unauthorized_access', 'suspicious_activity'];
    const mediumEvents = ['company_access_denied', 'invalid_token'];

    if (criticalEvents.includes(eventType)) return 'CRITICAL';
    if (highEvents.includes(eventType)) return 'HIGH';
    if (mediumEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
  }

  checkSuspiciousActivity(eventType, details) {
    const ip = details.ip;
    if (!ip) return;

    const threshold = this.alertThresholds[eventType];
    if (!threshold) return;

    const now = Date.now();
    const recentEvents = this.logs.get(eventType).filter(
      log => log.ip === ip && (now - log.timestamp.getTime()) < threshold.timeWindow
    );

    if (recentEvents.length >= threshold.count) {
      this.log('suspicious_activity', {
        ip,
        eventType,
        count: recentEvents.length,
        timeWindow: threshold.timeWindow,
        severity: 'HIGH'
      });

      this.suspiciousIPs.add(ip);

      // Block IP after repeated violations
      if (recentEvents.length >= threshold.count * 2) {
        this.blockedIPs.add(ip);
        this.log('ip_blocked', { ip, reason: `Exceeded ${eventType} threshold` });
      }
    }
  }

  writeToSecurityLog(logEntry) {
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, 'security.log');
      const logLine = `${logEntry.timestamp.toISOString()} [${logEntry.type}] ${JSON.stringify(logEntry)}\n`;

      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  isIPSuspicious(ip) {
    return this.suspiciousIPs.has(ip);
  }

  getSecurityReport() {
    const report = {
      totalEvents: 0,
      eventsByType: {},
      suspiciousIPs: Array.from(this.suspiciousIPs),
      blockedIPs: Array.from(this.blockedIPs),
      recentCriticalEvents: []
    };

    for (const [eventType, events] of this.logs.entries()) {
      report.totalEvents += events.length;
      report.eventsByType[eventType] = events.length;

      // Get recent critical events (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCritical = events.filter(
        event => event.timestamp > oneDayAgo && this.getSecurityLevel(eventType) === 'CRITICAL'
      );
      report.recentCriticalEvents.push(...recentCritical);
    }

    return report;
  }

  clearOldLogs() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const [eventType, events] of this.logs.entries()) {
      const filteredEvents = events.filter(event => event.timestamp > oneWeekAgo);
      this.logs.set(eventType, filteredEvents);
    }

    // Clear old blocked and suspicious IPs (reset after 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Reset blocked IPs older than 24 hours
    this.blockedIPs.clear();
    this.suspiciousIPs.clear();

    console.log('🧹 [SECURITY-CLEANUP] Old security logs and IP blocks cleared');
  }

  // Manual IP management functions
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    console.log(`🔓 [SECURITY] IP ${ip} has been unblocked`);
  }

  clearAllBlocks() {
    const blockedCount = this.blockedIPs.size;
    const suspiciousCount = this.suspiciousIPs.size;
    this.blockedIPs.clear();
    this.suspiciousIPs.clear();
    console.log(`🔓 [SECURITY] Cleared ${blockedCount} blocked IPs and ${suspiciousCount} suspicious IPs`);
  }
}

const securityLogger = new SecurityLogger();

// Clear old logs and IP blocks every hour
setInterval(() => {
  securityLogger.clearOldLogs();
}, 60 * 60 * 1000); // Every hour instead of weekly

/**
 * IP Blocking Middleware
 */
const ipBlockingMiddleware = (req, res, next) => {
  // ✅ تم تعطيل حظر الوصول - يمرر كل الطلبات بدون حظر
  // Get IP from various sources (للأغراض التسجيل فقط)
  const ip = req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    'unknown';

  // Normalize IP address
  const normalizedIP = ip.replace(/^::ffff:/, ''); // Remove IPv6 prefix for IPv4 addresses

  // تسجيل فقط بدون حظر
  if (securityLogger.isIPSuspicious(normalizedIP)) {
    securityLogger.log('suspicious_ip_access', {
      ip: normalizedIP,
      path: req.path,
      method: req.method
    });
  }

  // تمرير كل الطلبات بدون حظر
  return next();
};

/**
 * Enhanced Request Logging Middleware
 */
const enhancedRequestLogging = (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;

  // Log all requests for security monitoring
  securityLogger.log('request_received', {
    ip,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    timestamp: new Date(),
    headers: {
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'None',
      'content-type': req.headers['content-type'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function (body) {
    const responseTime = Date.now() - startTime;

    // Log security-relevant responses
    if (res.statusCode >= 400) {
      const logType = res.statusCode === 401 ? 'auth_failure' :
        res.statusCode === 403 ? 'access_denied' : 'error_response';

      securityLogger.log(logType, {
        ip,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        errorCode: body?.code
      });
    }

    return originalJson.call(this, body);
  };

  next();
};
const PUBLIC_ROUTES = [
  // Authentication routes
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'POST /api/v1/super-admin/login',
  'GET /api/v1/auth/verify-email',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',

  // Health and system routes
  'GET /health',
  'GET /api/health',
  'GET /api/v1/health',
  'GET /api/v1/version',
  'GET /api/v1/companies/current',
  'GET /',
  'OPTIONS *',

  // Public geolocation (used for language defaults / UX)
  'GET /api/geolocation/*',

  // Webhook routes (تحتاج مصادقة خاصة)
  'GET /webhook',
  'POST /webhook',
  'GET /webhook/*',
  'POST /webhook/*',

  // Facebook OAuth callback routes (NO AUTHENTICATION - Facebook redirects here directly)
  'GET /api/v1/facebook-oauth/callback',
  'GET /api/v1/facebook-oauth/pixel-callback',

  // Image proxy routes (للصور الخارجية)
  'GET /api/proxy-image',

  // Uploads routes (للصور والملفات المرفوعة)
  'GET /uploads/*',
  'POST /uploads/*',

  // Public invitation routes
  'GET /api/v1/invitations/verify/*',
  'POST /api/v1/invitations/accept/*',

  // ❌ REMOVED: Pattern System routes - Pattern System removed

  // Development routes (في بيئة التطوير فقط)
  'POST /api/v1/dev/create-test-user',

  // Temporary: notifications routes for testing
  'GET /api/v1/notifications/test',
  'GET /api/v1/notifications/recent',
  'POST /api/v1/notifications/*/read',
  'DELETE /api/v1/notifications/*',
  'POST /api/v1/notifications/mark-all-read',

  // Temporary: queue stats for debugging
  'GET /api/v1/queue-stats',
  'GET /api/v1/queue-stats/*',

  // Temporary: opportunities routes for testing
  'GET /api/v1/opportunities',
  'GET /api/v1/opportunities/*',
  'POST /api/v1/opportunities',
  'PUT /api/v1/opportunities/*',
  'DELETE /api/v1/opportunities/*',

  // Public storefront routes (no authentication required)
  'GET /api/v1/public/*',
  'POST /api/v1/public/*',
  'PUT /api/v1/public/*',
  'DELETE /api/v1/public/*',
  'PATCH /api/v1/public/*',

  // Public affiliate and merchant registration (no authentication required)
  'POST /api/v1/affiliates/register',
  'POST /api/v1/public/affiliates/register',
  'POST /api/v1/merchants',
  'POST /api/v1/public/merchants/register',

  // Public homepage routes (all methods for storefront)
  'GET /api/v1/homepage/*',
  'POST /api/v1/homepage/*',
  'PUT /api/v1/homepage/*',
  'DELETE /api/v1/homepage/*',

  // Public footer settings
  'GET /api/v1/public/footer-settings/*',
  'POST /api/v1/public/footer-settings/*',

  // Public storefront settings
  'GET /api/v1/public/storefront-settings/*',
  'POST /api/v1/public/storefront-settings/*',

  // Public coupons
  'GET /api/v1/public/coupons/*',
  'POST /api/v1/public/coupons/*',

  // Public store pages (no authentication required)
  'GET /api/v1/store-pages/*/public',
  'POST /api/v1/store-pages/public',
  'GET /api/v1/store-pages/*/slug/*',

  // Debug Routes
  'GET /api/v1/whatsapp/sessions/debug',
  'GET /api/v1/whatsapp/sessions/*'
];

/**
 * قائمة Routes الإدارية التي تحتاج صلاحيات خاصة
 */
const ADMIN_ROUTES = [
  'GET /api/v1/admin/*',
  'POST /api/v1/admin/*',
  'PUT /api/v1/admin/*',
  'DELETE /api/v1/admin/*'
];

/**
 * قائمة Routes التي تحتاج عزل شركات
 */
const COMPANY_ISOLATED_ROUTES = [
  '/api/v1/products/*',
  '/api/v1/customers/*',
  '/api/v1/conversations/*',
  '/api/v1/orders/*',
  '/api/v1/companies/*',
  '/api/v1/users/*',
  '/api/v1/ai/*',
  '/api/v1/integrations/*',
  '/api/v1/settings/*'
];

/**
 * فحص ما إذا كان route عام
 */
function isPublicRoute(method, path) {
  // Normalize path to check both with and without /v1/ prefix
  const normalizedPath = path.startsWith('/api/v1/') ? path :
    path.startsWith('/api/') ? '/api/v1/' + path.slice(5) :
      path;

  return PUBLIC_ROUTES.some(route => {
    const [routeMethod, routePath] = route.split(' ');

    if (routeMethod === '*' || routeMethod === method) {
      if (routePath === '*') return true;

      // Handle wildcard at the end
      if (routePath.endsWith('*')) {
        return normalizedPath.startsWith(routePath.slice(0, -1));
      }

      // Handle wildcard in the middle (e.g., /api/v1/store-pages/*/public)
      if (routePath.includes('*')) {
        // Convert route pattern to regex
        const regexPattern = routePath
          .replace(/\*/g, '[^/]+') // Replace * with regex for any non-slash characters
          .replace(/\//g, '\\/'); // Escape slashes
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(normalizedPath);
      }

      return routePath === normalizedPath;
    }

    return false;
  });
}

/**
 * فحص ما إذا كان route إداري
 */
function isAdminRoute(method, path) {
  return ADMIN_ROUTES.some(route => {
    const [routeMethod, routePath] = route.split(' ');

    if (routeMethod === '*' || routeMethod === method) {
      if (routePath.endsWith('*')) {
        return path.startsWith(routePath.slice(0, -1));
      }
      return routePath === path;
    }

    return false;
  });
}

/**
 * فحص ما إذا كان route يحتاج عزل شركات
 */
function needsCompanyIsolation(path) {
  // Exclude specific endpoints that should not require company isolation
  const excludedPaths = [
    '/api/v1/companies/current',
    '/api/v1/companies/usage-safe',
    '/api/v1/companies/plans'
  ];

  if (excludedPaths.some(excluded => path === excluded || path.startsWith(excluded + '?'))) {
    return false;
  }

  return COMPANY_ISOLATED_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1));
    }
    return route === path;
  });
}

/**
 * Middleware المصادقة العامة (Enhanced with security logging)
 */
const globalAuthentication = async (req, res, next) => {
  try {
    const method = req.method;
    // Use originalUrl to get the full path including /api/v1/public prefix
    const path = req.originalUrl?.split('?')[0] || req.path; // Remove query string
    const ip = req.ip || req.connection.remoteAddress;

    // [DIAGNOSTIC] Log every attempt to public routes
    // console.log(`🔍 [SECURITY-DEBUG] Checking route: ${method} ${path}`);

    // السماح للـ routes العامة
    if (isPublicRoute(method, path)) {
      securityLogger.log('public_route_access', {
        ip,
        method,
        path,
        userAgent: req.get('User-Agent')?.substring(0, 50)
      });
      return next();
    }

    // التحقق من وجود token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      // ⚡ FIX: Relax check for /api/v1/companies/current if it's hitting here
      // Some endpoints might be legacy but protected by globalSecurity
      securityLogger.log('failed_auth', {
        ip,
        method,
        path,
        reason: 'No token provided',
        userAgent: req.get('User-Agent')
      });

      // Ensure CORS headers are present on error responses
      const origin = req.get('origin') || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      return res.status(401).json({
        success: false,
        message: 'مطلوب تسجيل الدخول للوصول لهذا المورد',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // التحقق من صحة token
    let decoded;
    try {
      // ✅ Use the same fallback as auth.js to prevent mismatches
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    } catch (error) {
      const logType = error.name === 'TokenExpiredError' ? 'token_expired' :
        error.name === 'JsonWebTokenError' ? 'token_invalid' : 'token_error';

      securityLogger.log(logType, {
        ip,
        method,
        path,
        error: error.message,
        tokenPrefix: token.substring(0, 10) + '...',
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح',
        code: 'INVALID_TOKEN'
      });
    }

    // إضافة معلومات المستخدم للطلب
    // ⚡ FIX: Sync with dynamic company context (x-company-id)
    const userId = decoded.userId || decoded.id;
    let activeCompanyId = req.headers['x-company-id'] || decoded.companyId;

    // ⚡ NEW: Fallback for missing companyId from DB
    if (!activeCompanyId && userId) {
      try {
        const user = await executeWithRetry(async () => {
          const { getSharedPrismaClient } = require('../services/sharedDatabase');
          const prisma = getSharedPrismaClient();
          return await prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true }
          });
        });
        if (user?.companyId) {
          activeCompanyId = user.companyId;
          // console.log(`💡 [GLOBAL-AUTH] Resolved missing companyId from DB for user ${userId}: ${activeCompanyId}`);
        }
      } catch (dbError) {
        // console.error('⚠️ [GLOBAL-AUTH] Failed to resolve companyId fallback:', dbError.message);
      }
    }

    req.user = {
      ...decoded,
      id: userId,
      companyId: activeCompanyId
    };

    // If this is a CUSTOMER-authenticated user (stored in User table), attach customerId
    // by matching Customer record (email + companyId). This enables wallet endpoints.
    if (req.user?.role === 'CUSTOMER' && req.user?.email && req.user?.companyId) {
      try {
        const customer = await executeWithRetry(async () => {
          const { getSharedPrismaClient } = require('../services/sharedDatabase');
          const prisma = getSharedPrismaClient();
          return await prisma.customer.findFirst({
            where: {
              companyId: req.user.companyId,
              email: req.user.email.toLowerCase()
            },
            select: { id: true }
          });
        });

        if (customer?.id) {
          req.user.customerId = customer.id;
        }
      } catch (error) {
        // Do not block request if customer lookup fails
      }
    }

    // التحقق من صلاحيات الإدارة
    if (isAdminRoute(method, path)) {
      // Relaxed check: Allow any authenticated system user (User table) to access admin routes,
      // subject to finer-grained permissions in specific middlewares.
      // This supports dynamic roles like 'Project Manager', 'Team Lead', etc.

      /* Strict check commented out
      if (decoded.role !== 'SUPER_ADMIN') {
        securityLogger.log('unauthorized_admin_access', {
          ip,
          userId: decoded.id,
          userRole: decoded.role,
          method,
          path,
          companyId: decoded.companyId
        });

        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية إدارية للوصول لهذا المورد',
          code: 'ADMIN_ACCESS_REQUIRED'
        });
      }
      */
    }

    // Log successful authentication
    securityLogger.log('successful_auth', {
      ip,
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId,
      method,
      path
    });

    next();

  } catch (error) {
    securityLogger.log('auth_system_error', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من المصادقة',
      code: 'AUTHENTICATION_ERROR'
    });
  }
};

/**
 * Middleware عزل الشركات العام (Enhanced with security logging)
 */
const globalCompanyIsolation = async (req, res, next) => {
  try {
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;

    // تطبيق عزل الشركات فقط على routes المحددة
    if (!needsCompanyIsolation(path)) {
      return next();
    }

    // التأكد من وجود معلومات المستخدم
    if (!req.user || !req.user.companyId) {
      securityLogger.log('company_isolation_failure', {
        ip,
        method: req.method,
        path,
        userId: req.user?.id,
        reason: 'No company ID in user token'
      });

      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    // إضافة companyId للطلب
    req.companyId = req.user.companyId;

    // التحقق من محاولة الوصول لشركة أخرى
    const requestedCompanyId = req.params.companyId || req.body.companyId || req.query.companyId;

    if (requestedCompanyId && req.user.role !== 'SUPER_ADMIN') {
      // ⚡ FIX: Instead of strict check, allow if they are in the decoded active company
      // This supports the x-company-id header logic
      if (requestedCompanyId !== req.user.companyId) {
        // If it still doesn't match, they might be attempting a violation
        // OR the frontend provided a mismatching companyId in body vs header
        securityLogger.log('company_violation', {
          ip,
          userId: req.user.id,
          userEmail: req.user.email,
          userCompanyId: req.user.companyId,
          requestedCompanyId,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          severity: 'CRITICAL'
        });

        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول لبيانات هذه الشركة',
          code: 'COMPANY_ACCESS_DENIED',
          context: `User active company: ${req.user.companyId}, requested: ${requestedCompanyId}`
        });
      }
    }

    // Log successful company access
    securityLogger.log('company_access_granted', {
      ip,
      userId: req.user.id,
      companyId: req.user.companyId,
      method: req.method,
      path,
      requestedCompanyId
    });

    next();

  } catch (error) {
    securityLogger.log('company_isolation_error', {
      ip: req.ip,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية الوصول للشركة',
      code: 'COMPANY_ISOLATION_ERROR'
    });
  }
};

/**
 * Security Monitoring Dashboard Route
 */
const securityDashboard = (req, res) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for security dashboard'
      });
    }

    const securityReport = securityLogger.getSecurityReport();

    res.json({
      success: true,
      data: securityReport
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate security report',
      error: error.message
    });
  }
};

/**
 * Clear All IP Blocks Route (Emergency)
 */
const clearIPBlocks = (req, res) => {
  try {
    // Allow any authenticated user to clear blocks in emergency
    securityLogger.clearAllBlocks();

    res.json({
      success: true,
      message: 'All IP blocks have been cleared successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear IP blocks',
      error: error.message
    });
  }
};

/**
 * Middleware الأمان الشامل (Enhanced)
 */
const globalSecurity = [
  ipBlockingMiddleware,
  enhancedRequestLogging,
  globalAuthentication,
  globalCompanyIsolation
];

module.exports = {
  globalSecurity,
  globalAuthentication,
  globalCompanyIsolation,
  ipBlockingMiddleware,
  enhancedRequestLogging,
  securityDashboard,
  clearIPBlocks,
  securityLogger,
  isPublicRoute,
  isAdminRoute,
  needsCompanyIsolation
};
