const express = require('express');
const router = express.Router();
const affiliateService = require('../services/affiliateService');
const commissionService = require('../services/commissionService');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * تسجيل مسوق جديد
 */
router.post('/register', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const affiliate = await affiliateService.registerAffiliate(userId, data);

    res.json({
      success: true,
      message: 'تم تسجيل المسوق بنجاح',
      data: affiliate
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error registering affiliate:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تسجيل المسوق'
    });
  }
});

/**
 * بيانات المسوق الحالي
 */
router.get('/me', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = getSharedPrismaClient();

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    res.json({
      success: true,
      data: affiliate
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات المسوق'
    });
  }
});

/**
 * تحديث بيانات المسوق
 */
router.put('/me', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = getSharedPrismaClient();

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const updateData = { ...req.body };
    if (updateData.paymentDetails) {
      updateData.paymentDetails = JSON.stringify(updateData.paymentDetails);
    }

    const updated = await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error updating affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث البيانات'
    });
  }
});

/**
 * إحصائيات المسوق
 */
router.get('/stats', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = getSharedPrismaClient();

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        referrals: {
          where: { converted: true }
        },
        commissions: true,
        orders: {
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const stats = {
      totalEarnings: Number(affiliate.totalEarnings),
      paidEarnings: Number(affiliate.paidEarnings),
      pendingEarnings: Number(affiliate.pendingEarnings),
      totalSales: affiliate.totalSales,
      totalClicks: affiliate.totalClicks,
      conversionRate: affiliate.conversionRate,
      totalOrders: affiliate.orders.length,
      totalCommissions: affiliate.commissions.length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات'
    });
  }
});

/**
 * قائمة العمولات
 */
router.get('/commissions', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = getSharedPrismaClient();

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const commissions = await prisma.commission.findMany({
      where: {
        affiliateId: affiliate.id
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: commissions
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting commissions:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب العمولات'
    });
  }
});

/**
 * طلب سحب
 */
router.post('/payout-request', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod, paymentDetails } = req.body;

    const prisma = getSharedPrismaClient();
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    if (Number(amount) < Number(affiliate.minPayout)) {
      return res.status(400).json({
        success: false,
        message: `الحد الأدنى للسحب هو ${affiliate.minPayout} جنيه`
      });
    }

    const payout = await commissionService.processPayout(affiliate.id, amount, {
      method: paymentMethod,
      details: paymentDetails
    });

    res.json({
      success: true,
      message: 'تم إنشاء طلب السحب بنجاح',
      data: payout
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error creating payout request:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إنشاء طلب السحب'
    });
  }
});

/**
 * قائمة الإحالات
 */
router.get('/referrals', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = getSharedPrismaClient();

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const referrals = await prisma.affiliateReferral.findMany({
      where: {
        affiliateId: affiliate.id
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: referrals
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting referrals:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحالات'
    });
  }
});

/**
 * منتجات المسوق (للطريقة الثانية)
 */
router.get('/products', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = getSharedPrismaClient();

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const products = await prisma.affiliateProduct.findMany({
      where: {
        affiliateId: affiliate.id,
        isActive: true
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            description: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting products:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب المنتجات'
    });
  }
});

/**
 * إضافة منتج مع هامش ربح
 */
router.post('/products', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, markup } = req.body;

    const prisma = getSharedPrismaClient();
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const affiliateProduct = await affiliateService.createAffiliateProduct(
      affiliate.id,
      productId,
      markup
    );

    res.json({
      success: true,
      message: 'تم إضافة المنتج بنجاح',
      data: affiliateProduct
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error adding product:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إضافة المنتج'
    });
  }
});

/**
 * تحديث هامش ربح منتج
 */
router.put('/products/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { markup } = req.body;

    const prisma = getSharedPrismaClient();
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const affiliateProduct = await prisma.affiliateProduct.findUnique({
      where: { id }
    });

    if (!affiliateProduct || affiliateProduct.affiliateId !== affiliate.id) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    const finalPrice = Number(affiliateProduct.basePrice) + Number(markup);

    const updated = await prisma.affiliateProduct.update({
      where: { id },
      data: {
        markup,
        finalPrice
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الهامش بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث المنتج'
    });
  }
});

