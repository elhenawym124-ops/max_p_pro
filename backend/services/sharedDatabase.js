
/**
 * Shared Database Service - ULTIMATE FIX for "Engine is not yet connected"
 * SOLUTION: Complete connection management overhaul
 */

const { PrismaClient } = require('../prisma/generated/mysql');

// Global shared instance
let sharedPrismaInstance = null;
let queryCount = 0;
let connectionCount = 0;
let isInitialized = false;

// ✅ FIX: Advanced connection management
let connectionManager = {
  isConnecting: false,
  lastConnectionAttempt: 0,
  connectionPromise: null,
  healthCheckInterval: null,
  lastSuccessfulQuery: 0,
  connectionRetryCount: 0
};

// Circuit breaker state
let connectionLimitReached = false;
let connectionLimitResetTime = null;
const CONNECTION_LIMIT_COOLDOWN = 60 * 1000; // 1 minute (was 1 hour)

// Query queue management
const queryQueue = [];
let isProcessingQueue = false;
const MAX_CONCURRENT_QUERIES = 20; // ⚡ ADJUSTED: Reduced to match connection limit safely
let activeQueries = 0;
const QUEUE_WARNING_THRESHOLD = 50; // ⚡ Adjusted threshold
const QUEUE_CRITICAL_THRESHOLD = 100; // ⚡ Adjusted critical threshold
const SLOW_QUERY_THRESHOLD = 5000; // ⚡ Log queries slower than 5 seconds

// Health monitoring
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds (fail fast)
const MAX_RETRY_ATTEMPTS = 2; // ✅ Reduced retries

/**
 * Extract database info from URL (without password for security)
 */
function extractDatabaseInfo(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return {
      provider: url.protocol.replace(':', ''), // mysql
      host: url.hostname,
      port: url.port || '3306',
      database: url.pathname.replace('/', ''),
      user: url.username || 'root',
      hasPassword: !!url.password
    };
  } catch (error) {
    return {
      provider: 'unknown',
      host: 'unknown',
      port: 'unknown',
      database: 'unknown',
      user: 'unknown',
      hasPassword: false
    };
  }
}

/**
 * Create optimized PrismaClient with connection stability focus
 */
function createStablePrismaClient() {
  console.log('🔧 [SharedDB] Creating stable PrismaClient...');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set. Please configure it in your .env file.');
  }

  // Extract and display database info (without password)
  const dbInfo = extractDatabaseInfo(databaseUrl);
  console.log('📊 [SharedDB] Database Configuration:');
  console.log('   Provider:', dbInfo.provider.toUpperCase());
  console.log('   Host:', dbInfo.host);
  console.log('   Port:', dbInfo.port);
  console.log('   Database:', dbInfo.database);
  console.log('   User:', dbInfo.user);
  console.log('   Password:', dbInfo.hasPassword ? '*** (hidden)' : 'Not set');
  console.log('   Connection:', dbInfo.host === 'localhost' || dbInfo.host === '127.0.0.1' ? 'Local' : 'Remote');

  try {
    const urlWithParams = new URL(databaseUrl);

    // ⚡ PERFORMANCE FOCUS: MySQL-compatible settings only
    // Use conservative settings for shared hosting
    urlWithParams.searchParams.set('connection_limit', '10');      // ⚡ Reduced to 10 to avoid "Too many connections"
    urlWithParams.searchParams.set('pool_timeout', '10');           // ✅ 10 seconds
    urlWithParams.searchParams.set('connect_timeout', '10');       // ✅ 10 seconds
    urlWithParams.searchParams.set('timeout', '10');               // ✅ 10 seconds
    urlWithParams.searchParams.set('acquireTimeout', '10000');     // ✅ 10 seconds in milliseconds
    urlWithParams.searchParams.set('acquireTimeoutMillis', '10000'); // ✅ 10 seconds in milliseconds
    urlWithParams.searchParams.set('createRetryIntervalMillis', '2000'); // ✅ 2 seconds retry interval

    const { PrismaClient } = require('../prisma/generated/mysql');

    const client = new PrismaClient({
      datasources: {
        db: {
          url: urlWithParams.toString()
        }
      },
      log: ['error'], // ✅ Only errors
      errorFormat: 'minimal'
    });

    // Track queries
    client.$on('query', () => {
      queryCount++;
      connectionCount++;
      connectionManager.lastSuccessfulQuery = Date.now();
      connectionManager.connectionRetryCount = 0; // Reset on successful query
    });

    console.log('✅ [SharedDB] PrismaClient instance created successfully');
    return client;

  } catch (error) {
    console.error('❌ [SharedDB] FATAL: Failed to create PrismaClient instance');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    throw error;
  }
}

