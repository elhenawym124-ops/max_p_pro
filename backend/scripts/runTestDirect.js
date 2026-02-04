/**
 * تشغيل مباشر للاختبار بدون تعقيدات
 */

// قراءة .env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { AIAnalyzerAndFixer } = require('./analyzeAndFixAITest');
const { ProblemsAnalyzer } = require('./getAndAnalyzeProblems');

async function runTest() {
  // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
  
  try {
    console.log('🚀 بدء الاختبار...\n');
    
    // جلب شركة
    const company = await getSharedPrismaClient().company.findFirst({
      where: { isActive: true }
    });
    
    if (!company) {
      throw new Error('لا توجد شركات');
    }
    
    console.log(`✅ الشركة: ${company.name}\n`);
    
    // تهيئة المحلل
    const analyzer = new AIAnalyzerAndFixer();
    analyzer.companyId = company.id;
    
    await analyzer.initialize();
    
    // أسئلة مختصرة (3 أسئلة فقط)
    const testQuestionGenerator = require('../services/testQuestionGenerator');
    const questionsData = await testQuestionGenerator.generateTestQuestions(company.id);
    
    const questions = [
      questionsData.questions.greeting[0],
      questionsData.questions.product_inquiry[0],
      questionsData.questions.price_inquiry[0]
    ];
    
    console.log(`📝 إرسال ${questions.length} أسئلة...\n`);
    
    // إرسال الأسئلة
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`السؤال ${i + 1}: ${q.question.substring(0, 50)}...`);
      
      await analyzer.sendAndAnalyzeQuestion(q.question, q, i + 1);
      
      if (i < questions.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    
    console.log('\n⏳ حفظ البيانات...');
    await new Promise(r => setTimeout(r, 3000));
    
    // تحليل المشاكل
    console.log('\n🔍 تحليل المشاكل...\n');
    
    const lastConv = await getSharedPrismaClient().conversation.findFirst({
      where: {
        companyId: company.id,
        channel: 'TEST',
        id: analyzer.conversationId
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        company: true
      }
    });
    
    if (lastConv) {
      const problemsAnalyzer = new ProblemsAnalyzer();
      await problemsAnalyzer.analyzeConversation(lastConv);
      const report = problemsAnalyzer.generateReport(true);
      
      // عرض النتائج
      console.log('\n╔══════════════════════════════════════════════════════════════════╗');
      console.log('║                    📊 النتائج                                    ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝\n');
      
      console.log(`📈 الأسئلة: ${questions.length}`);
      console.log(`✅ تم التحليل: ${analyzer.analysisResults.analyzed}`);
      console.log(`⚠️  المشاكل: ${report.totalProblems}\n`);
      
      if (report.totalProblems > 0) {
        console.log(`🚨 حرجة: ${report.problemsBySeverity.critical.length}`);
        console.log(`🔴 عالية: ${report.problemsBySeverity.high.length}`);
        console.log(`🟠 متوسطة: ${report.problemsBySeverity.medium.length}`);
        console.log(`🟡 منخفضة: ${report.problemsBySeverity.low.length}\n`);
        
        if (report.solutions && report.solutions.length > 0) {
          console.log('💡 الحلول:\n');
          report.solutions.slice(0, 5).forEach((s, i) => {
            console.log(`${i + 1}. ${s.type}: ${s.solution}`);
          });
        }
      } else {
        console.log('✅ لا توجد مشاكل!\n');
      }
      
      console.log(`💬 المحادثة: ${analyzer.conversationId}\n`);
    }
    
    console.log('✅ تم!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error.stack?.substring(0, 300));
    process.exit(1);
  }
}

// تشغيل
runTest();


