/**
 * التحقق من جاهزية النظام للاختبار
 */

const fs = require('fs');
const path = require('path');

async function checkReadiness() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 فحص جاهزية النظام للاختبار');
  console.log('='.repeat(60) + '\n');

  const checks = [];
  
  // 1. التحقق من ملف الأسئلة
  console.log('1️⃣ فحص ملف الأسئلة...');
  try {
    const servicesDir = __dirname;
    const questionFiles = fs.readdirSync(servicesDir)
      .filter(file => file.startsWith('company-questions-') && file.endsWith('.json'));
    
    if (questionFiles.length > 0) {
      const filePath = path.join(servicesDir, questionFiles[0]);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`   ✅ ملف موجود: ${questionFiles[0]}`);
      console.log(`   ✅ عدد الأسئلة: ${data.questions?.length || 0}`);
      checks.push({ name: 'ملف الأسئلة', status: '✅', details: `${data.questions?.length || 0} سؤال` });
    } else {
      console.log('   ❌ ملف الأسئلة غير موجود');
      checks.push({ name: 'ملف الأسئلة', status: '❌', details: 'غير موجود' });
    }
  } catch (error) {
    console.log(`   ❌ خطأ: ${error.message}`);
    checks.push({ name: 'ملف الأسئلة', status: '❌', details: error.message });
  }

  // 2. التحقق من AITestRunner
  console.log('\n2️⃣ فحص AITestRunner...');
  try {
    const AITestRunner = require('./run-ai-intelligence-test');
    console.log('   ✅ AITestRunner محمل بنجاح');
    checks.push({ name: 'AITestRunner', status: '✅', details: 'محمل بنجاح' });
  } catch (error) {
    console.log(`   ❌ خطأ: ${error.message}`);
    checks.push({ name: 'AITestRunner', status: '❌', details: error.message });
  }

  // 3. التحقق من aiAgentService
  console.log('\n3️⃣ فحص aiAgentService...');
  try {
    const aiAgentService = require('./aiAgentService');
    console.log('   ✅ aiAgentService محمل بنجاح');
    checks.push({ name: 'aiAgentService', status: '✅', details: 'محمل بنجاح' });
  } catch (error) {
    console.log(`   ❌ خطأ: ${error.message}`);
    checks.push({ name: 'aiAgentService', status: '❌', details: error.message });
  }

  // 4. التحقق من قاعدة البيانات
  console.log('\n4️⃣ فحص قاعدة البيانات...');
  try {
    const { getSharedPrismaClient } = require('./sharedDatabase');
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    // محاولة استعلام بسيط
    const company = await getSharedPrismaClient().company.findFirst({
      where: { id: 'cmem8ayyr004cufakqkcsyn97' }
    });
    
    if (company) {
      console.log(`   ✅ الاتصال بقاعدة البيانات ناجح`);
      console.log(`   ✅ الشركة موجودة: ${company.name}`);
      checks.push({ name: 'قاعدة البيانات', status: '✅', details: 'متصل' });
    } else {
      console.log('   ⚠️ الشركة غير موجودة');
      checks.push({ name: 'قاعدة البيانات', status: '⚠️', details: 'الشركة غير موجودة' });
    }
    
    await getSharedPrismaClient().$disconnect();
  } catch (error) {
    console.log(`   ❌ خطأ: ${error.message}`);
    checks.push({ name: 'قاعدة البيانات', status: '❌', details: error.message });
  }

  // ملخص
  console.log('\n' + '='.repeat(60));
  console.log('📊 ملخص الفحص:');
  console.log('='.repeat(60));
  checks.forEach(check => {
    console.log(`${check.status} ${check.name}: ${check.details}`);
  });

  const allPassed = checks.every(c => c.status === '✅');
  if (allPassed) {
    console.log('\n✅ النظام جاهز للاختبار!');
    console.log('💡 يمكنك تشغيل: node test-with-company-questions.js');
  } else {
    console.log('\n⚠️ يوجد مشاكل يجب حلها قبل الاختبار');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(allPassed ? 0 : 1);
}

checkReadiness().catch(error => {
  console.error('\n❌ خطأ في الفحص:', error);
  console.error(error.stack);
  process.exit(1);
});



