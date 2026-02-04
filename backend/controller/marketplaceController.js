const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

/**
 * @route GET /api/v1/marketplace/apps
 * @desc Get all marketplace apps with filtering
 * @access Public
 */
exports.getAllApps = async (req, res) => {
  try {
    const { category, search, sort = 'featured', page = 1, limit = 20 } = req.query;

    const where = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameEn: { contains: search } },
        { description: { contains: search } }
      ];
    }

    let orderBy = {};
    switch (sort) {
      case 'featured':
        orderBy = [{ isFeatured: 'desc' }, { isPopular: 'desc' }];
        break;
      case 'popular':
        orderBy = { installCount: 'desc' };
        break;
      case 'price_low':
        orderBy = { monthlyPrice: 'asc' };
        break;
      case 'price_high':
        orderBy = { monthlyPrice: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { isFeatured: 'desc' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [apps, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().marketplaceApp.findMany({
          where,
          orderBy,
          skip,
          take: parseInt(limit),
          include: {
            _count: {
              select: { reviews: true, installations: true }
            }
          }
        }),
        getSharedPrismaClient().marketplaceApp.count({ where })
      ]);
    });

    res.json({
      success: true,
      data: apps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace apps:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأدوات',
      error: error.message
    });
  }
};

/**
 * @route GET /api/v1/marketplace/apps/:slug
 * @desc Get app details by slug
 * @access Public
 */
exports.getAppDetails = async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findUnique({
        where: { slug },
        include: {
          reviews: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            where: { isPublished: true }
          },
          pricingRules: {
            where: { isActive: true }
          },
          _count: {
            select: { installations: true, reviews: true }
          }
        }
      });
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: app
    });
  } catch (error) {
    console.error('Error fetching app details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل الأداة',
      error: error.message
    });
  }
};

/**
 * @route GET /api/v1/marketplace/categories
 * @desc Get all app categories with counts
 * @access Public
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: {
          id: true
        }
      });
    });

    const categoryMap = {
      ECOMMERCE: { name: 'التجارة الإلكترونية', nameEn: 'E-Commerce', icon: '🛒' },
      HR: { name: 'الموارد البشرية', nameEn: 'HR', icon: '👥' },
      AI: { name: 'الذكاء الاصطناعي', nameEn: 'AI', icon: '🤖' },
      COMMUNICATION: { name: 'التواصل', nameEn: 'Communication', icon: '💬' },
      CRM: { name: 'إدارة العملاء', nameEn: 'CRM', icon: '📊' },
      ANALYTICS: { name: 'التحليلات', nameEn: 'Analytics', icon: '📈' },
      INTEGRATION: { name: 'التكاملات', nameEn: 'Integrations', icon: '🔗' },
      PRODUCTIVITY: { name: 'الإنتاجية', nameEn: 'Productivity', icon: '⚡' },
      FINANCE: { name: 'المالية', nameEn: 'Finance', icon: '💰' },
      MARKETING: { name: 'التسويق', nameEn: 'Marketing', icon: '📣' }
    };

    const result = categories.map(cat => ({
      category: cat.category,
      count: cat._count.id,
      ...categoryMap[cat.category]
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفئات',
      error: error.message
    });
  }
};

/**
 * @route GET /api/v1/marketplace/featured
 * @desc Get featured apps
 * @access Public
 */
exports.getFeaturedApps = async (req, res) => {
  try {
    const apps = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findMany({
        where: {
          isActive: true,
          isFeatured: true
        },
        take: 6,
        orderBy: { installCount: 'desc' }
      });
    });

    res.json({
      success: true,
      data: apps
    });
  } catch (error) {
    console.error('Error fetching featured apps:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأدوات المميزة',
      error: error.message
    });
  }
};

/**
 * @route GET /api/v1/marketplace/bundles
 * @desc Get all app bundles
 * @access Public
 */
