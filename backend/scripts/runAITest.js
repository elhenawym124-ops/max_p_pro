/**
 * سكريبت لإرسال رسائل اختبار تلقائياً للذكاء الاصطناعي
 * وفحص جودة الردود
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const testQuestionGenerator = require('../services/testQuestionGenerator');
const testMessageSender = require('../services/testMessageSender');

// إعدادات
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

class AITestRunner {
  constructor() {
    this.prisma = getSharedPrismaClient();
    this.token = null;
    this.companyId = null;
    this.conversationId = null;
  }

  /**
   * تسجيل الدخول والحصول على token
   */
  async login() {
    try {
      console.log('\n🔐 جاري تسجيل الدخول...\n');
      
      // محاولة تسجيل الدخول
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        this.companyId = response.data.user?.companyId;
        console.log('✅ تم تسجيل الدخول بنجاح');
        console.log(`   Company ID: ${this.companyId}`);
        return true;
      }

      throw new Error('فشل تسجيل الدخول');
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error.response?.data || error.message);
      
      // محاولة البحث عن شركة مباشرة
      console.log('\n🔍 البحث عن شركة "شركة التسويق"...\n');
      const company = await this.prisma.company.findFirst({
        where: {
          OR: [
            { name: { contains: 'التسويق' } },
            { name: { contains: 'تسويق' } },
            { email: { contains: 'marketing' } }
          ],
          isActive: true
        }
      });

      if (company) {
        this.companyId = company.id;
        console.log(`✅ تم العثور على الشركة: ${company.name} (${company.id})`);
        
        // محاولة إنشاء محادثة مباشرة بدون token
        return true;
      }

      throw new Error('لم يتم العثور على شركة التسويق');
    }
  }

  /**
   * إنشاء محادثة اختبار
   */
  async createTestConversation() {
    try {
      console.log('\n📝 جاري إنشاء محادثة اختبار...\n');

      // البحث عن أو إنشاء customer اختبار
      let testCustomer = await this.prisma.customer.findFirst({
        where: {
          companyId: this.companyId,
          firstName: 'عميل اختبار',
          lastName: 'Test Customer'
        }
      });

      if (!testCustomer) {
        testCustomer = await this.prisma.customer.create({
          data: {
            companyId: this.companyId,
            firstName: 'عميل اختبار',
            lastName: 'Test Customer',
            phone: '0000000000',
            email: `test-${this.companyId}@test.com`
          }
        });
        console.log('✅ تم إنشاء عميل اختبار');
      }

      // إنشاء محادثة
      const conversation = await this.prisma.conversation.create({
        data: {
          companyId: this.companyId,
          customerId: testCustomer.id,
          channel: 'TEST',
          status: 'ACTIVE',
          lastMessageAt: new Date(),
          lastMessagePreview: 'محادثة اختبار جديدة'
        }
      });

      this.conversationId = conversation.id;
      console.log(`✅ تم إنشاء محادثة: ${conversation.id}`);
      return conversation;
    } catch (error) {
      console.error('❌ خطأ في إنشاء المحادثة:', error.message);
      throw error;
    }
  }

  /**
   * جلب أسئلة الاختبار
   */
  async getTestQuestions(intent = null, difficulty = null) {
    try {
      console.log('\n📋 جاري جلب أسئلة الاختبار...\n');

      const testQuestionsData = await testQuestionGenerator.generateTestQuestions(this.companyId);

      let questions = [];
      if (intent) {
        questions = testQuestionsData.questions[intent] || [];
        console.log(`✅ تم جلب ${questions.length} سؤال من نوع: ${intent}`);
      } else {
        // جمع جميع الأسئلة
        Object.values(testQuestionsData.questions).forEach(intentQuestions => {
          questions = questions.concat(intentQuestions);
        });
        console.log(`✅ تم جلب ${questions.length} سؤال إجمالي`);
      }

      // فلترة حسب الصعوبة
      if (difficulty) {
        questions = questions.filter(q => q.difficulty === difficulty);
        console.log(`✅ بعد الفلترة: ${questions.length} سؤال (${difficulty})`);
      }

      return questions;
    } catch (error) {
      console.error('❌ خطأ في جلب الأسئلة:', error.message);
      throw error;
    }
  }

  /**
   * إرسال رسائل الاختبار وفحص الردود
   */
  async sendTestMessagesAndCheck(questions, options = {}) {
    try {
      console.log('\n🚀 بدء إرسال رسائل الاختبار...\n');
      console.log(`   عدد الأسئلة: ${questions.length}`);
      console.log(`   تأخير بين الرسائل: ${options.delayBetweenMessages || 1000}ms\n`);

      const results = await testMessageSender.sendTestMessages(
        this.conversationId,
        questions,
        {
          delayBetweenMessages: options.delayBetweenMessages || 1000,
          stopOnError: options.stopOnError || false
        }
      );

      console.log('\n📊 نتائج الاختبار:\n');
      console.log(`   إجمالي الأسئلة: ${results.totalQuestions}`);
      console.log(`   تم الإرسال: ${results.sent}`);
      console.log(`   نجح: ${results.succeeded}`);
      console.log(`   فشل: ${results.failed}`);
      console.log(`   صامت: ${results.silent}`);
      console.log(`   نسبة النجاح: ${((results.succeeded / results.totalQuestions) * 100).toFixed(2)}%`);
      console.log(`   المدة الإجمالية: ${(results.duration / 1000).toFixed(2)}s\n`);

      // فحص جودة الردود
      console.log('🔍 فحص جودة الردود...\n');
      this.checkResponseQuality(results.messages);

      return results;
    } catch (error) {
      console.error('❌ خطأ في إرسال الرسائل:', error.message);
      throw error;
    }
  }

  /**
   * فحص جودة الردود
   */
  checkResponseQuality(messages) {
    const qualityReport = {
      total: messages.length,
      withResponse: 0,
      withoutResponse: 0,
      appropriate: 0,
      inappropriate: 0,
      tooShort: 0,
      tooLong: 0,
      hasIntent: 0,
      hasSentiment: 0,
      errors: []
    };

    messages.forEach((message, index) => {
      console.log(`\n📨 رسالة #${index + 1}: "${message.question.substring(0, 50)}..."`);
      
      if (message.success) {
        if (message.aiResponse && message.aiResponse.content) {
          qualityReport.withResponse++;
          const response = message.aiResponse.content;
          
          // فحص طول الرد
          if (response.length < 10) {
            qualityReport.tooShort++;
            console.log('   ⚠️  الرد قصير جداً');
          } else if (response.length > 1000) {
            qualityReport.tooLong++;
            console.log('   ⚠️  الرد طويل جداً');
          }

          // فحص وجود الـ intent
          if (message.aiResponse.intent) {
            qualityReport.hasIntent++;
            console.log(`   ✅ Intent: ${message.aiResponse.intent}`);
          }

          // فحص وجود المشاعر
          if (message.aiResponse.sentiment) {
            qualityReport.hasSentiment++;
            console.log(`   ✅ Sentiment: ${message.aiResponse.sentiment}`);
          }

          // فحص جودة الرد بشكل أساسي
          const isAppropriate = this.isResponseAppropriate(message.question, response, message.questionData);
          if (isAppropriate) {
            qualityReport.appropriate++;
            console.log('   ✅ الرد مناسب');
          } else {
            qualityReport.inappropriate++;
            console.log('   ❌ الرد غير مناسب');
          }

          console.log(`   📝 الرد: ${response.substring(0, 100)}...`);
        } else if (message.aiResponse?.silent) {
          qualityReport.withoutResponse++;
          console.log('   🤐 النظام صامت - لا يوجد رد');
        } else {
          qualityReport.withoutResponse++;
          console.log('   ⚠️  لا يوجد رد');
        }
      } else {
        qualityReport.withoutResponse++;
        qualityReport.errors.push({
          question: message.question,
          error: message.error
        });
        console.log(`   ❌ فشل: ${message.error}`);
      }

      // وقت المعالجة
      if (message.processingTime) {
        console.log(`   ⏱️  وقت المعالجة: ${message.processingTime}ms`);
      }
    });

    // تقرير الجودة
    console.log('\n\n📊 تقرير جودة الردود:\n');
    console.log(`   إجمالي الرسائل: ${qualityReport.total}`);
    console.log(`   مع رد: ${qualityReport.withResponse}`);
    console.log(`   بدون رد: ${qualityReport.withoutResponse}`);
    console.log(`   ردود مناسبة: ${qualityReport.appropriate}`);
    console.log(`   ردود غير مناسبة: ${qualityReport.inappropriate}`);
    console.log(`   ردود قصيرة جداً: ${qualityReport.tooShort}`);
    console.log(`   ردود طويلة جداً: ${qualityReport.tooLong}`);
    console.log(`   مع Intent: ${qualityReport.hasIntent}`);
    console.log(`   مع Sentiment: ${qualityReport.hasSentiment}`);
    console.log(`   نسبة الجودة: ${((qualityReport.appropriate / qualityReport.withResponse) * 100).toFixed(2)}%`);

    if (qualityReport.errors.length > 0) {
      console.log(`\n❌ الأخطاء (${qualityReport.errors.length}):`);
      qualityReport.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. "${err.question.substring(0, 30)}..." - ${err.error}`);
      });
    }

    return qualityReport;
  }

  /**
   * فحص إذا كان الرد مناسباً
   */
  isResponseAppropriate(question, response, questionData) {
    // فحوصات أساسية
    if (!response || response.length < 5) {
      return false;
    }

    // فحص الـ intent
    if (questionData) {
      const intent = questionData.intent;
      
      // للتحيات، يجب أن يكون الرد تحية
      if (intent === 'greeting' && !this.containsGreeting(response)) {
        return false;
      }

      // للأسئلة عن المنتجات، يجب أن يذكر المنتجات
      if (intent === 'product_inquiry' && !this.mentionsProducts(response)) {
        // قد يكون الرد مناسب إذا طلب توضيح
        if (!this.asksForClarification(response)) {
          return false;
        }
      }

      // للأسئلة عن الأسعار، يجب أن يذكر السعر
      if (intent === 'price_inquiry' && !this.mentionsPrice(response)) {
        // قد يكون الرد مناسب إذا طلب توضيح المنتج
        if (!this.asksForProductClarification(response)) {
          return false;
        }
      }
    }

    // فحص أن الرد ليس فارغاً أو غير منطقي
    if (response.trim().length < 5) {
      return false;
    }

    // فحص أن الرد ليس خطأ فقط
    if (response.toLowerCase().includes('error') && !response.toLowerCase().includes('sorry')) {
      return false;
    }

    return true;
  }

  /**
   * فحص إذا كان الرد يحتوي على تحية
   */
  containsGreeting(response) {
    const greetings = ['السلام', 'أهلاً', 'مرحبا', 'مرحب', 'أهلين', 'هاي', 'hello', 'hi'];
    return greetings.some(greeting => response.toLowerCase().includes(greeting.toLowerCase()));
  }

  /**
   * فحص إذا كان الرد يذكر المنتجات
   */
  mentionsProducts(response) {
    const productKeywords = ['منتج', 'منتجات', 'عندنا', 'متوفر', 'available', 'product'];
    return productKeywords.some(keyword => response.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * فحص إذا كان الرد يطلب توضيح
   */
  asksForClarification(response) {
    const clarificationKeywords = ['ممكن', 'يمكنك', 'أخبرني', 'ماذا', 'أي', 'which', 'what', 'could', 'please'];
    return clarificationKeywords.some(keyword => response.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * فحص إذا كان الرد يذكر السعر
   */
  mentionsPrice(response) {
    const priceKeywords = ['سعر', 'بكام', 'بكم', 'ثمن', 'جنيه', 'ريال', 'price', 'cost', 'egp', 'sar'];
    return priceKeywords.some(keyword => response.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * فحص إذا كان الرد يطلب توضيح المنتج
   */
  asksForProductClarification(response) {
    const productClarificationKeywords = ['أي منتج', 'أي شيء', 'ماذا تريد', 'أخبرني', 'which product', 'what product'];
    return productClarificationKeywords.some(keyword => response.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * تشغيل الاختبار الكامل
   */
  async runFullTest(options = {}) {
    try {
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║     نظام اختبار الذكاء الاصطناعي - AI Test System      ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      // 1. تسجيل الدخول
      await this.login();

      // 2. إنشاء محادثة
      await this.createTestConversation();

      // 3. جلب الأسئلة
      const questions = await this.getTestQuestions(
        options.intent || null,
        options.difficulty || null
      );

      if (questions.length === 0) {
        console.log('❌ لا توجد أسئلة للاختبار');
        return;
      }

      // 4. إرسال الرسائل وفحص الردود
      const results = await this.sendTestMessagesAndCheck(questions, {
        delayBetweenMessages: options.delay || 1000,
        stopOnError: options.stopOnError || false
      });

      // 5. عرض الملخص
      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║                    ملخص الاختبار                        ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');
      console.log(`   ✅ إجمالي الأسئلة: ${results.totalQuestions}`);
      console.log(`   ✅ نجح: ${results.succeeded}`);
      console.log(`   ❌ فشل: ${results.failed}`);
      console.log(`   🤐 صامت: ${results.silent}`);
      console.log(`   📊 نسبة النجاح: ${((results.succeeded / results.totalQuestions) * 100).toFixed(2)}%`);
      console.log(`   ⏱️  المدة: ${(results.duration / 1000).toFixed(2)}s\n`);

      return results;
    } catch (error) {
      console.error('\n❌ خطأ في تشغيل الاختبار:', error.message);
      console.error(error.stack);
      throw error;
    }
  }
}

// تشغيل الاختبار
async function main() {
  const runner = new AITestRunner();
  
  // إمكانية تمرير خيارات من سطر الأوامر
  const args = process.argv.slice(2);
  const options = {
    intent: args.find(arg => arg.startsWith('--intent='))?.split('=')[1] || null,
    difficulty: args.find(arg => arg.startsWith('--difficulty='))?.split('=')[1] || null,
    delay: parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1]) || 1000,
    stopOnError: args.includes('--stop-on-error')
  };

  try {
    await runner.runFullTest(options);
    console.log('\n✅ تم إكمال الاختبار بنجاح!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ فشل الاختبار:', error.message);
    process.exit(1);
  }
}

// تشغيل إذا كان مستدعى مباشرة
if (require.main === module) {
  main();
}

module.exports = { AITestRunner };

