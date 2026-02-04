/**
 * سكريبت كامل لتشغيل الاختبار وتحليل النتائج مع تقليل الـ logging
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// تعطيل معظم console.log
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

let logLevel = 'minimal'; // minimal, normal, verbose

console.log = function(...args) {
  if (logLevel === 'verbose') {
    originalConsoleLog.apply(console, args);
  } else if (logLevel === 'normal') {
    const msg = args.join(' ');
    if (msg.includes('✅') || msg.includes('❌') || msg.includes('📊') || 
        msg.includes('⚠️') || msg.includes('🚨') || msg.includes('💡')) {
      originalConsoleLog.apply(console, args);
    }
  } else {
    // minimal - فقط الرسائل المهمة جداً
    const msg = args.join(' ');
    if (msg.includes('╔') || msg.includes('✅ تم') || msg.includes('❌') || 
        msg.includes('📊 التقرير') || msg.includes('💡') || msg.includes('🚨')) {
      originalConsoleLog.apply(console, args);
    }
  }
};

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { AIAnalyzerAndFixer } = require('./analyzeAndFixAITest');
const { ProblemsAnalyzer } = require('./getAndAnalyzeProblems');

async function runFullTest() {
  try {
    console.log('🚀 بدء تشغيل الاختبار والتحليل...\n');
    
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    // البحث عن شركة نشطة
    const company = await getSharedPrismaClient().company.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!company) {
      throw new Error('لا توجد شركات نشطة');
    }
    
    console.log(`✅ الشركة: ${company.name}\n`);
    
    // تشغيل الاختبار
    logLevel = 'minimal';
    const analyzer = new AIAnalyzerAndFixer();
    analyzer.companyId = company.id;
    
    // تشغيل الاختبار مع عدد أسئلة أقل للسرعة
    await analyzer.initialize();
    const testQuestionGenerator = require('../services/testQuestionGenerator');
    const testQuestionsData = await testQuestionGenerator.generateTestQuestions(company.id);
    
    // عدد أسئلة أقل للسرعة (5 أسئلة فقط)
    const questions = [
      ...testQuestionsData.questions.greeting.slice(0, 1),
      ...testQuestionsData.questions.product_inquiry.slice(0, 2),
      ...testQuestionsData.questions.price_inquiry.slice(0, 1),
      ...testQuestionsData.questions.order_inquiry.slice(0, 1)
    ];
    
    analyzer.analysisResults.totalQuestions = questions.length;
    console.log(`📝 جاري إرسال ${questions.length} سؤال...\n`);
    
    const results = [];
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const result = await analyzer.sendAndAnalyzeQuestion(
        question.question,
        question,
        i + 1
      );
      results.push(result);
      
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 ثانية فقط
      }
    }
    
    analyzer.generateFinalReport();
    const testResults = analyzer.analysisResults;
    
    console.log('\n⏳ جاري حفظ البيانات...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // تحليل المشاكل - فقط آخر محادثة
    console.log('\n🔍 جاري تحليل المشاكل...\n');
    const problemsAnalyzer = new ProblemsAnalyzer();
    
    // جلب آخر محادثة فقط
    const lastConversation = await getSharedPrismaClient().conversation.findFirst({
      where: {
        companyId: company.id,
        channel: 'TEST',
        id: analyzer.conversationId
      },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        company: true
      }
    });
    
    if (lastConversation) {
      await problemsAnalyzer.analyzeConversation(lastConversation);
    }
    
    const problemsReport = problemsAnalyzer.generateReport(true); // silent mode
    
    // عرض النتائج النهائية
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 التقرير النهائي                           ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📈 إحصائيات الاختبار:`);
    console.log(`   إجمالي الأسئلة: ${testResults.totalQuestions}`);
    console.log(`   تم التحليل: ${testResults.analyzed}`);
    console.log(`   نسبة النجاح: ${testResults.totalQuestions > 0 ? ((testResults.analyzed / testResults.totalQuestions) * 100).toFixed(2) : 0}%`);
    console.log(`   المشاكل في الاختبار: ${testResults.problems.length}\n`);
    
    if (problemsReport && problemsReport.totalProblems > 0) {
      console.log(`📊 تحليل المشاكل من قاعدة البيانات:`);
      console.log(`   إجمالي المشاكل: ${problemsReport.totalProblems}`);
      console.log(`   🚨 حرجة: ${problemsReport.problemsBySeverity?.critical?.length || 0}`);
      console.log(`   🔴 عالية: ${problemsReport.problemsBySeverity?.high?.length || 0}`);
      console.log(`   🟠 متوسطة: ${problemsReport.problemsBySeverity?.medium?.length || 0}`);
      console.log(`   🟡 منخفضة: ${problemsReport.problemsBySeverity?.low?.length || 0}\n`);
      
      // عرض المشاكل الرئيسية
      if (problemsReport.problemsByType) {
        console.log(`🔍 المشاكل حسب النوع:`);
        Object.entries(problemsReport.problemsByType)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 5)
          .forEach(([type, problems]) => {
            console.log(`   ${type}: ${problems.length} مشكلة`);
          });
        console.log();
      }
      
      // عرض الحلول
      if (problemsReport.solutions && problemsReport.solutions.length > 0) {
        console.log(`💡 الحلول والتحسينات المقترحة (${problemsReport.solutions.length}):\n`);
        problemsReport.solutions.forEach((solution, idx) => {
          const severityEmoji = {
            critical: '🚨',
            high: '🔴',
            medium: '🟠',
            low: '🟡'
          };
          console.log(`${idx + 1}. ${severityEmoji[solution.severity] || '•'} ${solution.type} (${solution.count} مشكلة):`);
          console.log(`   ${solution.solution}\n`);
        });
      }
    } else {
      console.log(`✅ لا توجد مشاكل في قاعدة البيانات!\n`);
    }
    
    console.log(`💬 معرف المحادثة: ${analyzer.conversationId}`);
    console.log(`   يمكنك عرض المحادثة في: /test-chat\n`);
    
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ انتهى التحليل                            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    if (error.stack) {
      console.error(error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

runFullTest();


