const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const createDemoUsers = async(req , res)=>{
      try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'هذا الـ endpoint متاح فقط في بيئة التطوير'
      });
    }

    //console.log('🚀 إنشاء المستخدمين التجريبيين...');

    // إنشاء شركة تجريبية
    const company = await getSharedPrismaClient().company.upsert({
      where: { email: 'demo@smartchat.com' },
      update: {},
      create: {
        name: 'Smart Chat Demo Company',
        email: 'demo@smartchat.com',
        phone: '+20123456789',
        address: 'القاهرة، مصر',
        plan: 'PRO',
        currency: 'EGP',
        isActive: true,
        settings: JSON.stringify({
          aiEnabled: true,
          autoReply: true,
          workingHours: {
            start: '09:00',
            end: '18:00'
          },
          personalityPrompt: 'انت اسمك محمد، الشحن 70، لغة رسمية، مفيش نرونه ف التعامل بياع صارم'
        })
      }
    });

    // كلمة مرور مشفرة
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // إنشاء المستخدمين التجريبيين
    const demoUsers = [
      {
        email: 'admin@smartchat.com',
        firstName: 'أحمد',
        lastName: 'محمد',
        role: 'COMPANY_ADMIN'
      },
      {
        email: 'agent@smartchat.com',
        firstName: 'فاطمة',
        lastName: 'علي',
        role: 'AGENT'
      },
      {
        email: 'manager@smartchat.com',
        firstName: 'محمد',
        lastName: 'حسن',
        role: 'MANAGER'
      }
    ];

    const createdUsers = [];
    for (const userData of demoUsers) {
      const user = await getSharedPrismaClient().user.upsert({
        where: { email: userData.email },
        update: {
          isActive: true,
          lastLoginAt: new Date()
        },
        create: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: true,
          isEmailVerified: true,
          companyId: company.id
        }
      });
      createdUsers.push(user);
    }

    res.json({
      success: true,
      message: 'تم إنشاء المستخدمين التجريبيين بنجاح',
      data: {
        company: company,
        users: createdUsers.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role
        })),
        credentials: {
          password: 'admin123',
          accounts: [
            { email: 'admin@smartchat.com', role: 'مدير النظام' },
            { email: 'agent@smartchat.com', role: 'موظف خدمة العملاء' },
            { email: 'manager@smartchat.com', role: 'مدير المبيعات' }
          ]
        }
      }
    });

  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدمين التجريبيين:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء المستخدمين التجريبيين',
      error: error.message
    });
  }
}


module.exports = {createDemoUsers}
