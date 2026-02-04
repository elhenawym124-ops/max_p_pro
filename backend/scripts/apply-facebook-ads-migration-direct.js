/**
 * تطبيق Migration مباشرة بدون shadow database
 * يستخدم Prisma Client مباشرة لتطبيق التغييرات
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  log: ['error'],
});

async function applyMigration() {
  try {
    console.log('🚀 بدء تطبيق Migration للجداول الجديدة...\n');
    console.log('📋 الجداول المراد إنشاؤها:');
    console.log('  1. facebook_ad_accounts');
    console.log('  2. facebook_campaigns');
    console.log('  3. facebook_adsets');
    console.log('  4. facebook_ads');
    console.log('  5. facebook_ad_insights');
    console.log('  6. إضافة عمود facebookAdsAccessToken في جدول companies\n');

    // قراءة ملف Migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_facebook_ads_tables/migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ ملف Migration غير موجود:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ تم قراءة ملف Migration\n');

    // تقسيم SQL إلى statements (كل statement منتهي بـ ;)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const trimmed = s.trim();
        // تجاهل التعليقات والأوامر الفارغة
        return trimmed.length > 10 && 
               !trimmed.startsWith('--') && 
               !trimmed.match(/^\/\*/);
      });

    console.log(`📝 عدد الـ Statements: ${statements.length}\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // تطبيق كل statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.length < 10) continue;

      // استخراج اسم الجدول للعرض
      const tableMatch = statement.match(/TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i) || 
                        statement.match(/ALTER\s+TABLE\s+`?(\w+)`?/i);
      const tableName = tableMatch ? tableName[1] : `Statement ${i + 1}`;

      try {
        process.stdout.write(`⏳ Statement ${i + 1}/${statements.length}... `);
        await prisma.$executeRawUnsafe(statement);
        console.log('✅');
        successCount++;
      } catch (error) {
        const errorMsg = error.message || '';
        // تجاهل الأخطاء المتوقعة (الجدول/العمود موجود بالفعل)
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('Duplicate column') ||
            errorMsg.includes('Duplicate key') ||
            errorMsg.includes('Duplicate column name') ||
            errorMsg.includes('ER_DUP_FIELDNAME') ||
            errorMsg.includes('ER_DUP_KEYNAME') ||
            errorMsg.includes('ER_TABLE_EXISTS_ERROR')) {
          console.log('⚠️ (موجود بالفعل)');
          skipCount++;
        } else {
          console.log(`\n❌ خطأ: ${errorMsg.substring(0, 100)}`);
          errorCount++;
        }
      }
    }

    console.log('\n📊 النتائج:');
    console.log(`  ✅ نجح: ${successCount}`);
    console.log(`  ⚠️ تم تخطيه (موجود): ${skipCount}`);
    console.log(`  ❌ فشل: ${errorCount}`);

    // التحقق من الجداول
    console.log('\n🔍 التحقق من الجداول...\n');
    
    const tablesToCheck = [
      { name: 'facebook_ad_accounts', label: 'Facebook Ad Accounts' },
      { name: 'facebook_campaigns', label: 'Facebook Campaigns' },
      { name: 'facebook_adsets', label: 'Facebook Ad Sets' },
      { name: 'facebook_ads', label: 'Facebook Ads' },
      { name: 'facebook_ad_insights', label: 'Facebook Ad Insights' }
    ];
    
    for (const { name, label } of tablesToCheck) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`${name}\` LIMIT 1`);
        const count = result[0]?.count || 0;
        console.log(`✅ ${label} (${name}): موجود - ${count} سجل`);
      } catch (error) {
        if (error.message.includes("doesn't exist") || 
            error.message.includes("Unknown table") ||
            error.message.includes("ER_NO_SUCH_TABLE")) {
          console.log(`❌ ${label} (${name}): غير موجود`);
        } else {
          console.log(`⚠️ ${label} (${name}): ${error.message.substring(0, 60)}`);
        }
      }
    }
    
    // التحقق من العمود في companies
    console.log('\n🔍 التحقق من العمود في جدول companies...');
    try {
      const result = await prisma.$queryRawUnsafe(`
        SHOW COLUMNS FROM \`companies\` LIKE 'facebookAdsAccessToken'
      `);
      if (result && result.length > 0) {
        console.log(`✅ companies.facebookAdsAccessToken: موجود`);
      } else {
        console.log(`❌ companies.facebookAdsAccessToken: غير موجود`);
      }
    } catch (error) {
      console.log(`⚠️ companies.facebookAdsAccessToken: ${error.message.substring(0, 50)}`);
    }
    
    if (errorCount === 0) {
      console.log('\n✅ تم تطبيق Migration بنجاح! الميزة جاهزة للاستخدام.');
    } else {
      console.log(`\n⚠️ تم تطبيق Migration مع ${errorCount} أخطاء. يرجى مراجعة الأخطاء أعلاه.`);
    }
    
  } catch (error) {
    console.error('\n❌ خطأ عام:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 تم إغلاق الاتصال بقاعدة البيانات');
  }
}

// تشغيل Migration
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  تطبيق Migration: Facebook Ads Tables');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

applyMigration()
  .then(() => {
    console.log('\n🎉 اكتمل تطبيق Migration!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل تطبيق Migration:', error);
    process.exit(1);
  });

