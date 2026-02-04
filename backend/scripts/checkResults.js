/**
 * سكريبت سريع للتحقق من نتائج الاختبارات
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { ProblemsAnalyzer } = require('./getAndAnalyzeProblems');

async function checkResults() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    // جلب آخر محادثة اختبارية
    const lastConversation = await getSharedPrismaClient().conversation.findFirst({
      where: { channel: 'TEST' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        company: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!lastConversation) {
      console.log('❌ لا توجد محادثات اختبارية');
      return;
    }
    
    console.log(`✅ آخر محادثة: ${lastConversation.id}`);
    console.log(`   الشركة: ${lastConversation.company?.name || 'غير محدد'}`);
    console.log(`   عدد الرسائل: ${lastConversation.messages.length}\n`);
    
    // تحليل المشاكل
    const analyzer = new ProblemsAnalyzer();
    await analyzer.analyzeConversation(lastConversation);
    const report = analyzer.generateReport();
    
    console.log('\n✅ تم التحليل!\n');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    process.exit(0);
  }
}

checkResults();


