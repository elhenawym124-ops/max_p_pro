/**
 * Security Enhancements Middleware
 * تحسينات أمنية إضافية للنظام
 */

const rateLimit = require('express-rate-limit');
const { securityLogger } = require('./globalSecurity');
// Note: helmet package might not be installed, using manual headers instead

// Advanced rate limiting store using Maps for company-specific tracking
class CompanyRateLimitStore {
  constructor() {
    this.requests = new Map(); // companyId -> Map(ip -> [{timestamp, path}])
    this.violations = new Map(); // companyId -> Map(ip -> count)
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // 5 minutes
  }

  getKey(companyId, ip) {
    return `${companyId || 'public'}:${ip}`;
  }

  increment(companyId, ip, path) {
    const key = this.getKey(companyId, ip);
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const now = Date.now();
    this.requests.get(key).push({ timestamp: now, path });
    
    return this.requests.get(key).length;
  }

  getCount(companyId, ip, windowMs) {
    const key = this.getKey(companyId, ip);
    const requests = this.requests.get(key) || [];
    const cutoff = Date.now() - windowMs;
    
    return requests.filter(req => req.timestamp > cutoff).length;
  }

  recordViolation(companyId, ip) {
    const companyViolations = this.violations.get(companyId) || new Map();
    const currentCount = companyViolations.get(ip) || 0;
    companyViolations.set(ip, currentCount + 1);
    this.violations.set(companyId, companyViolations);
    
    return currentCount + 1;
  }

  getViolationCount(companyId, ip) {
    const companyViolations = this.violations.get(companyId);
    return companyViolations ? (companyViolations.get(ip) || 0) : 0;
  }

  cleanup() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(req => req.timestamp > oneHourAgo);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
    
    //console.log('🧹 [RATE-LIMIT-CLEANUP] Cleaned old rate limit data');
  }
}

const companyRateLimitStore = new CompanyRateLimitStore();

/**
 * Enhanced Rate Limiting Configuration with Company Isolation
 */
const createAdvancedRateLimit = (config) => {
  const { windowMs, max, message, byCompany = false, sensitive = false } = config;
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const companyId = req.user?.companyId || req.companyId;
    const path = req.path;
    
    // Apply company-specific rate limiting if enabled
    const effectiveCompanyId = byCompany ? companyId : null;
    const currentCount = companyRateLimitStore.increment(effectiveCompanyId, ip, path);
    const windowCount = companyRateLimitStore.getCount(effectiveCompanyId, ip, windowMs);
    
    if (windowCount > max) {
      const violationCount = companyRateLimitStore.recordViolation(effectiveCompanyId, ip);
      
      // Enhanced logging for sensitive operations
      const logType = sensitive ? 'sensitive_rate_limit_violation' : 'rate_limit_violation';
      securityLogger.log(logType, {
        ip,
        companyId: effectiveCompanyId,
        path,
        currentCount,
        windowCount,
        maxAllowed: max,
        violationCount,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        severity: sensitive ? 'HIGH' : 'MEDIUM'
      });
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - windowCount),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString(),
        'Retry-After': Math.ceil(windowMs / 1000)
      });
      
      return res.status(429).json({
        success: false,
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
        details: {
          maxRequests: max,
          windowMs: windowMs,
          currentCount: windowCount
        }
      });
    }
    
    // Set success headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - windowCount)
    });
    
    next();
  };
};

/**
 * Simple Rate Limiting (for backward compatibility)
 */
const createRateLimit = (windowMs, max, message) => {
  return createAdvancedRateLimit({ windowMs, max, message, byCompany: false, sensitive: false });
};

/**
 * Dynamic Rate Limits based on environment
 */
const getAuthRateLimit = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isDevelopment) {
    return createRateLimit(
      1 * 60 * 1000, // 1 minute (أقصر)
      50, // 50 attempts (أكثر مرونة)
      'تم تجاوز الحد المسموح (بيئة التطوير). حاول مرة أخرى بعد دقيقة'
    );
  } else if (isProduction) {
    return createRateLimit(
      30 * 60 * 1000, // 30 minutes
      3, // 3 attempts only
      'تم تجاوز الحد المسموح لمحاولات تسجيل الدخول. حاول مرة أخرى بعد 30 دقيقة'
    );
  } else {
    return createRateLimit(
      5 * 60 * 1000, // 5 minutes
      15, // 15 attempts
      'تم تجاوز الحد المسموح لمحاولات تسجيل الدخول. حاول مرة أخرى بعد 5 دقائق'
    );
  }
};

