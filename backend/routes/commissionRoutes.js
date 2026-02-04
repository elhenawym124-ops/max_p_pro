const express = require('express');
const router = express.Router();
const commissionService = require('../services/commissionService');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * قائمة العمولات (للإدارة)
 */
router.get('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض العمولات'
      });
    }

    const companyId = req.user.companyId;
    const { startDate, endDate, affiliateId, merchantId, status, type, limit = 50, offset = 0 } = req.query;

    const result = await commissionService.getCommissionStats(companyId, {
      startDate,
      endDate,
      affiliateId,
      merchantId
    });

    // تطبيق الفلترة حسب الحالة والنوع
    let commissions = result.commissions;
    if (status) {
      commissions = commissions.filter(c => c.status === status);
    }
    if (type) {
      commissions = commissions.filter(c => c.type === type);
    }

    // تطبيق pagination
    const paginatedCommissions = commissions.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        commissions: paginatedCommissions,
        stats: result.stats,
        total: commissions.length
      }
    });
  } catch (error) {
    console.error('❌ [COMMISSION-ROUTES] Error getting commissions:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب العمولات'
    });
  }
});

/**
 * تحديث حالة العمولة
 */
router.put('/:id/status', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل العمولات'
      });
    }

    const { id } = req.params;
    const { status } = req.body;
    const prisma = getSharedPrismaClient();

    const commission = await prisma.commission.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      message: 'تم تحديث حالة العمولة بنجاح',
      data: commission
    });
  } catch (error) {
    console.error('❌ [COMMISSION-ROUTES] Error updating commission:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث العمولة'
    });
  }
});

/**
 * إحصائيات العمولات
 */
router.get('/stats', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض الإحصائيات'
      });
    }

    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;

    const result = await commissionService.getCommissionStats(companyId, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: result.stats
    });
  } catch (error) {
    console.error('❌ [COMMISSION-ROUTES] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات'
    });
  }
});

module.exports = router;
