/**
 * Advanced Logging System
 * 
 * Comprehensive logging with multiple transports, structured logging,
 * error tracking, and performance monitoring
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

class AdvancedLogger {
  constructor() {
    this.logDir = process.env.LOG_DIR || './logs';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logRetentionDays = parseInt(process.env.LOG_RETENTION_DAYS) || 30;
    this.enableConsole = process.env.NODE_ENV !== 'production';

    this.createLogDirectory();
    this.logger = this.createLogger();
    this.setupErrorHandling();
    this.setupCleanup();
  }

  /**
   * Create log directory if it doesn't exist
   */
  createLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Create Winston logger with multiple transports
   */
  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = {
          timestamp,
          level,
          message,
          ...meta
        };

        if (stack) {
          log.stack = stack;
        }

        return JSON.stringify(log);
      })
    );

    const transports = [
      // Error logs
      new winston.transports.File({
        filename: path.join(this.logDir, 'error.log'),
        level: 'error',
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5,
        format: logFormat
      }),

      // Combined logs
      new winston.transports.File({
        filename: path.join(this.logDir, 'combined.log'),
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10,
        format: logFormat
      }),

      // Application logs
      new winston.transports.File({
        filename: path.join(this.logDir, 'app.log'),
        level: 'info',
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5,
        format: logFormat
      }),

      // Performance logs
      new winston.transports.File({
        filename: path.join(this.logDir, 'performance.log'),
        level: 'debug',
        maxsize: 25 * 1024 * 1024, // 25MB
        maxFiles: 3,
        format: logFormat
      }),

      // Security logs
      new winston.transports.File({
        filename: path.join(this.logDir, 'security.log'),
        level: 'warn',
        maxsize: 25 * 1024 * 1024, // 25MB
        maxFiles: 5,
        format: logFormat
      })
    ];

    // Add console transport for development
    if (this.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          )
        })
      );
    }

    return winston.createLogger({
      level: this.logLevel,
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  /**
   * Setup global error handling
   */
  setupErrorHandling() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        type: 'uncaughtException'
      });

      // ❌ REMOVED: process.exit(1) - Let server.js handle graceful shutdown
      // The main uncaughtException handler in server.js will handle exit
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
        type: 'unhandledRejection'
      });
    });

    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down gracefully');
      this.cleanup();
      process.exit(0);
    });

    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, shutting down gracefully');
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Setup log cleanup
   */
  setupCleanup() {
    // Skip cleanup in test environment to prevent Jest hanging
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Clean old logs daily
    this.cleanupInterval = setInterval(() => {
      this.cleanOldLogs();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Stop cleanup interval (for testing)
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean old log files
   */
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffTime = Date.now() - (this.logRetentionDays * 24 * 60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          this.logger.info('Deleted old log file', { file });
        }
      });
    } catch (error) {
      this.logger.error('Error cleaning old logs', { error: error.message });
    }
  }

  /**
   * Log with context
   */
  logWithContext(level, message, context = {}) {
    const logEntry = {
      message,
      ...context,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: require('os').hostname()
    };

    this.logger[level](logEntry);
  }

  /**
   * Log API request
   */
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      contentLength: res.get('Content-Length'),
      referer: req.get('Referer'),
      type: 'api_request'
    };

    if (res.statusCode >= 400) {
      this.logger.warn('API Request Error', logData);
    } else {
      this.logger.info('API Request', logData);
    }
  }

  /**
   * Log database query
   */
  logQuery(query, params, executionTime, error = null) {
    const logData = {
      query: query.substring(0, 500), // Truncate long queries
      params: params ? JSON.stringify(params).substring(0, 200) : null,
      executionTime: `${executionTime}ms`,
      type: 'database_query'
    };

    if (error) {
      logData.error = error.message;
      this.logger.error('Database Query Error', logData);
    } else if (executionTime > 1000) {
      this.logger.warn('Slow Database Query', logData);
    } else {
      this.logger.debug('Database Query', logData);
    }
  }

  /**
   * Log security event
   */
  logSecurity(event, details = {}) {
    const logData = {
      event,
      ...details,
      type: 'security_event',
      severity: details.severity || 'medium'
    };

    this.logger.warn('Security Event', logData);
  }

  /**
   * Log business event
   */
  logBusiness(event, details = {}) {
    const logData = {
      event,
      ...details,
      type: 'business_event'
    };

    this.logger.info('Business Event', logData);
  }

  /**
   * Log performance metric
   */
  logPerformance(metric, value, unit = 'ms', context = {}) {
    const logData = {
      metric,
      value,
      unit,
      ...context,
      type: 'performance_metric'
    };

    this.logger.debug('Performance Metric', logData);
  }

  /**
   * Log user action
   */
  logUserAction(userId, action, details = {}) {
    const logData = {
      userId,
      action,
      ...details,
      type: 'user_action'
    };

    this.logger.info('User Action', logData);
  }

  /**
   * Log system event
   */
  logSystem(event, details = {}) {
    const logData = {
      event,
      ...details,
      type: 'system_event'
    };

    this.logger.info('System Event', logData);
  }

  /**
   * Standard logging methods
   */
  error(message, context = {}) {
    this.logWithContext('error', message, { ...context, type: 'error' });
  }

  warn(message, context = {}) {
    this.logWithContext('warn', message, { ...context, type: 'warning' });
  }

  info(message, context = {}) {
    this.logWithContext('info', message, { ...context, type: 'info' });
  }

  debug(message, context = {}) {
    this.logWithContext('debug', message, { ...context, type: 'debug' });
  }

  /**
   * Create child logger with default context
   */
  child(defaultContext = {}) {
    return {
      error: (message, context = {}) => this.error(message, { ...defaultContext, ...context }),
      warn: (message, context = {}) => this.warn(message, { ...defaultContext, ...context }),
      info: (message, context = {}) => this.info(message, { ...defaultContext, ...context }),
      debug: (message, context = {}) => this.debug(message, { ...defaultContext, ...context }),
      logRequest: (req, res, responseTime) => this.logRequest(req, res, responseTime),
      logQuery: (query, params, executionTime, error) => this.logQuery(query, params, executionTime, error),
      logSecurity: (event, details) => this.logSecurity(event, details),
      logBusiness: (event, details) => this.logBusiness(event, details),
      logPerformance: (metric, value, unit, context) => this.logPerformance(metric, value, unit, { ...defaultContext, ...context }),
      logUserAction: (userId, action, details) => this.logUserAction(userId, action, { ...defaultContext, ...details }),
      logSystem: (event, details) => this.logSystem(event, { ...defaultContext, ...details })
    };
  }

  /**
   * Get log statistics
   */
  getStats() {
    try {
      const files = fs.readdirSync(this.logDir);
      const stats = {};

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const fileStats = fs.statSync(filePath);

        stats[file] = {
          size: fileStats.size,
          created: fileStats.birthtime,
          modified: fileStats.mtime
        };
      });

      return stats;
    } catch (error) {
      this.logger.error('Error getting log stats', { error: error.message });
      return {};
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.logger) {
      this.logger.end();
    }
  }
}

// Create singleton instance
const logger = new AdvancedLogger();

// Export logger instance and class
module.exports = logger;
module.exports.AdvancedLogger = AdvancedLogger;