/**
 * Enhanced Rate Limits for different endpoints with company isolation
 */
const rateLimits = {
  // Authentication endpoints - dynamic based on environment
  auth: getAuthRateLimit(),

  // Company-specific API endpoints - isolated by company
  companyApi: createAdvancedRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Requests per company
    message: 'تم تجاوز الحد المسموح لطلبات API للشركة. حاول مرة أخرى بعد 5 دقائق',
    byCompany: true,
    sensitive: false
  }),

  // Sensitive company operations (conversations, messages, customer data)
  sensitiveCompany: createAdvancedRateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 500, // Stricter limit
    message: 'تم تجاوز الحد المسموح للعمليات الحساسة. حاول مرة أخرى بعد 10 دقائق',
    byCompany: true,
    sensitive: true
  }),

  // Message sending and real-time operations
  messaging: createAdvancedRateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 30 : 100, // Messages per minute per company
    message: 'تم تجاوز الحد المسموح لإرسال الرسائل. حاول مرة أخرى بعد دقيقة',
    byCompany: true,
    sensitive: true
  }),

  // Customer data operations (create, update, delete)
  customerData: createAdvancedRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: process.env.NODE_ENV === 'production' ? 50 : 200, // Customer operations per company
    message: 'تم تجاوز الحد المسموح لعمليات بيانات العملاء. حاول مرة أخرى بعد 5 دقائق',
    byCompany: true,
    sensitive: true
  }),

  // AI operations (chat, generation, analysis)
  aiOperations: createAdvancedRateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: process.env.NODE_ENV === 'production' ? 20 : 100, // AI requests per company
    message: 'تم تجاوز الحد المسموح لعمليات الذكاء الاصطناعي. حاول مرة أخرى بعد دقيقتين',
    byCompany: true,
    sensitive: true
  }),

  // General API endpoints - more flexible for development
  api: createRateLimit(
    2 * 60 * 1000, // 2 minutes
    1000, // 1000 requests
    'تم تجاوز الحد المسموح للطلبات. حاول مرة أخرى بعد دقيقتين'
  ),

  // Admin endpoints - very strict
  admin: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    20, // 20 requests
    'تم تجاوز الحد المسموح للطلبات الإدارية. حاول مرة أخرى بعد 15 دقيقة'
  ),

  // File upload endpoints
  upload: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 20 : 50, // Uploads per company
    message: 'تم تجاوز الحد المسموح لرفع الملفات. حاول مرة أخرى بعد 15 دقيقة',
    byCompany: true,
    sensitive: false
  })
};

/**
 * Smart Rate Limiting Middleware - applies appropriate limits based on route patterns
 */
const smartRateLimit = (req, res, next) => {
  const path = req.path;
  const method = req.method;
  
  // Determine which rate limit to apply based on path patterns
  if (path.match(/\/api\/v1\/(conversations|messages)/) && (method === 'POST' || method === 'PUT')) {
    return rateLimits.messaging(req, res, next);
  }
  
  if (path.match(/\/api\/v1\/customers/) && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    return rateLimits.customerData(req, res, next);
  }
  
  if (path.match(/\/api\/v1\/ai/) || path.includes('chat') || path.includes('generate')) {
    return rateLimits.aiOperations(req, res, next);
  }
  
  if (path.match(/\/api\/v1\/(conversations|customers|orders|users|settings)/)) {
    return rateLimits.sensitiveCompany(req, res, next);
  }
  
  if (path.includes('upload') || method === 'POST' && req.headers['content-type']?.includes('multipart')) {
    return rateLimits.upload(req, res, next);
  }
  
  if (path.match(/\/api\/v1\/admin/)) {
    return rateLimits.admin(req, res, next);
  }
  
  if (path.match(/\/api\/v1\/auth/)) {
    return rateLimits.auth(req, res, next);
  }
  
  // Default to company API limits for authenticated routes
  if (req.user?.companyId) {
    return rateLimits.companyApi(req, res, next);
  }
  
  // Fall back to general API limits
  return rateLimits.api(req, res, next);
};

