/**
 * AI Notifications Routes
 * مسارات إشعارات أخطاء الذكاء الاصطناعي
 */

const express = require('express');
const router = express.Router();
const aiNotificationsController = require('../controller/aiNotificationsController');
const { authenticateToken } = require('../utils/verifyToken');

// جميع المسارات تتطلب مصادقة
router.use(authenticateToken);

// الحصول على جميع الإشعارات
router.get('/', aiNotificationsController.getNotifications);

// الحصول على عدد الإشعارات غير المقروءة
router.get('/unread-count', aiNotificationsController.getUnreadCount);

// تعليم إشعار كمقروء
router.patch('/:id/read', aiNotificationsController.markAsRead);

// تعليم جميع الإشعارات كمقروءة
router.post('/mark-all-read', aiNotificationsController.markAllAsRead);

// الحصول على إحصائيات الفشل
router.get('/failure-stats', aiNotificationsController.getFailureStats);

// حذف الإشعارات القديمة (للمسؤولين فقط)
router.post('/cleanup', aiNotificationsController.cleanupOldNotifications);

module.exports = router;
