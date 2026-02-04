const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 جاري البحث عن المستخدمين...\n');
    
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length === 0) {
      console.log('❌ لا يوجد مستخدمين في قاعدة البيانات!');
    } else {
      console.log(`✅ تم العثور على ${users.length} مستخدم:\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. البريد: ${user.email}`);
        console.log(`   الاسم: ${user.firstName} ${user.lastName}`);
        console.log(`   الدور: ${user.role}`);
        console.log(`   Company ID: ${user.companyId}`);
        console.log('');
      });
      
      console.log('\n💡 استخدم أحد هذه البريدات الإلكترونية لتسجيل الدخول');
      console.log('📝 ملاحظة: تحتاج لمعرفة كلمة المرور الصحيحة للحساب\n');
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
