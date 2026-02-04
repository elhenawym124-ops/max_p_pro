const { getSharedPrismaClient } = require('../sharedDatabase');
const ragLogger = require('./ragLogger');

class RAGAnalytics {
  constructor() {
    this.batchQueue = [];
    this.batchSize = 50;
    this.flushInterval = 30000;
    this.startBatchProcessor();
  }

  startBatchProcessor() {
    if (process.env.NODE_ENV === 'test') return;
    
    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, this.flushInterval);
  }

  stopBatchProcessor() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  async logSearch(companyId, customerId, query, intent, resultsCount, responseTime, wasSuccessful = true, metadata = {}) {
    const searchLog = {
      companyId,
      customerId,
      query: query.substring(0, 500),
      intent,
      resultsCount,
      responseTime,
      wasSuccessful,
      metadata: JSON.stringify(metadata)
    };

    this.batchQueue.push({ type: 'search', data: searchLog });

    if (this.batchQueue.length >= this.batchSize) {
      await this.flushBatch();
    }

    ragLogger.logSearch(query, companyId, resultsCount, responseTime, { intent, wasSuccessful });
  }

  async logPerformance(companyId, operation, responseTime, tokensUsed = null, cacheHit = false, errorOccurred = false, errorMessage = null, metadata = {}) {
    const performanceLog = {
      companyId,
      operation,
      responseTime,
      tokensUsed,
      cacheHit,
      errorOccurred,
      errorMessage,
      metadata: JSON.stringify(metadata)
    };

    this.batchQueue.push({ type: 'performance', data: performanceLog });

    if (this.batchQueue.length >= this.batchSize) {
      await this.flushBatch();
    }

    ragLogger.logPerformance(operation, companyId, responseTime, { tokensUsed, cacheHit, errorOccurred });
  }

  async flushBatch() {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      const prisma = getSharedPrismaClient();
      
      const searchLogs = batch.filter(item => item.type === 'search').map(item => item.data);
      const performanceLogs = batch.filter(item => item.type === 'performance').map(item => item.data);

      const promises = [];

      if (searchLogs.length > 0) {
        promises.push(
          prisma.searchAnalytics.createMany({
            data: searchLogs,
            skipDuplicates: true
          })
        );
      }

      if (performanceLogs.length > 0) {
        promises.push(
          prisma.rAGPerformance.createMany({
            data: performanceLogs,
            skipDuplicates: true
          })
        );
      }

      await Promise.all(promises);
      ragLogger.debug('Flushed analytics batch', { searchLogs: searchLogs.length, performanceLogs: performanceLogs.length });
    } catch (error) {
      ragLogger.error('Failed to flush analytics batch', { error: error.message, batchSize: batch.length });
      this.batchQueue.unshift(...batch);
    }
  }

  async getSearchStats(companyId, startDate, endDate) {
    try {
      const prisma = getSharedPrismaClient();
      
      const stats = await prisma.searchAnalytics.groupBy({
        by: ['intent', 'wasSuccessful'],
        where: {
          companyId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: true,
        _avg: {
          responseTime: true,
          resultsCount: true
        }
      });

      return stats;
    } catch (error) {
      ragLogger.error('Failed to get search stats', { companyId, error: error.message });
      return [];
    }
  }

  async getPerformanceStats(companyId, startDate, endDate) {
    try {
      const prisma = getSharedPrismaClient();
      
      const stats = await prisma.rAGPerformance.groupBy({
        by: ['operation'],
        where: {
          companyId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: true,
        _avg: {
          responseTime: true,
          tokensUsed: true
        },
        _sum: {
          tokensUsed: true
        }
      });

      return stats;
    } catch (error) {
      ragLogger.error('Failed to get performance stats', { companyId, error: error.message });
      return [];
    }
  }

  async getFailedSearches(companyId, limit = 50) {
    try {
      const prisma = getSharedPrismaClient();
      
      const failedSearches = await prisma.searchAnalytics.findMany({
        where: {
          companyId,
          wasSuccessful: false
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return failedSearches;
    } catch (error) {
      ragLogger.error('Failed to get failed searches', { companyId, error: error.message });
      return [];
    }
  }

  async cleanup() {
    await this.flushBatch();
    this.stopBatchProcessor();
  }
}

module.exports = new RAGAnalytics();
