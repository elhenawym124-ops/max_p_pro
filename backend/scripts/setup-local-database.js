/**
 * سكريبت لإعداد قاعدة البيانات المحلية
 * يصلح connection string ويشغل migrations
 * يدعم Windows و Linux
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('🔧 [Setup] بدء إعداد قاعدة البيانات...\n');

// 1. التحقق من وجود .env
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ ملف .env غير موجود!');
  console.log('📝 قم بإنشاء ملف .env في مجلد backend/');
  process.exit(1);
}

// 2. قراءة DATABASE_URL الحالي
const envContent = fs.readFileSync(envPath, 'utf8');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL غير موجود في ملف .env');
  process.exit(1);
}

console.log('📊 [Setup] DATABASE_URL الحالي:', databaseUrl.replace(/:[^:@]+@/, ':****@'));
console.log('🖥️  [Setup] نظام التشغيل:', os.platform());

// 3. إصلاح connection string حسب النظام
const urlObj = new URL(databaseUrl);
const isLocal = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
const isLinux = os.platform() === 'linux';
const isWindows = os.platform() === 'win32';

if (isLocal) {
  if (isLinux) {
    console.log('\n🔧 [Setup] إصلاح connection string لـ Linux...');
    
    // على Linux، إذا كان root يستخدم auth_socket، نحتاج socket
    // أو نستخدم مستخدم آخر مع كلمة مرور
    const hasPassword = urlObj.username && urlObj.password;
    const hasSocket = urlObj.searchParams.has('socket');
    
    if (!hasPassword && !hasSocket) {
      // محاولة استخدام socket على Linux
      const commonSocketPaths = [
        '/var/run/mysqld/mysqld.sock',
        '/tmp/mysql.sock',
        '/var/lib/mysql/mysql.sock'
      ];
      
      let socketFound = false;
      for (const socketPath of commonSocketPaths) {
        if (fs.existsSync(socketPath)) {
          urlObj.searchParams.set('socket', socketPath);
          socketFound = true;
          console.log(`✅ [Setup] تم العثور على socket: ${socketPath}`);
          break;
        }
      }
      
      if (!socketFound) {
        console.log('⚠️  [Setup] لم يتم العثور على socket - سيتم استخدام TCP');
        console.log('💡 [Setup] إذا فشل الاتصال، أضف كلمة مرور لـ root أو استخدم مستخدم آخر');
      }
    } else if (hasPassword) {
      // إذا كان هناك كلمة مرور، استخدم TCP
      urlObj.searchParams.delete('socket');
      console.log('✅ [Setup] استخدام TCP مع كلمة مرور');
    }
  } else if (isWindows) {
    console.log('\n🔧 [Setup] إصلاح connection string لـ Windows...');
    
    // على Windows، لا نستخدم socket
    urlObj.searchParams.delete('socket');
    console.log('✅ [Setup] تم إزالة socket parameter (Windows يستخدم TCP فقط)');
  }
  
  // التأكد من وجود المنفذ
  if (!urlObj.port) {
    urlObj.port = '3306';
  }
  
  const fixedUrl = urlObj.toString();
  
  if (databaseUrl !== fixedUrl) {
    console.log('✅ [Setup] تم إصلاح connection string');
    console.log('📝 [Setup] DATABASE_URL الجديد:', fixedUrl.replace(/:[^:@]+@/, ':****@'));
    
    // تحديث ملف .env
    const updatedEnv = envContent.replace(
      /DATABASE_URL=.*/,
      `DATABASE_URL=${fixedUrl}`
    );
    fs.writeFileSync(envPath, updatedEnv, 'utf8');
    console.log('✅ [Setup] تم تحديث ملف .env');
    
    // تحديث process.env للجلسة الحالية
    process.env.DATABASE_URL = fixedUrl;
    databaseUrl = fixedUrl;
  } else {
    console.log('✅ [Setup] connection string صحيح بالفعل');
  }
} else {
  console.log('ℹ️ [Setup] استخدام قاعدة بيانات بعيدة - لا حاجة لإصلاح connection string');
}

