
/**
 * Optimized Shared Database Service
 * Enhanced for better performance and reduced connection usage
 */

const { PrismaClient } = require('@prisma/client');

// Global shared instance with optimized settings
let sharedPrismaInstance = null;
let connectionCount = 0;
let isInitialized = false;

// Connection pool configuration - optimized for performance
const CONNECTION_CONFIG = {
  // Increase max connections slightly for better throughput
  maxConnections: 8,
  // Reduce timeout for faster failure detection
  queryTimeout: 15000,
  // Optimize connection lifecycle
  connectionTimeout: 20000,
  idleTimeout: 10000,
  // Enable query logging in development only
  enableLogging: process.env.NODE_ENV === 'development'
};

/**
 * Create optimized PrismaClient with performance-focused settings
 */
function createOptimizedPrismaClient() {
  //console.log('🔧 [SharedDB] Creating performance-optimized PrismaClient...');
  
  return new PrismaClient({
    log: CONNECTION_CONFIG.enableLogging 
      ? ['error', 'warn', 'info'] 
      : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Optimized internal settings
    __internal: {
      engine: {
        connectTimeout: CONNECTION_CONFIG.connectionTimeout,
        queryTimeout: CONNECTION_CONFIG.queryTimeout,
        pool: {
          max: CONNECTION_CONFIG.maxConnections,
          min: 2,                    // Maintain baseline connections
          idle: CONNECTION_CONFIG.idleTimeout,
          acquire: CONNECTION_CONFIG.connectionTimeout,
          evict: 1000               // Check idle connections every second
        }
      }
    }
  });
}

// Enhanced connection retry with circuit breaker pattern
let circuitBreakerOpen = false;
let circuitBreakerResetTime = null;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

function isCircuitBreakerOpen() {
  if (!circuitBreakerOpen) return false;
  
  if (circuitBreakerResetTime && Date.now() > circuitBreakerResetTime) {
    circuitBreakerOpen = false;
    circuitBreakerResetTime = null;
    //console.log('✅ [SharedDB] Circuit breaker reset - attempting reconnection');
    return false;
  }
  
  return true;
}

function openCircuitBreaker() {
  circuitBreakerOpen = true;
  circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
  //console.log('🚨 [SharedDB] Circuit breaker opened - connection failures detected');
}

/**
 * Enhanced retry with performance monitoring
 */
async function executeWithRetry(operation, maxRetries = 3, initialDelay = 1000) {
  if (isCircuitBreakerOpen()) {
    throw new Error('Circuit breaker is open - database unavailable');
  }

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // Log slow queries for optimization
      if (duration > 1000) {
        console.warn(`⚠️ [SharedDB] Slow query detected: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      const duration = Date.now() - startTime;

      // Check for connection limit or general connection errors
      const isConnectionError = error.message.includes('max_connections_per_hour') ||
                               error.message.includes('Connection') ||
                               error.message.includes('timeout') ||
                               error.code === 'P1001' ||
                               error.code === 'P1008';

      if (isConnectionError) {
        console.error(`❌ [SharedDB] Connection error on attempt ${attempt}/${maxRetries}: ${error.message}`);
        
        if (attempt >= maxRetries) {
          openCircuitBreaker();
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 10000); // Cap at 10 seconds
        }
      } else {
        // Non-connection errors shouldn't trigger retries
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Get shared PrismaClient instance with connection monitoring
 */
function getSharedPrismaClient() {
  if (!sharedPrismaInstance) {
    try {
      sharedPrismaInstance = createOptimizedPrismaClient();
      isInitialized = true;
      
      // Monitor connection events
      sharedPrismaInstance.$on('query', (e) => {
        connectionCount++;
        if (e.duration > 1000) {
          console.warn(`🐌 [SharedDB] Slow query: ${e.duration}ms - ${e.query.substring(0, 100)}...`);
        }
      });
      
      //console.log('✅ [SharedDB] Performance-optimized PrismaClient created');
      
    } catch (error) {
      console.error('❌ [SharedDB] Failed to create PrismaClient:', error);
      throw error;
    }
  }
  
  return sharedPrismaInstance;
}

// Export enhanced functions
module.exports = {
  getSharedPrismaClient,
  executeWithRetry,
  getConnectionStats: () => ({
    isInitialized,
    connectionCount,
    hasInstance: !!sharedPrismaInstance,
    circuitBreakerOpen,
    config: CONNECTION_CONFIG
  }),
  CONNECTION_CONFIG
};
