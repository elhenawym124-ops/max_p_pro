const ragLogger = require('./ragLogger');

class RAGCache {
  constructor() {
    this.faqCache = new Map();
    this.policyCache = new Map();
    this.productCache = new Map();
    this.searchCache = new Map();
    this.genericCache = new Map(); // 🆕 For general purpose RAG data (expansion, etc)

    this.cacheTTL = {
      faq: 30 * 60 * 1000, // 30 minutes
      policy: 30 * 60 * 1000, // 30 minutes
      product: 2 * 60 * 1000, // 2 minutes
      search: 5 * 60 * 1000 // 5 minutes
    };

    this.maxCacheSize = {
      faq: 100,
      policy: 100,
      product: 1000,
      search: 500
    };

    this.startCleanup();
    // this.init(); // ❌ Removed to prevent early DB access. Call init() explicitly after server start.
  }

  async init() {
    await this.loadConfig();
  }

  async loadConfig() {
    try {
      // Lazy load to avoid circular dependency issues during startup
      const { getSharedPrismaClient } = require('../sharedDatabase');
      const prisma = getSharedPrismaClient();
      const settings = await prisma.systemSettings.findUnique({
        where: { systemName: 'rag_cache' }
      });

      if (settings && settings.config) {
        const config = JSON.parse(settings.config);
        if (config.ttl) this.cacheTTL = { ...this.cacheTTL, ...config.ttl };
        if (config.maxSize) this.maxCacheSize = { ...this.maxCacheSize, ...config.maxSize };
        ragLogger.info('RAG cache config loaded from database');
      }
    } catch (error) {
      ragLogger.error('Failed to load RAG cache config', { error: error.message });
    }
  }

  async updateConfig(newConfig) {
    if (newConfig.ttl) this.cacheTTL = { ...this.cacheTTL, ...newConfig.ttl };
    if (newConfig.maxSize) this.maxCacheSize = { ...this.maxCacheSize, ...newConfig.maxSize };

    try {
      const { getSharedPrismaClient } = require('../sharedDatabase');
      const prisma = getSharedPrismaClient();
      await prisma.systemSettings.upsert({
        where: { systemName: 'rag_cache' },
        update: {
          config: JSON.stringify({ ttl: this.cacheTTL, maxSize: this.maxCacheSize }),
          updatedAt: new Date()
        },
        create: {
          systemName: 'rag_cache',
          displayName: 'RAG Cache Configuration',
          category: 'rag',
          isEnabled: true,
          config: JSON.stringify({ ttl: this.cacheTTL, maxSize: this.maxCacheSize })
        }
      });
      ragLogger.info('RAG cache config updated');
    } catch (error) {
      ragLogger.error('Failed to save RAG cache config', { error: error.message });
    }
  }

  startCleanup() {
    if (process.env.NODE_ENV === 'test') return;

    this.cleanupTimer = setInterval(() => {
      this.cleanExpiredEntries();
    }, 60000); // Clean every minute
  }

  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  cleanExpiredEntries() {
    const now = Date.now();

    this.cleanCache(this.faqCache, this.cacheTTL.faq, now);
    this.cleanCache(this.policyCache, this.cacheTTL.policy, now);
    this.cleanCache(this.productCache, this.cacheTTL.product, now);
    this.cleanCache(this.searchCache, this.cacheTTL.search, now);
    this.cleanCache(this.genericCache, 60 * 60 * 1000, now); // 1 hour for generic
  }

