/**
 * 🔍 Test All API Keys
 * يفحص جميع المفاتيح النشطة ويحدد أيها يعمل وأيها معطل
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAllKeys() {
    console.log('🔍 بدء فحص جميع المفاتيح النشطة...\n');

    try {
        // Get all active keys
        const keys = await prisma.aIKey.findMany({
            where: { isActive: true },
            select: { id: true, name: true, apiKey: true, provider: true }
        });

        console.log(`📊 عدد المفاتيح النشطة: ${keys.length}\n`);

        const results = {
            working: [],
            leaked: [],
            expired: [],
            invalid: [],
            error: []
        };

        for (const key of keys) {
            process.stdout.write(`🔄 اختبار: ${key.name}... `);

            try {
                // Test with a simple request to Gemini API
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models?key=${key.apiKey}`,
                    { method: 'GET', timeout: 10000 }
                );

                if (response.ok) {
                    console.log('✅ يعمل');
                    results.working.push(key.name);
                } else {
                    const errorText = await response.text();

                    if (errorText.includes('leaked') || errorText.includes('reported as leaked')) {
                        console.log('🚫 مسرب (Leaked)');
                        results.leaked.push({ name: key.name, id: key.id });
                    } else if (errorText.includes('expired') || errorText.includes('API_KEY_INVALID')) {
                        console.log('⏰ منتهي الصلاحية (Expired)');
                        results.expired.push({ name: key.name, id: key.id });
                    } else if (errorText.includes('invalid') || response.status === 400) {
                        console.log('❌ غير صالح (Invalid)');
                        results.invalid.push({ name: key.name, id: key.id });
                    } else {
                        console.log(`⚠️ خطأ: ${response.status}`);
                        results.error.push({ name: key.name, id: key.id, status: response.status });
                    }
                }
            } catch (fetchError) {
                console.log(`❌ خطأ اتصال: ${fetchError.message}`);
                results.error.push({ name: key.name, id: key.id, error: fetchError.message });
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 ملخص النتائج:');
        console.log('='.repeat(50));
        console.log(`✅ تعمل: ${results.working.length} (${results.working.join(', ') || 'لا يوجد'})`);
        console.log(`🚫 مسربة: ${results.leaked.length}`);
        console.log(`⏰ منتهية: ${results.expired.length}`);
        console.log(`❌ غير صالحة: ${results.invalid.length}`);
        console.log(`⚠️ أخطاء: ${results.error.length}`);

        // Auto-disable bad keys
        const badKeys = [...results.leaked, ...results.expired, ...results.invalid];
        if (badKeys.length > 0) {
            console.log('\n🔒 تعطيل المفاتيح التالفة تلقائياً...');
            for (const badKey of badKeys) {
                await prisma.aIKey.update({
                    where: { id: badKey.id },
                    data: { isActive: false }
                });
                console.log(`   ✅ تم تعطيل: ${badKey.name}`);
            }
        }

        const finalActiveCount = await prisma.aIKey.count({ where: { isActive: true } });
        console.log(`\n📊 المفاتيح النشطة الآن: ${finalActiveCount}`);

    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAllKeys();
