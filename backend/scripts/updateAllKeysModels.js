/**
 * سكريبت شامل لتحديث جميع مفاتيح Gemini (مركزية وخاصة بالشركات) إلى 18 نموذج
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

function generateId() {
    return 'c' + Math.random().toString(36).substr(2, 28);
}

// قائمة النماذج الجديدة (18 نموذج)
const availableModels = [
    { model: 'gemini-3-pro', limit: 50000, priority: 1 },
    { model: 'gemini-2.5-pro', limit: 50000, priority: 2 },
    { model: 'gemini-2.5-flash', limit: 250000, priority: 3 },
    { model: 'gemini-2.5-flash-lite', limit: 1000000, priority: 4 },
    { model: 'gemini-2.5-flash-tts', limit: 15, priority: 5 },
    { model: 'gemini-2.0-flash', limit: 200000, priority: 6 },
    { model: 'gemini-2.0-flash-lite', limit: 200000, priority: 7 },
    { model: 'gemini-2.5-flash-live', limit: 1000000, priority: 8 },
    { model: 'gemini-2.0-flash-live', limit: 1000000, priority: 9 },
    { model: 'gemini-2.5-flash-native-audio-dialog', limit: 1000000, priority: 10 },
    { model: 'gemini-1.5-pro', limit: 50, priority: 11 },
    { model: 'gemini-1.5-flash', limit: 1500, priority: 12 },
    { model: 'gemini-robotics-er-1.5-preview', limit: 250000, priority: 13 },
    { model: 'learnlm-2.0-flash-experimental', limit: 1500000, priority: 14 },
    { model: 'gemma-3-12b', limit: 14400, priority: 15 },
    { model: 'gemma-3-27b', limit: 14400, priority: 16 },
    { model: 'gemma-3-4b', limit: 14400, priority: 17 },
    { model: 'gemma-3-2b', limit: 14400, priority: 18 }
];

async function updateAllKeysModels() {
    try {
        console.log('\n🔄 ========== تحديث جميع مفاتيح Gemini إلى 18 نموذج ==========\n');

        // جلب جميع المفاتيح (مركزية وخاصة بالشركات)
        console.log('🔍 جلب جميع مفاتيح Gemini...');
        const allKeys = await getSharedPrismaClient().geminiKey.findMany({
            include: {
                models: {
                    orderBy: {
                        priority: 'asc'
                    }
                },
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { keyType: 'asc' },
                { priority: 'asc' }
            ]
        });

        console.log(`✅ تم العثور على ${allKeys.length} مفتاح:\n`);

        // تصنيف المفاتيح
        const centralKeys = allKeys.filter(k => k.keyType === 'CENTRAL');
        const companyKeys = allKeys.filter(k => k.keyType === 'COMPANY');

        console.log(`   - مفاتيح مركزية: ${centralKeys.length}`);
        console.log(`   - مفاتيح خاصة بالشركات: ${companyKeys.length}\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        // تحديث كل مفتاح
        for (const key of allKeys) {
            try {
                const currentModelsCount = key.models.length;
                const keyTypeLabel = key.keyType === 'CENTRAL' ? 'مركزي' : `شركة: ${key.company?.name || 'غير محدد'}`;
                
                // تخطي المفاتيح التي لديها بالفعل 18 نموذج
                if (currentModelsCount === 18) {
                    console.log(`⏭️  تخطي: ${key.name} (${keyTypeLabel}) - لديه بالفعل 18 نموذج`);
                    skippedCount++;
                    continue;
                }

                console.log(`🔄 تحديث: ${key.name} (${keyTypeLabel}) - ${currentModelsCount} نموذج → 18 نموذج`);

                // حذف النماذج القديمة
                await getSharedPrismaClient().geminiKeyModel.deleteMany({
                    where: {
                        keyId: key.id
                    }
                });

                // إضافة النماذج الجديدة (18 نموذج) - بسرعة أكبر باستخدام Promise.all
                const modelPromises = availableModels.map(modelInfo => 
                    getSharedPrismaClient().geminiKeyModel.create({
                        data: {
                            id: generateId(),
                            keyId: key.id,
                            model: modelInfo.model,
                            usage: JSON.stringify({
                                used: 0,
                                limit: modelInfo.limit,
                                resetDate: null
                            }),
                            isEnabled: true,
                            priority: modelInfo.priority
                        }
                    }).catch(error => {
                        // تجاهل الأخطاء في إنشاء النماذج المكررة
                        if (!error.message.includes('Unique constraint')) {
                            console.error(`   ⚠️ خطأ في إنشاء النموذج ${modelInfo.model}:`, error.message);
                        }
                        return null;
                    })
                );

                const results = await Promise.all(modelPromises);
                const createdModels = results.filter(r => r !== null).length;

                if (createdModels === 18) {
                    console.log(`   ✅ تم التحديث بنجاح: ${key.name} (${createdModels} نموذج)\n`);
                    updatedCount++;
                } else {
                    console.log(`   ⚠️ تم إنشاء ${createdModels} نموذج فقط (متوقع 18)\n`);
                }
            } catch (error) {
                console.error(`   ❌ خطأ في تحديث المفتاح ${key.name}:`, error.message);
            }
        }

        console.log('\n📊 ملخص العملية:');
        console.log(`   ✅ تم تحديث: ${updatedCount} مفتاح`);
        console.log(`   ⏭️  تم التخطي: ${skippedCount} مفتاح (لديهم 18 نموذج بالفعل)`);
        console.log(`   ❌ فشل: ${allKeys.length - updatedCount - skippedCount} مفتاح\n`);

        // التحقق النهائي
        console.log('🔍 التحقق النهائي...\n');
        
        const finalCheck = await getSharedPrismaClient().geminiKey.findMany({
            include: {
                models: true,
                company: {
                    select: {
                        name: true
                    }
                }
            }
        });

        const keysWith18Models = finalCheck.filter(k => k.models.length === 18);
        const keysWithout18Models = finalCheck.filter(k => k.models.length !== 18);

        console.log(`✅ المفاتيح التي لديها 18 نموذج: ${keysWith18Models.length}`);
        keysWith18Models.forEach((key, i) => {
            const keyTypeLabel = key.keyType === 'CENTRAL' ? 'مركزي' : key.company?.name || 'غير محدد';
            console.log(`   ${i + 1}. ${key.name} (${keyTypeLabel}) - ${key.models.length} نموذج ✅`);
        });

        if (keysWithout18Models.length > 0) {
            console.log(`\n⚠️ المفاتيح التي لا تزال تحتاج تحديث: ${keysWithout18Models.length}`);
            keysWithout18Models.forEach((key, i) => {
                const keyTypeLabel = key.keyType === 'CENTRAL' ? 'مركزي' : key.company?.name || 'غير محدد';
                console.log(`   ${i + 1}. ${key.name} (${keyTypeLabel}) - ${key.models.length} نموذج`);
            });
        }

        console.log('\n✅ ========== اكتملت العملية! ==========\n');

    } catch (error) {
        console.error('❌ خطأ في العملية:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

if (require.main === module) {
    updateAllKeysModels()
        .then(() => {
            console.log('✅ تم إكمال العملية');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ فشلت العملية:', error);
            process.exit(1);
        });
}

module.exports = { updateAllKeysModels };