/**
 * ✅ ULTIMATE FIX: Guaranteed connection with timeout and retry
 */
async function guaranteeConnection() {
  // If already connected and healthy, return immediately
  if (isInitialized && sharedPrismaInstance) {
    // Quick health check - verify connection is actually ready
    try {
      await Promise.race([
        sharedPrismaInstance.$queryRaw`SELECT 1 as quick_check`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Quick check timeout')), 30000) // 30 seconds
        )
      ]);
      connectionManager.lastSuccessfulQuery = Date.now();
      return; // Connection is healthy and ready
    } catch (error) {
      // Health check failed, connection not ready
      console.log('⚠️ [SharedDB] Quick health check failed, reconnecting...');
      isInitialized = false;
    }
  }

  // If there's already a connection attempt in progress, wait for it
  if (connectionManager.isConnecting && connectionManager.connectionPromise) {
    try {
      await connectionManager.connectionPromise;
      // After waiting, verify the connection is actually ready
      if (isInitialized && sharedPrismaInstance) {
        try {
          await Promise.race([
            sharedPrismaInstance.$queryRaw`SELECT 1 as ready_check`,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Ready check timeout')), 30000) // 30 seconds
            )
          ]);
          connectionManager.lastSuccessfulQuery = Date.now();
          return; // Connection is ready
        } catch (checkError) {
          // Connection promise completed but connection not ready, reset and try again
          console.warn('⚠️ [SharedDB] Connection promise completed but not ready, resetting...');
          isInitialized = false;
        }
      }
    } catch (waitError) {
      // Connection attempt failed, we'll try again below
      console.warn('⚠️ [SharedDB] Connection attempt failed:', waitError.message);
      isInitialized = false;
    }
  }

  // Start new connection attempt
  connectionManager.isConnecting = true;
  connectionManager.lastConnectionAttempt = Date.now();
  connectionManager.connectionRetryCount++;

  const connectionPromise = (async () => {
    const maxConnectionRetries = 3;

    for (let attempt = 1; attempt <= maxConnectionRetries; attempt++) {
      try {
        console.log(`🔄 [SharedDB] Connection attempt ${attempt}/${maxConnectionRetries}...`);

        // Clean up any existing instance
        if (sharedPrismaInstance) {
          try {
            await sharedPrismaInstance.$disconnect();
          } catch (disconnectError) {
            // Ignore disconnect errors
            console.warn('⚠️ [SharedDB] Error disconnecting old instance:', disconnectError.message);
          }
          sharedPrismaInstance = null;
        }

        // Create new instance
        try {
          sharedPrismaInstance = createStablePrismaClient();
        } catch (createError) {
          console.error(`❌ [SharedDB] Failed to create PrismaClient:`, createError.message);
          throw createError;
        }

        // Connect with timeout
        try {
          await Promise.race([
            sharedPrismaInstance.$connect(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout after 120 seconds')), CONNECTION_TIMEOUT)
            )
          ]);
          console.log('✅ [SharedDB] PrismaClient connected successfully');
        } catch (connectError) {
          console.error(`❌ [SharedDB] $connect() failed:`, connectError.message);
          throw connectError;
        }

        // Verify connection with simple query
        try {
          await Promise.race([
            sharedPrismaInstance.$queryRaw`SELECT 1 as connection_verify`,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Verification timeout after 30 seconds')), 30000) // 30 seconds
            )
          ]);
          console.log('✅ [SharedDB] Connection verification query succeeded');
        } catch (verifyError) {
          console.error(`❌ [SharedDB] Connection verification failed:`, verifyError.message);
          throw verifyError;
        }

        isInitialized = true;
        connectionManager.lastSuccessfulQuery = Date.now();
        connectionManager.connectionRetryCount = 0;

        console.log('✅ [SharedDB] Database connection established and verified');
        return true;

      } catch (error) {
        console.error(`❌ [SharedDB] Connection attempt ${attempt} failed:`, error.message);
        console.error(`❌ [SharedDB] Error stack:`, error.stack?.substring(0, 200));

        // Clean up failed instance
        if (sharedPrismaInstance) {
          try {
            await sharedPrismaInstance.$disconnect().catch(() => { });
          } catch (e) {
            // Ignore
          }
          sharedPrismaInstance = null;
        }

        if (attempt < maxConnectionRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏳ [SharedDB] Retrying connection in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }

        // All retries failed
        isInitialized = false;
        sharedPrismaInstance = null;
        const finalError = new Error(`All connection attempts failed: ${error.message}`);
        finalError.stack = error.stack;
        throw finalError;
      }
    }
  })();

  connectionManager.connectionPromise = connectionPromise;

  try {
    const result = await connectionPromise;
    return result;
  } finally {
    connectionManager.isConnecting = false;
    connectionManager.connectionPromise = null;
  }
}

