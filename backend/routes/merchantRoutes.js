const express = require('express');
const router = express.Router();
const merchantService = require('../services/merchantService');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * إنشاء تاجر جديد
 */
router.post('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات (OWNER أو COMPANY_ADMIN فقط)
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة التجار'
      });
    }

    const companyId = req.user.companyId;
    const merchant = await merchantService.createMerchant(companyId, req.body);

    res.json({
      success: true,
      message: 'تم إنشاء التاجر بنجاح',
      data: merchant
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error creating merchant:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إنشاء التاجر'
    });
  }
});

/**
 * قائمة التجار
 */
router.get('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const merchants = await prisma.merchant.findMany({
      where: { companyId },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: merchants
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting merchants:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب التجار'
    });
  }
});

/**
 * تفاصيل تاجر
 */
router.get('/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const merchant = await prisma.merchant.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true
              }
            }
          }
        }
      }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    res.json({
      success: true,
      data: merchant
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting merchant:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات التاجر'
    });
  }
});

/**
 * تحديث تاجر
 */
router.put('/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل التجار'
      });
    }

    const { id } = req.params;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    // التحقق من أن التاجر يتبع نفس الشركة
    const merchant = await prisma.merchant.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    const updated = await merchantService.updateMerchant(id, req.body);

    res.json({
      success: true,
      message: 'تم تحديث التاجر بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error updating merchant:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث التاجر'
    });
  }
});

/**
 * إضافة منتج للتاجر
 */
router.post('/:id/products', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة منتجات التجار'
      });
    }

    const { id: merchantId } = req.params;
    const { productId, ...productData } = req.body;

    const merchantProduct = await merchantService.addMerchantProduct(
      merchantId,
      productId,
      productData
    );

    res.json({
      success: true,
      message: 'تم إضافة المنتج للتاجر بنجاح',
      data: merchantProduct
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error adding product:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إضافة المنتج'
    });
  }
});

/**
 * طلبات التاجر
 */
router.get('/:id/orders', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id: merchantId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    const orders = await merchantService.getMerchantOrders(merchantId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting orders:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الطلبات'
    });
  }
});

/**
 * مزامنة المخزون
 */
router.post('/:id/sync', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لمزامنة المخزون'
      });
    }

    const { id: merchantId } = req.params;

    const result = await merchantService.syncMerchantInventory(merchantId);

    res.json({
      success: true,
      message: 'تمت المزامنة بنجاح',
      data: result
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error syncing inventory:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء المزامنة'
    });
  }
});

module.exports = router;
