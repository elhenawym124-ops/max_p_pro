/**
 * 🔄 Simple Key Rotator
 * نظام بسيط لتدوير المفاتيح بدون تتبع الكوتا المعقد
 * 
 * المبدأ: جرب المفتاح، إذا فشل علّمه مؤقتاً وانتقل للتالي
 * 
 * ✅ UPDATED: Uses centralized Redis StateManager for persistence across restarts/scaling.
 */

const stateManager = require('./stateManager');

class SimpleKeyRotator {
    constructor() {
        // No local state needed (except maybe simple caches if Redis is slow, but Redis is fast enough)

        // Default cooldown: 30 seconds
        this.DEFAULT_COOLDOWN = 30 * 1000;

        // Permanent failure cooldown: 24 hours (for leaked/invalid keys)
        this.PERMANENT_COOLDOWN = 24 * 60 * 60 * 1000;

        console.log('🔄 [SIMPLE-ROTATOR] Initialized - Persistent Redis mode');
    }

    /**
     * Get next available key using round-robin (Async)
     * @param {Array} keys - Array of key objects with { id, apiKey, name, ... }
     * @returns {Promise<Object|null>} - Next available key or null if all exhausted
     */
    async getNextKey(keys) {
        if (!keys || keys.length === 0) {
            console.warn('⚠️ [SIMPLE-ROTATOR] No keys provided');
            return null;
        }

        // 1. Filter available keys (Async check)
        const availableKeys = [];
        for (const key of keys) {
            const isCooling = await stateManager.isKeyCoolingDown(key.id);
            if (!isCooling) {
                availableKeys.push(key);
            }
        }

        if (availableKeys.length === 0) {
            console.warn('⚠️ [SIMPLE-ROTATOR] All keys are temporarily unavailable');
            // Determining "soonest retry" from Redis is hard without scanning keys.
            // Simplified: return null.
            return null;
        }

        // 2. Round-robin: get next key using Redis counter
        // Scope ID based on list of keys? Or just global "simple_rotator"?
        // Use a generic scope ID for simple rotation
        const scopeId = 'simple_rotator_idx';
        const index = await stateManager.getNextRoundRobinIndex(scopeId, availableKeys.length);

        const selectedKey = availableKeys[index];

        console.log(`✅ [SIMPLE-ROTATOR] Selected key: ${selectedKey.name || selectedKey.id} (Index: ${index}, Available: ${availableKeys.length})`);

        return selectedKey;
    }

    /**
     * Mark a key as temporarily failed (Async)
     * @param {string} keyId - Key ID
     * @param {string} reason - Reason for failure (e.g., '429', '403', 'LEAKED')
     * @param {number} retryAfterMs - Cooldown time in milliseconds
     */
    async markFailed(keyId, reason = 'UNKNOWN', retryAfterMs = null) {
        // Determine cooldown based on reason
        let cooldown = retryAfterMs || this.DEFAULT_COOLDOWN;
        const msgPrefix = `⚠️ [SIMPLE-ROTATOR] Key ${keyId}`;

        if (reason === 'LEAKED' || reason === '403_INVALID' || reason === 'PERMISSION_DENIED') {
            cooldown = this.PERMANENT_COOLDOWN;
            console.error(`🛑 [SIMPLE-ROTATOR] Key ${keyId} marked as PERMANENTLY failed (${reason}) - 24h cooldown`);
        } else if (reason === '429' || reason === 'QUOTA') {
            cooldown = retryAfterMs || this.DEFAULT_COOLDOWN;
            console.warn(`${msgPrefix} marked as temporarily failed (${reason}) - ${cooldown / 1000}s cooldown`);
        } else {
            console.warn(`${msgPrefix} marked as failed (${reason}) - ${cooldown / 1000}s cooldown`);
        }

        await stateManager.tripCircuitBreaker(keyId, cooldown);
    }

    /**
     * Check if a key is available (Async)
     * @param {string} keyId - Key ID
     * @returns {Promise<boolean>}
     */
    async isAvailable(keyId) {
        const isCooling = await stateManager.isKeyCoolingDown(keyId);
        return !isCooling;
    }

    /**
     * Get the soonest retry time among failed keys
    }

    /**
     * Clear all failures (useful on restart or manual reset)
     */
    clearAll() {
        const count = this.failedKeys.size;
        this.failedKeys.clear();
        this.lastUsedIndex = 0;
        console.log(`🧹 [SIMPLE-ROTATOR] Cleared ${count} failed keys`);
    }

    /**
     * Get status of all tracked failures
     * @returns {Object}
     */
    getStatus() {
        const failures = [];
        const now = Date.now();

        for (const [keyId, failure] of this.failedKeys) {
            const retryAt = failure.failedAt + failure.retryAfter;
            const remainingMs = Math.max(0, retryAt - now);

            failures.push({
                keyId,
                reason: failure.reason,
                remainingSeconds: Math.ceil(remainingMs / 1000),
                isExpired: remainingMs <= 0
            });
        }

        return {
            totalFailed: this.failedKeys.size,
            failures
        };
    }
}

// Singleton instance
let instance = null;

function getSimpleKeyRotator() {
    if (!instance) {
        instance = new SimpleKeyRotator();
    }
    return instance;
}

module.exports = {
    SimpleKeyRotator,
    getSimpleKeyRotator
};
