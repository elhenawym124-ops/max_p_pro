/**
 * سكريبت سريع لتحليل المشاكل الموجودة
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { ProblemsAnalyzer } = require('./getAndAnalyzeProblems');

async function quickAnalyze() {
  try {
    console.log('🔍 بدء تحليل سريع للمشاكل...\n');
    
    const analyzer = new ProblemsAnalyzer();
    const report = await analyzer.analyzeAllProblems();
    
    if (report && report.totalProblems > 0) {
      console.log('\n✅ تم العثور على مشاكل!');
      console.log(`   إجمالي المشاكل: ${report.totalProblems}`);
    } else {
      console.log('\n✅ لا توجد مشاكل في المحادثات الاختبارية الموجودة');
      console.log('💡 قم بتشغيل الاختبار أولاً لرؤية المشاكل الفعلية');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ فشل التحليل:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

quickAnalyze();

