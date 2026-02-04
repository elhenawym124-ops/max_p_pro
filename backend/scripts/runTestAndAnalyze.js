/**
 * سكريبت موحد لتشغيل الاختبار وتحليل النتائج
 */

const { AIAnalyzerAndFixer } = require('./analyzeAndFixAITest');
const { ProblemsAnalyzer } = require('./getAndAnalyzeProblems');

async function runTestAndAnalyze() {
  try {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║          🚀 تشغيل الاختبار وتحليل النتائج                       ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // الخطوة 1: تشغيل الاختبار
    console.log('📝 الخطوة 1: تشغيل اختبار التحليل الشامل...\n');
    
    const analyzer = new AIAnalyzerAndFixer();
    const testResults = await analyzer.runFullAnalysis();

    console.log('\n✅ تم إكمال الاختبار!\n');
    console.log(`📊 النتائج:`);
    console.log(`   إجمالي الأسئلة: ${testResults.totalQuestions}`);
    console.log(`   تم التحليل: ${testResults.analyzed}`);
    console.log(`   المشاكل: ${testResults.problems.length}`);
    console.log(`   الحلول: ${testResults.fixes.length}\n`);

    // انتظار قصير لضمان حفظ البيانات
    console.log('⏳ انتظار 3 ثواني لحفظ البيانات...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // الخطوة 2: تحليل المشاكل
    console.log('\n📝 الخطوة 2: تحليل المشاكل من قاعدة البيانات...\n');
    
    const problemsAnalyzer = new ProblemsAnalyzer();
    const problemsReport = await problemsAnalyzer.analyzeAllProblems();

    console.log('\n✅ تم إكمال التحليل!\n');

    // ملخص نهائي
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 الملخص النهائي                             ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log(`📈 إحصائيات الاختبار:`);
    console.log(`   إجمالي الأسئلة: ${testResults.totalQuestions}`);
    console.log(`   تم التحليل: ${testResults.analyzed}`);
    console.log(`   نسبة النجاح: ${testResults.totalQuestions > 0 ? ((testResults.analyzed / testResults.totalQuestions) * 100).toFixed(2) : 0}%`);
    console.log(`   المشاكل المكتشفة: ${testResults.problems.length}`);
    console.log(`   الحلول المقترحة: ${testResults.fixes.length}\n`);

    if (problemsReport && problemsReport.totalProblems > 0) {
      console.log(`📊 إحصائيات المشاكل:`);
      console.log(`   إجمالي المشاكل: ${problemsReport.totalProblems}`);
      console.log(`   🚨 حرجة: ${problemsReport.problemsBySeverity?.critical?.length || 0}`);
      console.log(`   🔴 عالية: ${problemsReport.problemsBySeverity?.high?.length || 0}`);
      console.log(`   🟠 متوسطة: ${problemsReport.problemsBySeverity?.medium?.length || 0}`);
      console.log(`   🟡 منخفضة: ${problemsReport.problemsBySeverity?.low?.length || 0}\n`);
    }

    console.log('💡 معرف المحادثة:', analyzer.conversationId);
    console.log('   يمكنك عرض المحادثة في: /test-chat\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ فشل الاختبار أو التحليل:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// تشغيل
if (require.main === module) {
  runTestAndAnalyze();
}

module.exports = { runTestAndAnalyze };

