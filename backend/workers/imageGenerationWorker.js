const { Worker } = require('bullmq');
const redisConfig = require('../config/redis');
const imageStudioService = require('../services/imageStudioService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// ✅ FIX: Use lazy-loading pattern
const getPrisma = () => getSharedPrismaClient();

/**
 * Image Generation Worker
 * 
 * هذا العامل (Worker) يقوم بمعالجة المهام من طابور 'image-generation'.
 * لكل مهمة، يقوم باستدعاء دالة التوليد الفعلية في الـ Service.
 */

const worker = new Worker('image-generation', async (job) => {
    const { prompt, modelType, useMagicPrompt, aspectRatio, companyId, userId, historyId } = job.data;

    console.log(`👷 [WORKER] Processing job ${job.id} (HistoryID: ${historyId})...`);

    try {
        // 1. تحديث الحالة إلى "قيد المعالجة" (إذا لم تكن كذلك)
        await getPrisma().imageStudioHistory.update({
            where: { id: historyId },
            data: { status: 'processing' }
        });

        // 2. استدعاء دالة التوليد (بشكل متزامن الآن لأننا داخل الـ Worker)
        // ملاحظة: نحتاج لتعديل imageStudioService لفصل منطق التوليد عن منطق الطابور
        // أو نستدعي دالة داخلية تقوم بالتوليد المباشر.
        // سنقوم هنا باستدعاء دالة `executeGeneration` التي سنضيفها للـ Service.

        const result = await imageStudioService.executeGeneration({
            prompt,
            modelType,
            useMagicPrompt,
            aspectRatio,
            companyId,
            userId,
            historyId // نمرر الـ ID الموجود مسبقاً
        });

        console.log(`✅ [WORKER] Job ${job.id} completed successfully.`);
        return result;

    } catch (error) {
        console.error(`❌ [WORKER] Job ${job.id} failed:`, error);

        // تحديث السجل بالفشل
        await getPrisma().imageStudioHistory.update({
            where: { id: historyId },
            data: {
                status: 'failed',
                metadata: JSON.stringify({
                    error: error.message,
                    failedAt: new Date().toISOString()
                })
            }
        });

        throw error; // ليعيد BullMQ المحاولة أو يسجل الخطأ
    }
}, {
    connection: redisConfig,
    concurrency: 2, // عدد المهام المتوازية (يمكن زيادته حسب قدرة الخادم)
    limiter: {
        max: 10,        // أقصى عدد للمهام
        duration: 60000 // في الدقيقة (للحد من تجاوز حد الـ API)
    }
});

worker.on('completed', (job) => {
    console.log(`🎉 [WORKER] Job ${job.id} finished successfully!`);
});

worker.on('failed', (job, err) => {
    console.error(`💀 [WORKER] Job ${job.id} failed after retries:`, err);
});

module.exports = worker;