/**
 * ✅ ULTIMATE FIX: Smart query execution with connection guarantee and timeout
 */
async function executeQuerySafely(operation, operationName = 'unknown') {
  // ✅ CRITICAL FIX: Ensure we have a valid connection before executing
  // This must be awaited to prevent "Engine is not yet connected" errors
  try {
    await guaranteeConnection();
  } catch (connectionError) {
    console.error(`❌ [SharedDB] Failed to establish connection for ${operationName}:`, connectionError.message);
    throw new Error(`Database connection failed: ${connectionError.message}`);
  }

  if (!isInitialized || !sharedPrismaInstance) {
    throw new Error('No database connection available after guaranteeConnection()');
  }

  // ⚡ NEW: Verify connection is actually ready before executing query
  try {
    await Promise.race([
      sharedPrismaInstance.$queryRaw`SELECT 1 as connection_check`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection verification timeout')), 30000) // 30 seconds for verification
      )
    ]);
  } catch (verifyError) {
    // If verification fails, reset and reconnect
    isInitialized = false;
    console.warn(`⚠️ [SharedDB] Connection verification failed, reconnecting...`);
    try {
      await guaranteeConnection();
    } catch (reconnectError) {
      throw new Error(`Failed to reconnect: ${reconnectError.message}`);
    }
  }

  let lastError;

  // ⚡ NEW: Add query timeout (120 seconds max per query - matching remote DB settings)
  const QUERY_TIMEOUT = 120000; // 120 seconds (matching remote database timeout)

  const queryStartTime = Date.now();

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // ⚡ NEW: Execute query with timeout
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Query timeout after ${QUERY_TIMEOUT}ms`)), QUERY_TIMEOUT)
        )
      ]);

      const queryDuration = Date.now() - queryStartTime;

      // Log slow queries with more details
      if (queryDuration > SLOW_QUERY_THRESHOLD) {
        console.warn(`🐌 [SharedDB] Slow query "${operationName}": ${queryDuration}ms`);
        // Log stack trace for very slow queries (>10 seconds)
        if (queryDuration > 10000) {
          try {
            const stack = new Error().stack;
            if (stack) {
              const relevantLines = stack.split('\n').slice(1, 6).join('\n');
              console.warn(`📍 [SharedDB] Stack trace for slow query:\n${relevantLines}`);
            }
          } catch (e) {
            // Ignore
          }
        }
      }

      if (attempt > 1) {
        console.log(`✅ [SharedDB] Query "${operationName}" succeeded on attempt ${attempt} (${queryDuration}ms)`);
      }

      return result;

    } catch (error) {
      lastError = error;

      // ⚡ NEW: Log slow queries
      if (error.message.includes('timeout')) {
        console.warn(`⏰ [SharedDB] Query "${operationName}" timed out after ${QUERY_TIMEOUT}ms`);
      }

      // Check if this is a connection error
      const isConnectionError =
        error.message.includes('Engine is not yet connected') ||
        error.message.includes('not yet connected') ||
        error.message.includes('Response from the Engine was empty') ||
        error.message.includes('Engine has died') ||
        error.message.includes('Connection') ||
        error.message.includes('timeout') ||
        error.code === 'P1001' ||
        error.code === 'P1008' ||
        error.code === 'P1017';

      if (isConnectionError && attempt < MAX_RETRY_ATTEMPTS) {
        // Reset connection state
        isInitialized = false;

        // Wait before retry with exponential backoff
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000);
        console.log(`🔄 [SharedDB] Connection error in "${operationName}", retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} in ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));

        // Try to reestablish connection before next attempt
        try {
          await guaranteeConnection();
          // Verify connection again after reconnection
          await Promise.race([
            sharedPrismaInstance.$queryRaw`SELECT 1 as connection_check`,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection verification timeout')), 30000) // 30 seconds
            )
          ]);
        } catch (connectionError) {
          console.error(`❌ [SharedDB] Reconnection failed:`, connectionError.message);
        }

        continue;
      }

      // Non-retryable error or max retries reached
      break;
    }
  }

  // If we get here, all retries failed
  console.error(`❌ [SharedDB] All retries failed for "${operationName}":`, lastError.message);
  throw lastError;
}