exports.getBundles = async (req, res) => {
  try {
    const bundles = await executeWithRetry(async () => {
      const allBundles = await getSharedPrismaClient().appBundle.findMany({
        where: { isActive: true },
        orderBy: { isFeatured: 'desc' }
      });

      // Fetch details for all apps in these bundles to attach them
      // We'll collect all unique app IDs first
      const allAppIds = new Set();
      allBundles.forEach(bundle => {
        if (Array.isArray(bundle.appIds)) {
          bundle.appIds.forEach(id => allAppIds.add(id));
        }
      });

      const apps = await getSharedPrismaClient().marketplaceApp.findMany({
        where: { id: { in: Array.from(allAppIds) } },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          monthlyPrice: true,
          logo: true
        }
      });

      const appsMap = new Map(apps.map(app => [app.id, app]));

      // Attach apps to bundles
      return allBundles.map(bundle => {
        const bundleApps = [];
        if (Array.isArray(bundle.appIds)) {
          bundle.appIds.forEach(id => {
            const app = appsMap.get(id);
            if (app) bundleApps.push(app);
          });
        }
        return { ...bundle, apps: bundleApps };
      });
    });

    res.json({
      success: true,
      data: bundles
    });
  } catch (error) {
    console.error('Error fetching bundles:', error);
    console.error('Full error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الباقات',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/marketplace/apps/:slug/install
 * @desc Install an app for the company
 * @access Protected
 */
exports.installApp = async (req, res) => {
  try {
    const { slug } = req.params;
    const { companyId } = req.user;

    const app = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findUnique({
        where: { slug }
      });
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    if (!app.isActive) {
      return res.status(400).json({
        success: false,
        message: 'هذه الأداة غير متاحة حالياً'
      });
    }

    // Check if already installed
    const existing = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findUnique({
        where: {
          companyId_appId: { companyId, appId: app.id }
        }
      });
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'الأداة مفعلة بالفعل',
        data: existing
      });
    }

    // Check required apps
    if (app.requiredApps && Array.isArray(app.requiredApps) && app.requiredApps.length > 0) {
      const requiredApps = await executeWithRetry(async () => {
        return await getSharedPrismaClient().marketplaceApp.findMany({
          where: {
            slug: { in: app.requiredApps }
          }
        });
      });

      const installedRequiredApps = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyApp.findMany({
          where: {
            companyId,
            appId: { in: requiredApps.map(a => a.id) },
            status: { in: ['TRIAL', 'ACTIVE'] }
          }
        });
      });

      if (installedRequiredApps.length < requiredApps.length) {
        const missingApps = requiredApps.filter(
          ra => !installedRequiredApps.find(ia => ia.appId === ra.id)
        );

        return res.status(400).json({
          success: false,
          message: 'هذه الأداة تتطلب تفعيل أدوات أخرى أولاً',
          requiredApps: missingApps.map(a => ({ slug: a.slug, name: a.name }))
        });
      }
    }

    // Create installation
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + app.trialDays);

    const installation = await executeWithRetry(async () => {
      return await getSharedPrismaClient().$transaction(async (tx) => {
        // Create company app
        const companyApp = await tx.companyApp.create({
          data: {
            id: uuidv4(),
            companyId,
            appId: app.id,
            status: 'TRIAL',
            trialEndsAt
          }
        });

        // Update install count
        await tx.marketplaceApp.update({
          where: { id: app.id },
          data: { installCount: { increment: 1 } }
        });

        // Create wallet if doesn't exist
        const wallet = await tx.companyWallet.upsert({
          where: { companyId },
          update: {},
          create: {
            id: uuidv4(),
            companyId,
            balance: 0,
            currency: 'EGP'
          }
        });

        return companyApp;
      });
    });

    res.json({
      success: true,
      message: `تم تفعيل ${app.name} بنجاح! 🎉\nتجربة مجانية لمدة ${app.trialDays} يوم`,
      data: {
        ...installation,
        app: {
          name: app.name,
          slug: app.slug,
          icon: app.icon
        }
      }
    });
  } catch (error) {
    console.error('Error installing app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تفعيل الأداة',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/marketplace/apps/:slug/uninstall
 * @desc Uninstall an app
 * @access Protected
 */
exports.uninstallApp = async (req, res) => {
  try {
    const { slug } = req.params;
    const { companyId } = req.user;

    const app = await executeWithRetry(async () => {
      return await getSharedPrismaClient().marketplaceApp.findUnique({
        where: { slug }
      });
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير موجودة'
      });
    }

    const installation = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findUnique({
        where: {
          companyId_appId: { companyId, appId: app.id }
        }
      });
    });

    if (!installation) {
      return res.status(404).json({
        success: false,
        message: 'الأداة غير مفعلة'
      });
    }

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.update({
        where: { id: installation.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });
    });

    res.json({
      success: true,
      message: `تم إلغاء ${app.name} بنجاح`
    });
  } catch (error) {
    console.error('Error uninstalling app:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء الأداة',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/marketplace/apps/:appId/review
 * @desc Add a review for an app
 * @access Protected
 */
exports.addReview = async (req, res) => {
  try {
    const { appId } = req.params;
    const { companyId, userId } = req.user;
    const { rating, title, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }

    // Check if app is installed
    const installation = await executeWithRetry(async () => {
      return await getSharedPrismaClient().companyApp.findUnique({
        where: {
          companyId_appId: { companyId, appId }
        }
      });
    });

    if (!installation) {
      return res.status(400).json({
        success: false,
        message: 'يجب تفعيل الأداة أولاً لتقييمها'
      });
    }

    const review = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appReview.upsert({
        where: {
          appId_companyId: { appId, companyId }
        },
        update: {
          rating,
          title,
          comment
        },
        create: {
          appId,
          companyId,
          userId,
          rating,
          title,
          comment,
          isVerified: true
        }
      });
    });

    // Update app rating
    const avgRating = await executeWithRetry(async () => {
      const result = await getSharedPrismaClient().appReview.aggregate({
        where: { appId, isPublished: true },
        _avg: { rating: true },
        _count: { id: true }
      });

      await getSharedPrismaClient().marketplaceApp.update({
        where: { id: appId },
        data: {
          rating: result._avg.rating,
          reviewCount: result._count.id
        }
      });

      return result._avg.rating;
    });

    res.json({
      success: true,
      message: 'شكراً لتقييمك! 🌟',
      data: review
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة التقييم',
      error: error.message
    });
  }
};

