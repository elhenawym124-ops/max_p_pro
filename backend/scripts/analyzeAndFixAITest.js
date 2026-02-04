/**
 * سكريبت متقدم لإرسال أسئلة اختبار تلقائياً
 * وتحليل الردود وحل المشاكل المكتشفة
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const testQuestionGenerator = require('../services/testQuestionGenerator');
const aiAgentService = require('../services/aiAgentService');

class AIAnalyzerAndFixer {
  constructor() {
    this.prisma = getSharedPrismaClient();
    this.companyId = null;
    this.conversationId = null;
    this.testCustomerId = null;
    this.analysisResults = {
      totalQuestions: 0,
      analyzed: 0,
      problems: [],
      fixes: [],
      improvements: []
    };
  }

  /**
   * تهيئة النظام
   */
  async initialize() {
    try {
      console.log('\n🔧 تهيئة النظام...\n');

      // إذا كان companyId محدداً مسبقاً، استخدمه
      if (this.companyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: this.companyId },
          select: { id: true, name: true, email: true, isActive: true }
        });

        if (!company) {
          throw new Error(`الشركة ${this.companyId} غير موجودة`);
        }

        if (!company.isActive) {
          throw new Error(`الشركة ${company.name} غير نشطة`);
        }

        console.log(`✅ استخدام الشركة: ${company.name}`);
      } else {
        // البحث عن شركة التسويق
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

        if (!company) {
          const firstCompany = await this.prisma.company.findFirst({
            where: { isActive: true }
          });
          if (!firstCompany) {
            throw new Error('لا توجد شركات نشطة');
          }
          this.companyId = firstCompany.id;
          console.log(`✅ استخدام الشركة: ${firstCompany.name}`);
        } else {
          this.companyId = company.id;
          console.log(`✅ تم العثور على الشركة: ${company.name}`);
        }
      }

      // إنشاء أو جلب customer اختبار
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
            id: crypto.randomUUID(),
            updatedAt: new Date(),
            companyId: this.companyId,
            firstName: 'عميل اختبار',
            lastName: 'Test Customer',
            phone: '0000000000',
            email: `test-${this.companyId}@test.com`
          }
        });
      }
      this.testCustomerId = testCustomer.id;

      // Ensure AI keys exist
      const aiKeys = await this.prisma.aiKey.findMany({ where: { companyId: this.companyId, isActive: true } });
      if (aiKeys.length === 0) {
        console.log(`No active AI keys found for company ${this.companyId}. Creating a default Google key...`);
        const newKey = await this.prisma.aiKey.create({
          data: {
            id: crypto.randomUUID(),
            companyId: this.companyId,
            name: "Default Google Key",
            provider: "GOOGLE",
            apiKey: process.env.GEMINI_API_KEY || "DUMMY_KEY_FOR_TESTING",
            keyType: "CENTRAL",
            usage: "{}",
            maxRequestsPerDay: 1500,
            priority: 1,
            updatedAt: new Date()
          },
        });

        // Create Model Config
        await this.prisma.aiModelConfig.create({
          data: {
            id: crypto.randomUUID(),
            keyId: newKey.id,
            modelName: "gemini-1.5-flash",
            isEnabled: true,
            priority: 1,
            usage: "{}",
            updatedAt: new Date()
          }
        });
        console.log('Default Google AI key and Model Config created.');
      }

      // Ensure AI Settings are enabled
      await this.prisma.aiSettings.upsert({
        where: { companyId: this.companyId },
        update: {
          autoReplyEnabled: true,
        },
        create: {
          id: crypto.randomUUID(),
          companyId: this.companyId,
          autoReplyEnabled: true,
          updatedAt: new Date()
        }
      });
      console.log('AI Settings enabled for company.');

      // إنشاء محادثة
      const conversation = await this.prisma.conversation.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          companyId: this.companyId,
          customerId: this.testCustomerId,
          channel: 'TEST',
          status: 'ACTIVE',
          lastMessageAt: new Date(),
          lastMessagePreview: 'تحليل شامل للذكاء الاصطناعي'
        }
      });
      this.conversationId = conversation.id;
      console.log(`✅ تم إنشاء المحادثة: ${conversation.id}\n`);

      return true;
    } catch (error) {
      console.error('❌ خطأ في التهيئة:', error.message);
      throw error;
    }
  }

  /**
   * تحليل رد واحد بالتفصيل
   */
  async analyzeResponse(question, response, questionData) {
    const analysis = {
      question: question,
      questionData: questionData,
      response: response,
      problems: [],
      severity: 'none', // none, low, medium, high, critical
      score: 0,
      recommendations: []
    };

    // 1. فحص وجود رد
    if (!response || !response.content) {
      analysis.problems.push({
        type: 'no_response',
        severity: 'high',
        message: 'لا يوجد رد من AI',
        fix: 'تحقق من إعدادات AI ومفتاح Gemini'
      });
      analysis.severity = 'high';
      analysis.score = 0;
      return analysis;
    }

    const content = response.content;
    analysis.score = 100; // نقاط أولية

    // 2. فحص طول الرد
    if (content.length < 10) {
      analysis.problems.push({
        type: 'too_short',
        severity: 'medium',
        message: `الرد قصير جداً (${content.length} حرف)`,
        fix: 'تحسين prompt لطلب ردود أطول'
      });
      analysis.score -= 20;
      analysis.severity = analysis.severity === 'none' ? 'medium' : analysis.severity;
    } else if (content.length > 2000) {
      analysis.problems.push({
        type: 'too_long',
        severity: 'low',
        message: `الرد طويل جداً (${content.length} حرف)`,
        fix: 'إضافة حد أقصى لطول الرد في الإعدادات'
      });
      analysis.score -= 10;
    }

    // 3. فحص الـ intent
    if (questionData && questionData.intent) {
      const expectedIntent = questionData.intent;
      const detectedIntent = response.intent;

      if (!detectedIntent) {
        analysis.problems.push({
          type: 'no_intent',
          severity: 'medium',
          message: 'لم يتم اكتشاف intent',
          fix: 'تحسين intent analyzer'
        });
        analysis.score -= 15;
      } else if (detectedIntent !== expectedIntent) {
        analysis.problems.push({
          type: 'wrong_intent',
          severity: 'high',
          message: `الـ intent المتوقع: ${expectedIntent}, المكتشف: ${detectedIntent}`,
          fix: 'تحسين intent analyzer للتعرف على هذا النوع من الأسئلة'
        });
        analysis.score -= 30;
        analysis.severity = 'high';
      }
    }

    // 4. فحص مناسبة الرد للـ intent
    if (questionData && questionData.intent) {
      const isAppropriate = this.checkIntentAppropriateness(
        questionData.intent,
        content,
        question
      );

      if (!isAppropriate) {
        analysis.problems.push({
          type: 'inappropriate_response',
          severity: 'high',
          message: 'الرد غير مناسب للـ intent',
          fix: 'تحسين prompts لـ intent محدد'
        });
        analysis.score -= 25;
        analysis.severity = analysis.severity === 'none' ? 'high' : analysis.severity;
      }
    }

    // 5. فحص المشاعر
    if (!response.sentiment) {
      analysis.problems.push({
        type: 'no_sentiment',
        severity: 'low',
        message: 'لم يتم تحليل المشاعر',
        fix: 'تفعيل sentiment analysis'
      });
      analysis.score -= 5;
    }

    // 6. فحص الثقة
    if (response.confidence && response.confidence < 0.5) {
      analysis.problems.push({
        type: 'low_confidence',
        severity: 'medium',
        message: `ثقة منخفضة (${(response.confidence * 100).toFixed(1)}%)`,
        fix: 'تحسين prompts لزيادة الثقة'
      });
      analysis.score -= 15;
    }

    // 7. فحص وقت المعالجة
    if (response.processingTime && response.processingTime > 10000) {
      analysis.problems.push({
        type: 'slow_processing',
        severity: 'medium',
        message: `وقت معالجة بطيء (${response.processingTime}ms)`,
        fix: 'تحسين الأداء أو استخدام نموذج أسرع'
      });
      analysis.score -= 10;
    }

    // 8. فحص وجود كلمات خطأ
    if (content.toLowerCase().includes('error') &&
      !content.toLowerCase().includes('sorry') &&
      !content.toLowerCase().includes('عذراً')) {
      analysis.problems.push({
        type: 'error_in_response',
        severity: 'high',
        message: 'يحتوي الرد على كلمة "error"',
        fix: 'معالجة الأخطاء بشكل أفضل'
      });
      analysis.score -= 20;
      analysis.severity = 'high';
    }

    // 9. فحص محتوى الرد حسب نوع السؤال
    const contentAnalysis = this.analyzeContentQuality(questionData, content, question);
    if (contentAnalysis.problems.length > 0) {
      analysis.problems.push(...contentAnalysis.problems);
      analysis.score -= contentAnalysis.scoreReduction;
      if (contentAnalysis.severity === 'high' && analysis.severity !== 'critical') {
        analysis.severity = 'high';
      }
    }

    // 10. إنشاء التوصيات
    analysis.recommendations = this.generateRecommendations(analysis.problems, questionData);

    // تحديث severity بناءً على النقاط
    if (analysis.score < 50) {
      analysis.severity = 'critical';
    } else if (analysis.score < 70) {
      analysis.severity = analysis.severity === 'none' ? 'high' : analysis.severity;
    } else if (analysis.score < 85) {
      analysis.severity = analysis.severity === 'none' ? 'medium' : analysis.severity;
    }

    return analysis;
  }

  /**
   * فحص مناسبة الرد للـ intent
   */
  checkIntentAppropriateness(intent, response, question) {
    const lowerResponse = response.toLowerCase();
    const lowerQuestion = question.toLowerCase();

    switch (intent) {
      case 'greeting':
        const greetings = ['السلام', 'أهلاً', 'مرحبا', 'مرحب', 'أهلين', 'هاي', 'hello', 'hi'];
        return greetings.some(g => lowerResponse.includes(g.toLowerCase()));

      case 'product_inquiry':
        const productKeywords = ['منتج', 'منتجات', 'عندنا', 'متوفر', 'عرض', 'product'];
        const clarificationKeywords = ['ممكن', 'يمكنك', 'أخبرني', 'ماذا', 'which', 'what'];
        return productKeywords.some(k => lowerResponse.includes(k.toLowerCase())) ||
          (clarificationKeywords.some(k => lowerResponse.includes(k.toLowerCase())) &&
            (lowerQuestion.includes('منتج') || lowerQuestion.includes('product')));

      case 'price_inquiry':
        const priceKeywords = ['سعر', 'بكام', 'بكم', 'ثمن', 'جنيه', 'ريال', 'price', 'cost'];
        const productClarification = ['أي منتج', 'أي شيء', 'ماذا تريد', 'which product'];
        return priceKeywords.some(k => lowerResponse.includes(k.toLowerCase())) ||
          productClarification.some(k => lowerResponse.includes(k.toLowerCase()));

      case 'shipping_inquiry':
        const shippingKeywords = ['شحن', 'توصيل', 'وقت', 'shipping', 'delivery', 'time'];
        return shippingKeywords.some(k => lowerResponse.includes(k.toLowerCase()));

      case 'order_inquiry':
        const orderKeywords = ['طلب', 'أطلب', 'شراء', 'أشتري', 'order', 'purchase', 'buy'];
        const orderClarification = ['أي منتج', 'ماذا', 'which', 'what'];
        return orderKeywords.some(k => lowerResponse.includes(k.toLowerCase())) ||
          orderClarification.some(k => lowerResponse.includes(k.toLowerCase()));

      default:
        return response.length > 10 && !lowerResponse.includes('error');
    }
  }

  /**
   * تحليل جودة المحتوى
   */
  analyzeContentQuality(questionData, response, question) {
    const result = {
      problems: [],
      scoreReduction: 0,
      severity: 'none'
    };

    if (!questionData) return result;

    // فحص للأسئلة عن المنتجات
    if (questionData.intent === 'product_inquiry') {
      // يجب أن يذكر المنتجات أو يطلب توضيح
      if (!this.containsProductMention(response) &&
        !this.asksForClarification(response)) {
        result.problems.push({
          type: 'missing_product_info',
          severity: 'high',
          message: 'الرد لا يذكر المنتجات أو يطلب توضيح',
          fix: 'تحسين prompts لطلب معلومات المنتجات'
        });
        result.scoreReduction += 20;
        result.severity = 'high';
      }
    }

    // فحص للأسئلة عن الأسعار
    if (questionData.intent === 'price_inquiry') {
      // يجب أن يذكر السعر أو يطلب تحديد المنتج
      if (!this.containsPriceMention(response) &&
        !this.asksForProductClarification(response)) {
        result.problems.push({
          type: 'missing_price_info',
          severity: 'high',
          message: 'الرد لا يذكر السعر أو يطلب تحديد المنتج',
          fix: 'تحسين prompts لطلب معلومات الأسعار'
        });
        result.scoreReduction += 20;
        result.severity = 'high';
      }
    }

    // فحص للأسئلة عن الشحن
    if (questionData.intent === 'shipping_inquiry') {
      if (!this.containsShippingMention(response)) {
        result.problems.push({
          type: 'missing_shipping_info',
          severity: 'medium',
          message: 'الرد لا يذكر معلومات الشحن',
          fix: 'تحسين prompts لطلب معلومات الشحن'
        });
        result.scoreReduction += 15;
      }
    }

    return result;
  }

  /**
   * فحص إذا كان الرد يذكر المنتجات
   */
  containsProductMention(response) {
    const keywords = ['منتج', 'منتجات', 'عندنا', 'متوفر', 'available', 'product'];
    return keywords.some(k => response.toLowerCase().includes(k.toLowerCase()));
  }

  /**
   * فحص إذا كان الرد يطلب توضيح
   */
  asksForClarification(response) {
    const keywords = ['ممكن', 'يمكنك', 'أخبرني', 'ماذا', 'which', 'what', 'could', 'please'];
    return keywords.some(k => response.toLowerCase().includes(k.toLowerCase()));
  }

  /**
   * فحص إذا كان الرد يذكر السعر
   */
  containsPriceMention(response) {
    const keywords = ['سعر', 'بكام', 'بكم', 'ثمن', 'جنيه', 'ريال', 'price', 'cost'];
    return keywords.some(k => response.toLowerCase().includes(k.toLowerCase()));
  }

  /**
   * فحص إذا كان الرد يطلب توضيح المنتج
   */
  asksForProductClarification(response) {
    const keywords = ['أي منتج', 'أي شيء', 'ماذا تريد', 'which product', 'what product'];
    return keywords.some(k => response.toLowerCase().includes(k.toLowerCase()));
  }

  /**
   * فحص إذا كان الرد يذكر الشحن
   */
  containsShippingMention(response) {
    const keywords = ['شحن', 'توصيل', 'وقت', 'shipping', 'delivery'];
    return keywords.some(k => response.toLowerCase().includes(k.toLowerCase()));
  }

  /**
   * إنشاء التوصيات
   */
  generateRecommendations(problems, questionData) {
    const recommendations = [];

    problems.forEach(problem => {
      if (problem.fix && !recommendations.includes(problem.fix)) {
        recommendations.push(problem.fix);
      }
    });

    // توصيات عامة
    if (problems.some(p => p.type === 'wrong_intent')) {
      recommendations.push('تحسين intent analyzer بإضافة المزيد من الأمثلة');
    }

    if (problems.some(p => p.type === 'inappropriate_response')) {
      recommendations.push('تحسين system prompts لتكون أكثر تحديداً لكل intent');
    }

    if (problems.some(p => p.type === 'too_short')) {
      recommendations.push('إضافة minimum response length في الإعدادات');
    }

    return recommendations;
  }

  /**
   * محاولة حل المشاكل المكتشفة
   */
  async fixProblems(problems, questionData) {
    const fixes = [];

    for (const problem of problems) {
      try {
        // محاولة حل المشكلة حسب نوعها
        switch (problem.type) {
          case 'no_response':
            // التحقق من إعدادات AI
            const aiSettings = await this.prisma.aiSettings.findUnique({
              where: { companyId: this.companyId }
            });
            if (!aiSettings || !aiSettings.autoReplyEnabled) {
              fixes.push({
                problem: problem.type,
                action: 'enable_auto_reply',
                message: 'تفعيل الرد التلقائي في إعدادات AI'
              });
            }
            break;

          case 'wrong_intent':
            fixes.push({
              problem: problem.type,
              action: 'improve_intent_analyzer',
              message: 'تحسين intent analyzer بإضافة المزيد من الأمثلة',
              details: {
                expectedIntent: questionData?.intent,
                detectedIntent: problem.message
              }
            });
            break;

          case 'inappropriate_response':
            fixes.push({
              problem: problem.type,
              action: 'improve_prompts',
              message: 'تحسين system prompts للـ intent',
              details: {
                intent: questionData?.intent
              }
            });
            break;

          case 'too_short':
            fixes.push({
              problem: problem.type,
              action: 'set_min_length',
              message: 'إضافة minimum response length في الإعدادات'
            });
            break;

          case 'slow_processing':
            fixes.push({
              problem: problem.type,
              action: 'optimize_performance',
              message: 'تحسين الأداء أو استخدام نموذج أسرع'
            });
            break;
        }
      } catch (error) {
        console.error(`❌ خطأ في حل المشكلة ${problem.type}:`, error.message);
      }
    }

    return fixes;
  }

  /**
   * إرسال سؤال واحد وتحليله
   */
  async sendAndAnalyzeQuestion(question, questionData, questionNumber, options = {}) {
    const maxRetries = options.maxRetries || 2;
    const timeout = options.timeout || 60000; // 60 second timeout
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📨 السؤال ${questionNumber}: "${question}"`);
        console.log(`   النوع: ${questionData?.intent || 'غير محدد'} | الصعوبة: ${questionData?.difficulty || 'غير محدد'}`);
        if (attempt > 1) {
          console.log(`   🔄 محاولة ${attempt}/${maxRetries}`);
        }
        console.log(`${'='.repeat(70)}\n`);

        // التحقق من صحة البيانات
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
          throw new Error('السؤال غير صالح');
        }

        if (!this.conversationId || !this.testCustomerId || !this.companyId) {
          throw new Error('بيانات النظام غير مكتملة');
        }

        // حفظ رسالة المستخدم
        let userMessage;
        try {
          userMessage = await this.prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              conversationId: this.conversationId,
              content: question.trim(),
              type: 'TEXT',
              isFromCustomer: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        } catch (dbError) {
          // تسجيل خطأ قاعدة البيانات بشكل مفصل
          console.error(`❌ خطأ في حفظ الرسالة (Database Error):`, {
            message: dbError.message,
            code: dbError.code,
            meta: dbError.meta
          });
          // نتابع حتى لو فشل حفظ الرسالة - هذا لا يمنع الاختبار
        }

        // إرسال الرسالة للـ AI
        const messageData = {
          conversationId: this.conversationId,
          senderId: this.testCustomerId,
          content: question.trim(),
          attachments: [],
          companyId: this.companyId,
          customerData: {
            id: this.testCustomerId,
            name: 'عميل اختبار Test Customer',
            phone: '0000000000',
            email: `test-${this.companyId}@test.com`,
            orderCount: 0,
            companyId: this.companyId
          }
        };

        const startTime = Date.now();
        let aiResponse = null;
        let error = null;

        try {
          // إضافة timeout للطلب
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: تجاوز الوقت المحدد للمعالجة')), timeout);
          });

          aiResponse = await Promise.race([
            aiAgentService.processCustomerMessage(messageData),
            timeoutPromise
          ]);

          const processingTime = Date.now() - startTime;

          if (aiResponse && aiResponse.content) {
            // حفظ رد AI
            try {
              await this.prisma.message.create({
                data: {
                  conversationId: this.conversationId,
                  content: aiResponse.content,
                  type: 'TEXT',
                  isFromCustomer: false,
                  createdAt: new Date()
                }
              });
            } catch (dbError) {
              // تسجيل خطأ قاعدة البيانات بشكل مفصل
              console.error(`⚠️  خطأ في حفظ رد AI (Database Error):`, {
                message: dbError.message,
                code: dbError.code,
                meta: dbError.meta
              });
              // نتابع حتى لو فشل حفظ الرد - هذا لا يمنع التحليل
            }

            aiResponse.processingTime = processingTime;

            console.log(`✅ تم الحصول على رد`);
            console.log(`   ⏱️  وقت المعالجة: ${processingTime}ms`);
            console.log(`   🎯 Intent: ${aiResponse.intent || 'غير محدد'}`);
            console.log(`   😊 Sentiment: ${aiResponse.sentiment || 'غير محدد'}`);
            console.log(`   📊 Confidence: ${aiResponse.confidence ? (aiResponse.confidence * 100).toFixed(1) + '%' : 'غير محدد'}`);
            console.log(`   🤖 Model: ${aiResponse.model || 'غير محدد'}`);
            console.log(`\n   💬 الرد:\n   "${aiResponse.content.substring(0, 200)}${aiResponse.content.length > 200 ? '...' : ''}"\n`);

            // تحليل الرد
            console.log('🔍 جاري تحليل الرد...\n');
            const analysis = await this.analyzeResponse(question, aiResponse, questionData);

            // عرض نتائج التحليل
            console.log(`📊 نتائج التحليل:`);
            console.log(`   النقاط: ${analysis.score}/100`);
            console.log(`   الخطورة: ${this.getSeverityLabel(analysis.severity)}`);

            if (analysis.problems.length > 0) {
              console.log(`\n   ⚠️  المشاكل المكتشفة (${analysis.problems.length}):`);
              analysis.problems.forEach((problem, idx) => {
                console.log(`      ${idx + 1}. [${this.getSeverityLabel(problem.severity)}] ${problem.message}`);
                if (problem.fix) {
                  console.log(`         💡 الحل: ${problem.fix}`);
                }
              });

              // محاولة حل المشاكل
              console.log(`\n   🔧 محاولة حل المشاكل...`);
              const fixes = await this.fixProblems(analysis.problems, questionData);

              if (fixes.length > 0) {
                console.log(`   ✅ تم تحديد ${fixes.length} حل:`);
                fixes.forEach((fix, idx) => {
                  console.log(`      ${idx + 1}. ${fix.message}`);
                });
                this.analysisResults.fixes.push(...fixes);
              }
            } else {
              console.log(`   ✅ لا توجد مشاكل - الرد جيد!`);
            }

            if (analysis.recommendations.length > 0) {
              console.log(`\n   💡 التوصيات:`);
              analysis.recommendations.forEach((rec, idx) => {
                console.log(`      ${idx + 1}. ${rec}`);
              });
              this.analysisResults.improvements.push(...analysis.recommendations);
            }

            this.analysisResults.analyzed++;
            if (analysis.problems.length > 0) {
              this.analysisResults.problems.push({
                question: question,
                questionData: questionData,
                analysis: analysis
              });
            }

            // نجحت المحاولة - break من الـ loop
            return { success: true, analysis: analysis, response: aiResponse };
          } else if (aiResponse && aiResponse.silent) {
            console.log(`🤐 النظام صامت - لا يوجد رد`);
            this.analysisResults.problems.push({
              question: question,
              questionData: questionData,
              problem: 'silent_response',
              message: 'النظام اختار عدم الرد'
            });
            // النظام صامت - لا نعيد المحاولة
            return { success: false, silent: true };
          } else {
            console.log(`❌ لا يوجد رد`);
            error = 'No response from AI';
            lastError = error;
          }
        } catch (aiError) {
          // تحديد نوع الخطأ ومعالجته بشكل مفصل
          if (aiError.message && (aiError.message.includes('Timeout') || aiError.message.includes('timeout'))) {
            error = `Timeout: ${aiError.message}`;
            console.error(`⏱️  Timeout في معالجة AI (المحاولة ${attempt}/${maxRetries}):`, {
              error: error,
              timeout: timeout,
              message: aiError.message
            });
          } else if (aiError.code === 'ECONNREFUSED' || aiError.code === 'ENOTFOUND') {
            error = `Connection Error: ${aiError.message}`;
            console.error(`🔌 خطأ في الاتصال (المحاولة ${attempt}/${maxRetries}):`, {
              error: error,
              code: aiError.code,
              message: aiError.message
            });
          } else if (aiError.response || aiError.status) {
            error = `API Error: ${aiError.message || 'Unknown API error'}`;
            console.error(`🌐 خطأ في API (المحاولة ${attempt}/${maxRetries}):`, {
              error: error,
              status: aiError.status,
              response: aiError.response?.data,
              message: aiError.message
            });
          } else {
            error = aiError.message || 'Unknown AI error';
            console.error(`❌ خطأ في معالجة AI (المحاولة ${attempt}/${maxRetries}):`, {
              error: error,
              message: aiError.message,
              stack: aiError.stack?.substring(0, 200)
            });
          }
          lastError = error;
        }

        // إذا حدث خطأ ولم نكن في آخر محاولة، ننتظر ثم نعيد المحاولة
        if (error && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // exponential backoff (max 5 seconds)
          console.log(`⏳ انتظار ${delay}ms قبل إعادة المحاولة...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // إعادة المحاولة
        }
      } catch (outerError) {
        // خطأ في البيانات أو النظام - لا نعيد المحاولة
        console.error(`❌ خطأ في البيانات أو النظام (المحاولة ${attempt}/${maxRetries}):`, {
          error: outerError.message,
          type: outerError.constructor.name,
          stack: outerError.stack?.substring(0, 300)
        });
        lastError = outerError.message || 'Unknown system error';
        // لا نعيد المحاولة للأخطاء في البيانات أو النظام
        break;
      }
    }

    // إذا وصلنا هنا، فشلت جميع المحاولات
    if (lastError) {
      const problemEntry = {
        question: question,
        questionData: questionData,
        problem: 'processing_error',
        message: lastError,
        attempts: maxRetries,
        timestamp: new Date().toISOString()
      };

      this.analysisResults.problems.push(problemEntry);

      console.error(`❌ فشلت جميع المحاولات (${maxRetries}) للسؤال: "${question}"`);
      console.error(`   الخطأ: ${lastError}`);

      return {
        success: false,
        error: lastError,
        attempts: maxRetries,
        question: question,
        questionData: questionData
      };
    }

    // حالة غير متوقعة - لا يوجد خطأ مسجل
    console.error(`⚠️  حالة غير متوقعة: لا يوجد رد ولا يوجد خطأ مسجل`);
    return { success: false, error: 'Unknown error: No response and no error recorded' };
  }

  /**
   * الحصول على تسمية الخطورة
   */
  getSeverityLabel(severity) {
    const labels = {
      'none': '✅ لا توجد',
      'low': '🟡 منخفضة',
      'medium': '🟠 متوسطة',
      'high': '🔴 عالية',
      'critical': '🚨 حرجة'
    };
    return labels[severity] || severity;
  }

  /**
   * تشغيل التحليل الكامل
   */
  async runFullAnalysis() {
    try {
      console.log('╔══════════════════════════════════════════════════════════════════╗');
      console.log('║     نظام تحليل وإصلاح الذكاء الاصطناعي - AI Analyzer & Fixer  ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝\n');

      // 1. التهيئة
      await this.initialize();

      // 2. جلب الأسئلة
      console.log('📋 جلب أسئلة الاختبار...\n');
      const testQuestionsData = await testQuestionGenerator.generateTestQuestions(this.companyId);

      // جمع أسئلة من أنواع مختلفة
      const questions = [
        ...testQuestionsData.questions.greeting.slice(0, 3),
        ...testQuestionsData.questions.product_inquiry.slice(0, 5),
        ...testQuestionsData.questions.price_inquiry.slice(0, 4),
        ...testQuestionsData.questions.shipping_inquiry.slice(0, 2),
        ...testQuestionsData.questions.order_inquiry.slice(0, 3),
        ...testQuestionsData.questions.general_inquiry.slice(0, 2)
      ];

      this.analysisResults.totalQuestions = questions.length;
      console.log(`✅ تم جلب ${questions.length} سؤال للتحليل\n`);

      // 3. إرسال وتحليل كل سؤال
      console.log('🚀 بدء إرسال وتحليل الأسئلة...\n');
      console.log('⚠️  سيتم إرسال سؤال واحد في كل مرة مع تحليل مفصل\n');

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        await this.sendAndAnalyzeQuestion(
          question.question,
          question,
          i + 1
        );

        // تأخير بين الأسئلة
        if (i < questions.length - 1) {
          console.log('\n⏳ انتظار 2 ثانية قبل السؤال التالي...\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 4. عرض التقرير النهائي
      this.generateFinalReport();

      return this.analysisResults;

    } catch (error) {
      console.error('\n❌ خطأ في التحليل:', error);
      console.error(error.stack);
      throw error;
    }
  }

  /**
   * إنشاء التقرير النهائي
   */
  generateFinalReport() {
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                      📊 التقرير النهائي                         ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log(`📈 الإحصائيات:`);
    console.log(`   إجمالي الأسئلة: ${this.analysisResults.totalQuestions}`);
    console.log(`   تم التحليل: ${this.analysisResults.analyzed}`);
    console.log(`   المشاكل المكتشفة: ${this.analysisResults.problems.length}`);
    console.log(`   الحلول المقترحة: ${this.analysisResults.fixes.length}`);
    console.log(`   التحسينات المقترحة: ${this.analysisResults.improvements.length}\n`);

    // تحليل المشاكل حسب النوع
    const problemsByType = {};
    this.analysisResults.problems.forEach(problem => {
      if (problem.analysis) {
        problem.analysis.problems.forEach(p => {
          if (!problemsByType[p.type]) {
            problemsByType[p.type] = 0;
          }
          problemsByType[p.type]++;
        });
      } else if (problem.problem) {
        if (!problemsByType[problem.problem]) {
          problemsByType[problem.problem] = 0;
        }
        problemsByType[problem.problem]++;
      }
    });

    if (Object.keys(problemsByType).length > 0) {
      console.log(`🔍 المشاكل حسب النوع:`);
      Object.entries(problemsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      console.log();
    }

    // الحلول المقترحة
    if (this.analysisResults.fixes.length > 0) {
      console.log(`🔧 الحلول المقترحة:`);
      this.analysisResults.fixes.forEach((fix, idx) => {
        console.log(`   ${idx + 1}. ${fix.message}`);
        if (fix.details) {
          console.log(`      التفاصيل: ${JSON.stringify(fix.details)}`);
        }
      });
      console.log();
    }

    // التحسينات
    const uniqueImprovements = [...new Set(this.analysisResults.improvements)];
    if (uniqueImprovements.length > 0) {
      console.log(`💡 التحسينات المقترحة:`);
      uniqueImprovements.forEach((improvement, idx) => {
        console.log(`   ${idx + 1}. ${improvement}`);
      });
      console.log();
    }

    // نسبة النجاح
    const successRate = this.analysisResults.totalQuestions > 0
      ? ((this.analysisResults.analyzed / this.analysisResults.totalQuestions) * 100).toFixed(2)
      : 0;

    const problemRate = this.analysisResults.analyzed > 0
      ? ((this.analysisResults.problems.length / this.analysisResults.analyzed) * 100).toFixed(2)
      : 0;

    console.log(`📊 النسب:`);
    console.log(`   نسبة النجاح: ${successRate}%`);
    console.log(`   نسبة المشاكل: ${problemRate}%`);
    console.log(`   نسبة الحلول: ${this.analysisResults.fixes.length > 0 ? 'متاحة' : 'لا توجد حلول تلقائية'}\n`);

    console.log(`💬 معرف المحادثة: ${this.conversationId}`);
    console.log(`   يمكنك عرض المحادثة في: /test-chat\n`);

    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ انتهى التحليل                            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  }
}

// تشغيل التحليل
async function main() {
  const analyzer = new AIAnalyzerAndFixer();

  try {
    await analyzer.runFullAnalysis();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ فشل التحليل:', error.message);
    process.exit(1);
  }
}

// تشغيل إذا كان مستدعى مباشرة
if (require.main === module) {
  main();
}

module.exports = { AIAnalyzerAndFixer };

