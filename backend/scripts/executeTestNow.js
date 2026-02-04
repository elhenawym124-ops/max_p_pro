/**
 * سكريبت مباشر لتشغيل الاختبار وتحليل النتائج
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { AIAnalyzerAndFixer } = require('./analyzeAndFixAITest');
const { ProblemsAnalyzer } = require('./getAndAnalyzeProblems');

async function executeTest() {
  try {
    console.log('🚀 بدء تشغيل الاختبار...\n');
    
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    // البحث عن شركة نشطة
    const company = await getSharedPrismaClient().company.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!company) {
      throw new Error('لا توجد شركات نشطة');
    }
    
    console.log(`✅ استخدام الشركة: ${company.name} (${company.id})\n`);
    
    // تشغيل الاختبار
    const analyzer = new AIAnalyzerAndFixer();
    analyzer.companyId = company.id;
    
    const testResults = await analyzer.runFullAnalysis();
    
    console.log('\n⏳ انتظار 5 ثواني لحفظ البيانات...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // تحليل المشاكل
    console.log('\n🔍 بدء تحليل المشاكل...\n');
    const problemsAnalyzer = new ProblemsAnalyzer();
    const problemsReport = await problemsAnalyzer.analyzeAllProblems();
    
    console.log('\n✅ تم إكمال الاختبار والتحليل!\n');
    console.log('📊 الملخص:');
    console.log(`   الأسئلة: ${testResults.totalQuestions}`);
    console.log(`   تم التحليل: ${testResults.analyzed}`);
    console.log(`   المشاكل: ${problemsReport?.totalProblems || 0}`);
    console.log(`   المحادثة: ${analyzer.conversationId}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

executeTest();


