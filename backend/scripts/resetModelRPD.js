/**
 * إعادة تعيين RPD لنموذج محدد (للاستخدام في حالات الطوارئ)
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function resetModelRPD(modelName = null, keyId = null, resetAll = false) {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    try {
        console.log('\n🔄 إعادة تعيين RPD للنماذج...\n');
        
        // إذا لم يتم تحديد keyId، نأخذ أول مفتاح مركزي نشط
        if (!keyId && !resetAll) {
            const centralKey = await getSharedPrismaClient().geminiKey.findFirst({
                where: {
                    keyType: 'CENTRAL',
                    isActive: true
                },
                orderBy: {
                    priority: 'asc'
                }
            });
            
            if (!centralKey) {
                console.log('❌ لم يتم العثور على مفتاح مركزي نشط');
                return;
            }
            
            keyId = centralKey.id;
            console.log(`🔑 استخدام المفتاح المركزي: ${centralKey.name} (ID: ${keyId})\n`);
        }
        
        // بناء where clause
        let whereClause = {
            isEnabled: true
        };
        
        if (keyId) {
            whereClause.keyId = keyId;
        }
        
        if (modelName) {
            whereClause.model = modelName;
        }
        
        // جلب النماذج
        const models = await getSharedPrismaClient().geminiKeyModel.findMany({
            where: whereClause
        });
        
        if (models.length === 0) {
            console.log('❌ لم يتم العثور على نماذج');
            return;
        }
        
        console.log(`📋 تم العثور على ${models.length} نموذج\n`);
        
        let resetCount = 0;
        const now = new Date();
        
        for (const model of models) {
            try {
                const usage = JSON.parse(model.usage || '{}');
                
                // التحقق من حالة RPD
                if (usage.rpd && usage.rpd.windowStart) {
                    const rpdWindowStart = new Date(usage.rpd.windowStart);
                    const rpdUsed = usage.rpd.used || 0;
                    const rpdLimit = usage.rpd.limit || 1000;
                    
                    console.log(`📋 ${model.model}: RPD = ${rpdUsed}/${rpdLimit}`);
                    
                    // إعادة تعيين RPD
                    usage.rpd = {
                        used: 0,
                        limit: rpdLimit,
                        windowStart: null // سيتم ضبطه عند الاستخدام التالي
                    };
                    
                    // حفظ التغييرات
                    await getSharedPrismaClient().geminiKeyModel.update({
                        where: { id: model.id },
                        data: {
                            usage: JSON.stringify(usage),
                            updatedAt: now
                        }
                    });
                    
                    console.log(`   ✅ تم إعادة تعيين RPD`);
                    resetCount++;
                } else {
                    console.log(`   ⚠️ لا يوجد windowStart - لا حاجة لإعادة التعيين`);
                }
            } catch (e) {
                console.error(`   ❌ خطأ في النموذج ${model.model}: ${e.message}`);
            }
        }
        
        console.log(`\n✅ تم إعادة تعيين RPD لـ ${resetCount} نموذج\n`);
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

// السماح بتحديد المعاملات من سطر الأوامر
const args = process.argv.slice(2);
const modelName = args.find(arg => !arg.startsWith('--')) || null;
const resetAll = args.includes('--all');
const keyId = args.find(arg => arg.startsWith('--key='))?.replace('--key=', '') || null;

resetModelRPD(modelName, keyId, resetAll);


