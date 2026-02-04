/**
 * سكريبت للتحقق من إعدادات PostgreSQL
 * شغله على السيرفر للتأكد من كل شيء صح
 */

require('dotenv').config();

console.log('🔍 فحص إعدادات PostgreSQL...\n');

// 1. التحقق من ملف .env
console.log('📁 ملف .env:');
console.log('   المسار:', require('path').resolve('.env'));

// 2. التحقق من POSTGRES_URL
console.log('\n🔑 POSTGRES_URL:');
if (process.env.POSTGRES_URL) {
  // إخفاء كلمة المرور للأمان
  const url = process.env.POSTGRES_URL.replace(/:([^@]+)@/, ':****@');
  console.log('   ✅ موجود:', url);
  
  // تحليل الـ URL
  try {
    const urlObj = new URL(process.env.POSTGRES_URL);
    console.log('\n📊 تفاصيل الاتصال:');
    console.log('   Protocol:', urlObj.protocol);
    console.log('   Username:', urlObj.username);
    console.log('   Password:', urlObj.password ? '****' : '❌ غير موجود');
    console.log('   Host:', urlObj.hostname);
    console.log('   Port:', urlObj.port);
    console.log('   Database:', urlObj.pathname.substring(1));
  } catch (e) {
    console.log('   ⚠️ خطأ في صيغة URL:', e.message);
  }
} else {
  console.log('   ❌ غير موجود في ملف .env');
  console.log('\n💡 أضف السطر التالي في ملف .env:');
  console.log('   POSTGRES_URL="postgresql://appuser:your_password@localhost:5432/maxp"');
}

// 3. اختبار الاتصال
console.log('\n🔌 اختبار الاتصال...');
if (process.env.POSTGRES_URL) {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: false
  });

  client.connect()
    .then(() => {
      console.log('   ✅ الاتصال ناجح!');
      
      // اختبار pgvector
      return client.query("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector");
    })
    .then((result) => {
      if (result.rows[0].has_vector) {
        console.log('   ✅ pgvector extension مثبت');
      } else {
        console.log('   ⚠️ pgvector extension غير مثبت');
        console.log('   💡 شغل: CREATE EXTENSION vector;');
      }
      
      // عدد الجداول
      return client.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'");
    })
    .then((result) => {
      console.log(`   📊 عدد الجداول: ${result.rows[0].count}`);
      return client.end();
    })
    .then(() => {
      console.log('\n✅ كل شيء جاهز! يمكنك تشغيل سكريبت النقل.');
      process.exit(0);
    })
    .catch((error) => {
      console.log('   ❌ فشل الاتصال:', error.message);
      console.log('\n🔧 الحلول المحتملة:');
      console.log('   1. تأكد من تشغيل PostgreSQL: sudo systemctl status postgresql');
      console.log('   2. تأكد من كلمة المرور صحيحة');
      console.log('   3. تأكد من وجود قاعدة البيانات: psql -U postgres -c "\\l"');
      console.log('   4. تأكد من صلاحيات المستخدم');
      client.end();
      process.exit(1);
    });
} else {
  console.log('   ⏭️ تخطي اختبار الاتصال (POSTGRES_URL غير موجود)');
  process.exit(1);
}
