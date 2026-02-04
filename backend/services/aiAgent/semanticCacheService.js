/**
 * 🧠 Semantic Cache Service (Fuzzy)
 * 
 * Caches AI responses based on normalized user input to save costs.
 */

const crypto = require('crypto');
const redisCacheService = require('../redisCacheService');

class SemanticCacheService {
    constructor() {
        this.redis = redisCacheService;
        this.CACHE_PREFIX = 'semantic_cache:';
        this.CACHE_TTL = 3600 * 24; // 24 hours
    }

    /**
     * ✅ Normalize text for caching (Fuzzy Matching)
     * - Lowercase
     * - Remove punctuation
     * - Trim whitespace
     */
    normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep letters, numbers, spaces (including Arabic)
            .replace(/\s+/g, ' ') // Collapse spaces
            .trim();
    }

    /**
     * ✅ Generate Hash from normalized text
     */
    generateHash(text) {
        const normalized = this.normalizeText(text);
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    /**
     * ✅ Get cached response
     * @param {string} userMessage 
     * @param {string} companyId 
     * @param {string} modelName 
     * @returns {Promise<string|null>}
     */
    async getCachedResponse(userMessage, companyId, modelName = 'default') {
        try {
            if (!userMessage) return null;

            const hash = this.generateHash(userMessage);
            const key = `${this.CACHE_PREFIX}${companyId}:${modelName}:${hash}`;

            const cached = await this.redis.get(key);
            if (cached) {
                console.log(`🧠 [SEMANTIC-CACHE] HIT: ${hash.substring(0, 8)}`);
                // Handle both string and JSON formats
                try {
                    const parsed = JSON.parse(cached);
                    return parsed.content || cached;
                } catch {
                    return cached;
                }
            }
        } catch (error) {
            console.error('❌ [SEMANTIC-CACHE] Get Error:', error.message);
        }
        return null;
    }

    /**
     * ✅ Cache new response
     * @param {string} userMessage 
     * @param {string} aiResponse 
     * @param {string} companyId 
     * @param {string} modelName 
     */
    async cacheResponse(userMessage, aiResponse, companyId, modelName = 'default') {
        try {
            if (!userMessage || !aiResponse || aiResponse.length < 10) return;

            const hash = this.generateHash(userMessage);
            const key = `${this.CACHE_PREFIX}${companyId}:${modelName}:${hash}`;

            await this.redis.set(key, aiResponse, this.CACHE_TTL);
            console.log(`🧠 [SEMANTIC-CACHE] SAVED: ${hash.substring(0, 8)}`);
        } catch (error) {
            console.error('❌ [SEMANTIC-CACHE] Save Error:', error.message);
        }
    }
}

module.exports = new SemanticCacheService();
