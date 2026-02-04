const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// استيراد مهام التسويق من الملف الأصلي
const marketingTasks = [
  {
    title: "نظام التسويق عبر البريد الإلكتروني",
    description: `إنشاء نظام تسويق إلكتروني متكامل يشمل:

**Backend Requirements:**
- إنشاء جداول قاعدة البيانات: EmailCampaigns, EmailTemplates, EmailSubscribers, EmailLogs
- تكامل مع SendGrid/MailChimp APIs
- نظام إدارة قوائم البريد الإلكتروني
- نظام A/B Testing للحملات
- تتبع معدلات الفتح والنقر
- نظام Drip Campaigns التلقائية

**Frontend Requirements:**
- واجهة إنشاء الحملات البريدية
- محرر قوالب البريد الإلكتروني (WYSIWYG)
- لوحة تحكم الإحصائيات
- إدارة قوائم المشتركين
- جدولة الحملات

**الهدف:** زيادة معدل التحويل بنسبة 25% من خلال التسويق المباشر

**معايير القبول:**
- إرسال 1000+ بريد إلكتروني في الساعة
- معدل تسليم 95%+
- واجهة سهلة الاستخدام للتسويق
- تقارير تفصيلية للأداء`,
    type: "FEATURE",
    priority: "HIGH",
    status: "BACKLOG",
    component: "email-marketing",
    estimatedHours: 40,
    tags: "email,marketing,automation"
  },
  {
    title: "تكامل Google Ads",
    description: `تكامل كامل مع Google Ads API لإدارة الحملات الإعلانية:

**Backend Requirements:**
- تكامل مع Google Ads API v14
- إنشاء جداول: GoogleCampaigns, GoogleAdGroups, GoogleAds, GoogleKeywords
- نظام إدارة الميزانيات والمزايدات
- تتبع الأداء والتحويلات
- تكامل مع Google Analytics 4

**Frontend Requirements:**
- واجهة إنشاء حملات البحث والعرض
- أدوات البحث عن الكلمات المفتاحية
- لوحة تحكم الأداء والإحصائيات
- إدارة الميزانيات والجدولة
- تقارير ROI مفصلة

**الهدف:** توسيع نطاق الوصول وزيادة حركة المرور بنسبة 40%

**معايير القبول:**
- إنشاء وإدارة حملات Google Ads
- تتبع دقيق للتحويلات
- تحسين تلقائي للمزايدات
- تقارير أداء شاملة`,
    type: "FEATURE",
    priority: "HIGH",
    status: "BACKLOG",
    component: "google-ads",
    estimatedHours: 35,
    tags: "google,ads,ppc,analytics"
  },
  {
    title: "تطوير نظام الواتساب التسويقي",
    description: `تطوير النظام الحالي ليشمل مزايا تسويقية متقدمة:

**التحسينات المطلوبة:**
- WhatsApp Business API الكامل
- نظام Broadcast Lists المتقدم
- WhatsApp Catalog للمنتجات
- رسائل تفاعلية (Interactive Messages)
- تكامل WhatsApp Pay
- نظام الردود التلقائية الذكية

**المزايا الجديدة:**
- حملات تسويقية مجدولة
- تقسيم العملاء (Segmentation)
- تتبع معدلات القراءة والاستجابة
- نظام CRM مدمج

**الهدف:** زيادة معدل التفاعل عبر الواتساب بنسبة 60%

**معايير القبول:**
- إرسال 10,000+ رسالة يومياً
- معدل تسليم 98%+
- واجهة إدارة الحملات
- تحليلات مفصلة للأداء`,
    type: "ENHANCEMENT",
    priority: "HIGH",
    status: "BACKLOG",
    component: "whatsapp",
    estimatedHours: 30,
    tags: "whatsapp,messaging,automation"
  },
  {
    title: "تكامل Instagram Marketing",
    description: `تكامل كامل مع Instagram Business API:

**المزايا المطلوبة:**
- نشر المحتوى التلقائي (Posts & Stories)
- Instagram Shopping Integration
- إدارة التعليقات والرسائل المباشرة
- تحليلات الأداء والوصول
- حملات المؤثرين
- جدولة المنشورات
- إدارة الهاشتاجات
- تتبع المنافسين

**الهدف:** بناء حضور قوي على Instagram وزيادة المبيعات

**معايير القبول:**
- نشر تلقائي للمحتوى
- تتبع التفاعل والوصول
- إدارة متكاملة للتعليقات
- تقارير أداء مفصلة`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "instagram",
    estimatedHours: 25,
    tags: "instagram,social-media,content"
  },
  {
    title: "تكامل TikTok for Business",
    description: `تكامل مع TikTok Business API للوصول للجمهور الشاب:

**المزايا المطلوبة:**
- إنشاء وإدارة حملات TikTok Ads
- تحليل الترندات والهاشتاجات
- أدوات إنشاء المحتوى التفاعلي
- تتبع الأداء والمشاركات
- إدارة التحديات (Challenges)
- تحليل الجمهور المستهدف

**الهدف:** الوصول لجمهور جديد من الشباب وزيادة الوعي بالعلامة التجارية

**معايير القبول:**
- إنشاء حملات TikTok فعالة
- تتبع الترندات والمشاركة فيها
- تحليل أداء المحتوى
- زيادة الوعي بالعلامة التجارية`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "tiktok",
    estimatedHours: 20,
    tags: "tiktok,social-media,youth"
  },
  {
    title: "تكامل LinkedIn Marketing",
    description: `تكامل مع LinkedIn Marketing API للتسويق B2B:

**المزايا المطلوبة:**
- تكامل مع LinkedIn Marketing API
- حملات B2B المتخصصة
- إدارة صفحات الشركات
- LinkedIn Lead Gen Forms
- تحليلات الأداء المهني
- استهداف متقدم للمهنيين

**الهدف:** الوصول للعملاء المؤسسيين وزيادة المبيعات B2B

**معايير القبول:**
- حملات B2B فعالة
- توليد عملاء محتملين مؤهلين
- تحليلات مهنية متقدمة
- زيادة المبيعات المؤسسية`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "linkedin",
    estimatedHours: 22,
    tags: "linkedin,b2b,professional"
  },
  {
    title: "نظام التحليلات المتقدم",
    description: `إنشاء نظام تحليلات شامل للتسويق:

**المزايا المطلوبة:**
- Customer Journey Analytics
- Attribution Modeling
- Cohort Analysis
- Predictive Analytics
- Real-time Dashboards
- Custom KPIs
- Heat Maps للموقع
- Conversion Funnel Analysis
- Cross-platform Analytics
- تقارير تنفيذية تلقائية

**الهدف:** فهم أعمق لسلوك العملاء وتحسين ROI

**معايير القبول:**
- تتبع رحلة العميل الكاملة
- تحليلات تنبؤية دقيقة
- لوحات تحكم فورية
- تقارير مخصصة للإدارة`,
    type: "FEATURE",
    priority: "HIGH",
    status: "BACKLOG",
    component: "analytics",
    estimatedHours: 45,
    tags: "analytics,data,insights"
  },
  {
    title: "محرك التخصيص الذكي",
    description: `تطوير محرك ذكي لتخصيص التجربة التسويقية:

**المزايا المطلوبة:**
- تخصيص المحتوى حسب سلوك المستخدم
- توصيات المنتجات الذكية
- تحسين أوقات الإرسال
- تسعير ديناميكي ذكي
- تخصيص رحلة العميل
- AI-powered Content Generation
- Behavioral Targeting
- Smart Segmentation

**الهدف:** زيادة معدل التحويل بنسبة 35% من خلال التخصيص

**معايير القبول:**
- تخصيص دقيق للمحتوى
- توصيات ذكية للمنتجات
- تحسين معدلات التحويل
- تجربة مستخدم محسنة`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "ai",
    estimatedHours: 50,
    tags: "ai,personalization,ml"
  },
  {
    title: "نظام التسويق بالعمولة",
    description: `إنشاء نظام شامل للتسويق بالعمولة:

**المزايا المطلوبة:**
- تسجيل وإدارة المسوقين
- تتبع الإحالات والمبيعات
- حساب العمولات التلقائي
- بوابة المسوقين
- تقارير الأداء
- نظام الدفع المدمج
- Multi-tier Commission Structure
- Fraud Detection System
- Marketing Materials Library

**الهدف:** زيادة المبيعات بنسبة 30% من خلال شبكة المسوقين

**معايير القبول:**
- نظام عمولات دقيق
- بوابة مسوقين سهلة الاستخدام
- تتبع شامل للإحالات
- حماية من الاحتيال`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "affiliate",
    estimatedHours: 35,
    tags: "affiliate,commission,partners"
  },
  {
    title: "منصة إدارة المؤثرين",
    description: `منصة لإدارة حملات المؤثرين:

**المزايا المطلوبة:**
- قاعدة بيانات المؤثرين
- إدارة الحملات والعقود
- تتبع الأداء والوصول
- نظام الدفع المدمج
- تقييم المؤثرين
- Content Approval Workflow
- Performance Benchmarking
- ROI Tracking per Influencer

**الهدف:** بناء شراكات قوية مع المؤثرين

**معايير القبول:**
- قاعدة بيانات شاملة للمؤثرين
- إدارة فعالة للحملات
- تتبع دقيق للأداء
- عائد استثمار إيجابي`,
    type: "FEATURE",
    priority: "LOW",
    status: "BACKLOG",
    component: "influencer",
    estimatedHours: 25,
    tags: "influencer,partnerships,social"
  },
  {
    title: "نظام SMS Marketing",
    description: `نظام تسويق عبر الرسائل النصية:

**المزايا المطلوبة:**
- تكامل مع SMS Gateway APIs
- حملات SMS مجدولة
- تخصيص الرسائل
- تتبع معدلات التسليم والاستجابة
- SMS Automation Workflows
- Two-way SMS Communication
- Compliance Management
- International SMS Support

**الهدف:** وصول مباشر للعملاء وزيادة معدل الاستجابة

**معايير القبول:**
- إرسال رسائل نصية موثوقة
- معدلات تسليم عالية
- امتثال للقوانين المحلية
- تحليلات مفصلة للأداء`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "sms-marketing",
    estimatedHours: 20,
    tags: "sms,messaging,mobile"
  },
  {
    title: "نظام Push Notifications",
    description: `نظام إشعارات فورية متقدم:

**المزايا المطلوبة:**
- Web Push Notifications
- Mobile App Push Notifications
- تخصيص الإشعارات حسب السلوك
- جدولة الإشعارات
- A/B Testing للإشعارات
- Location-based Notifications
- Rich Media Notifications
- Analytics Dashboard

**الهدف:** زيادة معدل العودة والتفاعل

**معايير القبول:**
- إشعارات فورية موثوقة
- تخصيص دقيق للمحتوى
- معدلات فتح عالية
- تحليلات شاملة`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "push-notifications",
    estimatedHours: 18,
    tags: "push,notifications,engagement"
  },
  {
    title: "نظام إدارة المحتوى التسويقي",
    description: `نظام شامل لإدارة المحتوى التسويقي:

**المزايا المطلوبة:**
- Content Calendar المتكامل
- Content Templates Library
- Multi-platform Publishing
- Content Performance Analytics
- SEO Optimization Tools
- Content Collaboration Tools
- Brand Guidelines Enforcement
- Content Approval Workflow

**الهدف:** تحسين جودة المحتوى وزيادة الوصول العضوي

**معايير القبول:**
- تقويم محتوى منظم
- نشر متعدد المنصات
- تحليلات أداء المحتوى
- تحسين SEO تلقائي`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "content-management",
    estimatedHours: 30,
    tags: "content,cms,publishing"
  },
  {
    title: "نظام التسويق بالفيديو",
    description: `نظام متكامل للتسويق بالفيديو:

**المزايا المطلوبة:**
- Video Content Management
- YouTube Integration
- Video Analytics
- Live Streaming Support
- Video SEO Optimization
- Interactive Video Features
- Video Personalization
- Multi-format Video Support

**الهدف:** زيادة التفاعل من خلال المحتوى المرئي

**معايير القبول:**
- إدارة فعالة للفيديوهات
- تحليلات مفصلة للأداء
- تحسين SEO للفيديو
- دعم البث المباشر`,
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "video-marketing",
    estimatedHours: 28,
    tags: "video,youtube,streaming"
  },
  {
    title: "نظام SEO المتقدم",
    description: `نظام شامل لتحسين محركات البحث:

**المزايا المطلوبة:**
- Technical SEO Audit Tools
- Keyword Research & Tracking
- Content Optimization Suggestions
- Backlink Management
- Local SEO Tools
- Schema Markup Generator
- Site Speed Optimization
- Mobile SEO Optimization
- Competitor Analysis
- SERP Tracking

**الهدف:** تحسين ترتيب الموقع في محركات البحث

**معايير القبول:**
- تحسين تقني شامل للموقع
- تتبع الكلمات المفتاحية
- تحليل المنافسين
- تحسين السرعة والأداء`,
    type: "FEATURE",
    priority: "HIGH",
    status: "BACKLOG",
    component: "seo",
    estimatedHours: 35,
    tags: "seo,search,optimization"
  },
  {
    title: "نظام التسويق التلقائي",
    description: `نظام شامل لأتمتة العمليات التسويقية:

**المزايا المطلوبة:**
- Marketing Automation Workflows
- Lead Scoring System
- Behavioral Triggers
- Multi-channel Campaigns
- Customer Lifecycle Management
- Personalized Customer Journeys
- Advanced Segmentation
- Predictive Lead Scoring

**الهدف:** أتمتة العمليات التسويقية وتحسين الكفاءة

**معايير القبول:**
- سير عمل تلقائي فعال
- تقييم ذكي للعملاء المحتملين
- حملات متعددة القنوات
- تخصيص رحلة العميل`,
    type: "FEATURE",
    priority: "HIGH",
    status: "BACKLOG",
    component: "automation",
    estimatedHours: 40,
    tags: "automation,workflows,ai"
  },
  {
    title: "نظام إدارة العملاء المحتملين",
    description: `نظام متكامل لإدارة العملاء المحتملين:

**المزايا المطلوبة:**
- Lead Capture Forms
- Lead Qualification System
- Lead Distribution
- Follow-up Automation
- Lead Analytics
- CRM Integration
- Lead Nurturing Campaigns
- Conversion Tracking

**الهدف:** تحسين معدل تحويل العملاء المحتملين

**معايير القبول:**
- التقاط فعال للعملاء المحتملين
- تأهيل تلقائي للعملاء
- متابعة منظمة ومؤتمتة
- تحليلات شاملة للتحويل`,
    type: "FEATURE",
    priority: "HIGH",
    status: "BACKLOG",
    component: "lead-management",
    estimatedHours: 32,
    tags: "leads,crm,conversion"
  }
];

