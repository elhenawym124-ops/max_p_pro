import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Providers
import AppProviders from './providers/AppProviders';

// Layout components


import Layout from './components/layout/Layout';
import AuthLayout from './components/layout/AuthLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import StorefrontLayout from './components/layout/StorefrontLayout';

import PerformanceOptimizer from './components/PerformanceOptimizer';

// Import pages directly
const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const ModernLogin = React.lazy(() => import('./pages/auth/ModernLogin'));


const Register = React.lazy(() => import('./pages/auth/Register'));
const CustomerRegister = React.lazy(() => import('./pages/auth/CustomerRegister'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));
const AcceptInvitation = React.lazy(() => import('./pages/auth/AcceptInvitation'));

// Import pages
const CustomerList = React.lazy(() => import('./pages/customers/CustomerList'));
const CustomerDetails = React.lazy(() => import('./pages/customers/CustomerDetails'));
const CustomerEdit = React.lazy(() => import('./pages/customers/CustomerEdit'));
const WalletPageBilling = React.lazy(() => import('./pages/wallet/WalletPage'));
const CommentsManagement = React.lazy(() => import('./pages/comments/CommentsManagement'));
const CommentDetails = React.lazy(() => import('./pages/comments/CommentDetails'));
const CommentSettings = React.lazy(() => import('./pages/comments/CommentSettings'));
const PostsManagement = React.lazy(() => import('./pages/comments/PostsManagement'));
const PostSettings = React.lazy(() => import('./pages/comments/PostSettings'));
const PostComments = React.lazy(() => import('./pages/comments/PostComments'));
const PostAITracking = React.lazy(() => import('./pages/posts/PostAITracking'));

const ConversationsImprovedFixed = React.lazy(() => import('./pages/conversations/ConversationsImprovedFixed'));



const MessengerChat = React.lazy(() => import('./pages/conversations/MessengerChat-final'));
const ExternalMessagesStats = React.lazy(() => import('./pages/conversations/ExternalMessagesStats'));
const SentMessagesStats = React.lazy(() => import('./pages/conversations/SentMessagesStats'));
const FacebookInbox = React.lazy(() => import('./pages/facebook-inbox/FacebookInbox'));
const FacebookPostCreator = React.lazy(() => import('./pages/facebook-inbox/FacebookPostCreator'));
const AITestChat = React.lazy(() => import('./pages/testChat/AITestChat'));
const AIManagement = React.lazy(() => import('./pages/ai/AIManagement'));
const Products = React.lazy(() => import('./pages/products/Products'));
const ProductNewFinal = React.lazy(() => import('./pages/products/ProductNewFinal'));
const AffiliateSystemSettings = React.lazy(() => import('./pages/affiliates/AffiliateSystemSettings'));
const AffiliatesManagement = React.lazy(() => import('./pages/affiliates/AffiliatesManagement'));
const AffiliateQuickActions = React.lazy(() => import('./pages/affiliates/AffiliateQuickActions'));
const AffiliateDashboard = React.lazy(() => import('./pages/affiliates/AffiliateDashboard'));
const AffiliateCommission = React.lazy(() => import('./pages/affiliates/AffiliateCommission'));
const CommissionsManagement = React.lazy(() => import('./pages/platform/CommissionsManagement'));
const PublicAffiliateRegister = React.lazy(() => import('./pages/public/PublicAffiliateRegister'));
const PublicMerchantRegister = React.lazy(() => import('./pages/public/PublicMerchantRegister'));
const PublicCompanyLinks = React.lazy(() => import('./pages/PublicCompanyLinks'));
const ProductView = React.lazy(() => import('./pages/products/ProductView'));
const ProductReviewsSimple = React.lazy(() => import('./pages/products/ProductReviewsSimple'));
const EasyOrdersImport = React.lazy(() => import('./pages/products/EasyOrdersImport'));
const WooCommerceImport = React.lazy(() => import('./pages/products/WooCommerceImport'));
const RAGAnalyticsDashboard = React.lazy(() => import('./pages/rag-analytics/RAGAnalyticsDashboard'));
const StoreAnalyticsDashboard = React.lazy(() => import('./pages/Analytics/StoreAnalyticsDashboard'));


const Categories = React.lazy(() => import('./pages/categories/Categories'));
const Reports = React.lazy(() => import('./pages/reports/Reports'));
// import ShippingReport from './pages/reports/ShippingReport';
const Settings = React.lazy(() => import('./pages/settings/Settings'));
const OrderSettings = React.lazy(() => import('./pages/settings/OrderSettings'));
const CompanySettings = React.lazy(() => import('./pages/settings/CompanySettings'));
const FacebookSettings = React.lazy(() => import('./pages/settings/FacebookSettings'));
const PageEngagementStats = React.lazy(() => import('./pages/PageEngagementStats'));
const TelegramSettings = React.lazy(() => import('./pages/settings/TelegramSettings'));
const TelegramConversationsPro = React.lazy(() => import('./pages/conversations/TelegramConversationsPro'));
const TelegramUserbot = React.lazy(() => import('./pages/telegram/TelegramUserbot')); // System 2
const TelegramAutoReply = React.lazy(() => import('./pages/telegram/TelegramAutoReply'));
const TelegramBulkMessages = React.lazy(() => import('./pages/telegram/TelegramBulkMessages'));
const TelegramScheduler = React.lazy(() => import('./pages/telegram/TelegramScheduler'));
const TelegramGroups = React.lazy(() => import('./pages/telegram/TelegramGroups'));
const StoreSettings = React.lazy(() => import('./pages/settings/StoreSettings'));
const StorePages = React.lazy(() => import('./pages/settings/StorePages'));
const StorefrontFeaturesSettings = React.lazy(() => import('./pages/settings/StorefrontFeaturesSettings'));
const DeliveryOptions = React.lazy(() => import('./pages/settings/DeliveryOptions'));
const PromotionSettings = React.lazy(() => import('./pages/settings/PromotionSettings'));
const RecommendationSettings = React.lazy(() => import('./pages/settings/RecommendationSettings'));
const HomepageSettings = React.lazy(() => import('./pages/settings/HomepageSettings'));
const HomepageEditor = React.lazy(() => import('./pages/settings/HomepageEditor'));
const HomepagePreview = React.lazy(() => import('./pages/settings/HomepagePreview'));
const ProductImageSettings = React.lazy(() => import('./pages/settings/ProductImageSettings'));
const TurboSettings = React.lazy(() => import('./pages/settings/TurboSettings'));
const TurboTicketDetails = React.lazy(() => import('./pages/settings/TicketDetails'));
const TurboTickets = React.lazy(() => import('./pages/tickets/TurboTickets'));
const SmartRepliesSettings = React.lazy(() => import('./pages/settings/SmartRepliesSettings'));

// Procurement/Purchasing
const Suppliers = React.lazy(() => import('./components/procurement/Suppliers'));
const PurchaseOrders = React.lazy(() => import('./components/procurement/PurchaseOrders'));
const PurchaseOrderForm = React.lazy(() => import('./components/procurement/PurchaseOrderForm'));
const PurchaseInvoices = React.lazy(() => import('./components/procurement/PurchaseInvoices'));
const SupplierPayments = React.lazy(() => import('./components/procurement/SupplierPayments'));
const ProcurementDashboard = React.lazy(() => import('./components/procurement/ProcurementDashboard'));

// Advertising
const FacebookPixelSettings = React.lazy(() => import('./pages/advertising/FacebookPixelSettings'));
const FacebookAdsDashboard = React.lazy(() => import('./pages/advertising/FacebookAdsDashboard'));
const CreateCampaign = React.lazy(() => import('./pages/advertising/CreateCampaign'));
const CreateAd = React.lazy(() => import('./pages/advertising/CreateAd'));
const CampaignDetails = React.lazy(() => import('./pages/advertising/CampaignDetails'));
const AudiencesManagement = React.lazy(() => import('./pages/advertising/AudiencesManagement'));
const CreateCustomAudience = React.lazy(() => import('./pages/advertising/CreateCustomAudience'));
const CreateLookalikeAudience = React.lazy(() => import('./pages/advertising/CreateLookalikeAudience'));
const CustomAudienceDetails = React.lazy(() => import('./pages/advertising/CustomAudienceDetails'));
const CreateAdSet = React.lazy(() => import('./pages/advertising/CreateAdSet'));
const CatalogsManagement = React.lazy(() => import('./pages/advertising/CatalogsManagement'));
const CatalogDetails = React.lazy(() => import('./pages/advertising/CatalogDetails'));
const CreateDynamicAd = React.lazy(() => import('./pages/advertising/CreateDynamicAd'));
const ABTestsManagement = React.lazy(() => import('./pages/advertising/ABTestsManagement'));
const CreateABTest = React.lazy(() => import('./pages/advertising/CreateABTest'));
const ABTestDetails = React.lazy(() => import('./pages/advertising/ABTestDetails'));
const CreateAdWizard = React.lazy(() => import('./pages/advertising/CreateAdWizard'));
const AutomationRules = React.lazy(() => import('./pages/advertising/AutomationRules'));
const AsyncReports = React.lazy(() => import('./pages/advertising/AsyncReports'));
const LeadFormsManagement = React.lazy(() => import('./pages/advertising/LeadFormsManagement'));
const DynamicCreativeOptimization = React.lazy(() => import('./pages/advertising/DynamicCreativeOptimization'));
const AdvantagePlusShopping = React.lazy(() => import('./pages/advertising/AdvantagePlusShopping'));
const ConversionApiDashboard = React.lazy(() => import('./pages/advertising/ConversionApiDashboard'));
const CreativeFormats = React.lazy(() => import('./pages/advertising/CreativeFormats'));
const AdPreview = React.lazy(() => import('./pages/advertising/AdPreview'));
const SavedAudiences = React.lazy(() => import('./pages/advertising/SavedAudiences'));
const AttributionSettings = React.lazy(() => import('./pages/advertising/AttributionSettings'));
const Profile = React.lazy(() => import('./pages/profile/Profile'));