/**
 * Queue-based execution with connection safety
 */
async function executeWithQueue(operation, priority = 0) {
  // ⚡ NEW: Try to extract better operation name from stack trace
  let operationName = operation.name || 'anonymous';
  if (operationName === 'anonymous' || !operationName) {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Skip first 3 lines (Error, executeWithQueue, caller)
        for (let i = 3; i < Math.min(lines.length, 8); i++) {
          const line = lines[i];
          // Extract function name or file name
          const match = line.match(/at\s+(?:async\s+)?(\w+)|at\s+.*\/([\w\-]+\.js)/);
          if (match && (match[1] || match[2])) {
            operationName = match[1] || match[2];
            if (operationName !== 'executeWithQueue' && operationName !== 'safeQuery') {
              break;
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors in stack trace extraction
    }
  }

  // ⚡ OPTIMIZATION: If queue is empty and we have capacity, execute immediately
  if (queryQueue.length === 0 && activeQueries < MAX_CONCURRENT_QUERIES) {
    activeQueries++;
    try {
      const result = await executeQuerySafely(operation, operationName);
      return result;
    } finally {
      activeQueries--;
      processQueue(); // Process any queued items
    }
  }

  return new Promise((resolve, reject) => {
    // Use extracted operation name

    const wrappedOperation = async () => {
      return await executeQuerySafely(operation, operationName);
    };

    const queueItem = {
      operation: wrappedOperation,
      priority,
      resolve,
      reject,
      timestamp: Date.now(),
      timeout: null
    };

    // ⚡ NEW: Add timeout for queries stuck in queue (30 seconds)
    const QUERY_TIMEOUT = 30000; // 30 seconds
    queueItem.timeout = setTimeout(() => {
      // Remove from queue if still waiting
      const index = queryQueue.indexOf(queueItem);
      if (index !== -1) {
        queryQueue.splice(index, 1);
        console.error(`⏱️  [SharedDB] Query timeout after ${QUERY_TIMEOUT}ms in queue: ${operationName}`);
        reject(new Error(`Query timeout: waited ${QUERY_TIMEOUT}ms in queue`));
      }
    }, QUERY_TIMEOUT);

    queryQueue.push(queueItem);

    // Sort by priority (higher first)
    queryQueue.sort((a, b) => b.priority - a.priority);

    // ⚡ WARNING: Log if queue is getting large (optimized threshold)
    if (queryQueue.length > QUEUE_WARNING_THRESHOLD) {
      // Only log every 10 queries to reduce spam
      if (queryQueue.length % 10 === 0 || queryQueue.length > QUEUE_CRITICAL_THRESHOLD) {
        console.warn(`⚠️ [SharedDB] Query queue is large: ${queryQueue.length} queries waiting, ${activeQueries} active`);

        // ⚡ NEW: Log oldest query in queue
        if (queryQueue.length > 0) {
          const oldestQuery = queryQueue[0];
          const queueAge = Date.now() - oldestQuery.timestamp;
          if (queueAge > 5000) {
            console.error(`🚨 [SharedDB] Oldest query in queue is ${queueAge}ms old! Queue may be stuck.`);
          }
        }
      }
    }

    processQueue();
  });
}

/**
 * Process query queue (optimized for high load)
 */
async function processQueue() {
  if (isProcessingQueue) return;
  if (queryQueue.length === 0) return;
  if (activeQueries >= MAX_CONCURRENT_QUERIES) return;

  isProcessingQueue = true;

  // ⚡ OPTIMIZATION: Process multiple items in parallel
  const itemsToProcess = Math.min(
    queryQueue.length,
    MAX_CONCURRENT_QUERIES - activeQueries
  );

  const items = [];
  for (let i = 0; i < itemsToProcess; i++) {
    const item = queryQueue.shift();
    if (!item) break;
    items.push(item);
  }

  // Process all items in parallel
  items.forEach(item => {
    activeQueries++;

    // Clear timeout when starting to process
    if (item.timeout) {
      clearTimeout(item.timeout);
      item.timeout = null;
    }

    const itemStartTime = Date.now();
    const queueWaitTime = itemStartTime - item.timestamp;

    // Log if query waited too long in queue
    if (queueWaitTime > 10000) {
      console.warn(`⏳ [SharedDB] Query waited ${queueWaitTime}ms in queue before processing`);
    }

    item.operation()
      .then(result => {
        const totalTime = Date.now() - item.timestamp;
        if (totalTime > SLOW_QUERY_THRESHOLD) {
          console.warn(`🐌 [SharedDB] Query completed in ${totalTime}ms (waited ${queueWaitTime}ms in queue)`);
        }
        item.resolve(result);
      })
      .catch(error => {
        const totalTime = Date.now() - item.timestamp;
        console.error(`❌ [SharedDB] Query failed after ${totalTime}ms (waited ${queueWaitTime}ms in queue):`, error.message);
        item.reject(error);
      })
      .finally(() => {
        activeQueries--;
        // Continue processing queue after each item completes
        // Use process.nextTick for faster processing when queue is large
        if (queryQueue.length > 0) {
          process.nextTick(() => processQueue());
        }
      });
  });

  isProcessingQueue = false;

  // ⚡ OPTIMIZED: If queue is still large, schedule another processing round immediately
  // Use process.nextTick for faster processing
  if (queryQueue.length > 0 && activeQueries < MAX_CONCURRENT_QUERIES) {
    // Process more aggressively if queue is critical
    if (queryQueue.length > QUEUE_CRITICAL_THRESHOLD) {
      // Critical: process immediately
      process.nextTick(() => processQueue());
    } else if (queryQueue.length > QUEUE_WARNING_THRESHOLD) {
      // Warning: process quickly
      process.nextTick(() => processQueue());
    } else {
      // Normal: use setImmediate
      setImmediate(() => processQueue());
    }
  }

  // ⚡ NEW: If queue is very large and we have capacity, process more aggressively
  if (queryQueue.length > QUEUE_CRITICAL_THRESHOLD && activeQueries < MAX_CONCURRENT_QUERIES * 0.5) {
    // If queue is critical but we're using less than 50% capacity, process more
    process.nextTick(() => processQueue());
  }
}

/**
 * Start health monitoring
 */
function startHealthMonitoring() {
  if (connectionManager.healthCheckInterval) {
    clearInterval(connectionManager.healthCheckInterval);
  }

  connectionManager.healthCheckInterval = setInterval(async () => {
    if (!sharedPrismaInstance || connectionManager.isConnecting) {
      return;
    }

    // Don't check if there was recent activity
    const timeSinceLastSuccess = Date.now() - connectionManager.lastSuccessfulQuery;
    if (timeSinceLastSuccess < 15000) { // 15 seconds
      return;
    }

    try {
      await Promise.race([
        sharedPrismaInstance.$queryRaw`SELECT 1 as health_check`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 30000) // 30 seconds
        )
      ]);
    } catch (error) {
      console.log('⚠️ [SharedDB] Health monitor detected connection issue');
      isInitialized = false;
    }
  }, HEALTH_CHECK_INTERVAL);
}

