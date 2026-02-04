const analyticsService = require('../services/analyticsService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getStoreAnalytics = async (req, res) => {
  try {
    // Support both authenticated and public routes
    const companyId = req.user?.companyId || req.headers['x-company-id'];

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مطلوب'
      });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const analytics = await analyticsService.getStoreAnalytics(companyId, start, end);

    res.json({
      success: true,
      data: analytics,
      period: { start, end, days: period }
    });
  } catch (error) {
    console.error('Error in getStoreAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
};

const getConversionRate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = new Date();
    let start;

    // Smart date handling - support both days count and actual dates
    try {
      if (startDate && endDate) {
        // Check if startDate is a number (days ago)
        const daysAgo = parseInt(startDate);
        if (!isNaN(daysAgo) && daysAgo > 0) {
          start = new Date(end.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
        } else {
          // Treat as actual dates
          start = new Date(startDate);
          end = new Date(endDate);
        }
      } else if (period === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        start = yesterday;
        end = new Date(yesterday);
        end.setHours(23, 59, 59, 999);
      } else {
        const days = parseInt(period);
        start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
      }
    } catch (dateErr) {
      console.error('Date parsing error:', dateErr);
      // Fallback to 30 days
      start = new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    const conversionData = await analyticsService.getStoreConversionRate(companyId, start, end);

    res.json({
      success: true,
      data: conversionData,
      period: { start, end }
    });
  } catch (error) {
    console.error('❌ Error in getConversionRate:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate, period: req.query.period }
    });

    // Return proper error response
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معدل التحويل',
      error: error.message
    });
  }
};

const getProductConversionRate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { productId } = req.params;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = new Date();
    let start;

    // Smart date handling - support both days count and actual dates
    try {
      if (startDate && endDate) {
        const daysAgo = parseInt(startDate);
        if (!isNaN(daysAgo) && daysAgo > 0) {
          start = new Date(end.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
        } else {
          start = new Date(startDate);
          end = new Date(endDate);
        }
      } else {
        const days = parseInt(period);
        start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
      }
    } catch (dateErr) {
      console.error('Date parsing error:', dateErr);
      start = new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    const conversionData = await analyticsService.getProductConversionRate(
      productId,
      companyId,
      start,
      end
    );

    const product = await getSharedPrismaClient().product.findFirst({
      where: { id: productId, companyId },
      select: { id: true, name: true, price: true, images: true }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود أو غير مصرح بالوصول إليه'
      });
    }

    res.json({
      success: true,
      data: {
        product,
        ...conversionData
      },
      period: { start, end }
    });
  } catch (error) {
    console.error('❌ Error in getProductConversionRate:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      productId: req.params?.productId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate, period: req.query.period }
    });

    // Return proper error response
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معدل تحويل المنتج',
      error: error.message
    });
  }
};

const getTopProducts = async (req, res) => {
  try {
    // Support both authenticated and public routes
    const companyId = req.user?.companyId || req.headers['x-company-id'];

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30', limit = 10 } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const topProducts = await analyticsService.getTopPerformingProducts(
      companyId,
      start,
      end,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: topProducts,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error in getTopProducts:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أفضل المنتجات',
      error: error.message
    });
  }
};

const trackProductView = async (req, res) => {
  try {
    const { productId, sessionId, source } = req.body;
    const companyId = req.headers['x-company-id'] || req.query.companyId;

    if (!companyId || !productId || !sessionId) {
      console.warn('⚠️ [Analytics] Missing data for product view:', { companyId, productId, sessionId });
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة - companyId, productId, sessionId مطلوبة'
      });
    }

    console.log(`📊 [Analytics] Tracking Product View: Product=${productId}, Session=${sessionId}, Company=${companyId}`);


    const product = await getSharedPrismaClient().product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    await analyticsService.trackProductVisit({
      productId,
      companyId,
      sessionId,
      source
    });

    res.json({ success: true, message: 'تم تسجيل الزيارة بنجاح' });
  } catch (error) {
    console.error('Error in trackProductView:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الزيارة',
      error: error.message
    });
  }
};

const trackStoreVisit = async (req, res) => {
  try {
    const { sessionId, ipAddress, userAgent, referrer, landingPage } = req.body;
    const companyId = req.headers['x-company-id'] || req.query.companyId;

    if (!companyId || !sessionId) {
      console.warn('⚠️ [Analytics] Missing data for store visit:', { companyId, sessionId });
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة - companyId, sessionId مطلوبة'
      });
    }

    console.log(`🏪 [Analytics] Tracking Store Visit: Session=${sessionId}, IP=${ipAddress}, Company=${companyId}`);


    await analyticsService.trackStoreVisit({
      companyId,
      sessionId,
      ipAddress,
      userAgent,
      referrer,
      landingPage
    });

    res.json({ success: true, message: 'تم تسجيل زيارة المتجر بنجاح' });
  } catch (error) {
    console.error('Error in trackStoreVisit:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الزيارة',
      error: error.message
    });
  }
};

const trackConversion = async (req, res) => {
  try {
    const { sessionId, eventType, productId, orderId, value, metadata } = req.body;
    const companyId = req.headers['x-company-id'] || req.query.companyId;

    if (!companyId || !sessionId || !eventType) {
      console.warn('⚠️ [Analytics] Missing data for conversion:', { companyId, sessionId, eventType });
      return res.status(400).json({
        success: false,
        message: 'بيانات ناقصة - companyId, sessionId, eventType مطلوبة'
      });
    }

    console.log(`💰 [Analytics] Tracking Conversion: Event=${eventType}, Value=${value}, Company=${companyId}`);


    await analyticsService.trackConversionEvent({
      companyId,
      sessionId,
      eventType,
      productId,
      orderId,
      value,
      metadata
    });

    res.json({ success: true, message: 'تم تسجيل حدث التحويل بنجاح' });
  } catch (error) {
    console.error('Error in trackConversion:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الحدث',
      error: error.message
    });
  }
};

const getDailyAnalytics = async (req, res) => {
  try {
    // Support both authenticated and public routes
    const companyId = req.user?.companyId || req.headers['x-company-id'];

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const dailyData = await analyticsService.getDailyAnalyticsByDate(companyId, start, end);

    res.json({
      success: true,
      data: dailyData,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error in getDailyAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات اليومية',
      error: error.message
    });
  }
};

const getProductAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate, period = '30' } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (parseInt(period) * 24 * 60 * 60 * 1000));

    const productData = await analyticsService.getProductAnalyticsByDate(companyId, start, end);

    res.json({
      success: true,
      data: productData,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error in getProductAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات المنتجات',
      error: error.message
    });
  }
};

