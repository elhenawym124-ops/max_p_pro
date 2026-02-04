const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function fixSuperAdminDashboard() {
  console.log('🔧 إصلاح مشاكل داشبورد السوبر أدمن...\n');
  
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    
    console.log('📊 الخطوة 1: فحص البيانات الأساسية\n');
    
    // 1. فحص الشركات
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        isActive: true,
        createdAt: true
      },
      take: 5
    });
    
    console.log(`✅ الشركات: ${companies.length} شركة موجودة`);
    if (companies.length > 0) {
      console.log('   أمثلة:');
      companies.forEach(c => {
        console.log(`   - ${c.name} (${c.plan}) - ${c.isActive ? 'نشطة' : 'غير نشطة'}`);
      });
    }
    
    // 2. فحص المستخدمين
    console.log('\n✅ المستخدمين:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      },
      take: 5
    });
    
    console.log(`   ${users.length} مستخدم موجود`);
    const superAdmins = users.filter(u => u.role === 'SUPER_ADMIN');
    console.log(`   ${superAdmins.length} سوبر أدمن`);
    
    if (superAdmins.length > 0) {
      console.log('   حسابات السوبر أدمن:');
      superAdmins.forEach(sa => {
        console.log(`   - ${sa.email} (${sa.firstName} ${sa.lastName})`);
      });
    } else {
      console.log('   ⚠️  لا يوجد حسابات سوبر أدمن!');
    }
    
    // 3. فحص العملاء
    const customersCount = await prisma.customer.count();
    console.log(`\n✅ العملاء: ${customersCount} عميل`);
    
    // 4. فحص المحادثات
    const conversationsCount = await prisma.conversation.count();
    console.log(`✅ المحادثات: ${conversationsCount} محادثة`);
    
    // 5. فحص توزيع الخطط
    console.log('\n📊 الخطوة 2: فحص توزيع الخطط\n');
    const planDistribution = await prisma.company.groupBy({
      by: ['plan'],
      _count: { plan: true }
    });
    
    console.log('✅ توزيع الخطط:');
    planDistribution.forEach(p => {
      console.log(`   - ${p.plan}: ${p._count.plan} شركة`);
    });
    
    // 6. فحص النشاط الأخير
    console.log('\n📊 الخطوة 3: فحص النشاط الأخير (30 يوم)\n');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentCompanies = await prisma.company.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    const recentUsers = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    const recentCustomers = await prisma.customer.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    
    console.log('✅ النشاط الأخير:');
    console.log(`   - شركات جديدة: ${recentCompanies}`);
    console.log(`   - مستخدمين جدد: ${recentUsers}`);
    console.log(`   - عملاء جدد: ${recentCustomers}`);
    
    // 7. اختبار API Response Format
    console.log('\n📊 الخطوة 4: اختبار صيغة الـ API Response\n');
    
    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({ where: { isActive: true } });
    const totalUsers = await prisma.user.count();
    const totalCustomers = await prisma.customer.count();
    const totalConversations = await prisma.conversation.count();
    
    const apiResponse = {
      success: true,
      data: {
        overview: {
          totalCompanies,
          activeCompanies,
          totalUsers,
          totalCustomers,
          totalConversations
        },
        planDistribution: planDistribution.reduce((acc, p) => {
          acc[p.plan] = p._count.plan;
          return acc;
        }, {}),
        recentActivity: {
          newCompaniesLast30Days: recentCompanies,
          newUsersLast30Days: recentUsers,
          newCustomersLast30Days: recentCustomers
        }
      }
    };
    
    console.log('✅ صيغة الـ API Response:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // 8. فحص Active Users (DevTimeLog)
    console.log('\n📊 الخطوة 5: فحص المستخدمين النشطين\n');
    
    try {
      const activeTimers = await prisma.devTimeLog.findMany({
        where: { isRunning: true },
        take: 5
      });
      console.log(`✅ المستخدمون النشطون: ${activeTimers.length}`);
    } catch (error) {
      console.log(`⚠️  جدول DevTimeLog: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ تم الفحص بنجاح!');
    console.log('='.repeat(60));
    
    console.log('\n📋 الملخص:');
    console.log(`   - الشركات: ${totalCompanies} (${activeCompanies} نشطة)`);
    console.log(`   - المستخدمين: ${totalUsers}`);
    console.log(`   - العملاء: ${totalCustomers}`);
    console.log(`   - المحادثات: ${totalConversations}`);
    console.log(`   - حسابات السوبر أدمن: ${superAdmins.length}`);
    
    if (superAdmins.length === 0) {
      console.log('\n⚠️  تحذير: لا يوجد حسابات سوبر أدمن!');
      console.log('   قم بتشغيل: node create-super-admin.js');
    } else {
      console.log('\n✅ كل شيء يعمل بشكل صحيح!');
      console.log('\n🔐 بيانات تسجيل الدخول:');
      console.log(`   Email: ${superAdmins[0].email}`);
      console.log('   Password: Admin@123456');
      console.log('\n🌐 افتح الداشبورد:');
      console.log('   http://localhost:3000/super-admin/dashboard');
    }
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

fixSuperAdminDashboard();
