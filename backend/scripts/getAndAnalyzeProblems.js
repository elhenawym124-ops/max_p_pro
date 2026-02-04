/**
 * سكريبت لتحليل المشاكل الفعلية من قاعدة البيانات
 * يجلب المحادثات الاختبارية ويحلل المشاكل ويقترح حلول
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

class ProblemsAnalyzer {
  constructor() {
    this.prisma = getSharedPrismaClient();
    this.problems = [];
    this.solutions = [];
  }

  /**
   * تحليل جميع المحادثات الاختبارية
   */
  async analyzeAllProblems() {
    try {
      console.log('╔══════════════════════════════════════════════════════════════════╗');
      console.log('║              🔍 تحليل المشاكل والحلول                           ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝\n');

      console.log('🔍 جاري البحث عن المحادثات الاختبارية...\n');

      // جلب جميع المحادثات الاختبارية
      const testConversations = await this.prisma.conversation.findMany({
        where: {
          channel: 'TEST'
        },
        include: {
          customers: {
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
          companies: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20 // آخر 20 محادثة
      });

      console.log(`✅ تم العثور على ${testConversations.length} محادثة اختبارية\n`);

      if (testConversations.length === 0) {
        console.log('⚠️  لا توجد محادثات اختبارية في قاعدة البيانات');
        console.log('💡 قم بتشغيل الاختبار أولاً عبر الواجهة أو API\n');
        return this.generateReport();
      }

      // تحليل كل محادثة
      for (const conversation of testConversations) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 تحليل المحادثة: ${conversation.id.substring(0, 8)}...`);
        console.log(`   الشركة: ${conversation.companies?.name || 'غير محدد'}`);
        console.log(`   عدد الرسائل: ${conversation.messages.length}`);
        console.log(`${'='.repeat(70)}`);

        await this.analyzeConversation(conversation);
      }

      // إنشاء التقرير
      return this.generateReport();

    } catch (error) {
      console.error('❌ خطأ في تحليل المشاكل:', error);
      throw error;
    }
  }

  /**
   * تحليل محادثة واحدة
   */
  async analyzeConversation(conversation) {
    const messages = conversation.messages;
    let customerMessages = 0;
    let aiMessages = 0;
    let lastCustomerMessageTime = null;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      if (message.isFromCustomer) {
        customerMessages++;
        lastCustomerMessageTime = message.createdAt;
      } else {
        aiMessages++;

        // 1. فحص ردود فارغة
        if (!message.content || message.content.trim().length === 0) {
          this.addProblem({
            type: 'empty_response',
            severity: 'critical',
            message: `رد فارغ في المحادثة ${conversation.id.substring(0, 8)}...`,
            conversationId: conversation.id,
            messageId: message.id,
            solution: 'تحسين نظام AI لضمان عدم وجود ردود فارغة - إضافة fallback response'
          });
        }

        // 2. فحص ردود قصيرة جداً
        const contentLength = message.content?.length || 0;
        if (contentLength > 0 && contentLength < 10) {
          this.addProblem({
            type: 'very_short_response',
            severity: 'high',
            message: `رد قصير جداً (${contentLength} حرف): "${message.content}"`,
            conversationId: conversation.id,
            messageId: message.id,
            solution: 'تحسين prompts لطلب ردود أطول - إضافة minimum response length في system prompts'
          });
        }

        // 3. فحص ردود طويلة جداً
        if (contentLength > 1000) {
          this.addProblem({
            type: 'very_long_response',
            severity: 'low',
            message: `رد طويل جداً (${contentLength} حرف)`,
            conversationId: conversation.id,
            messageId: message.id,
            solution: 'إضافة maximum response length في system prompts - تحسين prompts لطلب ردود مختصرة'
          });
        }

        // 4. فحص أخطاء في الرد
        if (message.content && (
          message.content.toLowerCase().includes('error') ||
          message.content.toLowerCase().includes('خطأ') ||
          message.content.toLowerCase().includes('فشل') ||
          message.content.toLowerCase().includes('failed')
        )) {
          this.addProblem({
            type: 'error_in_response',
            severity: 'high',
            message: `الرد يحتوي على كلمة خطأ: "${message.content.substring(0, 100)}..."`,
            conversationId: conversation.id,
            messageId: message.id,
            solution: 'تحسين معالجة الأخطاء في AI - إخفاء الأخطاء التقنية عن المستخدم - إضافة user-friendly error messages'
          });
        }

        // 5. فحص وقت الاستجابة
        if (lastCustomerMessageTime && i > 0) {
          const responseTime = new Date(message.createdAt) - new Date(lastCustomerMessageTime);
          if (responseTime > 30000) { // أكثر من 30 ثانية
            this.addProblem({
              type: 'slow_response',
              severity: 'medium',
              message: `وقت استجابة بطيء: ${(responseTime / 1000).toFixed(2)} ثانية`,
              conversationId: conversation.id,
              messageId: message.id,
              solution: 'تحسين الأداء - استخدام caching - تحسين database queries - استخدام نموذج أسرع'
            });
          }
        }

        // 6. فحص جودة المحتوى
        if (message.content && message.content.length > 10) {
          // فحص إذا كان الرد يبدو مثل error message
          if (message.content.toLowerCase().includes('undefined') ||
            message.content.toLowerCase().includes('null') ||
            message.content.toLowerCase().includes('[object')) {
            this.addProblem({
              type: 'poor_content_quality',
              severity: 'high',
              message: `محتوى رد ضعيف يحتوي على قيم غير معالجة`,
              conversationId: conversation.id,
              messageId: message.id,
              content: message.content.substring(0, 200),
              solution: 'تحسين معالجة البيانات - التأكد من معالجة جميع القيم قبل الإرسال للـ AI'
            });
          }
        }
      }
    }

    // 7. فحص ردود مفقودة
    if (customerMessages > aiMessages) {
      const missingCount = customerMessages - aiMessages;
      this.addProblem({
        type: 'missing_responses',
        severity: 'high',
        message: `عدد أسئلة العميل (${customerMessages}) أكثر من عدد ردود AI (${aiMessages}) - ${missingCount} رد مفقود`,
        conversationId: conversation.id,
        solution: 'التحقق من سبب عدم الرد على بعض الأسئلة - تحسين retry logic - مراجعة error handling'
      });
    }

    // 8. فحص إذا كانت المحادثة فارغة
    if (messages.length === 0) {
      this.addProblem({
        type: 'empty_conversation',
        severity: 'medium',
        message: `المحادثة فارغة - لا توجد رسائل`,
        conversationId: conversation.id,
        solution: 'التحقق من سبب عدم حفظ الرسائل - مراجعة database operations'
      });
    }
  }

  /**
   * إضافة مشكلة
   */
  addProblem(problem) {
    this.problems.push(problem);

    // إضافة حل إذا لم يكن موجوداً
    if (problem.solution && !this.solutions.find(s => s.type === problem.type)) {
      this.solutions.push({
        type: problem.type,
        severity: problem.severity,
        solution: problem.solution,
        count: 1
      });
    } else if (problem.solution) {
      const existingSolution = this.solutions.find(s => s.type === problem.type);
      if (existingSolution) {
        existingSolution.count++;
      }
    }
  }

  /**
   * إنشاء التقرير
   */
  generateReport(silent = false) {
    if (!silent) {
      console.log('\n\n');
      console.log('╔══════════════════════════════════════════════════════════════════╗');
      console.log('║                   📊 تقرير المشاكل والحلول                      ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    }

    if (this.problems.length === 0) {
      if (!silent) {
        console.log('✅ لا توجد مشاكل! النظام يعمل بشكل جيد.\n');
      }
      return {
        totalProblems: 0,
        problemsByType: {},
        problemsBySeverity: {
          critical: [],
          high: [],
          medium: [],
          low: []
        },
        solutions: []
      };
    }

    // تجميع المشاكل حسب النوع
    const problemsByType = {};
    const problemsBySeverity = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    this.problems.forEach(problem => {
      if (!problemsByType[problem.type]) {
        problemsByType[problem.type] = [];
      }
      problemsByType[problem.type].push(problem);

      problemsBySeverity[problem.severity].push(problem);
    });

    // عرض الإحصائيات
    if (!silent) {
      console.log('📈 الإحصائيات:');
      console.log(`   إجمالي المشاكل: ${this.problems.length}`);
      console.log(`   🚨 حرجة: ${problemsBySeverity.critical.length}`);
      console.log(`   🔴 عالية: ${problemsBySeverity.high.length}`);
      console.log(`   🟠 متوسطة: ${problemsBySeverity.medium.length}`);
      console.log(`   🟡 منخفضة: ${problemsBySeverity.low.length}\n`);

      // عرض المشاكل حسب الخطورة
      console.log('⚠️  المشاكل المكتشفة:\n');
    }

    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      if (problemsBySeverity[severity].length > 0) {
        const severityLabels = {
          critical: '🚨 حرجة',
          high: '🔴 عالية',
          medium: '🟠 متوسطة',
          low: '🟡 منخفضة'
        };
        console.log(`${severityLabels[severity]} (${problemsBySeverity[severity].length}):`);

        // تجميع حسب النوع
        const byType = {};
        problemsBySeverity[severity].forEach(p => {
          if (!byType[p.type]) {
            byType[p.type] = [];
          }
          byType[p.type].push(p);
        });

        Object.entries(byType).forEach(([type, problems]) => {
          console.log(`   ${type}: ${problems.length} مشكلة`);
          if (problems.length <= 3) {
            problems.forEach((p, idx) => {
              console.log(`      ${idx + 1}. ${p.message}`);
            });
          } else {
            console.log(`      ${problems[0].message}`);
            console.log(`      ... و ${problems.length - 1} مشكلة أخرى`);
          }
        });
        console.log();
      }
    });

    // عرض الحلول
    console.log('💡 الحلول والتحسينات المقترحة:\n');

    const uniqueSolutions = {};
    this.problems.forEach(problem => {
      if (problem.solution && !uniqueSolutions[problem.type]) {
        uniqueSolutions[problem.type] = {
          type: problem.type,
          severity: problem.severity,
          solution: problem.solution,
          count: problemsByType[problem.type].length
        };
      }
    });

    // ترتيب الحلول حسب الخطورة
    const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
    const sortedSolutions = Object.values(uniqueSolutions).sort((a, b) => {
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    if (!silent) {
      sortedSolutions.forEach((solution, idx) => {
        const severityEmoji = {
          critical: '🚨',
          high: '🔴',
          medium: '🟠',
          low: '🟡'
        };
        console.log(`${idx + 1}. ${severityEmoji[solution.severity]} ${solution.type} (${solution.count} مشكلة):`);
        console.log(`   ${solution.solution}\n`);
      });
    }

    // توصيات إضافية
    if (!silent) {
      console.log('📋 توصيات إضافية:\n');

      if (problemsBySeverity.critical.length > 0) {
        console.log('⚠️  هناك مشاكل حرجة تحتاج إلى معالجة فورية!');
        console.log('   1. راجع إعدادات AI');
        console.log('   2. تحقق من error handling');
        console.log('   3. راجع system prompts');
        console.log();
      }

      if (!silent) {
        if (problemsByType['empty_response'] && problemsByType['empty_response'].length > 0) {
          console.log('🔧 لتحسين ردود فارغة:');
          console.log('   - أضف fallback responses في AI Agent Service');
          console.log('   - تحقق من timeout settings');
          console.log('   - راجع error handling في processCustomerMessage');
          console.log();
        }

        if (problemsByType['very_short_response'] && problemsByType['very_short_response'].length > 0) {
          console.log('🔧 لتحسين ردود قصيرة:');
          console.log('   - أضف minimum response length في system prompts');
          console.log('   - حسّن prompts لطلب ردود أكثر تفصيلاً');
          console.log('   - راجع intent analyzer responses');
          console.log();
        }

        if (problemsByType['error_in_response'] && problemsByType['error_in_response'].length > 0) {
          console.log('🔧 لتحسين معالجة الأخطاء:');
          console.log('   - أضف try-catch في جميع AI calls');
          console.log('   - استخدم user-friendly error messages');
          console.log('   - أخفِ الأخطاء التقنية عن المستخدم');
          console.log();
        }

        if (problemsByType['missing_responses'] && problemsByType['missing_responses'].length > 0) {
          console.log('🔧 لتحسين ردود مفقودة:');
          console.log('   - حسّن retry logic');
          console.log('   - راجع error handling');
          console.log('   - تحقق من timeout settings');
          console.log();
        }

        console.log('╔══════════════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ انتهى التحليل                            ║');
        console.log('╚══════════════════════════════════════════════════════════════════╝\n');
      }

      return {
        totalProblems: this.problems.length,
        problemsByType,
        problemsBySeverity: {
          critical: problemsBySeverity.critical,
          high: problemsBySeverity.high,
          medium: problemsBySeverity.medium,
          low: problemsBySeverity.low
        },
        solutions: sortedSolutions
      };
    }
  }
}

// تشغيل التحليل
async function main() {
  const analyzer = new ProblemsAnalyzer();

  try {
    const report = await analyzer.analyzeAllProblems();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ فشل التحليل:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// تشغيل إذا كان مستدعى مباشرة
if (require.main === module) {
  main();
}

module.exports = { ProblemsAnalyzer };