// Get Variations Analytics
const getVariationsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      orders: {
        is: {
          companyId: String(companyId),
          ...(startDate && endDate ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          } : {})
        }
      }
    };

    const orderItems = await prisma.orderItem.findMany({
      where: whereClause,
      include: {
        product: {
          select: { name: true }
        }
      }
    });

    const variationsMap = {};
    orderItems.forEach(item => {
      // Build variation string from color and size
      const variationParts = [];
      if (item.productColor) variationParts.push(item.productColor);
      if (item.productSize) variationParts.push(item.productSize);

      if (variationParts.length > 0) {
        const variation = variationParts.join(' - ');
        const key = `${item.product?.name || item.productName} - ${variation}`;

        if (!variationsMap[key]) {
          variationsMap[key] = {
            productName: item.product?.name || item.productName,
            variation: variation,
            color: item.productColor || '',
            size: item.productSize || '',
            quantity: 0,
            revenue: 0,
            orders: 0
          };
        }
        variationsMap[key].quantity += item.quantity;
        variationsMap[key].revenue += parseFloat(item.price) * item.quantity;
        variationsMap[key].orders += 1;
      }
    });

    const variations = Object.values(variationsMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        variations,
        totalVariations: variations.length,
        totalRevenue: variations.reduce((sum, v) => sum + v.revenue, 0),
        totalQuantity: variations.reduce((sum, v) => sum + v.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Error in getVariationsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل المقاسات', error: error.message });
  }
};

// Get Categories Analytics
const getCategoriesAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح - معرف الشركة مطلوب' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      orders: {
        is: {
          companyId: String(companyId),
          ...(startDate && endDate ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          } : {})
        }
      }
    };

    const orderItems = await prisma.orderItem.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            name: true,
            category: {
              select: { name: true }
            }
          }
        }
      }
    });

    const categoriesMap = {};
    orderItems.forEach(item => {
      const category = item.product?.category?.name || item.product?.category || 'غير مصنف';
      if (!categoriesMap[category]) {
        categoriesMap[category] = {
          category,
          quantity: 0,
          revenue: 0,
          orders: 0,
          products: new Set()
        };
      }
      categoriesMap[category].quantity += item.quantity;
      categoriesMap[category].revenue += parseFloat(item.price) * item.quantity;
      categoriesMap[category].orders += 1;
      if (item.product?.name) {
        categoriesMap[category].products.add(item.product.name);
      }
    });

    const categories = Object.values(categoriesMap).map(cat => {
      const { products, ...rest } = cat;
      return {
        ...rest,
        productsCount: products.size
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);
    const categoriesWithPercentage = categories.map(cat => ({
      ...cat,
      percentage: totalRevenue > 0 ? parseFloat(((cat.revenue / totalRevenue) * 100).toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: {
        categories: categoriesWithPercentage,
        totalCategories: categories.length,
        totalRevenue,
        totalQuantity: categories.reduce((sum, c) => sum + c.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Error in getCategoriesAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل الأقسام', error: error.message });
  }
};

// Get Payment Methods Analytics
const getPaymentMethodsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        paymentMethod: true,
        total: true,
        status: true
      }
    });

    const methodsMap = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'غير محدد';
      if (!methodsMap[method]) {
        methodsMap[method] = {
          method,
          orders: 0,
          revenue: 0,
          completed: 0,
          cancelled: 0
        };
      }
      methodsMap[method].orders += 1;
      methodsMap[method].revenue += parseFloat(order.total);
      if (order.status === 'DELIVERED') methodsMap[method].completed += 1;
      if (order.status === 'CANCELLED') methodsMap[method].cancelled += 1;
    });

    const methods = Object.values(methodsMap);
    const totalRevenue = methods.reduce((sum, m) => sum + m.revenue, 0);
    const totalOrders = methods.reduce((sum, m) => sum + m.orders, 0);

    const methodsWithPercentage = methods.map(method => ({
      name: method.method,
      count: method.orders,
      revenue: method.revenue,
      completed: method.completed,
      cancelled: method.cancelled,
      percentage: totalOrders > 0 ? parseFloat(((method.orders / totalOrders) * 100).toFixed(2)) : 0,
      successRate: method.orders > 0 ? parseFloat(((method.completed / method.orders) * 100).toFixed(2)) : 0,
      cancellationRate: method.orders > 0 ? parseFloat(((method.cancelled / method.orders) * 100).toFixed(2)) : 0,
      averageOrderValue: method.orders > 0 ? parseFloat((method.revenue / method.orders).toFixed(2)) : 0
    })).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        methods: methodsWithPercentage,
        totalRevenue,
        totalOrders
      }
    });
  } catch (error) {
    console.error('Error in getPaymentMethodsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل طرق الدفع', error: error.message });
  }
};

