const express = require('express');
const router = express.Router();
const activityLogController = require('../controller/activityLogController');
const { requireAuth: protect } = require('../middleware/auth');

/**
 * Routes للنشاطات الشخصية (للمستخدم)
 */

// الحصول على نشاطاتي
router.get('/my-activities', protect, activityLogController.getMyActivities);

// الحصول على إحصائيات نشاطاتي
router.get('/my-stats', protect, activityLogController.getMyStats);

// الحصول على تفاصيل نشاط محدد
router.get('/:id', protect, activityLogController.getActivityById);

/**
 * Routes لنشاطات الشركة (للمديرين فقط)
 */

// الحصول على نشاطات الشركة
router.get('/company/activities', protect, activityLogController.getCompanyActivities);

// الحصول على إحصائيات الشركة
router.get('/company/stats', protect, activityLogController.getCompanyStats);

// الحصول على نشاطات مستخدم محدد
router.get('/user/:userId', protect, activityLogController.getUserActivities);

/**
 * Routes للتصدير والإدارة
 */

// تصدير النشاطات
router.get('/export/csv', protect, activityLogController.exportActivities);

// حذف النشاطات القديمة (للسوبر أدمن فقط)
router.delete('/cleanup', protect, activityLogController.cleanupOldActivities);

module.exports = router;
