
/**
 * Advanced Caching Utilities using Redis
 * Replaces local Map with distributed Redis cache
 */
const Redis = require('ioredis');
const redisConfig = require('../config/redis');

class ConversationCache {
  constructor() {
    this.localCache = new Map(); // Fallback only
    this.redis = null;
    this.TTL = 5 * 60; // 5 minutes in seconds

    try {
      // Skip Redis if not configured
      if (!process.env.REDIS_URL) {
        console.log('⚠️ [CACHE] Redis disabled - REDIS_URL not configured');
        this.redis = null;
        return;
      }

      this.redis = new Redis(redisConfig);

      this.redis.on('error', (err) => {
        console.error('❌ [CACHE] Redis Error:', err.message);
      });

      this.redis.on('connect', () => {
        console.log('✅ [CACHE] Connected to Redis');
      });
    } catch (error) {
      console.error('❌ [CACHE] Failed to initialize Redis:', error.message);
    }
  }

  // Helper to safely stringify
  toJSON(data) {
    try {
      return JSON.stringify(data);
    } catch (e) {
      return null;
    }
  }

  // Helper to safely parse
  fromJSON(data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  // Cache conversation list for a company
  async setConversations(companyId, conversations) {
    if (!this.redis) return;
    const key = `cache:conversations:${companyId}`;
    await this.redis.set(key, this.toJSON(conversations), 'EX', this.TTL);
  }

  async getConversations(companyId) {
    if (!this.redis) return null;
    const key = `cache:conversations:${companyId}`;
    const data = await this.redis.get(key);
    return this.fromJSON(data);
  }

  // Cache messages for a conversation
  async setMessages(conversationId, messages) {
    if (!this.redis) return;
    const key = `cache:messages:${conversationId}`;
    await this.redis.set(key, this.toJSON(messages), 'EX', this.TTL);
  }

  async getMessages(conversationId) {
    if (!this.redis) return null;
    const key = `cache:messages:${conversationId}`;
    const data = await this.redis.get(key);
    return this.fromJSON(data);
  }

  // Invalidate cache when new message is added
  async invalidateConversation(conversationId, companyId) {
    if (!this.redis) return;

    const keys = [
      `cache:messages:${conversationId}`,
      `cache:conversations:${companyId}`
    ];

    await this.redis.del(keys);
    //console.log(`💾 [CACHE] Invalidated cache for conversation ${conversationId}`);
  }

  // Get cache statistics (Approximate)
  async getStats() {
    if (!this.redis) return { error: 'Redis not initialized' };

    // Scan for keys (simplified)
    const keys = await this.redis.dbsize();
    return {
      totalKeys: keys,
      type: 'Redis Distributed Cache'
    };
  }

  // Cleanup is handled automatically by Redis TTL
  cleanup() {
    // No-op for Redis
  }
}

// Global cache instance
const conversationCache = new ConversationCache();

module.exports = {
  ConversationCache,
  conversationCache
};
