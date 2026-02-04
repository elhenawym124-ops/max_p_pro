/**
 * سكريبت اختبار السيناريو باستخدام AITestRunner الموجود
 */

const path = require('path');
process.chdir(path.join(__dirname, '..', 'services'));

const AITestRunner = require('../services/run-ai-intelligence-test');
const COMPANY_ID = 'cmem8ayyr004cufakqkcsyn97'; // شركة التسويق

const SCENARIO = [
  'اهلا',
  'عندك ايه من الكوتشيات؟',
  'عايز اعرف عن الكوتشي بتاعك',
  'الكوتشي بكام؟',
  'في مقاس 40؟',
  'في ألوان إيه؟',
  'الشحن كام لو أنا في القاهرة؟',
  'عايز أطلب كوتشي مقاس 40 لون أسود',
  'الدفع إزاي؟',
  'هيوصل إمتى لو طلبت النهاردة؟',
  'اسمي أحمد محمد',
  'العنوان: 15 شارع التحرير، وسط البلد، القاهرة',
  'رقمي: 01234567890',
  'تمام، اعمل الطلب',
  'شكراً، هيوصل إمتى بالظبط؟'
];

async function runScenarioTest() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 اختبار الذكاء الصناعي - السيناريو الكامل');
    console.log('='.repeat(80) + '\n');

    const runner = new AITestRunner(COMPANY_ID);
    await runner.initializeConversation();

    const results = [];

    for (let i = 0; i < SCENARIO.length; i++) {
      const question = SCENARIO[i];
      const questionNum = i + 1;

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📤 السؤال ${questionNum}/15: "${question}"`);
      console.log('='.repeat(80));

      const result = await runner.sendMessage(question, { questionNumber: questionNum });
      results.push(result);

      // عرض النتيجة
      if (result.response) {
        console.log(`\n📥 الرد:`);
        const preview = result.response.substring(0, 500);
        console.log(preview + (result.response.length > 500 ? '...' : ''));
      } else {
        console.log(`\n❌ لا يوجد رد`);
      }

      // التحقق من إنشاء الطلب
      if (questionNum === 14) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const { getSharedPrismaClient } = require('./sharedDatabase');
        // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
        const order = await getSharedPrismaClient().order.findFirst({
          where: { conversationId: runner.dbConversationId, companyId: COMPANY_ID },
          orderBy: { createdAt: 'desc' }
        });
        if (order) {
          console.log(`\n✅ تم إنشاء الطلب: ${order.orderNumber}`);
        } else {
          console.log(`\n⚠️ لم يتم إنشاء الطلب`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // تقرير نهائي
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 تقرير الاختبار النهائي');
    console.log('='.repeat(80) + '\n');

    const successful = results.filter(r => r.response).length;
    console.log(`📈 الإحصائيات:`);
    console.log(`   - إجمالي الأسئلة: ${results.length}`);
    console.log(`   - الردود الناجحة: ${successful}/${results.length} (${Math.round(successful/results.length*100)}%)`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ انتهى الاختبار');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

runScenarioTest();