const Orders = React.lazy(() => import('./pages/orders/Orders'));
const OrderInvoices = React.lazy(() => import('./pages/admin/OrderInvoices'));
const OrderInvoice = React.lazy(() => import('./components/orders/OrderInvoiceCompact'));
const PrintMultipleInvoices = React.lazy(() => import('./pages/orders/PrintMultipleInvoices'));
const OrderDetails = React.lazy(() => import('./pages/orders/OrderDetails'));
const OrderStats = React.lazy(() => import('./pages/orders/OrderStats'));
const WooCommerceSync = React.lazy(() => import('./pages/woocommerce/WooCommerceSync'));

// Orders Analytics Pages - Basic
const OrdersOverviewDashboard = React.lazy(() => import('./pages/Analytics/orders/OverviewDashboard'));
const OrdersAnalyticsPage = React.lazy(() => import('./pages/Analytics/orders/OrdersAnalytics'));
const RevenueAnalytics = React.lazy(() => import('./pages/Analytics/orders/RevenueAnalytics'));
const ProductsAnalyticsPage = React.lazy(() => import('./pages/Analytics/orders/ProductsAnalytics'));
const VariationsAnalytics = React.lazy(() => import('./pages/Analytics/orders/VariationsAnalytics'));
const CategoriesAnalytics = React.lazy(() => import('./pages/Analytics/orders/CategoriesAnalytics'));
const CouponsAnalytics = React.lazy(() => import('./pages/Analytics/orders/CouponsAnalytics'));
const TaxesAnalytics = React.lazy(() => import('./pages/Analytics/orders/TaxesAnalytics'));
const DownloadsAnalytics = React.lazy(() => import('./pages/Analytics/orders/DownloadsAnalytics'));
const StockAnalyticsPage = React.lazy(() => import('./pages/Analytics/orders/StockAnalytics'));
const CustomerAnalytics = React.lazy(() => import('./pages/Analytics/orders/CustomerAnalytics'));
const PaymentMethodAnalytics = React.lazy(() => import('./pages/Analytics/orders/PaymentMethodAnalytics'));

// Orders Analytics Pages - Advanced
const ProfitAnalytics = React.lazy(() => import('./pages/Analytics/orders/ProfitAnalytics'));
const CODPerformanceAnalytics = React.lazy(() => import('./pages/Analytics/orders/CODPerformanceAnalytics'));
const DeliveryRateAnalytics = React.lazy(() => import('./pages/Analytics/orders/DeliveryRateAnalytics'));
const RegionAnalytics = React.lazy(() => import('./pages/Analytics/orders/RegionAnalytics'));
const ReturnsAnalytics = React.lazy(() => import('./pages/Analytics/orders/ReturnsAnalytics'));
const FunnelAnalytics = React.lazy(() => import('./pages/Analytics/orders/FunnelAnalytics'));
const ConversionRateAnalytics = React.lazy(() => import('./pages/Analytics/orders/ConversionRateAnalytics'));
const TeamPerformanceAnalytics = React.lazy(() => import('./pages/Analytics/orders/TeamPerformanceAnalytics'));
const AbandonedCartAnalytics = React.lazy(() => import('./pages/Analytics/orders/AbandonedCartAnalytics'));

// Plans & Design
const AdvancedAnalyticsPlan = React.lazy(() => import('./pages/Analytics/orders/AdvancedAnalyticsPlan'));
const AIToolsDesign = React.lazy(() => import('./pages/Analytics/orders/AIToolsDesign'));
const FacebookOAuth = React.lazy(() => import('./pages/settings/FacebookOAuth'));
const Inventory = React.lazy(() => import('./pages/inventory/Inventory'));
const InventoryAudits = React.lazy(() => import('./pages/inventory/InventoryAudits'));
const InventoryReports = React.lazy(() => import('./pages/inventory/InventoryReports'));
const WarehouseManagement = React.lazy(() => import('./pages/inventory/WarehouseManagement'));
const Coupons = React.lazy(() => import('./pages/coupons/Coupons'));
const Appointments = React.lazy(() => import('./pages/appointments/Appointments'));

const Tasks = React.lazy(() => import('./pages/tasks/Tasks'));
const TasksDashboard = React.lazy(() => import('./pages/tasks/Dashboard'));
const KanbanBoard = React.lazy(() => import('./pages/tasks/KanbanBoard'));
const TaskDetails = React.lazy(() => import('./pages/tasks/TaskDetails'));
const TaskNotifications = React.lazy(() => import('./pages/tasks/TaskNotifications'));
const CalendarView = React.lazy(() => import('./pages/tasks/CalendarView'));
const TimeReports = React.lazy(() => import('./pages/tasks/TimeReports'));
const TaskTemplates = React.lazy(() => import('./pages/tasks/TaskTemplates'));
const AdvancedReports = React.lazy(() => import('./pages/reports/AdvancedReports'));
const PosPage = React.lazy(() => import('./pages/pos/PosPage'));
const PlatformIntegrations = React.lazy(() => import('./pages/platform-integrations/PlatformIntegrations'));

// Storefront (Public Pages)
const Homepage = React.lazy(() => import('./pages/storefront/Homepage'));
const ThemeHomepage = React.lazy(() => import('./pages/storefront/ThemeHomepage')); // New wrapper
const HomepageTest = React.lazy(() => import('./pages/storefront/HomepageTest'));
const HomepageSimple = React.lazy(() => import('./pages/storefront/HomepageSimple'));
const WoodmartReplica = React.lazy(() => import('./pages/storefront/WoodmartReplica'));
const TestPublic = React.lazy(() => import('./pages/TestPublic'));
const TestMinimal = React.lazy(() => import('./pages/TestMinimal'));
const Shop = React.lazy(() => import('./pages/storefront/Shop'));

const ThemeProductDetails = React.lazy(() => import('./pages/storefront/ThemeProductDetails')); // New wrapper
const Cart = React.lazy(() => import('./pages/storefront/Cart'));
const Checkout = React.lazy(() => import('./pages/storefront/Checkout'));
const OrderConfirmation = React.lazy(() => import('./pages/storefront/OrderConfirmation'));
const TrackOrder = React.lazy(() => import('./pages/storefront/TrackOrder'));
const WishlistPage = React.lazy(() => import('./pages/storefront/WishlistPage'));
const StorePage = React.lazy(() => import('./pages/storefront/StorePage'));
const CustomerWhatsApp = React.lazy(() => import('./pages/storefront/CustomerWhatsApp'));


// Support System
const SupportCenter = React.lazy(() => import('./pages/support/SupportCenter'));
const CreateTicket = React.lazy(() => import('./pages/support/CreateTicket'));
const MyTickets = React.lazy(() => import('./pages/support/MyTickets'));
const SupportTicketDetails = React.lazy(() => import('./pages/support/TicketDetails'));
const FAQ = React.lazy(() => import('./pages/support/FAQ'));
const SupportAdmin = React.lazy(() => import('./pages/admin/SupportAdmin'));
const ManualOrderPage = React.lazy(() => import('./pages/admin/ManualOrder/ManualOrderPage'));

// Activity Log System
const MyActivity = React.lazy(() => import('./pages/MyActivity'));
const CompanyActivity = React.lazy(() => import('./pages/CompanyActivity'));

