const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');

/**
 * طابور توليد الصور
 * 
 * هذا الطابور مسؤول عن استلام طلبات التوليد ومعالجتها
 * بشكل غير متزامن لتخفيف الضغط على السيرفر.
 */

// إنشاء الطابور
const imageGenerationQueue = new Queue('image-generation', {
    connection: redisConfig
});

// التعامل مع أخطاء الطابور
imageGenerationQueue.on('error', (err) => {
    console.error('❌ [QUEUE-ERROR] Image Generation Queue Error:', err);
});

module.exports = imageGenerationQueue;
