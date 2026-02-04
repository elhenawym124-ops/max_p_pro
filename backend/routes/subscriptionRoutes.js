const express = require('express');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

const router = express.Router();
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * @route GET /api/v1/admin/subscriptions
 * @desc Get all subscriptions with filtering and pagination
 * @access Super Admin
 */
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      planType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (planType) {
      where.planType = planType;
    }

    if (search) {
      where.company = {
        name: {
          contains: search
        }
      };
    }

    // Get subscriptions with company details
    const [subscriptions, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().subscription.findMany({
          where,
          include: {
            companies: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                currency: true,
                isActive: true
              }
            },
            invoices: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                totalAmount: true,
                dueDate: true
              },
              orderBy: { createdAt: 'desc' },
              take: 3
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                paidAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 3
            }
          },
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder
          }
        }),
        getSharedPrismaClient().subscription.count({ where })
      ]);
    });

    // Calculate statistics
    const stats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().subscription.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {});

    // Calculate revenue
    const revenueStats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: {
          price: true
        }
      });
    });

    // Map companies to company for frontend compatibility
    const mappedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      company: sub.companies,
      companies: undefined
    }));

    res.json({
      success: true,
      message: 'تم جلب بيانات الاشتراكات بنجاح',
      data: {
        subscriptions: mappedSubscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: {
          total,
          byStatus: statusStats,
          monthlyRevenue: revenueStats._sum.price || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    // Log extended error info
    if (error.meta) console.error('Error meta:', error.meta);
    if (error.code) console.error('Error code:', error.code);

    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الاشتراكات',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route GET /api/v1/admin/subscriptions/:id
 * @desc Get subscription details
 * @access Super Admin
 */
router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await getSharedPrismaClient().subscription.findUnique({
      where: { id },
      include: {
        company: true,
        invoices: {
          include: {
            items: true,
            payments: true
          },
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم جلب بيانات الاشتراك بنجاح',
      data: subscription
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الاشتراك',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/admin/subscriptions
 * @desc Create new subscription
 * @access Super Admin
 */
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      companyId,
      planType,
      billingCycle = 'monthly',
      price,
      currency = 'EGP',
      startDate,
      trialDays = 0,
      autoRenew = true
    } = req.body;

    // Validate company exists
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    // Calculate dates
    const subscriptionStartDate = startDate ? new Date(startDate) : new Date();
    const trialEndDate = trialDays > 0 ? new Date(subscriptionStartDate.getTime() + (trialDays * 24 * 60 * 60 * 1000)) : null;

    // Calculate next billing date
    const nextBillingDate = new Date(subscriptionStartDate);
    if (billingCycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Create subscription
    const subscription = await getSharedPrismaClient().subscription.create({
      data: {
        companyId,
        planType,
        status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
        startDate: subscriptionStartDate,
        nextBillingDate,
        billingCycle,
        price,
        currency,
        autoRenew,
        trialEndDate
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update company plan
    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: { plan: planType }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الاشتراك بنجاح',
      data: subscription
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الاشتراك',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/admin/subscriptions/:id
 * @desc Update subscription
 * @access Super Admin
 */
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planType,
      price,
      currency,
      billingCycle,
      autoRenew,
      status
    } = req.body;

    // Check if subscription exists
    const existingSubscription = await getSharedPrismaClient().subscription.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!existingSubscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    // Prepare update data
    const updateData = {};

    if (planType && planType !== existingSubscription.planType) {
      updateData.planType = planType;
      // Update company plan as well
      await getSharedPrismaClient().company.update({
        where: { id: existingSubscription.companyId },
        data: { plan: planType }
      });
    }

    if (price !== undefined) updateData.price = price;
    if (currency) updateData.currency = currency;
    if (billingCycle) updateData.billingCycle = billingCycle;
    if (autoRenew !== undefined) updateData.autoRenew = autoRenew;
    if (status) updateData.status = status;

    // Update subscription
    const subscription = await getSharedPrismaClient().subscription.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الاشتراك بنجاح',
      data: subscription
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الاشتراك',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/admin/subscriptions/:id/renew
 * @desc Renew subscription manually
 * @access Super Admin
 */
router.post('/:id/renew', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planType,
      price,
      billingCycle,
      immediate = false
    } = req.body;

    const subscription = await getSharedPrismaClient().subscription.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'EXPIRED') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تجديد هذا الاشتراك'
      });
    }

    // Calculate next billing date
    const now = new Date();
    let nextBillingDate;

    if (immediate) {
      nextBillingDate = now;
    } else {
      nextBillingDate = subscription.nextBillingDate > now ?
        subscription.nextBillingDate : now;
    }

    // Calculate the actual next billing date based on cycle
    const calculateNextDate = (date, cycle) => {
      const next = new Date(date);
      switch (cycle || subscription.billingCycle) {
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'yearly':
          next.setFullYear(next.getFullYear() + 1);
          break;
        case 'quarterly':
          next.setMonth(next.getMonth() + 3);
          break;
        default:
          next.setMonth(next.getMonth() + 1);
      }
      return next;
    };

    const finalNextBillingDate = calculateNextDate(nextBillingDate, billingCycle);

    // Update subscription
    const updatedSubscription = await getSharedPrismaClient().subscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        planType: planType || subscription.planType,
        price: price || subscription.price,
        billingCycle: billingCycle || subscription.billingCycle,
        nextBillingDate: finalNextBillingDate,
        autoRenew: true,
        metadata: {
          ...subscription.metadata,
          lastManualRenewal: now.toISOString(),
          renewedBy: req.user.id
        }
      }
    });

    // Create renewal invoice
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    const subtotal = price || subscription.price;
    const taxAmount = subtotal * 0.14;
    const totalAmount = subtotal + taxAmount;

    const invoice = await getSharedPrismaClient().invoice.create({
      data: {
        invoiceNumber,
        companyId: subscription.companyId,
        subscriptionId: subscription.id,
        type: 'SUBSCRIPTION',
        status: 'SENT',
        issueDate: now,
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        currency: subscription.currency,
        paymentTerms: 'Net 30',
        notes: `تجديد يدوي - اشتراك ${planType || subscription.planType}`,
        items: {
          create: [
            {
              description: `تجديد اشتراك ${planType || subscription.planType} - ${billingCycle || subscription.billingCycle}`,
              quantity: 1,
              unitPrice: subtotal,
              totalPrice: subtotal
            }
          ]
        }
      }
    });

    res.json({
      success: true,
      message: 'تم تجديد الاشتراك بنجاح',
      data: {
        subscription: updatedSubscription,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount
        }
      }
    });

  } catch (error) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تجديد الاشتراك'
    });
  }
});

