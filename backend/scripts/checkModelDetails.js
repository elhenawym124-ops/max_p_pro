/**
 * فحص تفاصيل نموذج محدد
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkModelDetails(modelName = 'gemini-2.5-pro', keyId = null) {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    try {
        console.log(`\n🔍 فحص تفاصيل النموذج: ${modelName}\n`);
        
        // إذا لم يتم تحديد keyId، نأخذ أول مفتاح مركزي نشط
        if (!keyId) {
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
        
        // جلب النموذج
        const model = await getSharedPrismaClient().geminiKeyModel.findFirst({
            where: {
                keyId: keyId,
                model: modelName,
                isEnabled: true
            }
        });
        
        if (!model) {
            console.log(`❌ لم يتم العثور على النموذج ${modelName} في المفتاح ${keyId}`);
            return;
        }
        
        console.log(`📋 معلومات النموذج:`);
        console.log(`   ID: ${model.id}`);
        console.log(`   النموذج: ${model.model}`);
        console.log(`   الأولوية: ${model.priority}`);
        console.log(`   مفعّل: ${model.isEnabled}`);
        console.log(`   آخر استخدام: ${model.lastUsed || 'لم يُستخدم'}`);
        console.log(`\n📄 محتوى JSON (usage):`);
        console.log(model.usage);
        console.log('\n');
        
        try {
            const usage = JSON.parse(model.usage || '{}');
            console.log('📊 تحليل الاستخدام:');
            console.log(JSON.stringify(usage, null, 2));
            
            console.log('\n🔍 فحص الحدود:');
            
            // RPM
            if (usage.rpm) {
                const rpmUsed = usage.rpm.used || 0;
                const rpmLimit = usage.rpm.limit || 0;
                const rpmWindowStart = usage.rpm.windowStart ? new Date(usage.rpm.windowStart) : null;
                const now = new Date();
                
                console.log(`   RPM: ${rpmUsed}/${rpmLimit}`);
                if (rpmWindowStart) {
                    const timeDiff = now - rpmWindowStart;
                    const minutesPassed = Math.floor(timeDiff / (60 * 1000));
                    console.log(`      النافذة بدأت: ${rpmWindowStart.toISOString()}`);
                    console.log(`      الوقت المنقضي: ${minutesPassed} دقيقة`);
                    if (rpmLimit > 0 && timeDiff < 60 * 1000 && rpmUsed >= rpmLimit) {
                        console.log(`      ❌ مستنفد (نافذة نشطة)`);
                    } else {
                        console.log(`      ✅ متاح`);
                    }
                } else {
                    console.log(`      ✅ متاح (لا توجد نافذة نشطة)`);
                }
            }
            
            // RPH
            if (usage.rph) {
                const rphUsed = usage.rph.used || 0;
                const rphLimit = usage.rph.limit || 0;
                const rphWindowStart = usage.rph.windowStart ? new Date(usage.rph.windowStart) : null;
                const now = new Date();
                
                console.log(`   RPH: ${rphUsed}/${rphLimit}`);
                if (rphWindowStart) {
                    const timeDiff = now - rphWindowStart;
                    const hoursPassed = Math.floor(timeDiff / (60 * 60 * 1000));
                    console.log(`      النافذة بدأت: ${rphWindowStart.toISOString()}`);
                    console.log(`      الوقت المنقضي: ${hoursPassed} ساعة`);
                    if (rphLimit > 0 && timeDiff < 60 * 60 * 1000 && rphUsed >= rphLimit) {
                        console.log(`      ❌ مستنفد (نافذة نشطة)`);
                    } else {
                        console.log(`      ✅ متاح`);
                    }
                } else {
                    console.log(`      ✅ متاح (لا توجد نافذة نشطة)`);
                }
            }
            
            // RPD
            if (usage.rpd) {
                const rpdUsed = usage.rpd.used || 0;
                const rpdLimit = usage.rpd.limit || 0;
                const rpdWindowStart = usage.rpd.windowStart ? new Date(usage.rpd.windowStart) : null;
                const now = new Date();
                
                console.log(`   RPD: ${rpdUsed}/${rpdLimit}`);
                if (rpdWindowStart) {
                    const timeDiff = now - rpdWindowStart;
                    const daysPassed = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
                    const hoursPassed = Math.floor((timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                    console.log(`      النافذة بدأت: ${rpdWindowStart.toISOString()}`);
                    console.log(`      الوقت المنقضي: ${daysPassed} يوم و ${hoursPassed} ساعة`);
                    if (rpdLimit > 0 && timeDiff < 24 * 60 * 60 * 1000 && rpdUsed >= rpdLimit) {
                        console.log(`      ❌ مستنفد (نافذة نشطة) - هذا هو السبب!`);
                    } else {
                        console.log(`      ✅ متاح`);
                    }
                } else {
                    console.log(`      ✅ متاح (لا توجد نافذة نشطة)`);
                }
            }
            
            // الحد العام
            const currentUsage = usage.used || 0;
            const maxRequests = usage.limit || 1000000;
            console.log(`   الحد العام: ${currentUsage}/${maxRequests}`);
            if (currentUsage >= maxRequests) {
                console.log(`      ❌ مستنفد`);
            } else {
                console.log(`      ✅ متاح`);
            }
            
        } catch (e) {
            console.log(`❌ خطأ في تحليل JSON: ${e.message}`);
        }
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

// السماح بتحديد modelName و keyId من سطر الأوامر
const modelName = process.argv[2] || 'gemini-2.5-pro';
const keyId = process.argv[3] || null;
checkModelDetails(modelName, keyId);


