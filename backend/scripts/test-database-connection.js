/**
 * سكريبت لاختبار الاتصال بقاعدة البيانات المحلية
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 [Test] اختبار الاتصال بقاعدة البيانات...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير موجود في .env');
    process.exit(1);
  }
  
  // إخفاء كلمة المرور في الـ log
  const safeUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
  console.log('📊 [Test] DATABASE_URL:', safeUrl);
  console.log('');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: ['error', 'warn']
  });
  
  try {
    console.log('1️⃣ محاولة الاتصال...');
    const startTime = Date.now();
    
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 60 seconds')), 60000)
      )
    ]);
    
    const connectTime = Date.now() - startTime;
    console.log(`✅ [Test] الاتصال نجح في ${connectTime}ms\n`);
    
    console.log('2️⃣ اختبار استعلام بسيط...');
    const queryStartTime = Date.now();
    
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 as test, NOW() as current_datetime, DATABASE() as db_name`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 60 seconds')), 60000)
      )
    ]);
    
    const queryTime = Date.now() - queryStartTime;
    console.log(`✅ [Test] الاستعلام نجح في ${queryTime}ms`);
    console.log('📊 [Test] النتيجة:', result);
    console.log('');
    
    console.log('3️⃣ اختبار استعلام من جدول موجود...');
    const tableQueryStartTime = Date.now();
    
    const tables = await Promise.race([
      prisma.$queryRaw`SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Table query timeout after 60 seconds')), 60000)
      )
    ]);
    
    const tableQueryTime = Date.now() - tableQueryStartTime;
    console.log(`✅ [Test] استعلام الجداول نجح في ${tableQueryTime}ms`);
    console.log('📊 [Test] عدد الجداول:', tables[0]?.count || 'غير معروف');
    console.log('');
    
    console.log('4️⃣ التحقق من جدول gemini_key_models...');
    try {
      const geminiTable = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM gemini_key_models
      `;
      console.log(`✅ [Test] جدول gemini_key_models موجود (${geminiTable[0]?.count || 0} سجل)`);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  [Test] جدول gemini_key_models غير موجود');
      } else {
        console.error('❌ [Test] خطأ في فحص الجدول:', error.message);
      }
    }
    
    console.log('\n✅ [Test] جميع الاختبارات نجحت!');
    console.log('💡 [Test] قاعدة البيانات المحلية تعمل بشكل صحيح');
    
  } catch (error) {
    console.error('\n❌ [Test] فشل الاختبار:', error.message);
    console.log('\n💡 [Test] المشاكل المحتملة:');
    console.log('   1. قاعدة البيانات بطيئة جداً');
    console.log('   2. إعدادات timeout في .env قصيرة');
    console.log('   3. مشكلة في الاتصال نفسه');
    console.log('   4. MySQL لا يعمل أو بطيء');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection().catch(error => {
  console.error('❌ خطأ غير متوقع:', error);
  process.exit(1);
});

