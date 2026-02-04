/**
 * Script لتطبيق Migration مباشرة
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🚀 بدء تطبيق Migration...\n');
    
    // قراءة ملف Migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_facebook_ads_tables/migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ ملف Migration غير موجود:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ تم قراءة ملف Migration\n');
    
    // تقسيم SQL إلى statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 10 && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('/*') &&
               !trimmed.toLowerCase().startsWith('create table if not exists') ||
               trimmed.toLowerCase().startsWith('alter table');
      });
    
    console.log(`📝 عدد الـ Statements: ${statements.length}\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // تطبيق كل statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 10) {
        try {
          process.stdout.write(`⏳ Statement ${i + 1}/${statements.length}... `);
          await prisma.$executeRawUnsafe(statement);
          console.log('✅');
          successCount++;
        } catch (error) {
          const errorMsg = error.message || '';
          // تجاهل الأخطاء المتوقعة
          if (errorMsg.includes('already exists') || 
              errorMsg.includes('Duplicate column') ||
              errorMsg.includes('Duplicate key') ||
              errorMsg.includes('Duplicate column name') ||
              errorMsg.includes('already exists')) {
            console.log('⚠️ (موجود)');
            skipCount++;
          } else {
            console.log(`❌ ${errorMsg.substring(0, 60)}`);
            errorCount++;
          }
        }
      }
    }
    
    console.log('\n📊 النتائج:');
    console.log(`✅ نجح: ${successCount}`);
    console.log(`⚠️ تم تخطيه: ${skipCount}`);
    console.log(`❌ فشل: ${errorCount}`);
    
    // التحقق من الجداول
    console.log('\n🔍 التحقق من الجداول...\n');
    
    const tablesToCheck = [
      'facebook_ad_accounts',
      'facebook_campaigns',
      'facebook_adsets',
      'facebook_ads',
      'facebook_ad_insights'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${tableName} LIMIT 1`);
        const count = result[0]?.count || 0;
        console.log(`✅ ${tableName}: موجود (${count} سجل)`);
      } catch (error) {
        if (error.message.includes("doesn't exist") || error.message.includes("Unknown table")) {
          console.log(`❌ ${tableName}: غير موجود`);
        } else {
          console.log(`⚠️ ${tableName}: ${error.message.substring(0, 50)}`);
        }
      }
    }
    
    // التحقق من العمود في companies
    try {
      const result = await prisma.$queryRawUnsafe(`
        SHOW COLUMNS FROM companies LIKE 'facebookAdsAccessToken'
      `);
      if (result.length > 0) {
        console.log(`✅ companies.facebookAdsAccessToken: موجود`);
      } else {
        console.log(`❌ companies.facebookAdsAccessToken: غير موجود`);
      }
    } catch (error) {
      console.log(`⚠️ companies.facebookAdsAccessToken: ${error.message.substring(0, 50)}`);
    }
    
    console.log('\n✅ اكتمل تطبيق Migration!');
    
  } catch (error) {
    console.error('\n❌ خطأ عام:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 تم إغلاق الاتصال');
  }
}

// تشغيل Migration
runMigration()
  .then(() => {
    console.log('\n🎉 Migration مكتمل!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ فشل Migration:', error);
    process.exit(1);
  });

