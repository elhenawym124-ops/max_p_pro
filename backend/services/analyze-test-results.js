/**
 * تحليل نتائج الاختبار وحل المشاكل
 */

const fs = require('fs');
const path = require('path');

const REPORT_FILE = 'ai-test-report-1762586843327.json';

function analyzeReport() {
  const reportPath = path.join(__dirname, REPORT_FILE);
  
  if (!fs.existsSync(reportPath)) {
    console.error('❌ ملف التقرير غير موجود:', reportPath);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  console.log('\n' + '='.repeat(60));
  console.log('📊 تحليل نتائج الاختبار');
  console.log('='.repeat(60) + '\n');

  // الملخص العام
  console.log('📈 الملخص العام:');
  console.log(`   - المتوسط: ${report.summary.averageScore}/100 (${report.summary.averagePercentage})`);
  console.log(`   - الناجحة: ${report.metadata.successfulTests}/${report.metadata.totalQuestions}`);
  console.log(`   - الفاشلة: ${report.metadata.failedTests}/${report.metadata.totalQuestions}`);
  console.log(`   - الوقت: ${report.metadata.totalTime}\n`);

  // تحليل المعايير
  console.log('📊 تحليل المعايير:');
  console.log(`   - فهم النية: ${report.summary.averageIntentDetection}% (هدف: 80%+)`);
  console.log(`   - جودة الرد: ${report.summary.averageResponseQuality}/30 (هدف: 25+)`);
  console.log(`   - الوعي بالسياق: ${report.summary.averageContextAwareness}/20 (هدف: 15+)`);
  console.log(`   - التعامل مع الغموض: ${report.summary.averageHandlingAmbiguity}/15 (هدف: 12+)`);
  console.log(`   - استمرارية المحادثة: ${report.summary.averageConversationFlow}/15 (هدف: 12+)\n`);

  // المشاكل المكتشفة
  console.log('⚠️  المشاكل المكتشفة:\n');

  // 1. فهم النية ضعيف
  if (parseFloat(report.summary.averageIntentDetection) < 60) {
    console.log('❌ 1. فهم النية ضعيف (42%)');
    console.log('   المشكلة: النظام لا يفهم النوايا بشكل دقيق');
    console.log('   الحل:');
    console.log('      - تحسين intent analyzer');
    console.log('      - إضافة المزيد من الأمثلة للتدريب');
    console.log('      - تحسين الـ prompts للتحليل\n');
  }

  // 2. الوعي بالسياق ضعيف
  if (parseFloat(report.summary.averageContextAwareness) < 15) {
    console.log('❌ 2. الوعي بالسياق ضعيف (10.30/20)');
    console.log('   المشكلة: النظام لا يستخدم السياق بشكل جيد');
    console.log('   الحل:');
    console.log('      - تحسين context manager');
    console.log('      - التأكد من تمرير conversation memory بشكل صحيح');
    console.log('      - تحسين استخدام RAG data\n');
  }

  // 3. الأسئلة المعقدة فشلت
  const complexScore = report.statsByCategory.complex_cases?.averageScore || 0;
  if (complexScore < 60) {
    console.log('❌ 3. الأسئلة المعقدة فشلت (49.8/100)');
    console.log('   المشكلة: النظام لا يتعامل جيداً مع الأسئلة الغامضة أو المعقدة');
    console.log('   الحل:');
    console.log('      - تحسين handling ambiguity');
    console.log('      - إضافة fallback responses');
    console.log('      - تحسين prompts للأسئلة الغامضة\n');
  }

  // 4. Empty responses
  const failedTests = report.results.filter(r => r.success === false);
  if (failedTests.length > 0) {
    console.log(`❌ 4. ${failedTests.length} سؤال فشل تماماً (Empty response)`);
    console.log('   الأسئلة الفاشلة:');
    failedTests.forEach(test => {
      console.log(`      - السؤال #${test.questionId}: "${test.question}"`);
      console.log(`        الخطأ: ${test.error || 'Empty response'}`);
    });
    console.log('\n   الحل:');
    console.log('      - فحص إعدادات AI (temperature, max tokens)');
    console.log('      - إضافة retry logic');
    console.log('      - تحسين error handling\n');
  }

  // 5. الأسئلة الصعبة
  const hardScore = report.statsByDifficulty.hard?.averageScore || 0;
  if (hardScore < 50) {
    console.log(`❌ 5. الأسئلة الصعبة ضعيفة (${hardScore.toFixed(1)}/100)`);
    console.log('   المشكلة: النظام لا يتعامل جيداً مع الأسئلة الصعبة');
    console.log('   الحل:');
    console.log('      - تحسين prompts للأسئلة الصعبة');
    console.log('      - إضافة المزيد من الأمثلة');
    console.log('      - تحسين fallback mechanisms\n');
  }

  // التوصيات
  console.log('💡 التوصيات:\n');
  console.log('1. ✅ تحسين فهم النية:');
  console.log('   - مراجعة intentAnalyzer.js');
  console.log('   - إضافة المزيد من patterns');
  console.log('   - تحسين الـ prompts\n');

  console.log('2. ✅ تحسين الوعي بالسياق:');
  console.log('   - مراجعة contextManager.js');
  console.log('   - التأكد من تمرير memory بشكل صحيح');
  console.log('   - تحسين استخدام conversation history\n');

  console.log('3. ✅ حل مشكلة Empty responses:');
  console.log('   - فحص إعدادات Gemini');
  console.log('   - إضافة retry logic');
  console.log('   - تحسين error handling\n');

  console.log('4. ✅ تحسين التعامل مع الأسئلة المعقدة:');
  console.log('   - إضافة fallback responses');
  console.log('   - تحسين prompts للأسئلة الغامضة');
  console.log('   - إضافة clarification requests\n');

  // النقاط الإيجابية
  console.log('✅ النقاط الإيجابية:\n');
  console.log(`   - الأسئلة السهلة: ${report.statsByDifficulty.easy.averageScore.toFixed(1)}/100 (ممتاز)`);
  console.log(`   - الأسئلة المتوسطة: ${report.statsByDifficulty.medium.averageScore.toFixed(1)}/100 (جيد جداً)`);
  console.log(`   - جودة الرد: ${report.summary.averageResponseQuality}/30 (جيد)`);
  console.log(`   - استمرارية المحادثة: ${report.summary.averageConversationFlow}/15 (جيد)\n`);

  console.log('='.repeat(60) + '\n');
}

analyzeReport();

