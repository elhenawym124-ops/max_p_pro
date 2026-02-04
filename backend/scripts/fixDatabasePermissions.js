/**
 * 🔧 سكريبت إصلاح صلاحيات قاعدة البيانات
 * 
 * هذا السكريبت يحاول منح الصلاحيات المطلوبة للمستخدم
 * 
 * ⚠️  ملاحظة: يحتاج إلى صلاحيات GRANT (عادة root)
 * 
 * الاستخدام:
 *   node backend/scripts/fixDatabasePermissions.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// معلومات المستخدم من الأخطاء
const DB_USER = 'u339372869_test2';
const DB_HOST = '153.92.223.119'; // IP من الخطأ الحالي
const DB_NAME = 'u339372869_test2';
const TABLE_NAME = 'sent_message_stats'; // الجدول المحدد الذي يحتاج صلاحيات

async function fixPermissions() {
  console.log('🔧 بدء إصلاح صلاحيات قاعدة البيانات...\n');
  console.log(`المستخدم: ${DB_USER}`);
  console.log(`IP: ${DB_HOST}`);
  console.log(`قاعدة البيانات: ${DB_NAME}\n`);

  try {
    // محاولة تنفيذ أمر GRANT للجدول المحدد
    console.log('🔄 جاري منح الصلاحيات على الجدول المحدد...');
    console.log(`   الجدول: ${TABLE_NAME}`);
    
    // منح الصلاحيات على الجدول المحدد
    await prisma.$executeRawUnsafe(`
      GRANT INSERT, UPDATE, SELECT ON \`${DB_NAME}\`.\`${TABLE_NAME}\` TO '${DB_USER}'@'${DB_HOST}';
    `);
    
    // محاولة منح الصلاحيات على جميع الجداول أيضاً (للحماية)
    try {
      await prisma.$executeRawUnsafe(`
        GRANT INSERT, UPDATE, SELECT ON \`${DB_NAME}\`.* TO '${DB_USER}'@'${DB_HOST}';
      `);
      console.log('✅ تم منح الصلاحيات على جميع الجداول أيضاً\n');
    } catch (fullGrantError) {
      console.log('⚠️  لم يتم منح الصلاحيات على جميع الجداول (هذا طبيعي إذا كانت الصلاحيات محدودة)');
    }
    
    await prisma.$executeRawUnsafe(`FLUSH PRIVILEGES;`);
    
    console.log('✅ تم منح الصلاحيات بنجاح!\n');
    
    // التحقق من الصلاحيات
    console.log('🔍 التحقق من الصلاحيات...');
    const grants = await prisma.$queryRawUnsafe(`
      SHOW GRANTS FOR '${DB_USER}'@'${DB_HOST}';
    `);
    
    console.log('\n📋 الصلاحيات الحالية:');
    console.log(grants);
    console.log('\n✅ تم الإصلاح بنجاح!');
    
  } catch (error) {
    console.error('\n❌ حدث خطأ أثناء إصلاح الصلاحيات:');
    console.error(error.message);
    console.error('\n💡 الحلول البديلة:');
    console.error('1. استخدم phpMyAdmin وتنفيذ ملف: backend/scripts/fix-sent-message-stats-permissions.sql');
    console.error('2. استخدم MySQL command line مع حساب root:');
    console.error(`   mysql -u root -p < backend/scripts/fix-sent-message-stats-permissions.sql`);
    console.error('3. أو في phpMyAdmin SQL tab، نفذ الأوامر التالية:');
    console.error(`   GRANT INSERT, UPDATE, SELECT ON \`${DB_NAME}\`.\`${TABLE_NAME}\` TO '${DB_USER}'@'${DB_HOST}';`);
    console.error('   FLUSH PRIVILEGES;');
    console.error('4. اتصل بمدير قاعدة البيانات لتنفيذ الأمر');
    console.error('\n📄 ملف SQL موجود في: backend/scripts/fix-sent-message-stats-permissions.sql');
    
    // إذا كان الخطأ متعلق بالصلاحيات
    if (error.message.includes('Access denied') || error.message.includes('denied')) {
      console.error('\n⚠️  يبدو أن المستخدم الحالي لا يملك صلاحيات GRANT');
      console.error('   يجب استخدام حساب root أو حساب بصلاحيات إدارية');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
if (require.main === module) {
  fixPermissions()
    .then(() => {
      console.log('\n✨ انتهى');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ فشل السكريبت:', error);
      process.exit(1);
    });
}

module.exports = { fixPermissions };

