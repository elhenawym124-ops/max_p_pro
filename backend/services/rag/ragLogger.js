const logger = require('../../utils/logger');

class RAGLogger {
  constructor() {
    this.ragLogger = logger.child({ service: 'RAG' });
  }

  debug(message, context = {}) {
    this.ragLogger.debug(message, { ...context, component: 'RAG' });
  }

  info(message, context = {}) {
    this.ragLogger.info(message, { ...context, component: 'RAG' });
  }

  warn(message, context = {}) {
    this.ragLogger.warn(message, { ...context, component: 'RAG' });
  }

  error(message, context = {}) {
    this.ragLogger.error(message, { ...context, component: 'RAG' });
  }

  logSearch(query, companyId, resultsCount, responseTime, metadata = {}) {
    this.info('RAG Search', {
      query: query.substring(0, 100),
      companyId,
      resultsCount,
      responseTime,
      ...metadata
    });
  }

  logPerformance(operation, companyId, responseTime, metadata = {}) {
    this.ragLogger.logPerformance(operation, responseTime, 'ms', {
      companyId,
      service: 'RAG',
      ...metadata
    });
  }

  logCacheHit(operation, companyId) {
    this.debug('Cache Hit', { operation, companyId });
  }

  logCacheMiss(operation, companyId) {
    this.debug('Cache Miss', { operation, companyId });
  }

  logRateLimit(companyId, ipAddress, requestType) {
    this.warn('Rate Limit Triggered', {
      companyId,
      ipAddress,
      requestType,
      severity: 'medium'
    });
  }

  logDatabaseOperation(operation, companyId, duration, error = null) {
    if (error) {
      this.error('Database Operation Failed', {
        operation,
        companyId,
        duration,
        error: error.message,
        stack: error.stack
      });
    } else {
      this.debug('Database Operation', {
        operation,
        companyId,
        duration
      });
    }
  }
}

module.exports = new RAGLogger();
