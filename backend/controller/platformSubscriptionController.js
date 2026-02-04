const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * @route GET /api/v1/platform-subscription
 * @desc Get current platform subscription
 * @access Protected
 */
exports.getSubscription = async (req, res) => {
  try {
    const { companyId } = req.user;

    const subscription = await executeWithRetry(async () => {
      return await getSharedPrismaClient().platformSubscription.findUnique({
        where: { companyId },
        include: {
          company: {
            select: {
              name: true,
              plan: true
            }
          }
        }
      });
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'لا يوجد اشتراك نشط'
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error fetching platform subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الاشتراك'
    });
  }
};

/**
 * @route GET /api/v1/platform-subscription/plans
 * @desc Get all available platform plans with limits
 * @access Public
 */
exports.getPlans = async (req, res) => {
  try {
    const plans = await executeWithRetry(async () => {
      return await getSharedPrismaClient().planLimit.findMany({
        orderBy: { plan: 'asc' }
      });
    });

    const dbConfigs = await getSharedPrismaClient().planConfiguration.findMany({
      where: { isActive: true }
    });

    // إضافة معلومات التسعير
    const plansWithPricing = plans.map(plan => {
      const dbConfig = dbConfigs.find(c => c.planType === plan.plan);

      let monthlyFee = dbConfig ? dbConfig.price : (plan.plan === 'BASIC' ? 99 : (plan.plan === 'PRO' ? 199 : 499));
      let features = [];

      if (dbConfig && dbConfig.features && Array.isArray(dbConfig.features)) {
        features = dbConfig.features;
      } else if (dbConfig && dbConfig.features && typeof dbConfig.features === 'object') {
        // Fallback or mapping if features is an object in one system and array in another
        features = Object.entries(dbConfig.features).map(([k, v]) => `${k}: ${v}`);
      } else {
        // Fallback defaults
        if (plan.plan === 'BASIC') {
          features = ['حتى 5 موظفين', 'حتى 100 منتج', 'حتى 500 طلب/شهر', 'دعم عادي', 'تقارير أساسية'];
        } else if (plan.plan === 'PRO') {
          features = ['حتى 20 موظف', 'حتى 500 منتج', 'حتى 2000 طلب/شهر', 'دعم أولوية', 'تقارير متقدمة', 'API Access'];
        } else if (plan.plan === 'ENTERPRISE') {
          features = ['موظفين غير محدود', 'منتجات غير محدودة', 'طلبات غير محدودة', 'دعم مخصص 24/7', 'تقارير مخصصة', 'API مخصص', 'White Label', 'مدير حساب مخصص'];
        }
      }

      return {
        ...plan,
        monthlyFee,
        features
      };
    });

    res.json({
      success: true,
      data: plansWithPricing
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الخطط'
    });
  }
};

/**
 * @route POST /api/v1/platform-subscription/upgrade
 * @desc Upgrade platform subscription
 * @access Protected
 */
exports.upgradePlan = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { newPlan } = req.body;

    if (!['BASIC', 'PRO', 'ENTERPRISE'].includes(newPlan)) {
      return res.status(400).json({
        success: false,
        message: 'خطة غير صالحة'
      });
    }

    // حساب الرسوم الجديدة
    let monthlyFee = 99;
    if (newPlan === 'PRO') monthlyFee = 199;
    if (newPlan === 'ENTERPRISE') monthlyFee = 499;

    const result = await executeWithRetry(async () => {
      return await getSharedPrismaClient().$transaction(async (tx) => {
        // تحديث الاشتراك
        const subscription = await tx.platformSubscription.upsert({
          where: { companyId },
          update: {
            plan: newPlan,
            monthlyFee,
            updatedAt: new Date()
          },
          create: {
            companyId,
            plan: newPlan,
            monthlyFee,
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        // تحديث خطة الشركة
        await tx.company.update({
          where: { id: companyId },
          data: { plan: newPlan }
        });

        // تسجيل في سجل الفواتير
        await tx.billingHistory.create({
          data: {
            companyId,
            type: 'PLATFORM_FEE',
            amount: monthlyFee,
            description: `ترقية الخطة إلى ${newPlan}`,
            status: 'SUCCESS'
          }
        });

        return subscription;
      });
    });

    res.json({
      success: true,
      message: 'تم ترقية الخطة بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في ترقية الخطة'
    });
  }
};

/**
 * @route POST /api/v1/platform-subscription/cancel
 * @desc Cancel platform subscription
 * @access Protected
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await executeWithRetry(async () => {
      return await getSharedPrismaClient().platformSubscription.update({
        where: { companyId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });
    });

    res.json({
      success: true,
      message: 'تم إلغاء الاشتراك بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء الاشتراك'
    });
  }
};

/**
 * @route GET /api/v1/platform-subscription/billing-history
 * @desc Get billing history
 * @access Protected
 */
exports.getBillingHistory = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, type } = req.query;

    const where = { companyId };
    if (type) {
      where.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().billingHistory.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        getSharedPrismaClient().billingHistory.count({ where })
      ]);
    });

    res.json({
      success: true,
      data: history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجل الفواتير'
    });
  }
};

/**
 * @route GET /api/v1/platform-subscription/usage-stats
 * @desc Get current usage statistics vs plan limits
 * @access Protected
 */
exports.getUsageStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [company, subscription] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().company.findUnique({
          where: { id: companyId },
          select: { plan: true }
        }),
        getSharedPrismaClient().platformSubscription.findUnique({
          where: { companyId }
        })
      ]);
    });

    if (!company || !subscription) {
      return res.status(404).json({
        success: false,
        message: 'الشركة أو الاشتراك غير موجود'
      });
    }

    // جلب حدود الخطة
    const planLimit = await executeWithRetry(async () => {
      return await getSharedPrismaClient().planLimit.findUnique({
        where: { plan: company.plan }
      });
    });

    // حساب الاستخدام الحالي
    const [employeeCount, productCount, orderCount, customerCount] = await executeWithRetry(async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      return await Promise.all([
        getSharedPrismaClient().employee.count({ where: { companyId } }),
        getSharedPrismaClient().product.count({ where: { companyId } }),
        getSharedPrismaClient().order.count({
          where: {
            companyId,
            createdAt: { gte: startOfMonth }
          }
        }),
        getSharedPrismaClient().customer.count({ where: { companyId } })
      ]);
    });

    const usage = {
      employees: {
        current: employeeCount,
        limit: planLimit?.maxEmployees || -1,
        percentage: planLimit?.maxEmployees > 0 ? (employeeCount / planLimit.maxEmployees) * 100 : 0
      },
      products: {
        current: productCount,
        limit: planLimit?.maxProducts || -1,
        percentage: planLimit?.maxProducts > 0 ? (productCount / planLimit.maxProducts) * 100 : 0
      },
      ordersThisMonth: {
        current: orderCount,
        limit: planLimit?.maxOrdersPerMonth || -1,
        percentage: planLimit?.maxOrdersPerMonth > 0 ? (orderCount / planLimit.maxOrdersPerMonth) * 100 : 0
      },
      customers: {
        current: customerCount,
        limit: planLimit?.maxCustomers || -1,
        percentage: planLimit?.maxCustomers > 0 ? (customerCount / planLimit.maxCustomers) * 100 : 0
      }
    };

    res.json({
      success: true,
      data: {
        plan: company.plan,
        subscription,
        limits: planLimit,
        usage
      }
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الاستخدام'
    });
  }
};