// Get Regions Analytics
const getRegionsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    // Fetch orders with customer info for customer counting
    // Note: city and governorate are on Order model, not Customer model
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true
          }
        }
      }
    });

    const regionsMap = {};
    orders.forEach(order => {
      // Access city and governorate directly from order, not from customer
      const region = order.governorate || order.city || 'غير محدد';
      if (!regionsMap[region]) {
        regionsMap[region] = {
          region,
          orders: 0,
          revenue: 0,
          customers: new Set()
        };
      }
      regionsMap[region].orders += 1;
      regionsMap[region].revenue += parseFloat(order.total);
      if (order.customer?.id) {
        regionsMap[region].customers.add(order.customer.id);
      }
    });

    const regions = Object.values(regionsMap).map(reg => {
      const { customers, ...rest } = reg;
      return {
        ...rest,
        customersCount: customers.size,
        avgOrderValue: reg.orders > 0 ? parseFloat((reg.revenue / reg.orders).toFixed(2)) : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = regions.reduce((sum, r) => sum + r.revenue, 0);
    const regionsWithPercentage = regions.map(region => ({
      ...region,
      percentage: totalRevenue > 0 ? parseFloat(((region.revenue / totalRevenue) * 100).toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: {
        regions: regionsWithPercentage,
        totalRegions: regions.length,
        totalRevenue,
        totalOrders: regions.reduce((sum, r) => sum + r.orders, 0)
      }
    });
  } catch (error) {
    console.error('Error in getRegionsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التحليل الجغرافي', error: error.message });
  }
};

// Get Coupons Analytics
const getCouponsAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    // Get all coupons
    const coupons = await prisma.coupon.findMany({
      where: {
        companyId: String(companyId)
      },
      include: {
        coupon_usages: {
          where: startDate && endDate ? {
            usedAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          } : {}
        }
      }
    });

    // Calculate stats from coupon_usages
    const couponStats = coupons.map(coupon => {
      const usages = coupon.coupon_usages || [];
      const usageCount = usages.length;

      // Calculate total discount based on coupon type and value
      let totalDiscount = 0;
      if (coupon.type === 'PERCENTAGE') {
        // For percentage coupons, we need to estimate based on usage count
        // This is an approximation since we don't have order totals
        totalDiscount = usageCount * (parseFloat(coupon.value) || 0);
      } else if (coupon.type === 'FIXED') {
        totalDiscount = usageCount * (parseFloat(coupon.value) || 0);
      }

      return {
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        usageCount: usageCount,
        usageLimit: coupon.usageLimit,
        totalDiscount: totalDiscount,
        totalRevenue: 0, // Not available without order link
        orders: usageCount,
        completedOrders: usageCount, // Assume all usages are completed
        conversionRate: 100, // Assume 100% since usage means it was used
        isActive: coupon.isActive,
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
        roi: 0 // Cannot calculate without revenue data
      };
    }).sort((a, b) => b.usageCount - a.usageCount);

    const totalDiscount = couponStats.reduce((sum, c) => sum + c.totalDiscount, 0);
    const totalRevenue = couponStats.reduce((sum, c) => sum + c.totalRevenue, 0);
    const totalOrders = couponStats.reduce((sum, c) => sum + c.orders, 0);

    res.json({
      success: true,
      data: {
        coupons: couponStats,
        totalCoupons: coupons.length,
        activeCoupons: coupons.filter(c => c.isActive).length,
        totalDiscount,
        totalRevenue,
        totalOrders,
        avgDiscountPerOrder: totalOrders > 0 ? (totalDiscount / totalOrders).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error in getCouponsAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل الكوبونات', error: error.message });
  }
};

// Get COD Performance Analytics
const getCODPerformanceAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      paymentMethod: 'COD',
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    const codOrders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        customer: {
          select: {
            governorate: true,
            city: true
          }
        }
      }
    });

    const totalOrders = codOrders.length;
    const deliveredOrders = codOrders.filter(o => o.status === 'DELIVERED').length;
    const cancelledOrders = codOrders.filter(o => o.status === 'CANCELLED').length;
    const returnedOrders = codOrders.filter(o => o.status === 'RETURNED').length;
    const pendingOrders = codOrders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)).length;

    const totalRevenue = codOrders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + parseFloat(o.total), 0);
    const lostRevenue = codOrders.filter(o => ['CANCELLED', 'RETURNED'].includes(o.status)).reduce((sum, o) => sum + parseFloat(o.total), 0);

    // Regional performance
    const regionMap = {};
    codOrders.forEach(order => {
      const region = order.customer?.governorate || order.customer?.city || 'غير محدد';
      if (!regionMap[region]) {
        regionMap[region] = { total: 0, delivered: 0, cancelled: 0 };
      }
      regionMap[region].total += 1;
      if (order.status === 'DELIVERED') regionMap[region].delivered += 1;
      if (order.status === 'CANCELLED') regionMap[region].cancelled += 1;
    });

    const regionalPerformance = Object.entries(regionMap).map(([region, stats]) => ({
      region,
      totalOrders: stats.total,
      deliveredOrders: stats.delivered,
      cancelledOrders: stats.cancelled,
      successRate: stats.total > 0 ? parseFloat(((stats.delivered / stats.total) * 100).toFixed(2)) : 0,
      cancellationRate: stats.total > 0 ? parseFloat(((stats.cancelled / stats.total) * 100).toFixed(2)) : 0
    })).sort((a, b) => b.totalOrders - a.totalOrders);

    res.json({
      success: true,
      data: {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        pendingOrders,
        successRate: totalOrders > 0 ? parseFloat(((deliveredOrders / totalOrders) * 100).toFixed(2)) : 0,
        cancellationRate: totalOrders > 0 ? parseFloat(((cancelledOrders / totalOrders) * 100).toFixed(2)) : 0,
        returnRate: totalOrders > 0 ? parseFloat(((returnedOrders / totalOrders) * 100).toFixed(2)) : 0,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        lostRevenue: parseFloat(lostRevenue.toFixed(2)),
        avgOrderValue: deliveredOrders > 0 ? parseFloat((totalRevenue / deliveredOrders).toFixed(2)) : 0,
        regionalPerformance: regionalPerformance.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('❌ Error in getCODPerformanceAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateRange: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({
      success: true,
      data: {
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        returnedOrders: 0,
        pendingOrders: 0,
        successRate: 0,
        cancellationRate: 0,
        returnRate: 0,
        totalRevenue: 0,
        lostRevenue: 0,
        avgOrderValue: 0,
        regionalPerformance: []
      },
      error: error.message
    });
  }
};

// Get Abandoned Cart Analytics
const getAbandonedCartAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    // Smart date handling
    let dateFilter = {};
    if (startDate && endDate) {
      try {
        dateFilter = {
          updatedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        };
      } catch (err) {
        console.error('Date parsing error:', err);
      }
    }

    // ✅ FIXED: Use GuestCart instead of Cart (Cart model doesn't exist)
    const guestCarts = await prisma.guestCart.findMany({
      where: {
        companyId: String(companyId),
        ...dateFilter
      },
      select: {
        id: true,
        cartId: true,
        items: true,  // JSON string
        total: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true
      }
    });

    // Get guest orders to identify converted carts
    const guestOrders = await prisma.guestOrder.findMany({
      where: {
        companyId: String(companyId),
        ...(startDate && endDate ? {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        } : {})
      },
      select: {
        guestCartId: true,
        createdAt: true
      }
    });

    const convertedCartIds = new Set(guestOrders.map(o => o.guestCartId).filter(Boolean));

    // Calculate abandoned carts (carts without orders and expired)
    const now = new Date();
    const abandonedCarts = guestCarts.filter(cart => {
      const isExpired = new Date(cart.expiresAt) < now;
      const isNotConverted = !convertedCartIds.has(cart.cartId);
      return isExpired && isNotConverted;
    });

    // Parse cart items and calculate totals
    let totalCartValue = 0;
    const productMap = {};
    
    abandonedCarts.forEach(cart => {
      try {
        const cartValue = parseFloat(cart.total) || 0;
        totalCartValue += cartValue;
        
        // Parse items JSON
        const items = JSON.parse(cart.items || '[]');
        items.forEach(item => {
          const key = item.productName || item.name || 'غير معروف';
          if (!productMap[key]) {
            productMap[key] = {
              productName: key,
              category: item.category || 'غير مصنف',
              abandonedCount: 0,
              lostRevenue: 0
            };
          }
          productMap[key].abandonedCount += parseInt(item.quantity) || 0;
          productMap[key].lostRevenue += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
        });
      } catch (parseError) {
        console.error('Error parsing cart items:', parseError);
      }
    });

    const topAbandonedProducts = Object.values(productMap)
      .sort((a, b) => b.lostRevenue - a.lostRevenue)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        totalCarts: guestCarts.length,
        abandonedCarts: abandonedCarts.length,
        convertedCarts: guestCarts.length - abandonedCarts.length,
        abandonmentRate: guestCarts.length > 0 ? parseFloat(((abandonedCarts.length / guestCarts.length) * 100).toFixed(2)) : 0,
        totalCartValue: parseFloat(totalCartValue.toFixed(2)),
        avgCartValue: abandonedCarts.length > 0 ? parseFloat((totalCartValue / abandonedCarts.length).toFixed(2)) : 0,
        topAbandonedProducts: topAbandonedProducts.map(p => ({
          ...p,
          lostRevenue: parseFloat(p.lostRevenue.toFixed(2))
        })),
        recentAbandonedCarts: abandonedCarts.slice(0, 20).map(cart => {
          let itemsCount = 0;
          try {
            const items = JSON.parse(cart.items || '[]');
            itemsCount = items.length;
          } catch (e) {
            console.error('Error parsing cart items for recent carts:', e);
          }
          
          return {
            cartId: cart.cartId,
            itemsCount,
            cartValue: parseFloat(cart.total) || 0,
            lastUpdated: cart.updatedAt,
            expiresAt: cart.expiresAt
          };
        })
      }
    });
  } catch (error) {
    console.error('❌ Error in getAbandonedCartAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({ 
      success: true, 
      data: {
        totalCarts: 0,
        abandonedCarts: 0,
        convertedCarts: 0,
        abandonmentRate: 0,
        totalCartValue: 0,
        avgCartValue: 0,
        topAbandonedProducts: [],
        recentAbandonedCarts: []
      },
      error: error.message 
    });
  }
};

