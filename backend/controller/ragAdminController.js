const { ragCache, ragAnalytics, ragRateLimiter, ragDataLoader } = require('../services/rag');

exports.getCacheStats = async (req, res) => {
  try {
    const stats = ragCache.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: error.message
    });
  }
};

exports.invalidateCache = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { type } = req.body;

    await ragDataLoader.invalidateCache(companyId, type || 'all');

    res.json({
      success: true,
      message: `Cache invalidated successfully for type: ${type || 'all'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache',
      error: error.message
    });
  }
};

exports.getSearchAnalytics = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate, limit } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await ragAnalytics.getSearchStats(companyId, start, end);
    const failedSearches = await ragAnalytics.getFailedSearches(companyId, parseInt(limit) || 50);

    res.json({
      success: true,
      data: {
        stats,
        failedSearches,
        period: {
          start,
          end
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get search analytics',
      error: error.message
    });
  }
};

exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await ragAnalytics.getPerformanceStats(companyId, start, end);

    res.json({
      success: true,
      data: {
        stats,
        period: {
          start,
          end
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get performance analytics',
      error: error.message
    });
  }
};

exports.getRateLimitStats = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { hours } = req.query;

    const stats = await ragRateLimiter.getRateLimitStats(companyId, parseInt(hours) || 24);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get rate limit statistics',
      error: error.message
    });
  }
};

exports.updateRateLimits = async (req, res) => {
  try {
    const { type, windowMs, maxRequests } = req.body;

    if (!type || !windowMs || !maxRequests) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, windowMs, maxRequests'
      });
    }

    ragRateLimiter.setLimits(type, windowMs, maxRequests);

    res.json({
      success: true,
      message: 'Rate limits updated successfully',
      data: { type, windowMs, maxRequests }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update rate limits',
      error: error.message
    });
  }
};

exports.getSettings = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        limits: ragRateLimiter.limits,
        cache: {
          ttl: ragCache.cacheTTL,
          maxSize: ragCache.maxCacheSize
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get RAG settings',
      error: error.message
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { limits, cache } = req.body;

    if (!limits && !cache) {
      return res.status(400).json({
        success: false,
        message: 'Missing settings (limits or cache) in request body'
      });
    }

    // Update Rate Limits
    if (limits) {
      if (limits.perCompany) {
        await ragRateLimiter.setLimits('perCompany', limits.perCompany.windowMs, limits.perCompany.maxRequests);
      }
      if (limits.perIP) {
        await ragRateLimiter.setLimits('perIP', limits.perIP.windowMs, limits.perIP.maxRequests);
      }
      if (limits.dailyTokens) {
        await ragRateLimiter.setDailyTokenLimit(limits.dailyTokens.maxTokens);
      }
    }

    // Update Cache Settings
    if (cache) {
      await ragCache.updateConfig(cache);
    }

    res.json({
      success: true,
      message: 'RAG settings updated successfully',
      data: {
        limits: ragRateLimiter.limits,
        cache: {
          ttl: ragCache.cacheTTL,
          maxSize: ragCache.maxCacheSize
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update RAG settings',
      error: error.message
    });
  }
};

exports.reloadFAQs = async (req, res) => {
  try {
    const { companyId } = req.user;

    await ragDataLoader.invalidateCache(companyId, 'faq');
    const faqs = await ragDataLoader.loadFAQs(companyId);

    res.json({
      success: true,
      message: 'FAQs reloaded successfully',
      data: {
        count: faqs.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reload FAQs',
      error: error.message
    });
  }
};

exports.reloadPolicies = async (req, res) => {
  try {
    const { companyId } = req.user;

    await ragDataLoader.invalidateCache(companyId, 'policy');
    const policies = await ragDataLoader.loadPolicies(companyId);

    res.json({
      success: true,
      message: 'Policies reloaded successfully',
      data: {
        count: policies.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reload policies',
      error: error.message
    });
  }
};

exports.getSystemHealth = async (req, res) => {
  try {
    const cacheStats = ragCache.getStats();
    const { companyId } = req.user;

    const rateLimitStats = await ragRateLimiter.getRateLimitStats(companyId, 1);

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      cache: {
        faq: {
          size: cacheStats.faq.size,
          utilization: (cacheStats.faq.size / cacheStats.faq.maxSize * 100).toFixed(2) + '%'
        },
        policy: {
          size: cacheStats.policy.size,
          utilization: (cacheStats.policy.size / cacheStats.policy.maxSize * 100).toFixed(2) + '%'
        },
        product: {
          size: cacheStats.product.size,
          utilization: (cacheStats.product.size / cacheStats.product.maxSize * 100).toFixed(2) + '%'
        },
        search: {
          size: cacheStats.search.size,
          utilization: (cacheStats.search.size / cacheStats.search.maxSize * 100).toFixed(2) + '%'
        }
      },
      rateLimit: {
        requestsLastHour: rateLimitStats.reduce((sum, stat) => sum + (stat._sum?.requestCount || 0), 0)
      }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
      error: error.message
    });
  }
};
