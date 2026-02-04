/**
 * 💰 Deduction Controller
 * التحكم في الخصومات اليدوية
 */

const deductionService = require('../services/hr/deductionService');

/**
 * إنشاء خصم جديد
 * POST /api/v1/hr/deductions
 */
async function createDeduction(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    console.log('📥 [Deduction] Creating deduction:', JSON.stringify(req.body, null, 2));
    console.log('📥 [Deduction] User info:', { companyId, userId });

    const deduction = await deductionService.createDeduction(companyId, userId, req.body);

    console.log('✅ [Deduction] Created successfully:', deduction.id);
    res.status(201).json({ success: true, deduction });
  } catch (error) {
    console.error('❌ Error creating deduction:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errors: error.errors,
      stack: error.stack
    });

    let statusCode = 500;
    let errorMessage = error.message || 'حدث خطأ أثناء إنشاء الخصم';

    if (error.code === 'VALIDATION_ERROR') {
      statusCode = 400;
    } else if (error.code === 'NOT_FOUND') {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR',
      errors: error.errors || undefined
    });
  }
}

/**
 * جلب جميع الخصومات
 * GET /api/v1/hr/deductions
 */
async function getDeductions(req, res) {
  try {
    console.log('📥 [Deduction] Getting deductions for company:', req.user?.companyId);
    const { companyId } = req.user;
    const filters = {
      employeeId: req.query.employeeId,
      status: req.query.status,
      type: req.query.type,
      month: req.query.month,
      year: req.query.year
    };

    console.log('📥 [Deduction] Filters:', filters);
    const deductions = await deductionService.getDeductions(companyId, filters);
    console.log('✅ [Deduction] Found deductions:', deductions.length);

    res.json({ success: true, deductions });
  } catch (error) {
    console.error('❌ FATAL [Deduction] Error fetching deductions:', error);
    console.error('❌ FATAL [Deduction] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الخصومات',
      details: error.stack,
      debug: 'Controller caught error'
    });
  }
}

/**
 * جلب خصم واحد
 * GET /api/v1/hr/deductions/:id
 */
async function getDeductionById(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const deduction = await deductionService.getDeductionById(companyId, id);

    res.json({ success: true, deduction });
  } catch (error) {
    console.error('❌ Error fetching deduction:', error);

    const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الخصم'
    });
  }
}

/**
 * تحديث خصم
 * PUT /api/v1/hr/deductions/:id
 */
async function updateDeduction(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const deduction = await deductionService.updateDeduction(companyId, id, req.body);

    res.json({ success: true, deduction });
  } catch (error) {
    console.error('❌ Error updating deduction:', error);

    let statusCode = 500;
    if (error.code === 'NOT_FOUND') statusCode = 404;
    if (error.code === 'VALIDATION_ERROR') statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث الخصم',
      errors: error.errors || undefined
    });
  }
}

/**
 * الموافقة على خصم
 * POST /api/v1/hr/deductions/:id/approve
 */
async function approveDeduction(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;

    const deduction = await deductionService.approveDeduction(companyId, id, userId);

    res.json({ success: true, deduction });
  } catch (error) {
    console.error('❌ Error approving deduction:', error);

    let statusCode = 500;
    if (error.code === 'NOT_FOUND') statusCode = 404;
    if (error.code === 'VALIDATION_ERROR') statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء الموافقة على الخصم'
    });
  }
}

/**
 * رفض خصم
 * POST /api/v1/hr/deductions/:id/reject
 */
async function rejectDeduction(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    const deduction = await deductionService.rejectDeduction(companyId, id, userId, reason);

    res.json({ success: true, deduction });
  } catch (error) {
    console.error('❌ Error rejecting deduction:', error);

    let statusCode = 500;
    if (error.code === 'NOT_FOUND') statusCode = 404;
    if (error.code === 'VALIDATION_ERROR') statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء رفض الخصم'
    });
  }
}

/**
 * حذف خصم
 * DELETE /api/v1/hr/deductions/:id
 */
async function deleteDeduction(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    await deductionService.deleteDeduction(companyId, id);

    res.json({ success: true, message: 'تم حذف الخصم بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting deduction:', error);

    let statusCode = 500;
    if (error.code === 'NOT_FOUND') statusCode = 404;
    if (error.code === 'VALIDATION_ERROR') statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء حذف الخصم'
    });
  }
}

/**
 * جلب إحصائيات الخصومات
 * GET /api/v1/hr/deductions/stats
 */
async function getDeductionStats(req, res) {
  try {
    const { companyId } = req.user;
    const filters = {
      employeeId: req.query.employeeId,
      month: req.query.month,
      year: req.query.year
    };

    const stats = await deductionService.getDeductionStats(companyId, filters);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ FATAL [DeductionStats] Error fetching deduction stats:', error);
    console.error('❌ FATAL [DeductionStats] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الإحصائيات',
      details: error.stack
    });
  }
}

/**
 * جلب خصومات الموظف الحالي (للموظفين)
 * GET /api/v1/employee/my-deductions
 */
async function getMyDeductions(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const filters = {
      employeeId: userId,
      status: req.query.status,
      type: req.query.type,
      month: req.query.month,
      year: req.query.year
    };

    const deductions = await deductionService.getDeductions(companyId, filters);

    res.json({ success: true, deductions });
  } catch (error) {
    console.error('❌ Error fetching my deductions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الخصومات'
    });
  }
}

/**
 * جلب إحصائيات خصومات الموظف الحالي
 * GET /api/v1/employee/my-deductions/stats
 */
async function getMyDeductionStats(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const filters = {
      employeeId: userId,
      month: req.query.month,
      year: req.query.year
    };

    const stats = await deductionService.getDeductionStats(companyId, filters);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error fetching my deduction stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الإحصائيات'
    });
  }
}

module.exports = {
  createDeduction,
  getDeductions,
  getDeductionById,
  updateDeduction,
  approveDeduction,
  rejectDeduction,
  deleteDeduction,
  getDeductionStats,
  getMyDeductions,
  getMyDeductionStats
};
