/**
 * 🚀 Queue Service (BullMQ)
 * 
 * Manages background job queues for async processing (logging, analytics, etc.)
 */

const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');

class QueueService {
    constructor() {
        this.queues = new Map();

        // Check if Redis is configured
        const isRedisConfigured = process.env.REDIS_URL ||
            (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'production-redis-host');

        if (!isRedisConfigured && process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ [QUEUE] Redis not configured - Queue features disabled');
            this.redisConfig = null;
            return;
        }

        this.redisConfig = {
            connection: { ...redisConfig }
        };

        // Initialize Log Queue
        this.createQueue('ai-logs');
    }

    /**
     * Create or retrieve a queue
     */
    createQueue(queueName) {
        if (!this.redisConfig) return null;
        if (this.queues.has(queueName)) {
            return this.queues.get(queueName);
        }

        console.log(`📥 [QUEUE] Initializing queue: ${queueName}`);
        const queue = new Queue(queueName, this.redisConfig);

        // Error handling
        queue.on('error', (err) => {
            console.error(`❌ [QUEUE] Error in ${queueName}:`, err.message);
        });

        this.queues.set(queueName, queue);
        return queue;
    }

    /**
     * Add job to queue
     * Fire-and-forget style (mostly)
     */
    async add(queueName, jobName, data, options = {}) {
        if (!this.redisConfig) return;
        try {
            const queue = this.createQueue(queueName);
            if (!queue) return;

            // Default options
            const jobOptions = {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true, // Auto-cleanup
                removeOnFail: 100, // Keep last 100 failed for debugging
                ...options
            };

            await queue.add(jobName, data, jobOptions);
            // Quiet success to avoid log spam
        } catch (error) {
            console.error(`❌ [QUEUE] Failed to add job to ${queueName}:`, error.message);
            // Fallback? Currently just log error.
        }
    }

    /**
     * Close all queues (cleanup)
     */
    async close() {
        for (const [name, queue] of this.queues) {
            await queue.close();
        }
        this.queues.clear();
    }
}

// Singleton
const queueService = new QueueService();
module.exports = queueService;