/**
 * الحصول على سعر المنتج للمسوق
 */
router.get('/products/:productId/price', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const prisma = getSharedPrismaClient();
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const priceInfo = await affiliateService.getAffiliateProductPrice(affiliate.id, productId);

    res.json({
      success: true,
      data: priceInfo
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting product price:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب السعر'
    });
  }
});

/**
 * قائمة طلبات المسوق
 */
router.get('/orders', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, orderSource, limit = 50, offset = 0 } = req.query;

    const prisma = getSharedPrismaClient();
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const orders = await affiliateService.getAffiliateOrders(affiliate.id, {
      status,
      orderSource,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting orders:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الطلبات'
    });
  }
});

/**
 * قائمة العملاء المرتبطين بالمسوق
 */
router.get('/customers', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = getSharedPrismaClient();

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'المسوق غير موجود'
      });
    }

    const customers = await affiliateService.getAffiliateCustomers(affiliate.id);

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting customers:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب العملاء'
    });
  }
});

/**
 * إنشاء طلب مباشر من المسوق
 */
router.post('/orders', verifyToken.authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const prisma = getSharedPrismaClient();

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId }
    });

    if (!affiliate || affiliate.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'المسوق غير موجود أو غير نشط'
      });
    }

    const { items, customerData, shippingAddress, paymentMethod, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب إضافة منتجات للطلب'
      });
    }

    // إنشاء أو البحث عن العميل
    let customerId = customerData?.customerId;
    if (customerData && !customerId) {
      const customer = await prisma.customer.upsert({
        where: {
          customer_whatsapp_company: {
            whatsappId: customerData.phone,
            companyId: affiliate.companyId
          }
        },
        update: {},
        create: {
          firstName: customerData.firstName || 'عميل',
          lastName: customerData.lastName || '',
          phone: customerData.phone,
          whatsappId: customerData.phone,
          email: customerData.email,
          companyId: affiliate.companyId,
          status: 'CUSTOMER'
        }
      });
      customerId = customer.id;
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد العميل'
      });
    }

    // حساب المجموع
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `المنتج ${item.productId} غير موجود`
        });
      }

      // الحصول على السعر للمسوق
      const priceInfo = await affiliateService.getAffiliateProductPrice(affiliate.id, item.productId);
      const price = priceInfo.price || product.price;
      const quantity = item.quantity || 1;
      const itemTotal = Number(price) * quantity;

      subtotal += itemTotal;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity,
        price: Number(price),
        total: itemTotal
      });
    }

    const shipping = shippingAddress?.shippingCost || 0;
    const total = subtotal + shipping;

    // إنشاء رقم الطلب
    const orderService = require('../services/orderService');
    const orderNumber = await orderService.generateOrderNumber(affiliate.companyId);

    // إنشاء الطلب
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        companyId: affiliate.companyId,
        affiliateId: affiliate.id,
        orderSource: 'AFFILIATE_DIRECT',
        subtotal,
        shipping,
        total,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: paymentMethod || 'CASH',
        shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
        notes: notes || `طلب مباشر من المسوق - ${affiliate.affiliateCode}`,
        sourceType: 'affiliate_direct',
        orderItems: {
          create: orderItems.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          }))
        }
      },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    // حساب العمولات
    try {
      const commissionService = require('../services/commissionService');
      await commissionService.calculateCommissions(order.id);
    } catch (error) {
      console.error('⚠️ [AFFILIATE-ORDER] Error calculating commissions:', error.message);
    }

    res.json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: order
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error creating order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إنشاء الطلب'
    });
  }
});

/**
 * تسجيل دفعة خارجية
 */
