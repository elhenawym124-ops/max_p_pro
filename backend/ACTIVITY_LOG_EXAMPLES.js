/**
 * 📊 أمثلة عملية لتطبيق Activity Log Middleware
 * 
 * هذا الملف يحتوي على أمثلة لكيفية تطبيق الـ Middleware على Routes موجودة
 * يمكنك نسخ هذه الأمثلة وتطبيقها على الـ Routes الخاصة بك
 */

const { 
  logAuth, 
  logAds, 
  logConversation, 
  logBilling, 
  logSupport, 
  logFile, 
  logUser, 
  logSettings,
  logCompany,
  logActivity 
} = require('./middleware/activityLogger');

// ============================================
// 1. أمثلة لـ Authentication Routes
// ============================================

// في authRoutes.js
/*
const router = require('express').Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// تسجيل الدخول
router.post('/login', 
  logAuth('LOGIN', 'تسجيل دخول إلى النظام'), 
  authController.login
);

// تسجيل الخروج
router.post('/logout', 
  protect, 
  logAuth('LOGOUT', 'تسجيل خروج من النظام'), 
  authController.logout
);

// تغيير كلمة المرور
router.put('/change-password', 
  protect, 
  logAuth('UPDATE', 'تغيير كلمة المرور'), 
  authController.changePassword
);

// إعادة تعيين كلمة المرور
router.post('/reset-password', 
  logAuth('UPDATE', 'إعادة تعيين كلمة المرور'), 
  authController.resetPassword
);
*/

// ============================================
// 2. أمثلة لـ Facebook Ads Routes
// ============================================

// في facebookAdsRoutes.js
/*
const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');

// ===== Campaigns =====
router.post('/campaigns', 
  protect, 
  logAds('CREATE', 'Campaign'), 
  createCampaign
);

router.put('/campaigns/:id', 
  protect, 
  logAds('UPDATE', 'Campaign'), 
  updateCampaign
);

router.delete('/campaigns/:id', 
  protect, 
  logAds('DELETE', 'Campaign'), 
  deleteCampaign
);

router.post('/campaigns/:id/activate', 
  protect, 
  logAds('ACTIVATE', 'Campaign'), 
  activateCampaign
);

router.post('/campaigns/:id/deactivate', 
  protect, 
  logAds('DEACTIVATE', 'Campaign'), 
  deactivateCampaign
);

// ===== Ad Sets =====
router.post('/adsets', 
  protect, 
  logAds('CREATE', 'AdSet'), 
  createAdSet
);

router.put('/adsets/:id', 
  protect, 
  logAds('UPDATE', 'AdSet'), 
  updateAdSet
);

router.delete('/adsets/:id', 
  protect, 
  logAds('DELETE', 'AdSet'), 
  deleteAdSet
);

// ===== Ads =====
router.post('/ads', 
  protect, 
  logAds('CREATE', 'Ad'), 
  createAd
);

router.put('/ads/:id', 
  protect, 
  logAds('UPDATE', 'Ad'), 
  updateAd
);

router.delete('/ads/:id', 
  protect, 
  logAds('DELETE', 'Ad'), 
  deleteAd
);
*/

// ============================================
// 3. أمثلة لـ Conversation Routes
// ============================================

// في conversationRoutes.js
/*
router.post('/conversations', 
  protect, 
  logConversation('CREATE'), 
  createConversation
);

router.post('/conversations/:id/messages', 
  protect, 
  logConversation('SEND'), 
  sendMessage
);

router.put('/conversations/:id/ai/activate', 
  protect, 
  logConversation('ACTIVATE'), 
  activateAI
);

router.put('/conversations/:id/ai/deactivate', 
  protect, 
  logConversation('DEACTIVATE'), 
  deactivateAI
);

router.put('/conversations/:id/settings', 
  protect, 
  logConversation('UPDATE'), 
  updateConversationSettings
);
*/

// ============================================
// 4. أمثلة لـ Payment/Billing Routes
// ============================================

// في paymentRoutes.js
/*
router.post('/payments', 
  protect, 
  logBilling('CREATE'), 
  createPayment
);

router.post('/wallet/recharge', 
  protect, 
  logBilling('CREATE'), 
  rechargeWallet
);

router.get('/invoices/:id', 
  protect, 
  logBilling('VIEW'), 
  getInvoice
);

router.get('/invoices/:id/export', 
  protect, 
  logBilling('EXPORT'), 
  exportInvoice
);

router.put('/payment-methods', 
  protect, 
  logBilling('UPDATE'), 
  updatePaymentMethod
);
*/

