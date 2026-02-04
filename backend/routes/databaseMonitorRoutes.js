/**
 * Database Connection Monitor Routes
 * 
 * Provides endpoints to monitor database connection status and limits
 */

const express = require('express');
const router = express.Router();
const { healthCheck, getConnectionStats } = require('../services/sharedDatabase');
const { safeDb } = require('../utils/safeDatabase');

/**
 * Get comprehensive database status
 */
router.get('/database/status', async (req, res) => {
  try {
    const health = await healthCheck();
    const stats = getConnectionStats();
    const connectionStatus = await safeDb.getConnectionStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      health: health,
      stats: stats,
      connection: connectionStatus,
      recommendations: generateRecommendations(health, stats)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get connection limit status specifically
 */
router.get('/database/connection-limit', async (req, res) => {
  try {
    const health = await healthCheck();
    
    const isLimitExceeded = health.status === 'connection_limit' || 
                           health.connectionLimitStatus === 'active';
    
    res.json({
      success: true,
      connectionLimitExceeded: isLimitExceeded,
      status: health.connectionLimitStatus || 'normal',
      cooldownEndsAt: health.cooldownEndsAt,
      retryAfter: health.retryAfter,
      message: isLimitExceeded ? 
        'Database connection limit exceeded. System is in cooldown mode.' :
        'Database connection limit is normal.',
      arabicMessage: isLimitExceeded ?
        'تم تجاوز حد اتصالات قاعدة البيانات. النظام في وضع التهدئة.' :
        'حد اتصالات قاعدة البيانات طبيعي.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test database connectivity with retry
 */
router.post('/database/test-connection', async (req, res) => {
  try {
    const startTime = Date.now();
    
    await safeDb.execute(async (prisma) => {
      await prisma.$queryRaw`SELECT 1 as test, NOW() as timestamp`;
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Database connection test successful',
      responseTime: responseTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const isConnectionLimit = error.message.includes('max_connections_per_hour');
    
    res.status(isConnectionLimit ? 503 : 500).json({
      success: false,
      error: isConnectionLimit ? 'CONNECTION_LIMIT_EXCEEDED' : 'CONNECTION_ERROR',
      message: isConnectionLimit ? 
        'Database connection limit exceeded' : 
        'Database connection test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get database performance metrics
 */
router.get('/database/metrics', async (req, res) => {
  try {
    const stats = getConnectionStats();
    const health = await healthCheck();
    
    // Simple performance test
    const performanceTests = await Promise.allSettled([
      measureQueryPerformance('SELECT 1'),
      measureQueryPerformance('SELECT COUNT(*) FROM user LIMIT 1'),
      measureQueryPerformance('SELECT COUNT(*) FROM conversation LIMIT 1')
    ]);
    
    const metrics = {
      connectionStats: stats,
      healthStatus: health.status,
      performanceTests: performanceTests.map((result, index) => ({
        test: ['simple', 'user_count', 'conversation_count'][index],
        status: result.status,
        responseTime: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      })),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      metrics: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Measure query performance
 */
async function measureQueryPerformance(query) {
  const startTime = Date.now();
  
  await safeDb.execute(async (prisma) => {
    await prisma.$queryRaw`${query}`;
  }, { maxRetries: 1 });
  
  return Date.now() - startTime;
}

/**
 * Generate recommendations based on health status
 */
function generateRecommendations(health, stats) {
  const recommendations = [];
  
  if (health.status === 'connection_limit') {
    recommendations.push({
      type: 'critical',
      message: 'Database connection limit exceeded',
      suggestion: 'Wait for cooldown period to end or upgrade database plan',
      arabic: 'تم تجاوز حد اتصالات قاعدة البيانات. انتظر انتهاء فترة التهدئة أو ترقية خطة قاعدة البيانات'
    });
  }
  
  if (stats.connectionCount > 400) {
    recommendations.push({
      type: 'warning',
      message: 'High connection usage detected',
      suggestion: 'Monitor connection usage to avoid hitting limits',
      arabic: 'تم اكتشاف استخدام عالي للاتصالات. راقب استخدام الاتصالات لتجنب الوصول للحدود'
    });
  }
  
  if (health.status === 'healthy') {
    recommendations.push({
      type: 'info',
      message: 'Database is operating normally',
      suggestion: 'Continue monitoring for optimal performance',
      arabic: 'قاعدة البيانات تعمل بشكل طبيعي. استمر في المراقبة للحصول على أداء مثالي'
    });
  }
  
  return recommendations;
}

module.exports = router;