// Get Customer Quality Scoring
const getCustomerQualityAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const customers = await prisma.customer.findMany({
      where: {
        companyId: String(companyId)
      },
      include: {
        orders: {
          where: startDate && endDate ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          } : {},
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    const customerScores = customers.map(customer => {
      const orders = customer.orders;
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
      const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
      const totalSpent = orders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + parseFloat(o.total), 0);

      // Calculate recency (days since last order)
      const lastOrderDate = orders.length > 0 ? new Date(Math.max(...orders.map(o => new Date(o.createdAt)))) : null;
      const daysSinceLastOrder = lastOrderDate ? Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24)) : 999;

      // Scoring algorithm (0-100)
      let score = 0;

      // Frequency score (30 points)
      if (totalOrders >= 10) score += 30;
      else if (totalOrders >= 5) score += 20;
      else if (totalOrders >= 3) score += 10;
      else if (totalOrders >= 1) score += 5;

      // Monetary score (30 points)
      if (totalSpent >= 10000) score += 30;
      else if (totalSpent >= 5000) score += 20;
      else if (totalSpent >= 2000) score += 10;
      else if (totalSpent >= 500) score += 5;

      // Recency score (20 points)
      if (daysSinceLastOrder <= 7) score += 20;
      else if (daysSinceLastOrder <= 30) score += 15;
      else if (daysSinceLastOrder <= 90) score += 10;
      else if (daysSinceLastOrder <= 180) score += 5;

      // Completion rate score (20 points)
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) : 0;
      score += Math.floor(completionRate * 20);

      // Determine quality tier
      let tier = 'منخفض';
      if (score >= 80) tier = 'VIP';
      else if (score >= 60) tier = 'عالي';
      else if (score >= 40) tier = 'متوسط';

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalSpent,
        avgOrderValue: completedOrders > 0 ? (totalSpent / completedOrders).toFixed(2) : 0,
        daysSinceLastOrder,
        completionRate: (completionRate * 100).toFixed(2),
        score: Math.min(100, score),
        tier
      };
    }).filter(c => c.totalOrders > 0)
      .sort((a, b) => b.score - a.score);

    // Segment customers by tier
    const tierCounts = {
      VIP: customerScores.filter(c => c.tier === 'VIP').length,
      'عالي': customerScores.filter(c => c.tier === 'عالي').length,
      'متوسط': customerScores.filter(c => c.tier === 'متوسط').length,
      'منخفض': customerScores.filter(c => c.tier === 'منخفض').length
    };

    const totalRevenue = customerScores.reduce((sum, c) => sum + parseFloat(c.totalSpent), 0);
    const vipRevenue = customerScores.filter(c => c.tier === 'VIP').reduce((sum, c) => sum + parseFloat(c.totalSpent), 0);

    res.json({
      success: true,
      data: {
        customers: customerScores.slice(0, 100),
        totalCustomers: customerScores.length,
        tierCounts,
        totalRevenue,
        vipRevenue,
        vipRevenuePercentage: totalRevenue > 0 ? ((vipRevenue / totalRevenue) * 100).toFixed(2) : 0,
        avgCustomerScore: customerScores.length > 0 ? (customerScores.reduce((sum, c) => sum + c.score, 0) / customerScores.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error in getCustomerQualityAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تصنيف جودة العملاء', error: error.message });
  }
};

// Get Profit Analytics with COGS
const getProfitAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      status: 'DELIVERED',
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                costPrice: true,
                category: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalShipping = 0;
    const productProfits = {};
    const categoryProfits = {};
    const dailyProfits = {};

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      const orderTotal = parseFloat(order.total) || 0;
      const shippingCost = parseFloat(order.shipping) || 0;

      totalRevenue += orderTotal;
      totalShipping += shippingCost;

      if (!dailyProfits[orderDate]) {
        dailyProfits[orderDate] = { date: orderDate, revenue: 0, cogs: 0, profit: 0, orders: 0 };
      }
      dailyProfits[orderDate].revenue += orderTotal;
      dailyProfits[orderDate].orders += 1;

      order.items.forEach(item => {
        const itemPrice = parseFloat(item.price) || 0;
        const costPrice = parseFloat(item.product?.costPrice) || (itemPrice * 0.6);
        const itemCOGS = costPrice * item.quantity;
        const itemRevenue = itemPrice * item.quantity;
        const itemProfit = itemRevenue - itemCOGS;

        totalCOGS += itemCOGS;
        dailyProfits[orderDate].cogs += itemCOGS;
        dailyProfits[orderDate].profit += itemProfit;

        const productName = item.product?.name || item.productName || 'غير معروف';
        if (!productProfits[productName]) {
          productProfits[productName] = { name: productName, revenue: 0, cogs: 0, profit: 0, quantity: 0, margin: 0 };
        }
        productProfits[productName].revenue += itemRevenue;
        productProfits[productName].cogs += itemCOGS;
        productProfits[productName].profit += itemProfit;
        productProfits[productName].quantity += item.quantity;

        const categoryName = item.product?.category?.name || 'غير مصنف';
        if (!categoryProfits[categoryName]) {
          categoryProfits[categoryName] = { name: categoryName, revenue: 0, cogs: 0, profit: 0 };
        }
        categoryProfits[categoryName].revenue += itemRevenue;
        categoryProfits[categoryName].cogs += itemCOGS;
        categoryProfits[categoryName].profit += itemProfit;
      });
    });

    const netProfit = totalRevenue - totalCOGS - totalShipping;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

    const topProducts = Object.values(productProfits)
      .map(p => ({
        ...p,
        margin: p.revenue > 0 ? parseFloat(((p.profit / p.revenue) * 100).toFixed(2)) : 0,
        revenue: parseFloat(p.revenue.toFixed(2)),
        cogs: parseFloat(p.cogs.toFixed(2)),
        profit: parseFloat(p.profit.toFixed(2))
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20);

    const categoryBreakdown = Object.values(categoryProfits)
      .map(c => ({
        ...c,
        margin: c.revenue > 0 ? parseFloat(((c.profit / c.revenue) * 100).toFixed(2)) : 0,
        revenue: parseFloat(c.revenue.toFixed(2)),
        cogs: parseFloat(c.cogs.toFixed(2)),
        profit: parseFloat(c.profit.toFixed(2))
      }))
      .sort((a, b) => b.profit - a.profit);

    const dailyData = Object.values(dailyProfits).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalCOGS: parseFloat(totalCOGS.toFixed(2)),
          totalShipping: parseFloat(totalShipping.toFixed(2)),
          grossProfit: parseFloat((totalRevenue - totalCOGS).toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          totalOrders: orders.length,
          avgOrderProfit: orders.length > 0 ? parseFloat((netProfit / orders.length).toFixed(2)) : 0
        },
        topProducts,
        categoryBreakdown,
        dailyData: dailyData.map(d => ({
          date: d.date,
          revenue: parseFloat(d.revenue.toFixed(2)),
          cogs: parseFloat(d.cogs.toFixed(2)),
          profit: parseFloat(d.profit.toFixed(2)),
          orders: d.orders
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error in getProfitAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateRange: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue: 0,
          totalCOGS: 0,
          totalShipping: 0,
          grossProfit: 0,
          netProfit: 0,
          profitMargin: 0,
          totalOrders: 0,
          avgOrderProfit: 0
        },
        topProducts: [],
        categoryBreakdown: [],
        dailyData: []
      },
      error: error.message
    });
  }
};