const BroadcastDashboard = React.lazy(() => import('./pages/broadcast').then(module => ({ default: module.BroadcastDashboard })));
const Reminders = React.lazy(() => import('./pages/Reminders'));
const NotificationSettings = React.lazy(() => import('./pages/NotificationSettings'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const MonitoringDashboard = React.lazy(() => import('./pages/MonitoringDashboard'));
const AlertSettings = React.lazy(() => import('./pages/AlertSettings'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));

const CompaniesManagement = React.lazy(() => import('./pages/CompaniesManagement'));
const UsersManagement = React.lazy(() => import('./pages/UsersManagement'));
const EmployeeStatsReport = React.lazy(() => import('./pages/EmployeeStatsReport'));
const RolesManagement = React.lazy(() => import('./pages/RolesManagement'));
const CompanyDashboard = React.lazy(() => import('./pages/CompanyDashboard'));
const CompanyLinks = React.lazy(() => import('./pages/CompanyLinks'));
// PublicCompanyLinks already declared above

// Super Admin
const SuperAdminCompanies = React.lazy(() => import('./pages/SuperAdminCompanies'));

const SuperAdminReports = React.lazy(() => import('./pages/SuperAdminReports'));
const SuperAdminSubscriptions = React.lazy(() => import('./pages/SuperAdminSubscriptions'));
const SuperAdminInvoices = React.lazy(() => import('./pages/SuperAdminInvoices'));
const SuperAdminPayments = React.lazy(() => import('./pages/SuperAdminPayments'));
const SuperAdminSystemManagement = React.lazy(() => import('./pages/SuperAdminSystemManagement'));
const SuperAdminPromptLibrary = React.lazy(() => import('./pages/SuperAdminPromptLibrary'));
const SuperAdminThemes = React.lazy(() => import('./pages/SuperAdminThemes'));
const SuperAdminStaffCompanyAccess = React.lazy(() => import('./pages/super-admin/StaffCompanyAccess'));
const SuperAdminHomepageTemplates = React.lazy(() => import('./pages/SuperAdminHomepageTemplates'));
const Changelog = React.lazy(() => import('./pages/super-admin/Changelog'));


const SuperAdminAiLogs = React.lazy(() => import('./pages/SuperAdminAiLogs'));
const SuperAdminImageStats = React.lazy(() => import('./pages/SuperAdminImageStats'));
const SuperAdminServerUsage = React.lazy(() => import('./pages/super-admin/SuperAdminServerUsage'));
const SuperAdminAiChat = React.lazy(() => import('./pages/SuperAdminAiChat')); // AI Chat Page
const SalaryUpdates = React.lazy(() => import('./pages/hr/SalaryUpdates'));
const SuperAdminAIProviders = React.lazy(() => import('./pages/SuperAdminAIProviders')); // New Page
const SuperAdminFacebookOAuth = React.lazy(() => import('./pages/SuperAdminFacebookOAuth'));

const SuperAdminImageStudio = React.lazy(() => import('./pages/SuperAdminImageStudio')); // Image Studio Settings
const ImageStudio = React.lazy(() => import('./pages/ImageStudio')); // Image Studio (Company)
const SuperAdminUsersManagement = React.lazy(() => import('./pages/SuperAdminUsersManagement')); // Super Admin Users Management

// Super Admin Platform Management
const PlatformSubscriptions = React.lazy(() => import('./pages/super-admin/PlatformSubscriptions'));
const BillingOverview = React.lazy(() => import('./pages/super-admin/BillingOverview'));
const SubscriptionCenter = React.lazy(() => import('./pages/super-admin/SubscriptionCenter'));

// Dev Tasks System
const SuperAdminDashboard = React.lazy(() => import('./pages/SuperAdminDashboard'));
const DevDashboardUnified = React.lazy(() => import('./pages/super-admin/DevDashboardUnified'));
const DevTasksList = React.lazy(() => import('./pages/super-admin/DevTasksList'));
const DevKanbanBoard = React.lazy(() => import('./pages/super-admin/DevKanbanBoard'));
const DevTaskForm = React.lazy(() => import('./pages/super-admin/DevTaskForm'));
const DevTaskDetails = React.lazy(() => import('./pages/super-admin/DevTaskDetails'));
const DevProjects = React.lazy(() => import('./pages/super-admin/DevProjects'));
const DevReleases = React.lazy(() => import('./pages/super-admin/DevReleases'));
const DevTeam = React.lazy(() => import('./pages/super-admin/DevTeam'));
const DatabaseMigration = React.lazy(() => import('./pages/super-admin/DatabaseMigration'));
const DevLeaderboard = React.lazy(() => import('./pages/super-admin/DevLeaderboard'));
const DevTaskSettings = React.lazy(() => import('./pages/super-admin/DevTaskSettings'));
const ActiveTimers = React.lazy(() => import('./pages/super-admin/ActiveTimers'));
const ProjectMap = React.lazy(() => import('./pages/super-admin/ProjectMap'));
const TimeTrackingDashboard = React.lazy(() => import('./pages/super-admin/TimeTrackingDashboard'));
const SystemMonitoring = React.lazy(() => import('./pages/super-admin/SystemMonitoring'));
const EscalationHistory = React.lazy(() => import('./pages/super-admin/EscalationHistory'));

const PaymentPage = React.lazy(() => import('./pages/PaymentPage'));
const WalletManagement = React.lazy(() => import('./pages/WalletManagement'));
const CustomerInvoices = React.lazy(() => import('./pages/CustomerInvoices'));
const CustomerPayments = React.lazy(() => import('./pages/CustomerPayments'));
const CustomerSubscription = React.lazy(() => import('./pages/CustomerSubscription'));
const SubscriptionRenewalPayment = React.lazy(() => import('./pages/SubscriptionRenewalPayment'));
const PrivacyPolicy = React.lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/legal/TermsOfService'));
const UnifiedCommentsManagement = React.lazy(() => import('./pages/comments/UnifiedCommentsManagement'));
const UnifiedCommentsSplit = React.lazy(() => import('./pages/comments/UnifiedCommentsSplit'));
const ReturnManagementPage = React.lazy(() => import('./pages/returns/ReturnManagementPage'));
const ReturnSettingsPage = React.lazy(() => import('./pages/returns/ReturnSettingsPage'));
const BulkSearchPage = React.lazy(() => import('./pages/bulk-search/BulkSearchPage'));

// Marketplace System
const Marketplace = React.lazy(() => import('./pages/marketplace/Marketplace'));
const AppDetails = React.lazy(() => import('./pages/marketplace/AppDetails'));
const MyApps = React.lazy(() => import('./pages/marketplace/MyApps'));
const WalletPageMarketplace = React.lazy(() => import('./pages/marketplace/Wallet'));
const Bundles = React.lazy(() => import('./pages/marketplace/Bundles'));
const BundleDetails = React.lazy(() => import('./pages/marketplace/BundleDetails'));

// Platform Subscription
const PlatformPlans = React.lazy(() => import('./pages/subscription/PlatformPlans'));
const MySubscription = React.lazy(() => import('./pages/subscription/MySubscription'));
const UsageStats = React.lazy(() => import('./pages/subscription/UsageStats'));

// RAG Admin Components
const RAGManagement = React.lazy(() => import('./components/Admin/RAGManagement'));
const FAQManagement = React.lazy(() => import('./components/Admin/FAQManagement'));
const PolicyManagement = React.lazy(() => import('./components/Admin/PolicyManagement'));

// Page Builder
const PageBuilder = React.lazy(() => import('./pages/PageBuilder'));
const LandingPageList = React.lazy(() => import('./pages/LandingPageList'));
const EmployeesLanding = React.lazy(() => import('./pages/landing/EmployeesLanding'));

// WhatsApp
const WhatsAppSettings = React.lazy(() => import('./pages/whatsapp').then(m => ({ default: m.WhatsAppSettings })));
const WhatsAppChat = React.lazy(() => import('./pages/whatsapp').then(m => ({ default: m.WhatsAppChat })));
const WhatsAppNotifications = React.lazy(() => import('./pages/whatsapp/WhatsAppNotifications'));
const WhatsAppAnalytics = React.lazy(() => import('./pages/whatsapp/WhatsAppAnalytics'));

// HR Module
const HRDashboard = React.lazy(() => import('./pages/hr').then(m => ({ default: m.HRDashboard })));
const MyCompaniesDashboard = React.lazy(() => import('./pages/hr/MyCompaniesDashboard'));
const OwnerReports = React.lazy(() => import('./pages/owner/OwnerReports'));
const OwnerAttendanceReport = React.lazy(() => import('./pages/owner/OwnerAttendanceReport'));
const OwnerUsersManagement = React.lazy(() => import('./pages/owner/OwnerUsersManagement'));
const CompanyOrdersDetails = React.lazy(() => import('./pages/owner/CompanyOrdersDetails'));
const Employees = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Employees })));
const EmployeeDetails = React.lazy(() => import('./pages/hr').then(m => ({ default: m.EmployeeDetails })));
const EmployeeEdit = React.lazy(() => import('./pages/hr').then(m => ({ default: m.EmployeeEdit })));
const Departments = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Departments })));
const PositionsManagement = React.lazy(() => import('./pages/hr').then(m => ({ default: m.PositionsManagement })));
const Attendance = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Attendance })));
const ManualAttendanceEdit = React.lazy(() => import('./pages/hr').then(m => ({ default: m.ManualAttendanceEdit })));
const Leaves = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Leaves })));
const Payroll = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Payroll })));
const Deductions = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Deductions })));
const HRSettings = React.lazy(() => import('./pages/hr/HRSettings'));
const HRReports = React.lazy(() => import('./pages/hr').then(m => ({ default: m.HRReports })));
const HRReportsHub = React.lazy(() => import('./pages/hr').then(m => ({ default: m.HRReportsHub })));
const Documents = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Documents })));
const MyDeductions = React.lazy(() => import('./pages/employee').then(m => ({ default: m.MyDeductions })));
const SalaryHistory = React.lazy(() => import('./pages/hr').then(m => ({ default: m.SalaryHistory })));
const PerformanceReviews = React.lazy(() => import('./pages/hr').then(m => ({ default: m.PerformanceReviews })));
const Training = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Training })));
const CreateTraining = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CreateTraining })));
const Warnings = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Warnings })));
const EmployeesPromotion = React.lazy(() => import('./pages/hr/EmployeesPromotion'));
const CreatePromotion = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CreatePromotion })));
const WarningDetails = React.lazy(() => import('./pages/hr').then(m => ({ default: m.WarningDetails })));
const EditWarning = React.lazy(() => import('./pages/hr').then(m => ({ default: m.EditWarning })));
const CreateWarning = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CreateWarning })));
const Shifts = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Shifts })));
const ShiftDetails = React.lazy(() => import('./pages/hr/ShiftDetails'));
const Benefits = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Benefits })));
const Goals = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Goals })));
const CreateGoal = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CreateGoal })));
const CreateFeedback = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CreateFeedback })));
const Feedback = React.lazy(() => import('./pages/hr/Feedback'));
const Resignations = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Resignations })));
const CreateResignation = React.lazy(() => import('./pages/hr/CreateResignation'));
const CreatePerformanceReview = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CreatePerformanceReview })));
const Advances = React.lazy(() => import('./pages/hr').then(m => ({ default: m.Advances })));
const CreateAdvance = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CreateAdvance })));
const AuditLogs = React.lazy(() => import('./pages/hr').then(m => ({ default: m.AuditLogs })));
const CompanyPolicy = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CompanyPolicy })));
const ClearanceChecklist = React.lazy(() => import('./pages/hr').then(m => ({ default: m.ClearanceChecklist })));
const AssetsDashboard = React.lazy(() => import('./pages/hr').then(m => ({ default: m.AssetsDashboard })));
const RewardsList = React.lazy(() => import('./pages/hr').then(m => ({ default: m.RewardsList })));
const RewardDetails = React.lazy(() => import('./pages/hr').then(m => ({ default: m.RewardDetails })));
const CreateEditReward = React.lazy(() => import('./pages/hr').then(m => ({ default: m.CreateEditReward })));
const CustomerLoyalty = React.lazy(() => import('./pages/hr/CustomerLoyalty'));

// Employee Self-Service
const MyAttendance = React.lazy(() => import('./pages/employee/MyAttendance'));
const MyDashboard = React.lazy(() => import('./pages/employee/MyDashboard'));
const MyAdvances = React.lazy(() => import('./pages/hr/MyAdvances'));


import { useAuth } from './hooks/useAuthSimple';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">jT...</p>
    </div>
  </div>
);

