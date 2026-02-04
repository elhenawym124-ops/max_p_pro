/**
 * 👷 Log Worker (BullMQ)
 * 
 * Processes background logging tasks to keep the main thread fast.
 */

const { Worker } = require('bullmq');
const redisConfig = require('../config/redis');
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

class LogWorker {
    constructor() {
        this.worker = null;
        this.prisma = getSharedPrismaClient();
        this.redisConfig = {
            connection: redisConfig
        };
    }

    start() {
        console.log('👷 [WORKER] Starting Log Worker...');

        if (!this.redisConfig.connection) {
            console.warn('⚠️ [WORKER] Log Worker disabled - Redis not configured');
            return;
        }

        this.worker = new Worker('ai-logs', async (job) => {
            await this.processLog(job);
        }, this.redisConfig);

        this.worker.on('completed', (job) => {
            // console.log(`✅ [WORKER] Job ${job.id} completed`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`❌ [WORKER] Job ${job.id} failed: ${err.message}`);
        });
    }

    async processLog(job) {
        const { type, data } = job.data;

        try {
            if (type === 'interaction') {
                await this.saveInteractionLog(data);
            } else if (type === 'error') {
                await this.saveErrorLog(data);
            }
        } catch (error) {
            console.error('❌ [WORKER] Failed to process log:', error);
            throw error; // Retry
        }
    }

    async saveInteractionLog(logData) {
        await safeQuery(async () => {
            // Ensure required fields
            if (!logData.companyId || !logData.userId) return;

            // Updated to use camelCase aiInteraction
            await this.prisma.aiInteraction.create({
                data: {
                    companyId: logData.companyId,
                    userId: logData.userId,
                    userMessage: logData.userMessage || '',
                    aiResponse: logData.aiResponse || '',
                    modelUsed: logData.modelUsed || 'unknown',
                    promptTokens: logData.usage?.prompt_tokens || 0,
                    completionTokens: logData.usage?.completion_tokens || 0,
                    totalTokens: logData.usage?.total_tokens || 0,
                    cost: logData.cost || 0,
                    latencyMs: logData.latencyMs || 0,
                    status: logData.status || 'success',
                    metadata: logData.metadata ? JSON.stringify(logData.metadata) : null
                }
            });
        });
    }

    async saveErrorLog(errorData) {
        // Implement if AIErrorLog table exists, or just log to console
        console.error('🔴 [ASYNC-ERROR-LOG]', errorData);
    }
}

module.exports = new LogWorker();
