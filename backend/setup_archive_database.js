const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupArchiveDatabase() {
  console.log('🔧 بدء إعداد قاعدة بيانات الأرشيف...\n');

  // بيانات الاتصال
  const config = {
    host: 'srv1812.hstgr.io',
    port: 3306,
    user: 'u339372869_Archive',
    password: '0190711037Aa@',
    database: 'u339372869_Archive',
    multipleStatements: true
  };

  let connection;

  try {
    // الاتصال بقاعدة البيانات
    console.log('📡 الاتصال بقاعدة البيانات...');
    connection = await mysql.createConnection(config);
    console.log('✅ تم الاتصال بنجاح!\n');

    // قراءة ملف SQL
    console.log('📄 قراءة ملف SQL...');
    const sql = fs.readFileSync('./create_archive_tables.sql', 'utf8');
    
    // تنفيذ SQL
    console.log('⚙️ إنشاء الجداول...\n');
    await connection.query(sql);
    
    console.log('✅ تم إنشاء جميع الجداول بنجاح!\n');

    // التحقق من الجداول المنشأة
    console.log('🔍 التحقق من الجداول المنشأة...\n');
    const [tables] = await connection.query('SHOW TABLES');
    
    console.log('📊 الجداول الموجودة في قاعدة الأرشيف:');
    console.log('='.repeat(50));
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    console.log('='.repeat(50));
    console.log(`\n✨ إجمالي الجداول: ${tables.length}\n`);

    // عرض معلومات كل جدول
    console.log('📋 تفاصيل الجداول:\n');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      console.log(`\n📦 ${tableName}:`);
      console.log(`   - عدد الأعمدة: ${columns.length}`);
      console.log(`   - السجلات الحالية: 0 (جدول جديد)`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ تم إعداد قاعدة بيانات الأرشيف بنجاح!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️ خطأ في بيانات الاتصال. تحقق من:');
      console.error('   - اسم المستخدم');
      console.error('   - كلمة المرور');
      console.error('   - اسم قاعدة البيانات');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 تم إغلاق الاتصال');
    }
  }
}

setupArchiveDatabase().catch(console.error);