// ============================================
// 5. أمثلة لـ Support Routes
// ============================================

// في supportRoutes.js
/*
router.post('/tickets', 
  protect, 
  logSupport('CREATE', 'Ticket'), 
  createTicket
);

router.put('/tickets/:id', 
  protect, 
  logSupport('UPDATE', 'Ticket'), 
  updateTicket
);

router.post('/tickets/:id/reply', 
  protect, 
  logSupport('SEND', 'Ticket'), 
  replyToTicket
);

router.put('/tickets/:id/close', 
  protect, 
  logSupport('APPROVE', 'Ticket'), 
  closeTicket
);

router.post('/faq', 
  protect, 
  logSupport('CREATE', 'FAQ'), 
  createFAQ
);

router.put('/faq/:id', 
  protect, 
  logSupport('UPDATE', 'FAQ'), 
  updateFAQ
);
*/

// ============================================
// 6. أمثلة لـ User Management Routes
// ============================================

// في userRoutes.js أو companyRoutes.js
/*
router.post('/users', 
  protect, 
  logUser('CREATE'), 
  createUser
);

router.put('/users/:id', 
  protect, 
  logUser('UPDATE'), 
  updateUser
);

router.delete('/users/:id', 
  protect, 
  logUser('DELETE'), 
  deleteUser
);

router.put('/users/:id/activate', 
  protect, 
  logUser('ACTIVATE'), 
  activateUser
);

router.put('/users/:id/deactivate', 
  protect, 
  logUser('DEACTIVATE'), 
  deactivateUser
);

router.put('/users/:id/role', 
  protect, 
  logUser('UPDATE'), 
  updateUserRole
);
*/

// ============================================
// 7. أمثلة لـ Settings Routes
// ============================================

// في settingsRoutes.js
/*
router.put('/settings', 
  protect, 
  logSettings('UPDATE'), 
  updateSettings
);

router.put('/settings/company', 
  protect, 
  logCompany('UPDATE'), 
  updateCompanySettings
);

router.put('/settings/ai', 
  protect, 
  logSettings('UPDATE'), 
  updateAISettings
);

router.put('/settings/notifications', 
  protect, 
  logSettings('UPDATE'), 
  updateNotificationSettings
);
*/

// ============================================
// 8. أمثلة لـ File Upload Routes
// ============================================

// في fileRoutes.js أو uploadRoutes.js
/*
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/upload', 
  protect, 
  upload.single('file'), 
  logFile('UPLOAD'), 
  uploadFile
);

router.get('/download/:id', 
  protect, 
  logFile('DOWNLOAD'), 
  downloadFile
);

router.delete('/files/:id', 
  protect, 
  logFile('DELETE'), 
  deleteFile
);
*/

// ============================================
// 9. مثال متقدم - Custom Middleware
// ============================================

// مثال لتسجيل نشاط مخصص مع بيانات إضافية
/*
router.post('/products', 
  protect, 
  logActivity({
    category: 'PRODUCTS',
    action: 'CREATE',
    targetType: 'Product',
    severity: 'MEDIUM',
    description: (req, res) => {
      return `إنشاء منتج جديد: ${req.body.name}`;
    },
    getTargetId: (req, res) => {
      return res._id; // من الـ response بعد الإنشاء
    },
    getTargetName: (req, res) => {
      return res.name;
    },
    getMetadata: (req, res) => {
      return {
        price: req.body.price,
        category: req.body.category,
        stock: req.body.stock,
        sku: req.body.sku
      };
    },
    tags: ['product', 'inventory', 'create']
  }), 
  createProduct
);
*/

// ============================================
// 10. مثال للتسجيل اليدوي في Controller
// ============================================

/*
const ActivityLog = require('../models/ActivityLog');

async function deleteImportantData(req, res) {
  try {
    const data = await SomeModel.findById(req.params.id);
    
    if (!data) {
      return res.status(404).json({ error: 'البيانات غير موجودة' });
    }
    
    // حذف البيانات
    await data.remove();
    
    // تسجيل يدوي للنشاط الحرج
    await ActivityLog.log({
      userId: req.user._id,
      companyId: req.user.companyId,
      category: 'DATA',
      action: 'DELETE',
      description: `حذف بيانات حساسة: ${data.name}`,
      severity: 'CRITICAL',
      targetType: 'Data',
      targetId: req.params.id,
      targetName: data.name,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        reason: req.body.reason || 'غير محدد',
        deletedData: {
          name: data.name,
          type: data.type,
          createdAt: data.createdAt
        }
      },
      tags: ['critical', 'delete', 'sensitive']
    });
    
    res.json({ 
      success: true, 
      message: 'تم حذف البيانات بنجاح' 
    });
    
  } catch (error) {
    // تسجيل الفشل
    await ActivityLog.log({
      userId: req.user._id,
      companyId: req.user.companyId,
      category: 'DATA',
      action: 'DELETE',
      description: `فشل حذف البيانات`,
      severity: 'HIGH',
      isSuccess: false,
      errorMessage: error.message,
      metadata: {
        ipAddress: req.ip,
        targetId: req.params.id
      }
    });
    
    res.status(500).json({ error: error.message });
  }
}
*/

