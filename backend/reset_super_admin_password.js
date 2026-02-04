const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const newPassword = 'SuperAdmin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.updateMany({
      where: { 
        email: 'superadmin@system.com',
        role: 'SUPER_ADMIN'
      },
      data: { 
        password: hashedPassword,
        isActive: true
      }
    });

    if (updated.count > 0) {
      console.log('✅ تم إعادة تعيين كلمة المرور بنجاح!\n');
      console.log('📧 Email: superadmin@system.com');
      console.log('🔑 Password: SuperAdmin123!\n');
      console.log('🌐 سجل دخول من:');
      console.log('   http://localhost:3000/super-admin/login\n');
    } else {
      console.log('❌ لم يتم العثور على حساب Super Admin');
      console.log('💡 شغّل: node backend/check_super_admin.js');
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
