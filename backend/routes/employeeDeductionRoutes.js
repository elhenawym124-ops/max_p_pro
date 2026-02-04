/**
 * 💰 Employee Deduction Routes
 * مسارات الخصومات للموظفين
 */
 
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const deductionController = require('../controller/deductionController');

// Employee Routes - عرض الخصومات الخاصة بالموظف
router.get('/my-deductions', requireAuth, deductionController.getMyDeductions);
router.get('/my-deductions/stats', requireAuth, deductionController.getMyDeductionStats);

module.exports = router;
