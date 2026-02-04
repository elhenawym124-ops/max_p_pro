/**
 * Strict Flow Enforcement Middleware
 * 
 * Ensures robust input validation and rate limiting before requests reach the AI logic.
 */

const stateManager = require('../services/aiAgent/stateManager');

const strictFlowMiddleware = async (req, res, next) => {
    try {
        // 1. INPUT VALIDATION
        // Check for large payloads
        const content = req.body.message || req.body.prompt || '';
        const MAX_LENGTH = 2000;

        if (content.length > MAX_LENGTH) {
            return res.status(400).json({
                success: false,
                error: 'CONTENT_TOO_LONG',
                message: `Message content exceeds limit (${MAX_LENGTH} chars)`
            });
        }

        // Check for empty content (if it's a message endpoint)
        // Some endpoints like 'init' might not have message.
        if ((req.path.includes('/messages') || req.path.includes('/chat')) && req.method === 'POST') {
            if (!content || content.trim().length === 0) {
                // Allow if has images
                if (!req.files || req.files.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'EMPTY_CONTENT',
                        message: 'Message content cannot be empty'
                    });
                }
            }
        }

        // 2. RATE LIMITING (Redis-backed)
        // Identifier: User ID (if auth) or IP
        const identifier = req.user ? `user:${req.user.userId}` : `ip:${req.ip}`;
        const limit = 60; // 60 requests
        const window = 60; // per 60 seconds

        const rateLimit = await stateManager.checkRateLimit(identifier, limit, window);

        if (!rateLimit.allowed) {
            res.setHeader('Retry-After', Math.ceil((rateLimit.resetTime - Date.now()) / 1000));
            return res.status(429).json({
                success: false,
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later.',
                retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000));

        next();

    } catch (error) {
        console.error('❌ [STRICT-FLOW] Middleware Error:', error);
        // Fail safe: allow request but log error? Or block?
        // Block to be strict.
        return res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Request validation failed'
        });
    }
};

module.exports = strictFlowMiddleware;
