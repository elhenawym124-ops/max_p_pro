const { getSharedPrismaClient } = require('./sharedDatabase');

class AnalyticsService {
  
  async trackStoreVisit(data) {
    const { companyId, sessionId, ipAddress, userAgent, referrer, landingPage } = data;
    
    if (!companyId) {
      console.warn('⚠️ [Analytics] trackStoreVisit called without companyId');
      return null;
    }
    
    // Verify company exists before creating visit record
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { id: true }
    });
    
    if (!company) {
      console.warn(`⚠️ [Analytics] Company not found: ${companyId}`);
      return null;
    }
    
    return await getSharedPrismaClient().storeVisit.create({
      data: {
        companyId,
        sessionId,
        ipAddress,
        userAgent,
        referrer,
        landingPage
      }
    });
  }
  
  async trackProductVisit(data) {
    const { productId, companyId, sessionId, source } = data;
    
    if (!companyId) {
      throw new Error('companyId is required');
    }
    
    const product = await getSharedPrismaClient().product.findFirst({
      where: { id: productId, companyId }
    });
    
    if (!product) {
      throw new Error('Product not found or does not belong to this company');
    }
    
    return await getSharedPrismaClient().productVisit.create({
      data: {
        productId,
        companyId,
        sessionId,
        source
      }
    });
  } 
  
  async trackConversionEvent(data) {
    const { companyId, sessionId, eventType, productId, orderId, value, metadata } = data;
    
    if (!companyId) {
      console.warn('⚠️ [Analytics] trackConversionEvent called without companyId');
      return null;
    }
    
    // Verify company exists
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { id: true }
    });
    
    if (!company) {
      console.warn(`⚠️ [Analytics] Company not found: ${companyId}`);
      return null;
    }
    
    // Validate product only for add_to_cart events
    if (productId && eventType === 'add_to_cart') {
      const product = await getSharedPrismaClient().product.findFirst({
        where: { id: productId, companyId }
      });
      
      if (!product) {
        console.warn(`Product ${productId} not found for company ${companyId}, but continuing with tracking`);
      }
    }
    
    // Verify order exists before adding it to avoid foreign key constraint errors
    let validOrderId = null;
    if (orderId) {
      const order = await getSharedPrismaClient().order.findFirst({
        where: { id: orderId, companyId }
      });
      
      if (order) {
        validOrderId = orderId;
      } else {
        console.warn(`Order ${orderId} not found for company ${companyId}, tracking without orderId`);
      }
    }
    
    return await getSharedPrismaClient().conversionEvent.create({
      data: {
        companyId,
        sessionId,
        eventType,
        productId,
        orderId: validOrderId,
        value: value ? parseFloat(value) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  }
  
  async getStoreConversionRate(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }
    
    const visits = await getSharedPrismaClient().storeVisit.count({
      where: {
        companyId,
        visitedAt: { gte: startDate, lte: endDate }
      }
    });
    
    const purchases = await getSharedPrismaClient().conversionEvent.count({
      where: {
        companyId,
        eventType: 'purchase',
        createdAt: { gte: startDate, lte: endDate }
      }
    });
    
    const conversionRate = visits > 0 ? (purchases / visits * 100).toFixed(2) : 0;
    
    return {
      visits,
      purchases,
      conversionRate: parseFloat(conversionRate)
    };
  }
  
  async getProductConversionRate(productId, companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }
    
    const product = await getSharedPrismaClient().product.findFirst({
      where: { id: productId, companyId }
    });
    
    if (!product) {
      throw new Error('Product not found or access denied');
    }
    
    const views = await getSharedPrismaClient().productVisit.count({
      where: {
        productId,
        companyId,
        visitedAt: { gte: startDate, lte: endDate }
      }
    });
    
    const addToCarts = await getSharedPrismaClient().conversionEvent.count({
      where: {
        productId,
        companyId,
        eventType: 'add_to_cart',
        createdAt: { gte: startDate, lte: endDate }
      }
    });
    
    const purchases = await getSharedPrismaClient().conversionEvent.count({
      where: {
        productId,
        companyId,
        eventType: 'purchase',
        createdAt: { gte: startDate, lte: endDate }
      }
    });
    
    const viewToCartRate = views > 0 ? (addToCarts / views * 100).toFixed(2) : 0;
    const cartToPurchaseRate = addToCarts > 0 ? (purchases / addToCarts * 100).toFixed(2) : 0;
    const overallConversionRate = views > 0 ? (purchases / views * 100).toFixed(2) : 0;
    
    return {
      views,
      addToCarts,
      purchases,
      viewToCartRate: parseFloat(viewToCartRate),
      cartToPurchaseRate: parseFloat(cartToPurchaseRate),
      conversionRate: parseFloat(overallConversionRate)
    };
  }
  
  async getStoreAnalytics(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }
    
    const [
      totalVisits,
      uniqueVisitors,
      totalProductViews,
      conversionEvents,
      purchaseEvents
    ] = await Promise.all([
      getSharedPrismaClient().storeVisit.count({
        where: { companyId, visitedAt: { gte: startDate, lte: endDate } }
      }),
      getSharedPrismaClient().storeVisit.groupBy({
        by: ['sessionId'],
        where: { companyId, visitedAt: { gte: startDate, lte: endDate } }
      }),
      getSharedPrismaClient().productVisit.count({
        where: { companyId, visitedAt: { gte: startDate, lte: endDate } }
      }),
      getSharedPrismaClient().conversionEvent.groupBy({
        by: ['eventType'],
        where: { companyId, createdAt: { gte: startDate, lte: endDate } },
        _count: true
      }),
      getSharedPrismaClient().conversionEvent.aggregate({
        where: { 
          companyId,
          eventType: 'purchase',
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { value: true },
        _count: true
      })
    ]);
    
    const addToCarts = conversionEvents.find(e => e.eventType === 'add_to_cart')?._count || 0;
    const checkouts = conversionEvents.find(e => e.eventType === 'checkout')?._count || 0;
    const purchases = conversionEvents.find(e => e.eventType === 'purchase')?._count || 0;
    
    // Calculate total revenue from purchase events
    const totalRevenue = purchaseEvents._sum.value ? parseFloat(purchaseEvents._sum.value) : 0;
    
    // Calculate average order value from purchase events
    const avgOrderValue = purchases > 0 ? (totalRevenue / purchases).toFixed(2) : 0;
    
    // Calculate conversion rates with proper fallbacks
    // Store-level conversion rate: purchases / total visits (overall store performance)
    const storeConversionRate = totalVisits > 0 ? (purchases / totalVisits * 100).toFixed(2) : 0;
    
    // Product-level conversion rate: purchases / product views (product engagement)
    const productConversionRate = totalProductViews > 0 ? (purchases / totalProductViews * 100).toFixed(2) : 0;
    
    // Funnel conversion rates
    const addToCartRate = totalProductViews > 0 ? (addToCarts / totalProductViews * 100).toFixed(2) : 0;
    const checkoutRate = addToCarts > 0 ? (checkouts / addToCarts * 100).toFixed(2) : 0;
    
    // Fix: If no checkouts but there are purchases, calculate from addToCarts instead
    const purchaseRate = checkouts > 0 
      ? (purchases / checkouts * 100).toFixed(2) 
      : (addToCarts > 0 ? (purchases / addToCarts * 100).toFixed(2) : 0);
    
    return {
      totalVisits,
      uniqueVisitors: uniqueVisitors.length,
      totalProductViews,
      addToCarts,
      checkouts,
      purchases,
      totalRevenue,
      // Main conversion rate (store-level): purchases / visits
      conversionRate: parseFloat(storeConversionRate),
      // Product engagement rate: purchases / product views
      productConversionRate: parseFloat(productConversionRate),
      avgOrderValue: parseFloat(avgOrderValue),
      addToCartRate: parseFloat(addToCartRate),
      checkoutRate: parseFloat(checkoutRate),
      purchaseRate: parseFloat(purchaseRate)
    };
  }
  
  async getTopPerformingProducts(companyId, startDate, endDate, limit = 10) {
    if (!companyId) {
      throw new Error('companyId is required');
    }
    
    // Optimized: Get all data in parallel with fewer queries
    const [productViews, addToCartEvents, purchaseEvents] = await Promise.all([
      // Get product views grouped by product
      getSharedPrismaClient().productVisit.groupBy({
        by: ['productId'],
        where: { companyId, visitedAt: { gte: startDate, lte: endDate } },
        _count: { id: true }
      }),
      // Get add to cart events grouped by product
      getSharedPrismaClient().conversionEvent.groupBy({
        by: ['productId'],
        where: { 
          companyId, 
          eventType: 'add_to_cart',
          createdAt: { gte: startDate, lte: endDate },
          productId: { not: null }
        },
        _count: { id: true }
      }),
      // Get purchase events grouped by product
      getSharedPrismaClient().conversionEvent.groupBy({
        by: ['productId'],
        where: { 
          companyId, 
          eventType: 'purchase',
          createdAt: { gte: startDate, lte: endDate },
          productId: { not: null }
        },
        _count: { id: true }
      })
    ]);
    
    // Get unique product IDs from all events
    const productIds = [...new Set(productViews.map(v => v.productId))];
    
    // Return empty array if no products found
    if (productIds.length === 0) {
      return [];
    }
    
    // Fetch all products at once
    const allProducts = await getSharedPrismaClient().product.findMany({
      where: { 
        companyId,
        id: { in: productIds }
      },
      select: { id: true, name: true, price: true, images: true }
    });
    
    // Create lookup maps for O(1) access
    const viewsMap = new Map(productViews.map(v => [v.productId, v._count.id]));
    const addToCartsMap = new Map(addToCartEvents.map(e => [e.productId, e._count.id]));
    const purchasesMap = new Map(purchaseEvents.map(e => [e.productId, e._count.id]));
    const productsMap = new Map(allProducts.map(p => [p.id, p]));
    
    // Build results with calculated conversion rates
    const results = productIds.map(productId => {
      const product = productsMap.get(productId);
      if (!product) return null;
      
      const views = viewsMap.get(productId) || 0;
      const addToCarts = addToCartsMap.get(productId) || 0;
      const purchases = purchasesMap.get(productId) || 0;
      
      const viewToCartRate = views > 0 ? parseFloat(((addToCarts / views) * 100).toFixed(2)) : 0;
      const cartToPurchaseRate = addToCarts > 0 ? parseFloat(((purchases / addToCarts) * 100).toFixed(2)) : 0;
      const conversionRate = views > 0 ? parseFloat(((purchases / views) * 100).toFixed(2)) : 0;
      
      return {
        ...product,
        views,
        addToCarts,
        purchases,
        viewToCartRate,
        cartToPurchaseRate,
        conversionRate
      };
    }).filter(p => p !== null);
    
    // Sort by conversion rate and limit
    return results
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, limit);
  }
  
  async aggregateDailyAnalytics(companyId, date) {
    if (!companyId) {
      throw new Error('companyId is required');
    }
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const analytics = await this.getStoreAnalytics(companyId, startOfDay, endOfDay);
    
    return await getSharedPrismaClient().dailyAnalytics.upsert({
      where: {
        companyId_date: {
          companyId,
          date: startOfDay
        }
      },
      update: {
        totalVisits: analytics.totalVisits,
        uniqueVisitors: analytics.uniqueVisitors,
        totalProductViews: analytics.totalProductViews,
        totalAddToCarts: analytics.addToCarts,
        totalCheckouts: analytics.checkouts,
        totalPurchases: analytics.purchases,
        totalRevenue: analytics.totalRevenue,
        conversionRate: analytics.conversionRate,
        avgOrderValue: analytics.avgOrderValue
      },
      create: {
        companyId,
        date: startOfDay,
        totalVisits: analytics.totalVisits,
        uniqueVisitors: analytics.uniqueVisitors,
        totalProductViews: analytics.totalProductViews,
        totalAddToCarts: analytics.addToCarts,
        totalCheckouts: analytics.checkouts,
        totalPurchases: analytics.purchases,
        totalRevenue: analytics.totalRevenue,
        conversionRate: analytics.conversionRate,
        avgOrderValue: analytics.avgOrderValue
      }
    });
  }

  async getProductAnalyticsByDate(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    return await getSharedPrismaClient().productAnalytics.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true
          }
        }
      },
      orderBy: {
        conversionRate: 'desc'
      }
    });
  }

  async getDailyAnalyticsByDate(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    return await getSharedPrismaClient().dailyAnalytics.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }
}

module.exports = new AnalyticsService();
