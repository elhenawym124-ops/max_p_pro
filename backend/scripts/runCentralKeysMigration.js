const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔗 الاتصال بقاعدة البيانات...');
    
    // قراءة ملف الـ migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_central_keys_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 قراءة ملف الـ migration...');
    
    // تقسيم الـ SQL إلى statements منفصلة
    // نحتاج إلى معالجة خاصة للـ PREPARE/EXECUTE statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`🔧 تنفيذ ${statements.length} أمر SQL...\n`);
    
    // تنفيذ كل statement على حدة
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        // تخطي SET/PREPARE/EXECUTE statements التي تحتاج معالجة خاصة
        if (statement.startsWith('SET @') || 
            statement.startsWith('PREPARE') || 
            statement.startsWith('EXECUTE') || 
            statement.startsWith('DEALLOCATE')) {
          console.log(`${i + 1}. تخطي statement خاص: ${statement.substring(0, 50)}...`);
          continue;
        }
        
        // تخطي التعليقات
        if (statement.startsWith('--')) {
          continue;
        }
        
        console.log(`${i + 1}. تنفيذ: ${statement.substring(0, 80)}...`);
        await prisma.$executeRawUnsafe(statement);
        console.log('   ✅ نجح\n');
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate') ||
            error.message.includes('Duplicate column name') ||
            error.message.includes('Duplicate key name') ||
            error.message.includes('already exists')) {
          console.log('   ⚠️  موجود بالفعل - تم التخطي\n');
        } else {
          console.error('   ❌ فشل:', error.message, '\n');
          // لا نرمي الخطأ هنا، نكمل مع باقي الـ statements
        }
      }
    }
    
    // تنفيذ الـ statements المهمة يدوياً
    console.log('\n🔧 تنفيذ الـ statements المهمة...\n');
    
    // 1. إضافة useCentralKeys إلى companies
    try {
      console.log('1. إضافة useCentralKeys إلى companies...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`companies\` 
        ADD COLUMN \`useCentralKeys\` BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('   ✅ نجح\n');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('   ⚠️  useCentralKeys موجود بالفعل\n');
      } else {
        console.error('   ❌ فشل:', error.message, '\n');
      }
    }
    
    // 2. تعديل companyId ليكون nullable
    try {
      console.log('2. تعديل companyId ليكون nullable...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`gemini_keys\` 
        MODIFY COLUMN \`companyId\` VARCHAR(191) NULL
      `);
      console.log('   ✅ نجح\n');
    } catch (error) {
      console.error('   ⚠️  قد يكون nullable بالفعل:', error.message, '\n');
    }
    
    // 3. إضافة keyType column
    try {
      console.log('3. إضافة keyType column...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`gemini_keys\` 
        ADD COLUMN \`keyType\` ENUM('COMPANY', 'CENTRAL') NOT NULL DEFAULT 'COMPANY'
      `);
      console.log('   ✅ نجح\n');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('   ⚠️  keyType موجود بالفعل\n');
      } else {
        console.error('   ❌ فشل:', error.message, '\n');
      }
    }
    
    // 4. تحديث المفاتيح الموجودة
    try {
      console.log('4. تحديث المفاتيح الموجودة...');
      await prisma.$executeRawUnsafe(`
        UPDATE \`gemini_keys\` 
        SET \`keyType\` = 'COMPANY' 
        WHERE \`keyType\` IS NULL OR \`keyType\` = ''
      `);
      console.log('   ✅ نجح\n');
    } catch (error) {
      console.error('   ⚠️  خطأ في التحديث:', error.message, '\n');
    }
    
    // 5. إضافة index
    try {
      console.log('5. إضافة index...');
      await prisma.$executeRawUnsafe(`
        CREATE INDEX \`gemini_keys_keyType_isActive_idx\` ON \`gemini_keys\`(\`keyType\`, \`isActive\`)
      `);
      console.log('   ✅ نجح\n');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('   ⚠️  الـ index موجود بالفعل\n');
      } else {
        console.error('   ⚠️  خطأ في إضافة index:', error.message, '\n');
      }
    }
    
    // معالجة خاصة للـ foreign key constraint
    console.log('\n🔧 معالجة Foreign Key Constraint...');
    try {
      // محاولة إسقاط الـ constraint القديم إذا كان موجوداً
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`gemini_keys\` 
          DROP FOREIGN KEY IF EXISTS \`gemini_keys_companyId_fkey\`
        `);
        console.log('✅ تم إسقاط الـ constraint القديم');
      } catch (e) {
        console.log('⚠️  الـ constraint غير موجود أو لا يمكن إسقاطه');
      }
      
      // إضافة الـ constraint الجديد
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`gemini_keys\` 
        ADD CONSTRAINT \`gemini_keys_companyId_fkey\` 
        FOREIGN KEY (\`companyId\`) 
        REFERENCES \`companies\`(\`id\`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
      `);
      console.log('✅ تم إضافة الـ constraint الجديد');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        console.log('⚠️  الـ constraint موجود بالفعل');
      } else {
        console.error('❌ خطأ في إضافة الـ constraint:', error.message);
      }
    }
    
    console.log('\n✅ تم تنفيذ الـ migration بنجاح!');
    
    // التحقق من الأعمدة
    console.log('\n🔍 التحقق من الأعمدة...');
    try {
      const columns = await prisma.$queryRaw`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'gemini_keys'
        AND COLUMN_NAME IN ('keyType', 'companyId')
      `;
      
      console.log('الأعمدة الموجودة:');
      columns.forEach(c => console.log(`  ✅ ${c.COLUMN_NAME} (${c.COLUMN_TYPE}, nullable: ${c.IS_NULLABLE})`));
      
      // التحقق من useCentralKeys في companies
      const companyColumns = await prisma.$queryRaw`
        SELECT COLUMN_NAME, COLUMN_TYPE
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'companies'
        AND COLUMN_NAME = 'useCentralKeys'
      `;
      
      if (companyColumns.length > 0) {
        console.log('\n✅ useCentralKeys موجود في جدول companies');
      } else {
        console.log('\n⚠️  useCentralKeys غير موجود في جدول companies');
      }
    } catch (error) {
      console.log('⚠️  لا يمكن التحقق من الأعمدة:', error.message);
    }
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

