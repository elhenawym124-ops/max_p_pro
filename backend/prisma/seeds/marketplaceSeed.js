const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function seedMarketplace() {
  console.log('🌱 Starting Marketplace Seed...');

  try {
    // 1. إضافة الأدوات الأساسية
    console.log('\n🛠️ Creating Marketplace Apps...');

    const apps = [
      {
        slug: 'ecommerce-basic',
        name: 'المتجر الإلكتروني الأساسي',
        category: 'ECOMMERCE',
        description: 'متجر إلكتروني كامل مع إدارة المنتجات والطلبات وسلة التسوق. مناسب للمشاريع الصغيرة والمتوسطة.',
        icon: '🛒',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        trialDays: 14,
        features: JSON.stringify([
          'إدارة المنتجات (حتى 100 منتج)',
          'سلة تسوق ذكية',
          'معالجة الطلبات',
          'تقارير المبيعات الأساسية',
          'إدارة الفئات',
          'صفحات المنتجات'
        ]),
        isActive: true,
        isFeatured: true,
        isPopular: true
      },
      {
        slug: 'ecommerce-pro',
        name: 'المتجر الإلكتروني المتقدم',
        nameEn: 'Pro E-Commerce Store',
        category: 'ECOMMERCE',
        description: 'متجر إلكتروني متقدم مع ميزات احترافية: منتجات غير محدودة، نظام POS، إدارة المخزون المتعددة.',
        descriptionEn: 'Advanced e-commerce with unlimited products, POS system, multi-warehouse inventory management.',
        icon: '🏪',
        pricingModel: 'HYBRID',
        monthlyPrice: 499,
        yearlyPrice: 4990,
        trialDays: 14,
        features: JSON.stringify([
          'منتجات غير محدودة',
          'نظام POS',
          'إدارة المخزون المتعددة',
          'تقارير متقدمة',
          'تكامل مع WooCommerce',
          'كوبونات وعروض ترويجية'
        ]),
        requiredApps: JSON.stringify(['ecommerce-basic']),
        isActive: true,
        isFeatured: true
      },
      {
        slug: 'hr-basic',
        name: 'إدارة الموارد البشرية الأساسية',
        nameEn: 'Basic HR Management',
        category: 'HR',
        description: 'نظام شامل لإدارة بيانات الموظفين والأقسام والمناصب. يتم الدفع حسب عدد الموظفين.',
        descriptionEn: 'Complete system for managing employee data, departments, and positions. Pay per employee.',
        icon: '👥',
        pricingModel: 'PAY_PER_USE',
        monthlyPrice: 0,
        yearlyPrice: 0,
        trialDays: 14,
        features: JSON.stringify([
          'إدارة بيانات الموظفين',
          'الأقسام والمناصب',
          'الهيكل التنظيمي',
          'تقارير الموظفين',
          'ملفات الموظفين'
        ]),
        isActive: true,
        isPopular: true
      },
      {
        slug: 'hr-attendance',
        name: 'نظام الحضور والانصراف',
        nameEn: 'Attendance System',
        category: 'HR',
        description: 'تتبع حضور وانصراف الموظفين مع Geofencing والتأخير التلقائي. 10 جنيه لكل موظف شهرياً.',
        descriptionEn: 'Track employee attendance with geofencing and automatic lateness tracking. 10 EGP per employee/month.',
        icon: '⏰',
        pricingModel: 'HYBRID',
        monthlyPrice: 10,
        yearlyPrice: 100,
        trialDays: 14,
        features: JSON.stringify([
          'تسجيل حضور/انصراف',
          'Geofencing',
          'تتبع التأخير',
          'تقارير الحضور',
          'إشعارات تلقائية'
        ]),
        requiredApps: JSON.stringify(['hr-basic']),
        isActive: true
      },
      {
        slug: 'hr-payroll',
        name: 'نظام الرواتب',
        nameEn: 'Payroll System',
        category: 'HR',
        description: 'حساب الرواتب التلقائي مع السلف والخصومات والمكافآت. 15 جنيه لكل موظف شهرياً.',
        descriptionEn: 'Automatic payroll calculation with advances, deductions, and bonuses. 15 EGP per employee/month.',
        icon: '💰',
        pricingModel: 'HYBRID',
        monthlyPrice: 15,
        yearlyPrice: 150,
        trialDays: 14,
        features: JSON.stringify([
          'حساب الرواتب التلقائي',
          'السلف والخصومات',
          'المكافآت',
          'كشوف الرواتب',
          'تقارير مالية'
        ]),
        requiredApps: JSON.stringify(['hr-basic']),
        isActive: true
      },
      {
        slug: 'ai-chat-basic',
        name: 'محادثات AI الأساسية',
        nameEn: 'Basic AI Chat',
        category: 'AI',
        description: 'محادثات ذكية مع العملاء باستخدام الذكاء الاصطناعي. يشمل 500 محادثة شهرياً.',
        descriptionEn: 'Smart customer conversations using AI. Includes 500 conversations per month.',
        icon: '🤖',
        pricingModel: 'HYBRID',
        monthlyPrice: 299,
        yearlyPrice: 2990,
        trialDays: 14,
        features: JSON.stringify([
          '500 محادثة شهرياً',
          'ردود تلقائية ذكية',
          'تحليل المشاعر',
          'تاريخ المحادثات',
          'تقارير الأداء'
        ]),
        limitations: JSON.stringify({ monthlyConversations: 500 }),
        isActive: true,
        isFeatured: true
      },
      {
        slug: 'ai-chat-pro',
        name: 'محادثات AI المتقدمة',
        nameEn: 'Pro AI Chat',
        category: 'AI',
        description: 'محادثات AI متقدمة مع RAG وتعلم Few-Shot ودعم متعدد اللغات. 2000 محادثة شهرياً.',
        descriptionEn: 'Advanced AI chat with RAG, Few-Shot learning, and multi-language support. 2000 conversations/month.',
        icon: '🧠',
        pricingModel: 'HYBRID',
        monthlyPrice: 799,
        yearlyPrice: 7990,
        trialDays: 14,
        features: JSON.stringify([
          '2000 محادثة شهرياً',
          'RAG (قاعدة معرفة)',
          'Few-Shot Learning',
          'دعم متعدد اللغات',
          'تحليلات متقدمة'
        ]),
        limitations: JSON.stringify({ monthlyConversations: 2000 }),
        requiredApps: JSON.stringify(['ai-chat-basic']),
        isActive: true
      },
      {
        slug: 'whatsapp-integration',
        name: 'تكامل WhatsApp Business',
        nameEn: 'WhatsApp Business Integration',
        category: 'COMMUNICATION',
        description: 'تكامل كامل مع WhatsApp Business API. إرسال واستقبال الرسائل والردود التلقائية.',
        descriptionEn: 'Full integration with WhatsApp Business API. Send/receive messages and auto-replies.',
        icon: '💬',
        pricingModel: 'HYBRID',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        trialDays: 14,
        features: JSON.stringify([
          'WhatsApp Business API',
          'ردود سريعة',
          'قوالب الرسائل',
          'ردود تلقائية',
          'تقارير الرسائل'
        ]),
        isActive: true,
        isPopular: true
      },
      {
        slug: 'telegram-integration',
        name: 'تكامل Telegram',
        nameEn: 'Telegram Integration',
        category: 'COMMUNICATION',
        description: 'إدارة مجموعات وقنوات تليجرام، الرد الآلي، والبوتات المتقدمة.',
        descriptionEn: 'Manage Telegram groups and channels, auto-reply, and advanced bots.',
        icon: '✈️',
        pricingModel: 'HYBRID',
        monthlyPrice: 149,
        yearlyPrice: 1490,
        trialDays: 14,
        features: JSON.stringify([
          'إدارة القنوات والمجموعات',
          'بوتات الرد الآلي',
          'جدولة الرسائل',
          'تحليلات التفاعل'
        ]),
        isActive: true,
        isPopular: false
      },
      {
        slug: 'crm-basic',
        name: 'CRM الأساسي',
        nameEn: 'Basic CRM',
        category: 'CRM',
        description: 'إدارة العملاء والمحادثات والملاحظات. حتى 1000 عميل.',
        descriptionEn: 'Manage customers, conversations, and notes. Up to 1000 customers.',
        icon: '📊',
        pricingModel: 'SUBSCRIPTION',
        monthlyPrice: 149,
        yearlyPrice: 1490,
        trialDays: 14,
        features: JSON.stringify([
          'إدارة العملاء (1000)',
          'المحادثات',
          'الملاحظات',
          'تقارير أساسية'
        ]),
        limitations: JSON.stringify({ maxCustomers: 1000 }),
        isActive: true
      },
      {
        slug: 'analytics-advanced',
        name: 'التحليلات المتقدمة',
        nameEn: 'Advanced Analytics',
        category: 'ANALYTICS',
        description: 'تحليلات متقدمة مع تقارير مخصصة وتصدير البيانات وتتبع الأهداف.',
        descriptionEn: 'Advanced analytics with custom reports, data export, and goal tracking.',
        icon: '📈',
        pricingModel: 'SUBSCRIPTION',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        trialDays: 14,
        features: JSON.stringify([
          'تحليلات متقدمة',
          'تقارير مخصصة',
          'تصدير البيانات',
          'تتبع الأهداف',
          'Predictive Analytics'
        ]),
        isActive: true
      }
    ];

    for (const app of apps) {
      await prisma.marketplaceApp.upsert({
        where: { slug: app.slug },
        update: app,
        create: app
      });
      console.log(`  ✅ Created app: ${app.name}`);
    }

    // 3. إضافة الباقات المجمعة
    console.log('\n📦 Creating App Bundles...');

    const bundles = [
      {
        slug: 'starter-bundle',
        name: 'باقة البداية',
        nameEn: 'Starter Bundle',
        description: 'باقة مثالية للشركات الناشئة: المتجر الأساسي + CRM + إدارة الموظفين',
        appIds: JSON.stringify(['ecommerce-basic', 'crm-basic', 'hr-basic']),
        monthlyPrice: 399,
        yearlyPrice: 3990,
        discount: 30,
        isActive: true,
        isFeatured: true
      },
      {
        slug: 'business-bundle',
        name: 'باقة الأعمال',
        nameEn: 'Business Bundle',
        description: 'باقة شاملة للشركات المتوسطة: المتجر المتقدم + CRM + HR كامل + AI + WhatsApp',
        appIds: JSON.stringify(['ecommerce-pro', 'crm-basic', 'hr-basic', 'hr-attendance', 'hr-payroll', 'ai-chat-basic', 'whatsapp-integration']),
        monthlyPrice: 1299,
        yearlyPrice: 12990,
        discount: 40,
        isActive: true,
        isFeatured: true
      }
    ];

    for (const bundle of bundles) {
      await prisma.appBundle.upsert({
        where: { slug: bundle.slug },
        update: bundle,
        create: bundle
      });
      console.log(`  ✅ Created bundle: ${bundle.name}`);
    }

    console.log('\n✅ Marketplace Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${apps.length} Marketplace Apps`);
    console.log(`  - ${bundles.length} App Bundles`);

  } catch (error) {
    console.error('❌ Error seeding marketplace:', error);
    throw error;
  }
}

seedMarketplace()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
