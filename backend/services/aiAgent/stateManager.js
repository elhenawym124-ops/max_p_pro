/**
 * Logical State Manager (Singleton)
 * 
 * Centralizes runtime state management using Redis to ensure persistence
 * across server restarts and scalability across multiple processes.
 * 
 * Handles:
 * 1. Circuit Breakers (Key/Model exhaustion)
 * 2. Round-Robin State
 * 3. Session State (Tried Models)
 */

const redisCacheService = require('../redisCacheService');

class StateManager {
    constructor() {
        this.redis = redisCacheService;

        // Key Prefixes
        this.PREFIX_CB = 'cb:'; // Circuit Breaker: cb:{keyId}
        this.PREFIX_EXHAUST = 'exhaust:'; // Exhaustion: exhaust:{keyId}:{modelName}
        this.PREFIX_RR = 'rr:'; // Round Robin: rr:{scopeId}
        this.PREFIX_TRIED = 'tried:'; // Tried Models: tried:{sessionId}
        this.PREFIX_RL = 'rl:'; // Rate Limit: rl:{key}

        // Default TTLs
        this.TTL_TRIED_MODELS = 5 * 60; // 5 minutes
        this.TTL_LAST_USED = 24 * 60 * 60; // 24 hours
    }

    /**
     * ✅ Circuit Breaker: Check if key is cooling down
     */
    async isKeyCoolingDown(keyId) {
        const key = `${this.PREFIX_CB}${keyId}`;
        const exists = await this.redis.get(key);
        return !!exists;
    }

    /**
     * ✅ Circuit Breaker: Trip a key
     */
    async tripCircuitBreaker(keyId, durationMs) {
        const key = `${this.PREFIX_CB}${keyId}`;
        const ttlSeconds = Math.ceil(durationMs / 1000);
        // Value doesn't matter, existence is what matters
        await this.redis.set(key, '1', ttlSeconds);
        console.log(`🔌 [STATE-MANAGER] Circuit breaker tripped for key ${keyId} for ${ttlSeconds}s`);
    }

    /**
     * ✅ Model Exhaustion: Check if model is exhausted for a key
     */
    async isModelExhausted(keyId, modelName) {
        // Check Global exhaustion (ALL_KEYS) first
        const globalKey = `${this.PREFIX_EXHAUST}ALL_KEYS:${modelName}`;
        const globalExhausted = await this.redis.get(globalKey);
        if (globalExhausted) return true;

        if (!keyId) return false;

        const key = `${this.PREFIX_EXHAUST}${keyId}:${modelName}`;
        const exhausted = await this.redis.get(key);
        return !!exhausted;
    }

    /**
     * ✅ Model Exhaustion: Mark model as exhausted
     */
    async markModelExhausted(keyId, modelName, durationMs, reason = 'UNKNOWN') {
        const key = `${this.PREFIX_EXHAUST}${keyId}:${modelName}`;
        const ttlSeconds = Math.ceil(durationMs / 1000);

        const data = {
            reason,
            exhaustedAt: new Date().toISOString(),
            retryAt: new Date(Date.now() + durationMs).toISOString()
        };

        await this.redis.set(key, data, ttlSeconds);
        console.log(`🔒 [STATE-MANAGER] Model ${modelName} exhausted on key ${keyId} for ${ttlSeconds}s (${reason})`);
    }

    /**
     * ✅ Round Robin: Get next index atomically
     */
    async getNextRoundRobinIndex(scopeId, modulus) {
        if (modulus <= 0) return 0;
        if (modulus === 1) return 0;

        // ✅ Fail safe: If Redis is down, return random index to allow load balancing to continue somewhat
        if (!this.redis.isConnected || !this.redis.client) {
            return Math.floor(Math.random() * modulus);
        }

        const key = `${this.PREFIX_RR}${scopeId}`;

        // Atomic INCR
        const counter = await this.redis.client.incr(key);

        // Normalize to 0..modulus-1
        return counter % modulus;
    }

    /**
     * ✅ Session: Add tried model
     */
    async addTriedModel(sessionId, modelName) {
        if (!sessionId || !modelName) return;

        const key = `${this.PREFIX_TRIED}${sessionId}`;

        // We store as a Set in Redis (SADD)
        // redisCacheService wraps get/set, so we access client directly for specific commands
        // or we implement a set abstraction in redisCacheService?
        // For now, let's use a JSON array since redisCacheService simplifies JSON.

        let tried = await this.redis.get(key) || [];
        if (!Array.isArray(tried)) tried = [];

        if (!tried.includes(modelName)) {
            tried.push(modelName);
            await this.redis.set(key, tried, this.TTL_TRIED_MODELS);
        }
    }

