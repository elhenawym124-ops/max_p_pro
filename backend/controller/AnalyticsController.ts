import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { BaseController } from './BaseController';
import prisma from '../config/database';

export class AnalyticsController extends BaseController {
  /**
   * Track store visit (Public endpoint)
   * POST /api/v1/analytics/track/store-visit
   */
  trackStoreVisit = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.headers['x-company-id'] as string;
    const { sessionId, ipAddress, userAgent, referrer, landingPage } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company ID is required' });
    }

    // Create or update store visit
    await prisma.storeVisit.upsert({
      where: {
        sessionId_companyId: {
          sessionId,
          companyId
        }
      },
      update: {
        lastVisitAt: new Date()
      },
      create: {
        sessionId,
        companyId,
        ipAddress,
        userAgent,
        referrer,
        landingPage,
        lastVisitAt: new Date()
      }
    });

    res.json({ success: true, message: 'Store visit tracked' });
  });

  /**
   * Track product view (Public endpoint)
   * POST /api/v1/analytics/track/product-view
   */
  trackProductView = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.headers['x-company-id'] as string;
    const { productId, sessionId, source } = req.body;

    if (!companyId || !productId) {
      return res.status(400).json({ success: false, message: 'Company ID and Product ID are required' });
    }

    // Create product visit
    await prisma.productVisit.create({
      data: {
        productId,
        sessionId,
        companyId,
        source
      }
    });

    res.json({ success: true, message: 'Product view tracked' });
  });

  /**
   * Track conversion event (Public endpoint)
   * POST /api/v1/analytics/track/conversion
   */
  trackConversion = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.headers['x-company-id'] as string;
    const { sessionId, eventType, productId, orderId, value, metadata } = req.body;

    if (!companyId || !eventType) {
      return res.status(400).json({ success: false, message: 'Company ID and Event Type are required' });
    }

    // Create conversion event
    await prisma.conversionEvent.create({
      data: {
        sessionId,
        companyId,
        eventType,
        productId,
        orderId,
        value,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    res.json({ success: true, message: 'Conversion tracked' });
  });

  /**
   * Get store analytics (Protected endpoint)
   * GET /api/v1/analytics/store
   */
  getStoreAnalytics = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const { period = '30' } = req.query;

    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total visits
    const totalVisits = await prisma.storeVisit.count({
      where: {
        companyId: user.companyId,
        createdAt: { gte: startDate }
      }
    });

    // Get unique visitors
    const uniqueVisitors = await prisma.storeVisit.groupBy({
      by: ['sessionId'],
      where: {
        companyId: user.companyId,
        createdAt: { gte: startDate }
      }
    });

    // Get product views
    const productViews = await prisma.productVisit.count({
      where: {
        companyId: user.companyId,
        createdAt: { gte: startDate }
      }
    });

    // Get conversion events
    const addToCarts = await prisma.conversionEvent.count({
      where: {
        companyId: user.companyId,
        eventType: 'add_to_cart',
        createdAt: { gte: startDate }
      }
    });

    const checkouts = await prisma.conversionEvent.count({
      where: {
        companyId: user.companyId,
        eventType: 'checkout',
        createdAt: { gte: startDate }
      }
    });

    const purchases = await prisma.conversionEvent.count({
      where: {
        companyId: user.companyId,
        eventType: 'purchase',
        createdAt: { gte: startDate }
      }
    });

    // Get total revenue
    const revenueData = await prisma.conversionEvent.aggregate({
      where: {
        companyId: user.companyId,
        eventType: 'purchase',
        createdAt: { gte: startDate }
      },
      _sum: {
        value: true
      }
    });

    // Calculate conversion rate
    const conversionRate = productViews > 0 ? (purchases / productViews) * 100 : 0;

    // Get average order value
    const avgOrderValue = purchases > 0 ? (revenueData._sum.value || 0) / purchases : 0;

    res.json({
      success: true,
      data: {
        totalVisits,
        uniqueVisitors: uniqueVisitors.length,
        productViews,
        addToCarts,
        checkouts,
        purchases,
        totalRevenue: revenueData._sum.value || 0,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2))
      }
    });
  });

  /**
   * Get top products (Protected endpoint)
   * GET /api/v1/analytics/products/top
   */
  getTopProducts = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const { period = '30', limit = '10' } = req.query;

    const days = parseInt(period as string);
    const limitNum = parseInt(limit as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get product views grouped by product
    const productViews = await prisma.productVisit.groupBy({
      by: ['productId'],
      where: {
        companyId: user.companyId,
        createdAt: { gte: startDate }
      },
      _count: {
        productId: true
      },
      orderBy: {
        _count: {
          productId: 'desc'
        }
      },
      take: limitNum
    });

    // Get product details
    const productIds = productViews.map(pv => pv.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId: user.companyId
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Get add to cart counts
    const addToCartCounts = await prisma.conversionEvent.groupBy({
      by: ['productId'],
      where: {
        companyId: user.companyId,
        eventType: 'add_to_cart',
        productId: { in: productIds },
        createdAt: { gte: startDate }
      },
      _count: {
        productId: true
      }
    });

    // Get purchase counts
    const purchaseCounts = await prisma.conversionEvent.groupBy({
      by: ['productId'],
      where: {
        companyId: user.companyId,
        eventType: 'purchase',
        productId: { in: productIds },
        createdAt: { gte: startDate }
      },
      _count: {
        productId: true
      }
    });

    // Combine data
    const topProducts = products.map(product => {
      const views = productViews.find(pv => pv.productId === product.id)?._count.productId || 0;
      const addToCarts = addToCartCounts.find(atc => atc.productId === product.id)?._count.productId || 0;
      const sales = purchaseCounts.find(pc => pc.productId === product.id)?._count.productId || 0;
      const conversionRate = views > 0 ? (sales / views) * 100 : 0;

      return {
        ...product,
        views,
        addToCarts,
        sales,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      };
    });

    res.json({
      success: true,
      data: topProducts
    });
  });
}

export default new AnalyticsController();
