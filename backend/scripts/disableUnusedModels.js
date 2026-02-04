/**
 * تعطيل النماذج غير المستخدمة في قاعدة البيانات
 * فقط النماذج المستخدمة فعلياً (7 نماذج) تبقى مفعلة
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

// ✅ النماذج المستخدمة فعلياً (مفعلة)
const enabledModels = [
    'gemini-2.5-pro',
    'gemini-robotics-er-1.5-preview',
    'learnlm-2.0-flash-experimental',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite'
];

async function disableUnusedModels() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    try {
        console.log('\n🔧 تعطيل النماذج غير المستخدمة...\n');
        console.log(`✅ النماذج المفعلة (${enabledModels.length}):`);
        enabledModels.forEach(m => console.log(`   - ${m}`));
        console.log('');
        
        // جلب جميع المفاتيح النشطة
        const keys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                isActive: true
            }
        });
        
        console.log(`📋 تم العثور على ${keys.length} مفتاح نشط\n`);
        
        let totalDisabled = 0;
        let totalKeptEnabled = 0;
        
        for (const key of keys) {
            console.log(`🔑 المفتاح: ${key.name} (ID: ${key.id})`);
            
            // جلب جميع النماذج لهذا المفتاح
            const allModels = await getSharedPrismaClient().geminiKeyModel.findMany({
                where: {
                    keyId: key.id
                }
            });
            
            for (const model of allModels) {
                if (enabledModels.includes(model.model)) {
                    // النموذج مفعل - تأكد أنه مفعل
                    if (!model.isEnabled) {
                        await getSharedPrismaClient().geminiKeyModel.update({
                            where: { id: model.id },
                            data: { isEnabled: true }
                        });
                        console.log(`   ✅ تم تفعيل: ${model.model}`);
                        totalKeptEnabled++;
                    } else {
                        console.log(`   ℹ️  ${model.model} مفعل بالفعل`);
                    }
                } else {
                    // النموذج غير مستخدم - تعطيله
                    if (model.isEnabled) {
                        await getSharedPrismaClient().geminiKeyModel.update({
                            where: { id: model.id },
                            data: { isEnabled: false }
                        });
                        console.log(`   ❌ تم تعطيل: ${model.model}`);
                        totalDisabled++;
                    } else {
                        console.log(`   ℹ️  ${model.model} معطل بالفعل`);
                    }
                }
            }
            console.log('');
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('\n📊 ملخص:\n');
        console.log(`   ✅ تم الحفاظ على: ${totalKeptEnabled} نموذج مفعل`);
        console.log(`   ❌ تم تعطيل: ${totalDisabled} نموذج`);
        
        // عرض ملخص لكل نموذج
        console.log('\n📋 ملخص لكل نموذج:\n');
        for (const modelName of enabledModels) {
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
            console.log(`   ${modelName.padEnd(40)}: ${count}/${total} مفعل`);
        }
        
        console.log('\n✅ اكتمل التحديث!\n');
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

disableUnusedModels();


