/**
 * إصلاح جميع النماذج المقطوعة باستخدام القيم الافتراضية الصحيحة
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// القيم الافتراضية الصحيحة لكل نموذج
const getModelDefaults = (modelName) => {
    const defaults = {
        // نماذج Pro
        'gemini-3-pro': { limit: 50000, rpm: 2, rph: 120, rpd: 50 },
        'gemini-2.5-pro': { limit: 50000, rpm: 2, rph: 120, rpd: 50 },
        'gemini-1.5-pro': { limit: 50, rpm: 2, rph: 120, rpd: 50 },
        
        // نماذج Flash
        'gemini-2.5-flash': { limit: 250000, rpm: 10, rph: 600, rpd: 250 },
        'gemini-2.5-flash-lite': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        'gemini-1.5-flash': { limit: 1500, rpm: 15, rph: 900, rpd: 1500 },
        'gemini-2.0-flash': { limit: 200000, rpm: 15, rph: 900, rpd: 200 },
        'gemini-2.0-flash-lite': { limit: 200000, rpm: 30, rph: 1800, rpd: 200 },
        
        // نماذج Live API
        'gemini-2.5-flash-live': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        'gemini-2.0-flash-live': { limit: 1000000, rpm: 15, rph: 900, rpd: 200 },
        'gemini-2.5-flash-native-audio-dialog': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        
        // نماذج الصوت
        'gemini-2.5-flash-tts': { limit: 15, rpm: 3, rph: 180, rpd: 15 },
        
        // نماذج متخصصة
        'gemini-robotics-er-1.5-preview': { limit: 250000, rpm: 15, rph: 900, rpd: 250 },
        'learnlm-2.0-flash-experimental': { limit: 1500000, rpm: 30, rph: 1800, rpd: 1500 },
        
        // نماذج Gemma
        'gemma-3-27b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 },
        'gemma-3-12b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 },
        'gemma-3-4b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 },
        'gemma-3-2b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 }
    };
    
    return defaults[modelName] || { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 };
};

async function fixAllTruncatedModels() {
    try {
        console.log('\n🔧 ========== إصلاح جميع النماذج المقطوعة ==========\n');

        // جلب جميع النماذج
        const allModels = await getSharedPrismaClient().geminiKeyModel.findMany({
            select: {
                id: true,
                model: true,
                usage: true,
                keyId: true
            }
        });

        console.log(`📋 تم العثور على ${allModels.length} نموذج\n`);

        let fixedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const modelRecord of allModels) {
            try {
                // محاولة تحليل JSON
                const usage = JSON.parse(modelRecord.usage || '{}');
                
                // التحقق من أن JSON صحيح (ليس مقطوعاً)
                // إذا كان طول الحقل = 191، فهو على الأرجح مقطوع
                if ((modelRecord.usage || '').length === 191) {
                    console.log(`🔧 إصلاح النموذج المقطوع: ${modelRecord.model} (ID: ${modelRecord.id})`);
                    
                    // الحصول على القيم الافتراضية الصحيحة
                    const modelDefaults = getModelDefaults(modelRecord.model);
                    const fixedUsage = {
                        used: 0,
                        limit: modelDefaults.limit,
                        rpm: { used: 0, limit: modelDefaults.rpm, windowStart: null },
                        rph: { used: 0, limit: modelDefaults.rph, windowStart: null },
                        rpd: { used: 0, limit: modelDefaults.rpd, windowStart: null },
                        resetDate: null
                    };
                    
                    await getSharedPrismaClient().geminiKeyModel.update({
                        where: { id: modelRecord.id },
                        data: {
                            usage: JSON.stringify(fixedUsage)
                        }
                    });
                    
                    console.log(`   ✅ تم إصلاح النموذج بقيم صحيحة`);
                    fixedCount++;
                } else {
                    skippedCount++;
                }
            } catch (e) {
                // JSON مقطوع أو غير صحيح - إصلاحه
                console.log(`🔧 إصلاح النموذج (خطأ JSON): ${modelRecord.model} (ID: ${modelRecord.id})`);
                console.log(`   الخطأ: ${e.message}`);
                
                try {
                    const modelDefaults = getModelDefaults(modelRecord.model);
                    const fixedUsage = {
                        used: 0,
                        limit: modelDefaults.limit,
                        rpm: { used: 0, limit: modelDefaults.rpm, windowStart: null },
                        rph: { used: 0, limit: modelDefaults.rph, windowStart: null },
                        rpd: { used: 0, limit: modelDefaults.rpd, windowStart: null },
                        resetDate: null
                    };
                    
                    await getSharedPrismaClient().geminiKeyModel.update({
                        where: { id: modelRecord.id },
                        data: {
                            usage: JSON.stringify(fixedUsage)
                        }
                    });
                    
                    console.log(`   ✅ تم إصلاح النموذج`);
                    fixedCount++;
                } catch (updateError) {
                    console.error(`   ❌ فشل الإصلاح: ${updateError.message}`);
                    errorCount++;
                }
            }
        }

        console.log(`\n✅ ========== انتهى الإصلاح ==========`);
        console.log(`   تم إصلاح: ${fixedCount} نموذج`);
        console.log(`   تم تخطي: ${skippedCount} نموذج (صحيح)`);
        console.log(`   فشل: ${errorCount} نموذج`);
        console.log(`   إجمالي: ${allModels.length} نموذج\n`);

    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

fixAllTruncatedModels();


