/**
 * 🕐 Lateness Routes
 * مسارات إدارة المرونة والخصومات التلقائية
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const latenessController = require('../controller/latenessController');

// Employee routes - الموظف يشوف رصيده الخاص
router.get('/balance', requireAuth, latenessController.getMyBalance);
router.get('/auto-deductions', requireAuth, latenessController.getAutoDeductions);
router.get('/report', requireAuth, latenessController.getMonthlyReport);

// HR/Admin routes - الإدارة تدير إعدادات الموظفين
router.get('/balance/:employeeId', requireAuth, latenessController.getEmployeeBalance);
router.get('/settings/:employeeId', requireAuth, latenessController.getEmployeeSettings);
router.put('/settings/:employeeId', requireAuth, latenessController.updateEmployeeSettings);
router.get('/stats', requireAuth, latenessController.getCompanyStats);
router.post('/cancel-deduction/:deductionId', requireAuth, latenessController.cancelAutoDeduction);

module.exports = router;
