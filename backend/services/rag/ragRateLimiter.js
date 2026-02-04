const { getSharedPrismaClient } = require('../sharedDatabase');
const ragLogger = require('./ragLogger');

class RAGRateLimiter {
  constructor() {
    this.limits = {
      perCompany: {
        windowMs: 60000, // 1 minute
        maxRequests: 100
      },
      perIP: {
        windowMs: 60000, // 1 minute
        maxRequests: 50
      },
      dailyTokens: {
        maxTokens: 100000 // 100k tokens per day default
      }
    };

    this.memoryCache = new Map();
    this.usageCache = new Map(); // companyId -> { tokens: 0, lastReset: Date }
    this.cleanupInterval = 60000;
    // this.init(); // ❌ Removed to prevent early DB access. Call init() explicitly.
  }

  async init() {
    await this.loadLimits();
    this.startCleanup();
  }

  async loadLimits() {
    try {
      const prisma = getSharedPrismaClient();
      const settings = await prisma.systemSettings.findUnique({
        where: { systemName: 'rag_limits' }
      });

      if (settings && settings.config) {
        const config = JSON.parse(settings.config);
        this.limits = { ...this.limits, ...config };
        ragLogger.info('RAG limits loaded from database');
      }
    } catch (error) {
      ragLogger.error('Failed to load RAG limits from database', { error: error.message });
    }
  }

  startCleanup() {
    if (process.env.NODE_ENV === 'test') return;

    this.cleanupTimer = setInterval(() => {
      this.cleanMemoryCache();
    }, this.cleanupInterval);
  }

  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  cleanMemoryCache() {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > this.limits.perCompany.windowMs) {
        this.memoryCache.delete(key);
      }
    }
  }

  async checkRateLimit(companyId, ipAddress = null, requestType = 'search') {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.limits.perCompany.windowMs);

    try {
      // 1️⃣ Check Token Budget First
      const budgetCheck = await this.checkTokenBudget(companyId);
      if (!budgetCheck.allowed) {
        return budgetCheck;
      }

      const prisma = getSharedPrismaClient();

      const companyKey = `company_${companyId}_${Math.floor(now.getTime() / this.limits.perCompany.windowMs)}`;
      const ipKey = ipAddress ? `ip_${ipAddress}_${Math.floor(now.getTime() / this.limits.perIP.windowMs)}` : null;

      let companyCount = this.memoryCache.get(companyKey)?.count || 0;
      let ipCount = ipKey ? (this.memoryCache.get(ipKey)?.count || 0) : 0;

      if (companyCount >= this.limits.perCompany.maxRequests) {
        ragLogger.logRateLimit(companyId, ipAddress, requestType);
        return {
          allowed: false,
          reason: 'company_limit_exceeded',
          retryAfter: this.limits.perCompany.windowMs / 1000
        };
      }

      if (ipAddress && ipCount >= this.limits.perIP.maxRequests) {
        ragLogger.logRateLimit(companyId, ipAddress, requestType);
        return {
          allowed: false,
          reason: 'ip_limit_exceeded',
          retryAfter: this.limits.perIP.windowMs / 1000
        };
      }

      this.memoryCache.set(companyKey, { count: companyCount + 1, timestamp: now.getTime() });
      if (ipKey) {
        this.memoryCache.set(ipKey, { count: ipCount + 1, timestamp: now.getTime() });
      }

      // Async DB log (don't await to avoid latency)
      prisma.rAGRateLimit.upsert({
        where: {
          companyId_ipAddress_windowStart: {
            companyId,
            ipAddress: ipAddress || 'unknown',
            windowStart
          }
        },
        update: {
          requestCount: { increment: 1 }
        },
        create: {
          companyId,
          ipAddress: ipAddress || 'unknown',
          requestType,
          requestCount: 1,
          windowStart
        }
      }).catch(err => {
        ragLogger.error('Failed to update rate limit in DB', { error: err.message });
      });

      return {
        allowed: true,
        remaining: this.limits.perCompany.maxRequests - (companyCount + 1)
      };
    } catch (error) {
      ragLogger.error('Rate limit check failed', { companyId, error: error.message });
      return { allowed: true, remaining: this.limits.perCompany.maxRequests };
    }
  }

  async checkTokenBudget(companyId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check cache first
      let usage = this.usageCache.get(companyId);
      if (!usage || usage.lastReset < today) {
        // Load from DB if cache expired or new day
        const prisma = getSharedPrismaClient();
        const stats = await prisma.rAGPerformance.aggregate({
          where: {
            companyId,
            createdAt: { gte: today }
          },
          _sum: {
            tokensUsed: true
          }
        });

        usage = {
          tokens: stats._sum.tokensUsed || 0,
          lastReset: today
        };
        this.usageCache.set(companyId, usage);
      }

      if (usage.tokens >= this.limits.dailyTokens.maxTokens) {
        ragLogger.warn(`Token budget exceeded for company ${companyId}: ${usage.tokens}/${this.limits.dailyTokens.maxTokens}`);
        return {
          allowed: false,
          reason: 'token_budget_exceeded',
          message: 'Daily AI usage limit reached'
        };
      }

      return { allowed: true, currentTokens: usage.tokens };
    } catch (e) {
      return { allowed: true }; // Safety bypass
    }
  }

  async reportUsage(companyId, tokens, operation, responseTime = 0, metadata = null) {
    try {
      const prisma = getSharedPrismaClient();

      // Update Mem Cache
      let usage = this.usageCache.get(companyId);
      if (usage) {
        usage.tokens += tokens;
      }

      // Save to DB
      await prisma.rAGPerformance.create({
        data: {
          companyId,
          operation,
          responseTime,
          tokensUsed: tokens,
          metadata: metadata ? JSON.stringify(metadata) : null,
          cacheHit: false,
          errorOccurred: false
        }
      });
    } catch (e) {
      ragLogger.error('Failed to report usage', { companyId, error: e.message });
    }
  }

  async getRateLimitStats(companyId, hours = 24) {
    try {
      const prisma = getSharedPrismaClient();
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const stats = await prisma.rAGRateLimit.groupBy({
        by: ['requestType'],
        where: {
          companyId,
          createdAt: { gte: startTime }
        },
        _sum: {
          requestCount: true
        },
        _count: true
      });

      return stats;
    } catch (error) {
      ragLogger.error('Failed to get rate limit stats', { companyId, error: error.message });
      return [];
    }
  }

  async setLimits(type, windowMs, maxRequests) {
    if (this.limits[type]) {
      this.limits[type] = { windowMs, maxRequests };
      await this.saveLimits();
      ragLogger.info('Rate limits updated', { type, windowMs, maxRequests });
    }
  }

  async setDailyTokenLimit(maxTokens) {
    this.limits.dailyTokens.maxTokens = maxTokens;
    await this.saveLimits();
    ragLogger.info('Daily token limit updated', { maxTokens });
  }

  async saveLimits() {
    try {
      const prisma = getSharedPrismaClient();
      await prisma.systemSettings.upsert({
        where: { systemName: 'rag_limits' },
        update: {
          config: JSON.stringify(this.limits),
          updatedAt: new Date()
        },
        create: {
          systemName: 'rag_limits',
          displayName: 'RAG Rate Limits & Budgets',
          category: 'rag',
          isEnabled: true,
          config: JSON.stringify(this.limits)
        }
      });
    } catch (error) {
      ragLogger.error('Failed to save RAG limits to database', { error: error.message });
    }
  }

  async cleanup() {
    this.stopCleanup();
    this.memoryCache.clear();
  }
}

module.exports = new RAGRateLimiter();
