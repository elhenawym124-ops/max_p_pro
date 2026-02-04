/**
 * سكريبت سريع لإرسال رسائل اختبار بسيطة والتحقق من الردود
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const testQuestionGenerator = require('../services/testQuestionGenerator');
const testMessageSender = require('../services/testMessageSender');
const aiAgentService = require('../services/aiAgentService');

async function quickTest() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    console.log('\n🚀 بدء اختبار سريع للذكاء الاصطناعي...\n');

    // 1. البحث عن شركة التسويق
    console.log('🔍 البحث عن شركة "شركة التسويق"...');
    const company = await getSharedPrismaClient().company.findFirst({
      where: {
        OR: [
          { name: { contains: 'التسويق' } },
          { name: { contains: 'تسويق' } },
          { email: { contains: 'marketing' } }
        ],
        isActive: true
      }
    });

    if (!company) {
      console.log('❌ لم يتم العثور على شركة "شركة التسويق"');
      console.log('\n📋 جلب أول شركة نشطة...\n');
      const firstCompany = await getSharedPrismaClient().company.findFirst({
        where: { isActive: true }
      });
      
      if (!firstCompany) {
        throw new Error('لا توجد شركات نشطة في النظام');
      }
      
      console.log(`✅ استخدام الشركة: ${firstCompany.name} (${firstCompany.id})\n`);
      var companyId = firstCompany.id;
    } else {
      console.log(`✅ تم العثور على الشركة: ${company.name} (${company.id})\n`);
      var companyId = company.id;
    }

    // 2. إنشاء أو جلب customer اختبار
    console.log('👤 جلب أو إنشاء عميل اختبار...');
    let testCustomer = await getSharedPrismaClient().customer.findFirst({
      where: {
        companyId: companyId,
        firstName: 'عميل اختبار',
        lastName: 'Test Customer'
      }
    });

    if (!testCustomer) {
      testCustomer = await getSharedPrismaClient().customer.create({
        data: {
          companyId: companyId,
          firstName: 'عميل اختبار',
          lastName: 'Test Customer',
          phone: '0000000000',
          email: `test-${companyId}@test.com`
        }
      });
      console.log('✅ تم إنشاء عميل اختبار\n');
    } else {
      console.log('✅ تم العثور على عميل اختبار\n');
    }

    // 3. إنشاء محادثة
    console.log('💬 إنشاء محادثة اختبار...');
    const conversation = await getSharedPrismaClient().conversation.create({
      data: {
        companyId: companyId,
        customerId: testCustomer.id,
        channel: 'TEST',
        status: 'ACTIVE',
        lastMessageAt: new Date(),
        lastMessagePreview: 'محادثة اختبار'
      }
    });
    console.log(`✅ تم إنشاء المحادثة: ${conversation.id}\n`);

    // 4. جلب أسئلة اختبار بسيطة
    console.log('📋 جلب أسئلة اختبار...');
    const testQuestionsData = await testQuestionGenerator.generateTestQuestions(companyId);
    
    // اختبار أسئلة بسيطة من كل نوع
    const testQuestions = [
      ...testQuestionsData.questions.greeting.slice(0, 2),
      ...testQuestionsData.questions.product_inquiry.slice(0, 2),
      ...testQuestionsData.questions.price_inquiry.slice(0, 2),
      ...testQuestionsData.questions.shipping_inquiry.slice(0, 1),
      ...testQuestionsData.questions.order_inquiry.slice(0, 1)
    ];

    console.log(`✅ تم جلب ${testQuestions.length} سؤال للاختبار\n`);

    // 5. إرسال الرسائل والتحقق من الردود
    console.log('📤 بدء إرسال الرسائل...\n');
    console.log('═'.repeat(60));

    const results = {
      total: testQuestions.length,
      succeeded: 0,
      failed: 0,
      silent: 0,
      appropriate: 0,
      inappropriate: 0,
      details: []
    };

    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n📨 السؤال ${i + 1}/${testQuestions.length}: "${question.question}"`);
      console.log(`   النوع: ${question.intent} | الصعوبة: ${question.difficulty}`);

      try {
        // إرسال الرسالة
        const messageData = {
          conversationId: conversation.id,
          senderId: testCustomer.id,
          content: question.question,
          attachments: [],
          companyId: companyId,
          customerData: {
            id: testCustomer.id,
            name: `${testCustomer.firstName} ${testCustomer.lastName}`,
            phone: testCustomer.phone || '0000000000',
            email: testCustomer.email || `test-${companyId}@test.com`,
            orderCount: 0,
            companyId: companyId
          }
        };

        const startTime = Date.now();
        const aiResponse = await aiAgentService.processCustomerMessage(messageData);
        const processingTime = Date.now() - startTime;

        // حفظ الرسالة والرد
        await getSharedPrismaClient().message.create({
          data: {
            conversationId: conversation.id,
            content: question.question,
            type: 'TEXT',
            isFromCustomer: true,
            createdAt: new Date()
          }
        });

        if (aiResponse && aiResponse.content) {
          await getSharedPrismaClient().message.create({
            data: {
              conversationId: conversation.id,
              content: aiResponse.content,
              type: 'TEXT',
              isFromCustomer: false,
              createdAt: new Date()
            }
          });

          results.succeeded++;
          
          // فحص جودة الرد
          const isAppropriate = checkResponseQuality(question, aiResponse.content);
          if (isAppropriate) {
            results.appropriate++;
            console.log('   ✅ الرد مناسب');
          } else {
            results.inappropriate++;
            console.log('   ⚠️  الرد قد لا يكون مناسباً');
          }

          console.log(`   🤖 الرد: ${aiResponse.content.substring(0, 100)}...`);
          console.log(`   🎯 Intent: ${aiResponse.intent || 'غير محدد'}`);
          console.log(`   😊 Sentiment: ${aiResponse.sentiment || 'غير محدد'}`);
          console.log(`   ⏱️  وقت المعالجة: ${processingTime}ms`);

          results.details.push({
            question: question.question,
            response: aiResponse.content,
            intent: aiResponse.intent,
            sentiment: aiResponse.sentiment,
            appropriate: isAppropriate,
            processingTime: processingTime
          });
        } else if (aiResponse && aiResponse.silent) {
          results.silent++;
          console.log('   🤐 النظام صامت - لا يوجد رد');
        } else {
          results.failed++;
          console.log('   ❌ فشل في الحصول على رد');
        }

      } catch (error) {
        results.failed++;
        console.log(`   ❌ خطأ: ${error.message}`);
        results.details.push({
          question: question.question,
          error: error.message
        });
      }

      // تأخير بين الرسائل
      if (i < testQuestions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 6. عرض النتائج
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 نتائج الاختبار:\n');
    console.log(`   إجمالي الأسئلة: ${results.total}`);
    console.log(`   ✅ نجح: ${results.succeeded}`);
    console.log(`   ❌ فشل: ${results.failed}`);
    console.log(`   🤐 صامت: ${results.silent}`);
    console.log(`   ✅ ردود مناسبة: ${results.appropriate}`);
    console.log(`   ⚠️  ردود غير مناسبة: ${results.inappropriate}`);
    console.log(`   📊 نسبة النجاح: ${((results.succeeded / results.total) * 100).toFixed(2)}%`);
    console.log(`   📊 نسبة الجودة: ${results.succeeded > 0 ? ((results.appropriate / results.succeeded) * 100).toFixed(2) : 0}%`);

    // 7. عرض تفاصيل الردود غير المناسبة
    if (results.inappropriate > 0) {
      console.log('\n⚠️  الردود التي تحتاج مراجعة:\n');
      results.details.forEach((detail, idx) => {
        if (!detail.appropriate && detail.response) {
          console.log(`   ${idx + 1}. "${detail.question}"`);
          console.log(`      الرد: ${detail.response.substring(0, 80)}...`);
        }
      });
    }

    // 8. عرض الأخطاء
    if (results.failed > 0) {
      console.log('\n❌ الأخطاء:\n');
      results.details.forEach((detail, idx) => {
        if (detail.error) {
          console.log(`   ${idx + 1}. "${detail.question}"`);
          console.log(`      الخطأ: ${detail.error}`);
        }
      });
    }

    console.log(`\n💬 معرف المحادثة: ${conversation.id}`);
    console.log('   يمكنك عرض المحادثة في: /test-chat\n');

    return results;

  } catch (error) {
    console.error('\n❌ خطأ في الاختبار:', error);
    console.error(error.stack);
    throw error;
  }
}

/**
 * فحص جودة الرد
 */
