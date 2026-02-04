/**
 * التحقق من إصلاح النماذج
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function verifyFix() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    try {
        console.log('\n🔍 التحقق من حالة النماذج...\n');
        
        // فحص النماذج
        const models = await getSharedPrismaClient().geminiKeyModel.findMany({
            select: {
                id: true,
                model: true,
                usage: true
            },
            take: 20
        });
        
        console.log(`📊 عينة من ${models.length} نموذج:\n`);
        
        let validCount = 0;
        let invalidCount = 0;
        let truncatedCount = 0;
        
        for (const m of models) {
            try {
                const usageLength = (m.usage || '').length;
                
                // التحقق من الطول (إذا كان <= 191، قد يكون مقطوع)
                if (usageLength <= 191) {
                    truncatedCount++;
                    console.log(`⚠️ ${m.model}: طول قصير (${usageLength} حرف) - قد يكون مقطوع`);
                    continue;
                }
                
                const usage = JSON.parse(m.usage || '{}');
                const hasRpm = usage.rpm && typeof usage.rpm === 'object';
                const hasRph = usage.rph && typeof usage.rph === 'object';
                const hasRpd = usage.rpd && typeof usage.rpd === 'object';
                
                if (hasRpm && hasRph && hasRpd) {
                    validCount++;
                    console.log(`✅ ${m.model}: صحيح (${usageLength} حرف)`);
                } else {
                    invalidCount++;
                    console.log(`⚠️ ${m.model}: غير مكتمل - RPM: ${hasRpm}, RPH: ${hasRph}, RPD: ${hasRpd}`);
                }
            } catch (e) {
                invalidCount++;
                console.log(`❌ ${m.model}: خطأ في JSON (${(m.usage || '').length} حرف)`);
                console.log(`   الخطأ: ${e.message.substring(0, 100)}`);
            }
        }
        
        const totalModels = await getSharedPrismaClient().geminiKeyModel.count();
        
        console.log(`\n📊 الإحصائيات (عينة من ${models.length}):`);
        console.log(`   ✅ نماذج صحيحة: ${validCount}`);
        console.log(`   ⚠️ نماذج مقطوعة (≤191 حرف): ${truncatedCount}`);
        console.log(`   ❌ نماذج معطوبة: ${invalidCount}`);
        console.log(`   📋 إجمالي النماذج في النظام: ${totalModels}\n`);
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

verifyFix();



