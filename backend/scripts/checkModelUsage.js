/**
 * فحص usage للنماذج في المفاتيح المركزية
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function checkModelUsage() {
    try {
        console.log('\n🔍 ========== فحص usage للنماذج ==========\n');

        const centralKey = await getSharedPrismaClient().geminiKey.findFirst({
            where: {
                keyType: 'CENTRAL',
                companyId: null,
                isActive: true
            },
            orderBy: { priority: 'asc' }
        });

        if (!centralKey) {
            console.error('❌ لا يوجد مفتاح مركزي نشط');
            return;
        }

        console.log(`🔑 المفتاح: ${centralKey.name}\n`);

        const models = await getSharedPrismaClient().geminiKeyModel.findMany({
            where: {
                keyId: centralKey.id,
                isEnabled: true
            },
            orderBy: { priority: 'asc' },
            take: 5 // أول 5 نماذج فقط
        });

        console.log(`📋 تم العثور على ${models.length} نموذج (عرض أول 5)\n`);

        for (const model of models) {
            try {
                const usage = JSON.parse(model.usage || '{}');
                
                console.log(`📊 ${model.model} (Priority: ${model.priority}):`);
                console.log(`   - used: ${usage.used || 0}`);
                console.log(`   - limit: ${usage.limit || 'N/A'}`);
                
                if (usage.rpm) {
                    console.log(`   - RPM: ${usage.rpm.used || 0}/${usage.rpm.limit || 0} (windowStart: ${usage.rpm.windowStart || 'null'})`);
                }
                if (usage.rph) {
                    console.log(`   - RPH: ${usage.rph.used || 0}/${usage.rph.limit || 0} (windowStart: ${usage.rph.windowStart || 'null'})`);
                }
                if (usage.rpd) {
                    console.log(`   - RPD: ${usage.rpd.used || 0}/${usage.rpd.limit || 0} (windowStart: ${usage.rpd.windowStart || 'null'})`);
                }
                
                // فحص إذا كان النموذج سيتم تخطيه
                let wouldSkip = false;
                let skipReason = '';
                
                // فحص RPM
                if (usage.rpm && usage.rpm.limit > 0 && usage.rpm.windowStart) {
                    const now = new Date();
                    const rpmWindowStart = new Date(usage.rpm.windowStart);
                    const rpmWindowMs = 60 * 1000;
                    if ((now - rpmWindowStart) < rpmWindowMs && (usage.rpm.used || 0) >= usage.rpm.limit) {
                        wouldSkip = true;
                        skipReason = `RPM: ${usage.rpm.used}/${usage.rpm.limit}`;
                    }
                }
                
                // فحص RPH
                if (!wouldSkip && usage.rph && usage.rph.limit > 0 && usage.rph.windowStart) {
                    const now = new Date();
                    const rphWindowStart = new Date(usage.rph.windowStart);
                    const rphWindowMs = 60 * 60 * 1000;
                    if ((now - rphWindowStart) < rphWindowMs && (usage.rph.used || 0) >= usage.rph.limit) {
                        wouldSkip = true;
                        skipReason = `RPH: ${usage.rph.used}/${usage.rph.limit}`;
                    }
                }
                
                // فحص RPD
                if (!wouldSkip && usage.rpd && usage.rpd.limit > 0 && usage.rpd.windowStart) {
                    const now = new Date();
                    const rpdWindowStart = new Date(usage.rpd.windowStart);
                    const rpdWindowMs = 24 * 60 * 60 * 1000;
                    if ((now - rpdWindowStart) < rpdWindowMs && (usage.rpd.used || 0) >= usage.rpd.limit) {
                        wouldSkip = true;
                        skipReason = `RPD: ${usage.rpd.used}/${usage.rpd.limit}`;
                    }
                }
                
                // فحص الحد العام
                if (!wouldSkip && (usage.used || 0) >= (usage.limit || 1000000)) {
                    wouldSkip = true;
                    skipReason = `Limit: ${usage.used}/${usage.limit}`;
                }
                
                if (wouldSkip) {
                    console.log(`   ⚠️ سيتم التخطي: ${skipReason}`);
                } else {
                    console.log(`   ✅ متاح للاستخدام`);
                }
                
                console.log('');
                
            } catch (e) {
                console.log(`   ❌ خطأ في تحليل JSON: ${e.message}`);
                console.log('');
            }
        }

        console.log('✅ ========== انتهى الفحص ==========\n');

    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

checkModelUsage();