function checkResponseQuality(question, response) {
  if (!response || response.length < 5) {
    return false;
  }

  // فحص حسب نوع السؤال
  if (question.intent === 'greeting') {
    // للتحيات، يجب أن يكون الرد تحية
    const greetings = ['السلام', 'أهلاً', 'مرحبا', 'مرحب', 'أهلين', 'هاي'];
    return greetings.some(g => response.toLowerCase().includes(g.toLowerCase()));
  }

  if (question.intent === 'product_inquiry') {
    // للأسئلة عن المنتجات، يجب أن يذكر المنتجات أو يطلب توضيح
    const productKeywords = ['منتج', 'منتجات', 'عندنا', 'متوفر'];
    const clarificationKeywords = ['ممكن', 'يمكنك', 'أخبرني', 'ماذا'];
    return productKeywords.some(k => response.toLowerCase().includes(k.toLowerCase())) ||
           clarificationKeywords.some(k => response.toLowerCase().includes(k.toLowerCase()));
  }

  if (question.intent === 'price_inquiry') {
    // للأسئلة عن الأسعار، يجب أن يذكر السعر أو يطلب توضيح المنتج
    const priceKeywords = ['سعر', 'بكام', 'بكم', 'ثمن', 'جنيه'];
    const clarificationKeywords = ['أي منتج', 'أي شيء', 'ماذا تريد'];
    return priceKeywords.some(k => response.toLowerCase().includes(k.toLowerCase())) ||
           clarificationKeywords.some(k => response.toLowerCase().includes(k.toLowerCase()));
  }

  // للأنواع الأخرى، أي رد معقول يعتبر مناسب
  return response.length > 10 && !response.toLowerCase().includes('error');
}

// تشغيل الاختبار
if (require.main === module) {
  quickTest()
    .then(() => {
      console.log('\n✅ تم إكمال الاختبار!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ فشل الاختبار:', error.message);
      process.exit(1);
    });
}

module.exports = { quickTest };


