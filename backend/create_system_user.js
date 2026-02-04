const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSystemUser() {
  try {
    console.log('🔧 إنشاء مستخدم النظام...');

    // البحث عن مستخدم موجود أولاً
    let systemUser = await prisma.user.findFirst({
      where: {
        email: 'system@devtasks.local'
      }
    });

    if (systemUser) {
      console.log('✅ مستخدم النظام موجود بالفعل:', systemUser.id);
    } else {
      // إنشاء مستخدم النظام
      systemUser = await prisma.user.create({
        data: {
          firstName: 'System',
          lastName: 'Bot',
          email: 'system@devtasks.local',
          password: 'system123', // كلمة مرور وهمية
          role: 'SUPER_ADMIN',
          isActive: true,
          isEmailVerified: true
        }
      });
      console.log('✅ تم إنشاء مستخدم النظام:', systemUser.id);
    }

    // البحث عن عضو فريق التطوير
    let devTeamMember = await prisma.devTeamMember.findFirst({
      where: {
        userId: systemUser.id
      }
    });

    if (devTeamMember) {
      console.log('✅ عضو فريق التطوير موجود بالفعل:', devTeamMember.id);
    } else {
      // إنشاء عضو فريق التطوير
      devTeamMember = await prisma.devTeamMember.create({
        data: {
          userId: systemUser.id,
          role: 'tech_lead',
          department: 'Development',
          skills: 'System Administration,Documentation,Project Management',
          availability: 'available',
          isActive: true
        }
      });
      console.log('✅ تم إنشاء عضو فريق التطوير:', devTeamMember.id);
    }

    return {
      userId: systemUser.id,
      devTeamMemberId: devTeamMember.id
    };

  } catch (error) {
    console.error('❌ خطأ في إنشاء مستخدم النظام:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الدالة
createSystemUser()
  .then((result) => {
    console.log('✅ تم إنشاء مستخدم النظام بنجاح:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل في إنشاء مستخدم النظام:', error);
    process.exit(1);
  });
