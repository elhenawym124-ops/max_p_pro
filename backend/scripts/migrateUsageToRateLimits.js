/**
 * Migration Script: تحديث هيكل usage لدعم RPM, RPH, RPD
 * يحدث جميع سجلات GeminiKeyModel لإضافة حقول Rate Limits الجديدة
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Rate Limits الحقيقية من Google AI Studio لكل نموذج
const modelRateLimits = {
    'gemini-3-pro': { rpm: 2, tpm: 125000, rpd: 50 },
    'gemini-2.5-pro': { rpm: 2, tpm: 125000, rpd: 50 },
    'gemini-2.5-flash': { rpm: 10, tpm: 250000, rpd: 250 },
    'gemini-2.5-flash-lite': { rpm: 15, tpm: 250000, rpd: 1000 },
    'gemini-2.5-flash-tts': { rpm: 3, tpm: 10000, rpd: 15 },
    'gemini-2.0-flash': { rpm: 15, tpm: 1000000, rpd: 200 },
    'gemini-2.0-flash-lite': { rpm: 30, tpm: 1000000, rpd: 200 },
    'gemini-2.5-flash-live': { rpm: 15, tpm: 250000, rpd: 1000 },
    'gemini-2.0-flash-live': { rpm: 15, tpm: 1000000, rpd: 200 },
    'gemini-2.5-flash-native-audio-dialog': { rpm: 15, tpm: 250000, rpd: 1000 },
    'gemini-1.5-pro': { rpm: 2, tpm: 32000, rpd: 50 },
    'gemini-1.5-flash': { rpm: 15, tpm: 1000000, rpd: 1500 },
    'gemini-robotics-er-1.5-preview': { rpm: 15, tpm: 250000, rpd: 250 },
    'learnlm-2.0-flash-experimental': { rpm: 15, tpm: 1500000, rpd: 1500 },
    'gemma-3-12b': { rpm: 15, tpm: 14400, rpd: 1440 },
    'gemma-3-27b': { rpm: 15, tpm: 14400, rpd: 1440 },
    'gemma-3-4b': { rpm: 15, tpm: 14400, rpd: 1440 },
    'gemma-3-2b': { rpm: 15, tpm: 14400, rpd: 1440 }
};

async function migrateUsageToRateLimits() {
    try {
        console.log('\n🔄 ========== Migration: تحديث usage لدعم RPM, RPH, RPD ==========\n');

        // جلب جميع سجلات GeminiKeyModel
        console.log('🔍 جلب جميع سجلات النماذج...');
        const allModels = await getSharedPrismaClient().geminiKeyModel.findMany();
        console.log(`📊 تم العثور على ${allModels.length} نموذج`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const model of allModels) {
            try {
                let usage;
                try {
                    usage = JSON.parse(model.usage || '{}');
                } catch (e) {
                    console.warn(`⚠️  خطأ في تحليل JSON للنموذج ${model.id}:`, e.message);
                    usage = { used: 0, limit: 1000000 };
                }

                // الحصول على Rate Limits للنموذج (أو استخدام قيم افتراضية)
                const rateLimits = modelRateLimits[model.model] || { rpm: 15, tpm: 250000, rpd: 1000 };

                // تحديث هيكل usage لدعم RPM, RPH, RPD
                const updatedUsage = {
                    used: usage.used || 0,
                    limit: usage.limit || rateLimits.tpm || 1000000,
                    resetDate: usage.resetDate || null,
                    // RPM: Requests Per Minute
                    rpm: {
                        used: usage.rpm?.used || 0,
                        limit: rateLimits.rpm || 15,
                        windowStart: usage.rpm?.windowStart || null
                    },
                    // RPH: Requests Per Hour
                    rph: {
                        used: usage.rph?.used || 0,
                        limit: (rateLimits.rpm || 15) * 60, // RPM * 60
                        windowStart: usage.rph?.windowStart || null
                    },
                    // RPD: Requests Per Day
                    rpd: {
                        used: usage.rpd?.used || 0,
                        limit: rateLimits.rpd || 1000,
                        windowStart: usage.rpd?.windowStart || null
                    }
                };

                // تحديث السجل في قاعدة البيانات
                await getSharedPrismaClient().geminiKeyModel.update({
                    where: { id: model.id },
                    data: {
                        usage: JSON.stringify(updatedUsage)
                    }
                });

                updatedCount++;
                if (updatedCount % 10 === 0) {
                    console.log(`✅ تم تحديث ${updatedCount} نموذج...`);
                }
            } catch (error) {
                console.error(`❌ خطأ في تحديث النموذج ${model.id} (${model.model}):`, error.message);
                skippedCount++;
            }
        }

        console.log('\n✅ ========== Migration Completed ==========');
        console.log(`📊 إجمالي النماذج: ${allModels.length}`);
        console.log(`✅ تم التحديث: ${updatedCount}`);
        console.log(`⚠️  تم التخطي: ${skippedCount}`);

    } catch (error) {
        console.error('\n❌ خطأ عام في Migration:', error);
        throw error;
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

// تنفيذ Migration
if (require.main === module) {
    migrateUsageToRateLimits()
        .then(() => {
            console.log('\n🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateUsageToRateLimits };


