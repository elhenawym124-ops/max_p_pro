/**
 * سكريبت لإنشاء مستخدم MySQL جديد مع الصلاحيات المطلوبة
 * حل لمشكلة Access denied لـ root
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔐 [MySQL Auth Fix] إصلاح مشكلة المصادقة\n');
  
  console.log('هذا السكريبت سيساعدك في إنشاء مستخدم MySQL جديد مع الصلاحيات المطلوبة.\n');
  
  const dbName = await question('📊 اسم قاعدة البيانات (افتراضي: u339372869_test2): ') || 'u339372869_test2';
  const username = await question('👤 اسم المستخدم الجديد (افتراضي: appuser): ') || 'appuser';
  const password = await question('🔑 كلمة المرور (سيتم إخفاؤها): ');
  
  if (!password) {
    console.error('❌ يجب إدخال كلمة مرور!');
    rl.close();
    process.exit(1);
  }
  
  console.log('\n🚀 [MySQL Auth Fix] إنشاء المستخدم...\n');
  
  try {
    // إنشاء المستخدم
    console.log('1️⃣ إنشاء المستخدم...');
    execSync(`mysql -u root -e "CREATE USER IF NOT EXISTS '${username}'@'localhost' IDENTIFIED BY '${password}';"`, {
      stdio: 'inherit'
    });
    console.log('✅ تم إنشاء المستخدم\n');
    
    // منح الصلاحيات
    console.log('2️⃣ منح الصلاحيات...');
    execSync(`mysql -u root -e "GRANT ALL PRIVILEGES ON ${dbName}.* TO '${username}'@'localhost';"`, {
      stdio: 'inherit'
    });
    console.log('✅ تم منح الصلاحيات\n');
    
    // إنشاء قاعدة البيانات إذا لم تكن موجودة
    console.log('3️⃣ التحقق من قاعدة البيانات...');
    execSync(`mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`, {
      stdio: 'inherit'
    });
    console.log('✅ قاعدة البيانات جاهزة\n');
    
    // تحديث الصلاحيات
    console.log('4️⃣ تحديث الصلاحيات...');
    execSync(`mysql -u root -e "FLUSH PRIVILEGES;"`, {
      stdio: 'inherit'
    });
    console.log('✅ تم تحديث الصلاحيات\n');
    
    // إظهار DATABASE_URL الجديد
    const encodedPassword = encodeURIComponent(password);
    const databaseUrl = `mysql://${username}:${encodedPassword}@localhost:3306/${dbName}?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30`;
    
    console.log('✅ [MySQL Auth Fix] تم بنجاح!\n');
    console.log('📝 [MySQL Auth Fix] أضف هذا السطر في ملف .env:\n');
    console.log(`DATABASE_URL=${databaseUrl}\n`);
    
    // السؤال عن تحديث .env تلقائياً
    const updateEnv = await question('❓ هل تريد تحديث ملف .env تلقائياً؟ (y/n): ');
    
    if (updateEnv.toLowerCase() === 'y' || updateEnv.toLowerCase() === 'yes') {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(__dirname, '../.env');
      
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // تحديث أو إضافة DATABASE_URL
        if (envContent.includes('DATABASE_URL=')) {
          envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${databaseUrl}`);
        } else {
          envContent += `\nDATABASE_URL=${databaseUrl}\n`;
        }
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('✅ تم تحديث ملف .env');
      } else {
        console.log('⚠️  ملف .env غير موجود - قم بإنشائه يدوياً');
      }
    }
    
  } catch (error) {
    console.error('\n❌ [MySQL Auth Fix] خطأ:', error.message);
    console.log('\n💡 تأكد من:');
    console.log('   1. أنك قمت بتسجيل الدخول كـ root');
    console.log('   2. أن MySQL يعمل');
    console.log('   3. أن لديك صلاحيات root');
    process.exit(1);
  }
  
  rl.close();
}

main().catch(error => {
  console.error('❌ خطأ:', error);
  rl.close();
  process.exit(1);
});