// Create a separate component that uses auth
const AppContent = () => {
  // Use real authentication state
  const { isAuthenticated, isLoading } = useAuth();
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

  // Debug: Log current route and auth status
  const currentPath = window.location.pathname;
  if (isDev) {
    console.debug(' [App] Current path:', currentPath);
    console.debug(' [App] Is authenticated:', isAuthenticated);
    console.debug(' [App] Is loading:', isLoading);
  }

  // Check if current path is a public route
  const isPublicRoute =
    currentPath.startsWith('/test-public') ||
    currentPath.startsWith('/home') ||
    currentPath.startsWith('/shop') ||
    currentPath.startsWith('/company-links/') ||
    currentPath.startsWith('/auth/') ||
    currentPath.startsWith('/register/') ||
    currentPath.startsWith('/payment/');

  // Only show loading for non-public routes
  if (isLoading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">...</p>
        </div>
      </div>
    );
  }

  // Check if path is /products/reviews or /my-activity and log debug info
  if (currentPath === '/products/reviews' || currentPath === '/my-activity') {
    if (isDev) {
      console.debug(` [App] Accessing ${currentPath} `);
      console.debug(' [App] Is authenticated:', isAuthenticated);
      console.debug(' [App] Is loading:', isLoading);
      console.debug(' [App] Token exists:', !!localStorage.getItem('accessToken'));
      console.debug(' [App] Will render:', isAuthenticated ? 'Component' : 'Redirect to login');
    }

    // If not authenticated but token exists, log more details
    if (!isAuthenticated && localStorage.getItem('accessToken')) {
      if (isDev) {
        console.warn(' [App] User has token but isAuthenticated is false! This might be a timing issue.');
        console.warn(' [App] isLoading:', isLoading);
      }
    }
  }

  return (
    <PerformanceOptimizer>
      <div className="App w-full min-w-full">
        {/* <EnvironmentIndicator position="bottom-right" /> */}
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth/login" element={<AuthLayout><ModernLogin /></AuthLayout>} />
            <Route path="/auth/register" element={<AuthLayout><Register /></AuthLayout>} />
            <Route path="/auth/customer-register" element={<AuthLayout><CustomerRegister /></AuthLayout>} />
            <Route path="/auth/customer-register/:companyId" element={<AuthLayout><CustomerRegister /></AuthLayout>} />
            <Route path="/auth/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
            <Route path="/auth/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
            <Route path="/auth/accept-invitation" element={<AuthLayout><AcceptInvitation /></AuthLayout>} />

            <Route path="/company-links/:token" element={<PublicCompanyLinks />} />

            {/* Public Registration Routes - No Company Required */}
            <Route path="/register/affiliate" element={<AuthLayout><PublicAffiliateRegister /></AuthLayout>} />
            <Route path="/register/merchant" element={<AuthLayout><PublicMerchantRegister /></AuthLayout>} />

            {/* Public Affiliate Registration with Slug - For invitation links */}
            <Route path="/affiliate-register/:slug" element={<AuthLayout><PublicAffiliateRegister /></AuthLayout>} />

            {/* Legal Pages - Public Access */}
            {/* <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} /> */}

            {/* Public Storefront Routes - No Authentication Required */}
            <Route path="/test-minimal" element={<TestMinimal />} />
            <Route path="/test-public" element={<TestPublic />} />
            <Route path="/home-test" element={<HomepageTest />} />
            <Route path="/home-simple" element={<HomepageSimple />} />
            <Route path="/home-no-layout" element={<Homepage />} />
            <Route path="/home" element={<StorefrontLayout><ThemeHomepage /></StorefrontLayout>} />
            <Route path="/shop" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
            <Route path="/shop/products/:id" element={<StorefrontLayout><ThemeProductDetails /></StorefrontLayout>} />
            <Route path="/shop/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />
            <Route path="/shop/wishlist" element={<StorefrontLayout><WishlistPage /></StorefrontLayout>} />
            <Route path="/shop/checkout" element={<StorefrontLayout><Checkout /></StorefrontLayout>} />
            <Route path="/shop/order-confirmation/:orderNumber" element={<StorefrontLayout><OrderConfirmation /></StorefrontLayout>} />
            <Route path="/shop/track-order" element={<StorefrontLayout><TrackOrder /></StorefrontLayout>} />
            <Route path="/shop/page/:slug" element={<StorefrontLayout><StorePage /></StorefrontLayout>} />
            <Route path="/account/wallet" element={<StorefrontLayout><WalletPageBilling /></StorefrontLayout>} />
            <Route path="/account/whatsapp" element={<StorefrontLayout><CustomerWhatsApp /></StorefrontLayout>} />
            <Route path="/woodmart-replica" element={<WoodmartReplica />} />
            <Route path="/lp/employees" element={<EmployeesLanding />} />

            {/* Root path - redirect based on auth status */}
            <Route path="/" element={
              isLoading ? (
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">...</p>
                  </div>
                </div>
              ) : isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/auth/login" replace />
              )
            } />

            {/* Super Admin Routes */}
            <Route path="/super-admin" element={<Navigate to="/super-admin/dev-dashboard" replace />} />
            <Route path="/super-admin/login" element={<AuthLayout><ModernLogin /></AuthLayout>} />
            <Route path="/super-admin/dashboard" element={<SuperAdminLayout><SuperAdminDashboard /></SuperAdminLayout>} />
            <Route path="/super-admin/companies" element={<SuperAdminLayout><SuperAdminCompanies /></SuperAdminLayout>} />

            <Route path="/super-admin/users" element={<SuperAdminLayout><SuperAdminUsersManagement /></SuperAdminLayout>} />
            <Route path="/super-admin/staff-access" element={<SuperAdminLayout><SuperAdminStaffCompanyAccess /></SuperAdminLayout>} />
            <Route path="/super-admin/reports" element={<SuperAdminLayout><SuperAdminReports /></SuperAdminLayout>} />
            <Route path="/super-admin/plans" element={<SuperAdminLayout><SubscriptionCenter /></SuperAdminLayout>} />
            <Route path="/super-admin/subscriptions" element={<SuperAdminLayout><SuperAdminSubscriptions /></SuperAdminLayout>} />
            <Route path="/super-admin/invoices" element={<SuperAdminLayout><SuperAdminInvoices /></SuperAdminLayout>} />
            <Route path="/super-admin/payments" element={<SuperAdminLayout><SuperAdminPayments /></SuperAdminLayout>} />
            <Route path="/super-admin/system-management" element={<SuperAdminLayout><SuperAdminSystemManagement /></SuperAdminLayout>} />
            <Route path="/super-admin/themes" element={<SuperAdminLayout><SuperAdminThemes /></SuperAdminLayout>} />
            <Route path="/super-admin/homepage-templates" element={<SuperAdminLayout><SuperAdminHomepageTemplates /></SuperAdminLayout>} />
            <Route path="/super-admin/prompt-library" element={<SuperAdminLayout><SuperAdminPromptLibrary /></SuperAdminLayout>} />

            <Route path="/super-admin/ai-providers" element={<SuperAdminLayout><SuperAdminAIProviders /></SuperAdminLayout>} /> {/* New Route */}
            <Route path="/super-admin/ai-chat" element={<SuperAdminLayout><SuperAdminAiChat /></SuperAdminLayout>} />

            <Route path="/super-admin/ai-logs" element={<SuperAdminLayout><SuperAdminAiLogs /></SuperAdminLayout>} />
            <Route path="/super-admin/image-stats" element={<SuperAdminLayout><SuperAdminImageStats /></SuperAdminLayout>} />
            <Route path="/super-admin/server-usage" element={<SuperAdminLayout><SuperAdminServerUsage /></SuperAdminLayout>} />
            <Route path="/super-admin/facebook-oauth" element={<SuperAdminLayout><SuperAdminFacebookOAuth /></SuperAdminLayout>} />

            <Route path="/super-admin/image-studio" element={<SuperAdminLayout><SuperAdminImageStudio /></SuperAdminLayout>} /> {/* Image Studio */}
            <Route path="/super-admin/wallet-management" element={<SuperAdminLayout><WalletManagement /></SuperAdminLayout>} />

            {/* Dev Tasks System Routes */}
            <Route path="/super-admin/dev-dashboard" element={<SuperAdminLayout><DevDashboardUnified /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-tasks" element={<SuperAdminLayout><DevTasksList /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-tasks/new" element={<SuperAdminLayout><DevTaskForm /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-tasks/:id" element={<SuperAdminLayout><DevTaskDetails /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-tasks/:id/edit" element={<SuperAdminLayout><DevTaskForm /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-kanban" element={<SuperAdminLayout><DevKanbanBoard /></SuperAdminLayout>} />
            <Route path="/super-admin/active-timers" element={<SuperAdminLayout><ActiveTimers /></SuperAdminLayout>} />
            <Route path="/super-admin/time-tracking" element={<SuperAdminLayout><TimeTrackingDashboard /></SuperAdminLayout>} />
            <Route path="/super-admin/system-monitoring" element={<SuperAdminLayout><SystemMonitoring /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-projects" element={<SuperAdminLayout><DevProjects /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-releases" element={<SuperAdminLayout><DevReleases /></SuperAdminLayout>} />
            <Route path="/super-admin/dev/team" element={<SuperAdminLayout><DevTeam /></SuperAdminLayout>} />
            <Route path="/super-admin/db-migration" element={<SuperAdminLayout><DatabaseMigration /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-settings" element={<SuperAdminLayout><DevTaskSettings /></SuperAdminLayout>} />
            <Route path="/super-admin/dev/escalations" element={<SuperAdminLayout><EscalationHistory /></SuperAdminLayout>} />
            <Route path="/super-admin/project-map" element={<SuperAdminLayout><ProjectMap /></SuperAdminLayout>} />
            <Route path="/super-admin/dev-leaderboard" element={<SuperAdminLayout><DevLeaderboard /></SuperAdminLayout>} />

            {/* Super Admin Platform Management Routes */}
            <Route path="/super-admin/platform-subscriptions" element={<SuperAdminLayout><PlatformSubscriptions /></SuperAdminLayout>} />
            <Route path="/super-admin/billing-overview" element={<SuperAdminLayout><BillingOverview /></SuperAdminLayout>} />
            <Route path="/super-admin/marketplace-management" element={<SuperAdminLayout><SubscriptionCenter /></SuperAdminLayout>} />

            {/* Public Payment Routes */}
            <Route path="/payment/:invoiceId" element={<PaymentPage />} />
            <Route path="/payment/subscription-renewal" element={<SubscriptionRenewalPayment />} />

            {/* Page Builder Routes - Public for testing */}
            <Route path="/page-builder" element={<PageBuilder />} />
            <Route path="/landing-pages" element={<Layout><LandingPageList /></Layout>} />

            {/* Protected Routes with ProtectedRoute component (handles auth internally) */}


            {/* Protected Routes - Only accessible when authenticated */}
            {isLoading ? (
              // While loading, don't render any routes to avoid race condition
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">...</p>
                  </div>
                </div>
              } />
            ) : isAuthenticated ? (
              <>
                <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />

                {/* Marketplace Routes */}
                <Route path="/marketplace" element={<Layout><Marketplace /></Layout>} />
                <Route path="/marketplace/bundles" element={<Layout><Bundles /></Layout>} />
                <Route path="/marketplace/bundle/:slug" element={<Layout><BundleDetails /></Layout>} />
                <Route path="/marketplace/:slug" element={<Layout><AppDetails /></Layout>} />
                <Route path="/my-apps" element={<Layout><MyApps /></Layout>} />
                {/* App Management Routes */}
                <Route path="/my-apps/:slug/upgrade" element={<Layout><AppDetails /></Layout>} />
                <Route path="/my-apps/:slug/usage" element={<Layout><UsageStats /></Layout>} />
                <Route path="/my-apps/:slug/settings" element={<Layout><AppDetails /></Layout>} />

                <Route path="/marketplace/wallet" element={<Layout><WalletPageMarketplace /></Layout>} />
                {/* <Route path="/wallet" element={<Layout><WalletPage /></Layout>} /> */}

                {/* Platform Subscription Routes */}
                <Route path="/subscription/plans" element={<Layout><PlatformPlans /></Layout>} />
                <Route path="/subscription/my-subscription" element={<Layout><MySubscription /></Layout>} />
                <Route path="/subscription/usage" element={<Layout><UsageStats /></Layout>} />

                <Route path="/customers" element={<Layout><CustomerList /></Layout>} />
                <Route path="/customers/:id" element={<Layout><CustomerDetails /></Layout>} />
                <Route path="/customers/:id/edit" element={<Layout><CustomerEdit /></Layout>} />

                <Route path="/wallet" element={<Layout><WalletPageMarketplace /></Layout>} />
                {/* <Route path="/conversations" element={<Layout><ConversationsSimple /></Layout>} /> */}
                <Route path="/conversations-improved" element={<Layout><ConversationsImprovedFixed /></Layout>} />
                <Route path="/external-messages-stats" element={<Layout><ExternalMessagesStats /></Layout>} />
                <Route path="/sent-messages-stats" element={<Layout><SentMessagesStats /></Layout>} />
                <Route path="/facebook-inbox" element={<Layout><FacebookInbox /></Layout>} />
                <Route path="/appointments" element={<Layout><Appointments /></Layout>} />
                <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
                <Route path="/tasks/dashboard" element={<Layout><TasksDashboard /></Layout>} />
                <Route path="/tasks/kanban" element={<Layout><KanbanBoard /></Layout>} />
                <Route path="/tasks/notifications" element={<Layout><TaskNotifications /></Layout>} />
                <Route path="/tasks/calendar" element={<Layout><CalendarView /></Layout>} />
                <Route path="/tasks/time-reports" element={<Layout><TimeReports /></Layout>} />
                <Route path="/tasks/templates" element={<Layout><TaskTemplates /></Layout>} />
                <Route path="/tasks/:id" element={<Layout><TaskDetails /></Layout>} />

                {/* <Route path="/reports/shipping" element={<Layout><ShippingReport /></Layout>} /> */}
                <Route path="/analytics" element={<Layout><AdvancedReports /></Layout>} />
                <Route path="/rag-analytics" element={<Layout><RAGAnalyticsDashboard /></Layout>} /> {/* 📊 New RAG Analytics */}
                <Route path="/pos" element={<Layout><PosPage /></Layout>} />

                {/* Test Chat */}
                <Route path="/test-chat" element={<Layout><AITestChat /></Layout>} />
                <Route path="/ai-management" element={<Layout><AIManagement /></Layout>} />

                {/* Customer Billing */}
                <Route path="/invoices" element={<Layout><CustomerInvoices /></Layout>} />
                <Route path="/payments" element={<Layout><CustomerPayments /></Layout>} />
                <Route path="/subscription" element={<Layout><CustomerSubscription /></Layout>} />

                <Route path="/broadcast" element={<Layout><BroadcastDashboard /></Layout>} />

                {/* Advertising Routes */}
                <Route path="/advertising/facebook-pixel" element={<Layout><FacebookPixelSettings /></Layout>} />
                <Route path="/advertising/facebook-ads" element={<Layout><FacebookAdsDashboard /></Layout>} />
                <Route path="/advertising/facebook-ads/campaigns" element={<Layout><FacebookAdsDashboard /></Layout>} />
                <Route path="/advertising/facebook-ads/campaigns/create" element={<Layout><CreateCampaign /></Layout>} />
                <Route path="/advertising/facebook-ads/create-ad" element={<Layout><CreateAdWizard /></Layout>} />
                <Route path="/advertising/facebook-ads/campaigns/:id" element={<Layout><CampaignDetails /></Layout>} />
                <Route path="/advertising/facebook-ads/campaigns/:campaignId/adsets/create" element={<Layout><CreateAdSet /></Layout>} />
                <Route path="/advertising/facebook-ads/adsets/:adSetId/ads/create" element={<Layout><CreateAd /></Layout>} />
                <Route path="/advertising/facebook-ads/catalogs" element={<Layout><CatalogsManagement /></Layout>} />
                <Route path="/advertising/facebook-ads/catalogs/:id" element={<Layout><CatalogDetails /></Layout>} />
                <Route path="/advertising/facebook-ads/adsets/:adSetId/dynamic-ads/create" element={<Layout><CreateDynamicAd /></Layout>} />
                <Route path="/advertising/facebook-ads/tests" element={<Layout><ABTestsManagement /></Layout>} />
                <Route path="/advertising/facebook-ads/tests/create" element={<Layout><CreateABTest /></Layout>} />
                <Route path="/advertising/facebook-ads/tests/:id" element={<Layout><ABTestDetails /></Layout>} />
                <Route path="/advertising/facebook-ads/audiences" element={<Layout><AudiencesManagement /></Layout>} />
                <Route path="/advertising/facebook-ads/audiences/custom/create" element={<Layout><CreateCustomAudience /></Layout>} />
                <Route path="/advertising/facebook-ads/audiences/custom/:id" element={<Layout><CustomAudienceDetails /></Layout>} />
                <Route path="/advertising/facebook-ads/audiences/lookalike/create" element={<Layout><CreateLookalikeAudience /></Layout>} />
                <Route path="/advertising/facebook-ads/automation-rules" element={<Layout><AutomationRules /></Layout>} />
                <Route path="/advertising/facebook-ads/reports" element={<Layout><AsyncReports /></Layout>} />
                <Route path="/advertising/facebook-ads/lead-forms" element={<Layout><LeadFormsManagement /></Layout>} />
                <Route path="/advertising/facebook-ads/dco" element={<Layout><DynamicCreativeOptimization /></Layout>} />
                <Route path="/advertising/facebook-ads/advantage-plus" element={<Layout><AdvantagePlusShopping /></Layout>} />
                <Route path="/advertising/facebook-ads/conversions" element={<Layout><ConversionApiDashboard /></Layout>} />
                <Route path="/advertising/facebook-ads/creative-formats" element={<Layout><CreativeFormats /></Layout>} />
                <Route path="/advertising/facebook-ads/ad-preview" element={<Layout><AdPreview /></Layout>} />
                <Route path="/advertising/facebook-ads/saved-audiences" element={<Layout><SavedAudiences /></Layout>} />
                <Route path="/advertising/facebook-ads/attribution" element={<Layout><AttributionSettings /></Layout>} />

                <Route path="/reminders" element={<Layout><Reminders /></Layout>} />
                <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
                <Route path="/notification-settings" element={<Layout><NotificationSettings /></Layout>} />
                <Route path="/monitoring" element={<Layout><MonitoringDashboard /></Layout>} />
                <Route path="/alert-settings" element={<Layout><AlertSettings /></Layout>} />
                <Route path="/monitor-reports" element={<Layout><ReportsPage /></Layout>} />
                {/* <Route path="/quality" element={<Layout><QualityDashboard /></Layout>} /> */}
                <Route path="/companies" element={<Layout><CompaniesManagement /></Layout>} />
                <Route path="/super-admin/changelog" element={<Layout><Changelog /></Layout>} />
                <Route path="/users" element={<Layout><UsersManagement /></Layout>} />
                <Route path="/employee-stats" element={<Layout><EmployeeStatsReport /></Layout>} />
                <Route path="/roles" element={<Layout><RolesManagement /></Layout>} />
                <Route path="/company-dashboard" element={<Layout><CompanyDashboard /></Layout>} />
                <Route path="/company-links" element={<Layout><CompanyLinks /></Layout>} />
                <Route path="/profile" element={<Layout fullWidth><Profile /></Layout>} />
                <Route path="/settings" element={<Layout><Settings /></Layout>} />
                <Route path="/settings/company" element={<Layout><CompanySettings /></Layout>} />
                <Route path="/settings/orders" element={<Layout><OrderSettings /></Layout>} />
                <Route path="/store-settings" element={<Layout><StoreSettings /></Layout>} />
                <Route path="/facebook/create-post" element={<Layout><FacebookPostCreator /></Layout>} />
                {/* <Route path="/conversations-dashboard" element={<Layout><ConversationsDashboard /></Layout>} />
            <Route path="/conversations-test" element={<Layout><ConversationsTest /></Layout>} />
            <Route path="/conversations-simple-test" element={<Layout><ConversationsSimpleTest /></Layout>} /> */}
                <Route path="/comments" element={<Layout><CommentsManagement /></Layout>} />
                <Route path="/comments/:id" element={<Layout><CommentDetails /></Layout>} />
                <Route path="/comments/settings" element={<Layout><CommentSettings /></Layout>} />
                {/* Unified Comments Management Routes */}
                <Route path="/unified-comments" element={<Layout><PostsManagement /></Layout>} />
                <Route path="/unified-comments-split" element={<Layout><UnifiedCommentsSplit /></Layout>} />
                <Route path="/unified-comments/:postId" element={<Layout><UnifiedCommentsManagement /></Layout>} />
                {/* Posts Management Routes */}
                <Route path="/posts" element={<Layout><PostsManagement /></Layout>} />
                <Route path="/posts/ai-tracking" element={<Layout><PostAITracking /></Layout>} />
                <Route path="/posts/:postId/settings" element={<Layout><PostSettings /></Layout>} />
                <Route path="/posts/:postId/comments" element={<Layout><PostComments /></Layout>} />
                <Route path="/messenger-chat" element={<Layout><MessengerChat /></Layout>} />
                <Route path="/products" element={<Layout><Products /></Layout>} />
                <Route path="/products/new" element={<Layout><ProductNewFinal /></Layout>} />
                <Route path="/products/reviews" element={<Layout><ProductReviewsSimple /></Layout>} />
                <Route path="/products/import-easy-orders" element={<Layout><EasyOrdersImport /></Layout>} />
                <Route path="/products/import-woocommerce" element={<Layout><WooCommerceImport /></Layout>} />
                <Route path="/products/:id" element={<Layout><ProductView /></Layout>} />
                <Route path="/products/:id/edit" element={<Layout><ProductNewFinal /></Layout>} />

                {/* Platform Integrations */}
                <Route path="/platform-integrations" element={<Layout><PlatformIntegrations /></Layout>} />

                <Route path="/categories" element={<Layout><Categories /></Layout>} />

                {/* Affiliate Routes */}
                <Route path="/affiliates/management" element={<Layout><AffiliatesManagement /></Layout>} />
                <Route path="/affiliates/quick-actions" element={<Layout><AffiliateQuickActions /></Layout>} />
                <Route path="/affiliates/settings" element={<Layout><AffiliateSystemSettings /></Layout>} />
                <Route path="/affiliates/dashboard" element={<Layout><AffiliateDashboard /></Layout>} />
                <Route path="/affiliates/commission" element={<Layout><AffiliateCommission /></Layout>} />

                {/* Merchant Routes - Consolidated with Procurement */}
                <Route path="/merchants" element={<Navigate to="/procurement/suppliers" replace />} />

                {/* Platform Management Routes */}
                <Route path="/platform/commissions" element={<Layout><CommissionsManagement /></Layout>} />

                <Route path="/orders" element={<Layout><Orders /></Layout>} />
                <Route path="/orders/woocommerce-sync" element={<Layout><WooCommerceSync /></Layout>} />
                <Route path="/orders/:id" element={<Layout><OrderDetails /></Layout>} />
                <Route path="/orders/invoices" element={<Layout><OrderInvoices /></Layout>} />
                <Route path="/orders/invoice/:invoiceId" element={<OrderInvoice />} />
                <Route path="/orders/invoices/print-multiple" element={<PrintMultipleInvoices />} />
                <Route path="/returns" element={<Layout><ReturnManagementPage /></Layout>} />
                <Route path="/returns/settings" element={<Layout><ReturnSettingsPage /></Layout>} />
                <Route path="/bulk-search" element={<Layout><BulkSearchPage /></Layout>} />
                <Route path="/orders/manual" element={<Layout><ManualOrderPage /></Layout>} />

                {/* Procurement/Purchasing Routes */}
                <Route path="/procurement/dashboard" element={<Layout><ProcurementDashboard /></Layout>} />
                <Route path="/procurement/suppliers" element={<Layout><Suppliers /></Layout>} />
                <Route path="/procurement/suppliers/:id" element={<Layout><Suppliers /></Layout>} />
                <Route path="/procurement/purchase-orders" element={<Layout><PurchaseOrders /></Layout>} />
                <Route path="/procurement/purchase-orders/new" element={<Layout><PurchaseOrderForm /></Layout>} />
                <Route path="/procurement/purchase-orders/:id/edit" element={<Layout><PurchaseOrderForm /></Layout>} />
                <Route path="/procurement/purchase-orders/:id" element={<Layout><PurchaseOrders /></Layout>} />
                <Route path="/procurement/purchase-invoices" element={<Layout><PurchaseInvoices /></Layout>} />
                <Route path="/procurement/purchase-invoices/new" element={<Layout><PurchaseInvoices /></Layout>} />
                <Route path="/procurement/purchase-invoices/:id" element={<Layout><PurchaseInvoices /></Layout>} />
                <Route path="/procurement/supplier-payments" element={<Layout><SupplierPayments /></Layout>} />
                <Route path="/procurement/supplier-payments/new" element={<Layout><SupplierPayments /></Layout>} />
                <Route path="/procurement/supplier-payments/:id" element={<Layout><SupplierPayments /></Layout>} />

                {/* Orders Analytics Routes */}
                <Route path="/analytics/orders" element={<Layout><OrdersOverviewDashboard /></Layout>} />
                <Route path="/analytics/orders/orders" element={<Layout><OrdersAnalyticsPage /></Layout>} />
                <Route path="/analytics/orders/revenue" element={<Layout><RevenueAnalytics /></Layout>} />
                <Route path="/analytics/orders/products" element={<Layout><ProductsAnalyticsPage /></Layout>} />
                <Route path="/analytics/orders/variations" element={<Layout><VariationsAnalytics /></Layout>} />
                <Route path="/analytics/orders/categories" element={<Layout><CategoriesAnalytics /></Layout>} />
                <Route path="/analytics/orders/coupons" element={<Layout><CouponsAnalytics /></Layout>} />
                <Route path="/analytics/orders/taxes" element={<Layout><TaxesAnalytics /></Layout>} />
                <Route path="/analytics/orders/downloads" element={<Layout><DownloadsAnalytics /></Layout>} />
                <Route path="/analytics/orders/stock" element={<Layout><StockAnalyticsPage /></Layout>} />
                <Route path="/analytics/orders/customers" element={<Layout><CustomerAnalytics /></Layout>} />
                <Route path="/analytics/orders/payments" element={<Layout><PaymentMethodAnalytics /></Layout>} />
                <Route path="/analytics/orders/profit" element={<Layout><ProfitAnalytics /></Layout>} />
                <Route path="/analytics/orders/cod-performance" element={<Layout><CODPerformanceAnalytics /></Layout>} />
                <Route path="/analytics/orders/delivery-rate" element={<Layout><DeliveryRateAnalytics /></Layout>} />
                <Route path="/analytics/orders/regions" element={<Layout><RegionAnalytics /></Layout>} />
                <Route path="/analytics/orders/returns" element={<Layout><ReturnsAnalytics /></Layout>} />
                <Route path="/analytics/orders/funnel" element={<Layout><FunnelAnalytics /></Layout>} />
                <Route path="/analytics/orders/conversion" element={<Layout><ConversionRateAnalytics /></Layout>} />
                <Route path="/analytics/orders/team-performance" element={<Layout><TeamPerformanceAnalytics /></Layout>} />
                <Route path="/analytics/orders/abandoned-cart" element={<Layout><AbandonedCartAnalytics /></Layout>} />
                <Route path="/analytics/orders/advanced-plan" element={<Layout><AdvancedAnalyticsPlan /></Layout>} />
                <Route path="/analytics/orders/ai-tools" element={<Layout><AIToolsDesign /></Layout>} />
                <Route path="/inventory/reports" element={<Layout><InventoryReports /></Layout>} />
                <Route path="/coupons" element={<Layout><Coupons /></Layout>} />
                <Route path="/appointments" element={<Layout><Appointments /></Layout>} />
                <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
                <Route path="/tasks/dashboard" element={<Layout><TasksDashboard /></Layout>} />
                <Route path="/tasks/kanban" element={<Layout><KanbanBoard /></Layout>} />
                <Route path="/tasks/notifications" element={<Layout><TaskNotifications /></Layout>} />
                <Route path="/tasks/calendar" element={<Layout><CalendarView /></Layout>} />
                <Route path="/tasks/time-reports" element={<Layout><TimeReports /></Layout>} />
                <Route path="/tasks/templates" element={<Layout><TaskTemplates /></Layout>} />
                <Route path="/tasks/:id" element={<Layout><TaskDetails /></Layout>} />
                <Route path="/reports" element={<Layout><Reports /></Layout>} />
                {/* <Route path="/reports/shipping" element={<Layout><ShippingReport /></Layout>} /> */}
                <Route path="/analytics" element={<Layout><AdvancedReports /></Layout>} />
                <Route path="/rag-analytics" element={<Layout><RAGAnalyticsDashboard /></Layout>} /> {/* 📊 New RAG Analytics */}
                <Route path="/analytics/store" element={<Layout><StoreAnalyticsDashboard /></Layout>} />
                <Route path="/pos" element={<Layout><PosPage /></Layout>} />
                <Route path="/settings/facebook-oauth" element={<Layout><FacebookOAuth /></Layout>} />
                <Route path="/orders/stats" element={<Layout><OrderStats /></Layout>} />
                {/* <Route path="/opportunities" element={<Layout><Opportunities /></Layout>} /> */}
                <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
                <Route path="/inventory/warehouses" element={<Layout><WarehouseManagement /></Layout>} />
                <Route path="/inventory/audits" element={<Layout><InventoryAudits /></Layout>} />
                <Route path="/inventory/reports" element={<Layout><InventoryReports /></Layout>} />
                <Route path="/coupons" element={<Layout><Coupons /></Layout>} />
                <Route path="/appointments" element={<Layout><Appointments /></Layout>} />
                <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
                <Route path="/tasks/dashboard" element={<Layout><TasksDashboard /></Layout>} />
                <Route path="/tasks/kanban" element={<Layout><KanbanBoard /></Layout>} />
                <Route path="/tasks/notifications" element={<Layout><TaskNotifications /></Layout>} />
                <Route path="/tasks/calendar" element={<Layout><CalendarView /></Layout>} />
                <Route path="/tasks/time-reports" element={<Layout><TimeReports /></Layout>} />
                <Route path="/tasks/templates" element={<Layout><TaskTemplates /></Layout>} />
                <Route path="/tasks/:id" element={<Layout><TaskDetails /></Layout>} />

                {/* <Route path="/reports/shipping" element={<Layout><ShippingReport /></Layout>} /> */}
                <Route path="/analytics" element={<Layout><AdvancedReports /></Layout>} />
                <Route path="/rag-analytics" element={<Layout><RAGAnalyticsDashboard /></Layout>} /> {/* 📊 New RAG Analytics */}
                <Route path="/pos" element={<Layout><PosPage /></Layout>} />



                {/* Test Chat */}
                <Route path="/test-chat" element={<Layout><AITestChat /></Layout>} />
                <Route path="/ai-management" element={<Layout><AIManagement /></Layout>} />

                {/* Customer Billing */}
                <Route path="/invoices" element={<Layout><CustomerInvoices /></Layout>} />
                <Route path="/payments" element={<Layout><CustomerPayments /></Layout>} />
                <Route path="/subscription" element={<Layout><CustomerSubscription /></Layout>} />

                <Route path="/broadcast" element={<Layout><BroadcastDashboard /></Layout>} />

                {/* Advertising Routes */}
                <Route path="/advertising/facebook-pixel" element={<Layout><FacebookPixelSettings /></Layout>} />
                <Route path="/advertising/facebook-ads" element={<Layout><FacebookAdsDashboard /></Layout>} />
                <Route path="/advertising/facebook-ads/campaigns" element={<Layout><FacebookAdsDashboard /></Layout>} />
                <Route path="/advertising/facebook-ads/campaigns/create" element={<Layout><CreateCampaign /></Layout>} />
                <Route path="/advertising/facebook-ads/create-ad" element={<Layout><CreateAdWizard /></Layout>} />
                <Route path="/advertising/facebook-ads/campaigns/:id" element={<Layout><CampaignDetails /></Layout>} />
                <Route path="/advertising/facebook-ads/campaigns/:campaignId/adsets/create" element={<Layout><CreateAdSet /></Layout>} />
                <Route path="/advertising/facebook-ads/adsets/:adSetId/ads/create" element={<Layout><CreateAd /></Layout>} />
                <Route path="/advertising/facebook-ads/catalogs" element={<Layout><CatalogsManagement /></Layout>} />
                <Route path="/advertising/facebook-ads/catalogs/:id" element={<Layout><CatalogDetails /></Layout>} />
                <Route path="/advertising/facebook-ads/adsets/:adSetId/dynamic-ads/create" element={<Layout><CreateDynamicAd /></Layout>} />
                <Route path="/advertising/facebook-ads/tests" element={<Layout><ABTestsManagement /></Layout>} />
                <Route path="/advertising/facebook-ads/tests/create" element={<Layout><CreateABTest /></Layout>} />
                <Route path="/advertising/facebook-ads/tests/:id" element={<Layout><ABTestDetails /></Layout>} />
                <Route path="/advertising/facebook-ads/audiences" element={<Layout><AudiencesManagement /></Layout>} />
                <Route path="/advertising/facebook-ads/audiences/custom/create" element={<Layout><CreateCustomAudience /></Layout>} />
                <Route path="/advertising/facebook-ads/audiences/custom/:id" element={<Layout><CustomAudienceDetails /></Layout>} />
                <Route path="/advertising/facebook-ads/audiences/lookalike/create" element={<Layout><CreateLookalikeAudience /></Layout>} />
                <Route path="/advertising/facebook-ads/automation-rules" element={<Layout><AutomationRules /></Layout>} />
                <Route path="/advertising/facebook-ads/reports" element={<Layout><AsyncReports /></Layout>} />
                <Route path="/advertising/facebook-ads/lead-forms" element={<Layout><LeadFormsManagement /></Layout>} />
                <Route path="/advertising/facebook-ads/dco" element={<Layout><DynamicCreativeOptimization /></Layout>} />
                <Route path="/advertising/facebook-ads/advantage-plus" element={<Layout><AdvantagePlusShopping /></Layout>} />
                <Route path="/advertising/facebook-ads/conversions" element={<Layout><ConversionApiDashboard /></Layout>} />
                <Route path="/advertising/facebook-ads/creative-formats" element={<Layout><CreativeFormats /></Layout>} />
                <Route path="/advertising/facebook-ads/ad-preview" element={<Layout><AdPreview /></Layout>} />
                <Route path="/advertising/facebook-ads/saved-audiences" element={<Layout><SavedAudiences /></Layout>} />
                <Route path="/advertising/facebook-ads/attribution" element={<Layout><AttributionSettings /></Layout>} />

                <Route path="/reminders" element={<Layout><Reminders /></Layout>} />
                <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
                <Route path="/notification-settings" element={<Layout><NotificationSettings /></Layout>} />
                <Route path="/monitoring" element={<Layout><MonitoringDashboard /></Layout>} />
                <Route path="/alert-settings" element={<Layout><AlertSettings /></Layout>} />
                <Route path="/monitor-reports" element={<Layout><ReportsPage /></Layout>} />
                {/* <Route path="/quality" element={<Layout><QualityDashboard /></Layout>} /> */}
                <Route path="/companies" element={<Layout><CompaniesManagement /></Layout>} />
                <Route path="/super-admin/changelog" element={<Layout><Changelog /></Layout>} />
                <Route path="/users" element={<Layout><UsersManagement /></Layout>} />
                <Route path="/employee-stats" element={<Layout><EmployeeStatsReport /></Layout>} />
                <Route path="/roles" element={<Layout><RolesManagement /></Layout>} />
                <Route path="/company-dashboard" element={<Layout><CompanyDashboard /></Layout>} />
                <Route path="/company-links" element={<Layout><CompanyLinks /></Layout>} />
                <Route path="/profile" element={<Layout fullWidth><Profile /></Layout>} />
                <Route path="/settings" element={<Layout><Settings /></Layout>} />
                <Route path="/settings/company" element={<Layout><CompanySettings /></Layout>} />
                <Route path="/settings/orders" element={<Layout><OrderSettings /></Layout>} />
                <Route path="/store-settings" element={<Layout><StoreSettings /></Layout>} />
                <Route path="/settings/store" element={<Layout><StoreSettings /></Layout>} />
                <Route path="/settings/store-pages" element={<Layout><StorePages /></Layout>} />
                <Route path="/settings/storefront-features" element={<Layout><StorefrontFeaturesSettings /></Layout>} />
                <Route path="/settings/product-images" element={<Layout><ProductImageSettings /></Layout>} />
                <Route path="/settings/delivery-options" element={<Layout><DeliveryOptions /></Layout>} />
                <Route path="/settings/turbo" element={<Layout><TurboSettings /></Layout>} />
                <Route path="/settings/turbo/ticket/:ticketId" element={<Layout><TurboTicketDetails /></Layout>} />
                <Route path="/tickets" element={<Layout><TurboTickets /></Layout>} />
                <Route path="/settings/smart-replies" element={<Layout><SmartRepliesSettings /></Layout>} />

                <Route path="/settings/promotion" element={<Layout><PromotionSettings /></Layout>} />
                <Route path="/settings/recommendations" element={<Layout><RecommendationSettings /></Layout>} />
                <Route path="/settings/homepage" element={<Layout><HomepageSettings /></Layout>} />
                <Route path="/settings/homepage/create" element={<Layout><HomepageEditor /></Layout>} />
                <Route path="/settings/homepage/edit/:id" element={<Layout><HomepageEditor /></Layout>} />
                <Route path="/settings/homepage/:id" element={<Layout><HomepageEditor /></Layout>} />
                <Route path="/preview/homepage/:id" element={<HomepagePreview />} />
                <Route path="/settings/facebook" element={<Layout><FacebookSettings /></Layout>} />
                <Route path="/settings/facebook-oauth" element={<Layout><FacebookOAuth /></Layout>} />
                <Route path="/facebook/engagement-stats" element={<Layout><PageEngagementStats /></Layout>} />
                <Route path="/settings/telegram" element={<Layout><TelegramSettings /></Layout>} />
                <Route path="/telegram/pro" element={<Layout><TelegramConversationsPro /></Layout>} />
                <Route path="/telegram-userbot" element={<Layout><TelegramUserbot /></Layout>} /> {/* System 2 */}
                <Route path="/telegram/auto-reply" element={<Layout><TelegramAutoReply /></Layout>} />
                <Route path="/telegram/bulk-messages" element={<Layout><TelegramBulkMessages /></Layout>} />
                <Route path="/telegram/scheduler" element={<Layout><TelegramScheduler /></Layout>} />
                <Route path="/telegram/groups" element={<Layout><TelegramGroups /></Layout>} />
                <Route path="/terms" element={<Layout><TermsOfService /></Layout>} />
                <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />

                {/* WhatsApp Routes */}
                <Route path="/whatsapp" element={<Layout><WhatsAppChat /></Layout>} />
                <Route path="/whatsapp/chat" element={<Layout><WhatsAppChat /></Layout>} />
                <Route path="/whatsapp/settings" element={<Layout><WhatsAppSettings /></Layout>} />
                <Route path="/whatsapp/notifications" element={<Layout><WhatsAppNotifications /></Layout>} />
                <Route path="/whatsapp/analytics" element={<Layout><WhatsAppAnalytics /></Layout>} />
                {/* HR Routes */}
                <Route path="/hr" element={<Layout><HRDashboard /></Layout>} />
                <Route path="/hr/dashboard" element={<Layout><HRDashboard /></Layout>} />
                <Route path="/my-companies/hr" element={<Layout><MyCompaniesDashboard /></Layout>} />
                <Route path="/my-companies/reports" element={<Layout><OwnerReports /></Layout>} />
                <Route path="/my-companies/company/:companyId/orders" element={<Layout><CompanyOrdersDetails /></Layout>} />
                <Route path="/my-companies/attendance" element={<Layout><OwnerAttendanceReport /></Layout>} />
                <Route path="/my-companies/users" element={<Layout><OwnerUsersManagement /></Layout>} />
                <Route path="/hr/employees" element={<Layout><Employees /></Layout>} />
                <Route path="/hr/employees/:id" element={<Layout><EmployeeDetails /></Layout>} />
                <Route path="/hr/employees/:id/edit" element={<Layout><EmployeeEdit /></Layout>} />
                <Route path="/hr/salary-updates" element={<Layout><SalaryUpdates /></Layout>} />
                <Route path="/hr/departments" element={<Layout><Departments /></Layout>} />
                <Route path="/hr/positions" element={<Layout><PositionsManagement /></Layout>} />
                <Route path="/hr/attendance" element={<Layout><Attendance /></Layout>} />
                <Route path="/hr/attendance/manual-edit" element={<Layout><ManualAttendanceEdit /></Layout>} />
                <Route path="/hr/leaves" element={<Layout><Leaves /></Layout>} />
                <Route path="/hr/payroll" element={<Layout><Payroll /></Layout>} />
                <Route path="/hr/deductions" element={<Layout><Deductions /></Layout>} />
                <Route path="/hr/settings" element={<Layout><HRSettings /></Layout>} />
                <Route path="/hr/reports" element={<Layout><HRReports /></Layout>} />
                <Route path="/hr/reports-hub" element={<Layout><HRReportsHub /></Layout>} />
                <Route path="/hr/documents/:employeeId" element={<Layout><Documents /></Layout>} />
                <Route path="/hr/salary-history" element={<Layout><SalaryHistory /></Layout>} />
                <Route path="/hr/salary-history/:employeeId" element={<Layout><SalaryHistory /></Layout>} />
                <Route path="/hr/performance-reviews" element={<Layout><PerformanceReviews /></Layout>} />
                <Route path="/hr/performance-reviews/new" element={<Layout><CreatePerformanceReview /></Layout>} />
                <Route path="/hr/performance-reviews/:id" element={<Layout><PerformanceReviews /></Layout>} />
                <Route path="/hr/training" element={<Layout><Training /></Layout>} />
                <Route path="/hr/training/new" element={<Layout><CreateTraining /></Layout>} />
                <Route path="/hr/training/:id" element={<Layout><Training /></Layout>} />
                <Route path="/hr/rewards" element={<Layout><RewardsList /></Layout>} />
                <Route path="/hr/rewards/create" element={<Layout><CreateEditReward /></Layout>} />
                <Route path="/hr/rewards/edit/:id" element={<Layout><CreateEditReward /></Layout>} />
                <Route path="/hr/rewards/:id" element={<Layout><RewardDetails /></Layout>} />
                <Route path="/hr/customer-loyalty" element={<Layout><CustomerLoyalty /></Layout>} />
                <Route path="/hr/warnings" element={<Layout><Warnings /></Layout>} />
                <Route path="/hr/warnings/new" element={<Layout><CreateWarning /></Layout>} />
                <Route path="/hr/warnings/:id" element={<Layout><WarningDetails /></Layout>} />
                <Route path="/hr/warnings/:id/edit" element={<Layout><EditWarning /></Layout>} />
                <Route path="/hr/promotions" element={<Layout><EmployeesPromotion /></Layout>} />
                <Route path="/hr/promotions/new" element={<Layout><CreatePromotion /></Layout>} />
                <Route path="/hr/shifts" element={<Layout><Shifts /></Layout>} />
                <Route path="/hr/shifts/:id" element={<Layout><ShiftDetails /></Layout>} />
                <Route path="/hr/benefits" element={<Layout><Benefits /></Layout>} />
                <Route path="/hr/benefits/:id" element={<Layout><Benefits /></Layout>} />
                <Route path="/hr/goals" element={<Layout><Goals /></Layout>} />
                <Route path="/hr/goals/new" element={<Layout><CreateGoal /></Layout>} />
                <Route path="/hr/goals/:id" element={<Layout><Goals /></Layout>} />
                <Route path="/hr/feedback" element={<Layout><Feedback /></Layout>} />
                <Route path="/hr/feedback/new" element={<Layout><CreateFeedback /></Layout>} />
                <Route path="/hr/resignations" element={<Layout><Resignations /></Layout>} />
                <Route path="/hr/resignations/new" element={<Layout><CreateResignation /></Layout>} />
                <Route path="/hr/resignations/:id/clearance" element={<Layout><ClearanceChecklist /></Layout>} />
                <Route path="/hr/advances" element={<Layout><Advances /></Layout>} />
                <Route path="/hr/advances/new" element={<Layout><CreateAdvance /></Layout>} />
                <Route path="/hr/audit-logs" element={<Layout><AuditLogs /></Layout>} />
                <Route path="/hr/assets" element={<Layout><AssetsDashboard /></Layout>} />
                <Route path="/hr/company-policy" element={<Layout><CompanyPolicy /></Layout>} />


                {/* Employee Self-Service Routes */}

                <Route path="/my-attendance" element={<Layout><MyAttendance /></Layout>} />
                <Route path="/my-dashboard" element={<Layout><MyDashboard /></Layout>} />
                <Route path="/my-leaves" element={<Layout><Leaves /></Layout>} />

                <Route path="/my-payroll" element={<Layout><Payroll /></Layout>} />
                <Route path="/my-deductions" element={<Layout><MyDeductions /></Layout>} />
                <Route path="/my-advances" element={<Layout><MyAdvances /></Layout>} />


                <Route path="/hr/resignations/:id" element={<Layout><Resignations /></Layout>} />

                {/* Support System Routes */}
                <Route path="/support" element={<Layout><SupportCenter /></Layout>} />
                <Route path="/support/tickets" element={<Layout><MyTickets /></Layout>} />
                <Route path="/support/tickets/new" element={<Layout><CreateTicket /></Layout>} />
                <Route path="/support/tickets/:ticketId" element={<Layout><SupportTicketDetails /></Layout>} />
                <Route path="/support/faq" element={<Layout><FAQ /></Layout>} />

                {/* Activity Log Routes */}
                <Route path="/my-activity" element={<Layout><MyActivity /></Layout>} />
                <Route path="/company/activity" element={<Layout><CompanyActivity /></Layout>} />

                {/* Admin Support Routes */}
                <Route path="/admin/support" element={<Layout><SupportAdmin /></Layout>} />

                {/* Gamification Route */}
                <Route path="/super-admin/dev-leaderboard" element={<SuperAdminLayout><DevLeaderboard /></SuperAdminLayout>} />

                {/* Image Studio Route */}
                <Route path="/image-studio" element={<Layout><ImageStudio /></Layout>} />

                {/* RAG Admin Routes */}
                <Route path="/admin/rag" element={<Layout><RAGManagement /></Layout>} />
                <Route path="/admin/faqs" element={<Layout><FAQManagement /></Layout>} />
                <Route path="/admin/policies" element={<Layout><PolicyManagement /></Layout>} />

              </>
            ) : (
              // Redirect unauthenticated users trying to access protected routes
              <>
                <Route path="/store-settings" element={<Navigate to="/auth/login" replace />} />
                <Route path="/settings/storefront-features" element={<Navigate to="/auth/login" replace />} />
                <Route path="/settings/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/dashboard" element={<Navigate to="/auth/login" replace />} />
                <Route path="/products/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/orders/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/customers" element={<Navigate to="/auth/login" replace />} />
                <Route path="/inventory" element={<Navigate to="/auth/login" replace />} />
                <Route path="/coupons" element={<Navigate to="/auth/login" replace />} />
                <Route path="/analytics" element={<Navigate to="/auth/login" replace />} />
                <Route path="/reports" element={<Navigate to="/auth/login" replace />} />
                <Route path="/companies" element={<Navigate to="/auth/login" replace />} />
                <Route path="/users" element={<Navigate to="/auth/login" replace />} />
                <Route path="/roles" element={<Navigate to="/auth/login" replace />} />
                <Route path="/company-dashboard" element={<Navigate to="/auth/login" replace />} />
                <Route path="/company-links" element={<Navigate to="/auth/login" replace />} />
                <Route path="/profile" element={<Navigate to="/auth/login" replace />} />
                <Route path="/advertising/*" element={<Navigate to="/auth/login" replace />} />

                <Route path="/test-chat" element={<Navigate to="/auth/login" replace />} />
                <Route path="/invoices" element={<Navigate to="/auth/login" replace />} />
                <Route path="/payments" element={<Navigate to="/auth/login" replace />} />
                <Route path="/subscription" element={<Navigate to="/auth/login" replace />} />
                <Route path="/broadcast" element={<Navigate to="/auth/login" replace />} />
                <Route path="/reminders" element={<Navigate to="/auth/login" replace />} />
                <Route path="/notifications" element={<Navigate to="/auth/login" replace />} />
                <Route path="/notification-settings" element={<Navigate to="/auth/login" replace />} />
                <Route path="/monitoring" element={<Navigate to="/auth/login" replace />} />
                <Route path="/alert-settings" element={<Navigate to="/auth/login" replace />} />
                <Route path="/comments/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/unified-comments/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/posts/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/messenger-chat" element={<Navigate to="/auth/login" replace />} />
                <Route path="/conversations-improved" element={<Navigate to="/auth/login" replace />} />
                <Route path="/external-messages-stats" element={<Navigate to="/auth/login" replace />} />
                <Route path="/sent-messages-stats" element={<Navigate to="/auth/login" replace />} />
                <Route path="/facebook-inbox" element={<Navigate to="/auth/login" replace />} />
                <Route path="/facebook/create-post" element={<Navigate to="/auth/login" replace />} />
                <Route path="/facebook/engagement-stats" element={<Navigate to="/auth/login" replace />} />
                <Route path="/categories" element={<Navigate to="/auth/login" replace />} />
                <Route path="/appointments" element={<Navigate to="/auth/login" replace />} />
                <Route path="/tasks" element={<Navigate to="/auth/login" replace />} />
                {/* Gamification Public Route */}
                <Route path="/super-admin/dev-leaderboard" element={<Navigate to="/auth/login" replace />} />
                <Route path="/whatsapp/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/hr/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/support/*" element={<Navigate to="/auth/login" replace />} />
                <Route path="/admin/support" element={<Navigate to="/auth/login" replace />} />
                <Route path="/super-admin/dev-reports" element={<Navigate to="/auth/login" replace />} />
                <Route path="/super-admin/db-migration" element={<SuperAdminLayout><DatabaseMigration /></SuperAdminLayout>} />

                <Route path="*" element={<Navigate to="/auth/login" replace />} />
              </>
            )}
          </Routes >
        </Suspense >
      </div >
    </PerformanceOptimizer >
  );
};

// Main App component with providers
const App = () => {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
};

export default App;