  cleanCache(cache, ttl, now) {
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > ttl) {
        cache.delete(key);
      }
    }
  }

  enforceCacheSize(cache, maxSize) {
    if (cache.size > maxSize) {
      const entriesToDelete = cache.size - maxSize;
      const keys = Array.from(cache.keys());
      for (let i = 0; i < entriesToDelete; i++) {
        cache.delete(keys[i]);
      }
    }
  }

  getFAQs(companyId) {
    const key = `faqs_${companyId}`;
    const cached = this.faqCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL.faq) {
      ragLogger.logCacheHit('getFAQs', companyId);
      return cached.data;
    }

    ragLogger.logCacheMiss('getFAQs', companyId);
    return null;
  }

  setFAQs(companyId, data) {
    const key = `faqs_${companyId}`;
    this.faqCache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.enforceCacheSize(this.faqCache, this.maxCacheSize.faq);
  }

  invalidateFAQs(companyId) {
    const key = `faqs_${companyId}`;
    this.faqCache.delete(key);
    ragLogger.debug('Invalidated FAQ cache', { companyId });
  }

  getPolicies(companyId) {
    const key = `policies_${companyId}`;
    const cached = this.policyCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL.policy) {
      ragLogger.logCacheHit('getPolicies', companyId);
      return cached.data;
    }

    ragLogger.logCacheMiss('getPolicies', companyId);
    return null;
  }

  setPolicies(companyId, data) {
    const key = `policies_${companyId}`;
    this.policyCache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.enforceCacheSize(this.policyCache, this.maxCacheSize.policy);
  }

  invalidatePolicies(companyId) {
    const key = `policies_${companyId}`;
    this.policyCache.delete(key);
    ragLogger.debug('Invalidated Policy cache', { companyId });
  }

  getProducts(companyId) {
    const key = `products_${companyId}`;
    const cached = this.productCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL.product) {
      ragLogger.logCacheHit('getProducts', companyId);
      return cached.data;
    }

    ragLogger.logCacheMiss('getProducts', companyId);
    return null;
  }

  setProducts(companyId, data) {
    const key = `products_${companyId}`;
    this.productCache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.enforceCacheSize(this.productCache, this.maxCacheSize.product);
  }

  invalidateProducts(companyId) {
    const key = `products_${companyId}`;
    this.productCache.delete(key);
    ragLogger.debug('Invalidated Product cache', { companyId });
  }

  getSearch(companyId, query, intent) {
    const key = `search_${companyId}_${query}_${intent}`;
    const cached = this.searchCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL.search) {
      ragLogger.logCacheHit('search', companyId);
      return cached.data;
    }

    ragLogger.logCacheMiss('search', companyId);
    return null;
  }

  setSearch(companyId, query, intent, data) {
    const key = `search_${companyId}_${query}_${intent}`;
    this.searchCache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.enforceCacheSize(this.searchCache, this.maxCacheSize.search);
  }

  // 🆕 Generic get/set
  get(key) {
    const cached = this.genericCache.get(key);
    if (cached && Date.now() - cached.timestamp < (cached.ttl || 3600000)) {
      return cached.data;
    }
    return null;
  }

  set(key, data, ttlMs = 3600000) {
    this.genericCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
    this.enforceCacheSize(this.genericCache, 500);
  }

  invalidateAll(companyId) {
    this.invalidateFAQs(companyId);
    this.invalidatePolicies(companyId);
    this.invalidateProducts(companyId);

    for (const key of this.searchCache.keys()) {
      if (key.startsWith(`search_${companyId}_`)) {
        this.searchCache.delete(key);
      }
    }

    ragLogger.info('Invalidated all caches', { companyId });
  }

  getStats() {
    return {
      faq: {
        size: this.faqCache.size,
        maxSize: this.maxCacheSize.faq,
        ttl: this.cacheTTL.faq
      },
      policy: {
        size: this.policyCache.size,
        maxSize: this.maxCacheSize.policy,
        ttl: this.cacheTTL.policy
      },
      product: {
        size: this.productCache.size,
        maxSize: this.maxCacheSize.product,
        ttl: this.cacheTTL.product
      },
      search: {
        size: this.searchCache.size,
        maxSize: this.maxCacheSize.search,
        ttl: this.cacheTTL.search
      }
    };
  }

  cleanup() {
    this.stopCleanup();
    this.faqCache.clear();
    this.policyCache.clear();
    this.productCache.clear();
    this.searchCache.clear();
  }
}

module.exports = new RAGCache();
