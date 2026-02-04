/**
 * فحص حالة النماذج - بدون إصلاح
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkModels() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    try {
        console.log('\n🔍 فحص حالة النماذج...\n');
        
        const models = await getSharedPrismaClient().geminiKeyModel.findMany({
            select: {
                id: true,
                model: true,
                usage: true,
                keyId: true
            },
            take: 10 // أول 10 فقط للاختبار
        });
        
        console.log(`📋 تم العثور على ${models.length} نموذج (عينة)\n`);
        
        let ok = 0;
        let broken = 0;
        
        for (const m of models) {
            try {
                if (!m.usage || m.usage.length === 0) {
                    console.log(`   ❌ ${m.model}: لا يوجد usage`);
                    broken++;
                } else {
                    const parsed = JSON.parse(m.usage);
                    if (!parsed.rpm || !parsed.rph || !parsed.rpd) {
                        console.log(`   ⚠️ ${m.model}: مفقود rpm/rph/rpd`);
                        broken++;
                    } else {
                        ok++;
                    }
                }
            } catch (e) {
                console.log(`   ❌ ${m.model}: ${e.message.substring(0, 50)}`);
                broken++;
            }
        }
        
        console.log(`\n📊 النتائج:`);
        console.log(`   ✅ صحيح: ${ok}`);
        console.log(`   ❌ يحتاج إصلاح: ${broken}\n`);
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

checkModels();