router.post('/payouts/:id/record-external', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId, externalReference, paymentDate } = req.body;

    // التحقق من الصلاحيات (يجب أن يكون admin أو owner)
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتسجيل الدفعات'
      });
    }

    const payout = await commissionService.recordExternalPayout(id, {
      transactionId,
      externalReference,
      paymentDate
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدفعة الخارجية بنجاح',
      data: payout
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error recording external payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تسجيل الدفعة'
    });
  }
});

/**
 * قائمة المسوقين (للإدارة)
 */
router.get('/list', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
    }

    const affiliates = await affiliateService.listAffiliates(companyId);
    res.json({ success: true, data: affiliates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * تحديث حالة المسوق
 */
router.put('/:id/status', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, status } = req.body;
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
    }

    await affiliateService.updateAffiliateStatus(id, status || isActive);
    res.json({ success: true, message: 'تم تحديث الحالة بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * تحديث عمولة المسوق
 */
router.put('/:id/commission', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
    }

    await affiliateService.updateAffiliateCommission(id, commissionRate);
    res.json({ success: true, message: 'تم تحديث العمولة بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * طلب سحب الرصيد
 */
router.post('/payout/request', verifyToken.authenticateToken, async (req, res) => {
  try {
    const affiliateId = req.user.affiliateId; // Assuming authenticateToken adds affiliateId if user is affiliate
    // If not, we might need to fetch it based on userId. 
    // Let's check verifyToken middleware or fetch it.

    // Safety check: fetch affiliate ID from User ID if not in token
    let targetAffiliateId = affiliateId;
    if (!targetAffiliateId) {
      const prisma = getSharedPrismaClient();
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId: req.user.id }
      });
      if (!affiliate) {
        return res.status(404).json({ success: false, message: 'حساب المسوق غير موجود' });
      }
      targetAffiliateId = affiliate.id;
    }

    const { amount, paymentMethod, paymentDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'مبلغ السحب غير صالح' });
    }

    const payout = await commissionService.processPayout(targetAffiliateId, amount, {
      method: paymentMethod,
      details: paymentDetails
    });

    res.json({
      success: true,
      message: 'تم استلام طلب السحب بنجاح',
      data: payout
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error requesting payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'فشل طلب السحب'
    });
  }
});

/**
 * سجل عمليات السحب
 */
router.get('/payouts', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();

    // Fetch affiliate ID if needed
    let targetAffiliateId = req.user.affiliateId;
    if (!targetAffiliateId) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId: req.user.id }
      });
      if (!affiliate) {
        return res.status(404).json({ success: false, message: 'حساب المسوق غير موجود' });
      }
      targetAffiliateId = affiliate.id;
    }

    const payouts = await prisma.affiliatePayout.findMany({
      where: { affiliateId: targetAffiliateId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: payouts
    });
  } catch (error) {
    console.error('❌ [AFFILIATE-ROUTES] Error getting payouts:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب سجل السحوبات'
    });
  }
});

/**
 * سجل العمولات
 */
router.get('/commissions', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();

    // Fetch affiliate ID if needed
    let targetAffiliateId = req.user.affiliateId;
    if (!targetAffiliateId) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId: req.user.id }
      });
      if (!affiliate) {
        return res.status(404).json({ success: false, message: 'حساب المسوق غير موجود' });
      }
      targetAffiliateId = affiliate.id;
    }

    const { status, type, limit = 50, offset = 0, startDate, endDate } = req.query;

    const result = await commissionService.getCommissionStats(req.user.companyId, {
      affiliateId: targetAffiliateId, // Force filter by this affiliate
      startDate,
      endDate
    });

    // Apply filters matching the service output structure
    let commissions = result.commissions;
    if (status) {
      commissions = commissions.filter(c => c.status === status);
    }
    if (type) {
      commissions = commissions.filter(c => c.type === type);
    }

    // Pagination
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
    console.error('❌ [AFFILIATE-ROUTES] Error getting commissions:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب سجل العمولات'
    });
  }
});

module.exports = router;
