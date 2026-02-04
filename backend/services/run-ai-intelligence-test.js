/**
 * سكريبت اختبار ذكاء الذكاء الاصطناعي
 * يختبر 50 سؤال من ملف ai-test-questions.json
 */

const aiAgentService = require('./aiAgentService');
const questionsData = require('./ai-test-questions.json');
const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class AITestRunner {
  constructor(companyId, customerId = null) {
    this.companyId = companyId;
    this.customerId = customerId || `test-customer-${Date.now()}`;
    this.conversationId = null; // سيتم إنشاؤه من قاعدة البيانات
    this.conversationMemory = [];
    this.results = [];
    this.startTime = Date.now();
    this.dbConversationId = null; // ID المحادثة في قاعدة البيانات
  }

  /**
   * إنشاء محادثة في قاعدة البيانات
   */
  async initializeConversation() {
    try {
      // البحث عن أو إنشاء customer
      let customer = await getSharedPrismaClient().customer.findFirst({
        where: {
          companyId: this.companyId,
          firstName: 'عميل اختبار',
          lastName: 'Test Customer'
        }
      });

      if (!customer) {
        customer = await getSharedPrismaClient().customer.create({
          data: {
            companyId: this.companyId,
            firstName: 'عميل اختبار',
            lastName: 'Test Customer',
            phone: '0000000000',
            email: `test-${this.companyId}@test.com`
          }
        });
      }

      this.customerId = customer.id;

      // إنشاء محادثة جديدة
      const conversation = await getSharedPrismaClient().conversation.create({
        data: {
          companyId: this.companyId,
          customerId: customer.id,
          channel: 'TEST',
          status: 'ACTIVE',
          lastMessageAt: new Date(),
          lastMessagePreview: 'اختبار ذكاء الذكاء الاصطناعي'
        }
      });

      this.dbConversationId = conversation.id;
      this.conversationId = conversation.id; // استخدام نفس ID

      console.log(`✅ تم إنشاء محادثة في قاعدة البيانات: ${conversation.id}`);
      return conversation.id;

    } catch (error) {
      console.error('❌ خطأ في إنشاء المحادثة:', error);
      throw error;
    }
  }

  /**
   * إرسال رسالة والحصول على الرد
   */
  async sendMessage(question, context = null) {
    try {
      // التأكد من وجود conversationId و dbConversationId
      if (!this.conversationId || !this.dbConversationId) {
        console.log('⚠️ conversationId أو dbConversationId غير موجود - إنشاء محادثة جديدة...');
        await this.initializeConversation();
      }

      console.log(`\n📤 إرسال: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"`);

      const messageData = {
        conversationId: this.conversationId || this.dbConversationId,
        senderId: this.customerId,
        content: question,
        attachments: [],
        companyId: this.companyId,
        customerData: {
          id: this.customerId,
          name: 'عميل اختبار',
          phone: '01234567890',
          email: 'test@example.com',
          orderCount: 0,
          companyId: this.companyId
        }
      };

      const startTime = Date.now();
      const response = await aiAgentService.processCustomerMessage(messageData);
      const processingTime = Date.now() - startTime;

      if (!response) {
        return {
          success: false,
          error: 'No response from AI',
          processingTime
        };
      }

      // معالجة الاستجابة - قد تكون string أو object
      let responseContent = null;
      let responseIntent = null;
      let responseSentiment = null;
      let responseConfidence = null;

      if (typeof response === 'string') {
        responseContent = response;
      } else if (response && typeof response === 'object') {
        responseContent = response.content || response.message || response.response || null;
        responseIntent = response.intent || null;
        responseSentiment = response.sentiment || null;
        responseConfidence = response.confidence || null;
      }

      if (!responseContent) {
        return {
          success: false,
          error: 'Empty response from AI',
          processingTime,
          rawResponse: response
        };
      }

      // حفظ في الذاكرة
      this.conversationMemory.push({
        userMessage: question,
        aiResponse: responseContent,
        intent: responseIntent,
        timestamp: new Date().toISOString()
      });

      // حفظ الرسائل في قاعدة البيانات
      if (this.dbConversationId) {
        try {
          const { v4: uuidv4 } = require('uuid'); // ensure this is available

          // حفظ رسالة المستخدم
          const userMessage = await getSharedPrismaClient().message.create({
            data: {
              id: uuidv4(),
              conversationId: this.dbConversationId,
              content: question,
              type: 'TEXT',
              isFromCustomer: true,
              createdAt: new Date()
            }
          });

          // حفظ رد AI
          const aiMessage = await getSharedPrismaClient().message.create({
            data: {
              id: uuidv4(),
              conversationId: this.dbConversationId,
              content: responseContent,
              type: 'TEXT',
              isFromCustomer: false,
              createdAt: new Date()
            }
          });

          // تحديث المحادثة
          await getSharedPrismaClient().conversation.update({
            where: { id: this.dbConversationId },
            data: {
              lastMessageAt: new Date(),
              lastMessagePreview: responseContent.length > 100
                ? responseContent.substring(0, 100) + '...'
                : responseContent
            }
          });

          console.log(`💾 تم حفظ الرسائل في قاعدة البيانات (User: ${userMessage.id}, AI: ${aiMessage.id})`);
        } catch (dbError) {
          console.error('⚠️ خطأ في حفظ الرسائل في قاعدة البيانات:', dbError.message);
          console.error('📋 تفاصيل الخطأ:', dbError);
          // لا نوقف الاختبار بسبب خطأ في قاعدة البيانات
        }
      } else {
        console.error('❌ dbConversationId غير موجود - لا يمكن حفظ الرسائل في قاعدة البيانات');
      }

      return {
        success: true,
        content: responseContent,
        intent: responseIntent,
        sentiment: responseSentiment,
        confidence: responseConfidence,
        processingTime,
        images: response.images || [],
        orderInfo: response.orderInfo || null,
        rawResponse: response
      };

    } catch (error) {
      console.error(`❌ خطأ في معالجة الرسالة:`, error.message);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * تقييم الرد
   */
  evaluateResponse(questionData, response) {
    const evaluation = {
      questionId: questionData.id,
      question: questionData.question,
      expectedIntent: questionData.expectedIntent,
      detectedIntent: response.intent,
      response: response.content,
      scores: {
        intentDetection: 0,
        responseQuality: 0,
        contextAwareness: 0,
        handlingAmbiguity: 0,
        conversationFlow: 0
      },
      totalScore: 0,
      comments: [],
      processingTime: response.processingTime || 0,
      success: response.success
    };

    // 1. تقييم فهم النية (20 نقطة)
    if (response.intent) {
      if (response.intent === questionData.expectedIntent) {
        evaluation.scores.intentDetection = 20;
        evaluation.comments.push('✅ تم فهم النية بشكل صحيح');
      } else {
        // تحقق من النوايا المشابهة
        const similarIntents = {
          'product_inquiry': ['general_inquiry'],
          'price_inquiry': ['product_inquiry'],
          'order_inquiry': ['product_inquiry', 'price_inquiry'],
          'greeting': ['general_inquiry']
        };

        if (similarIntents[questionData.expectedIntent]?.includes(response.intent)) {
          evaluation.scores.intentDetection = 10;
          evaluation.comments.push('⚠️ النية قريبة ولكن ليست دقيقة تماماً');
        } else {
          evaluation.scores.intentDetection = 0;
          evaluation.comments.push('❌ النية غير صحيحة');
        }
      }
    } else {
      evaluation.comments.push('⚠️ لم يتم تحديد النية');
    }

    // 2. تقييم جودة الرد (30 نقطة)
    if (response.content && response.success) {
      const content = response.content;
      const length = content.length;

      if (length > 50 && length < 500) {
        evaluation.scores.responseQuality = 30;
        evaluation.comments.push('✅ رد شامل ومفيد');
      } else if (length > 20) {
        evaluation.scores.responseQuality = 20;
        evaluation.comments.push('⚠️ رد متوسط الطول');
      } else if (length > 0) {
        evaluation.scores.responseQuality = 10;
        evaluation.comments.push('⚠️ رد قصير جداً');
      } else {
        evaluation.scores.responseQuality = 0;
        evaluation.comments.push('❌ لا يوجد رد');
      }

      // تحقق من وجود معلومات مفيدة
      if (content.includes('؟') || content.includes('مساعدة') || content.includes('مساعد')) {
        evaluation.scores.responseQuality += 5;
      }
    } else {
      evaluation.scores.responseQuality = 0;
      evaluation.comments.push('❌ فشل في توليد الرد');
    }

    // 3. تقييم الوعي بالسياق (20 نقطة)
    if (this.conversationMemory.length > 1) {
      // إذا كانت هناك محادثات سابقة، يجب أن يستخدم السياق
      const lastMemory = this.conversationMemory[this.conversationMemory.length - 2];
      if (response.content && (
        response.content.includes(lastMemory.userMessage.substring(0, 10)) ||
        response.content.includes('سابق') ||
        response.content.includes('قبل')
      )) {
        evaluation.scores.contextAwareness = 20;
        evaluation.comments.push('✅ يستخدم السياق بشكل جيد');
      } else {
        evaluation.scores.contextAwareness = 10;
        evaluation.comments.push('⚠️ استخدام جزئي للسياق');
      }
    } else {
      // أول رسالة، لا يوجد سياق سابق
      evaluation.scores.contextAwareness = 15;
      evaluation.comments.push('ℹ️ أول رسالة، لا يوجد سياق سابق');
    }

    // 4. تقييم التعامل مع الغموض (15 نقطة)
    if (questionData.difficulty === 'hard' || !questionData.context) {
      // إذا كان السؤال غامضاً، يجب أن يطلب توضيح
      if (response.content && (
        response.content.includes('؟') ||
        response.content.includes('توضيح') ||
        response.content.includes('أوضح') ||
        response.content.includes('أي') ||
        response.content.includes('ممكن')
      )) {
        evaluation.scores.handlingAmbiguity = 15;
        evaluation.comments.push('✅ طلب توضيح بشكل مناسب');
      } else {
        evaluation.scores.handlingAmbiguity = 7;
        evaluation.comments.push('⚠️ لم يطلب توضيح بشكل واضح');
      }
    } else {
      evaluation.scores.handlingAmbiguity = 12;
      evaluation.comments.push('ℹ️ السؤال واضح، لا يحتاج توضيح');
    }

    // 5. تقييم استمرارية المحادثة (15 نقطة)
    if (response.content && (
      response.content.includes('؟') ||
      response.content.includes('ممكن') ||
      response.content.includes('عايز') ||
      response.content.includes('مساعدة')
    )) {
      evaluation.scores.conversationFlow = 15;
      evaluation.comments.push('✅ يوجه المحادثة بشكل صحيح');
    } else if (response.content && response.content.length > 30) {
      evaluation.scores.conversationFlow = 10;
      evaluation.comments.push('⚠️ رد جيد ولكن لا يوجه المحادثة');
    } else {
      evaluation.scores.conversationFlow = 5;
      evaluation.comments.push('⚠️ لا يوجه المحادثة');
    }

    // حساب النتيجة الإجمالية
    evaluation.totalScore = Object.values(evaluation.scores).reduce((a, b) => a + b, 0);
    evaluation.percentage = ((evaluation.totalScore / 100) * 100).toFixed(1);

    return evaluation;
  }

  /**
   * تشغيل اختبار لسؤال واحد
   */
  async runTest(questionData) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧪 السؤال #${questionData.id}: ${questionData.difficulty.toUpperCase()}`);
      console.log(`📝 السؤال: "${questionData.question}"`);
      console.log(`🎯 النية المتوقعة: ${questionData.expectedIntent}`);

      // إرسال الرسالة
      const response = await this.sendMessage(questionData.question, questionData.context);

      if (!response.success) {
        console.error(`❌ فشل: ${response.error}`);
        return {
          questionId: questionData.id,
          question: questionData.question,
          success: false,
          error: response.error,
          scores: {
            intentDetection: 0,
            responseQuality: 0,
            contextAwareness: 0,
            handlingAmbiguity: 0,
            conversationFlow: 0
          },
          totalScore: 0,
          percentage: 0
        };
      }

      console.log(`✅ الرد: "${response.content.substring(0, 100)}${response.content.length > 100 ? '...' : ''}"`);
      console.log(`🎯 النية المكتشفة: ${response.intent || 'غير محدد'}`);
      console.log(`⏱️ وقت المعالجة: ${response.processingTime}ms`);

      // تقييم الرد
      const evaluation = this.evaluateResponse(questionData, response);

      console.log(`📊 النتيجة: ${evaluation.totalScore}/100 (${evaluation.percentage}%)`);
      console.log(`   - فهم النية: ${evaluation.scores.intentDetection}/20`);
      console.log(`   - جودة الرد: ${evaluation.scores.responseQuality}/30`);
      console.log(`   - الوعي بالسياق: ${evaluation.scores.contextAwareness}/20`);
      console.log(`   - التعامل مع الغموض: ${evaluation.scores.handlingAmbiguity}/15`);
      console.log(`   - استمرارية المحادثة: ${evaluation.scores.conversationFlow}/15`);

      // انتظار قصير بين الأسئلة
      await new Promise(resolve => setTimeout(resolve, 1000));

      return evaluation;

    } catch (error) {
      console.error(`❌ خطأ في الاختبار:`, error);
      return {
        questionId: questionData.id,
        question: questionData.question,
        success: false,
        error: error.message,
        scores: {
          intentDetection: 0,
          responseQuality: 0,
          contextAwareness: 0,
          handlingAmbiguity: 0,
          conversationFlow: 0
        },
        totalScore: 0,
        percentage: 0
      };
    }
  }

  /**
   * تشغيل جميع الاختبارات
   */
  async runAllTests(customQuestions = null) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 بدء اختبار ذكاء الذكاء الاصطناعي`);
    console.log(`🏢 Company ID: ${this.companyId}`);

    // إنشاء المحادثة في قاعدة البيانات
    await this.initializeConversation();

    console.log(`👤 Customer ID: ${this.customerId}`);
    console.log(`💬 Conversation ID: ${this.conversationId}`);
    console.log(`📝 يمكنك رؤية المحادثة في /test-chat`);
    console.log(`${'='.repeat(60)}\n`);

    const allQuestions = [];

    // استخدام الأسئلة المخصصة إذا كانت متوفرة
    if (customQuestions && Array.isArray(customQuestions)) {
      console.log(`📊 استخدام ${customQuestions.length} سؤال مخصص\n`);
      allQuestions.push(...customQuestions);
    } else {
      // جمع جميع الأسئلة من جميع الفئات
      console.log(`📊 عدد الأسئلة: ${questionsData.metadata.totalQuestions}\n`);
      for (const categoryKey in questionsData.categories) {
        const category = questionsData.categories[categoryKey];
        allQuestions.push(...category.questions);
      }
      // ترتيب الأسئلة حسب ID
      allQuestions.sort((a, b) => a.id - b.id);
    }

    // تشغيل الاختبارات
    for (const question of allQuestions) {
      const result = await this.runTest(question);
      this.results.push(result);
    }

    return this.generateReport();
  }

  /**
   * إنشاء تقرير شامل
   */
  generateReport() {
    const totalQuestions = this.results.length;
    const successfulTests = this.results.filter(r => r.success !== false).length;
    const failedTests = totalQuestions - successfulTests;

    // حساب المتوسطات
    const averageScore = this.results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalQuestions;
    const averageIntent = this.results.filter(r => r.scores?.intentDetection === 20).length / totalQuestions * 100;
    const averageQuality = this.results.reduce((sum, r) => sum + (r.scores?.responseQuality || 0), 0) / totalQuestions;
    const averageContext = this.results.reduce((sum, r) => sum + (r.scores?.contextAwareness || 0), 0) / totalQuestions;
    const averageAmbiguity = this.results.reduce((sum, r) => sum + (r.scores?.handlingAmbiguity || 0), 0) / totalQuestions;
    const averageFlow = this.results.reduce((sum, r) => sum + (r.scores?.conversationFlow || 0), 0) / totalQuestions;

    // الإحصائيات حسب الفئة
    const statsByCategory = {};
    for (const categoryKey in questionsData.categories) {
      const category = questionsData.categories[categoryKey];
      const categoryQuestions = this.results.filter(r =>
        category.questions.some(q => q.id === r.questionId)
      );
      if (categoryQuestions.length > 0) {
        statsByCategory[categoryKey] = {
          name: category.name,
          total: categoryQuestions.length,
          averageScore: categoryQuestions.reduce((sum, r) => sum + (r.totalScore || 0), 0) / categoryQuestions.length,
          passed: categoryQuestions.filter(r => (r.totalScore || 0) >= 70).length
        };
      }
    }

    // الإحصائيات حسب الصعوبة
    const statsByDifficulty = {
      easy: { total: 0, averageScore: 0, passed: 0 },
      medium: { total: 0, averageScore: 0, passed: 0 },
      hard: { total: 0, averageScore: 0, passed: 0 }
    };

    for (const result of this.results) {
      const question = this.findQuestionById(result.questionId);
      if (question) {
        const difficulty = question.difficulty;
        statsByDifficulty[difficulty].total++;
        statsByDifficulty[difficulty].averageScore += result.totalScore || 0;
        if ((result.totalScore || 0) >= 70) {
          statsByDifficulty[difficulty].passed++;
        }
      }
    }

    for (const difficulty in statsByDifficulty) {
      if (statsByDifficulty[difficulty].total > 0) {
        statsByDifficulty[difficulty].averageScore /= statsByDifficulty[difficulty].total;
      }
    }

    const totalTime = Date.now() - this.startTime;

    const report = {
      metadata: {
        testDate: new Date().toISOString(),
        totalQuestions,
        successfulTests,
        failedTests,
        totalTime: `${(totalTime / 1000).toFixed(2)}s`,
        companyId: this.companyId,
        customerId: this.customerId,
        conversationId: this.conversationId,
        dbConversationId: this.dbConversationId,
        testChatUrl: `/test-chat?conversationId=${this.dbConversationId}`
      },
      summary: {
        averageScore: averageScore.toFixed(2),
        averagePercentage: ((averageScore / 100) * 100).toFixed(1) + '%',
        averageIntentDetection: averageIntent.toFixed(1) + '%',
        averageResponseQuality: averageQuality.toFixed(2),
        averageContextAwareness: averageContext.toFixed(2),
        averageHandlingAmbiguity: averageAmbiguity.toFixed(2),
        averageConversationFlow: averageFlow.toFixed(2)
      },
      statsByCategory,
      statsByDifficulty,
      results: this.results,
      issues: this.identifyIssues()
    };

    // حفظ التقرير
    const reportPath = path.join(__dirname, `ai-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📄 تم حفظ التقرير في: ${reportPath}`);

    // طباعة الملخص
    this.printSummary(report);

    return report;
  }

  /**
   * العثور على سؤال بالـ ID
   */
  findQuestionById(questionId) {
    for (const categoryKey in questionsData.categories) {
      const category = questionsData.categories[categoryKey];
      const question = category.questions.find(q => q.id === questionId);
      if (question) return question;
    }
    return null;
  }

  /**
   * تحديد المشاكل
   */
  identifyIssues() {
    const issues = [];

    // مشاكل فهم النية
    const intentIssues = this.results.filter(r => r.scores?.intentDetection < 10);
    if (intentIssues.length > 0) {
      issues.push({
        type: 'intent_detection',
        severity: 'high',
        count: intentIssues.length,
        questions: intentIssues.map(r => r.questionId)
      });
    }

    // مشاكل جودة الرد
    const qualityIssues = this.results.filter(r => r.scores?.responseQuality < 15);
    if (qualityIssues.length > 0) {
      issues.push({
        type: 'response_quality',
        severity: 'high',
        count: qualityIssues.length,
        questions: qualityIssues.map(r => r.questionId)
      });
    }

    // مشاكل السياق
    const contextIssues = this.results.filter(r => r.scores?.contextAwareness < 10 && this.conversationMemory.length > 1);
    if (contextIssues.length > 0) {
      issues.push({
        type: 'context_awareness',
        severity: 'medium',
        count: contextIssues.length,
        questions: contextIssues.map(r => r.questionId)
      });
    }

    // فشل كامل
    const failedTests = this.results.filter(r => r.success === false);
    if (failedTests.length > 0) {
      issues.push({
        type: 'complete_failure',
        severity: 'critical',
        count: failedTests.length,
        questions: failedTests.map(r => r.questionId),
        errors: failedTests.map(r => r.error).filter(e => e)
      });
    }

    return issues;
  }

  /**
   * طباعة الملخص
   */
  printSummary(report) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ملخص الاختبار`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ الاختبارات الناجحة: ${report.metadata.successfulTests}/${report.metadata.totalQuestions}`);
    console.log(`❌ الاختبارات الفاشلة: ${report.metadata.failedTests}/${report.metadata.totalQuestions}`);
    console.log(`📈 متوسط النتيجة: ${report.summary.averageScore}/100 (${report.summary.averagePercentage})`);
    console.log(`🎯 دقة فهم النية: ${report.summary.averageIntentDetection}`);
    console.log(`⏱️ الوقت الإجمالي: ${report.metadata.totalTime}`);
    console.log(`\n📊 النتائج حسب الفئة:`);
    for (const categoryKey in report.statsByCategory) {
      const stats = report.statsByCategory[categoryKey];
      console.log(`   - ${stats.name}: ${stats.averageScore.toFixed(1)}/100 (${stats.passed}/${stats.total} نجح)`);
    }
    console.log(`\n📊 النتائج حسب الصعوبة:`);
    for (const difficulty in report.statsByDifficulty) {
      const stats = report.statsByDifficulty[difficulty];
      if (stats.total > 0) {
        console.log(`   - ${difficulty}: ${stats.averageScore.toFixed(1)}/100 (${stats.passed}/${stats.total} نجح)`);
      }
    }
    if (report.issues.length > 0) {
      console.log(`\n⚠️ المشاكل المكتشفة:`);
      for (const issue of report.issues) {
        console.log(`   - ${issue.type} (${issue.severity}): ${issue.count} سؤال`);
        if (issue.questions && issue.questions.length > 0) {
          console.log(`     الأسئلة: ${issue.questions.join(', ')}`);
        }
      }
    }
    console.log(`${'='.repeat(60)}\n`);
  }
}

// الحصول على companyId من قاعدة البيانات
async function getCompanyId() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

    // محاولة الحصول على companyId أو اسم الشركة من arguments
    if (process.argv[2]) {
      const input = process.argv[2];

      // محاولة البحث بالـ ID أولاً
      const companyById = await getSharedPrismaClient().company.findUnique({
        where: { id: input }
      });

      if (companyById) {
        console.log(`✅ تم العثور على الشركة بالـ ID: ${companyById.name}`);
        return companyById.id;
      }

      // إذا لم يتم العثور بالـ ID، جرب البحث بالاسم
      console.log(`🔍 البحث عن شركة بالاسم: "${input}"`);
      const companiesByName = await getSharedPrismaClient().company.findMany({
        where: {
          name: {
            contains: input
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (companiesByName.length > 0) {
        // إعطاء الأولوية للشركات النشطة
        const activeCompany = companiesByName.find(c => c.isActive) || companiesByName[0];
        console.log(`✅ تم العثور على الشركة: ${activeCompany.name} (${activeCompany.id})`);
        return activeCompany.id;
      } else {
        console.warn(`⚠️ لم يتم العثور على شركة بالاسم "${input}"`);
      }
    }

    // البحث عن "شركة التسويق" بشكل افتراضي
    console.log(`🔍 البحث عن "شركة التسويق"...`);
    const marketingCompany = await getSharedPrismaClient().company.findFirst({
      where: {
        name: {
          contains: 'التسويق'
        },
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (marketingCompany) {
      console.log(`✅ تم العثور على شركة التسويق: ${marketingCompany.name} (${marketingCompany.id})`);
      return marketingCompany.id;
    }

    // محاولة الحصول على الشركة mo-test أولاً
    let company = await getSharedPrismaClient().company.findUnique({
      where: { id: 'cmhnzbjl50000ufus81imj8wq' }
    });

    // إذا لم توجد، احصل على أول شركة نشطة
    if (!company) {
      company = await getSharedPrismaClient().company.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (company) {
      console.log(`✅ تم العثور على الشركة: ${company.name} (${company.id})`);
      return company.id;
    }

    // إذا لم توجد شركة نشطة، جرب أي شركة
    const anyCompany = await getSharedPrismaClient().company.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (anyCompany) {
      console.log(`⚠️ تم العثور على شركة غير نشطة: ${anyCompany.name} (${anyCompany.id})`);
      return anyCompany.id;
    }

    throw new Error('لا توجد شركة في قاعدة البيانات');

  } catch (error) {
    console.error('❌ خطأ في الحصول على companyId:', error.message);
    throw error;
  }
}

// تشغيل الاختبار
async function main() {
  try {
    console.log(`\n🚀 بدء اختبار ذكاء الذكاء الاصطناعي...\n`);

    // الحصول على companyId
    const companyId = await getCompanyId();

    if (!companyId) {
      console.error('❌ لم يتم العثور على companyId');
      console.log('الاستخدام: node run-ai-intelligence-test.js [companyId]');
      process.exit(1);
    }

    console.log(`🏢 Company ID: ${companyId}\n`);

    const runner = new AITestRunner(companyId);
    const report = await runner.runAllTests();

    console.log(`\n✅ اكتمل الاختبار بنجاح!`);
    console.log(`📄 راجع التقرير المفصل في الملف المحفوظ`);

    // طباعة ملخص سريع للمشاكل
    if (report.issues && report.issues.length > 0) {
      console.log(`\n⚠️ تم اكتشاف ${report.issues.length} مشكلة تحتاج إلى حل`);
    }

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ خطأ في تشغيل الاختبار:`, error);
    console.error(error.stack);
    process.exit(1);
  }
}

// تشغيل إذا كان الملف مستدعى مباشرة
if (require.main === module) {
  main();
}

module.exports = AITestRunner;