async function insertMarketingTasks() {
  try {
    console.log('🚀 بدء إدخال مهام التسويق الرقمي...');

    // البحث عن مستخدم موجود أولاً
    const existingUser = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    });

    if (!existingUser) {
      console.log('❌ لا يوجد مستخدم Super Admin في النظام');
      return;
    }

    console.log('✅ تم العثور على مستخدم:', existingUser.firstName, existingUser.lastName);

    // البحث عن عضو فريق تطوير موجود
    let devTeamMember = await prisma.devTeamMember.findFirst({
      where: {
        userId: existingUser.id
      }
    });

    if (!devTeamMember) {
      // إنشاء عضو فريق التطوير
      devTeamMember = await prisma.devTeamMember.create({
        data: {
          userId: existingUser.id,
          role: 'tech_lead',
          department: 'Development',
          skills: 'Marketing Technology,API Integration,Frontend Development',
          availability: 'available',
          isActive: true
        }
      });
      console.log('✅ تم إنشاء عضو فريق التطوير:', devTeamMember.id);
    } else {
      console.log('✅ تم العثور على عضو فريق التطوير:', devTeamMember.id);
    }

    // إنشاء مشروع جديد للتسويق الرقمي
    const project = await prisma.devProject.create({
      data: {
        name: 'التسويق الرقمي المتقدم',
        description: 'مشروع شامل لتطوير جميع أنظمة التسويق الرقمي المتقدمة بما في ذلك البريد الإلكتروني، وسائل التواصل الاجتماعي، Google Ads، التحليلات، والذكاء الاصطناعي',
        status: 'PLANNING',
        priority: 'HIGH',
        color: '#f59e0b',
        icon: '📈',
        startDate: new Date('2026-01-03T13:00:00Z'),
        endDate: new Date('2026-06-30T23:59:59Z'),
        progress: 0,
        managerId: devTeamMember.id,
        tags: 'marketing,digital,automation,ai,social-media,analytics',
        repository: null
      }
    });

    console.log('✅ تم إنشاء المشروع:', project.name);

    // إدخال المهام واحدة تلو الأخرى
    let totalEstimatedHours = 0;
    for (let i = 0; i < marketingTasks.length; i++) {
      const taskData = {
        ...marketingTasks[i],
        projectId: project.id,
        reporterId: devTeamMember.id,
        assigneeId: null, // سيتم تعيين المطورين لاحقاً
        order: i + 1,
        dueDate: new Date('2026-06-30T23:59:59Z') // موعد نهائي للمشروع
      };

      const task = await prisma.devTask.create({
        data: taskData
      });

      totalEstimatedHours += marketingTasks[i].estimatedHours;
      console.log(`✅ تم إنشاء المهمة ${i + 1}: ${task.title}`);
    }

    // إنشاء إصدار للمشروع
    const release = await prisma.devRelease.create({
      data: {
        version: 'v2.0.0',
        name: 'إصدار التسويق الرقمي المتقدم',
        description: 'الإصدار الثاني الذي يشمل جميع أنظمة التسويق الرقمي المتقدمة',
        status: 'PLANNING',
        releaseDate: new Date('2026-06-30T23:59:59Z'),
        changelog: `
# إصدار التسويق الرقمي المتقدم v2.0.0

## 🎯 المهام المطلوبة (${marketingTasks.length} مهمة):

### 📧 التسويق عبر البريد الإلكتروني
- نظام تسويق إلكتروني متكامل مع SendGrid/MailChimp
- محرر قوالب WYSIWYG ونظام A/B Testing

### 🔍 إعلانات Google و LinkedIn
- تكامل كامل مع Google Ads API v14
- حملات B2B متخصصة عبر LinkedIn

### 📱 وسائل التواصل الاجتماعي
- تطوير نظام الواتساب التسويقي
- تكامل Instagram و TikTok Marketing
- منصة إدارة المؤثرين

### 🤖 الذكاء الاصطناعي والتحليلات
- محرك التخصيص الذكي
- نظام التحليلات المتقدم
- التسويق التلقائي

### 📊 أنظمة إضافية
- نظام التسويق بالعمولة
- SMS Marketing و Push Notifications
- إدارة المحتوى التسويقي
- التسويق بالفيديو
- SEO المتقدم
- إدارة العملاء المحتملين

## 📈 الأهداف المتوقعة:
- زيادة معدل التحويل بنسبة 25-60%
- تحسين ROI بمعدل 30-50%
- أتمتة العمليات التسويقية
- الوصول لجماهير جديدة

## ⏱️ إجمالي الساعات المقدرة: ${totalEstimatedHours} ساعة
        `,
        projectId: project.id
      }
    });

    console.log('✅ تم إنشاء الإصدار:', release.name);

    console.log('\n🎉 تم إدخال جميع مهام التسويق بنجاح!');
    console.log(`📊 الإحصائيات:`);
    console.log(`   - المشاريع: 1`);
    console.log(`   - المهام: ${marketingTasks.length}`);
    console.log(`   - الإصدارات: 1`);
    console.log(`   - إجمالي الساعات المقدرة: ${totalEstimatedHours} ساعة`);
    console.log(`   - حالة المشروع: في مرحلة التخطيط`);
    console.log(`   - المدير: ${existingUser.firstName} ${existingUser.lastName}`);
    console.log(`   - الموعد النهائي: 30 يونيو 2026`);

  } catch (error) {
    console.error('❌ خطأ في إدخال مهام التسويق:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الدالة
insertMarketingTasks()
  .then(() => {
    console.log('✅ تم الانتهاء من إدخال مهام التسويق بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل في إدخال مهام التسويق:', error);
    process.exit(1);
  });
