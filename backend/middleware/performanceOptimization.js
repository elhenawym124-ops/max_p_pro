
/**
 * Performance Monitoring and Optimization Middleware
 */

const startTime = Date.now();
const responseTimeCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Response time monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const requestStart = Date.now();
  
  // Track request
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Override res.json to measure response time
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - requestStart;
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`🐌 [PERF] Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
      // Log query details for debugging
      if (responseTime > 3000) {
        console.error(`🔥 [PERF] CRITICAL: Very slow request: ${req.method} ${req.path} - ${responseTime}ms`);
      }
    }
    
    // Add performance headers
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Request-ID', req.requestId);
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Simple memory cache for frequently accessed data
 */
class SimpleCache {
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }
  
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new SimpleCache();

/**
 * Caching middleware for GET requests
 */
const cacheMiddleware = (ttl = 300000) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Create cache key from URL and user info
    const cacheKey = `${req.originalUrl}_${req.user?.id || 'anonymous'}_${req.user?.companyId || 'no_company'}`;
    
    // Check cache
    const cachedResponse = globalCache.get(cacheKey);
    if (cachedResponse) {
      //console.log(`💾 [CACHE] Cache hit for ${req.path}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }
    
    // Override res.json to cache response
    const originalJson = res.json;
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200 && data.success !== false) {
        globalCache.set(cacheKey, data, ttl);
        //console.log(`💾 [CACHE] Cached response for ${req.path}`);
      }
      
      res.setHeader('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Database query optimization middleware
 */
const queryOptimizer = (req, res, next) => {
  // Add query hints to request
  req.queryHints = {
    // Suggest using indices
    useIndex: true,
    // Limit default page size
    defaultLimit: 50,
    // Enable query result caching
    enableCache: true
  };
  
  next();
};

/**
 * Compression middleware for large responses
 */
const responseCompression = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add compression hint for large responses
    const responseSize = JSON.stringify(data).length;
    if (responseSize > 10000) { // > 10KB
      res.setHeader('X-Large-Response', 'true');
      //console.log(`📦 [PERF] Large response detected: ${responseSize} bytes for ${req.path}`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  performanceMonitor,
  cacheMiddleware,
  queryOptimizer,
  responseCompression,
  SimpleCache,
  globalCache
};
