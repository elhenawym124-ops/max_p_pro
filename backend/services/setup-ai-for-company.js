/**
 * إعداد الذكاء الاصطناعي لشركة mo-test
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

const COMPANY_ID = 'cmhnzbjl50000ufus81imj8wq';

async function setupAI() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    console.log('\n🔧 إعداد الذكاء الاصطناعي لشركة mo-test...\n');

    // 1. التحقق من وجود الشركة
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: COMPANY_ID }
    });

    if (!company) {
      console.error('❌ الشركة غير موجودة!');
      process.exit(1);
    }

    console.log(`✅ تم العثور على الشركة: ${company.name}\n`);

    // 2. التحقق من وجود AI Settings
    let aiSettings = await getSharedPrismaClient().aiSettings.findUnique({
      where: { companyId: COMPANY_ID }
    });

    if (!aiSettings) {
      console.log('📝 إنشاء AI Settings جديدة...');
      aiSettings = await getSharedPrismaClient().aiSettings.create({
        data: {
          companyId: COMPANY_ID,
          replyMode: 'all',
          autoReplyEnabled: true,
          confidenceThreshold: 0.7,
          autoCreateOrders: false,
          autoSuggestProducts: true,
          includeImages: true,
          maxSuggestions: 3,
          multimodalEnabled: true,
          ragEnabled: true,
          qualityEvaluationEnabled: true,
          enableDiversityCheck: true,
          enableToneAdaptation: true,
          enableEmotionalResponse: true
        }
      });
      console.log('✅ تم إنشاء AI Settings\n');
    } else {
      console.log('✅ AI Settings موجودة بالفعل\n');
    }

    // 3. التحقق من وجود Gemini Keys
    const geminiKeys = await getSharedPrismaClient().geminiKey.findMany({
      where: {
        companyId: COMPANY_ID,
        isActive: true
      }
    });

    if (geminiKeys.length === 0) {
      console.log('⚠️  لا توجد مفاتيح Gemini نشطة!');
      console.log('📝 يرجى إضافة مفتاح Gemini API باستخدام:');
      console.log('   - الواجهة: /settings/ai');
      console.log('   - أو استخدام API: POST /api/v1/ai/keys');
      console.log('\n💡 للحصول على مفتاح: https://makersuite.google.com/app/apikey\n');
    } else {
      console.log(`✅ تم العثور على ${geminiKeys.length} مفتاح نشط:`);
      geminiKeys.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.model} (${key.isActive ? 'نشط' : 'غير نشط'})`);
      });
      console.log('');
    }

    // 4. عرض ملخص الإعدادات
    console.log('📊 ملخص الإعدادات:');
    console.log(`   - Company ID: ${COMPANY_ID}`);
    console.log(`   - Reply Mode: ${aiSettings.replyMode}`);
    console.log(`   - Auto Reply: ${aiSettings.autoReplyEnabled ? 'مفعل' : 'معطل'}`);
    console.log(`   - Confidence Threshold: ${aiSettings.confidenceThreshold}`);
    console.log(`   - RAG Enabled: ${aiSettings.ragEnabled ? 'نعم' : 'لا'}`);
    console.log(`   - Active Keys: ${geminiKeys.length}`);
    console.log('');

    if (geminiKeys.length > 0) {
      console.log('✅ الشركة جاهزة للاختبار!\n');
      console.log('🚀 لتشغيل الاختبار:');
      console.log('   node test-ai-company.js\n');
    } else {
      console.log('⚠️  يجب إضافة مفتاح Gemini API أولاً!\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ خطأ:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

setupAI();


