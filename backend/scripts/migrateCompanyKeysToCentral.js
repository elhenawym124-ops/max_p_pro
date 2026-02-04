/**
 * سكريبت لنقل مفاتيح Gemini من شركة إلى مفاتيح مركزية
 * 
 * الخطوات:
 * 1. البحث عن شركة "شركة التسويق"
 * 2. جلب جميع مفاتيح Gemini الخاصة بالشركة
 * 3. حفظ بيانات المفاتيح (API keys و المعلومات)
 * 4. حذف المفاتيح القديمة (مع النماذج المرتبطة)
 * 5. إعادة إنشائها كمفاتيح مركزية (keyType: 'CENTRAL', companyId: null)
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Helper function to generate ID
function generateId() {
    return 'c' + Math.random().toString(36).substr(2, 28);
}

async function migrateCompanyKeysToCentral() {
    try {
        console.log('\n🔄 ========== بدء عملية نقل المفاتيح ==========\n');

        // 1. البحث عن شركة "شركة التسويق"
        console.log('🔍 الخطوة 1: البحث عن شركة "شركة التسويق"...');
        const company = await getSharedPrismaClient().company.findFirst({
            where: {
                name: {
                    contains: 'التسويق'
                },
                isActive: true
            }
        });

        if (!company) {
            console.error('❌ لم يتم العثور على شركة "شركة التسويق"');
            
            // عرض جميع الشركات
            const allCompanies = await getSharedPrismaClient().company.findMany({
                select: {
                    id: true,
                    name: true,
                    isActive: true
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            
            console.log('\n📋 الشركات الموجودة:');
            allCompanies.forEach((c, i) => {
                console.log(`${i + 1}. ${c.name} (${c.id}) - ${c.isActive ? '✅ نشط' : '❌ غير نشط'}`);
            });
            
            process.exit(1);
        }

        console.log(`✅ تم العثور على الشركة: ${company.name} (${company.id})\n`);

        // 2. جلب جميع مفاتيح Gemini الخاصة بالشركة
        console.log('🔍 الخطوة 2: جلب مفاتيح Gemini الخاصة بالشركة...');
        const companyKeys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                companyId: company.id,
                keyType: 'COMPANY'
            },
            include: {
                models: {
                    orderBy: {
                        priority: 'asc'
                    }
                }
            },
            orderBy: {
                priority: 'asc'
            }
        });

        if (companyKeys.length === 0) {
            console.log('⚠️ لا توجد مفاتيح Gemini لهذه الشركة');
            process.exit(0);
        }

        console.log(`✅ تم العثور على ${companyKeys.length} مفتاح:\n`);
        companyKeys.forEach((key, i) => {
            console.log(`${i + 1}. ${key.name}`);
            console.log(`   - ID: ${key.id}`);
            console.log(`   - API Key: ${key.apiKey.substring(0, 10)}...${key.apiKey.slice(-4)}`);
            console.log(`   - النماذج: ${key.models.length}`);
            console.log(`   - نشط: ${key.isActive ? '✅' : '❌'}`);
            console.log('');
        });

        // 3. حفظ بيانات المفاتيح
        console.log('💾 الخطوة 3: حفظ بيانات المفاتيح...');
        const keysData = companyKeys.map(key => ({
            name: key.name,
            apiKey: key.apiKey,
            isActive: key.isActive,
            priority: key.priority,
            description: key.description || null,
            usage: key.usage,
            currentUsage: key.currentUsage,
            maxRequestsPerDay: key.maxRequestsPerDay,
            models: key.models.map(model => ({
                model: model.model,
                usage: model.usage,
                isEnabled: model.isEnabled,
                priority: model.priority,
                limit: JSON.parse(model.usage || '{"limit": 1000000}').limit || 1000000
            }))
        }));

        console.log(`✅ تم حفظ بيانات ${keysData.length} مفتاح\n`);

        // 4. حذف المفاتيح القديمة
        console.log('🗑️ الخطوة 4: حذف المفاتيح القديمة...');
        let deletedCount = 0;
        
        for (const key of companyKeys) {
            try {
                // حذف النماذج المرتبطة أولاً (سيتم حذفها تلقائياً بسبب CASCADE)
                // ثم حذف المفتاح
                await getSharedPrismaClient().geminiKey.delete({
                    where: { id: key.id }
                });
                deletedCount++;
                console.log(`   ✅ تم حذف المفتاح: ${key.name}`);
            } catch (error) {
                console.error(`   ❌ خطأ في حذف المفتاح ${key.name}:`, error.message);
            }
        }

        console.log(`✅ تم حذف ${deletedCount} مفتاح\n`);

        // 5. إعادة إنشاء المفاتيح كمفاتيح مركزية
        console.log('🔄 الخطوة 5: إنشاء المفاتيح كمفاتيح مركزية...');
        let createdCount = 0;

        // قائمة النماذج الافتراضية (18 نموذج)
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

        for (const keyData of keysData) {
            try {
                const newKeyId = generateId();
                
                // إنشاء المفتاح المركزي
                await getSharedPrismaClient().geminiKey.create({
                    data: {
                        id: newKeyId,
                        name: keyData.name + ' (مركزي)',
                        apiKey: keyData.apiKey,
                        isActive: keyData.isActive,
                        priority: keyData.priority,
                        description: keyData.description || `مفتاح مركزي - ${keyData.name}`,
                        usage: keyData.usage,
                        currentUsage: keyData.currentUsage,
                        maxRequestsPerDay: keyData.maxRequestsPerDay,
                        companyId: null, // مفاتيح مركزية
                        keyType: 'CENTRAL'
                    }
                });

                // إنشاء النماذج للمفتاح الجديد
                // استخدام النماذج من المفتاح القديم إن وجدت، وإلا استخدام النماذج الافتراضية
                const modelsToCreate = keyData.models.length > 0 ? keyData.models : availableModels;

                for (const modelInfo of modelsToCreate) {
                    try {
                        await getSharedPrismaClient().geminiKeyModel.create({
                            data: {
                                id: generateId(),
                                keyId: newKeyId,
                                model: modelInfo.model,
                                usage: typeof modelInfo.usage === 'string' 
                                    ? modelInfo.usage 
                                    : JSON.stringify({
                                        used: 0,
                                        limit: modelInfo.limit || 1000000,
                                        resetDate: null
                                    }),
                                isEnabled: modelInfo.isEnabled !== undefined ? modelInfo.isEnabled : true,
                                priority: modelInfo.priority || 1
                            }
                        });
                    } catch (modelError) {
                        console.error(`   ⚠️ خطأ في إنشاء النموذج ${modelInfo.model}:`, modelError.message);
                    }
                }

                createdCount++;
                console.log(`   ✅ تم إنشاء المفتاح المركزي: ${keyData.name} (${keyData.models.length} نموذج)`);
            } catch (error) {
                console.error(`   ❌ خطأ في إنشاء المفتاح ${keyData.name}:`, error.message);
            }
        }

        console.log(`\n✅ تم إنشاء ${createdCount} مفتاح مركزي\n`);

        // 6. التحقق النهائي
        console.log('🔍 الخطوة 6: التحقق النهائي...');
        const centralKeys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                keyType: 'CENTRAL',
                companyId: null
            },
            include: {
                models: true
            }
        });

        console.log(`✅ يوجد الآن ${centralKeys.length} مفتاح مركزي في النظام\n`);

        console.log('✅ ========== اكتملت العملية بنجاح! ==========\n');

    } catch (error) {
        console.error('❌ خطأ في العملية:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

// تشغيل السكريبت
if (require.main === module) {
    migrateCompanyKeysToCentral()
        .then(() => {
            console.log('✅ تم إكمال العملية');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ فشلت العملية:', error);
            process.exit(1);
        });
}

module.exports = { migrateCompanyKeysToCentral };


