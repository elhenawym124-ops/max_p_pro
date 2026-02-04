/**
 * Script لتطبيق Migration الخاص بـ Facebook Ads Tables
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function applyMigration() {
  let connection;
  
  try {
    console.log('🚀 بدء تطبيق Migration...');
    
    // قراءة ملف Migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_facebook_ads_tables/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // إنشاء اتصال بقاعدة البيانات
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    // Parse DATABASE_URL
    // Format: mysql://user:password@host:port/database
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      multipleStatements: true
    });
    
    console.log('✅ تم الاتصال بقاعدة البيانات');
    
    // تقسيم SQL إلى statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 عدد الـ Statements: ${statements.length}`);
    
    // تطبيق كل statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          console.log(`⏳ تطبيق Statement ${i + 1}/${statements.length}...`);
          await connection.execute(statement);
          console.log(`✅ تم تطبيق Statement ${i + 1}`);
        } catch (error) {
          // تجاهل الأخطاء إذا كان الجدول موجود بالفعل
          if (error.message.includes('already exists') || 
              error.message.includes('Duplicate column') ||
              error.message.includes('Duplicate key')) {
            console.log(`⚠️ Statement ${i + 1} تم تخطيه (موجود بالفعل)`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ تم تطبيق Migration بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في تطبيق Migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 تم إغلاق الاتصال');
    }
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

