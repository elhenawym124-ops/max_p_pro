const express = require('express');
const router = express.Router();
const commissionService = require('../services/commissionService');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * إجمالي إيرادات المنصة
 */
router.get('/revenue', verifyToken.authenticateToken, async (req, res) => {
  try {
    // فقط SUPER_ADMIN
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض إيرادات المنصة'
      });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const where = {
      type: 'PLATFORM'
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            createdAt: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const totalRevenue = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: commissions.length,
        commissions
      }
    });
  } catch (error) {
    console.error('❌ [PLATFORM-REVENUE] Error getting revenue:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإيرادات'
    });
  }
});

/**
 * تفصيل الإيرادات
 */
router.get('/revenue/breakdown', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية'
      });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const commissions = await prisma.commission.findMany({
      where
    });

    const breakdown = {
      affiliate: 0,
      merchant: 0,
      platform: 0
    };

    for (const commission of commissions) {
      breakdown[commission.type.toLowerCase()] = 
        (breakdown[commission.type.toLowerCase()] || 0) + Number(commission.amount);
    }

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('❌ [PLATFORM-REVENUE] Error getting breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ'
    });
  }
});

/**
 * إيرادات من المسوقين
 */
router.get('/revenue/affiliates', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية'
      });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const where = {
      type: 'AFFILIATE'
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    const total = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

    res.json({
      success: true,
      data: {
        total,
        count: commissions.length,
        commissions
      }
    });
  } catch (error) {
    console.error('❌ [PLATFORM-REVENUE] Error getting affiliate revenue:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ'
    });
  }
});

/**
 * إيرادات من التجار
 */
router.get('/revenue/merchants', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية'
      });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const where = {
      type: 'MERCHANT'
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        merchant: true
      }
    });

    const total = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

    res.json({
      success: true,
      data: {
        total,
        count: commissions.length,
        commissions
      }
    });
  } catch (error) {
    console.error('❌ [PLATFORM-REVENUE] Error getting merchant revenue:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ'
    });
  }
});

module.exports = router;
