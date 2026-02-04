/**
 * فحص محتوى نموذج محدد
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkModel() {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    try {
        console.log('\n🔍 فحص نموذج محدد...\n');
        
        // جلب نموذج واحد
        const model = await getSharedPrismaClient().geminiKeyModel.findFirst({
            select: {
                id: true,
                model: true,
                usage: true
            }
        });
        
        if (!model) {
            console.log('❌ لم يتم العثور على نماذج');
            return;
        }
        
        console.log(`📋 النموذج: ${model.model}`);
        console.log(`📏 طول JSON: ${(model.usage || '').length} حرف\n`);
        
        console.log('📄 محتوى JSON:');
        console.log(model.usage);
        console.log('\n');
        
        try {
            const parsed = JSON.parse(model.usage || '{}');
            console.log('✅ JSON صحيح!');
            console.log('\n📊 البنية:');
            console.log(JSON.stringify(parsed, null, 2));
            
            // التحقق من الحقول المطلوبة
            console.log('\n🔍 التحقق من الحقول:');
            console.log(`   RPM: ${parsed.rpm ? '✅ موجود' : '❌ مفقود'}`);
            console.log(`   RPH: ${parsed.rph ? '✅ موجود' : '❌ مفقود'}`);
            console.log(`   RPD: ${parsed.rpd ? '✅ موجود' : '❌ مفقود'}`);
            
            if (parsed.rpm && parsed.rph && parsed.rpd) {
                console.log('\n✅ النموذج صحيح ومكتمل!');
            } else {
                console.log('\n⚠️ النموذج يحتاج إصلاح');
            }
        } catch (e) {
            console.log(`❌ خطأ في تحليل JSON: ${e.message}`);
        }
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

checkModel();


