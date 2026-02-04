const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function checkSuperAdmin() {
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    
    console.log('🔍 البحث عن حسابات السوبر أدمن...\n');
    
    // البحث بالبريد الإلكتروني
    const adminByEmail = await prisma.user.findUnique({
      where: { email: 'admin@superadmin.com' }
    });
    
    console.log('1️⃣ البحث بالبريد الإلكتروني (admin@superadmin.com):');
    if (adminByEmail) {
      console.log('   ✅ موجود!');
      console.log('   ID:', adminByEmail.id);
      console.log('   Name:', adminByEmail.firstName, adminByEmail.lastName);
      console.log('   Role:', adminByEmail.role);
      console.log('   Active:', adminByEmail.isActive);
    } else {
      console.log('   ❌ غير موجود');
    }
    
    // البحث بالـ Role
    console.log('\n2️⃣ البحث بالـ Role (SUPER_ADMIN):');
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' }
    });
    
    console.log(`   عدد السوبر أدمن: ${superAdmins.length}`);
    superAdmins.forEach(sa => {
      console.log(`   - ${sa.email} (${sa.firstName} ${sa.lastName})`);
    });
    
    // عرض جميع الـ Roles الموجودة
    console.log('\n3️⃣ جميع الـ Roles الموجودة:');
    const allUsers = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    
    const roleCount = {};
    allUsers.forEach(u => {
      roleCount[u.role] = (roleCount[u.role] || 0) + 1;
    });
    
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count}`);
    });
    
    // إذا لم يوجد، أنشئ واحد
    if (!adminByEmail) {
      console.log('\n⚠️  لا يوجد حساب سوبر أدمن، جاري الإنشاء...');
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      
      const hashedPassword = await bcrypt.hash('Admin@123456', 10);
      
      const newAdmin = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'admin@superadmin.com',
          password: hashedPassword,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          isActive: true,
          isEmailVerified: true,
          timezone: 'Africa/Cairo',
          updatedAt: new Date()
        }
      });
      
      console.log('✅ تم إنشاء حساب سوبر أدمن جديد!');
      console.log('   ID:', newAdmin.id);
      console.log('   Email:', newAdmin.email);
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

checkSuperAdmin();
