const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * @route GET /api/v1/super-admin/platform/subscriptions
 * @desc Get all platform subscriptions with company details
 * @access Super Admin
 */
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, plan, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subscriptions, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().platformSubscription.findMany({
          where,
          include: {
            company: {
              select: {
                id: true,
                name: true,
                email: true,
                plan: true,
                isActive: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        getSharedPrismaClient().platformSubscription.count({ where })
      ]);
    });

    // Calculate statistics
    const stats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().platformSubscription.groupBy({
        by: ['status', 'plan'],
        _count: true,
        _sum: { monthlyFee: true }
      });
    });

    res.json({
      success: true,
      data: subscriptions,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الاشتراكات'
    });
  }
};

/**
 * @route GET /api/v1/super-admin/platform/billing-overview
 * @desc Get billing overview and revenue analytics
 * @access Super Admin
 */
exports.getBillingOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get revenue by plan using Subscription model
    const revenueByPlan = await executeWithRetry(async () => {
      return await getSharedPrismaClient().subscription.groupBy({
        by: ['planType'],
        where: {
          status: 'ACTIVE'
        },
        _sum: { price: true },
        _count: true
      });
    });

    // Get failed payments using Payment model
    const failedPayments = await executeWithRetry(async () => {
      return await getSharedPrismaClient().payment.findMany({
        where: {
          status: 'FAILED',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        include: {
          company: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });

    // Get total revenue from successful payments
    const totalRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().payment.aggregate({
        where: {
          status: 'COMPLETED',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        _sum: { amount: true }
      });
    });

    // Get active subscriptions count
    const activeSubscriptions = await executeWithRetry(async () => {
      return await getSharedPrismaClient().subscription.count({
        where: { status: 'ACTIVE' }
      });
    });

    // Get MRR (Monthly Recurring Revenue)
    const mrr = await executeWithRetry(async () => {
      return await getSharedPrismaClient().subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { price: true }
      });
    });

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.amount || 0,
        mrr: mrr._sum.price || 0,
        activeSubscriptions,
        revenueByPlan,
        failedPayments
      }
    });
  } catch (error) {
    console.error('Error fetching billing overview:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب نظرة عامة على الفواتير',
      error: error.message
    });
  }
};

/**
 * @route GET /api/v1/super-admin/platform/marketplace-stats
 * @desc Get marketplace statistics
 * @access Super Admin
 */
exports.getMarketplaceStats = async (req, res) => {
  try {
    // Get app installation stats
    const appStats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.groupBy({
        by: ['appId', 'status'],
        _count: true,
        _sum: { totalSpent: true }
      });
    });

    // Get top apps by installations
    const topApps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.groupBy({
        by: ['appId'],
        _count: true,
        orderBy: { _count: { appId: 'desc' } },
        take: 10
      });
    });

    // Get app details for top apps
    const appIds = topApps.map(a => a.appId);
    const apps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findMany({
        where: { id: { in: appIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          monthlyPrice: true,
          installCount: true
        }
      });
    });

    // Get usage revenue
    const usageRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.aggregate({
        where: {
          type: 'APP_USAGE',
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      });
    });

    // Get subscription revenue
    const subscriptionRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.aggregate({
        where: {
          type: 'APP_SUBSCRIPTION',
          status: 'SUCCESS'
        },
        _sum: { amount: true }
      });
    });

    res.json({
      success: true,
      data: {
        appStats,
        topApps: topApps.map(ta => ({
          ...ta,
          app: apps.find(a => a.id === ta.appId)
        })),
        usageRevenue: usageRevenue._sum.amount || 0,
        subscriptionRevenue: subscriptionRevenue._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات Marketplace'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/platform/subscription/:id
 * @desc Update subscription status or plan
 * @access Super Admin
 */
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, plan, monthlyFee } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (plan) updateData.plan = plan;
    if (monthlyFee) updateData.monthlyFee = monthlyFee;

    const subscription = await executeWithRetry(async () => {
      return await getSharedPrismaClient().platformSubscription.update({
        where: { id },
        data: updateData,
        include: {
          company: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
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
      message: 'خطأ في تحديث الاشتراك'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/platform/plan-limit/:plan
 * @desc Update plan limits
 * @access Super Admin
 */
exports.updatePlanLimit = async (req, res) => {
  try {
    const { plan } = req.params;
    const updateData = req.body;

    const planLimit = await executeWithRetry(async () => {
      return await getSharedPrismaClient().planLimit.update({
        where: { plan },
        data: updateData
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث حدود الخطة بنجاح',
      data: planLimit
    });
  } catch (error) {
    console.error('Error updating plan limit:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حدود الخطة'
    });
  }
};

/**
 * @route POST /api/v1/super-admin/platform/retry-failed-payment/:id
 * @desc Retry failed payment
 * @access Super Admin
 */
exports.retryFailedPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const billingRecord = await executeWithRetry(async () => {
      return await getSharedPrismaClient().billingHistory.findUnique({
        where: { id },
        include: {
          company: {
            include: {
              wallet: true
            }
          }
        }
      });
    });

    if (!billingRecord) {
      return res.status(404).json({
        success: false,
        message: 'سجل الفاتورة غير موجود'
      });
    }

    // Check wallet balance
    const wallet = billingRecord.company.wallet;
    if (!wallet || parseFloat(wallet.balance.toString()) < parseFloat(billingRecord.amount.toString())) {
      return res.status(400).json({
        success: false,
        message: 'رصيد غير كافٍ'
      });
    }

    // Retry payment logic here
    // This would involve calling the billing service to process the payment again

    res.json({
      success: true,
      message: 'تم إعادة محاولة الدفع بنجاح'
    });
  } catch (error) {
    console.error('Error retrying payment:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة محاولة الدفع'
    });
  }
};

module.exports = exports;
