/**
 * إضافة النماذج المفقودة إلى المفاتيح
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

// النماذج المفقودة التي يجب إضافتها
const missingModels = [
    {
        model: 'gemini-3-pro-preview',
        rpm: 2,
        tpm: 125000,
        rpd: 50,
        priority: 89,
        isEnabled: true
    },
    {
        model: 'gemini-2.0-flash-exp',
        rpm: 10,
        tpm: 250000,
        rpd: 50,
        priority: 91,
        isEnabled: true
    },
    {
        model: 'gemma-3-1b',
        rpm: 30,
        tpm: 15000,
        rpd: 14400,
        priority: 97,
        isEnabled: true
    }
];

function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function addMissingModels() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    try {
        console.log('\n🔧 إضافة النماذج المفقودة إلى المفاتيح...\n');
        
        // جلب جميع المفاتيح النشطة
        const keys = await getSharedPrismaClient().geminiKey.findMany({
            where: {
                isActive: true
            }
        });
        
        console.log(`📋 تم العثور على ${keys.length} مفتاح نشط\n`);
        
        let totalAdded = 0;
        let totalSkipped = 0;
        
        for (const key of keys) {
            console.log(`🔑 المفتاح: ${key.name} (ID: ${key.id})`);
            
            for (const modelInfo of missingModels) {
                // التحقق إذا كان النموذج موجود بالفعل
                const existing = await getSharedPrismaClient().geminiKeyModel.findFirst({
                    where: {
                        keyId: key.id,
                        model: modelInfo.model
                    }
                });
                
                if (existing) {
                    console.log(`   ℹ️  ${modelInfo.model} موجود بالفعل`);
                    totalSkipped++;
                    continue;
                }
                
                // إنشاء النموذج
                try {
                    const defaultUsage = {
                        used: 0,
                        limit: modelInfo.tpm || 250000,
                        resetDate: null,
                        rpm: {
                            used: 0,
                            limit: modelInfo.rpm || 10,
                            windowStart: null
                        },
                        rph: {
                            used: 0,
                            limit: (modelInfo.rpm || 10) * 60, // RPH = RPM * 60
                            windowStart: null
                        },
                        rpd: {
                            used: 0,
                            limit: modelInfo.rpd || 250,
                            windowStart: null
                        }
                    };
                    
                    await getSharedPrismaClient().geminiKeyModel.create({
                        data: {
                            id: generateId(),
                            keyId: key.id,
                            model: modelInfo.model,
                            usage: JSON.stringify(defaultUsage),
                            isEnabled: modelInfo.isEnabled,
                            priority: modelInfo.priority
                        }
                    });
                    
                    console.log(`   ✅ تم إضافة: ${modelInfo.model}`);
                    totalAdded++;
                } catch (error) {
                    console.log(`   ❌ فشل إضافة ${modelInfo.model}: ${error.message}`);
                }
            }
            console.log('');
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('\n📊 ملخص:\n');
        console.log(`   ✅ تم إضافة: ${totalAdded} نموذج`);
        console.log(`   ℹ️  موجودة مسبقاً: ${totalSkipped} نموذج`);
        
        // عرض ملخص لكل نموذج
        console.log('\n📋 ملخص لكل نموذج:\n');
        for (const modelInfo of missingModels) {
            const count = await getSharedPrismaClient().geminiKeyModel.count({
                where: {
                    model: modelInfo.model
                }
            });
            console.log(`   ${modelInfo.model.padEnd(35)}: ${count} مفتاح`);
        }
        
        console.log('\n✅ اكتملت الإضافة!\n');
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

addMissingModels();


