/**
 * تفعيل النماذج المتوفرة التي كانت معطلة
 * 
 * النماذج التي سيتم تفعيلها:
 * - gemini-2.5-flash-tts
 * - learnlm-2.0-flash-experimental
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const modelsToEnable = [
    'gemini-2.5-flash-tts',
    'learnlm-2.0-flash-experimental'
];

async function enableModels() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    try {
        console.log('\n🔧 تفعيل النماذج المتوفرة...\n');
        
        // جلب جميع المفاتيح
        const keys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                isActive: true
            }
        });
        
        console.log(`📋 تم العثور على ${keys.length} مفتاح نشط\n`);
        
        let totalUpdated = 0;
        
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
                        totalUpdated++;
                    } else {
                        console.log(`   ℹ️  ${modelName} مفعل بالفعل`);
                    }
                } else {
                    console.log(`   ⚠️  ${modelName} غير موجود في هذا المفتاح`);
                }
            }
            console.log('');
        }
        
        console.log(`\n✅ تم تفعيل ${totalUpdated} نموذج بنجاح!\n`);
        
        // عرض ملخص
        console.log('📊 ملخص النماذج المفعلة:');
        for (const modelName of modelsToEnable) {
            const count = await getSharedPrismaClient().geminiKeyModel.count({
                where: {
                    model: modelName,
                    isEnabled: true
                }
            });
            console.log(`   - ${modelName}: ${count} مفتاح`);
        }
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

enableModels();