// ============================================
// 11. مثال لتسجيل نشاطات متعددة في عملية واحدة
// ============================================

/*
async function bulkUpdateProducts(req, res) {
  try {
    const { productIds, updates } = req.body;
    
    // تنفيذ التحديثات
    const results = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updates }
    );
    
    // تسجيل النشاط الجماعي
    await ActivityLog.log({
      userId: req.user._id,
      companyId: req.user.companyId,
      category: 'PRODUCTS',
      action: 'UPDATE',
      description: `تحديث جماعي لـ ${productIds.length} منتج`,
      severity: 'HIGH',
      metadata: {
        ipAddress: req.ip,
        productsCount: productIds.length,
        updates: updates,
        modifiedCount: results.modifiedCount
      },
      tags: ['bulk', 'products', 'update']
    });
    
    res.json({ 
      success: true, 
      modifiedCount: results.modifiedCount 
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
*/

// ============================================
// 12. مثال لتسجيل نشاطات الـ Broadcast
// ============================================

/*
router.post('/broadcast', 
  protect, 
  logActivity({
    category: 'CONVERSATIONS',
    action: 'SEND',
    targetType: 'Broadcast',
    severity: 'MEDIUM',
    description: (req, res) => {
      return `إرسال رسالة جماعية إلى ${req.body.recipientsCount} مستلم`;
    },
    getMetadata: (req, res) => {
      return {
        recipientsCount: req.body.recipientsCount,
        messageType: req.body.messageType,
        scheduledAt: req.body.scheduledAt
      };
    },
    tags: ['broadcast', 'bulk-message']
  }), 
  sendBroadcast
);
*/

// ============================================
// 13. مثال لتسجيل نشاطات الـ Orders
// ============================================

/*
router.post('/orders', 
  protect, 
  logActivity({
    category: 'ORDERS',
    action: 'CREATE',
    targetType: 'Order',
    severity: 'MEDIUM',
    description: (req, res) => {
      return `إنشاء طلب جديد بقيمة ${res.total} جنيه`;
    },
    getTargetId: (req, res) => res._id,
    getMetadata: (req, res) => {
      return {
        total: res.total,
        itemsCount: res.items.length,
        paymentMethod: res.paymentMethod,
        shippingMethod: res.shippingMethod
      };
    },
    tags: ['order', 'sales']
  }), 
  createOrder
);

router.put('/orders/:id/status', 
  protect, 
  logActivity({
    category: 'ORDERS',
    action: 'UPDATE',
    targetType: 'Order',
    severity: 'MEDIUM',
    description: (req, res) => {
      return `تغيير حالة الطلب إلى: ${req.body.status}`;
    },
    getTargetId: (req, res) => req.params.id,
    getMetadata: (req, res) => {
      return {
        oldStatus: res.oldStatus,
        newStatus: req.body.status,
        reason: req.body.reason
      };
    },
    tags: ['order', 'status-change']
  }), 
  updateOrderStatus
);
*/

// ============================================
// ملاحظات مهمة:
// ============================================

/*
1. الـ Middleware يجب أن يكون قبل الـ Controller مباشرة
2. استخدم protect middleware قبل logActivity للتأكد من وجود user
3. الـ description يمكن أن يكون string أو function
4. getTargetId و getTargetName يستقبلون (req, res) بعد تنفيذ الـ Controller
5. severity يحدد مستوى الخطورة: LOW, MEDIUM, HIGH, CRITICAL
6. tags مفيدة للبحث والفلترة لاحقاً
7. لا تسجل بيانات حساسة (كلمات مرور، tokens، بيانات بطاقات)
8. استخدم التسجيل اليدوي للعمليات المعقدة أو الحرجة
*/

module.exports = {
  // يمكنك تصدير أي دوال مساعدة هنا إذا لزم الأمر
};
