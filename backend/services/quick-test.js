/**
 * اختبار سريع لسؤال واحد
 */

const aiAgentService = require('./aiAgentService');
const { getSharedPrismaClient } = require('./sharedDatabase');

async function quickTest() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    // البحث عن شركة التسويق
    console.log('🔍 البحث عن شركة التسويق...\n');
    const company = await getSharedPrismaClient().company.findFirst({
      where: {
        name: {
          contains: 'التسويق'
        },
        isActive: true
      }
    });

    if (!company) {
      console.log('❌ لم يتم العثور على شركة التسويق');
      console.log('📋 البحث عن أي شركة نشطة...\n');
      
      const anyCompany = await getSharedPrismaClient().company.findFirst({
        where: { isActive: true }
      });
      
      if (!anyCompany) {
        console.error('❌ لا توجد شركات نشطة في قاعدة البيانات');
        process.exit(1);
      }
      
      console.log(`✅ استخدام الشركة: ${anyCompany.name} (${anyCompany.id})\n`);
      return testQuestion(anyCompany.id);
    }

    console.log(`✅ تم العثور على الشركة: ${company.name} (${company.id})\n`);
    await testQuestion(company.id);

  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  }
}

async function testQuestion(companyId) {
  try {
    const testQuestion = 'السلام عليكم';
    console.log(`🧪 اختبار السؤال: "${testQuestion}"`);
    console.log(`🏢 Company ID: ${companyId}\n`);

    const messageData = {
      conversationId: 'test-quick-' + Date.now(),
      senderId: 'test-customer-' + Date.now(),
      content: testQuestion,
      attachments: [],
      companyId: companyId,
      customerData: {
        id: 'test-customer',
        name: 'عميل اختبار',
        phone: '01234567890',
        email: 'test@example.com',
        orderCount: 0,
        companyId: companyId
      }
    };

    console.log('📤 إرسال الرسالة...\n');
    const startTime = Date.now();
    const response = await aiAgentService.processCustomerMessage(messageData);
    const processingTime = Date.now() - startTime;

    if (!response) {
      console.error('❌ لم يتم استلام رد من الذكاء الاصطناعي');
      process.exit(1);
    }

    console.log('✅ تم استلام الرد:\n');
    console.log('='.repeat(60));
    console.log(response.content || response);
    console.log('='.repeat(60));
    console.log(`\n⏱️ وقت المعالجة: ${processingTime}ms`);
    console.log(`🎯 النية: ${response.intent || 'غير محدد'}`);
    console.log(`😊 المشاعر: ${response.sentiment || 'غير محدد'}`);
    console.log(`✅ النجاح: ${response.success !== false ? 'نعم' : 'لا'}\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// تشغيل الاختبار
quickTest();


