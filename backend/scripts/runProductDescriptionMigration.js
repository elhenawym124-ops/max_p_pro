const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔗 الاتصال بقاعدة البيانات...');
    console.log('📂 المسار الحالي:', __dirname);
    
    // قراءة ملف الـ migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/20250125_change_product_description_to_text/migration.sql');
    console.log('📄 مسار ملف الـ migration:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`ملف الـ migration غير موجود: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📝 محتوى الـ migration:', migrationSQL);
    
    console.log('📄 قراءة ملف الـ migration...');
    
    // تقسيم الـ SQL إلى statements منفصلة
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));
    
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
            error.message.includes('Duplicate column name') ||
            error.message.includes('Unknown column') ||
            error.message.includes('doesn\'t exist')) {
          console.log('   ⚠️  العمود تم تعديله بالفعل أو لا يوجد - تم التخطي\n');
        } else {
          console.error('   ❌ فشل:', error.message, '\n');
          // لا نرمي الخطأ إذا كان العمود موجود بالفعل بنوع TEXT
          if (!error.message.includes('TEXT')) {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ تم تنفيذ الـ migration بنجاح!');
    
    // التحقق من نوع العمود
    console.log('\n🔍 التحقق من نوع العمود...');
    try {
      const columns = await prisma.$queryRaw`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'description'
      `;
      
      if (columns.length > 0) {
        const column = columns[0];
        console.log(`✅ نوع العمود: ${column.DATA_TYPE}`);
        if (column.DATA_TYPE === 'text' || column.DATA_TYPE === 'longtext') {
          console.log('✅ الوصف الآن يدعم النصوص الطويلة!');
        } else {
          console.log(`⚠️  نوع العمود: ${column.DATA_TYPE} (قد يحتاج إلى تعديل يدوي)`);
        }
      } else {
        console.log('⚠️  لم يتم العثور على العمود');
      }
    } catch (error) {
      console.log('⚠️  لا يمكن التحقق من نوع العمود:', error.message);
    }
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

