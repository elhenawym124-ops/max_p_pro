/**
 * تفعيل النماذج غير المستخدمة في قاعدة البيانات
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

// النماذج التي سيتم تفعيلها
const modelsToEnable = [
    'gemini-3-pro-preview',
    'gemini-2.0-flash-exp',
    'gemma-3-27b',
    'gemma-3-12b',
    'gemma-3-4b',
    'gemma-3-2b',
    'gemma-3-1b'
];

async function enableUnusedModels() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    try {
        console.log('\n🔧 تفعيل النماذج غير المستخدمة...\n');
        
        // جلب جميع المفاتيح النشطة
        const keys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                isActive: true
            }
        });
        
        console.log(`📋 تم العثور على ${keys.length} مفتاح نشط\n`);
        
        let totalEnabled = 0;
        let totalAlreadyEnabled = 0;
        let totalNotFound = 0;
        
        for (const key of keys) {
            console.log(`🔑 المفتاح: ${key.name} (ID: ${key.id})`);
            
            for (const modelName of modelsToEnable) {
                const model = await getSharedPrismaClient().geminiKeyModel.findFirst({
                    where: {
                        keyId: key.id,
                        model: modelName
                    }
                });
                
                if (model) {
                    if (!model.isEnabled) {
                        await getSharedPrismaClient().geminiKeyModel.update({
                            where: { id: model.id },
                            data: { isEnabled: true }
                        });
                        console.log(`   ✅ تم تفعيل: ${modelName}`);
                        totalEnabled++;
                    } else {
                        console.log(`   ℹ️  ${modelName} مفعل بالفعل`);
                        totalAlreadyEnabled++;
                    }
                } else {
                    console.log(`   ⚠️  ${modelName} غير موجود في هذا المفتاح`);
                    totalNotFound++;
                }
            }
            console.log('');
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('\n📊 ملخص:\n');
        console.log(`   ✅ تم تفعيل: ${totalEnabled} نموذج`);
        console.log(`   ℹ️  مفعلة مسبقاً: ${totalAlreadyEnabled} نموذج`);
        console.log(`   ⚠️  غير موجودة: ${totalNotFound} نموذج`);
        
        // عرض ملخص لكل نموذج
        console.log('\n📋 ملخص لكل نموذج:\n');
        for (const modelName of modelsToEnable) {
            const count = await getSharedPrismaClient().geminiKeyModel.count({
                where: {
                    model: modelName,
                    isEnabled: true
                }
            });
            const total = await getSharedPrismaClient().geminiKeyModel.count({
                where: {
                    model: modelName
                }
            });
            console.log(`   ${modelName.padEnd(35)}: ${count}/${total} مفعل`);
        }
        
        console.log('\n✅ اكتمل التفعيل!\n');
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

enableUnusedModels();