// 4. التحقق من اتصال قاعدة البيانات وتشغيل migrations
async function setupDatabase() {
  console.log('\n🔍 [Setup] التحقق من اتصال قاعدة البيانات...');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // محاولة الاتصال
    await prisma.$connect();
    console.log('✅ [Setup] الاتصال بقاعدة البيانات نجح!');
    
    // التحقق من وجود الجداول
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    
    console.log(`📊 [Setup] عدد الجداول الموجودة: ${tables.length}`);
    
    if (tables.length === 0) {
      console.log('⚠️ [Setup] لا توجد جداول - سيتم تشغيل migrations...');
    } else {
      const tableNames = tables.map(t => t.TABLE_NAME);
      const hasGeminiTable = tableNames.some(name => name === 'gemini_key_models');
      
      if (!hasGeminiTable) {
        console.log('⚠️ [Setup] جدول gemini_key_models غير موجود - سيتم تشغيل migrations...');
      } else {
        console.log('✅ [Setup] الجداول موجودة بالفعل');
        await prisma.$disconnect();
        console.log('\n✅ [Setup] إعداد قاعدة البيانات مكتمل!');
        return;
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ [Setup] خطأ في الاتصال بقاعدة البيانات:', error.message);
    
    // تحليل نوع الخطأ
    if (error.message.includes('Access denied') || error.message.includes('1698')) {
      console.log('\n🔐 [Setup] مشكلة في المصادقة!');
      console.log('\n💡 [Setup] الحلول الممكنة:');
      
      if (isLinux) {
        console.log('\n📋 خيار 1: استخدام socket (إذا كان root يستخدم auth_socket):');
        console.log('   DATABASE_URL=mysql://root@localhost/u339372869_test2?socket=/var/run/mysqld/mysqld.sock&charset=utf8mb4');
        
        console.log('\n📋 خيار 2: إنشاء مستخدم جديد مع كلمة مرور:');
        console.log('   mysql -u root -e "CREATE USER IF NOT EXISTS \'appuser\'@\'localhost\' IDENTIFIED BY \'your_password\';"');
        console.log('   mysql -u root -e "GRANT ALL PRIVILEGES ON u339372869_test2.* TO \'appuser\'@\'localhost\';"');
        console.log('   mysql -u root -e "FLUSH PRIVILEGES;"');
        console.log('   ثم استخدم: DATABASE_URL=mysql://appuser:your_password@localhost:3306/u339372869_test2?charset=utf8mb4');
        
        console.log('\n📋 خيار 3: تغيير root لاستخدام كلمة مرور:');
        console.log('   mysql -u root -e "ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'your_password\';"');
        console.log('   mysql -u root -e "FLUSH PRIVILEGES;"');
        console.log('   ثم استخدم: DATABASE_URL=mysql://root:your_password@localhost:3306/u339372869_test2?charset=utf8mb4');
      } else {
        console.log('\n📋 أضف كلمة المرور في DATABASE_URL:');
        console.log('   DATABASE_URL=mysql://root:your_password@localhost:3306/u339372869_test2?charset=utf8mb4');
      }
    } else {
      console.log('\n💡 [Setup] تأكد من:');
      console.log('   1. MySQL يعمل على localhost:3306');
      console.log('   2. اسم المستخدم وكلمة المرور صحيحة');
      console.log('   3. قاعدة البيانات موجودة (أو سيتم إنشاؤها)');
    }
    
    throw error;
  }

  // 5. إنشاء الجداول المفقودة أو تشغيل migrations
  console.log('\n🚀 [Setup] إنشاء الجداول المفقودة...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // التحقق من وجود جدول gemini_key_models وإنشاؤه إذا لم يكن موجوداً
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    const tableNames = tables.map(t => t.TABLE_NAME);
    const hasGeminiTable = tableNames.some(name => name === 'gemini_key_models');
    
    if (!hasGeminiTable) {
      console.log('📦 [Setup] إنشاء جدول gemini_key_models...');
      
      // التحقق من وجود جدول gemini_keys قبل إنشاء foreign key
      const hasGeminiKeysTable = tableNames.some(name => name === 'gemini_keys');
      const foreignKeyConstraint = hasGeminiKeysTable 
        ? `CONSTRAINT \`gemini_key_models_keyId_fkey\` FOREIGN KEY (\`keyId\`) REFERENCES \`gemini_keys\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`
        : '';
      
      if (!hasGeminiKeysTable) {
        console.log('⚠️  [Setup] جدول gemini_keys غير موجود - سيتم إنشاء الجدول بدون foreign key constraint');
      }
      
      // إنشاء جدول gemini_key_models
      // ملاحظة: MySQL لا يسمح بـ DEFAULT value لـ TEXT columns
      const defaultUsageValue = '{"used": 0, "limit": 1000000, "resetDate": null, "rpm": {"used": 0, "limit": 0, "windowStart": null}, "rph": {"used": 0, "limit": 0, "windowStart": null}, "rpd": {"used": 0, "limit": 0, "windowStart": null}}';
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS \`gemini_key_models\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`keyId\` VARCHAR(191) NOT NULL,
          \`model\` VARCHAR(191) NOT NULL,
          \`usage\` TEXT NOT NULL,
          \`isEnabled\` BOOLEAN NOT NULL DEFAULT true,
          \`priority\` INTEGER NOT NULL DEFAULT 1,
          \`lastUsed\` DATETIME(3) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`gemini_key_models_keyId_model_key\` (\`keyId\`, \`model\`),
          INDEX \`gemini_key_models_isEnabled_priority_idx\` (\`isEnabled\`, \`priority\`),
          INDEX \`gemini_key_models_keyId_model_idx\` (\`keyId\`, \`model\`)
          ${foreignKeyConstraint ? `, ${foreignKeyConstraint}` : ''}
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      
      await prisma.$executeRawUnsafe(createTableSQL);
      
      // إضافة القيمة الافتراضية لـ usage في السجلات الجديدة (سيتم التعامل معها في التطبيق)
      // أو يمكننا إنشاء trigger، لكن الأبسط هو التعامل معها في التطبيق
      console.log('✅ [Setup] تم إنشاء جدول gemini_key_models!');
      console.log('💡 [Setup] ملاحظة: حقل usage لا يحتوي على DEFAULT value (MySQL limitation)');
      console.log('💡 [Setup] سيتم التعامل مع القيمة الافتراضية في التطبيق');
      
      await prisma.$executeRawUnsafe(createTableSQL);
      
      console.log('✅ [Setup] تم إنشاء جدول gemini_key_models!');
    } else {
      console.log('✅ [Setup] جدول gemini_key_models موجود بالفعل');
    }
    
    await prisma.$disconnect();
    
    // تحديث Prisma Client
    console.log('\n🔨 [Setup] تحديث Prisma Client...');
    try {
      process.chdir(path.join(__dirname, '..'));
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ [Setup] تم تحديث Prisma Client!');
    } catch (genError) {
      console.warn('⚠️  [Setup] تحذير: فشل تحديث Prisma Client:', genError.message);
      console.log('💡 [Setup] يمكنك تشغيله يدوياً: npx prisma generate');
    }
    
  } catch (error) {
    console.error('❌ [Setup] خطأ في إنشاء الجداول:', error.message);
    
    // إذا كان الخطأ متعلق بـ foreign key، نحاول بدون constraint أولاً
    if (error.message.includes('foreign key') || error.message.includes('REFERENCES')) {
      console.log('\n💡 [Setup] محاولة إنشاء الجدول بدون foreign key constraint...');
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        // MySQL لا يسمح بـ DEFAULT value لـ TEXT columns
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS \`gemini_key_models\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`keyId\` VARCHAR(191) NOT NULL,
            \`model\` VARCHAR(191) NOT NULL,
            \`usage\` TEXT NOT NULL,
            \`isEnabled\` BOOLEAN NOT NULL DEFAULT true,
            \`priority\` INTEGER NOT NULL DEFAULT 1,
            \`lastUsed\` DATETIME(3) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`gemini_key_models_keyId_model_key\` (\`keyId\`, \`model\`),
            INDEX \`gemini_key_models_isEnabled_priority_idx\` (\`isEnabled\`, \`priority\`),
            INDEX \`gemini_key_models_keyId_model_idx\` (\`keyId\`, \`model\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        console.log('✅ [Setup] تم إنشاء الجدول بدون foreign key constraint');
        console.log('💡 [Setup] يمكنك إضافة foreign key لاحقاً إذا لزم الأمر');
        
        await prisma.$disconnect();
      } catch (retryError) {
        console.error('❌ [Setup] فشل أيضاً:', retryError.message);
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  console.log('\n✅ [Setup] إعداد قاعدة البيانات المحلية مكتمل بنجاح!');
  console.log('🚀 [Setup] يمكنك الآن تشغيل السيرفر');
}

// تشغيل الدالة
setupDatabase().catch(error => {
  console.error('\n❌ [Setup] فشل إعداد قاعدة البيانات:', error.message);
  process.exit(1);
});