/**
 * Get shared PrismaClient instance
 * ✅ FIX: Returns client (connection is guaranteed by safeQuery/executeQuerySafely)
 */
/**
 * ✅ CRITICAL FIX: Get Prisma client with guaranteed connection
 * This ensures the client is connected before returning it
 */
async function getSharedPrismaClientAsync() {
  // Ensure connection is established
  await guaranteeConnection();

  if (!sharedPrismaInstance) {
    throw new Error('Prisma client not initialized after guaranteeConnection()');
  }

  return sharedPrismaInstance;
}

/**
 * ✅ CRITICAL FIX: Get Prisma client
 * ⚠️ WARNING: This function does NOT guarantee connection!
 * Always use safeQuery() or executeWithRetry() when using this client
 * The connection will be guaranteed inside safeQuery/executeWithRetry
 */
function getSharedPrismaClient() {
  if (!sharedPrismaInstance) {
    console.log('🔧 [SharedDB] getSharedPrismaClient creating on-demand instance...');
    sharedPrismaInstance = createStablePrismaClient();
  }

  // ⚠️ CRITICAL: Strict validation
  if (!isInitialized) {
    if (connectionManager.isConnecting) {
      console.warn('⚠️ [SharedDB] getSharedPrismaClient called while connection is still in progress');
    } else {
      console.error('❌ [SharedDB] CRITICAL: getSharedPrismaClient called before initializeSharedDatabase()!');
    }
    // Return the instance anyway if it exists, as it might be usable
    // but the caller should use executeWithRetry to guarantee connection
    return sharedPrismaInstance;
  }

  return sharedPrismaInstance;
}

