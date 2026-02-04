/**
 * سكريبت لتحديث نماذج المفاتيح المركزية إلى 18 نموذج
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

function generateId() {
    return 'c' + Math.random().toString(36).substr(2, 28);
}

async function updateCentralKeysModels() {
    try {
        console.log('\n🔄 ========== تحديث نماذج المفاتيح المركزية ==========\n');

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

        // جلب جميع المفاتيح المركزية
        console.log('🔍 جلب المفاتيح المركزية...');
        const centralKeys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                keyType: 'CENTRAL',
                companyId: null
            },
            include: {
                models: true
            }
        });

        console.log(`✅ تم العثور على ${centralKeys.length} مفتاح مركزي\n`);

        let updatedCount = 0;

        for (const key of centralKeys) {
            try {
                console.log(`🔄 تحديث المفتاح: ${key.name} (${key.models.length} نموذج حالياً)`);

                // حذف النماذج القديمة
                await getSharedPrismaClient().geminiKeyModel.deleteMany({
                    where: {
                        keyId: key.id
                    }
                });

                // إضافة النماذج الجديدة (18 نموذج)
                let createdModels = 0;
                for (const modelInfo of availableModels) {
                    try {
                        await getSharedPrismaClient().geminiKeyModel.create({
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
                        });
                        createdModels++;
                    } catch (modelError) {
                        console.error(`   ⚠️ خطأ في إنشاء النموذج ${modelInfo.model}:`, modelError.message);
                    }
                }

                console.log(`   ✅ تم تحديث المفتاح: ${key.name} (${createdModels} نموذج جديد)\n`);
                updatedCount++;
            } catch (error) {
                console.error(`   ❌ خطأ في تحديث المفتاح ${key.name}:`, error.message);
            }
        }

        console.log(`\n✅ تم تحديث ${updatedCount} مفتاح مركزي\n`);

        // التحقق النهائي
        console.log('🔍 التحقق النهائي...');
        const updatedKeys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                keyType: 'CENTRAL',
                companyId: null
            },
            include: {
                models: true
            }
        });

        console.log(`✅ عدد المفاتيح المركزية: ${updatedKeys.length}`);
        updatedKeys.forEach((key, i) => {
            console.log(`   ${i + 1}. ${key.name}: ${key.models.length} نموذج`);
        });

        console.log('\n✅ ========== اكتملت العملية بنجاح! ==========\n');

    } catch (error) {
        console.error('❌ خطأ في العملية:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

if (require.main === module) {
    updateCentralKeysModels()
        .then(() => {
            console.log('✅ تم إكمال العملية');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ فشلت العملية:', error);
            process.exit(1);
        });
}

module.exports = { updateCentralKeysModels };