// Get Delivery Rate Analytics
const getDeliveryRateAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        governorate: true,
        city: true
      }
    });

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const shippedOrders = orders.filter(o => o.status === 'SHIPPED').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    const returnedOrders = orders.filter(o => o.status === 'RETURNED').length;

    const deliveryRate = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100) : 0;
    const failureRate = totalOrders > 0 ? (((cancelledOrders + returnedOrders) / totalOrders) * 100) : 0;

    // By region
    const regionStats = {};
    orders.forEach(order => {
      const region = order.governorate || order.city || 'غير محدد';
      if (!regionStats[region]) {
        regionStats[region] = { name: region, total: 0, delivered: 0, cancelled: 0, returned: 0 };
      }
      regionStats[region].total += 1;
      if (order.status === 'DELIVERED') regionStats[region].delivered += 1;
      if (order.status === 'CANCELLED') regionStats[region].cancelled += 1;
      if (order.status === 'RETURNED') regionStats[region].returned += 1;
    });

    const regionPerformance = Object.values(regionStats).map(r => ({
      ...r,
      deliveryRate: r.total > 0 ? ((r.delivered / r.total) * 100).toFixed(2) : 0
    })).sort((a, b) => b.total - a.total).slice(0, 15);

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          deliveredOrders,
          shippedOrders,
          cancelledOrders,
          returnedOrders,
          deliveryRate: deliveryRate.toFixed(2),
          failureRate: failureRate.toFixed(2),
          pendingOrders: totalOrders - deliveredOrders - cancelledOrders - returnedOrders
        },
        regionPerformance
      }
    });
  } catch (error) {
    console.error('Error in getDeliveryRateAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل التسليم', error: error.message });
  }
};

// Get Order Status Time Analytics
const getOrderStatusTimeAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const whereClause = {
      companyId: String(companyId),
      ...(startDate && endDate ? {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    // Get orders with status history
    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        statusHistory: {
          orderBy: {
            createdAt: 'asc'
          },
          select: {
            status: true,
            createdAt: true
          }
        }
      }
    });

    const statusTimes = {
      pendingToConfirmed: [],
      confirmedToShipped: [],
      shippedToDelivered: [],
      totalProcessing: []
    };

    // Calculate times based on status history
    orders.forEach(order => {
      const createdAt = new Date(order.createdAt);
      const history = order.statusHistory || [];

      let confirmedTime = null;
      let shippedTime = null;
      let deliveredTime = null;

      history.forEach(h => {
        const status = h.status?.toLowerCase();
        if (status === 'confirmed' && !confirmedTime) {
          confirmedTime = new Date(h.createdAt);
        } else if (status === 'shipped' && !shippedTime) {
          shippedTime = new Date(h.createdAt);
        } else if (status === 'delivered' && !deliveredTime) {
          deliveredTime = new Date(h.createdAt);
        }
      });

      if (confirmedTime) {
        const hoursToConfirm = (confirmedTime - createdAt) / (1000 * 60 * 60);
        if (hoursToConfirm >= 0 && hoursToConfirm < 720) {
          statusTimes.pendingToConfirmed.push(hoursToConfirm);
        }
      }

      if (confirmedTime && shippedTime) {
        const hoursToShip = (shippedTime - confirmedTime) / (1000 * 60 * 60);
        if (hoursToShip >= 0 && hoursToShip < 720) {
          statusTimes.confirmedToShipped.push(hoursToShip);
        }
      }

      if (shippedTime && deliveredTime) {
        const hoursToDeliver = (deliveredTime - shippedTime) / (1000 * 60 * 60);
        if (hoursToDeliver >= 0 && hoursToDeliver < 720) {
          statusTimes.shippedToDelivered.push(hoursToDeliver);
        }
      }

      if (deliveredTime) {
        const totalHours = (deliveredTime - createdAt) / (1000 * 60 * 60);
        if (totalHours >= 0 && totalHours < 720) {
          statusTimes.totalProcessing.push(totalHours);
        }
      }
    });

    const calcAvg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    // Status distribution
    const statusCounts = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        avgTimes: {
          pendingToConfirmed: calcAvg(statusTimes.pendingToConfirmed).toFixed(2),
          confirmedToShipped: calcAvg(statusTimes.confirmedToShipped).toFixed(2),
          shippedToDelivered: calcAvg(statusTimes.shippedToDelivered).toFixed(2),
          totalProcessing: calcAvg(statusTimes.totalProcessing).toFixed(2)
        },
        sampleSizes: {
          pendingToConfirmed: statusTimes.pendingToConfirmed.length,
          confirmedToShipped: statusTimes.confirmedToShipped.length,
          shippedToDelivered: statusTimes.shippedToDelivered.length,
          totalProcessing: statusTimes.totalProcessing.length
        },
        statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
          percentage: orders.length > 0 ? ((count / orders.length) * 100).toFixed(2) : 0
        })),
        totalOrders: orders.length
      }
    });
  } catch (error) {
    console.error('Error in getOrderStatusTimeAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تحليل وقت الحالات', error: error.message });
  }
};