/**
 * Rate Limit Status Endpoint (for monitoring)
 */
const rateLimitStatus = (req, res) => {
  try {
    const ip = req.ip;
    const companyId = req.user?.companyId;
    
    const status = {
      ip,
      companyId,
      limits: {
        auth: companyRateLimitStore.getCount(null, ip, 30 * 60 * 1000),
        companyApi: companyRateLimitStore.getCount(companyId, ip, 5 * 60 * 1000),
        sensitiveOps: companyRateLimitStore.getCount(companyId, ip, 10 * 60 * 1000),
        messaging: companyRateLimitStore.getCount(companyId, ip, 1 * 60 * 1000),
        aiOps: companyRateLimitStore.getCount(companyId, ip, 2 * 60 * 1000)
      },
      violations: {
        total: companyRateLimitStore.getViolationCount(companyId, ip)
      }
    };
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get rate limit status',
      error: error.message
    });
  }
};
const securityHeaders = (req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Powered-By', 'Secure-API');

  // Content Security Policy
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );

  next();
};

/**
 * Request Sanitization Middleware
 */
const sanitizeRequest = (req, res, next) => {
  try {
    // Remove potentially dangerous characters from query parameters
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    }

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    console.error('❌ [SANITIZE] Error sanitizing request:', error);
    next();
  }
};

function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Security Monitoring Middleware
 */
const securityMonitoring = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant requests
  const securityLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    companyId: req.user?.companyId,
    role: req.user?.role
  };

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /<script/gi, // XSS attempts
    /union\s+select/gi, // SQL injection
    /javascript:/gi, // JavaScript injection
    /eval\(/gi, // Code injection
    /exec\(/gi, // Command injection
  ];

  const fullUrl = req.originalUrl || req.url;
  const requestBody = JSON.stringify(req.body || {});
  
  let suspiciousActivity = false;
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(fullUrl) || pattern.test(requestBody)) {
      suspiciousActivity = true;
      //console.log(`🚨 [SECURITY] Suspicious activity detected:`, {
      //   ...securityLog,
      //   pattern: pattern.toString(),
      //   url: fullUrl,
      //   body: requestBody.substring(0, 200)
      // });
    }
  });

  // Log response time and status
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (suspiciousActivity || res.statusCode >= 400 || duration > 5000) {
      //console.log(`📊 [SECURITY] Request completed:`, {
      //   ...securityLog,
      //   status: res.statusCode,
      //   duration: `${duration}ms`,
      //   suspicious: suspiciousActivity
      // });
    }
  });

  next();
};

/**
 * IP Whitelist Middleware (for admin routes)
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // In development, allow all IPs
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      next();
    } else {
      //console.log(`🚨 [IP-WHITELIST] Blocked IP: ${clientIP} for ${req.path}`);
      res.status(403).json({
        success: false,
        message: 'الوصول مرفوض من هذا العنوان',
        code: 'IP_NOT_ALLOWED'
      });
    }
  };
};

/**
 * Request Size Limiter
 */
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength > maxSizeBytes) {
      //console.log(`🚨 [SIZE-LIMIT] Request too large: ${contentLength} bytes from ${req.ip}`);
      return res.status(413).json({
        success: false,
        message: 'حجم الطلب كبير جداً',
        code: 'REQUEST_TOO_LARGE'
      });
    }
    
    next();
  };
};

function parseSize(size) {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  return parseInt(match[1]) * units[match[2]];
}

/**
 * CORS Security Enhancement
 */
const enhancedCORS = (req, res, next) => {
  const origin = req.get('Origin');
  
  // Log cross-origin requests
  if (origin && !origin.includes('localhost')) {
    //console.log(`🌐 [CORS] Cross-origin request from: ${origin} to ${req.path}`);
  }
  
  // Add additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

module.exports = {
  rateLimits,
  smartRateLimit,
  rateLimitStatus,
  companyRateLimitStore,
  securityHeaders,
  sanitizeRequest,
  securityMonitoring,
  ipWhitelist,
  requestSizeLimiter,
  enhancedCORS
};