    /**
     * ✅ Session: Get tried models
     */
    async getTriedModels(sessionId) {
        if (!sessionId) return [];

        const key = `${this.PREFIX_TRIED}${sessionId}`;
        const tried = await this.redis.get(key);

        return Array.isArray(tried) ? tried : [];
    }

    /**
     * ✅ Rate Limit: Check if key exceeds limit
     * Returns { allowed: boolean, remaining: number, resetTime: number }
     */
    async checkRateLimit(identifier, limit, windowSeconds) {
        // ✅ Fail Open: If Redis is down, allow traffic to prevent outage
        if (!this.redis.isConnected || !this.redis.client) {
            console.warn('⚠️ [STATE-MANAGER] Redis down, bypassing rate limit check');
            return {
                allowed: true,
                remaining: 1,
                resetTime: Date.now() + (windowSeconds * 1000)
            };
        }

        const key = `${this.PREFIX_RL}${identifier}`;
        const now = Date.now();

        const multi = this.redis.client.multi();
        multi.incr(key);
        multi.ttl(key);

        const results = await multi.exec();
        const current = results[0][1];
        let ttl = results[1][1];

        if (current === 1 || ttl === -1) {
            await this.redis.client.expire(key, windowSeconds);
            ttl = windowSeconds;
        }

        return {
            allowed: current <= limit,
            remaining: Math.max(0, limit - current),
            resetTime: now + (ttl * 1000)
        };
    }

    /**
     * ✅ Lock: Acquire distributed lock (Simple)
     * @param {string} resource
     * @param {number} ttlMs
     * @returns {Promise<boolean>}
     */
    async acquireLock(resource, ttlMs = 5000) {
        if (!this.redis.isConnected || !this.redis.client) return true; // Fail open: assume lock acquired

        const key = `lock:${resource}`;
        // PX = Milliseconds, NX = Only set if not exists
        const result = await this.redis.client.set(key, 'locked', 'PX', ttlMs, 'NX');
        return result === 'OK';
    }

    /**
     * ✅ Lock: Release distributed lock
     */
    async releaseLock(resource) {
        if (!this.redis.isConnected || !this.redis.client) return;

        const key = `lock:${resource}`;
        await this.redis.client.del(key);
    }

    /**
     * ✅ Utility: Clear all state (for testing/admin)
     */
    async clearState() {
        console.warn('⚠️ [STATE-MANAGER] Clear state requested (No-op to protect other data)');
    }

    /**
     * ✅ Legacy Compatibility: Check if model is exhausted
     */
    async isModelExhaustedInKey(keyId, modelName) {
        return this.isModelExhausted(keyId, modelName);
    }

    /**
     * ✅ Persistence: Get Last Used Global Key ID
     */
    async getLastUsedGlobalKeyId() {
        return await this.redis.get('global:last_used_key');
    }

    /**
     * ✅ Persistence: Set Last Used Global Key ID
     */
    async setLastUsedGlobalKeyId(keyId) {
        if (keyId) {
            await this.redis.set('global:last_used_key', keyId, this.TTL_LAST_USED);
        }
    }

    /**
     * ✅ Persistence: Get Last Used Key for Model
     */
    async getLastUsedKeyForModel(modelName) {
        return await this.redis.get(`model:${modelName}:last_key`);
    }

    /**
     * ✅ Persistence: Set Last Used Key for Model
     */
    async setLastUsedKeyForModel(modelName, keyId) {
        if (modelName && keyId) {
            await this.redis.set(`model:${modelName}:last_key`, keyId, this.TTL_LAST_USED);
        }
    }

    /**
     * ✅ Persistence: Get Retry At time for exhausted model
     */
    async getRetryAt(keyId, modelName) {
        const key = `${this.PREFIX_EXHAUST}${keyId}:${modelName}`;
        const data = await this.redis.get(key);
        if (data && data.retryAt) {
            return new Date(data.retryAt);
        }
        return null;
    }

    /**
     * ✅ Persistence: Get Earliest Retry At (Global scan not optimal, return null to force cleanup/retry)
     */
    async getEarliestRetryAt(modelName) {
        return null;
    }

    /**
     * ✅ Cleanup Expired (No-op for Redis as TTL handles it)
     */
    async cleanupExpired() {
        return 0;
    }
}

module.exports = new StateManager();
