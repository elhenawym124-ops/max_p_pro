/**
 * Webhook Rate Limiter Middleware
 * Prevents excessive database connections from Facebook webhooks
 */

// Track webhook requests per page
const webhookRequestTracker = new Map();
const WEBHOOK_RATE_LIMIT = 20; // Max 20 webhooks per minute per page
const WEBHOOK_WINDOW = 60 * 1000; // 1 minute window

/**
 * Rate limiter for webhooks
 */
function webhookRateLimiter(req, res, next) {
  // Only apply to POST webhooks
  if (req.method !== 'POST') {
    return next();
  }

  const body = req.body;
  
  // Skip if not a valid webhook body
  if (!body?.entry || !Array.isArray(body.entry)) {
    return next();
  }

  // Check rate limit for each page in the webhook
  const now = Date.now();
  let isRateLimited = false;

  for (const entry of body.entry) {
    const pageId = entry.id;
    
    // Get or create tracker for this page
    let tracker = webhookRequestTracker.get(pageId);
    
    if (!tracker) {
      tracker = {
        requests: [],
        lastCleanup: now
      };
      webhookRequestTracker.set(pageId, tracker);
    }

    // Cleanup old requests
    if (now - tracker.lastCleanup > WEBHOOK_WINDOW) {
      tracker.requests = tracker.requests.filter(
        timestamp => now - timestamp < WEBHOOK_WINDOW
      );
      tracker.lastCleanup = now;
    }

    // Check if rate limit exceeded
    if (tracker.requests.length >= WEBHOOK_RATE_LIMIT) {
      console.log(`🚫 [RATE-LIMIT] Page ${pageId} exceeded rate limit: ${tracker.requests.length}/${WEBHOOK_RATE_LIMIT} per minute`);
      isRateLimited = true;
      break;
    }

    // Add current request
    tracker.requests.push(now);
  }

  // If rate limited, respond immediately without processing
  if (isRateLimited) {
    return res.status(200).send('RATE_LIMITED');
  }

  next();
}

/**
 * Get rate limit stats
 */
function getRateLimitStats() {
  const stats = [];
  const now = Date.now();
  
  for (const [pageId, tracker] of webhookRequestTracker.entries()) {
    const recentRequests = tracker.requests.filter(
      timestamp => now - timestamp < WEBHOOK_WINDOW
    );
    
    stats.push({
      pageId,
      requestsPerMinute: recentRequests.length,
      limit: WEBHOOK_RATE_LIMIT
    });
  }
  
  return stats;
}

// Cleanup old trackers every 5 minutes
setInterval(() => {
  const now = Date.now();
  const entriesToDelete = [];
  
  for (const [pageId, tracker] of webhookRequestTracker.entries()) {
    // Remove trackers with no recent requests
    if (tracker.requests.length === 0 || 
        now - tracker.lastCleanup > 5 * 60 * 1000) {
      entriesToDelete.push(pageId);
    }
  }
  
  entriesToDelete.forEach(pageId => webhookRequestTracker.delete(pageId));
  
  if (entriesToDelete.length > 0) {
    console.log(`🧹 [RATE-LIMITER] Cleaned up ${entriesToDelete.length} inactive page trackers`);
  }
}, 5 * 60 * 1000);

module.exports = {
  webhookRateLimiter,
  getRateLimitStats
};