/**
 * Check if we're in cooldown period
 */
function isInConnectionLimitCooldown() {
  if (!connectionLimitReached) return false;

  if (connectionLimitResetTime && Date.now() > connectionLimitResetTime) {
    connectionLimitReached = false;
    connectionLimitResetTime = null;
    console.log('✅ [SharedDB] Cooldown period ended');
    return false;
  }

  return true;
}

/**
 * Set connection limit flag with cooldown
 */
function setConnectionLimitReached() {
  if (!connectionLimitReached) {
    connectionLimitReached = true;
    connectionLimitResetTime = Date.now() + CONNECTION_LIMIT_COOLDOWN;
    console.log('🚨 [SharedDB] Connection limit reached - 1 hour cooldown');
  }
}

/**
 * Enhanced retry logic
 */
async function executeWithRetry(operation, maxRetries = 5, initialDelay = 2000) {
  // Circuit breaker check
  if (isInConnectionLimitCooldown()) {
    const remainingTime = Math.ceil((connectionLimitResetTime - Date.now()) / 1000 / 60);
    throw new Error(`Database in cooldown. Retry after ${remainingTime} minutes.`);
  }

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await operation();

      if (attempt > 1) {
        console.log(`✅ [SharedDB] Query succeeded on attempt ${attempt}`);
      }

      return result;

    } catch (error) {
      lastError = error;

      // Detect connection limit error
      const isConnectionLimitError =
        error.message.includes('max_connections_per_hour') ||
        error.message.includes('ERROR 42000 (1226)') ||
        (error.code === 1226);

      if (isConnectionLimitError) {
        setConnectionLimitReached();
        throw new Error(`Database connection limit exceeded. 1-hour cooldown activated.`);
      }

      // Other retryable errors
      const isRetryable =
        error.message.includes('Connection') ||
        error.message.includes('timeout') ||
        error.message.includes('Engine is not yet connected') ||
        error.message.includes('not yet connected') ||
        error.message.includes('Response from the Engine was empty') ||
        error.message.includes('Engine has died') ||
        error.code === 'P1001' ||
        error.code === 'P1008' ||
        error.message.includes('ECONNREFUSED');

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff with jitter
        const backoff = Math.min(delay * Math.pow(2, attempt - 1), 30000);
        const jitter = Math.random() * 1000;
        delay = backoff + jitter;

        console.log(`⚠️ [SharedDB] Connection error, retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
        continue;
      }

      // Non-retryable error
      if (!isRetryable) {
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Initialize database
 */
async function initializeSharedDatabase() {
  try {
    console.log('🔧 [SharedDB] Starting database initialization...');

    // Display database info
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      const dbInfo = extractDatabaseInfo(databaseUrl);
      console.log('📊 [SharedDB] Database Information:');
      console.log('   Provider:', dbInfo.provider.toUpperCase());
      console.log('   Host:', dbInfo.host);
      console.log('   Port:', dbInfo.port);
      console.log('   Database:', dbInfo.database);
      console.log('   User:', dbInfo.user);
      console.log('   Connection Type:', dbInfo.host === 'localhost' || dbInfo.host === '127.0.0.1' ? 'Local' : 'Remote');
    }

    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

    // Use the new guaranteed connection approach
    await guaranteeConnection();

    // Test query
    await executeWithQueue(async () => {
      await getSharedPrismaClient().$queryRaw`SELECT 1 as test`;
      console.log('✅ [SharedDB] Database test successful');
    }, 10);

    // ✅ FIX: Start health monitoring AFTER successful initialization
    startHealthMonitoring();
    console.log('✅ [SharedDB] Health monitoring started');

    return true;

  } catch (error) {
    console.error('❌ [SharedDB] Initialization failed:', error.message);
    throw error;
  }
}

/**
 * Wrapper for safe database queries
 */
async function safeQuery(operation, priority = 0) {
  return executeWithQueue(operation, priority);
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    if (!sharedPrismaInstance) {
      return {
        status: 'disconnected',
        error: 'No instance',
        connectionLimitStatus: connectionLimitReached ? 'cooldown' : 'normal'
      };
    }

    if (isInConnectionLimitCooldown()) {
      return {
        status: 'cooldown',
        connectionLimitStatus: 'active',
        cooldownEndsAt: connectionLimitResetTime,
        remainingMinutes: Math.ceil((connectionLimitResetTime - Date.now()) / 1000 / 60)
      };
    }

    await safeQuery(async () => {
      await sharedPrismaInstance.$queryRaw`SELECT 1 as health`;
    }, -10);

    return {
      status: 'healthy',
      queryCount,
      connectionCount,
      isInitialized,
      queueLength: queryQueue.length,
      activeQueries,
      connectionLimitStatus: 'normal'
    };

  } catch (error) {
    return {
      status: error.message.includes('cooldown') ? 'cooldown' : 'error',
      error: error.message.substring(0, 200),
      queryCount,
      connectionCount,
      queueLength: queryQueue.length,
      connectionLimitStatus: connectionLimitReached ? 'active' : 'normal'
    };
  }
}

/**
 * Get connection statistics
 */
function getConnectionStats() {
  return {
    isInitialized,
    queryCount,
    connectionCount,
    hasInstance: !!sharedPrismaInstance,
    queueLength: queryQueue.length,
    activeQueries,
    inCooldown: connectionLimitReached,
    cooldownEndsAt: connectionLimitResetTime,
    isConnecting: connectionManager.isConnecting,
    connectionRetryCount: connectionManager.connectionRetryCount
  };
}

/**
 * Close database gracefully
 */
async function closeSharedDatabase() {
  // Stop health monitoring
  if (connectionManager.healthCheckInterval) {
    clearInterval(connectionManager.healthCheckInterval);
    connectionManager.healthCheckInterval = null;
  }

  if (sharedPrismaInstance) {
    try {
      // Wait for queue to clear
      const timeout = Date.now() + 10000;
      while (queryQueue.length > 0 && Date.now() < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await sharedPrismaInstance.$disconnect();
      console.log('✅ [SharedDB] Database closed gracefully');

      sharedPrismaInstance = null;
      isInitialized = false;

    } catch (error) {
      console.error('❌ [SharedDB] Error closing database:', error);
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 [SharedDB] SIGINT - closing database...');
  await closeSharedDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 [SharedDB] SIGTERM - closing database...');
  await closeSharedDatabase();
  process.exit(0);
});

module.exports = {
  getSharedPrismaClient,
  getSharedPrismaClientAsync, // ✅ NEW: Async version that guarantees connection
  initializeSharedDatabase,
  closeSharedDatabase,
  getConnectionStats,
  healthCheck,
  executeWithRetry,
  safeQuery,
  isInConnectionLimitCooldown,
  getCooldownInfo: () => {
    if (!connectionLimitReached) {
      return { inCooldown: false, remainingMinutes: 0, endsAt: null };
    }

    const remainingMs = connectionLimitResetTime - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 1000 / 60);

    return {
      inCooldown: true,
      remainingMinutes: Math.max(0, remainingMinutes),
      endsAt: connectionLimitResetTime
    };
  }
};

