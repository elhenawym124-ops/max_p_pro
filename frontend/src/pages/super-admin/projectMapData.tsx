import React from 'react';
import {
    ShoppingCart,
    LayoutDashboard,
    Users,
    Megaphone,
    ShieldAlert,
    Bot,
    Globe,
    CreditCard,
    MessageSquare,
    Facebook,
    Database,
    Code,
    Image as ImageIcon,
    Zap as Speed,
    Trophy,
    Truck
} from 'lucide-react';

export type ProjectNodeStatus = 'stable' | 'beta' | 'new' | 'maintenance';

export interface ProjectNode {
    id: string;
    title: string;
    icon: React.ReactNode; // Using ReactNode to store the icon component directly
    color?: string;
    description: string;
    businessValue?: string; // New field for ROI/Benefit
    status?: ProjectNodeStatus;
    requiredRole?: string[]; // Array of roles allowed to see this
    children?: {
        id: string;
        title: string;
        icon: React.ReactNode;
        description: string;
        businessValue?: string; // ROI for specific features
        details: string[];
        status?: ProjectNodeStatus;
        requiredRole?: string[];
    }[];
}

export const projectStructure: ProjectNode[] = [
    {
        id: 'storefront',
        title: 'المتجر الإلكتروني (Storefront)',
        icon: <ShoppingCart className="w-6 h-6" />,
        color: 'bg-blue-500',
        description: 'الواجهة العامة للعملاء.',
        businessValue: 'زيادة المبيعات المباشرة وتوفير تجربة شراء سلسة وممتعة للعميل.',
        status: 'stable',
        children: [
            {
                id: 'home',
                title: 'الصفحات الرئيسية (Landing)',
                icon: <Globe className="w-4 h-4" />,
                description: 'خيارات متعددة للصفحة الرئيسية (Modern, Simple, Replica).',
                businessValue: 'اختبار A/B لزيادة معدل التحويل (Conversion Rate).',
                details: ['/home', '/home-simple', '/woodmart-replica', '/landing-pages'],
                status: 'stable'
            },
            {
                id: 'shop',
                title: 'التسوق والمنتجات',
                icon: <ShoppingCart className="w-4 h-4" />,
                description: 'تصفح المنتجات، الفلترة، والمفضلة.',
                businessValue: 'تسهيل وصول العميل للمنتج المطلوب بسرعة.',
                details: ['/shop', '/products/:id', '/shop/wishlist'],
                status: 'stable'
            },
            {
                id: 'checkout',
                title: 'الدفع والشحن',
                icon: <CreditCard className="w-4 h-4" />,
                description: 'سلة الشراء، الدفع، وتتبع الشحنات.',
                businessValue: 'تقليل نسبة ترك السلة (Abandoned Cart) وتأمين المدفوعات.',
                details: ['/shop/cart', '/shop/checkout', '/shop/track-order'],
                status: 'stable'
            },
            {
                id: 'customer-portal',
                title: 'بوابة العميل',
                icon: <Users className="w-4 h-4" />,
                description: 'الملف الشخصي، الطلبات، والفواتير.',
                businessValue: 'بناء ولاء العميل وتقليل طلبات الدعم الفني.',
                details: ['/profile', '/shop/orders', '/invoices'],
                status: 'stable'
            }
        ]
    },
    {
        id: 'dashboard',
        title: 'إدارة العمليات (Operations)',
        icon: <LayoutDashboard className="w-6 h-6" />,
        color: 'bg-indigo-500',
        description: 'المركز الرئيسي لإدارة النشاط التجاري.',
        businessValue: 'الأتمتة الكاملة للعمليات لتقليل التكاليف التشغيلية والأخطاء البشرية.',
        status: 'stable',
        children: [
            {
                id: 'orders-mgmt',
                title: 'إدارة الطلبات المتكاملة',
                icon: <CreditCard className="w-4 h-4" />,
                description: 'طلبات الموقع، WooCommerce، والطلبات اليدوية.',
                businessValue: 'مركزية الطلبات من جميع القنوات لتسريع الشحن.',
                details: ['/orders', 'WooCommerce Sync', '/orders/manual'],
                status: 'stable'
            },
            {
                id: 'inventory',
                title: 'المخزون والمنتجات',
                icon: <Database className="w-4 h-4" />,
                description: 'إدارة الكتالوج، استيراد (EasyOrders)، والجرد.',
                businessValue: 'منع نفاذ المخزون وتقليل تكاليف التخزين.',
                details: ['/inventory', '/products', 'Easy Orders Import'],
                status: 'stable'
            },
            {
                id: 'crm-loyalty',
                title: 'العملاء والولاء',
                icon: <Users className="w-4 h-4" />,
                description: 'قاعدة العملاء، الكوبونات، والمحفظة.',
                businessValue: 'زيادة القيمة العمرية للعميل (LTV) عبر برامج الولاء.',
                details: ['/customers', '/coupons', '/wallet-management'],
                status: 'stable'
            },
            {
                id: 'communications',
                title: 'مركز الاتصال الموحد',
                icon: <MessageSquare className="w-4 h-4" />,
                description: 'Inbox موحد (FB, WhatsApp, Telegram) وبث الرسائل.',
                businessValue: 'استجابة فورية للعملاء وزيادة الرضا عبر قنوات موحدة.',
                details: ['/conversations-improved', '/broadcast', '/whatsapp', '/telegram'],
                status: 'beta' // Unified inbox is often complex/beta
            }
        ]
    },
    {
        id: 'hr',
        title: 'الموارد البشرية الشامل (HRIS)',
        icon: <Users className="w-6 h-6" />,
        color: 'bg-green-500',
        description: 'نظام متكامل لإدارة القوى العاملة.',
        businessValue: 'إدارة دورة حياة الموظف بالكامل من التوظيف إلى التقاعد لزيادة الإنتاجية.',
        status: 'stable',
        children: [
            {
                id: 'employees-mgmt',
                title: 'إدارة الموظفين',
                icon: <Users className="w-4 h-4" />,
                description: 'ملفات، عقود، ورديات، وهيكل تنظيمي.',
                businessValue: 'قاعدة بيانات مركزية وآمنة لبيانات الموظفين.',
                details: ['/hr/employees', '/hr/departments', '/hr/shifts'],
                status: 'stable'
            },
            {
                id: 'finance-hr',
                title: 'الرواتب والمالية',
                icon: <CreditCard className="w-4 h-4" />,
                description: 'مسيرات الرواتب، السلف، والمكافآت.',
                businessValue: 'دقة 100% في حساب الرواتب والامتثال للقوانين.',
                details: ['/hr/payroll', '/hr/advances', '/hr/benefits'],
                status: 'stable'
            },
            {
                id: 'performance',
                title: 'الأداء والتدريب',
                icon: <Trophy className="w-4 h-4" />,
                description: 'تقييمات الأداء، الأهداف، الدورات التدريبية.',
                businessValue: 'تطوير الكفاءات وربط الأداء بالمكافآت.',
                details: ['/hr/performance-reviews', '/hr/goals', '/hr/training'],
                status: 'new'
            },
            {
                id: 'ess',
                title: 'الخدمة الذاتية (ESS)',
                icon: <Users className="w-4 h-4" />,
                description: 'بوابة الموظف للإجازات، الاستقالات، والحضور.',
                businessValue: 'تخفيف العبء الإداري وتمكين الموظفين.',
                details: ['/my-attendance', '/my-leaves', '/hr/resignations'],
                status: 'stable'
            }
        ]
    },
    {
        id: 'marketing',
        title: 'التسويق والإعلانات (Ads Manager)',
        icon: <Megaphone className="w-6 h-6" />,
        color: 'bg-purple-500',
        description: 'منصة إعلانية متكاملة مدعومة بـ Meta API.',
        businessValue: 'تحسين العائد على الإعلانات (ROAS) من خلال الاستهداف الدقيق والأتمتة.',
        status: 'stable',
        children: [
            {
                id: 'meta-ads',
                title: 'مدير حملات فيسبوك',
                icon: <Facebook className="w-4 h-4" />,
                description: 'إنشاء حملات، مجموعات إعلانية، وإعلانات Dynamic.',
                businessValue: 'إطلاق حملات بشكل أسرع وأكثر ذكاءً دون مغادرة المنصة.',
                details: ['/advertising/facebook-ads', 'Create Wizard'],
                status: 'stable'
            },
            {
                id: 'smart-audiences',
                title: 'الجماهير الذكية',
                icon: <Users className="w-4 h-4" />,
                description: 'جماهير مخصصة (Custom) ومشابهة (Lookalike) من البيانات.',
                businessValue: 'إعادة استهداف العملاء الأكثر احتمالية للشراء.',
                details: ['/advertising/audiences', 'Customer List Sync'],
                status: 'new'
            },
            {
                id: 'tracking-pixel',
                title: 'التتبع والتحويلات',
                icon: <Code className="w-4 h-4" />,
                description: 'Facebook Pixel و Conversion API Server-side.',
                businessValue: 'دقة تتبع تصل إلى 100% لتفادي حظر كوكيز المتصفح.',
                details: ['/advertising/conversions', '/advertising/facebook-pixel'],
                status: 'stable'
            },
            {
                id: 'automation',
                title: 'الأتمتة والقواعد',
                icon: <Bot className="w-4 h-4" />,
                description: 'قواعد لإيقاف/تشغيل الإعلانات تلقائياً بناءً على الأداء.',
                businessValue: 'حماية الميزانية من الهدر على إعلانات غير رابحة.',
                details: ['/advertising/automation-rules'],
                status: 'beta'
            }
        ]
    },
    {
        id: 'ai-advanced',
        title: 'الذكاء الاصطناعي (AI & Automation)',
        icon: <Bot className="w-6 h-6" />,
        color: 'bg-teal-500',
        description: 'محرك ذكاء اصطناعي يخدم كل أجزاء النظام.',
        businessValue: 'تقليل الاعتماد على العنصر البشري في المهام الروتينية والإبداعية.',
        status: 'beta',
        children: [
            {
                id: 'rag-engine',
                title: 'محرك RAG الذكي',
                icon: <Database className="w-4 h-4" />,
                description: 'نظام الرد الآلي المعتمد على قاعدة المعرفة والوثائق.',
                businessValue: 'دعم فني فوري متاح 24/7 دون تكاليف إضافية.',
                details: ['/rag-analytics', 'Embedding Service'],
                status: 'new'
            },
            {
                id: 'image-studio',
                title: 'استديو الصور (Image Studio)',
                icon: <ImageIcon className="w-4 h-4" />,
                description: 'توليد وتعديل صور المنتجات والإعلانات بالـ AI.',
                businessValue: 'توفير تكاليف المصممين وجلسات التصوير.',
                details: ['/image-studio', '/super-admin/image-studio'],
                status: 'beta'
            },
            {
                id: 'turbo-ai',
                title: 'Turbo AI Service',
                icon: <Speed className="w-4 h-4" />,
                description: 'خدمة معالجة فائقة السرعة للردود والتحليلات.',
                businessValue: 'ضمان سرعة استجابة فائقة للبوت أثناء ضغط العملاء.',
                details: ['/settings/turbo', 'TurboService.js'],
                status: 'new'
            },
            {
                id: 'prompts',
                title: 'إدارة التوجيهات (Prompts)',
                icon: <MessageSquare className="w-4 h-4" />,
                description: 'مكتبة مركزية لتوجيهات البوار (System Prompts).',
                businessValue: 'التحكم الكامل في شخصية ونبرة الـ AI.',
                details: ['/super-admin/prompt-library'],
                status: 'stable'
            }
        ]
    },
    {
        id: 'super-system',
        title: 'النظام والسوبر أدمن',
        icon: <ShieldAlert className="w-6 h-6" />,
        color: 'bg-red-500',
        status: 'stable',
        requiredRole: ['SUPER_ADMIN'],
        description: 'أدوات التحكم والرقابة للمطورين والمالكين.',
        businessValue: 'السيطرة الكاملة على البنية التحتية، الأمان، والتدرج (Scalability).',
        children: [
            {
                id: 'saas-core',
                title: 'نواة الـ SaaS',
                icon: <Globe className="w-4 h-4" />,
                description: 'إدارة الشركات (Multi-tenancy)، الخطط، والمدفوعات.',
                businessValue: 'إدارة آلاف المشتركين والشركات من لوحة واحدة.',
                details: ['/super-admin/companies', '/super-admin/plans'],
                status: 'stable'
            },
            {
                id: 'dev-ecosystem',
                title: 'بيئة التطوير (DevOps)',
                icon: <Code className="w-4 h-4" />,
                description: 'إدارة مهام المطورين، الترحيل (Migrations)، والـ Leaderboard.',
                businessValue: 'تسريع وتيرة التطوير وضمان جودة الكود.',
                details: ['/super-admin/dev-tasks', '/super-admin/dev-leaderboard'],
                status: 'stable'
            },
            {
                id: 'monitoring',
                title: 'المراقبة والتقارير',
                icon: <ShieldAlert className="w-4 h-4" />,
                description: 'سجلات النظام، أخطاء AI، ومراقبة الـ Health.',
                businessValue: 'الاكتشاف المبكر للمشاكل قبل أن تؤثر على المستخدمين.',
                details: ['/super-admin/ai-logs', '/monitoring'],
                status: 'beta'
            },
            {
                id: 'page-builder',
                title: 'باني الصفحات',
                icon: <LayoutDashboard className="w-4 h-4" />,
                description: 'أداة لبناء صفحات هبوط (Landing Pages) مخصصة.',
                businessValue: 'مرونة تسويقية عالية دون الحاجة لمطورين.',
                details: ['/page-builder', '/super-admin/themes'],
                status: 'beta'
            }
        ]
    }
];
