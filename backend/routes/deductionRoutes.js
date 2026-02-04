/**
 * 💰 Deduction Routes
 * مسارات الخصومات اليدوية
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const deductionController = require('../controller/deductionController');

const { handleHRError } = require('../utils/hrErrors');

console.log('🔧 [DEDUCTION-ROUTES] Loading deduction routes...');
console.log('🔧 [DEDUCTION-ROUTES] Controller functions:', Object.keys(deductionController));

// HR Routes - إدارة الخصومات
router.post('/', requireAuth, deductionController.createDeduction);
router.get('/', requireAuth, deductionController.getDeductions);
router.get('/stats', requireAuth, deductionController.getDeductionStats);
router.get('/:id', requireAuth, deductionController.getDeductionById);
router.put('/:id', requireAuth, deductionController.updateDeduction);
router.post('/:id/approve', requireAuth, deductionController.approveDeduction);
router.post('/:id/reject', requireAuth, deductionController.rejectDeduction);
router.delete('/:id', requireAuth, deductionController.deleteDeduction);

// Error Handler
router.use(handleHRError);

module.exports = router;