/**
 * @route POST /api/v1/admin/subscriptions/:id/cancel
 * @desc Cancel subscription
 * @access Super Admin
 */
router.post('/:id/cancel', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, immediate = false } = req.body;

    const subscription = await getSharedPrismaClient().subscription.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    if (subscription.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'الاشتراك ملغي بالفعل'
      });
    }

    // Update subscription
    const updateData = {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason,
      autoRenew: false
    };

    if (immediate) {
      updateData.endDate = new Date();
    }

    const updatedSubscription = await getSharedPrismaClient().subscription.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم إلغاء الاشتراك بنجاح',
      data: updatedSubscription
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء الاشتراك',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/admin/subscriptions/:id/renew
 * @desc Renew subscription
 * @access Super Admin
 */
router.post('/:id/renew', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { billingCycle } = req.body;

    const subscription = await getSharedPrismaClient().subscription.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'الاشتراك غير موجود'
      });
    }

    // Calculate new billing date
    const currentDate = new Date();
    const nextBillingDate = new Date(currentDate);

    if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Update subscription
    const updatedSubscription = await getSharedPrismaClient().subscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        nextBillingDate,
        billingCycle: billingCycle || subscription.billingCycle,
        cancelledAt: null,
        cancelReason: null
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم تجديد الاشتراك بنجاح',
      data: updatedSubscription
    });

  } catch (error) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تجديد الاشتراك',
      error: error.message
    });
  }
});

module.exports = router;

