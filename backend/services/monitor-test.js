/**
 * مراقبة تقدم الاختبار
 */

const fs = require('fs');
const path = require('path');

function monitorTest() {
  console.log('\n🔍 مراقبة تقدم الاختبار...\n');
  
  const servicesDir = __dirname;
  let lastReport = null;
  
  const checkInterval = setInterval(() => {
    // البحث عن ملفات التقرير
    const files = fs.readdirSync(servicesDir)
      .filter(file => file.startsWith('ai-test-report-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(servicesDir, file),
        time: fs.statSync(path.join(servicesDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
      const latestFile = files[0];
      
      if (latestFile.name !== lastReport) {
        lastReport = latestFile.name;
        
        try {
          const report = JSON.parse(fs.readFileSync(latestFile.path, 'utf8'));
          
          console.log(`\n📊 التقرير: ${latestFile.name}`);
          console.log(`   - الوقت: ${latestFile.time.toLocaleString('ar-EG')}`);
          console.log(`   - الأسئلة المكتملة: ${report.results?.length || 0}/${report.metadata?.totalQuestions || 0}`);
          
          if (report.results && report.results.length > 0) {
            const successful = report.results.filter(r => r.success !== false).length;
            const avgScore = report.results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / report.results.length;
            
            console.log(`   - الناجحة: ${successful}`);
            console.log(`   - المتوسط: ${avgScore.toFixed(1)}/100`);
          }
          
          if (report.metadata?.totalQuestions === report.results?.length) {
            console.log('\n✅ الاختبار اكتمل!\n');
            clearInterval(checkInterval);
            process.exit(0);
          }
        } catch (error) {
          // الملف قيد الكتابة
        }
      }
    }
  }, 5000); // فحص كل 5 ثواني
  
  // إيقاف بعد 30 دقيقة
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log('\n⏱️  انتهى وقت المراقبة\n');
    process.exit(0);
  }, 30 * 60 * 1000);
}

monitorTest();

