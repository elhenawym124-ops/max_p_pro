/**
 * إصلاح سريع لجميع النماذج المقطوعة
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

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

async function quickFix() {
    try {
        console.log('\n🔧 إصلاح النماذج المقطوعة...\n');

        // تغيير نوع الحقل أولاً
        try {
            await getSharedPrismaClient().$executeRawUnsafe(`ALTER TABLE gemini_key_models MODIFY COLUMN \`usage\` TEXT NOT NULL`);
            console.log('✅ تم تغيير نوع الحقل\n');
        } catch (e) {
            console.log('⚠️ تحذير: ' + e.message.split('\n')[0] + '\n');
        }

        // إصلاح النماذج
        const models = await getSharedPrismaClient().geminiKeyModel.findMany();
        let fixed = 0;
        
        for (const m of models) {
            if (!m.usage || m.usage.length <= 191 || !m.usage.trim().endsWith('}')) {
                const d = getModelDefaults(m.model);
                const usage = JSON.stringify({
                    used: 0,
                    limit: d.limit,
                    rpm: { used: 0, limit: d.rpm, windowStart: null },
                    rph: { used: 0, limit: d.rph, windowStart: null },
                    rpd: { used: 0, limit: d.rpd, windowStart: null },
                    resetDate: null
                });
                
                await getSharedPrismaClient().geminiKeyModel.update({
                    where: { id: m.id },
                    data: { usage }
                });
                fixed++;
            }
        }
        
        console.log(`✅ تم إصلاح ${fixed} نموذج\n`);
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

quickFix();



