
import {
    UserCircleIcon,
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    UsersIcon,
    ShoppingBagIcon,
    DocumentTextIcon,
    CogIcon,
    BuildingOfficeIcon,
    BuildingStorefrontIcon,
    CalendarIcon,
    CheckCircleIcon,
    SpeakerWaveIcon,
    TagIcon,
    ArchiveBoxIcon,
    TicketIcon,
    ClipboardDocumentListIcon,
    BanknotesIcon,
    CreditCardIcon,
    PresentationChartLineIcon,
    WrenchScrewdriverIcon,
    BellIcon,
    BellAlertIcon,
    ExclamationTriangleIcon,
    BeakerIcon,
    UserGroupIcon,
    KeyIcon,
    DocumentCheckIcon,
    ShieldExclamationIcon,
    CurrencyDollarIcon,
    TruckIcon,
    MapPinIcon,
    ArrowUturnLeftIcon,
    FunnelIcon,
    ShoppingCartIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    BoltIcon,
    MegaphoneIcon,
    QuestionMarkCircleIcon,
    RocketLaunchIcon,
    StarIcon,
    ArrowTrendingUpIcon,
    PaperAirplaneIcon,
    PencilSquareIcon,
    ComputerDesktopIcon,
    Cog6ToothIcon,
    QueueListIcon,
    ShieldCheckIcon,
    WalletIcon,
    CubeIcon
} from '@heroicons/react/24/outline';
import { SidebarSection } from '../types/layout';