// Get Product Health Score
const getProductHealthScore = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    const products = await prisma.product.findMany({
      where: { companyId: String(companyId), isActive: true },
      include: {
        orderItems: {
          where: {
            orders: {
              ...(startDate && endDate ? {
                createdAt: {
                  gte: new Date(startDate),
                  lte: new Date(endDate)
                }
              } : {})
            }
          },
          include: {
            orders: {
              select: { status: true, createdAt: true }
            }
          }
        },
        category: { select: { name: true } }
      }
    });

    const productScores = products.map(product => {
      const orderItems = product.orderItems || [];
      const totalOrders = orderItems.length;
      const deliveredOrders = orderItems.filter(i => i.orders?.status === 'DELIVERED').length;
      const cancelledOrders = orderItems.filter(i => i.orders?.status === 'CANCELLED').length;
      const returnedOrders = orderItems.filter(i => i.orders?.status === 'RETURNED').length;

      const totalQuantity = orderItems.reduce((sum, i) => sum + i.quantity, 0);
      const revenue = orderItems
        .filter(i => i.orders?.status === 'DELIVERED')
        .reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0);

      const costPrice = parseFloat(product.costPrice) || (parseFloat(product.price) * 0.6);
      const profit = revenue - (costPrice * orderItems.filter(i => i.orders?.status === 'DELIVERED').reduce((sum, i) => sum + i.quantity, 0));
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

      const deliveryRate = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100) : 0;
      const returnRate = totalOrders > 0 ? ((returnedOrders / totalOrders) * 100) : 0;
      const stock = product.stock || 0;

      // Health Score Algorithm (0-100)
      let score = 0;

      // Sales volume (25 points)
      if (totalQuantity >= 100) score += 25;
      else if (totalQuantity >= 50) score += 20;
      else if (totalQuantity >= 20) score += 15;
      else if (totalQuantity >= 5) score += 10;
      else if (totalQuantity >= 1) score += 5;

      // Profit margin (25 points)
      if (profitMargin >= 40) score += 25;
      else if (profitMargin >= 30) score += 20;
      else if (profitMargin >= 20) score += 15;
      else if (profitMargin >= 10) score += 10;
      else if (profitMargin > 0) score += 5;

      // Delivery rate (25 points)
      if (deliveryRate >= 90) score += 25;
      else if (deliveryRate >= 80) score += 20;
      else if (deliveryRate >= 70) score += 15;
      else if (deliveryRate >= 60) score += 10;
      else if (deliveryRate > 0) score += 5;

      // Stock health (25 points)
      if (stock >= 50) score += 25;
      else if (stock >= 20) score += 20;
      else if (stock >= 10) score += 15;
      else if (stock >= 5) score += 10;
      else if (stock > 0) score += 5;

      // Determine recommendation
      let recommendation = 'مراجعة';
      let status = 'warning';
      if (score >= 80) { recommendation = 'توسعة'; status = 'excellent'; }
      else if (score >= 60) { recommendation = 'استمرار'; status = 'good'; }
      else if (score >= 40) { recommendation = 'تحسين'; status = 'average'; }
      else if (score < 20 && totalOrders > 5) { recommendation = 'إيقاف'; status = 'poor'; }

      return {
        productId: product.id,
        productName: product.name,
        category: product.category?.name || 'غير مصنف',
        price: product.price,
        stock,
        totalOrders,
        totalQuantity,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        revenue,
        profit: profit.toFixed(2),
        profitMargin: profitMargin.toFixed(2),
        deliveryRate: deliveryRate.toFixed(2),
        returnRate: returnRate.toFixed(2),
        score,
        recommendation,
        status
      };
    }).filter(p => p.totalOrders > 0 || p.stock > 0)
      .sort((a, b) => b.score - a.score);

    const statusCounts = {
      excellent: productScores.filter(p => p.status === 'excellent').length,
      good: productScores.filter(p => p.status === 'good').length,
      average: productScores.filter(p => p.status === 'average').length,
      warning: productScores.filter(p => p.status === 'warning').length,
      poor: productScores.filter(p => p.status === 'poor').length
    };

    res.json({
      success: true,
      data: {
        products: productScores.slice(0, 50),
        totalProducts: productScores.length,
        statusCounts,
        avgScore: productScores.length > 0 ? (productScores.reduce((sum, p) => sum + p.score, 0) / productScores.length).toFixed(2) : 0,
        productsNeedingAttention: productScores.filter(p => p.status === 'poor' || p.status === 'warning').slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error in getProductHealthScore:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقييم صحة المنتجات', error: error.message });
  }
};

// Get Return & Refund Analytics
const getReturnAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    // Handle date parameters - if startDate is a number (days), calculate actual dates
    let dateFilter = {};
    if (startDate && endDate) {
      try {
        // Check if startDate is a number of days
        const daysAgo = parseInt(startDate);
        if (!isNaN(daysAgo) && daysAgo > 0) {
          const now = new Date();
          const start = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
          dateFilter = {
            createdAt: {
              gte: start,
              lte: now
            }
          };
        } else {
          // Treat as actual dates
          dateFilter = {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          };
        }
      } catch (err) {
        console.error('Date parsing error:', err);
      }
    }

    const whereClause = {
      companyId: String(companyId),
      status: { in: ['RETURNED', 'REFUNDED'] },
      ...dateFilter
    };

    const returnedOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {  // ✅ FIXED: Was 'items', now 'orderItems' (correct relation from schema)
          include: {
            product: { select: { name: true, category: { select: { name: true } } } }
          }
        },
        customer: { select: { governorate: true, city: true } }
      }
    });

    const totalOrders = await prisma.order.count({
      where: {
        companyId: String(companyId),
        ...dateFilter
      }
    });

    const totalReturns = returnedOrders.length;
    const returnRate = totalOrders > 0 ? ((totalReturns / totalOrders) * 100) : 0;
    const totalLostRevenue = returnedOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    // By product - with safe null checks
    const productReturns = {};
    returnedOrders.forEach(order => {
      // Safe access to orderItems (was 'items')
      const items = order.orderItems || [];

      items.forEach(item => {
        const productName = item.product?.name || item.productName || 'غير معروف';
        if (!productReturns[productName]) {
          productReturns[productName] = { name: productName, returns: 0, lostRevenue: 0 };
        }
        productReturns[productName].returns += item.quantity || 0;
        productReturns[productName].lostRevenue += (parseFloat(item.price) || 0) * (item.quantity || 0);
      });
    });

    // By region - with safe null checks and fallbacks
    const regionReturns = {};
    returnedOrders.forEach(order => {
      // Safe access with multiple fallbacks (customer relation or order direct fields)
      const region = order.customer?.governorate
        || order.governorate  // Fallback to order.governorate
        || order.customer?.city
        || order.city  // Fallback to order.city
        || 'غير محدد';

      if (!regionReturns[region]) {
        regionReturns[region] = { name: region, returns: 0, lostRevenue: 0 };
      }
      regionReturns[region].returns += 1;
      regionReturns[region].lostRevenue += parseFloat(order.total) || 0;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          totalReturns,
          returnRate: parseFloat(returnRate.toFixed(2)),
          totalLostRevenue: parseFloat(totalLostRevenue.toFixed(2)),
          avgReturnValue: totalReturns > 0 ? parseFloat((totalLostRevenue / totalReturns).toFixed(2)) : 0
        },
        topReturnedProducts: Object.values(productReturns)
          .map(p => ({
            ...p,
            lostRevenue: parseFloat(p.lostRevenue.toFixed(2))
          }))
          .sort((a, b) => b.returns - a.returns)
          .slice(0, 10),
        returnsByRegion: Object.values(regionReturns)
          .map(r => ({
            ...r,
            lostRevenue: parseFloat(r.lostRevenue.toFixed(2))
          }))
          .sort((a, b) => b.returns - a.returns)
          .slice(0, 10)
      }
    });
  } catch (error) {
    console.error('❌ Error in getReturnAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders: 0,
          totalReturns: 0,
          returnRate: 0,
          totalLostRevenue: 0,
          avgReturnValue: 0
        },
        topReturnedProducts: [],
        returnsByRegion: []
      },
      error: error.message
    });
  }
};

