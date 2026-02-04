/**
 * 🕐 Lateness Controller
 * التحكم في إعدادات المرونة والخصومات التلقائية
 */

const latenessCalculationService = require('../services/hr/latenessCalculationService');
const autoDeductionService = require('../services/hr/autoDeductionService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * الحصول على رصيد المرونة المتبقي للموظف
 * GET /api/v1/hr/lateness/balance
 */
async function getMyBalance(req, res) {
  try {
    const { id: userId } = req.user;
    
    const balance = await latenessCalculationService.getRemainingGraceMinutes(userId);
    
    res.json({ success: true, balance });
  } catch (error) {
    console.error('❌ Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الرصيد'
    });
  }
}

/**
 * الحصول على رصيد المرونة لموظف محدد (للإدارة)
 * GET /api/v1/hr/lateness/balance/:employeeId
 */
async function getEmployeeBalance(req, res) {
  try {
    const { employeeId } = req.params;
    
    const balance = await latenessCalculationService.getRemainingGraceMinutes(employeeId);
    
    res.json({ success: true, balance });
  } catch (error) {
    console.error('❌ Error getting employee balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الرصيد'
    });
  }
}

/**
 * الحصول على تقرير التأخير الشهري
 * GET /api/v1/hr/lateness/report
 */
async function getMonthlyReport(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { employeeId, month, year } = req.query;
    
    const targetEmployeeId = employeeId || userId;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const report = await latenessCalculationService.getMonthlyLatenessReport(
      companyId,
      targetEmployeeId,
      targetMonth,
      targetYear
    );
    
    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Error getting monthly report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب التقرير'
    });
  }
}

/**
 * تحديث إعدادات المرونة للموظف
 * PUT /api/v1/hr/lateness/settings/:employeeId
 */
async function updateEmployeeSettings(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.params;
    const { monthlyGraceMinutes, maxDailyLateMinutes, lateDeductionRate, enableAutoDeduction } = req.body;
    
    const prisma = getSharedPrismaClient();
    
    // التحقق من وجود الموظف
    const employee = await prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId
      }
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'الموظف غير موجود'
      });
    }
    
    // تحديث الإعدادات
    const updateData = {};
    if (monthlyGraceMinutes !== undefined) updateData.monthlyGraceMinutes = parseInt(monthlyGraceMinutes);
    if (maxDailyLateMinutes !== undefined) updateData.maxDailyLateMinutes = parseInt(maxDailyLateMinutes);
    if (lateDeductionRate !== undefined) updateData.lateDeductionRate = parseFloat(lateDeductionRate);
    if (enableAutoDeduction !== undefined) updateData.enableAutoDeduction = enableAutoDeduction;
    
    const updated = await prisma.user.update({
      where: { id: employeeId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        monthlyGraceMinutes: true,
        maxDailyLateMinutes: true,
        lateDeductionRate: true,
        enableAutoDeduction: true
      }
    });
    
    res.json({ success: true, employee: updated });
  } catch (error) {
    console.error('❌ Error updating employee settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث الإعدادات'
    });
  }
}

/**
 * الحصول على إعدادات المرونة للموظف
 * GET /api/v1/hr/lateness/settings/:employeeId
 */
async function getEmployeeSettings(req, res) {
  try {
    const { companyId } = req.user;
    const { employeeId } = req.params;
    
    const prisma = getSharedPrismaClient();
    
    const employee = await prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        monthlyGraceMinutes: true,
        maxDailyLateMinutes: true,
        lateDeductionRate: true,
        enableAutoDeduction: true
      }
    });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'الموظف غير موجود'
      });
    }
    
    res.json({ success: true, employee });
  } catch (error) {
    console.error('❌ Error getting employee settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الإعدادات'
    });
  }
}

/**
 * الحصول على الخصومات التلقائية للموظف
 * GET /api/v1/hr/lateness/auto-deductions
 */
async function getAutoDeductions(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { employeeId, month, year } = req.query;
    
    const targetEmployeeId = employeeId || userId;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const result = await autoDeductionService.getEmployeeAutoDeductions(
      companyId,
      targetEmployeeId,
      targetMonth,
      targetYear
    );
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Error getting auto deductions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الخصومات'
    });
  }
}

/**
 * إحصائيات الخصومات التلقائية للشركة
 * GET /api/v1/hr/lateness/stats
 */
async function getCompanyStats(req, res) {
  try {
    const { companyId } = req.user;
    const { month, year } = req.query;
    
    const targetMonth = month ? parseInt(month) : undefined;
    const targetYear = year ? parseInt(year) : undefined;
    
    const stats = await autoDeductionService.getCompanyAutoDeductionStats(
      companyId,
      targetMonth,
      targetYear
    );
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error getting company stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الإحصائيات'
    });
  }
}

/**
 * إلغاء خصم تلقائي
 * POST /api/v1/hr/lateness/cancel-deduction/:deductionId
 */
async function cancelAutoDeduction(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { deductionId } = req.params;
    const { reason } = req.body;
    
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال سبب الإلغاء (5 أحرف على الأقل)'
      });
    }
    
    const cancelled = await autoDeductionService.cancelAutoDeduction(
      companyId,
      deductionId,
      userId,
      reason
    );
    
    res.json({ success: true, deduction: cancelled });
  } catch (error) {
    console.error('❌ Error cancelling auto deduction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إلغاء الخصم'
    });
  }
}

module.exports = {
  getMyBalance,
  getEmployeeBalance,
  getMonthlyReport,
  updateEmployeeSettings,
  getEmployeeSettings,
  getAutoDeductions,
  getCompanyStats,
  cancelAutoDeduction
};
