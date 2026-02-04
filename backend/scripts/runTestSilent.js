/**
 * سكريبت صامت لتشغيل الاختبار - يطبع النتائج فقط
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { AIAnalyzerAndFixer } = require('./analyzeAndFixAITest');
const { ProblemsAnalyzer } = require('./getAndAnalyzeProblems');

// تقليل الـ logging
const originalLog = console.log;
console.log = function(...args) {
  const msg = args.join(' ');
  // طباعة فقط الرسائل المهمة
  if (msg.includes('✅') || msg.includes('❌') || msg.includes('📊') || 
      msg.includes('⚠️') || msg.includes('🚨') || msg.includes('💡') ||
      msg.includes('المشاكل') || msg.includes('الحلول') || msg.includes('النتائج')) {
    originalLog.apply(console, args);
  }
};

async function runTestSilent() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    const company = await getSharedPrismaClient().company.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!company) {
      throw new Error('لا توجد شركات نشطة');
    }
    
    const analyzer = new AIAnalyzerAndFixer();
    analyzer.companyId = company.id;
    
    const testResults = await analyzer.runFullAnalysis();
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const problemsAnalyzer = new ProblemsAnalyzer();
    const problemsReport = await problemsAnalyzer.analyzeAllProblems();
    
    // طباعة النتائج النهائية فقط
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 النتائج النهائية                          ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📈 إحصائيات الاختبار:`);
    console.log(`   إجمالي الأسئلة: ${testResults.totalQuestions}`);
    console.log(`   تم التحليل: ${testResults.analyzed}`);
    console.log(`   نسبة النجاح: ${testResults.totalQuestions > 0 ? ((testResults.analyzed / testResults.totalQuestions) * 100).toFixed(2) : 0}%`);
    console.log(`   المشاكل المكتشفة: ${testResults.problems.length}\n`);
    
    if (problemsReport && problemsReport.totalProblems > 0) {
      console.log(`📊 تحليل المشاكل:`);
      console.log(`   إجمالي المشاكل: ${problemsReport.totalProblems}`);
      console.log(`   🚨 حرجة: ${problemsReport.problemsBySeverity?.critical?.length || 0}`);
      console.log(`   🔴 عالية: ${problemsReport.problemsBySeverity?.high?.length || 0}`);
      console.log(`   🟠 متوسطة: ${problemsReport.problemsBySeverity?.medium?.length || 0}`);
      console.log(`   🟡 منخفضة: ${problemsReport.problemsBySeverity?.low?.length || 0}\n`);
      
      if (problemsReport.solutions && problemsReport.solutions.length > 0) {
        console.log(`💡 الحلول المقترحة (${problemsReport.solutions.length}):`);
        problemsReport.solutions.forEach((solution, idx) => {
          console.log(`   ${idx + 1}. ${solution.type}: ${solution.solution}`);
        });
      }
    } else {
      console.log(`✅ لا توجد مشاكل! النظام يعمل بشكل جيد.\n`);
    }
    
    console.log(`💬 معرف المحادثة: ${analyzer.conversationId}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
}

runTestSilent();


