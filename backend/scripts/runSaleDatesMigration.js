const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔗 الاتصال بقاعدة البيانات...');
    
    // قراءة ملف الـ migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/20250122_add_sale_dates_to_product/migration.sql');
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
        console.log(`${i + 1}. تنفيذ: ${statement.substring(0, 80)}...`);
        await prisma.$executeRawUnsafe(statement);
        console.log('   ✅ نجح\n');
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate') ||
            error.message.includes('Duplicate column name')) {
          console.log('   ⚠️  العمود موجود بالفعل - تم التخطي\n');
        } else {
          console.error('   ❌ فشل:', error.message, '\n');
          throw error;
        }
      }
    }
    
    console.log('✅ تم تنفيذ الـ migration بنجاح!');
    
    // التحقق من الأعمدة
    console.log('\n🔍 التحقق من الأعمدة...');
    try {
      const columns = await prisma.$queryRaw`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME IN ('saleStartDate', 'saleEndDate')
      `;
      
      console.log('الأعمدة الموجودة:');
      columns.forEach(c => console.log(`  ✅ ${c.COLUMN_NAME}`));
    } catch (error) {
      console.log('⚠️  لا يمكن التحقق من الأعمدة (قد يكون هذا طبيعي)');
    }
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

