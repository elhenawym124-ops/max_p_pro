/**
 * EMERGENCY SECURITY PATCH
 * 
 * Temporary security measures until critical vulnerabilities are fixed
 */

const logger = require('../utils/logger');

/**
 * Emergency security middleware
 */
const emergencySecurityPatch = (req, res, next) => {
  // Block dangerous operations in production
  if (process.env.NODE_ENV === 'production') {
    
    // Block TRUNCATE operations
    if (req.body && JSON.stringify(req.body).includes('TRUNCATE')) {
      logger.error('SECURITY: Blocked TRUNCATE operation in production', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'TRUNCATE operations not allowed in production',
        code: 'SECURITY_VIOLATION'
      });
    }
    
    // Log bulk operations for monitoring
    if (req.body && (
      JSON.stringify(req.body).includes('updateMany') ||
      JSON.stringify(req.body).includes('deleteMany')
    )) {
      logger.warn('SECURITY: Bulk operation detected', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
    }
  }
  
  next();
};

module.exports = emergencySecurityPatch;