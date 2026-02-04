const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function fixSuperAdminLogin() {
  console.log('🔧 إصلاح مشكلة تسجيل دخول السوبر أدمن...\n');

  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    // 1. البحث عن حساب السوبر أدمن
    console.log('1️⃣ البحث عن حساب السوبر أدمن...');
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@superadmin.com' }
    });

    if (!superAdmin) {
      console.log('❌ حساب السوبر أدمن غير موجود!');
      console.log('   قم بتشغيل: node create-super-admin.js');
      process.exit(1);
    }

    console.log('✅ تم العثور على الحساب');
    console.log('   ID:', superAdmin.id);
    console.log('   Email:', superAdmin.email);
    console.log('   Role:', superAdmin.role);
    console.log('   Active:', superAdmin.isActive);

    // 2. التحقق من كلمة المرور
    console.log('\n2️⃣ التحقق من كلمة المرور...');
    const passwordMatch = await bcrypt.compare('Admin@123456', superAdmin.password);

    if (!passwordMatch) {
      console.log('⚠️  كلمة المرور غير صحيحة، جاري إعادة تعيينها...');
      const hashedPassword = await bcrypt.hash('Admin@123456', 10);
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: { password: hashedPassword }
      });
      console.log('✅ تم إعادة تعيين كلمة المرور');
    } else {
      console.log('✅ كلمة المرور صحيحة');
    }

    // 3. التأكد من أن الحساب نشط
    console.log('\n3️⃣ التحقق من حالة الحساب...');
    if (!superAdmin.isActive) {
      console.log('⚠️  الحساب غير نشط، جاري التفعيل...');
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: { isActive: true }
      });
      console.log('✅ تم تفعيل الحساب');
    } else {
      console.log('✅ الحساب نشط');
    }

    // 4. إنشاء توكن تجريبي
    console.log('\n4️⃣ إنشاء توكن تجريبي...');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const token = jwt.sign(
      {
        id: superAdmin.id,
        email: superAdmin.email,
        role: superAdmin.role,
        companyId: null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ تم إنشاء التوكن');
    console.log('\n📋 معلومات التوكن:');
    console.log('   Token (أول 50 حرف):', token.substring(0, 50) + '...');

    // 5. اختبار الـ /auth/me endpoint
    console.log('\n5️⃣ اختبار endpoint /auth/me...');
    console.log('   يمكنك اختباره بالأمر التالي:');
    console.log(`   curl -H "Authorization: Bearer ${token}" https://maxp-ai.pro/api/v1/auth/me`);

    // 6. الحل المقترح
    console.log('\n' + '='.repeat(60));
    console.log('✅ تم الفحص بنجاح!');
    console.log('='.repeat(60));

    console.log('\n🔐 بيانات تسجيل الدخول:');
    console.log('   Email: admin@superadmin.com');
    console.log('   Password: Admin@123456');

    console.log('\n📝 خطوات الحل:');
    console.log('   1. افتح المتصفح في وضع Incognito/Private');
    console.log('   2. اذهب إلى: http://localhost:3000/auth/login');
    console.log('   3. سجل دخول بالبيانات أعلاه');
    console.log('   4. افتح Developer Tools (F12)');
    console.log('   5. تحقق من Console للأخطاء');
    console.log('   6. تحقق من Application > Local Storage');
    console.log('      - accessToken يجب أن يكون موجود');
    console.log('      - user يجب أن يكون موجود');

    console.log('\n🐛 إذا استمرت المشكلة:');
    console.log('   1. امسح Local Storage و Session Storage');
    console.log('   2. امسح Cookies');
    console.log('   3. أعد تحميل الصفحة');
    console.log('   4. سجل دخول مرة أخرى');

    console.log('\n💡 نصيحة:');
    console.log('   استخدم صفحة تسجيل الدخول المخصصة للسوبر أدمن:');
    console.log('   http://localhost:3000/super-admin/login');

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

fixSuperAdminLogin();
