/**
 * إصلاح حقل usage المقطوع في GeminiKeyModel
 * المشكلة: حقل usage مقطوع عند 191 حرف (VARCHAR(191)) بينما يجب أن يكون TEXT
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function fixUsageFieldTruncation() {
    try {
        console.log('\n🔧 ========== إصلاح حقل usage المقطوع ==========\n');

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
        const defaultUsage = {
            used: 0,
            limit: 1000000,
            rpm: { used: 0, limit: 0, windowStart: null },
            rph: { used: 0, limit: 0, windowStart: null },
            rpd: { used: 0, limit: 0, windowStart: null },
            resetDate: null
        };

        for (const modelRecord of allModels) {
            try {
                // محاولة تحليل JSON
                const usage = JSON.parse(modelRecord.usage || '{}');
                
                // التحقق من أن JSON صحيح (ليس مقطوعاً)
                const usageString = JSON.stringify(usage);
                if (usageString.length < (modelRecord.usage || '').length) {
                    // JSON صحيح - لا حاجة للإصلاح
                    continue;
                }
            } catch (e) {
                // JSON مقطوع أو غير صحيح - إصلاحه
                console.log(`🔧 إصلاح النموذج: ${modelRecord.model} (ID: ${modelRecord.id})`);
                console.log(`   الخطأ: ${e.message}`);
                console.log(`   طول الحقل الحالي: ${(modelRecord.usage || '').length}`);
                
                try {
                    await getSharedPrismaClient().geminiKeyModel.update({
                        where: { id: modelRecord.id },
                        data: {
                            usage: JSON.stringify(defaultUsage)
                        }
                    });
                    
                    console.log(`   ✅ تم إصلاح النموذج`);
                    fixedCount++;
                } catch (updateError) {
                    console.error(`   ❌ فشل الإصلاح: ${updateError.message}`);
                    errorCount++;
                }
                console.log('');
            }
        }

        console.log(`\n✅ ========== انتهى الإصلاح ==========`);
        console.log(`   تم إصلاح: ${fixedCount} نموذج`);
        console.log(`   فشل: ${errorCount} نموذج`);
        console.log(`   إجمالي: ${allModels.length} نموذج\n`);

    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

fixUsageFieldTruncation();


