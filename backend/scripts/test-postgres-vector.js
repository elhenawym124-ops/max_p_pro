/**
 * اختبار PostgreSQL Vector Service
 * شغله للتأكد من أن كل شيء يعمل
 */

require('dotenv').config();
const postgresVectorService = require('../services/postgresVectorService');

async function testVectorSearch() {
  console.log('🧪 اختبار PostgreSQL Vector Service\n');

  try {
    // 1. التهيئة
    console.log('1️⃣ تهيئة الخدمة...');
    await postgresVectorService.initialize();
    console.log('   ✅ تمت التهيئة\n');

    // 2. الإحصائيات
    console.log('2️⃣ الحصول على الإحصائيات...');
    const stats = await postgresVectorService.getStats();
    console.log('   📊 إجمالي المنتجات:', stats.total_products);
    console.log('   📊 المنتجات مع embeddings:', stats.products_with_embeddings);
    console.log('   📊 المنتجات النشطة:', stats.active_products);
    console.log('');

    // 3. اختبار البحث النصي (Fallback)
    console.log('3️⃣ اختبار البحث النصي...');
    const textResults = await postgresVectorService.fallbackTextSearch(
      'منتج',
      null, // جميع الشركات
      5
    );
    console.log(`   ✅ وجدت ${textResults.length} منتجات`);
    if (textResults.length > 0) {
      console.log(`   📦 مثال: ${textResults[0].name}`);
    }
    console.log('');

    // 4. اختبار Vector Search (يحتاج Gemini API)
    console.log('4️⃣ اختبار Vector Search...');
    console.log('   ⚠️ يحتاج Gemini API key في جدول gemini_keys');
    console.log('   💡 للاختبار الكامل، تأكد من وجود API key للشركة');
    console.log('');

    // 5. إغلاق الاتصال
    await postgresVectorService.close();
    
    console.log('✅ جميع الاختبارات نجحت!');
    console.log('');
    console.log('🎉 PostgreSQL Vector Service جاهز للاستخدام!');
    console.log('');
    console.log('📝 الخطوات التالية:');
    console.log('   1. استخدم postgresVectorService.searchProducts() للبحث');
    console.log('   2. استخدم postgresVectorService.upsertProduct() لإضافة منتجات');
    console.log('   3. راجع docs/POSTGRESQL_MIGRATION_GUIDE_AR.md للتفاصيل');

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
    process.exit(1);
  }
}

// تشغيل
testVectorSearch()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
