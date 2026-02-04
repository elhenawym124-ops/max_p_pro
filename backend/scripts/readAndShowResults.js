/**
 * قراءة وتحليل النتائج الموجودة في قاعدة البيانات
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { ProblemsAnalyzer } = require('./getAndAnalyzeProblems');

async function readAndShowResults() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    // جلب آخر 5 محادثات اختبارية
    const conversations = await getSharedPrismaClient().conversation.findMany({
      where: { channel: 'TEST' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
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
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (conversations.length === 0) {
      console.log('❌ لا توجد محادثات اختبارية');
      console.log('💡 قم بتشغيل الاختبار أولاً\n');
      process.exit(0);
    }
    
    console.log(`✅ تم العثور على ${conversations.length} محادثة اختبارية\n`);
    
    // تحليل جميع المحادثات
    const analyzer = new ProblemsAnalyzer();
    
    for (const conversation of conversations) {
      await analyzer.analyzeConversation(conversation);
    }
    
    // عرض التقرير
    const report = analyzer.generateReport();
    
    // عرض ملخص نهائي
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 الملخص النهائي                            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📊 الإحصائيات:`);
    console.log(`   عدد المحادثات: ${conversations.length}`);
    console.log(`   إجمالي المشاكل: ${report.totalProblems}`);
    console.log(`   🚨 حرجة: ${report.problemsBySeverity.critical.length}`);
    console.log(`   🔴 عالية: ${report.problemsBySeverity.high.length}`);
    console.log(`   🟠 متوسطة: ${report.problemsBySeverity.medium.length}`);
    console.log(`   🟡 منخفضة: ${report.problemsBySeverity.low.length}\n`);
    
    if (report.solutions && report.solutions.length > 0) {
      console.log(`💡 الحلول المقترحة (${report.solutions.length}):\n`);
      report.solutions.forEach((solution, idx) => {
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
    
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
}

readAndShowResults();


