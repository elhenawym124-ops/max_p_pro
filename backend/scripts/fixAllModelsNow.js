/**
 * إصلاح جميع النماذج المقطوعة دفعة واحدة
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getModelDefaults = (modelName) => {
    const map = {
        'gemini-3-pro': { limit: 50000, rpm: 2, rph: 120, rpd: 50 },
        'gemini-2.5-pro': { limit: 50000, rpm: 2, rph: 120, rpd: 50 },
        'gemini-1.5-pro': { limit: 50, rpm: 2, rph: 120, rpd: 50 },
        'gemini-2.5-flash': { limit: 250000, rpm: 10, rph: 600, rpd: 250 },
        'gemini-2.5-flash-lite': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        'gemini-1.5-flash': { limit: 1500, rpm: 15, rph: 900, rpd: 1500 },
        'gemini-2.0-flash': { limit: 200000, rpm: 15, rph: 900, rpd: 200 },
        'gemini-2.0-flash-lite': { limit: 200000, rpm: 30, rph: 1800, rpd: 200 },
        'gemini-2.5-flash-live': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        'gemini-2.0-flash-live': { limit: 1000000, rpm: 15, rph: 900, rpd: 200 },
        'gemini-2.5-flash-native-audio-dialog': { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 },
        'gemini-2.5-flash-tts': { limit: 15, rpm: 3, rph: 180, rpd: 15 },
        'gemini-robotics-er-1.5-preview': { limit: 250000, rpm: 15, rph: 900, rpd: 250 },
        'learnlm-2.0-flash-experimental': { limit: 1500000, rpm: 30, rph: 1800, rpd: 1500 },
        'gemma-3-27b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 },
        'gemma-3-12b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 },
        'gemma-3-4b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 },
        'gemma-3-2b': { limit: 14400, rpm: 10, rph: 600, rpd: 14400 }
    };
    return map[modelName] || { limit: 1000000, rpm: 15, rph: 900, rpd: 1000 };
};

async function fixAll() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    try {
        console.log('\n🔧 إصلاح جميع النماذج...\n');
        
        // 1. تغيير نوع الحقل
        try {
            await getSharedPrismaClient().$executeRawUnsafe(`ALTER TABLE \`gemini_key_models\` MODIFY COLUMN \`usage\` TEXT NOT NULL`);
            console.log('✅ تم تغيير نوع الحقل\n');
        } catch (e) {
            console.log('⚠️ ' + e.message.split('\n')[0] + '\n');
        }
        
        // 2. إصلاح النماذج
        const models = await getSharedPrismaClient().geminiKeyModel.findMany({
            select: {
                id: true,
                model: true,
                usage: true
            }
        });
        
        console.log(`📋 تم العثور على ${models.length} نموذج\n`);
        
        let fixed = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const m of models) {
            try {
                // التحقق من حالة JSON
                let needsFix = false;
                let parsedUsage = null;
                
                if (!m.usage || m.usage.length === 0) {
                    needsFix = true;
                } else {
                    // محاولة تحليل JSON
                    try {
                        parsedUsage = JSON.parse(m.usage);
                        
                        // التحقق من وجود الحقول المطلوبة
                        if (!parsedUsage.rpm || !parsedUsage.rph || !parsedUsage.rpd) {
                            needsFix = true;
                        }
                        
                        // التحقق من الطول (إذا كان <= 191، قد يكون مقطوع)
                        if (m.usage.length <= 191) {
                            needsFix = true;
                        }
                        
                        // التحقق من أن JSON مكتمل
                        if (!m.usage.trim().endsWith('}')) {
                            needsFix = true;
                        }
                    } catch (parseError) {
                        // JSON غير صحيح - يحتاج إصلاح
                        needsFix = true;
                        console.log(`   ⚠️ خطأ في تحليل JSON للنموذج ${m.model}: ${parseError.message.substring(0, 50)}`);
                    }
                }
                
                if (needsFix) {
                    const d = getModelDefaults(m.model);
                    const usage = JSON.stringify({
                        used: parsedUsage?.used || 0,
                        limit: parsedUsage?.limit || d.limit,
                        rpm: parsedUsage?.rpm || { used: 0, limit: d.rpm, windowStart: null },
                        rph: parsedUsage?.rph || { used: 0, limit: d.rph, windowStart: null },
                        rpd: parsedUsage?.rpd || { used: 0, limit: d.rpd, windowStart: null },
                        resetDate: parsedUsage?.resetDate || null
                    });
                    
                    await getSharedPrismaClient().geminiKeyModel.update({
                        where: { id: m.id },
                        data: { usage }
                    });
                    
                    console.log(`   ✅ تم إصلاح: ${m.model}`);
                    fixed++;
                } else {
                    skipped++;
                }
            } catch (error) {
                console.error(`   ❌ خطأ في إصلاح النموذج ${m.model}: ${error.message}`);
                errors++;
            }
        }
        
        console.log(`\n✅ ========== النتائج ==========`);
        console.log(`   تم إصلاح: ${fixed} نموذج`);
        console.log(`   تم تخطي: ${skipped} نموذج (صحيح)`);
        console.log(`   أخطاء: ${errors} نموذج`);
        console.log(`   الإجمالي: ${models.length} نموذج\n`);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

fixAll();


