// Set timezone to Egypt/Cairo before anything else
process.env.TZ = 'Africa/Cairo';

// Load environment variables
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 1. Load base .env (tracked file)
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 2. Check for .env.local (Local overrides - untracked)
// This allows developers to override variables locally without changing .env
const localEnvPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(localEnvPath)) {
  console.log('📝 [SERVER] Loading .env.local overrides');
  dotenv.config({ path: localEnvPath, override: true });
}

// 3. Check for specific environment files based on NODE_ENV (e.g. .env.production)
// Note: NODE_ENV might be set by .env or .env.local at this point
const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production') {
  const prodEnvPath = path.resolve(__dirname, '.env.production');
  if (fs.existsSync(prodEnvPath)) {
    console.log('📝 [SERVER] Loading .env.production overrides');
    dotenv.config({ path: prodEnvPath, override: true });
  }
}

// Server starting...
/**
 * Deployment Trigger: 2026-02-03 00:55
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketService = require('./services/socketService');
const PERFORMANCE_CONFIG = require('./config/performance');

// AI Agent Integration - Lazy Loading
const shouldLazyLoad = PERFORMANCE_CONFIG.FAST_STARTUP_MODE;
let aiAgentService, ragService, memoryService, multimodalService;

if (!shouldLazyLoad) {
  aiAgentService = require('./services/aiAgentService');
  ragService = require('./services/ragService');
  memoryService = require('./services/memoryService');
  multimodalService = require('./services/multimodalService');
}

// Import all routes (alphabetic order for sanity)
// Routes Block 1
const activityLogRoutes = require('./routes/activityLogRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const adminCompanyRoutes = require('./routes/adminCompanyRoutes');
const adminPlansRoutes = require('./routes/adminPlansRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const affiliateSettingsRoutes = require('./routes/affiliateSettingsRoutes');
const publicAffiliateRoutes = require('./routes/publicAffiliateRoutes');
const aiNotificationsRoutes = require('./routes/aiNotificationsRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const adminWalletRoutes = require('./routes/adminWalletRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const publicMerchantRoutes = require('./routes/publicMerchantRoutes');
const platformRevenueRoutes = require('./routes/platformRevenueRoutes');
const appointmentsRoutes = require('./routes/appointmentsRoutes');

const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const checkoutFormSettingsRoutes = require('./routes/checkoutFormSettingsRoutes');
const commentRoutes = require('./routes/commentRoutes');
const companyDashboardRoutes = require('./routes/companyDashboardRoutes');
const companyRoutes = require('./routes/companyRoutes');
const conversationAIRoutes = require('./routes/conversationAIRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
console.log('✅ [DEBUG] Loaded conversationRoutes');
const couponsRoutes = require('./routes/couponsRoutes');
const customerRoutes = require('./routes/customerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const debugAIRoutes = require('./routes/debugAIRoutes');
const debugRoutes = require('./routes/debugRoutes');
const deliveryOptionRoutes = require('./routes/deliveryOptionRoutes');
const demoRoutes = require('./routes/demoRoutes');
const devTaskRoutes = require('./routes/devTaskRoutes');
const easyOrdersRoutes = require('./routes/easyOrdersRoutes');
const faqRoutes = require('./routes/faq');
const fewShotRoutes = require('./routes/fewShotRoutes');
const facebookAdsRoutes = require('./routes/facebookAdsRoutes');
const facebookIntegrationRoutes = require('./routes/facebookIntegrationRoutes');
const facebookOAuthRoutes = require('./routes/facebookOAuthRoutes');
const footerSettingsRoutes = require('./routes/footerSettingsRoutes');
const geolocationRoutes = require('./routes/geolocation');
const healthRoute = require('./routes/healthRoute');
const homepageRoutes = require('./routes/homepageRoutes');
const hrRoutes = require('./routes/hrRoutes');
const imageGalleryRoutes = require('./routes/imageGalleryRoutes');
const importJobRoutes = require('./routes/importJobRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const messageFixRoutes = require('./routes/messageFixRoutes');
const notificationRoutes = require('./routes/notifications-simple');
const opportunitiesRoutes = require('./routes/opportunitiesRoutes');
const orderRoutes = require('./routes/orderRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
const orderRoutes2 = require('./routes/orders');
const orderInvoiceRoutes = require('./routes/orderInvoiceRoutes');
const orderInvoiceSettingsRoutes = require('./routes/orderInvoiceSettingsRoutes');
const orderSettingsRoutes = require('./routes/orderSettings');
const ownerRoutes = require('./routes/ownerRoutes');
const orderStatusRoutes = require('./routes/orderStatusRoutes');
const pageEngagementRoutes = require('./routes/pageEngagementRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const policyRoutes = require('./routes/policy');
const productReviewRoutes = require('./routes/productReviewRoutes');
const productRoutes = require('./routes/productRoutes');
const projectRoutes = require('./routes/projectRoutes');
const promptLibraryRoutes = require('./routes/promptLibraryRoutes');
const proxyRoutes = require('./routes/proxyRoutes');
const publicCartRoutes = require('./routes/publicCartRoutes');
const publicCheckoutFormRoutes = require('./routes/publicCheckoutFormRoutes');
const publicCouponsRoutes = require('./routes/publicCouponsRoutes');
const publicCompanyLinksRoutes = require('./routes/publicCompanyLinksRoutes');
const publicOrdersRoutes = require('./routes/publicOrdersRoutes');
const publicWalletRoutes = require('./routes/publicWalletRoutes');
const publicProductsRoutes = require('./routes/publicProductsRoutes');
const publicPromotionRoutes = require('./routes/publicPromotionRoutes');
const ragAdminRoutes = require('./routes/ragAdmin');
const reportsRoutes = require('./routes/reportsRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const customerLoyaltyRoutes = require('./routes/customerLoyaltyRoutes');
const returnRoutes = require('./routes/returnRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const securityRoutes = require('./routes/securityRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const shippingZoneRoutes = require('./routes/shippingZoneRoutes');
const storePagesRoutes = require('./routes/storePagesRoutes');
const storefrontSettingsRoutes = require('./routes/storefrontSettingsRoutes');
const storeSettingsRoutes = require('./routes/storeSettingsRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const supportRoutes = require('./routes/supportRoutes');
const systemManagementRoutes = require('./routes/systemManagementRoutes');
const taskRoutes = require('./routes/taskRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const telegramAdvancedRoutes = require('./routes/telegramAdvancedRoutes');
const textGalleryRoutes = require('./routes/textGalleryRoutes');
const turboRoutes = require('./routes/turboRoutes');
const turboWebhookRoutes = require('./routes/turboWebhook');
const walletPaymentRoutes = require('./routes/walletPayment');
const webhookRoutes = require('./routes/webhookRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

// Marketplace System Routes
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const companyAppsRoutes = require('./routes/companyAppsRoutes');
const walletRoutes = require('./routes/walletRoutes');
const platformSubscriptionRoutes = require('./routes/platformSubscriptionRoutes');
const superAdminPlatformRoutes = require('./routes/superAdminPlatformRoutes');
const marketplaceManagementRoutes = require('./routes/marketplaceManagementRoutes');

// Billing Cron Service
const billingCronService = require('./services/billingCronService');
const whatsappNotificationRoutes = require('./routes/whatsappNotificationRoutes');
const WhatsAppNotificationService = require('./services/whatsapp/WhatsAppNotificationService');
const wishlistRoutes = require('./routes/wishlistRoutes');
const wooCommerceRoutes = require('./routes/wooCommerceRoutes');

const publicCustomerRoutes = require('./routes/publicCustomerRoutes');

// Services & Middleware
const telegramBotService = require('./services/TelegramBotService');
const WhatsAppManager = require('./services/whatsapp/WhatsAppManager');
const { initializeSharedDatabase } = require('./services/sharedDatabase');
const { initializePostgresDatabase } = require('./services/postgresDatabase');
const { globalSecurity, clearIPBlocks } = require('./middleware/globalSecurity');
const { getCompanyFromSubdomain, addPublicCORS } = require('./middleware/companyMiddleware');
const {
  securityHeaders,
  sanitizeRequest,
  securityMonitoring,
  enhancedCORS
} = require('./middleware/securityEnhancements');
const { sanitizeInput } = require('./middleware/inputValidation');
const {
  performanceMonitor,
  responseCompression,
  queryOptimizer
} = require('./middleware/performanceOptimization');
const emergencySecurityPatch = require('./middleware/emergencySecurityPatch');


// Initialize Express app
const app = express();
const server = http.createServer(app);

// Global Middleware - CORS MUST BE FIRST
app.use((req, res, next) => {
  const origin = req.get('origin') || req.get('Origin') || req.headers.origin || req.get('referer');
  let corsOrigin = '*';
  if (origin && (origin.includes('maxp-ai.pro') || origin.includes('localhost'))) {
    corsOrigin = origin;
  }
  res.setHeader('Access-Control-Allow-Origin', corsOrigin || '*');
  if (corsOrigin && corsOrigin !== '*') res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-request-id, x-cart-id, x-session-id, X-Company-Subdomain, X-Company-Id, x-company-id, X-Subdomain, x-subdomain');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Public Health Checks (High Priority)
app.get('/api/test-health', (req, res) => res.json({ success: true, message: 'Health test endpoint hit' }));
app.use('/health', healthRoute);
app.use('/api/health', healthRoute);
app.use('/api/v1/health', healthRoute);

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from multiple locations
// Note: express.static checks files in order, so we check uploads first (newer location)
// then public/uploads (older location)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));
// Fallback to public/uploads for older files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

// Socket.IO
console.log('🔍 [DEBUG] Initializing Socket Service...');
socketService.initialize(server);
console.log('✅ [DEBUG] Socket Service Initialized');
importJobRoutes.setSocketIO(socketService.getIO());
console.log('✅ [DEBUG] ImportJobRoutes Socket Set');

// Global Request Logger
app.use((req, res, next) => {
  // console.log(`🌐 [REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

console.log('🔍 [DEBUG] Configuring Response...');

// Response Configuration - Ensure JSON for all API routes
app.use((req, res, next) => {
  res.charset = 'utf-8';
  // Set JSON content type for all API routes (except static files)
  if (req.path.startsWith('/api') && !req.path.startsWith('/api/proxy-image') && !req.path.startsWith('/uploads')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  // Override res.json to ensure Content-Type is always set
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    return originalJson(data);
  };
  next();
});

console.log('🔍 [DEBUG] loading security middleware...');

// Security & Performance
app.use(enhancedCORS);
app.use(securityHeaders);
app.use(sanitizeRequest);
app.use(securityMonitoring);
app.use(sanitizeInput);
app.use(performanceMonitor);
app.use(responseCompression);
app.use(queryOptimizer);
app.use(emergencySecurityPatch);

console.log('✅ [DEBUG] Security middleware loaded');

// Global Security Middleware (applied to protected routes)
// Note: Public routes are registered before this middleware

// Public API Routes


// 🧪 Diagnostic route - للتحقق من التحديثات (Last update: 2026-01-11 16:00)
app.get('/api/v1/version', (req, res) => {
  res.json({
    success: true,
    version: '2026-01-11-v3',
    timestamp: new Date().toISOString(),
    message: 'Server is running with latest updates!',
    node_env: process.env.NODE_ENV || 'development'
  });
});
app.use('/api/v1/webhook', webhookRoutes);
app.use("/api/v1/turbo/webhook", turboWebhookRoutes);
app.use("/api/v1/public/promotion", addPublicCORS, publicPromotionRoutes);
app.use("/api/v1/public/promotion-settings", getCompanyFromSubdomain, addPublicCORS, publicPromotionRoutes);
app.use("/api/v1/public/checkout-form", getCompanyFromSubdomain, addPublicCORS, publicCheckoutFormRoutes);
app.use("/api/v1/public/checkout-form-settings", getCompanyFromSubdomain, addPublicCORS, publicCheckoutFormRoutes);
app.use("/api/v1/public/products", getCompanyFromSubdomain, addPublicCORS, publicProductsRoutes);
app.use("/api/v1/public/categories", getCompanyFromSubdomain, addPublicCORS, publicProductsRoutes);
app.use("/api/v1/public/cart", getCompanyFromSubdomain, addPublicCORS, publicCartRoutes);
app.use("/api/v1/public/orders", getCompanyFromSubdomain, addPublicCORS, publicOrdersRoutes);
app.use("/api/v1/public/wallet", addPublicCORS, publicWalletRoutes);
// Shipping estimate route - mount cart routes on /shipping as well
app.use("/api/v1/public/shipping", getCompanyFromSubdomain, addPublicCORS, publicCartRoutes);
// Delivery options route
app.use("/api/v1/public/delivery-options", getCompanyFromSubdomain, addPublicCORS, publicPromotionRoutes);
app.use("/api/v1/public/coupons", addPublicCORS, publicCouponsRoutes);
app.use("/api/v1/public", addPublicCORS, publicCompanyLinksRoutes);
app.use("/api/v1/public/storefront-settings", getCompanyFromSubdomain, addPublicCORS, storefrontSettingsRoutes);
app.use("/api/v1/public/footer-settings", getCompanyFromSubdomain, addPublicCORS, footerSettingsRoutes);
app.use("/api/v1/homepage", homepageRoutes);

// Geolocation (public - used for language defaults / UX)
app.use("/api/geolocation", geolocationRoutes);

console.log('🔍 [DEBUG] Loading WooCommerce Controller...');

// WooCommerce Webhook (public - must be before globalSecurity)
const wooCommerceWebhookController = require('./controller/wooCommerceWebhookController');
app.post("/api/v1/woocommerce/webhook/:companyId", wooCommerceWebhookController.handleWooCommerceWebhook);

console.log('✅ [DEBUG] WooCommerce Controller Loaded');

// Analytics Tracking (public - must be before globalSecurity)
const analyticsController = require('./controller/analyticsController');
app.post("/api/v1/analytics/track/store-visit", analyticsController.trackStoreVisit);
app.post("/api/v1/analytics/track/product-view", analyticsController.trackProductView);
app.post("/api/v1/analytics/track/conversion", analyticsController.trackConversion);
console.log('✅ [DEBUG] Public Analytics Tracking Routes Loaded');

// Public Analytics GET endpoints (must be before globalSecurity)
app.get("/api/v1/analytics/public/store", analyticsController.getPublicStoreAnalytics);
app.get("/api/v1/analytics/public/products/top", analyticsController.getPublicTopProducts);
app.get("/api/v1/analytics/public/daily", analyticsController.getPublicDailyAnalytics);
console.log('✅ [DEBUG] Public Analytics GET Routes Loaded');

// Public Registration Routes (must be before globalSecurity)
app.use("/api/v1/public/affiliates", publicAffiliateRoutes);
app.use("/api/v1/public/merchants", publicMerchantRoutes);
app.use("/api/v1/public/customers", publicCustomerRoutes);
console.log('✅ [DEBUG] Public Registration Routes Loaded');

// 🏪 Public Marketplace Routes (must be before globalSecurity)
console.log('🏪 [MARKETPLACE] Loading Public Marketplace routes...');
app.use("/api/v1/marketplace", marketplaceRoutes);
console.log('✅ [MARKETPLACE] Public Marketplace routes loaded');

// Apply Global Security Middleware to all protected routes
app.use(globalSecurity);

// Protected API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/affiliates", affiliateRoutes);
app.use("/api/v1/affiliate-settings", affiliateSettingsRoutes);
app.use("/api/v1/merchants", merchantRoutes);
app.use("/api/v1/commissions", commissionRoutes);
app.use("/api/v1/platform", platformRevenueRoutes);

console.log('🔍 [DEBUG] Loading Auth Controller...');

// Super Admin Login (Public - must be before protected super-admin routes)
const authController = require('./controller/authController');
app.post("/api/v1/super-admin/login", authController.login);
console.log('✅ [DEBUG] Auth Controller Loaded');

// Protected Super Admin Routes (requires authentication)
app.use("/api/v1/super-admin", superAdminRoutes);
console.log('✅ [DEBUG] Super Admin Routes Loaded');

app.use("/api/v1/admin/companies", adminCompanyRoutes);
console.log('✅ [DEBUG] Admin Company Routes Loaded');

app.use("/api/v1/admin", systemManagementRoutes);
console.log('✅ [DEBUG] System Management Routes Loaded');

app.use("/api/v1/admin/schedulers", schedulerRoutes);
console.log('✅ [DEBUG] Scheduler Routes Loaded');

app.use("/api/v1/admin/analytics", adminAnalyticsRoutes);
console.log('✅ [DEBUG] Admin Analytics Routes Loaded');

const analyticsRoutes = require('./routes/analyticsRoutes');
app.use("/api/v1/analytics", analyticsRoutes);
console.log('✅ [DEBUG] Analytics Routes Loaded');

app.use("/api/v1/ai", aiRoutes);
console.log('✅ [DEBUG] AI Routes Loaded');

app.use("/api/v1/conversations", conversationRoutes);
console.log('✅ [DEBUG] Conversation Routes Loaded (Middleware)');

app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/policy", require('./routes/policyRoutes'));
console.log('✅ [DEBUG] Policy Routes Loaded');
app.use("/api/v1/procurement", procurementRoutes);
console.log('✅ [DEBUG] Procurement Routes Loaded');
app.use("/api/v1/order-invoices", orderInvoiceRoutes);
console.log('✅ [DEBUG] Order Invoice Routes Loaded');
app.use("/api/v1/order-invoice-settings", orderInvoiceSettingsRoutes);
console.log('✅ [DEBUG] Order Invoice Settings Routes Loaded');
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/appointments", appointmentsRoutes);
console.log('✅ [DEBUG] Appointments Routes Loaded');
app.use("/api/v1/hr", hrRoutes);
app.use("/api/v1/hr/rewards", rewardRoutes);
app.use("/api/v1/hr/customer-loyalty", customerLoyaltyRoutes);
app.use("/api/v1/wallet", require('./routes/walletRoutes'));
console.log('✅ [DEBUG] HR Routes Loaded');

app.use("/api/v1/owner", ownerRoutes);
console.log('✅ [DEBUG] Owner Routes Loaded');

// Assets
try {
  app.use("/api/v1/assets", require('./routes/hr/assetRoutes'));
  console.log('✅ [DEBUG] Asset Routes Loaded');
} catch (e) {
  console.error('❌ [DEBUG] Asset Routes Failed', e);
}

// Asset Reports
try {
  app.use("/api/v1/hr/asset-reports", require('./routes/hr/assetReportsRoutes'));
  console.log('✅ [DEBUG] Asset Reports Routes Loaded');
} catch (e) {
  console.error('❌ [DEBUG] Asset Reports Routes Failed', e);
}

app.use("/api/v1/support", supportRoutes);
console.log('✅ [DEBUG] Support Routes Loaded');

app.use("/api/v1/activity", activityLogRoutes);
console.log('✅ [DEBUG] Activity Routes Loaded');

app.use("/api/v1/reports", reportsRoutes);
console.log('✅ [DEBUG] Reports Routes Loaded');

app.use("/api/v1/reminders", require('./routes/reminderRoutes'));
console.log('✅ [DEBUG] Reminder Routes Loaded');

app.use("/api/v1/notifications", require('./routes/notificationRoutes'));
console.log('✅ [DEBUG] Notification Routes Loaded');

// Log all deduction requests
app.use("/api/v1/hr/deductions", (req, res, next) => {
  console.log(`🔍 [DEDUCTION-REQUEST] ${req.method} ${req.originalUrl}`);
  console.log(`🔍 [DEDUCTION-REQUEST] Headers:`, req.headers.authorization ? 'Has Auth' : 'No Auth');
  next();
});
app.use("/api/v1/hr/deductions", require('./routes/deductionRoutes'));
console.log('✅ [DEBUG] HR Deduction Routes Loaded');

app.use("/api/v1/employee", require('./routes/employeeDeductionRoutes'));
console.log('✅ [DEBUG] Employee Deduction Routes Loaded');

app.use("/api/v1/hr/lateness", require('./routes/latenessRoutes'));
console.log('✅ [DEBUG] Lateness & Auto Deduction Routes Loaded');

app.use("/api/v1/settings", settingsRoutes);
console.log('✅ [DEBUG] Settings Routes Loaded');

app.use("/api/v1/companies", companyRoutes);
console.log('✅ [DEBUG] Companies Routes Loaded');

app.use("/api/v1/integrations", facebookIntegrationRoutes);
console.log('✅ [DEBUG] Facebook Integration Routes Loaded');

app.use("/api/v1", pageEngagementRoutes);
console.log('✅ [DEBUG] Page Engagement Routes Loaded');

app.use("/api/v1/broadcast", broadcastRoutes);
console.log('✅ [DEBUG] Broadcast Routes Loaded');

app.use("/api/v1/whatsapp", whatsappRoutes);
console.log('✅ [DEBUG] Whatsapp Routes Loaded');

app.use("/api/v1/whatsapp/notifications", whatsappNotificationRoutes);
console.log('✅ [DEBUG] Whatsapp Notification Routes Loaded');

app.use("/api/v1/telegram", telegramRoutes);
console.log('✅ [DEBUG] Telegram Routes Loaded');

app.use("/api/v1/telegram-advanced", telegramAdvancedRoutes);
console.log('✅ [DEBUG] Telegram Advanced Routes Loaded');

app.use("/api/v1/turbo", turboRoutes);
console.log('✅ [DEBUG] Turbo Routes Loaded');


console.log('✅ [DEBUG] Basic Routes Loaded');

// Additional modules
app.use("/api/v1/invitations", invitationRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/company-dashboard", companyDashboardRoutes);
app.use("/api/v1/company", companyDashboardRoutes); // ✅ Fix for "path not found"
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/easy-orders", easyOrdersRoutes);
app.use("/api/v1/orders-new", easyOrdersRoutes);
app.use("/api/v1/returns", returnRoutes);

// Notifications & AI Notifications
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/ai-notifications", aiNotificationsRoutes);

console.log('✅ [DEBUG] Notifications Routes Loaded');


// Opportunities
app.use("/api/v1/opportunities", opportunitiesRoutes);

// Comments
app.use("/api/v1/comments", commentRoutes);

// Coupons (protected)
app.use("/api/v1/coupons", couponsRoutes);

// Store Settings
app.use("/api/v1/store-settings", storeSettingsRoutes);
app.use("/api/v1/footer-settings", footerSettingsRoutes);
app.use("/api/v1/checkout-form-settings", checkoutFormSettingsRoutes);
app.use("/api/v1/public/footer-settings", getCompanyFromSubdomain, addPublicCORS, footerSettingsRoutes);

// Store Pages (public routes with company middleware)
app.use("/api/v1/store-pages", getCompanyFromSubdomain, addPublicCORS, storePagesRoutes);

// Storefront Settings
app.use("/api/v1/storefront-settings", storefrontSettingsRoutes);

// Delivery Options
app.use("/api/v1/delivery-options", deliveryOptionRoutes);

// Shipping Zones
app.use("/api/v1/shipping-zones", shippingZoneRoutes);

// Branches
app.use("/api/v1/branches", branchRoutes);

// Order Status
app.use("/api/v1/order-status", orderStatusRoutes);

// Scheduled Orders
const scheduledOrderRoutes = require('./routes/scheduledOrderRoutes');
app.use("/api/v1/scheduled-orders", scheduledOrderRoutes);
console.log('✅ [DEBUG] Scheduled Order Routes Loaded');

// Orders Enhanced

const enhancedOrderRoutes = require('./routes/enhancedOrders');

app.use("/api/v1/orders-enhanced", enhancedOrderRoutes);

// Orders 2
app.use("/api/v1/orders-new", orderRoutes2);

// Order Settings
app.use("/api/v1/order-settings", orderSettingsRoutes);

// Wallet Payment
app.use("/api/v1/wallet-payment", require('./routes/walletPayment'));

// Message Fix
app.use("/api/v1/messages", messageFixRoutes);

// Image Gallery
app.use("/api/v1/user/image-gallery", imageGalleryRoutes);
app.use("/api/v1/user/text-gallery", textGalleryRoutes);

// Product Reviews
app.use("/api/v1/product-reviews", productReviewRoutes);
app.use("/api/v1/reviews", productReviewRoutes);

// Wishlist
app.use("/api/v1/wishlist", wishlistRoutes);

// Conversation AI
app.use("/api/v1/conversation-ai", conversationAIRoutes);

// Debug Routes
app.use("/api/v1/debug", debugRoutes);
app.use("/api/v1/debug", debugAIRoutes);

// Socket Test
const socketTestRoutes = require('./routes/socketTestRoutes');
app.use("/api/v1/socket-test", socketTestRoutes);

// Queue Stats
const queueRoutes = require('./routes/queueRoutes');
app.use("/api/v1/queue-stats", queueRoutes);

// Dev Routes
app.use("/api/v1/dev", demoRoutes);

// Test Chat
const testChatRoutes = require('./routes/testChatRoutes');
app.use("/api/v1/test-chat", testChatRoutes);

// Telegram Userbot

const userbotRoutes = require('./routes/userbotRoutes');

app.use("/api/userbot", userbotRoutes);

// RAG Admin
app.use("/api/v1/rag-admin", ragAdminRoutes);

// RAG Analytics

const ragAnalyticsRoutes = require('./routes/ragAnalyticsRoutes');

app.use("/api/v1/rag-analytics", ragAnalyticsRoutes);

// FAQ
app.use("/api/v1/faqs", faqRoutes);

// Policy
app.use("/api/v1/policies", policyRoutes);

// Few Shot Learning
app.use("/api/v1/few-shot", fewShotRoutes);

// Prompt Library
app.use("/api/v1/prompt-library", promptLibraryRoutes);

// Prompt Templates

const promptTemplateRoutes = require('./routes/promptTemplateRoutes');

app.use("/api/v1/ai/templates", promptTemplateRoutes);

// Admin Analytics
app.use("/api/v1/admin/analytics", adminAnalyticsRoutes);

// Admin Plans
app.use("/api/v1/admin/plans", adminPlansRoutes);

// Admin Subscriptions
app.use("/api/v1/admin/subscriptions", subscriptionRoutes);

// Admin Wallet
app.use("/api/v1/admin/wallet", adminWalletRoutes);

// Admin Invoices
app.use("/api/v1/admin/invoices", invoiceRoutes);

// Admin Payments
app.use("/api/v1/admin/payments", paymentRoutes);

// Admin Gemini Keys
// Admin Gemini Keys - REMOVED (Legacy)
// const adminGeminiKeysRoutes = require('./routes/adminGeminiKeysRoutes');
// app.use("/api/v1/admin/gemini-keys", adminGeminiKeysRoutes);



// Admin Quota Monitoring
try {

  app.use("/api/v1/admin/quota-monitoring", require('./routes/adminQuotaMonitoringRoutes'));

} catch (error) {
  console.error('❌ [ERROR] Failed to load adminQuotaMonitoringRoutes:', error.message);
}

// System Management
app.use("/api/v1/admin", systemManagementRoutes);

// Wallet Payment
app.use("/api/v1/wallet-payment", walletPaymentRoutes);

// Facebook OAuth
app.use("/api/v1/facebook-oauth", facebookOAuthRoutes);

// Facebook Ads
app.use("/api/v1/facebook-ads", facebookAdsRoutes);


// Inventory

const inventoryRoutes = require('./routes/inventoryRoutes');

app.use("/api/v1/inventory", inventoryRoutes);

// Warehouses
const warehouseRoutes = require('./routes/warehouseRoutes');
app.use("/api/v1/warehouses", warehouseRoutes);

// Priority Settings
const prioritySettingsRoutes = require('./routes/prioritySettingsRoutes');
app.use("/api/v1/priority-settings", prioritySettingsRoutes);

// Upload
const uploadRoutes = require('./routes/uploadRoutes');
app.use("/api/v1/upload", uploadRoutes);

// Proxy
app.use("/api/v1/proxy", proxyRoutes);

// Security
app.use("/api/v1/security", securityRoutes);

// Database Monitor
try {

  const databaseMonitorRoutes = require('./routes/databaseMonitorRoutes');

  app.use("/api/v1/db-monitor", databaseMonitorRoutes);
} catch (error) {
  console.error('❌ [ERROR] Failed to load databaseMonitorRoutes:', error.message);
}

// WooCommerce Routes
app.use("/api/v1/woocommerce", wooCommerceRoutes);

// Import Jobs
app.use("/api/v1/import-jobs", importJobRoutes);

// POS Routes
const posRoutes = require('./routes/pos');
app.use("/api/v1/pos", posRoutes);

// Promotion Settings
const promotionSettingsRoutes = require('./routes/promotionSettingsRoutes');
app.use("/api/v1/promotion-settings", promotionSettingsRoutes);

// Smart Delay
try {

  const smartDelayRoutes = require('./routes/smartDelayRoutes');

  app.use("/api/v1/smart-delay", smartDelayRoutes);
} catch (error) {
  console.error('❌ [ERROR] Failed to load smartDelayRoutes:', error.message);
}

// Landing Page
// FIXME: This route causes a server hang on startup. Temporarily disabled.
// const landingPageRoutes = require('./routes/landingPageRoutes');
// app.use("/api/v1/landing-page", landingPageRoutes);

// Image Studio

const imageStudioRoutes = require('./routes/imageStudioRoutes');

app.use("/api/v1/image-studio", imageStudioRoutes);

// Telegram Settings

const telegramSettingsRoutes = require('./routes/telegramSettingsRoutes');

app.use("/api/v1/telegram-settings", telegramSettingsRoutes);

// Facebook Status

const facebookStatusRoutes = require('./routes/facebookStatusRoutes');

app.use("/api/v1/facebook/status", facebookStatusRoutes);

// Monitoring
try {

  const monitoringRoutes = require('./routes/monitoringRoutes');

  app.use("/api/v1/monitor", monitoringRoutes);
} catch (error) {
  console.error('❌ [ERROR] Failed to load monitoringRoutes:', error.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏪 MARKETPLACE PROTECTED ROUTES (Company Apps & Wallet)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('🏪 [MARKETPLACE] Loading Protected Marketplace routes...');

// Protected Company Apps routes
app.use("/api/v1/my-apps", companyAppsRoutes);
console.log('✅ [MARKETPLACE] Company Apps routes loaded');

// Protected Wallet & Billing routes
app.use("/api/v1/wallet", walletRoutes);
console.log('✅ [MARKETPLACE] Wallet & Billing routes loaded');

// Protected Platform Subscription routes
app.use("/api/v1/platform-subscription", platformSubscriptionRoutes);
console.log('✅ [MARKETPLACE] Platform Subscription routes loaded');

// Super Admin Platform Management routes
app.use("/api/v1/super-admin/platform", superAdminPlatformRoutes);
console.log('✅ [SUPER-ADMIN] Platform Management routes loaded');

// Super Admin Marketplace Management routes
app.use("/api/v1/super-admin/marketplace-management", marketplaceManagementRoutes);
console.log('✅ [SUPER-ADMIN] Marketplace Management routes loaded');

// Start Billing Cron Service
try {
  billingCronService.start();
  console.log('✅ [BILLING-CRON] Billing Cron Service started');
} catch (error) {
  console.error('❌ [BILLING-CRON] Failed to start Billing Cron Service:', error);
}

// Homepage route
app.get('/', (req, res) => {
  res.json({
    message: 'Chat Bot Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Get user roles endpoint
app.get('/api/v1/users/roles', (req, res) => {
  const roles = {
    OWNER: {
      name: 'مالك الشركة',
      description: 'صلاحيات كاملة وغير محدودة',
      permissions: [
        'إدارة المستخدمين',
        'إدارة الأدوار',
        'إدارة المنتجات',
        'إدارة العملاء',
        'إدارة الطلبات',
        'مشاهدة التقارير',
        'إدارة التقارير',
        'إدارة الإعدادات',
        'إدارة التكاملات',
        'إدارة المحادثات',
        'إدارة الخطة والاشتراك'
      ]
    },
    COMPANY_ADMIN: {
      name: 'مدير الشركة',
      description: 'صلاحيات كاملة لإدارة الشركة والمستخدمين',
      permissions: [
        'إدارة المستخدمين',
        'إدارة الأدوار',
        'إدارة المنتجات',
        'إدارة العملاء',
        'إدارة الطلبات',
        'مشاهدة التقارير',
        'إدارة الإعدادات',
        'إدارة التكاملات'
      ]
    },
    MANAGER: {
      name: 'مدير',
      description: 'صلاحيات إدارية محدودة',
      permissions: [
        'إدارة المنتجات',
        'إدارة العملاء',
        'إدارة الطلبات',
        'مشاهدة التقارير'
      ]
    },
    AGENT: {
      name: 'موظف',
      description: 'صلاحيات أساسية للعمل اليومي',
      permissions: [
        'إدارة العملاء',
        'إدارة الطلبات',
        'مشاهدة المنتجات'
      ]
    }
  };

  res.json({
    success: true,
    message: 'تم جلب الأدوار بنجاح',
    data: roles
  });
});

// Get all available permissions endpoint
app.get('/api/v1/permissions', (req, res) => {
  const permissions = {
    'إدارة المستخدمين': {
      key: 'manage_users',
      category: 'إدارة',
      description: 'إضافة وتعديل وحذف المستخدمين'
    },
    'إدارة الأدوار': {
      key: 'manage_roles',
      category: 'إدارة',
      description: 'إنشاء وتعديل الأدوار والصلاحيات'
    },
    'إدارة المنتجات': {
      key: 'manage_products',
      category: 'المنتجات',
      description: 'إضافة وتعديل وحذف المنتجات'
    },
    'مشاهدة المنتجات': {
      key: 'view_products',
      category: 'المنتجات',
      description: 'عرض قائمة المنتجات فقط'
    },
    'إدارة العملاء': {
      key: 'manage_customers',
      category: 'العملاء',
      description: 'إضافة وتعديل وحذف العملاء'
    },
    'مشاهدة العملاء': {
      key: 'view_customers',
      category: 'العملاء',
      description: 'عرض قائمة العملاء فقط'
    },
    'إدارة الطلبات': {
      key: 'manage_orders',
      category: 'الطلبات',
      description: 'إنشاء وتعديل وحذف الطلبات'
    },
    'مشاهدة الطلبات': {
      key: 'view_orders',
      category: 'الطلبات',
      description: 'عرض الطلبات فقط'
    },
    'مشاهدة التقارير': {
      key: 'view_reports',
      category: 'التقارير',
      description: 'الوصول للتقارير والإحصائيات'
    },
    'إدارة التقارير': {
      key: 'manage_reports',
      category: 'التقارير',
      description: 'إنشاء وتخصيص التقارير'
    },
    'إدارة الإعدادات': {
      key: 'manage_settings',
      category: 'الإعدادات',
      description: 'تعديل إعدادات الشركة'
    },
    'إدارة التكاملات': {
      key: 'manage_integrations',
      category: 'التكاملات',
      description: 'إدارة التكاملات مع الأنظمة الخارجية'
    },
    'إدارة المحادثات': {
      key: 'manage_conversations',
      category: 'المحادثات',
      description: 'إدارة المحادثات والرسائل'
    },
    'مشاهدة المحادثات': {
      key: 'view_conversations',
      category: 'المحادثات',
      description: 'عرض المحادثات فقط'
    },
    'إدارة الخطة والاشتراك': {
      key: 'manage_subscription',
      category: 'الإعدادات',
      description: 'ترقية وتجديد الاشتراك وإدارة الفواتير'
    }
  };

  res.json({
    success: true,
    message: 'تم جلب الصلاحيات بنجاح',
    data: permissions
  });
});

// 404 Handler - Must return JSON, not HTML
// Skip 404 for static files (uploads) - let express.static handle them
app.use((req, res, next) => {
  // Skip 404 for uploads - these should be handled by express.static
  if (req.path.startsWith('/uploads')) {
    // If we reach here, the file doesn't exist in either location
    // Log for debugging but still return 404
    console.log(`⚠️ [STATIC] File not found: ${req.path}`);
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `الملف ${req.path} غير موجود`,
      path: req.path
    });
  }

  // Log all 404s for API routes to help debugging
  if (req.path.startsWith('/api')) {
    console.log(`❌ [404] API route not found: ${req.method} ${req.originalUrl}`);
    console.log(`❌ [404] Path: ${req.path}`);
    console.log(`❌ [404] Params:`, req.params);
    console.log(`❌ [404] Query:`, req.query);
  }

  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `المسار ${req.path} غير موجود`,
    path: req.path
  });
});

// Global Error Handler - Must return JSON, not HTML
app.use((err, req, res, next) => {
  console.error('❌ [ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    message: 'حدث خطأ في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// startServer Implementation
async function startServer() {
  console.log('🚀 [SERVER] Initializing stable backend... (File Path: ' + __filename + ')');
  const PORT = process.env.PORT || 3008;

  try {
    // ⚡ CRITICAL: Sequential initialization
    console.log('⏳ [SERVER] Waiting for shared database...');
    await initializeSharedDatabase();
    console.log('✅ [SERVER] Shared database connection established');

    console.log('⏳ [SERVER] Waiting for Postgres database...');
    await initializePostgresDatabase();
    console.log('✅ [SERVER] Postgres database connection established');

    console.log('⏳ [SERVER] Waiting for Telegram Bot...');
    await telegramBotService.initialize();
    console.log('✅ [SERVER] Telegram Bot initialized');

    // Restore WhatsApp Sessions
    console.log('⏳ [SERVER] Restoring WhatsApp sessions...');
    await WhatsAppManager.restoreAllSessions();
    console.log('✅ [SERVER] WhatsApp Sessions Restored');

    // Start Telegram Scheduler
    const { startTelegramScheduler } = require('./cron/telegramScheduler');
    startTelegramScheduler();
    console.log('✅ [SERVER] Telegram Scheduler Started');

    // ONLY listen after everything is ready
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
      🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
      🌟 STABLE SERVER STARTED SUCCESSFULLY!
      📡 Port: ${PORT}
      🌍 Mode: ${process.env.NODE_ENV || 'development'}
      🕒 Time: ${new Date().toLocaleString()}
      🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
      `);

      if (shouldLazyLoad) {
        setTimeout(loadHeavyServices, PERFORMANCE_CONFIG.HEAVY_SERVICES_DELAY * 1000);
      } else {
        loadHeavyServices();
      }
    });

  } catch (error) {
    console.error('❌ [SERVER] FATAL: Server startup failed!');
    console.error('❌ [SERVER] Error:', error.message);
    if (error.stack) console.error(error.stack);

    // Attempt graceful exit for nodemon to restart
    process.exit(1);
  }
}

async function loadHeavyServices() {
  try {
    if (!aiAgentService) aiAgentService = require('./services/aiAgentService');

    // ✅ Pattern Analysis Removed by User Request

    // ✅ Pre-warm AI Settings Cache (Snapshot)
    try {
      if (aiAgentService.getSettingsManager && aiAgentService.getSettingsManager().loadAllCompanySettings) {
        await aiAgentService.getSettingsManager().loadAllCompanySettings();
      }
    } catch (startErr) {
      console.warn('⚠️ [SERVER] Failed to pre-warm AI settings:', startErr.message);
    }

    // ✅ Start Async Log Worker (BullMQ)
    const logWorker = require('./workers/logWorker');
    logWorker.start();

    // ✅ Start Scheduled Orders Checker (runs every hour)
    const scheduledOrderService = require('./services/scheduledOrderService');
    setInterval(async () => {
      try {
        console.log('🔔 [CRON] Running scheduled orders check...');
        await scheduledOrderService.checkAndTransitionScheduledOrders();
        console.log('✅ [CRON] Scheduled orders check completed');
      } catch (error) {
        console.error('❌ [CRON] Error in scheduled orders check:', error);
      }
    }, 60 * 60 * 1000);
    console.log('✅ [SERVER] Scheduled orders cron job started (runs every hour)');

    // ✅ Start Overdue Task Automation (runs every hour)
    const overdueTaskAutomationService = require('./services/overdueTaskAutomationService');
    setInterval(async () => {
      try {
        console.log('🤖 [CRON] Running overdue task automation...');
        await overdueTaskAutomationService.runcheck();
        console.log('✅ [CRON] Overdue task automation completed');
      } catch (error) {
        console.error('❌ [CRON] Error in overdue task automation:', error);
      }
    }, 60 * 60 * 1000); // 1 Hour
    console.log('✅ [SERVER] Overdue Task Automation started (runs every hour)');

    // ✅ Start WhatsApp Notification Queue Processor (runs every 2 minutes)
    setInterval(async () => {
      try {
        await WhatsAppNotificationService.processNotificationQueue();
      } catch (error) {
        console.error('❌ [CRON] Error in WhatsApp notification queue:', error);
      }
    }, 2 * 60 * 1000);
    console.log('✅ [SERVER] WhatsApp Notification Queue processor started (runs every 2 minutes)');

    console.log('✅ [SERVER] Delayed services started');
  } catch (err) {
    console.error('❌ [SERVER] Error loading delayed services:', err);
  }
}

// Global Exception Handlers
process.on('uncaughtException', (err) => {
  console.error('❌ FATAL EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ FATAL REJECTION:', reason);
});

startServer(); // Restart triggered 3

module.exports = app;
// Force restart trigger at 2026-01-25 14:45
