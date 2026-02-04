/**
 * 🔔 WhatsApp Notification Routes
 * مسارات إشعارات WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappNotificationController = require('../controller/whatsappNotificationController');
const { requireAuth } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ إعدادات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب إعدادات الإشعارات
router.get('/settings', requireAuth, whatsappNotificationController.getNotificationSettings);

// تحديث إعدادات الإشعارات
router.put('/settings', requireAuth, whatsappNotificationController.updateNotificationSettings);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 القوالب
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع القوالب
router.get('/templates', requireAuth, whatsappNotificationController.getTemplates);

// جلب قالب واحد
router.get('/templates/:id', requireAuth, whatsappNotificationController.getTemplate);

// إنشاء قالب جديد
router.post('/templates', requireAuth, whatsappNotificationController.createTemplate);

// تحديث قالب
router.put('/templates/:id', requireAuth, whatsappNotificationController.updateTemplate);

// حذف قالب
router.delete('/templates/:id', requireAuth, whatsappNotificationController.deleteTemplate);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 السجلات والإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب سجل الإشعارات
router.get('/logs', requireAuth, whatsappNotificationController.getNotificationLogs);

// جلب إحصائيات الإشعارات
router.get('/stats', requireAuth, whatsappNotificationController.getNotificationStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 الإرسال
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال إشعار يدوي
router.post('/send', requireAuth, whatsappNotificationController.sendManualNotification);

// إرسال إشعار اختباري
router.post('/test', requireAuth, whatsappNotificationController.sendTestNotification);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 تفضيلات العملاء
// ═══════════════════════════════════════════════════════════════════════════════

// جلب تفضيلات العميل
router.get('/preferences/customer/:customerId', requireAuth, whatsappNotificationController.getCustomerPreferences);

// تحديث تفضيلات العميل
router.put('/preferences/customer/:customerId', requireAuth, whatsappNotificationController.updateCustomerPreferences);

module.exports = router;