// Get Team Performance Analytics
const getTeamPerformanceAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    // Smart date handling
    let whereClause = {
      companyId: String(companyId)
    };
    
    if (startDate && endDate) {
      try {
        whereClause.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      } catch (err) {
        console.error('Date parsing error:', err);
      }
    }

    const users = await prisma.user.findMany({
      where: { companyId: String(companyId), isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        total: true,
        createdBy: true,
        confirmedBy: true,
        createdAt: true
      }
    });

    const userPerformance = {};
    users.forEach(user => {
      userPerformance[user.id] = {
        userId: user.id,
        userName: user.name,
        email: user.email,
        role: user.role,
        ordersCreated: 0,
        ordersConfirmed: 0,
        totalRevenue: 0,
        deliveredOrders: 0,
        cancelledOrders: 0
      };
    });

    orders.forEach(order => {
      if (order.createdBy && userPerformance[order.createdBy]) {
        userPerformance[order.createdBy].ordersCreated += 1;
        if (order.status === 'DELIVERED') {
          userPerformance[order.createdBy].totalRevenue += parseFloat(order.total) || 0;
          userPerformance[order.createdBy].deliveredOrders += 1;
        }
        if (order.status === 'CANCELLED') {
          userPerformance[order.createdBy].cancelledOrders += 1;
        }
      }
      if (order.confirmedBy && userPerformance[order.confirmedBy]) {
        userPerformance[order.confirmedBy].ordersConfirmed += 1;
      }
    });

    const teamStats = Object.values(userPerformance)
      .filter(u => u.ordersCreated > 0 || u.ordersConfirmed > 0)
      .map(u => ({
        ...u,
        totalRevenue: parseFloat(u.totalRevenue.toFixed(2)),
        successRate: u.ordersCreated > 0 ? parseFloat(((u.deliveredOrders / u.ordersCreated) * 100).toFixed(2)) : 0,
        avgOrderValue: u.deliveredOrders > 0 ? parseFloat((u.totalRevenue / u.deliveredOrders).toFixed(2)) : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({
      success: true,
      data: {
        teamMembers: teamStats,
        totalTeamMembers: teamStats.length,
        totalOrdersProcessed: orders.length,
        totalTeamRevenue: parseFloat(teamStats.reduce((sum, u) => sum + u.totalRevenue, 0).toFixed(2))
      }
    });
  } catch (error) {
    console.error('❌ Error in getTeamPerformanceAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({ 
      success: true, 
      data: {
        teamMembers: [],
        totalTeamMembers: 0,
        totalOrdersProcessed: 0,
        totalTeamRevenue: 0
      },
      error: error.message 
    });
  }
};

