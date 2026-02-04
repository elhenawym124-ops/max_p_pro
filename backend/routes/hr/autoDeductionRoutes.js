const express = require('express');
const router = express.Router();
const autoDeductionController = require('../../controller/hr/autoDeductionController');
const { authenticate } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');

/**
 * Auto Deduction Routes
 * مسارات الخصومات التلقائية
 */

// جميع المسارات تحتاج مصادقة
router.use(authenticate);

// ==================== إعدادات الخصومات ====================

// جلب إعدادات الخصومات
router.get(
  '/settings',
  checkPermission('hr.settings.view'),
  autoDeductionController.getSettings
);

// تحديث إعدادات الخصومات
router.put(
  '/settings',
  checkPermission('hr.settings.edit'),
  autoDeductionController.updateSettings
);

// ==================== رصيد التسامح ====================

// جلب رصيد التسامح لموظف
router.get(
  '/grace-balance/:employeeId',
  checkPermission('hr.attendance.view'),
  autoDeductionController.getGraceBalance
);

// جلب تنبيهات رصيد التسامح
router.get(
  '/alerts',
  checkPermission('hr.attendance.view'),
  autoDeductionController.getGraceBalanceAlerts
);

// ==================== الخصومات ====================

// جلب قائمة الخصومات
router.get(
  '/',
  checkPermission('hr.deductions.view'),
  autoDeductionController.getDeductions
);

// جلب تفاصيل خصم معين
router.get(
  '/:id',
  checkPermission('hr.deductions.view'),
  autoDeductionController.getDeductionById
);

// إلغاء خصم (للظروف الطارئة)
router.post(
  '/:id/cancel',
  checkPermission('hr.deductions.cancel'),
  autoDeductionController.cancelDeduction
);

// ==================== التقارير ====================

// جلب تقرير الخصومات الشهرية للموظف
router.get(
  '/report/:employeeId',
  checkPermission('hr.reports.view'),
  autoDeductionController.getEmployeeReport
);

// جلب إحصائيات الخصومات للشركة
router.get(
  '/stats/company',
  checkPermission('hr.reports.view'),
  autoDeductionController.getCompanyStats
);

// ==================== الإشعارات ====================

// جلب إشعارات الخصومات للموظف الحالي
router.get(
  '/notifications/my',
  autoDeductionController.getNotifications
);

// تحديد إشعار كمقروء
router.put(
  '/notifications/:id/read',
  autoDeductionController.markNotificationAsRead
);

module.exports = router;
