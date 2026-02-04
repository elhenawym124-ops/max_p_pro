/**
 * فحص أولويات النماذج في مفتاح محدد
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkPriorities(keyId = null) {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    try {
        console.log('\n🔍 فحص أولويات النماذج...\n');
        
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
        
        // جلب جميع النماذج مرتبة حسب الأولوية
        const models = await getSharedPrismaClient().geminiKeyModel.findMany({
            where: {
                keyId: keyId,
                isEnabled: true
            },
            orderBy: {
                priority: 'asc'
            },
            select: {
                id: true,
                model: true,
                priority: true,
                isEnabled: true,
                usage: true,
                lastUsed: true
            }
        });
        
        console.log(`📊 العثور على ${models.length} نموذج نشط:\n`);
        console.log('='.repeat(80));
        console.log(`${'النموذج'.padEnd(40)} | ${'الأولوية'.padEnd(10)} | ${'الحالة'.padEnd(15)}`);
        console.log('='.repeat(80));
        
        const disabledModels = ['gemini-3-pro'];
        const supportedModels = [
            'gemini-3-pro', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
            'gemini-2.5-flash-tts', 'gemini-2.0-flash', 'gemini-2.0-flash-lite',
            'gemini-2.5-flash-live', 'gemini-2.0-flash-live', 'gemini-2.5-flash-native-audio-dialog',
            'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-robotics-er-1.5-preview',
            'learnlm-2.0-flash-experimental', 'gemma-3-12b', 'gemma-3-27b', 'gemma-3-4b', 'gemma-3-2b'
        ];
        
        for (const m of models) {
            let status = '✅ متاح';
            const reasons = [];
            
            // التحقق من المعطلة
            if (disabledModels.includes(m.model)) {
                status = '🚫 معطل';
                reasons.push('معطل في API');
            }
            // التحقق من المدعومة
            else if (!supportedModels.includes(m.model)) {
                status = '⚠️ غير مدعوم';
                reasons.push('غير موجود في قائمة المدعومة');
            }
            // التحقق من JSON والحدود
            else {
                try {
                    const usage = JSON.parse(m.usage || '{}');
                    
                    // فحص RPM
                    if (usage.rpm && usage.rpm.limit > 0 && usage.rpm.windowStart) {
                        const now = new Date();
                        const rpmWindowStart = new Date(usage.rpm.windowStart);
                        const rpmWindowMs = 60 * 1000;
                        if ((now - rpmWindowStart) < rpmWindowMs && (usage.rpm.used || 0) >= usage.rpm.limit) {
                            status = '⏱️ RPM مستنفد';
                            reasons.push(`RPM: ${usage.rpm.used}/${usage.rpm.limit}`);
                        }
                    }
                    
                    // فحص RPH
                    if (usage.rph && usage.rph.limit > 0 && usage.rph.windowStart) {
                        const now = new Date();
                        const rphWindowStart = new Date(usage.rph.windowStart);
                        const rphWindowMs = 60 * 60 * 1000;
                        if ((now - rphWindowStart) < rphWindowMs && (usage.rph.used || 0) >= usage.rph.limit) {
                            status = '⏱️ RPH مستنفد';
                            reasons.push(`RPH: ${usage.rph.used}/${usage.rph.limit}`);
                        }
                    }
                    
                    // فحص RPD
                    if (usage.rpd && usage.rpd.limit > 0 && usage.rpd.windowStart) {
                        const now = new Date();
                        const rpdWindowStart = new Date(usage.rpd.windowStart);
                        const rpdWindowMs = 24 * 60 * 60 * 1000;
                        if ((now - rpdWindowStart) < rpdWindowMs && (usage.rpd.used || 0) >= usage.rpd.limit) {
                            status = '⏱️ RPD مستنفد';
                            reasons.push(`RPD: ${usage.rpd.used}/${usage.rpd.limit}`);
                        }
                    }
                    
                    // فحص الحد العام
                    const currentUsage = usage.used || 0;
                    const maxRequests = usage.limit || 1000000;
                    if (currentUsage >= maxRequests) {
                        status = '🔴 مستنفد';
                        reasons.push(`Usage: ${currentUsage}/${maxRequests}`);
                    }
                } catch (e) {
                    status = '⚠️ خطأ JSON';
                    reasons.push(e.message.substring(0, 30));
                }
            }
            
            const modelName = m.model.substring(0, 38);
            const priority = String(m.priority).padEnd(10);
            const statusDisplay = status.padEnd(15);
            
            console.log(`${modelName.padEnd(40)} | ${priority} | ${statusDisplay}`);
            if (reasons.length > 0) {
                console.log(`  └─ ${reasons.join(', ')}`);
            }
        }
        
        console.log('='.repeat(80));
        
        // تحديد أول نموذج متاح
        let firstAvailable = null;
        for (const m of models) {
            if (disabledModels.includes(m.model)) continue;
            if (!supportedModels.includes(m.model)) continue;
            
            try {
                const usage = JSON.parse(m.usage || '{}');
                
                // فحص جميع الحدود
                let available = true;
                
                // RPM
                if (usage.rpm && usage.rpm.limit > 0 && usage.rpm.windowStart) {
                    const now = new Date();
                    const rpmWindowStart = new Date(usage.rpm.windowStart);
                    const rpmWindowMs = 60 * 1000;
                    if ((now - rpmWindowStart) < rpmWindowMs && (usage.rpm.used || 0) >= usage.rpm.limit) {
                        available = false;
                    }
                }
                
                // RPH
                if (available && usage.rph && usage.rph.limit > 0 && usage.rph.windowStart) {
                    const now = new Date();
                    const rphWindowStart = new Date(usage.rph.windowStart);
                    const rphWindowMs = 60 * 60 * 1000;
                    if ((now - rphWindowStart) < rphWindowMs && (usage.rph.used || 0) >= usage.rph.limit) {
                        available = false;
                    }
                }
                
                // RPD
                if (available && usage.rpd && usage.rpd.limit > 0 && usage.rpd.windowStart) {
                    const now = new Date();
                    const rpdWindowStart = new Date(usage.rpd.windowStart);
                    const rpdWindowMs = 24 * 60 * 60 * 1000;
                    if ((now - rpdWindowStart) < rpdWindowMs && (usage.rpd.used || 0) >= usage.rpd.limit) {
                        available = false;
                    }
                }
                
                // الحد العام
                if (available) {
                    const currentUsage = usage.used || 0;
                    const maxRequests = usage.limit || 1000000;
                    if (currentUsage >= maxRequests) {
                        available = false;
                    }
                }
                
                if (available) {
                    firstAvailable = m;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (firstAvailable) {
            console.log(`\n✅ أول نموذج متاح حسب الأولوية: ${firstAvailable.model} (Priority: ${firstAvailable.priority})\n`);
        } else {
            console.log(`\n❌ لم يتم العثور على أي نموذج متاح\n`);
        }
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error(error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

// السماح بتحديد keyId من سطر الأوامر
const keyId = process.argv[2] || null;
checkPriorities(keyId);

