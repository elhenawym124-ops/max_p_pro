/**
 * سكريبت لتحليل نتائج الاختبارات السابقة
 * يجلب المحادثات الاختبارية ويحلل النتائج
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

class TestResultsAnalyzer {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * تحليل جميع المحادثات الاختبارية
   */
  async analyzeAllTestConversations() {
    try {
      console.log('🔍 جاري البحث عن المحادثات الاختبارية...\n');

      // جلب جميع المحادثات الاختبارية
      const testConversations = await this.prisma.conversation.findMany({
        where: {
          channel: 'TEST'
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyId: true
            }
          },
          messages: {
            orderBy: {
              createdAt: 'asc'
            },
            select: {
              id: true,
              content: true,
              isFromCustomer: true,
              createdAt: true,
              type: true
            }
          },
          company: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10 // آخر 10 محادثات
      });

      console.log(`✅ تم العثور على ${testConversations.length} محادثة اختبارية\n`);

      if (testConversations.length === 0) {
        console.log('⚠️  لا توجد محادثات اختبارية في قاعدة البيانات');
        console.log('💡 قم بتشغيل الاختبار أولاً عبر الواجهة أو API\n');
        return;
      }

      // تحليل كل محادثة
      const analysisResults = [];
      
      for (const conversation of testConversations) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 تحليل المحادثة: ${conversation.id}`);
        console.log(`   الشركة: ${conversation.company?.name || 'غير محدد'}`);
        console.log(`   العميل: ${conversation.customer?.firstName || ''} ${conversation.customer?.lastName || ''}`);
        console.log(`   عدد الرسائل: ${conversation.messages.length}`);
        console.log(`   التاريخ: ${conversation.createdAt.toLocaleString()}`);
        console.log(`${'='.repeat(70)}\n`);

        const analysis = this.analyzeConversation(conversation);
        analysisResults.push({
          conversationId: conversation.id,
          companyId: conversation.companyId,
          companyName: conversation.company?.name,
          analysis: analysis
        });

        // عرض النتائج
        this.displayAnalysis(analysis);
      }

      // تحليل شامل لجميع المحادثات
      this.generateSummaryReport(analysisResults);

      return analysisResults;

    } catch (error) {
      console.error('❌ خطأ في تحليل النتائج:', error);
      throw error;
    }
  }

  /**
   * تحليل محادثة واحدة
   */
  analyzeConversation(conversation) {
    const messages = conversation.messages;
    const analysis = {
      totalMessages: messages.length,
      customerMessages: 0,
      aiMessages: 0,
      problems: [],
      statistics: {
        averageResponseTime: 0,
        responseLength: {
          min: Infinity,
          max: 0,
          average: 0
        },
        emptyResponses: 0,
        veryShortResponses: 0, // أقل من 10 أحرف
        veryLongResponses: 0,  // أكثر من 1000 حرف
        errors: 0
      }
    };

    let totalResponseLength = 0;
    let responseCount = 0;
    const responseTimes = [];

    // تحليل الرسائل
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      if (message.isFromCustomer) {
        analysis.customerMessages++;
      } else {
        analysis.aiMessages++;
        responseCount++;

        // تحليل طول الرد
        const contentLength = message.content?.length || 0;
        totalResponseLength += contentLength;

        if (contentLength === 0) {
          analysis.statistics.emptyResponses++;
          analysis.problems.push({
            type: 'empty_response',
            severity: 'high',
            message: `رد فارغ في الرسالة ${i + 1}`,
            messageId: message.id
          });
        } else if (contentLength < 10) {
          analysis.statistics.veryShortResponses++;
          analysis.problems.push({
            type: 'very_short_response',
            severity: 'medium',
            message: `رد قصير جداً (${contentLength} حرف) في الرسالة ${i + 1}`,
            messageId: message.id,
            content: message.content
          });
        } else if (contentLength > 1000) {
          analysis.statistics.veryLongResponses++;
          analysis.problems.push({
            type: 'very_long_response',
            severity: 'low',
            message: `رد طويل جداً (${contentLength} حرف) في الرسالة ${i + 1}`,
            messageId: message.id
          });
        }

        // تحديث min/max
        if (contentLength > 0) {
          analysis.statistics.responseLength.min = Math.min(analysis.statistics.responseLength.min, contentLength);
          analysis.statistics.responseLength.max = Math.max(analysis.statistics.responseLength.max, contentLength);
        }

        // البحث عن أخطاء في المحتوى
        if (message.content && (
          message.content.toLowerCase().includes('error') ||
          message.content.toLowerCase().includes('خطأ') ||
          message.content.toLowerCase().includes('فشل')
        )) {
          analysis.statistics.errors++;
          analysis.problems.push({
            type: 'error_in_response',
            severity: 'high',
            message: `يحتوي الرد على كلمة خطأ في الرسالة ${i + 1}`,
            messageId: message.id,
            content: message.content.substring(0, 200)
          });
        }

        // حساب وقت الاستجابة (إذا كان متاحاً)
        if (i > 0 && messages[i - 1].isFromCustomer) {
          const responseTime = new Date(message.createdAt) - new Date(messages[i - 1].createdAt);
          responseTimes.push(responseTime);
        }
      }
    }

    // حساب المتوسطات
    if (responseCount > 0) {
      analysis.statistics.responseLength.average = Math.round(totalResponseLength / responseCount);
    }

    if (responseTimes.length > 0) {
      analysis.statistics.averageResponseTime = Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      );
    }

    // تحليل التغطية (عدد أسئلة العميل مقابل عدد ردود AI)
    if (analysis.customerMessages > analysis.aiMessages) {
      analysis.problems.push({
        type: 'missing_responses',
        severity: 'high',
        message: `عدد أسئلة العميل (${analysis.customerMessages}) أكثر من عدد ردود AI (${analysis.aiMessages})`,
        missingCount: analysis.customerMessages - analysis.aiMessages
      });
    }

    // تحليل جودة المحادثة
    if (analysis.statistics.emptyResponses > 0) {
      analysis.problems.push({
        type: 'quality_issue',
        severity: 'critical',
        message: `هناك ${analysis.statistics.emptyResponses} رد فارغ`,
        count: analysis.statistics.emptyResponses
      });
    }

    return analysis;
  }

  /**
   * عرض نتائج التحليل
   */
  displayAnalysis(analysis) {
    console.log('📊 نتائج التحليل:');
    console.log(`   إجمالي الرسائل: ${analysis.totalMessages}`);
    console.log(`   رسائل العميل: ${analysis.customerMessages}`);
    console.log(`   ردود AI: ${analysis.aiMessages}`);
    console.log(`\n   📈 الإحصائيات:`);
    console.log(`      متوسط طول الرد: ${analysis.statistics.responseLength.average} حرف`);
    console.log(`      أقصر رد: ${analysis.statistics.responseLength.min === Infinity ? 0 : analysis.statistics.responseLength.min} حرف`);
    console.log(`      أطول رد: ${analysis.statistics.responseLength.max} حرف`);
    console.log(`      متوسط وقت الاستجابة: ${(analysis.statistics.averageResponseTime / 1000).toFixed(2)} ثانية`);
    console.log(`      ردود فارغة: ${analysis.statistics.emptyResponses}`);
    console.log(`      ردود قصيرة جداً: ${analysis.statistics.veryShortResponses}`);
    console.log(`      ردود طويلة جداً: ${analysis.statistics.veryLongResponses}`);
    console.log(`      أخطاء في الردود: ${analysis.statistics.errors}`);

    if (analysis.problems.length > 0) {
      console.log(`\n   ⚠️  المشاكل المكتشفة (${analysis.problems.length}):`);
      
      const problemsBySeverity = {
        critical: [],
        high: [],
        medium: [],
        low: []
      };

      analysis.problems.forEach(problem => {
        problemsBySeverity[problem.severity] = problemsBySeverity[problem.severity] || [];
        problemsBySeverity[problem.severity].push(problem);
      });

      // عرض المشاكل حسب الخطورة
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        if (problemsBySeverity[severity] && problemsBySeverity[severity].length > 0) {
          const severityLabels = {
            critical: '🚨 حرجة',
            high: '🔴 عالية',
            medium: '🟠 متوسطة',
            low: '🟡 منخفضة'
          };
          console.log(`\n      ${severityLabels[severity]} (${problemsBySeverity[severity].length}):`);
          problemsBySeverity[severity].forEach((problem, idx) => {
            console.log(`         ${idx + 1}. ${problem.message}`);
            if (problem.content) {
              console.log(`            المحتوى: "${problem.content}..."`);
            }
          });
        }
      });
    } else {
      console.log(`\n   ✅ لا توجد مشاكل - المحادثة جيدة!`);
    }
  }

  /**
   * إنشاء بيانات التقرير الشامل (للـ API)
   */
  generateSummaryReportData(analysisResults) {
    const totalConversations = analysisResults.length;
    let totalProblems = 0;
    const problemsByType = {};
    const problemsBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    analysisResults.forEach(result => {
      result.analysis.problems.forEach(problem => {
        totalProblems++;
        
        if (!problemsByType[problem.type]) {
          problemsByType[problem.type] = 0;
        }
        problemsByType[problem.type]++;

        problemsBySeverity[problem.severity] = (problemsBySeverity[problem.severity] || 0) + 1;
      });
    });

    return {
      totalConversations,
      totalProblems,
      averageProblemsPerConversation: totalConversations > 0 ? (totalProblems / totalConversations).toFixed(2) : 0,
      problemsByType,
      problemsBySeverity,
      recommendations: this.generateRecommendations(problemsByType, problemsBySeverity)
    };
  }

  /**
   * إنشاء التوصيات
   */
  generateRecommendations(problemsByType, problemsBySeverity) {
    const recommendations = [];

    if (problemsByType['empty_response'] > 0) {
      recommendations.push({
        type: 'empty_response',
        priority: 'high',
        message: 'تحسين نظام AI لضمان عدم وجود ردود فارغة',
        count: problemsByType['empty_response']
      });
    }
    
    if (problemsByType['very_short_response'] > 0) {
      recommendations.push({
        type: 'very_short_response',
        priority: 'medium',
        message: 'تحسين prompts لطلب ردود أطول',
        count: problemsByType['very_short_response']
      });
    }
    
    if (problemsByType['missing_responses'] > 0) {
      recommendations.push({
        type: 'missing_responses',
        priority: 'high',
        message: 'التحقق من سبب عدم الرد على بعض الأسئلة',
        count: problemsByType['missing_responses']
      });
    }
    
    if (problemsByType['error_in_response'] > 0) {
      recommendations.push({
        type: 'error_in_response',
        priority: 'high',
        message: 'تحسين معالجة الأخطاء في AI',
        count: problemsByType['error_in_response']
      });
    }
    
    if (problemsBySeverity.critical > 0) {
      recommendations.push({
        type: 'critical_issues',
        priority: 'critical',
        message: 'هناك مشاكل حرجة تحتاج إلى معالجة فورية',
        count: problemsBySeverity.critical
      });
    }

    return recommendations;
  }

  /**
   * إنشاء تقرير شامل
   */
  generateSummaryReport(analysisResults) {
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                   📊 التقرير الشامل                            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const totalConversations = analysisResults.length;
    let totalProblems = 0;
    const problemsByType = {};
    const problemsBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    analysisResults.forEach(result => {
      result.analysis.problems.forEach(problem => {
        totalProblems++;
        
        if (!problemsByType[problem.type]) {
          problemsByType[problem.type] = 0;
        }
        problemsByType[problem.type]++;

        problemsBySeverity[problem.severity] = (problemsBySeverity[problem.severity] || 0) + 1;
      });
    });

    console.log(`📈 الإحصائيات العامة:`);
    console.log(`   عدد المحادثات المحللة: ${totalConversations}`);
    console.log(`   إجمالي المشاكل: ${totalProblems}`);
    console.log(`   متوسط المشاكل لكل محادثة: ${(totalProblems / totalConversations).toFixed(2)}\n`);

    if (totalProblems > 0) {
      console.log(`🔍 المشاكل حسب النوع:`);
      Object.entries(problemsByType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
      console.log();

      console.log(`⚠️  المشاكل حسب الخطورة:`);
      console.log(`   🚨 حرجة: ${problemsBySeverity.critical}`);
      console.log(`   🔴 عالية: ${problemsBySeverity.high}`);
      console.log(`   🟠 متوسطة: ${problemsBySeverity.medium}`);
      console.log(`   🟡 منخفضة: ${problemsBySeverity.low}`);
      console.log();

      // توصيات
      console.log(`💡 التوصيات:`);
      
      if (problemsByType['empty_response'] > 0) {
        console.log(`   - تحسين نظام AI لضمان عدم وجود ردود فارغة`);
      }
      
      if (problemsByType['very_short_response'] > 0) {
        console.log(`   - تحسين prompts لطلب ردود أطول`);
      }
      
      if (problemsByType['missing_responses'] > 0) {
        console.log(`   - التحقق من سبب عدم الرد على بعض الأسئلة`);
      }
      
      if (problemsByType['error_in_response'] > 0) {
        console.log(`   - تحسين معالجة الأخطاء في AI`);
      }
      
      if (problemsBySeverity.critical > 0) {
        console.log(`   - ⚠️  هناك مشاكل حرجة تحتاج إلى معالجة فورية`);
      }
    } else {
      console.log(`✅ لا توجد مشاكل في أي من المحادثات!`);
    }

    console.log('\n');
  }

  /**
   * تحليل محادثة محددة
   */
  async analyzeSpecificConversation(conversationId) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'asc' }
          },
          company: true
        }
      });

      if (!conversation) {
        throw new Error(`المحادثة ${conversationId} غير موجودة`);
      }

      if (conversation.channel !== 'TEST') {
        console.log('⚠️  هذه المحادثة ليست محادثة اختبارية');
      }

      const analysis = this.analyzeConversation(conversation);
      this.displayAnalysis(analysis);

      return analysis;
    } catch (error) {
      console.error('❌ خطأ في تحليل المحادثة:', error);
      throw error;
    }
  }
}

// تشغيل التحليل
async function main() {
  const analyzer = new TestResultsAnalyzer();
  
  try {
    // تحليل جميع المحادثات الاختبارية
    await analyzer.analyzeAllTestConversations();
    
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

module.exports = { TestResultsAnalyzer };

