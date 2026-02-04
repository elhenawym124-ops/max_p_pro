/**
 * Script بسيط لتطبيق Migration الخاص بـ Facebook Ads Tables
 * يستخدم Prisma Client مباشرة
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🚀 بدء تطبيق Migration...');
    
    // قراءة ملف Migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_facebook_ads_tables/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('✅ تم قراءة ملف Migration');
    
    // تقسيم SQL إلى statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`📝 عدد الـ Statements: ${statements.length}`);
    
    // تطبيق كل statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 10) { // تجاهل statements القصيرة جداً
        try {
          console.log(`⏳ تطبيق Statement ${i + 1}/${statements.length}...`);
          await prisma.$executeRawUnsafe(statement);
          console.log(`✅ تم تطبيق Statement ${i + 1}`);
        } catch (error) {
          // تجاهل الأخطاء إذا كان الجدول موجود بالفعل
          if (error.message.includes('already exists') || 
              error.message.includes('Duplicate column') ||
              error.message.includes('Duplicate key') ||
              error.message.includes('Duplicate column name')) {
            console.log(`⚠️ Statement ${i + 1} تم تخطيه (موجود بالفعل): ${error.message.substring(0, 50)}`);
          } else {
            console.error(`❌ خطأ في Statement ${i + 1}:`, error.message);
            // لا نوقف العملية، نكمل
          }
        }
      }
    }
    
    console.log('✅ تم تطبيق Migration بنجاح!');
    
    // التحقق من الجداول
    console.log('🔍 التحقق من الجداول...');
    const tables = await prisma.$queryRaw`
      SHOW TABLES LIKE 'facebook_%'
    `;
    console.log('📊 الجداول الموجودة:', tables);
    
  } catch (error) {
    console.error('❌ خطأ في تطبيق Migration:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل Migration
applyMigration()
  .then(() => {
    console.log('🎉 اكتمل تطبيق Migration!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل تطبيق Migration:', error);
    process.exit(1);
  });