export const getSidebarConfig = (t: (key: string) => string, user: any): SidebarSection[] => {
    // 🔍 DEBUG: Track user role for sidebar visibility
    console.log('🔍 [SIDEBAR] getSidebarConfig called with user:', {
        role: user?.role,
        email: user?.email,
        id: user?.id,
    });

    const currentCompany = user?.companies?.find((c: any) => c.isCurrent) || user?.company;
    const activeApps = currentCompany?.activeApps || [];
    const plan = currentCompany?.plan?.toUpperCase();
    const isSuperCompany = plan === 'ENTERPRISE';

    console.log('🔍 [SIDEBAR-DEBUG] Current Company:', currentCompany?.name);
    console.log('🔍 [SIDEBAR-DEBUG] Raw Plan:', currentCompany?.plan);
    console.log('🔍 [SIDEBAR-DEBUG] Normalized Plan:', plan);
    console.log('🔍 [SIDEBAR-DEBUG] Active Apps Count:', activeApps?.length);
    console.log('🔍 [SIDEBAR-DEBUG] Active Apps List:', activeApps);

    const isAppActive = (slug: string) => {
        // Super Admin can see everything if we want, but for testing, let's keep it filtered
        // unless they are in a super company
        if (isSuperCompany) return true;

        // Ensure activeApps is an array and check for the slug
        return Array.isArray(activeApps) && activeApps.some(a =>
            typeof a === 'string' && a.toLowerCase() === slug.toLowerCase()
        );
    };

    console.log('🔍 [SIDEBAR] Full user object:', user);
    console.log('🔍 [SIDEBAR] Company data:', user?.company);

    return [
        // 1️⃣ الرئيسية
        {
            id: 'main',
            title: t('sidebar.mainSection'),
            icon: ChartBarIcon,
            items: [
                { to: '/dashboard', icon: ChartBarIcon, label: t('sidebar.dashboard') },
                { to: '/company-links', icon: BuildingOfficeIcon, label: t('sidebar.companyLinks') },
            ],
            // 🔒 إخفاء القسم للمسوقين (سيظهر لهم في قسم الافليت)
            hidden: user?.role === 'AFFILIATE'
        },

        // 2️⃣ فيسبوك
        {
            id: 'facebook',
            title: t('sidebar.facebookSection'),
            icon: ChatBubbleLeftRightIcon,
            items: [
                { to: '/conversations-improved', icon: ChatBubbleLeftRightIcon, label: t('sidebar.conversationsImproved') },
                { to: '/facebook-inbox', icon: ChatBubbleLeftRightIcon, label: t('sidebar.facebookInbox') },
                { to: '/unified-comments', icon: ChatBubbleLeftRightIcon, label: t('sidebar.unifiedComments') },
                { to: '/posts/ai-tracking', icon: ChartBarIcon, label: t('sidebar.productTracking') },
                { to: '/customers', icon: UsersIcon, label: t('sidebar.customers') },
                { to: '/employee-stats', icon: ChartBarIcon, label: t('sidebar.employeeStats') || 'تقارير أداء الموظفين' },
                { to: '/external-messages-stats', icon: ChartBarIcon, label: t('sidebar.externalMessagesStats') },
                { to: '/sent-messages-stats', icon: ChartBarIcon, label: t('sidebar.sentMessagesStats') },
                { to: '/settings/facebook', icon: CogIcon, label: t('sidebar.facebookSettings') },
                { to: '/settings/facebook-oauth', icon: ShieldCheckIcon, label: t('sidebar.facebookOAuth') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('crm-basic'),
        },

        // 2️⃣.5 واتساب
        {
            id: 'whatsapp',
            title: t('sidebar.whatsappSection'),
            icon: ChatBubbleLeftRightIcon,
            items: [
                { to: '/whatsapp', icon: ChatBubbleLeftRightIcon, label: t('sidebar.whatsapp') },
                { to: '/whatsapp/settings', icon: CogIcon, label: t('sidebar.whatsappSettings') },
                { to: '/whatsapp/notifications', icon: BellIcon, label: t('sidebar.whatsappNotifications') },
                { to: '/whatsapp/analytics', icon: ChartBarIcon, label: t('sidebar.whatsappAnalytics') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('whatsapp-integration'),
        },

        // 2️⃣.6 تليجرام
        {
            id: 'telegram',
            title: t('sidebar.telegramSection'),
            icon: PaperAirplaneIcon,
            items: [
                { to: '/telegram/pro', icon: PaperAirplaneIcon, label: t('sidebar.telegramPro') },
                { to: '/telegram-userbot', icon: UserCircleIcon, label: t('sidebar.telegramUserbot') },
                { to: '/telegram/auto-reply', icon: BoltIcon, label: 'الرد التلقائي' },
                { to: '/telegram/bulk-messages', icon: MegaphoneIcon, label: 'الرسائل الجماعية' },
                { to: '/telegram/scheduler', icon: ClockIcon, label: 'جدولة الرسائل' },
                { to: '/telegram/groups', icon: UserGroupIcon, label: 'المجموعات والقنوات' },
                { to: '/settings/telegram', icon: CogIcon, label: t('sidebar.telegramSettings') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('telegram-integration'),
        },

        // 3️⃣ إدارة الطلبات (قسم مستقل شامل)
        {
            id: 'orders',
            title: t('sidebar.ordersSection'),
            icon: ArchiveBoxIcon,
            items: [
                { to: '/orders', icon: ArchiveBoxIcon, label: t('sidebar.orders') },
                { to: '/pos', icon: CreditCardIcon, label: t('sidebar.pos') },
                { to: '/orders/invoices', icon: DocumentTextIcon, label: t('sidebar.orderInvoices') },
                { to: '/orders/manual', icon: PencilSquareIcon, label: t('sidebar.manualOrder') },
                { to: '/bulk-search', icon: QueueListIcon, label: t('sidebar.bulkSearch') },
                { to: '/coupons', icon: TicketIcon, label: t('sidebar.coupons') },
                { to: '/products/reviews', icon: StarIcon, label: t('sidebar.productReviews') },
                { to: '/settings/orders', icon: CogIcon, label: t('sidebar.ordersSettings') },
                { to: '/settings/turbo', icon: RocketLaunchIcon, label: t('sidebar.turboSettings') },
                { to: '/tickets', icon: TicketIcon, label: t('sidebar.turboTickets') },
                { to: '/returns', icon: CheckCircleIcon, label: t('sidebar.returnReviews') },
                { to: '/returns/settings', icon: CogIcon, label: t('sidebar.returnSettings') },
                { to: '/platform-integrations', icon: BoltIcon, label: 'الربط مع المنصات' },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('ecommerce-basic')
        },

        // 3️⃣.5 إحصائيات الطلبات
        {
            id: 'orders-analytics',
            title: 'إحصائيات الطلبات',
            icon: ChartBarIcon,
            items: [
                { to: '/analytics/orders', icon: ChartBarIcon, label: 'نظرة عامة' },
                { to: '/analytics/orders/orders', icon: ArchiveBoxIcon, label: 'تحليلات الطلبات' },
                { to: '/analytics/orders/revenue', icon: BanknotesIcon, label: 'تحليلات الإيرادات' },
                { to: '/analytics/orders/products', icon: ShoppingBagIcon, label: 'تحليلات المنتجات' },
                { to: '/analytics/orders/variations', icon: TagIcon, label: 'تحليلات المتغيرات' },
                { to: '/analytics/orders/categories', icon: TagIcon, label: 'تحليلات الأقسام' },
                { to: '/analytics/orders/coupons', icon: TicketIcon, label: 'تحليلات الكوبونات' },
                { to: '/analytics/orders/stock', icon: ClipboardDocumentListIcon, label: 'تحليلات المخزون' },
                { to: '/analytics/orders/customers', icon: UsersIcon, label: 'تحليلات العملاء' },
                { to: '/analytics/orders/payments', icon: CreditCardIcon, label: 'طرق الدفع' },
                { to: '/analytics/orders/profit', icon: CurrencyDollarIcon, label: 'تحليلات الربحية' },
                { to: '/analytics/orders/cod-performance', icon: TruckIcon, label: 'أداء COD' },
                { to: '/analytics/orders/delivery-rate', icon: TruckIcon, label: 'معدل التوصيل' },
                { to: '/analytics/orders/regions', icon: MapPinIcon, label: 'تحليلات المناطق' },
                { to: '/analytics/orders/returns', icon: ArrowUturnLeftIcon, label: 'تحليلات المرتجعات' },
                { to: '/analytics/orders/funnel', icon: FunnelIcon, label: 'مسار التحويل' },
                { to: '/analytics/orders/conversion', icon: ChartBarIcon, label: 'معدل التحويل' },
                { to: '/analytics/orders/team-performance', icon: UsersIcon, label: 'أداء الفريق' },
                { to: '/analytics/orders/abandoned-cart', icon: ShoppingCartIcon, label: 'السلة المهجورة' },
                { to: '/analytics/orders/advanced-plan', icon: DocumentCheckIcon, label: 'خطة التطوير' },
                { to: '/analytics/orders/ai-tools', icon: SparklesIcon, label: 'أدوات الذكاء الاصطناعي' },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('analytics-advanced')
        },

        // 4️⃣ المنتجات
        {
            id: 'products',
            title: t('sidebar.productsSection'),
            icon: ShoppingBagIcon,
            items: [
                { to: user?.companyId ? `/shop?companyId=${user.companyId}` : '/shop', icon: BuildingStorefrontIcon, label: t('sidebar.visitStore'), external: true },
                { to: '/products', icon: ShoppingBagIcon, label: t('sidebar.products') },
                { to: '/categories', icon: TagIcon, label: t('sidebar.categories') },
                { to: '/analytics/store', icon: ArrowTrendingUpIcon, label: t('sidebar.storeAnalytics') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('ecommerce-basic')
        },

        // 4️⃣.2 العملاء
        {
            id: 'customers',
            title: 'العملاء',
            icon: UsersIcon,
            items: [
                { to: '/customers', icon: UsersIcon, label: 'العملاء' },
                ...(user?.role === 'CUSTOMER' ? [{ to: '/wallet', icon: WalletIcon, label: 'محفظتي' }] : []),
                { to: '/hr/customer-loyalty', icon: StarIcon, label: 'ولاء العملاء' },
            ],
            // 🔒 إخفاء القسم للمسوقين
            hidden: user?.role === 'AFFILIATE'
        },

        // 4️⃣.3 المشتريات
        {
            id: 'procurement',
            title: 'المشتريات',
            icon: ClipboardDocumentListIcon,
            items: [
                { to: '/procurement/dashboard', icon: ChartBarIcon, label: 'لوحة المعلومات' },
                { to: '/procurement/suppliers', icon: UserGroupIcon, label: 'إدارة الموردين' },
                { to: '/procurement/purchase-orders', icon: DocumentTextIcon, label: 'أوامر الشراء' },
                { to: '/procurement/purchase-invoices', icon: DocumentCheckIcon, label: 'فواتير الموردين' },
                { to: '/procurement/supplier-payments', icon: BanknotesIcon, label: 'إدارة المدفوعات' },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('ecommerce-pro')
        },

        // 4️⃣.5 الافليت والدروب شيبنج
        {
            id: 'affiliate',
            title: t('sidebar.affiliateSection'),
            icon: CurrencyDollarIcon,
            items: [
                ...(user?.role === 'OWNER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN' ? [
                    { to: '/affiliates/management', icon: UserGroupIcon, label: 'إدارة المسوقين' },
                    { to: '/affiliates/quick-actions', icon: BoltIcon, label: t('sidebar.quickActions') },
                    { to: '/platform/commissions', icon: CurrencyDollarIcon, label: t('sidebar.commissions') },
                    { to: '/affiliates/settings', icon: CogIcon, label: t('sidebar.affiliateSettings') },
                ] : []),
                ...(user?.role === 'AFFILIATE' ? [
                    { to: '/affiliates/dashboard', icon: ChartBarIcon, label: 'لوحة التحكم' },
                    { to: '/orders', icon: ArchiveBoxIcon, label: 'طلباتي' },
                    { to: '/products', icon: ShoppingBagIcon, label: 'منتجاتي' },
                    { to: '/affiliates/commission', icon: BanknotesIcon, label: 'العمولة' },
                ] : [])
            ]
        },

        // 4️⃣.5 المخزون
        {
            id: 'inventory',
            title: t('sidebar.inventorySection'),
            icon: ClipboardDocumentListIcon,
            items: [
                { to: '/inventory', icon: ArchiveBoxIcon, label: t('sidebar.inventory') },
                { to: '/inventory/warehouses', icon: BuildingOfficeIcon, label: t('sidebar.warehouses') },
                { to: '/inventory/audits', icon: ClipboardDocumentListIcon, label: t('sidebar.inventoryAudits') },
                { to: '/inventory/reports', icon: ChartBarIcon, label: t('sidebar.inventoryReports') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('ecommerce-basic')
        },

        // 5️⃣ التسويق والإعلانات
        {
            id: 'marketing',
            title: t('sidebar.marketingSection'),
            icon: MegaphoneIcon,
            items: [
                { to: '/broadcast', icon: SpeakerWaveIcon, label: t('sidebar.broadcast') },
                { to: '/facebook/create-post', icon: PencilSquareIcon, label: t('sidebar.facebookPost') },
                { to: '/advertising/facebook-pixel', icon: ChartBarIcon, label: t('sidebar.facebookPixel') },
                { to: '/advertising/facebook-ads', icon: MegaphoneIcon, label: t('sidebar.facebookAds') },
                { to: '/advertising/facebook-ads/tests', icon: BeakerIcon, label: t('sidebar.abTests') },
                { to: '/advertising/facebook-ads/audiences', icon: UserGroupIcon, label: t('sidebar.audiences') },
                { to: '/advertising/facebook-ads/catalogs', icon: ShoppingBagIcon, label: t('sidebar.productCatalogs') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('crm-basic')
        },

        // 6️⃣ حسابي (للموظف)
        {
            id: 'my-account',
            title: t('sidebar.myAccountSection'),
            icon: UserCircleIcon,
            items: [
                { to: '/my-dashboard', icon: ChartBarIcon, label: t('sidebar.myDashboard') },
                { to: '/my-attendance', icon: ClockIcon, label: t('sidebar.attendance') },
                { to: '/my-leaves', icon: CalendarIcon, label: t('sidebar.myLeaves') },
                { to: '/my-payroll', icon: BanknotesIcon, label: t('sidebar.myPayroll') },
                { to: '/my-deductions', icon: BanknotesIcon, label: t('sidebar.myDeductions') },
                { to: '/profile', icon: UserCircleIcon, label: t('sidebar.myProfile') },
            ]
        },

        // 6️⃣.5 شركاتي (للمالك فقط)
        ...(user?.role === 'OWNER' ? [{
            id: 'my-companies',
            title: t('sidebar.myCompaniesSection'),
            icon: BuildingOfficeIcon,
            items: [
                { to: '/my-companies/hr', icon: ChartBarIcon, label: t('sidebar.companiesDashboard') },
                { to: '/my-companies/reports', icon: PresentationChartLineIcon, label: t('sidebar.unifiedReports') },
                { to: '/my-companies/attendance', icon: CheckCircleIcon, label: t('sidebar.attendanceReport') },
                { to: '/my-companies/users', icon: UsersIcon, label: t('sidebar.usersManagement') },
                { to: '/settings/company', icon: Cog6ToothIcon, label: t('sidebar.companySettings') },
                { to: '/subscription', icon: CreditCardIcon, label: t('sidebar.subscription') },
            ]
        }] : []),

        // 7️⃣ الموارد البشرية (للإدارة)
        ...(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user?.role || '') ? [{
            id: 'hr',
            title: t('sidebar.hrSection'),
            icon: UserGroupIcon,
            items: [
                { to: '/hr', icon: ChartBarIcon, label: t('sidebar.hrDashboard') },
                { to: '/hr/employees', icon: UsersIcon, label: t('sidebar.employees') },
                { to: '/hr/departments', icon: BuildingOfficeIcon, label: t('sidebar.departments') },
                { to: '/hr/attendance', icon: CheckCircleIcon, label: t('sidebar.attendance') },
                { to: '/hr/leaves', icon: CalendarIcon, label: t('sidebar.leaves') },
                { to: '/hr/shifts', icon: CalendarIcon, label: t('sidebar.shifts') },
                { to: '/hr/payroll', icon: BanknotesIcon, label: t('sidebar.payroll') },
                { to: '/hr/salary-updates', icon: BanknotesIcon, label: 'تعديل رواتب الموظفين' },
                { to: '/hr/salary-history', icon: ClipboardDocumentListIcon, label: 'سجل تعديلات الرواتب' },
                { to: '/hr/deductions', icon: BanknotesIcon, label: t('sidebar.deductions') },
                { to: '/hr/benefits', icon: BanknotesIcon, label: t('sidebar.benefits') },
                { to: '/hr/performance-reviews', icon: ChartBarIcon, label: t('sidebar.performanceReviews') },
                { to: '/hr/goals', icon: ChartBarIcon, label: t('sidebar.goals') },
                { to: '/hr/training', icon: CheckCircleIcon, label: t('sidebar.training') },
                { to: '/hr/feedback', icon: DocumentTextIcon, label: t('sidebar.feedback') },
                { to: '/hr/warnings', icon: DocumentTextIcon, label: t('sidebar.warnings') },
                { to: '/hr/promotions', icon: ArrowTrendingUpIcon, label: t('sidebar.promotions') },
                { to: '/hr/resignations', icon: DocumentTextIcon, label: t('sidebar.resignations') },
                { to: '/hr/advances', icon: BanknotesIcon, label: t('sidebar.advances') },
                { to: '/hr/audit-logs', icon: ClipboardDocumentListIcon, label: t('sidebar.auditLogs') },
                { to: '/hr/company-policy', icon: DocumentTextIcon, label: t('sidebar.companyPolicy') },
                { to: '/hr/reports-hub', icon: DocumentTextIcon, label: t('sidebar.hrReports') },
                { to: '/hr/assets', icon: ComputerDesktopIcon, label: t('sidebar.assets') },
                { to: '/hr/settings', icon: Cog6ToothIcon, label: t('sidebar.hrSettings') },
                { to: '/hr/rewards', icon: StarIcon, label: t('sidebar.rewards') || 'المكافآت والحوافز' },
                { to: '/hr/customer-loyalty', icon: StarIcon, label: t('sidebar.customerLoyalty') },
            ],
            // 🔒 إخفاء إذا كان غير مفعل
            hidden: !isAppActive('hr-basic')
        }] : []),

        // 7️⃣ الأعمال والمواعيد
        {
            id: 'business',
            title: t('sidebar.businessSection'),
            icon: CalendarIcon,
            items: [
                { to: '/appointments', icon: CalendarIcon, label: t('sidebar.appointments') },
                { to: '/tasks', icon: CheckCircleIcon, label: t('sidebar.tasks') },
            ]
        },

        // 8️⃣ التقارير والتحليلات
        {
            id: 'analytics',
            title: t('sidebar.analyticsSection'),
            icon: PresentationChartLineIcon,
            items: [
                { to: '/reports', icon: ChartBarIcon, label: t('sidebar.reports') },
                { to: '/analytics', icon: PresentationChartLineIcon, label: t('sidebar.advancedAnalytics') },
            ],
            // 🔒 إخفاء إذا كان غير مفعل
            hidden: !isAppActive('analytics-advanced')
        },

        // 9️⃣ الذكاء الاصطناعي
        {
            id: 'ai',
            title: t('sidebar.aiSection'),
            icon: SparklesIcon,
            items: [
                { to: '/ai-management', icon: BeakerIcon, label: t('sidebar.aiManagement') },
                { to: '/test-chat', icon: SparklesIcon, label: t('sidebar.testResponse') },
                { to: '/rag-analytics', icon: MagnifyingGlassIcon, label: t('sidebar.aiAnalytics') },
                { to: '/admin/rag', icon: RocketLaunchIcon, label: t('sidebar.ragSystem') },
                { to: '/admin/faqs', icon: QuestionMarkCircleIcon, label: t('sidebar.faqs') },
                { to: '/admin/policies', icon: DocumentCheckIcon, label: t('sidebar.policies') },
                { to: '/image-studio', icon: SparklesIcon, label: t('sidebar.imageStudio') },
            ],
            // 🔒 إخفاء إذا كان غير مفعل
            hidden: !isAppActive('ai-chat-basic')
        },

        // 🔟 الدعم الفني
        {
            id: 'support',
            title: t('sidebar.supportSection'),
            icon: TicketIcon,
            items: [
                { to: '/support', icon: ChatBubbleLeftRightIcon, label: t('sidebar.supportCenter') },
                { to: '/support/tickets', icon: TicketIcon, label: t('sidebar.myTickets') },
                { to: '/support/tickets/new', icon: DocumentTextIcon, label: t('sidebar.newTicket') },
                { to: '/support/faq', icon: QuestionMarkCircleIcon, label: t('sidebar.supportFaq') },
                ...(user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'OWNER' ? [
                    { to: '/admin/support', icon: WrenchScrewdriverIcon, label: t('sidebar.supportManagement') }
                ] : [])
            ]
        },

        // 1️⃣1️⃣ Marketplace - متجر الأدوات
        {
            id: 'marketplace',
            title: 'متجر الأدوات',
            icon: CubeIcon,
            items: [
                { to: '/marketplace', icon: CubeIcon, label: 'تصفح الأدوات' },
                { to: '/my-apps', icon: CheckCircleIcon, label: 'أدواتي المفعلة' },
                { to: '/wallet', icon: WalletIcon, label: 'المحفظة والفواتير' },
            ],
            // 🔒 إخفاء القسم للمسوقين
            hidden: user?.role === 'AFFILIATE'
        },

        // 1️⃣2️⃣ الفواتير والاشتراكات
        {
            id: 'billing',
            title: t('sidebar.billingSection'),
            icon: BanknotesIcon,
            items: [
                { to: '/invoices', icon: DocumentTextIcon, label: t('sidebar.myInvoices') },
                { to: '/payments', icon: BanknotesIcon, label: t('sidebar.myPayments') },
                { to: '/subscription', icon: CreditCardIcon, label: t('sidebar.mySubscription') },
            ]
        },

        // 1️⃣2️⃣ الإشعارات والأدوات
        {
            id: 'notifications',
            title: t('sidebar.notificationsSection'),
            icon: BellIcon,
            items: [
                { to: '/notifications', icon: BellIcon, label: t('sidebar.notifications') },
                { to: '/reminders', icon: BellAlertIcon, label: t('sidebar.reminders') },
                { to: '/notification-settings', icon: CogIcon, label: t('sidebar.notificationSettings') },
                { to: '/page-builder', icon: DocumentTextIcon, label: t('sidebar.pageBuilder') },
            ]
        },

        // 1️⃣3️⃣ سجل النشاطات
        {
            id: 'activity',
            title: t('sidebar.activitySection'),
            icon: ClipboardDocumentListIcon,
            items: [
                { to: '/my-activity', icon: ClipboardDocumentListIcon, label: t('sidebar.myActivity') },
                ...(user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'OWNER' ? [
                    { to: '/company/activity', icon: ChartBarIcon, label: t('sidebar.companyActivity') }
                ] : [])
            ]
        },

        // 1️⃣4️⃣ الإعدادات (قسم موحد)
        {
            id: 'settings',
            title: t('sidebar.settingsSection'),
            icon: Cog6ToothIcon,
            items: [
                { to: '/settings', icon: CogIcon, label: t('sidebar.settings') },
                { to: '/settings/smart-replies', icon: ChatBubbleLeftRightIcon, label: t('sidebar.smartReplies') },
                { to: '/store-settings', icon: BuildingStorefrontIcon, label: t('sidebar.storeSettings') },
                { to: '/settings/store-pages', icon: DocumentTextIcon, label: t('sidebar.storePages') },
            ]
        },

        // 1️⃣5️⃣ إدارة متقدمة (للأدمن)
        ...(user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'OWNER' ? [{
            id: 'admin',
            title: t('sidebar.advancedAdminSection'),
            icon: WrenchScrewdriverIcon,
            items: [
                { to: '/monitoring', icon: ChartBarIcon, label: t('sidebar.systemMonitoring') },
                { to: '/alert-settings', icon: ExclamationTriangleIcon, label: t('sidebar.alertSettings') },
            ]
        }] : []),

        // 1️⃣6️⃣ إدارة النظام (للسوبر أدمن)
        ...(user?.role === 'SUPER_ADMIN' ? [{
            id: 'system',
            title: t('sidebar.systemManagementSection'),
            icon: BuildingOfficeIcon,
            items: [
                { to: '/companies', icon: BuildingOfficeIcon, label: t('sidebar.companiesManagement') },
                { to: '/super-admin/db-migration', icon: WrenchScrewdriverIcon, label: 'ترحيل قواعد البيانات' },
                { to: '/super-admin/billing-overview', icon: BanknotesIcon, label: 'نظرة عامة على الفواتير' },
                { to: '/super-admin/marketplace-management', icon: CubeIcon, label: 'إدارة المتجر' },
                { to: '/super-admin/changelog', icon: ClipboardDocumentListIcon, label: 'سجل التغييرات' },
                { to: '/super-admin/dev-leaderboard', icon: ChartBarIcon, label: 'لوحة تحكم المطورين' },
            ]
        }] : []),

        // 1️⃣7️⃣ إدارة الشركة
        ...(user?.role === 'COMPANY_ADMIN' || user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN' ? [{
            id: 'company',
            title: t('sidebar.companyManagementSection'),
            icon: UserGroupIcon,
            items: [
                { to: '/users', icon: UserGroupIcon, label: t('sidebar.usersManagement') },
                { to: '/roles', icon: KeyIcon, label: t('sidebar.rolesManagement') },
            ]
        }] : []),

        // 1️⃣8️⃣ الشروط والخصوصية
        {
            id: 'legal',
            title: t('sidebar.legalSection'),
            icon: DocumentCheckIcon,
            items: [
                { to: '/terms', icon: DocumentCheckIcon, label: t('sidebar.terms') },
                { to: '/privacy', icon: ShieldExclamationIcon, label: t('sidebar.privacy') },
            ]
        },
    ];
};