// Get Funnel Analytics
const getFunnelAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    // Smart date handling
    let dateFilter = {};
    if (startDate && endDate) {
      try {
        dateFilter = {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        };
      } catch (err) {
        console.error('Date parsing error:', err);
      }
    }

    // Get store visits
    const storeVisits = await prisma.storeVisit.count({
      where: { companyId: String(companyId), ...dateFilter }
    });

    // Get product views
    const productViews = await prisma.productVisit.count({
      where: { companyId: String(companyId), ...dateFilter }
    });

    // Get add to carts
    const addToCarts = await prisma.conversionEvent.count({
      where: { companyId: String(companyId), eventType: 'add_to_cart', ...dateFilter }
    });

    // Get checkouts
    const checkouts = await prisma.conversionEvent.count({
      where: { companyId: String(companyId), eventType: 'checkout', ...dateFilter }
    });

    // Get purchases
    const purchases = await prisma.order.count({
      where: { companyId: String(companyId), ...dateFilter }
    });

    // Get delivered orders - ✅ FIXED: Use UPPERCASE enum value
    const deliveredOrders = await prisma.order.count({
      where: { companyId: String(companyId), status: 'DELIVERED', ...dateFilter }
    });

    const funnelSteps = [
      { step: 'زيارات المتجر', count: storeVisits, rate: 100 },
      { step: 'مشاهدات المنتجات', count: productViews, rate: storeVisits > 0 ? ((productViews / storeVisits) * 100) : 0 },
      { step: 'إضافة للسلة', count: addToCarts, rate: productViews > 0 ? ((addToCarts / productViews) * 100) : 0 },
      { step: 'بدء الدفع', count: checkouts, rate: addToCarts > 0 ? ((checkouts / addToCarts) * 100) : 0 },
      { step: 'إتمام الطلب', count: purchases, rate: checkouts > 0 ? ((purchases / checkouts) * 100) : 0 },
      { step: 'تسليم ناجح', count: deliveredOrders, rate: purchases > 0 ? ((deliveredOrders / purchases) * 100) : 0 }
    ];

    const overallConversionRate = storeVisits > 0 ? ((deliveredOrders / storeVisits) * 100) : 0;

    // Find biggest drop-off
    let biggestDropOff = { from: '', to: '', dropRate: 0 };
    for (let i = 0; i < funnelSteps.length - 1; i++) {
      if (funnelSteps[i].count > 0) {
        const dropRate = 100 - ((funnelSteps[i + 1].count / funnelSteps[i].count) * 100);
        if (dropRate > biggestDropOff.dropRate) {
          biggestDropOff = {
            from: funnelSteps[i].step,
            to: funnelSteps[i + 1].step,
            dropRate: dropRate
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        funnelSteps: funnelSteps.map(s => ({ 
          ...s, 
          rate: parseFloat(s.rate.toFixed(2)) 
        })),
        overallConversionRate: parseFloat(overallConversionRate.toFixed(2)),
        biggestDropOff: {
          ...biggestDropOff,
          dropRate: parseFloat(biggestDropOff.dropRate.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('❌ Error in getFunnelAnalytics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      companyId: req.user?.companyId,
      dateParams: { startDate: req.query.startDate, endDate: req.query.endDate }
    });

    // Return safe empty response instead of crashing
    res.status(200).json({ 
      success: true, 
      data: {
        funnelSteps: [
          { step: 'زيارات المتجر', count: 0, rate: 0 },
          { step: 'مشاهدات المنتجات', count: 0, rate: 0 },
          { step: 'إضافة للسلة', count: 0, rate: 0 },
          { step: 'بدء الدفع', count: 0, rate: 0 },
          { step: 'إتمام الطلب', count: 0, rate: 0 },
          { step: 'تسليم ناجح', count: 0, rate: 0 }
        ],
        overallConversionRate: 0,
        biggestDropOff: { from: '', to: '', dropRate: 0 }
      },
      error: error.message 
    });
  }
};

// Get Stock Forecast Analytics
const getStockForecastAnalytics = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const prisma = getSharedPrismaClient();

    // Get products with their sales in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await prisma.product.findMany({
      where: { companyId: String(companyId), isActive: true },
      select: {
        id: true,
        name: true,
        stock: true
      }
    });

    // Get orders first
    const orders = await prisma.order.findMany({
      where: {
        companyId: String(companyId),
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'] }
      },
      select: {
        id: true
      }
    });

    const orderIds = orders.map(o => o.id);

    // Get order items for these orders
    const orderItems = await prisma.orderItem.findMany({
      where: {
        orderId: { in: orderIds },
        productId: { not: null }
      },
      select: {
        productId: true,
        quantity: true
      }
    });

    // Group order items by product
    const salesByProduct = {};
    orderItems.forEach(item => {
      if (!salesByProduct[item.productId]) {
        salesByProduct[item.productId] = 0;
      }
      salesByProduct[item.productId] += item.quantity;
    });

    const stockForecasts = products.map(product => {
      const totalSold = salesByProduct[product.id] || 0;
      const dailyAvgSales = totalSold / 30;
      const monthlyAvgSales = totalSold;
      const currentStock = product.stock || 0;
      const daysUntilStockout = dailyAvgSales > 0 ? Math.floor(currentStock / dailyAvgSales) : 999;

      let urgency = 'safe';
      if (daysUntilStockout <= 7) urgency = 'critical';
      else if (daysUntilStockout <= 14) urgency = 'warning';
      else if (daysUntilStockout <= 30) urgency = 'moderate';

      const suggestedReorder = Math.ceil(dailyAvgSales * 30);

      return {
        id: product.id,
        name: product.name,
        stock: currentStock,
        threshold: 10, // Default threshold
        salesVelocity: parseFloat(dailyAvgSales.toFixed(2)),
        avgSales: parseFloat(monthlyAvgSales.toFixed(2)),
        totalSoldLast30Days: totalSold,
        dailyAvgSales: parseFloat(dailyAvgSales.toFixed(2)),
        daysUntilStockout,
        urgency,
        suggestedReorder
      };
    }).filter(p => p.totalSoldLast30Days > 0 || p.stock > 0);

    // Categorize products
    const lowStockProducts = stockForecasts.filter(p => p.stock > 0 && p.stock <= p.threshold);
    const outOfStockProducts = stockForecasts.filter(p => p.stock === 0);
    const fastMovingProducts = stockForecasts
      .filter(p => p.salesVelocity > 0)
      .sort((a, b) => b.salesVelocity - a.salesVelocity)
      .slice(0, 20);
    const overstockedProducts = stockForecasts
      .filter(p => p.stock > 0 && p.avgSales > 0 && (p.stock / p.avgSales) > 3)
      .sort((a, b) => (b.stock / b.avgSales) - (a.stock / a.avgSales))
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        lowStockProducts,
        fastMovingProducts,
        overstockedProducts,
        totalLowStock: lowStockProducts.length,
        totalOutOfStock: outOfStockProducts.length,
        forecasts: stockForecasts.slice(0, 50),
        summary: {
          totalProducts: stockForecasts.length,
          criticalCount: stockForecasts.filter(p => p.urgency === 'critical').length,
          warningCount: stockForecasts.filter(p => p.urgency === 'warning').length,
          safeCount: stockForecasts.filter(p => p.urgency === 'safe').length
        }
      }
    });
  } catch (error) {
    console.error('Error in getStockForecastAnalytics:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب توقعات المخزون', error: error.message });
  }
};

// ==================== Public Analytics Endpoints ====================

const getPublicStoreAnalytics = async (req, res) => {
  try {
    // Get companyId from header (used in Storefront)
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب في الـ header'
      });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const analytics = await analyticsService.getStoreAnalytics(companyId, start, end);

    res.json({
      success: true,
      data: analytics,
      period: { start, end, days: period }
    });
  } catch (error) {
    console.error('Error in getPublicStoreAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
};

const getPublicTopProducts = async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب في الـ header'
      });
    }

    const { startDate, endDate, period = '30', limit = 10 } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const topProducts = await analyticsService.getTopPerformingProducts(
      companyId,
      start,
      end,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: topProducts,
      period: { start, end, days: period }
    });
  } catch (error) {
    console.error('Error in getPublicTopProducts:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أفضل المنتجات',
      error: error.message
    });
  }
};

const getPublicDailyAnalytics = async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب في الـ header'
      });
    }

    const { startDate, endDate, period = '30' } = req.query;

    let end = endDate ? new Date(endDate) : new Date();
    let start;

    if (startDate) {
      start = new Date(startDate);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      start = yesterday;
      end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
    } else {
      const days = parseInt(period);
      start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    const dailyAnalytics = await getSharedPrismaClient().dailyAnalytics.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end }
      },
      orderBy: { date: 'asc' }
    });

    res.json({
      success: true,
      data: dailyAnalytics,
      period: { start, end, days: period }
    });
  } catch (error) {
    console.error('Error in getPublicDailyAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات اليومية',
      error: error.message
    });
  }
};

module.exports = {
  getStoreAnalytics,
  getConversionRate,
  getProductConversionRate,
  getTopProducts,
  trackProductView,
  trackStoreVisit,
  trackConversion,
  getDailyAnalytics,
  getProductAnalytics,
  getVariationsAnalytics,
  getCategoriesAnalytics,
  getPaymentMethodsAnalytics,
  getRegionsAnalytics,
  getCouponsAnalytics,
  getCODPerformanceAnalytics,
  getAbandonedCartAnalytics,
  getCustomerQualityAnalytics,
  getProfitAnalytics,
  getDeliveryRateAnalytics,
  getOrderStatusTimeAnalytics,
  getProductHealthScore,
  getReturnAnalytics,
  getTeamPerformanceAnalytics,
  getFunnelAnalytics,
  getStockForecastAnalytics,
  // Public endpoints
  getPublicStoreAnalytics,
  getPublicTopProducts,
  getPublicDailyAnalytics
};
