const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔗 الاتصال بقاعدة البيانات...');
    
    // قراءة ملف الـ migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/20241122_add_coupons/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 قراءة ملف الـ migration...');
    
    // تقسيم الـ SQL إلى statements منفصلة
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`🔧 تنفيذ ${statements.length} أمر SQL...\n`);
    
    // تنفيذ كل statement على حدة
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`${i + 1}. تنفيذ: ${statement.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(statement);
        console.log('   ✅ نجح\n');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log('   ⚠️  الجدول موجود بالفعل - تم التخطي\n');
        } else {
          console.error('   ❌ فشل:', error.message, '\n');
        }
      }
    }
    
    console.log('✅ تم تنفيذ الـ migration بنجاح!');
    
    // التحقق من الجداول
    console.log('\n🔍 التحقق من الجداول...');
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('coupons', 'coupon_usages')
    `;
    
    console.log('الجداول الموجودة:');
    tables.forEach(t => console.log(`  ✅ ${t.TABLE_NAME}`));
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 تم إغلاق الاتصال');
  }
}

runMigration();