/**
 * @route POST /api/v1/marketplace/bundles/:slug/subscribe
 * @desc Subscribe to an app bundle
 * @access Protected
 */
exports.subscribeToBundle = async (req, res) => {
  try {
    const { slug } = req.params;
    const { companyId } = req.user;

    // 1. Fetch Bundle
    const bundle = await executeWithRetry(async () => {
      return await getSharedPrismaClient().appBundle.findUnique({
        where: { slug }
      });
    });

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: 'الباقة غير موجودة'
      });
    }

    if (!bundle.isActive) {
      return res.status(400).json({
        success: false,
        message: 'هذه الباقة غير مفعلة حالياً'
      });
    }

    if (!Array.isArray(bundle.appIds) || bundle.appIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'هذه الباقة لا تحتوي على أي أدوات'
      });
    }

    // 2. Check Wallet & Transaction
    await executeWithRetry(async () => {
      return await getSharedPrismaClient().$transaction(async (tx) => {

        // Check Wallet
        let wallet = await tx.companyWallet.findUnique({
          where: { companyId }
        });

        // Create wallet if not exists
        if (!wallet) {
          wallet = await tx.companyWallet.create({
            data: {
              id: uuidv4(),
              companyId,
              balance: 0,
              currency: 'EGP'
            }
          });
        }

        if (Number(wallet.balance) < Number(bundle.monthlyPrice)) {
          throw new Error(`رصيد المحفظة غير كافٍ. المطلوب: ${bundle.monthlyPrice} ${wallet.currency}، المتوفر: ${wallet.balance} ${wallet.currency}`);
        }

        // Deduct from Wallet
        await tx.companyWallet.update({
          where: { companyId },
          data: {
            balance: { decrement: Number(bundle.monthlyPrice) }
          }
        });

        // Record Transaction
        await tx.transaction.create({
          data: {
            id: uuidv4(),
            walletId: wallet.id,
            type: 'PAYMENT',
            amount: bundle.monthlyPrice,
            description: `الاشتراك في باقة: ${bundle.name}`,
            referenceId: `BUNDLE_SUB_${bundle.slug}_${Date.now()}`
          }
        });

        // 3. Install/Activate Apps
        const nextBillingAt = new Date();
        nextBillingAt.setDate(nextBillingAt.getDate() + 30); // 30 Days

        for (const appId of bundle.appIds) {
          await tx.companyApp.upsert({
            where: {
              companyId_appId: { companyId, appId }
            },
            update: {
              status: 'ACTIVE',
              validUntil: nextBillingAt,
              settings: {
                isBundle: true,
                bundleSlug: bundle.slug,
                activatedAt: new Date()
              }
            },
            create: {
              id: uuidv4(),
              companyId,
              appId,
              status: 'ACTIVE',
              validUntil: nextBillingAt,
              settings: {
                isBundle: true,
                bundleSlug: bundle.slug,
                activatedAt: new Date()
              }
            }
          });

          // Increment install count if new (approximate)
          await tx.marketplaceApp.update({
            where: { id: appId },
            data: { installCount: { increment: 1 } }
          });
        }
      }, {
        timeout: 20000 // Increase timeout to 20s
      });
    });

    res.json({
      success: true,
      message: `تم الاشتراك في ${bundle.name} وتفعيل ${bundle.appIds.length} أداة بنجاح! 🎉`
    });

  } catch (error) {
    console.error('Error subscribing to bundle:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'خطأ في الاشتراك في الباقة'
    });
  }
};
