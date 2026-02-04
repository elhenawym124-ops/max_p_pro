/**
 * 🧪 سكريبت اختبار ذكاء الـ AI - نظام اختبار شامل
 * 
 * المرحلة 1: فحص المنتجات والمعلومات
 * المرحلة 2: توليد أسئلة اختبار ذكية
 * المرحلة 3: اختبار قدرة AI على الإجابة والوصول للمعلومات
 * المرحلة 4: تقييم الأداء وتوليد تقرير شامل
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const fs = require('fs');
const path = require('path');

// ⚙️ إعدادات الاختبار
const CONFIG = {
  BASE_URL: 'https://maxp-ai.pro',
  API_BASE: '/api/v1',
  TEST_USER: {
    email: 'mokhtar@mokhtar.com',
    password: '0165676135'
  },
  COMPANY_NAME: 'شركة التسويق',
  DELAY_BETWEEN_QUESTIONS: 2000, // 2 ثانية بين كل سؤال
  MAX_RESPONSE_TIME: 30000, // 30 ثانية كحد أقصى للرد
  REPORT_PATH: path.join(__dirname, '../test-reports')
};

class AIIntelligenceTester {
  constructor() {
    this.authToken = null;
    this.companyId = null;
    this.companyData = null;
    this.products = [];
    this.testResults = {
      startTime: new Date(),
      endTime: null,
      company: null,
      productsAnalyzed: 0,
      questionsGenerated: 0,
      questionsAsked: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      noAnswers: 0,
      averageResponseTime: 0,
      details: []
    };
  }

  /**
   * 🔐 المرحلة 0: تسجيل الدخول (مباشرة من قاعدة البيانات)
   */
  async login() {
    console.log('\n🔐 المرحلة 0: الحصول على بيانات المستخدم...');
    console.log('═'.repeat(60));
    
    try {
      // البحث عن المستخدم مباشرة من قاعدة البيانات
      const user = await getSharedPrismaClient().user.findFirst({
        where: {
          email: CONFIG.TEST_USER.email
        },
        include: {
          company: true
        }
      });

      if (!user) {
        throw new Error('المستخدم غير موجود في قاعدة البيانات');
      }

      if (!user.isActive) {
        throw new Error('المستخدم غير نشط');
      }

      this.companyId = user.companyId;
      
      console.log('✅ تم العثور على المستخدم بنجاح');
      console.log(`   المستخدم: ${user.firstName} ${user.lastName}`);
      console.log(`   البريد: ${user.email}`);
      console.log(`   الشركة: ${user.company.name}`);
      console.log(`   معرف الشركة: ${this.companyId}`);
      
      return true;
    } catch (error) {
      console.error('❌ خطأ في الحصول على بيانات المستخدم:', error.message);
      return false;
    }
  }

  /**
   * 📊 المرحلة 1: فحص المنتجات والمعلومات
   */
  async analyzeCompanyData() {
    console.log('\n📊 المرحلة 1: فحص بيانات الشركة والمنتجات...');
    console.log('═'.repeat(60));

    try {
      // جلب بيانات الشركة من قاعدة البيانات
      const company = await getSharedPrismaClient().company.findUnique({
        where: { id: this.companyId },
        include: {
          aiSettings: true,
          systemPrompts: true
        }
      });

      if (!company) {
        throw new Error('لم يتم العثور على بيانات الشركة');
      }

      this.companyData = company;
      this.testResults.company = {
        id: company.id,
        name: company.name,
        email: company.email,
        hasAISettings: !!company.aiSettings,
        hasPrompts: company.systemPrompts?.length > 0
      };

      console.log(`✅ تم جلب بيانات الشركة: ${company.name}`);
      console.log(`   إعدادات AI: ${company.aiSettings ? '✓' : '✗'}`);
      console.log(`   Prompts مخصصة: ${company.systemPrompts?.length || 0}`);

      // جلب المنتجات مباشرة من قاعدة البيانات
      this.products = await getSharedPrismaClient().product.findMany({
        where: { companyId: this.companyId },
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: [
              { type: 'asc' },
              { sortOrder: 'asc' }
            ]
          }
        },
        take: 100
      });

      this.testResults.productsAnalyzed = this.products.length;

      console.log(`\n📦 تم جلب ${this.products.length} منتج`);
        
        // تحليل المنتجات
        const productsWithDescription = this.products.filter(p => p.description);
        const productsWithPrice = this.products.filter(p => p.price);
        const productsWithStock = this.products.filter(p => p.stock !== null);
        const productsWithImages = this.products.filter(p => p.images && p.images.length > 0);
        const productsWithVariants = this.products.filter(p => p.variants && p.variants.length > 0);

        console.log('\n   📋 تحليل المنتجات:');
        console.log(`   - منتجات بوصف: ${productsWithDescription.length}/${this.products.length}`);
        console.log(`   - منتجات بسعر: ${productsWithPrice.length}/${this.products.length}`);
        console.log(`   - منتجات بمخزون: ${productsWithStock.length}/${this.products.length}`);
        console.log(`   - منتجات بصور: ${productsWithImages.length}/${this.products.length}`);
        console.log(`   - منتجات بمتغيرات: ${productsWithVariants.length}/${this.products.length}`);

        // عرض عينة من المنتجات
        console.log('\n   📦 عينة من المنتجات:');
        this.products.slice(0, 5).forEach((product, idx) => {
          console.log(`   ${idx + 1}. ${product.name}`);
          console.log(`      السعر: ${product.price || 'غير محدد'} | المخزون: ${product.stock !== null ? product.stock : 'غير محدد'}`);
          if (product.description) {
            console.log(`      الوصف: ${product.description.substring(0, 60)}...`);
          }
        });

        return true;
    } catch (error) {
      console.error('❌ خطأ في تحليل البيانات:', error.message);
      if (error.response) {
        console.error('   التفاصيل:', error.response.data);
      }
      return false;
    }
  }

  /**
   * 🎯 المرحلة 2: توليد أسئلة اختبار ذكية
   */
  generateTestQuestions() {
    console.log('\n🎯 المرحلة 2: توليد أسئلة اختبار ذكية...');
    console.log('═'.repeat(60));

    const questions = [];

    // 1️⃣ أسئلة عامة عن الشركة
    questions.push({
      category: 'company_info',
      question: 'ما هي خدماتكم؟',
      expectedKeywords: ['خدمات', 'نقدم', 'متخصصون'],
      difficulty: 'easy',
      intent: 'general_inquiry'
    });

    questions.push({
      category: 'company_info',
      question: 'كيف يمكنني التواصل معكم؟',
      expectedKeywords: ['تواصل', 'اتصال', 'رقم', 'بريد'],
      difficulty: 'easy',
      intent: 'contact_inquiry'
    });

    // 2️⃣ أسئلة عن المنتجات المحددة
    if (this.products.length > 0) {
      // اختيار 3 منتجات عشوائية
      const randomProducts = this.getRandomProducts(3);
      
      randomProducts.forEach(product => {
        // سؤال عن السعر
        questions.push({
          category: 'product_price',
          question: `كم سعر ${product.name}؟`,
          expectedKeywords: [product.price?.toString(), 'سعر', 'جنيه'],
          expectedAnswer: product.price,
          productId: product.id,
          productName: product.name,
          difficulty: 'medium',
          intent: 'price_inquiry'
        });

        // سؤال عن التوفر
        questions.push({
          category: 'product_availability',
          question: `هل ${product.name} متوفر؟`,
          expectedKeywords: ['متوفر', 'متاح', 'موجود', 'مخزون'],
          expectedAnswer: product.stock > 0,
          productId: product.id,
          productName: product.name,
          difficulty: 'medium',
          intent: 'availability_inquiry'
        });

        // سؤال عن الوصف
        if (product.description) {
          questions.push({
            category: 'product_description',
            question: `أخبرني عن ${product.name}`,
            expectedKeywords: product.description.split(' ').slice(0, 5),
            productId: product.id,
            productName: product.name,
            difficulty: 'hard',
            intent: 'product_inquiry'
          });
        }
      });
    }

    // 3️⃣ أسئلة مقارنة (إذا كان هناك أكثر من منتج)
    if (this.products.length >= 2) {
      const [product1, product2] = this.getRandomProducts(2);
      
      questions.push({
        category: 'product_comparison',
        question: `ما الفرق بين ${product1.name} و ${product2.name}؟`,
        expectedKeywords: [product1.name, product2.name, 'فرق', 'مقارنة'],
        products: [product1, product2],
        difficulty: 'hard',
        intent: 'comparison_inquiry'
      });

      if (product1.price && product2.price) {
        questions.push({
          category: 'price_comparison',
          question: `أيهما أرخص ${product1.name} أم ${product2.name}؟`,
          expectedKeywords: ['أرخص', 'أقل', 'سعر'],
          expectedAnswer: product1.price < product2.price ? product1.name : product2.name,
          products: [product1, product2],
          difficulty: 'hard',
          intent: 'price_comparison'
        });
      }
    }

    // 4️⃣ أسئلة معقدة
    questions.push({
      category: 'complex_inquiry',
      question: 'ما هي أرخص منتجاتكم؟',
      expectedKeywords: ['أرخص', 'أقل سعر'],
      difficulty: 'hard',
      intent: 'product_inquiry'
    });

    questions.push({
      category: 'complex_inquiry',
      question: 'ما هي المنتجات المتوفرة حالياً؟',
      expectedKeywords: ['متوفر', 'متاح', 'موجود'],
      difficulty: 'hard',
      intent: 'availability_inquiry'
    });

    // 5️⃣ أسئلة عن الطلبات والشحن
    questions.push({
      category: 'order_inquiry',
      question: 'كيف يمكنني الطلب؟',
      expectedKeywords: ['طلب', 'شراء', 'اطلب'],
      difficulty: 'medium',
      intent: 'order_inquiry'
    });

    questions.push({
      category: 'shipping_inquiry',
      question: 'هل يوجد توصيل؟',
      expectedKeywords: ['توصيل', 'شحن', 'ديليفري'],
      difficulty: 'medium',
      intent: 'shipping_inquiry'
    });

    this.testResults.questionsGenerated = questions.length;

    console.log(`✅ تم توليد ${questions.length} سؤال اختبار`);
    console.log('\n   📋 توزيع الأسئلة:');
    
    const categories = {};
    questions.forEach(q => {
      categories[q.category] = (categories[q.category] || 0) + 1;
    });
    
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} سؤال`);
    });

    return questions;
  }

  /**
   * 🤖 المرحلة 3: اختبار قدرة AI على الإجابة
   */
  async testAIResponses(questions) {
    console.log('\n🤖 المرحلة 3: اختبار قدرة AI على الإجابة...');
    console.log('═'.repeat(60));

    // إنشاء محادثة اختبار
    const conversation = await this.createTestConversation();
    if (!conversation) {
      console.error('❌ فشل إنشاء محادثة اختبار');
      return false;
    }

    console.log(`\n💬 تم إنشاء محادثة اختبار: ${conversation.id}`);
    console.log(`\n📤 بدء إرسال ${questions.length} سؤال...\n`);

    const responseTimes = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📨 السؤال ${i + 1}/${questions.length}`);
      console.log(`   الفئة: ${question.category} | الصعوبة: ${question.difficulty}`);
      console.log(`   السؤال: "${question.question}"`);

      try {
        const startTime = Date.now();
        
        // إرسال الرسالة للـ AI
        const aiResponse = await this.sendMessageToAI(conversation.id, question.question);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        if (aiResponse && aiResponse.content) {
          console.log(`   🤖 الرد: "${aiResponse.content.substring(0, 150)}${aiResponse.content.length > 150 ? '...' : ''}"`);
          console.log(`   ⏱️  وقت الرد: ${responseTime}ms`);

          // تقييم جودة الرد
          const evaluation = this.evaluateResponse(question, aiResponse.content);
          
          console.log(`   📊 التقييم: ${evaluation.score}/100`);
          console.log(`   ${evaluation.isCorrect ? '✅ إجابة صحيحة' : '⚠️  إجابة غير دقيقة'}`);
          
          if (evaluation.matchedKeywords.length > 0) {
            console.log(`   🎯 كلمات مطابقة: ${evaluation.matchedKeywords.join(', ')}`);
          }

          if (evaluation.isCorrect) {
            this.testResults.correctAnswers++;
          } else {
            this.testResults.incorrectAnswers++;
          }

          // حفظ التفاصيل
          this.testResults.details.push({
            questionNumber: i + 1,
            category: question.category,
            difficulty: question.difficulty,
            question: question.question,
            response: aiResponse.content,
            responseTime: responseTime,
            evaluation: evaluation,
            timestamp: new Date()
          });

        } else {
          console.log('   ❌ لم يتم الحصول على رد من AI');
          this.testResults.noAnswers++;
          
          this.testResults.details.push({
            questionNumber: i + 1,
            category: question.category,
            difficulty: question.difficulty,
            question: question.question,
            response: null,
            responseTime: responseTime,
            evaluation: { score: 0, isCorrect: false, reason: 'No response' },
            timestamp: new Date()
          });
        }

        this.testResults.questionsAsked++;

        // تأخير بين الأسئلة
        if (i < questions.length - 1) {
          await this.delay(CONFIG.DELAY_BETWEEN_QUESTIONS);
        }

      } catch (error) {
        console.error(`   ❌ خطأ في السؤال: ${error.message}`);
        this.testResults.noAnswers++;
        
        this.testResults.details.push({
          questionNumber: i + 1,
          category: question.category,
          difficulty: question.difficulty,
          question: question.question,
          response: null,
          error: error.message,
          evaluation: { score: 0, isCorrect: false, reason: 'Error' },
          timestamp: new Date()
        });
      }
    }

    // حساب متوسط وقت الرد
    if (responseTimes.length > 0) {
      this.testResults.averageResponseTime = 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    return true;
  }

  /**
   * 📈 المرحلة 4: توليد تقرير شامل
   */
  async generateReport() {
    console.log('\n📈 المرحلة 4: توليد تقرير النتائج...');
    console.log('═'.repeat(60));

    this.testResults.endTime = new Date();
    const duration = this.testResults.endTime - this.testResults.startTime;

    // حساب الإحصائيات
    const totalQuestions = this.testResults.questionsAsked;
    const successRate = totalQuestions > 0 
      ? (this.testResults.correctAnswers / totalQuestions * 100).toFixed(2)
      : 0;

    // تحليل حسب الفئة
    const categoryStats = {};
    this.testResults.details.forEach(detail => {
      if (!categoryStats[detail.category]) {
        categoryStats[detail.category] = {
          total: 0,
          correct: 0,
          incorrect: 0,
          noAnswer: 0,
          avgResponseTime: 0,
          responseTimes: []
        };
      }
      
      categoryStats[detail.category].total++;
      
      if (detail.evaluation.isCorrect) {
        categoryStats[detail.category].correct++;
      } else if (detail.response) {
        categoryStats[detail.category].incorrect++;
      } else {
        categoryStats[detail.category].noAnswer++;
      }
      
      if (detail.responseTime) {
        categoryStats[detail.category].responseTimes.push(detail.responseTime);
      }
    });

    // حساب متوسط وقت الرد لكل فئة
    Object.keys(categoryStats).forEach(category => {
      const times = categoryStats[category].responseTimes;
      if (times.length > 0) {
        categoryStats[category].avgResponseTime = 
          times.reduce((a, b) => a + b, 0) / times.length;
      }
    });

    // طباعة التقرير
    console.log('\n' + '═'.repeat(60));
    console.log('📊 تقرير اختبار ذكاء الـ AI - النتائج النهائية');
    console.log('═'.repeat(60));

    console.log(`\n🏢 معلومات الشركة:`);
    console.log(`   الاسم: ${this.testResults.company.name}`);
    console.log(`   البريد: ${this.testResults.company.email}`);
    console.log(`   عدد المنتجات: ${this.testResults.productsAnalyzed}`);

    console.log(`\n⏱️  معلومات الاختبار:`);
    console.log(`   وقت البدء: ${this.testResults.startTime.toLocaleString('ar-EG')}`);
    console.log(`   وقت الانتهاء: ${this.testResults.endTime.toLocaleString('ar-EG')}`);
    console.log(`   المدة الإجمالية: ${(duration / 1000).toFixed(2)} ثانية`);

    console.log(`\n📊 النتائج الإجمالية:`);
    console.log(`   إجمالي الأسئلة: ${totalQuestions}`);
    console.log(`   ✅ إجابات صحيحة: ${this.testResults.correctAnswers} (${successRate}%)`);
    console.log(`   ⚠️  إجابات غير دقيقة: ${this.testResults.incorrectAnswers}`);
    console.log(`   ❌ بدون إجابة: ${this.testResults.noAnswers}`);
    console.log(`   ⏱️  متوسط وقت الرد: ${this.testResults.averageResponseTime.toFixed(0)}ms`);

    console.log(`\n📋 النتائج حسب الفئة:`);
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const categorySuccessRate = stats.total > 0 
        ? (stats.correct / stats.total * 100).toFixed(2)
        : 0;
      
      console.log(`\n   📁 ${category}:`);
      console.log(`      إجمالي: ${stats.total} | صحيح: ${stats.correct} | خطأ: ${stats.incorrect} | بدون رد: ${stats.noAnswer}`);
      console.log(`      نسبة النجاح: ${categorySuccessRate}%`);
      console.log(`      متوسط وقت الرد: ${stats.avgResponseTime.toFixed(0)}ms`);
    });

    // عرض الأسئلة التي فشل فيها AI
    const failedQuestions = this.testResults.details.filter(d => !d.evaluation.isCorrect);
    if (failedQuestions.length > 0) {
      console.log(`\n⚠️  الأسئلة التي تحتاج تحسين (${failedQuestions.length}):`);
      failedQuestions.forEach((detail, idx) => {
        console.log(`\n   ${idx + 1}. "${detail.question}"`);
        console.log(`      الفئة: ${detail.category} | الصعوبة: ${detail.difficulty}`);
        if (detail.response) {
          console.log(`      الرد: "${detail.response.substring(0, 100)}..."`);
          console.log(`      السبب: ${detail.evaluation.reason || 'إجابة غير دقيقة'}`);
        } else {
          console.log(`      الرد: لا يوجد`);
        }
      });
    }

    // حفظ التقرير في ملف
    await this.saveReportToFile();

    console.log('\n' + '═'.repeat(60));
    console.log(`\n✅ تم إكمال الاختبار بنجاح!`);
    console.log(`📊 نسبة النجاح الإجمالية: ${successRate}%`);
    console.log(`📁 تم حفظ التقرير في: ${CONFIG.REPORT_PATH}\n`);

    return this.testResults;
  }

  /**
   * 💾 حفظ التقرير في ملف JSON
   */
  async saveReportToFile() {
    try {
      // إنشاء مجلد التقارير إذا لم يكن موجوداً
      if (!fs.existsSync(CONFIG.REPORT_PATH)) {
        fs.mkdirSync(CONFIG.REPORT_PATH, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ai-test-report-${timestamp}.json`;
      const filepath = path.join(CONFIG.REPORT_PATH, filename);

      fs.writeFileSync(filepath, JSON.stringify(this.testResults, null, 2), 'utf8');

      // حفظ نسخة HTML أيضاً
      const htmlReport = this.generateHTMLReport();
      const htmlFilename = `ai-test-report-${timestamp}.html`;
      const htmlFilepath = path.join(CONFIG.REPORT_PATH, htmlFilename);
      fs.writeFileSync(htmlFilepath, htmlReport, 'utf8');

      console.log(`\n💾 تم حفظ التقرير:`);
      console.log(`   JSON: ${filepath}`);
      console.log(`   HTML: ${htmlFilepath}`);

    } catch (error) {
      console.error('❌ خطأ في حفظ التقرير:', error.message);
    }
  }

  /**
   * 📄 توليد تقرير HTML
   */
  generateHTMLReport() {
    const successRate = this.testResults.questionsAsked > 0 
      ? (this.testResults.correctAnswers / this.testResults.questionsAsked * 100).toFixed(2)
      : 0;

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير اختبار ذكاء الـ AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-right: 4px solid #667eea; }
    .stat-card h3 { color: #666; font-size: 14px; margin-bottom: 10px; }
    .stat-card .value { font-size: 32px; font-weight: bold; color: #333; }
    .section { margin: 30px 0; }
    .section h2 { color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
    .question-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-right: 4px solid #28a745; }
    .question-item.incorrect { border-right-color: #ffc107; }
    .question-item.no-answer { border-right-color: #dc3545; }
    .question-item h4 { color: #333; margin-bottom: 8px; }
    .question-item p { color: #666; margin: 5px 0; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 5px; }
    .badge.success { background: #28a745; color: white; }
    .badge.warning { background: #ffc107; color: #333; }
    .badge.danger { background: #dc3545; color: white; }
    .progress-bar { width: 100%; height: 30px; background: #e9ecef; border-radius: 15px; overflow: hidden; margin: 10px 0; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745 0%, #20c997 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 تقرير اختبار ذكاء الـ AI</h1>
      <p>تم إنشاء التقرير في: ${new Date().toLocaleString('ar-EG')}</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>📊 النتائج الإجمالية</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>إجمالي الأسئلة</h3>
            <div class="value">${this.testResults.questionsAsked}</div>
          </div>
          <div class="stat-card">
            <h3>إجابات صحيحة</h3>
            <div class="value" style="color: #28a745;">${this.testResults.correctAnswers}</div>
          </div>
          <div class="stat-card">
            <h3>إجابات غير دقيقة</h3>
            <div class="value" style="color: #ffc107;">${this.testResults.incorrectAnswers}</div>
          </div>
          <div class="stat-card">
            <h3>بدون إجابة</h3>
            <div class="value" style="color: #dc3545;">${this.testResults.noAnswers}</div>
          </div>
          <div class="stat-card">
            <h3>متوسط وقت الرد</h3>
            <div class="value">${this.testResults.averageResponseTime.toFixed(0)}<span style="font-size: 16px;">ms</span></div>
          </div>
          <div class="stat-card">
            <h3>نسبة النجاح</h3>
            <div class="value" style="color: ${successRate >= 70 ? '#28a745' : successRate >= 50 ? '#ffc107' : '#dc3545'};">${successRate}%</div>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${successRate}%;">${successRate}%</div>
        </div>
      </div>

      <div class="section">
        <h2>🏢 معلومات الشركة</h2>
        <p><strong>الاسم:</strong> ${this.testResults.company.name}</p>
        <p><strong>البريد:</strong> ${this.testResults.company.email}</p>
        <p><strong>عدد المنتجات المحللة:</strong> ${this.testResults.productsAnalyzed}</p>
      </div>

      <div class="section">
        <h2>📋 تفاصيل الأسئلة والأجوبة</h2>
        ${this.testResults.details.map(detail => `
          <div class="question-item ${detail.evaluation.isCorrect ? '' : detail.response ? 'incorrect' : 'no-answer'}">
            <h4>
              ${detail.questionNumber}. ${detail.question}
              ${detail.evaluation.isCorrect ? '<span class="badge success">✓ صحيح</span>' : 
                detail.response ? '<span class="badge warning">⚠ غير دقيق</span>' : 
                '<span class="badge danger">✗ بدون رد</span>'}
            </h4>
            <p><strong>الفئة:</strong> ${detail.category} | <strong>الصعوبة:</strong> ${detail.difficulty}</p>
            ${detail.response ? `<p><strong>الرد:</strong> ${detail.response}</p>` : '<p><strong>الرد:</strong> لم يتم الحصول على رد</p>'}
            <p><strong>وقت الرد:</strong> ${detail.responseTime}ms | <strong>التقييم:</strong> ${detail.evaluation.score}/100</p>
            ${detail.evaluation.reason ? `<p><strong>السبب:</strong> ${detail.evaluation.reason}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 🔧 دوال مساعدة
   */

  getRandomProducts(count) {
    const shuffled = [...this.products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async createTestConversation() {
    try {
      // إنشاء عميل اختبار
      let testCustomer = await getSharedPrismaClient().customer.findFirst({
        where: {
          companyId: this.companyId,
          phone: 'AI_TEST_CUSTOMER'
        }
      });

      if (!testCustomer) {
        testCustomer = await getSharedPrismaClient().customer.create({
          data: {
            companyId: this.companyId,
            firstName: 'عميل اختبار AI',
            lastName: 'Test Customer',
            phone: 'AI_TEST_CUSTOMER',
            email: `ai-test-${Date.now()}@test.com`
          }
        });
      }

      // إنشاء محادثة
      const conversation = await getSharedPrismaClient().conversation.create({
        data: {
          companyId: this.companyId,
          customerId: testCustomer.id,
          channel: 'TEST',
          status: 'ACTIVE',
          lastMessageAt: new Date(),
          lastMessagePreview: 'اختبار ذكاء AI',
          metadata: JSON.stringify({ aiEnabled: true, testMode: true })
        }
      });

      return conversation;
    } catch (error) {
      console.error('خطأ في إنشاء محادثة اختبار:', error);
      return null;
    }
  }

  async sendMessageToAI(conversationId, messageContent) {
    try {
      const aiAgentService = require('../services/aiAgentService');
      
      // الحصول على بيانات العميل
      const conversation = await getSharedPrismaClient().conversation.findUnique({
        where: { id: conversationId },
        include: { customer: true }
      });

      if (!conversation) {
        throw new Error('المحادثة غير موجودة');
      }

      // إعداد بيانات الرسالة
      const messageData = {
        conversationId: conversationId,
        senderId: conversation.customer.id,
        content: messageContent,
        attachments: [],
        companyId: this.companyId,
        customerData: {
          id: conversation.customer.id,
          name: `${conversation.customer.firstName} ${conversation.customer.lastName}`,
          phone: conversation.customer.phone,
          email: conversation.customer.email,
          orderCount: 0,
          companyId: this.companyId
        }
      };

      // إرسال للـ AI
      const aiResponse = await aiAgentService.processCustomerMessage(messageData);

      // حفظ الرسالة والرد في قاعدة البيانات
      await getSharedPrismaClient().message.create({
        data: {
          conversationId: conversationId,
          content: messageContent,
          type: 'TEXT',
          isFromCustomer: true,
          createdAt: new Date()
        }
      });

      if (aiResponse && aiResponse.content) {
        await getSharedPrismaClient().message.create({
          data: {
            conversationId: conversationId,
            content: aiResponse.content,
            type: 'TEXT',
            isFromCustomer: false,
            createdAt: new Date()
          }
        });
      }

      return aiResponse;
    } catch (error) {
      console.error('خطأ في إرسال رسالة للـ AI:', error);
      throw error;
    }
  }

  evaluateResponse(question, response) {
    let score = 0;
    let matchedKeywords = [];
    let reason = '';

    if (!response || response.length < 5) {
      return {
        score: 0,
        isCorrect: false,
        matchedKeywords: [],
        reason: 'رد قصير جداً أو فارغ'
      };
    }

    const responseLower = response.toLowerCase();

    // فحص الكلمات المفتاحية المتوقعة
    if (question.expectedKeywords && question.expectedKeywords.length > 0) {
      question.expectedKeywords.forEach(keyword => {
        if (keyword && responseLower.includes(keyword.toString().toLowerCase())) {
          score += 30;
          matchedKeywords.push(keyword);
        }
      });
    }

    // فحص الإجابة المتوقعة المحددة
    if (question.expectedAnswer !== undefined) {
      const expectedStr = question.expectedAnswer.toString().toLowerCase();
      if (responseLower.includes(expectedStr)) {
        score += 40;
      }
    }

    // فحص اسم المنتج (إذا كان السؤال عن منتج محدد)
    if (question.productName) {
      if (responseLower.includes(question.productName.toLowerCase())) {
        score += 20;
      }
    }

    // فحص طول الرد (يجب أن يكون معقولاً)
    if (response.length >= 20 && response.length <= 500) {
      score += 10;
    }

    // تحديد ما إذا كانت الإجابة صحيحة
    const isCorrect = score >= 50;

    if (!isCorrect) {
      if (matchedKeywords.length === 0) {
        reason = 'لم يتم العثور على الكلمات المفتاحية المتوقعة';
      } else if (score < 50) {
        reason = 'الرد غير كامل أو غير دقيق';
      }
    }

    return {
      score: Math.min(score, 100),
      isCorrect: isCorrect,
      matchedKeywords: matchedKeywords,
      reason: reason
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🚀 تشغيل الاختبار الكامل
   */
  async runFullTest() {
    try {
      console.log('\n🚀 بدء اختبار ذكاء الـ AI الشامل...');
      console.log('═'.repeat(60));

      // المرحلة 0: تسجيل الدخول
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('فشل تسجيل الدخول');
      }

      // المرحلة 1: تحليل البيانات
      const analyzeSuccess = await this.analyzeCompanyData();
      if (!analyzeSuccess) {
        throw new Error('فشل تحليل البيانات');
      }

      // المرحلة 2: توليد الأسئلة
      const questions = this.generateTestQuestions();
      if (questions.length === 0) {
        throw new Error('فشل توليد الأسئلة');
      }

      // المرحلة 3: اختبار AI
      const testSuccess = await this.testAIResponses(questions);
      if (!testSuccess) {
        throw new Error('فشل اختبار AI');
      }

      // المرحلة 4: توليد التقرير
      await this.generateReport();

      return this.testResults;

    } catch (error) {
      console.error('\n❌ خطأ في الاختبار:', error.message);
      console.error(error.stack);
      throw error;
    }
  }
}

// تشغيل الاختبار
if (require.main === module) {
  const tester = new AIIntelligenceTester();
  
  tester.runFullTest()
    .then((results) => {
      console.log('\n✅ تم إكمال الاختبار بنجاح!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ فشل الاختبار:', error.message);
      process.exit(1);
    });
}

module.exports = AIIntelligenceTester;
