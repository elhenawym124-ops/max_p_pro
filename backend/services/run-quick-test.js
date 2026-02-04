/**
 * اختبار سريع - 10 أسئلة فقط
 */

const AITestRunner = require('./run-ai-intelligence-test');
const questionsData = require('./ai-test-questions.json');
const { getSharedPrismaClient } = require('./sharedDatabase');

async function quickTest() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    // الحصول على الشركة mo-test
    const company = await getSharedPrismaClient().company.findFirst({
      where: {
        OR: [
          { name: { contains: 'mo-test' } },
          { email: { contains: 'mo-test' } },
          { id: 'cmhnzbjl50000ufus81imj8wq' } // ID معروف
        ]
      }
    });

    if (!company) {
      console.error('❌ لم يتم العثور على شركة mo-test');
      process.exit(1);
    }

    console.log(`\n✅ تم العثور على الشركة: ${company.name} (${company.id})\n`);

    const runner = new AITestRunner(company.id);
    
    // اختبار 10 أسئلة فقط (5 من البداية، 5 من المنتصف)
    const allQuestions = [];
    for (const categoryKey in questionsData.categories) {
      allQuestions.push(...questionsData.categories[categoryKey].questions);
    }
    allQuestions.sort((a, b) => a.id - b.id);

    const testQuestions = [
      ...allQuestions.slice(0, 5),  // أول 5 أسئلة
      ...allQuestions.slice(25, 30) // 5 أسئلة من المنتصف
    ];

    console.log(`🧪 اختبار ${testQuestions.length} أسئلة...\n`);

    const results = [];
    for (const question of testQuestions) {
      const result = await runner.runTest(question);
      results.push(result);
    }

    // طباعة ملخص سريع
    const total = results.length;
    const successful = results.filter(r => r.success !== false).length;
    const averageScore = results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / total;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ملخص الاختبار السريع`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ الناجحة: ${successful}/${total}`);
    console.log(`📈 المتوسط: ${averageScore.toFixed(1)}/100`);
    console.log(`${'='.repeat(60)}\n`);

    // حفظ النتائج
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, `quick-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      companyId: company.id,
      companyName: company.name,
      testDate: new Date().toISOString(),
      totalQuestions: total,
      successfulTests: successful,
      averageScore: averageScore.toFixed(2),
      results
    }, null, 2), 'utf8');
    
    console.log(`📄 تم حفظ التقرير في: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ خطأ:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

quickTest();


