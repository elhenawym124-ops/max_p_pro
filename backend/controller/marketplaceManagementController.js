const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * @route GET /api/v1/super-admin/marketplace-management/apps
 * @desc Get all marketplace apps with stats
 * @access Super Admin
 */
exports.getAllApps = async (req, res) => {
  try {
    const apps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findMany({
        include: {
          _count: {
            select: {
              installations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    res.json({
      success: true,
      data: apps
    });
  } catch (error) {
    console.error('Error fetching marketplace apps:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأدوات'
    });
  }
};

/**
 * @route POST /api/v1/super-admin/marketplace-management/apps
 * @desc Create new marketplace app
 * @access Super Admin
 */
exports.createApp = async (req, res) => {
  try {
    const appData = req.body;

    const app = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.create({
        data: appData
      });
    });

    res.json({
      success: true,
      message: 'تم إنشاء الأداة بنجاح',
      data: app
    });
  } catch (error) {
    console.error('Error creating app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الأداة'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/marketplace-management/apps/:id
 * @desc Update marketplace app
 * @access Super Admin
 */
exports.updateApp = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const app = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.update({
        where: { id },
        data: updateData
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث الأداة بنجاح',
      data: app
    });
  } catch (error) {
    console.error('Error updating app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الأداة'
    });
  }
};

/**
 * @route DELETE /api/v1/super-admin/marketplace-management/apps/:id
 * @desc Delete marketplace app
 * @access Super Admin
 */
exports.deleteApp = async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'تم حذف الأداة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الأداة'
    });
  }
};

/**
 * @route GET /api/v1/super-admin/marketplace-management/pricing-rules
 * @desc Get all pricing rules
 * @access Super Admin
 */
exports.getAllPricingRules = async (req, res) => {
  try {
    const rules = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appPricingRule.findMany({
        orderBy: { feature: 'asc' }
      });
    });

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب قواعد التسعير'
    });
  }
};

/**
 * @route POST /api/v1/super-admin/marketplace-management/pricing-rules
 * @desc Create new pricing rule
 * @access Super Admin
 */
exports.createPricingRule = async (req, res) => {
  try {
    const ruleData = req.body;

    const rule = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appPricingRule.create({
        data: ruleData
      });
    });

    res.json({
      success: true,
      message: 'تم إنشاء قاعدة التسعير بنجاح',
      data: rule
    });
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء قاعدة التسعير'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/marketplace-management/pricing-rules/:id
 * @desc Update pricing rule
 * @access Super Admin
 */
exports.updatePricingRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appPricingRule.update({
        where: { id },
        data: updateData
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث قاعدة التسعير بنجاح',
      data: rule
    });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث قاعدة التسعير'
    });
  }
};

/**
 * @route DELETE /api/v1/super-admin/marketplace-management/pricing-rules/:id
 * @desc Delete pricing rule
 * @access Super Admin
 */
exports.deletePricingRule = async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().appPricingRule.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'تم حذف قاعدة التسعير بنجاح'
    });
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف قاعدة التسعير'
    });
  }
};

/**
 * @route GET /api/v1/super-admin/marketplace-management/bundles
 * @desc Get all bundles
 * @access Super Admin
 */
exports.getAllBundles = async (req, res) => {
  try {
    const bundles = await executeWithRetry(async () => {
      const allBundles = await getSharedPrismaClient().appBundle.findMany({
        orderBy: { createdAt: 'desc' }
      });

      // Fetch apps for each bundle based on appIds
      const bundlesWithApps = await Promise.all(
        allBundles.map(async (bundle) => {
          const appIds = Array.isArray(bundle.appIds) ? bundle.appIds : [];
          const apps = await getSharedPrismaClient().marketplaceApp.findMany({
            where: {
              id: { in: appIds }
            },
            select: {
              id: true,
              name: true,
              slug: true,
              monthlyPrice: true
            }
          });
          return { ...bundle, apps };
        })
      );

      return bundlesWithApps;
    });

    res.json({
      success: true,
      data: bundles
    });
  } catch (error) {
    console.error('Error fetching bundles:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الباقات'
    });
  }
};

/**
 * @route POST /api/v1/super-admin/marketplace-management/bundles
 * @desc Create new bundle
 * @access Super Admin
 */
exports.createBundle = async (req, res) => {
  try {
    const bundleData = req.body;

    const bundle = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appBundle.create({
        data: bundleData
      });
    });

    res.json({
      success: true,
      message: 'تم إنشاء الباقة بنجاح',
      data: bundle
    });
  } catch (error) {
    console.error('Error creating bundle:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الباقة'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/marketplace-management/bundles/:id
 * @desc Update bundle
 * @access Super Admin
 */
exports.updateBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const bundle = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appBundle.update({
        where: { id },
        data: updateData
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث الباقة بنجاح',
      data: bundle
    });
  } catch (error) {
    console.error('Error updating bundle:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الباقة'
    });
  }
};

/**
 * @route DELETE /api/v1/super-admin/marketplace-management/bundles/:id
 * @desc Delete bundle
 * @access Super Admin
 */
exports.deleteBundle = async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().appBundle.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'تم حذف الباقة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting bundle:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الباقة'
    });
  }
};

/**
 * @route GET /api/v1/super-admin/marketplace-management/enterprise-plans
 * @desc Get all enterprise plans
 * @access Super Admin
 */
exports.getAllEnterprisePlans = async (req, res) => {
  try {
    const plans = await executeWithRetry(async () => {
      return await getSharedPrismaClient().enterprisePlan.findMany({
        include: {
          company: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching enterprise plans:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب خطط Enterprise'
    });
  }
};

/**
 * @route POST /api/v1/super-admin/marketplace-management/enterprise-plans
 * @desc Create new enterprise plan
 * @access Super Admin
 */
exports.createEnterprisePlan = async (req, res) => {
  try {
    const planData = req.body;

    const plan = await executeWithRetry(async () => {
      return await getSharedPrismaClient().enterprisePlan.create({
        data: planData,
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
    });

    res.json({
      success: true,
      message: 'تم إنشاء خطة Enterprise بنجاح',
      data: plan
    });
  } catch (error) {
    console.error('Error creating enterprise plan:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء خطة Enterprise'
    });
  }
};

/**
 * @route PUT /api/v1/super-admin/marketplace-management/enterprise-plans/:id
 * @desc Update enterprise plan
 * @access Super Admin
 */
exports.updateEnterprisePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const plan = await executeWithRetry(async () => {
      return await getSharedPrismaClient().enterprisePlan.update({
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
    });

    res.json({
      success: true,
      message: 'تم تحديث خطة Enterprise بنجاح',
      data: plan
    });
  } catch (error) {
    console.error('Error updating enterprise plan:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث خطة Enterprise'
    });
  }
};

/**
 * @route DELETE /api/v1/super-admin/marketplace-management/enterprise-plans/:id
 * @desc Delete enterprise plan
 * @access Super Admin
 */
exports.deleteEnterprisePlan = async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().enterprisePlan.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'تم حذف خطة Enterprise بنجاح'
    });
  } catch (error) {
    console.error('Error deleting enterprise plan:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف خطة Enterprise'
    });
  }
};

module.exports = exports;
