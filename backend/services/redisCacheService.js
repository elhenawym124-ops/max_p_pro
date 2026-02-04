const Redis = require('ioredis');
const redisConfig = require('../config/redis');

class RedisCacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.connectionRetries = 0;
        this.MAX_RETRIES = 3;

        this._initializeClient();
    }

    _initializeClient() {
        try {
            // Skip Redis initialization if REDIS_URL is not configured
            if (!process.env.REDIS_URL) {
                console.log('⚠️ [REDIS] Disabled - REDIS_URL not configured');
                this.client = null;
                this.isConnected = false;
                return;
            }

            this.client = new Redis({
                ...redisConfig,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });

            this.client.on('connect', () => {
                console.log('✅ [REDIS] Connected successfully');
                this.isConnected = true;
                this.connectionRetries = 0;
            });

            this.client.on('error', (err) => {
                console.error('❌ [REDIS] Connection Error:', err.message);
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ [REDIS] Initialization Failed:', error);
        }
    }

    /**
     * Get value from cache
     * @param {string} key 
     * @returns {Promise<any|null>}
     */
    async get(key) {
        if (!this.isConnected || !this.client) return null;

        try {
            const value = await this.client.get(key);
            if (!value) return null;

            try {
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        } catch (error) {
            console.error(`❌ [REDIS] Get Error (${key}):`, error.message);
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttlSeconds 
     */
    async set(key, value, ttlSeconds = 300) {
        if (!this.isConnected || !this.client) return false;

        try {
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

            if (ttlSeconds) {
                await this.client.set(key, stringValue, 'EX', ttlSeconds);
            } else {
                await this.client.set(key, stringValue);
            }
            return true;
        } catch (error) {
            console.error(`❌ [REDIS] Set Error (${key}):`, error.message);
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key 
     */
    async del(key) {
        if (!this.isConnected || !this.client) return false;
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error(`❌ [REDIS] Del Error (${key}):`, error.message);
            return false;
        }
    }

    /**
     * Clear all cache (Use carefully)
     */
    async flush() {
        if (!this.isConnected || !this.client) return false;
        try {
            await this.client.flushdb();
            console.warn('⚠️ [REDIS] Flushed all keys');
            return true;
        } catch (error) {
            console.error('❌ [REDIS] Flush Error:', error.message);
            return false;
        }
    }
}

// Singleton instance
const redisCacheService = new RedisCacheService();
module.exports = redisCacheService;
