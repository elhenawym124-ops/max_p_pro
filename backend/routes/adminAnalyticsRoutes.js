const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

const router = express.Router();
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Get advanced analytics for Super Admin
 */

// Growth Analytics - نمو النظام
router.get('/growth', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily growth data using separate queries (safer approach)
    const companies = await getSharedPrismaClient().company.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true }
    });

    const users = await getSharedPrismaClient().user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true }
    });

    const customers = await getSharedPrismaClient().customer.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true }
    });

    const conversations = await getSharedPrismaClient().conversation.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true }
    });

    // Process daily growth data
    const dailyGrowthMap = new Map();

    // Helper function to add to daily count
    const addToDaily = (items, type) => {
      items.forEach(item => {
        const date = item.createdAt.toISOString().split('T')[0];
        if (!dailyGrowthMap.has(date)) {
          dailyGrowthMap.set(date, { date, companies: 0, users: 0, customers: 0, conversations: 0 });
        }
        dailyGrowthMap.get(date)[type]++;
      });
    };

    addToDaily(companies, 'companies');
    addToDaily(users, 'users');
    addToDaily(customers, 'customers');
    addToDaily(conversations, 'conversations');

    const dailyGrowth = Array.from(dailyGrowthMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Total growth metrics
    const totalMetrics = await Promise.all([
      getSharedPrismaClient().company.count(),
      getSharedPrismaClient().user.count(),
      getSharedPrismaClient().customer.count(),
      getSharedPrismaClient().conversation.count(),
      getSharedPrismaClient().message.count()
    ]);

    // Previous period comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const previousMetrics = await Promise.all([
      getSharedPrismaClient().company.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
      getSharedPrismaClient().user.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
      getSharedPrismaClient().customer.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
      getSharedPrismaClient().conversation.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
      getSharedPrismaClient().message.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } })
    ]);

    const currentMetrics = await Promise.all([
      getSharedPrismaClient().company.count({ where: { createdAt: { gte: startDate } } }),
      getSharedPrismaClient().user.count({ where: { createdAt: { gte: startDate } } }),
      getSharedPrismaClient().customer.count({ where: { createdAt: { gte: startDate } } }),
      getSharedPrismaClient().conversation.count({ where: { createdAt: { gte: startDate } } }),
      getSharedPrismaClient().message.count({ where: { createdAt: { gte: startDate } } })
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    const growthData = {
      dailyGrowth,
      totalMetrics: {
        companies: totalMetrics[0],
        users: totalMetrics[1],
        customers: totalMetrics[2],
        conversations: totalMetrics[3],
        messages: totalMetrics[4]
      },
      periodGrowth: {
        companies: {
          current: currentMetrics[0],
          previous: previousMetrics[0],
          growth: calculateGrowth(currentMetrics[0], previousMetrics[0])
        },
        users: {
          current: currentMetrics[1],
          previous: previousMetrics[1],
          growth: calculateGrowth(currentMetrics[1], previousMetrics[1])
        },
        customers: {
          current: currentMetrics[2],
          previous: previousMetrics[2],
          growth: calculateGrowth(currentMetrics[2], previousMetrics[2])
        },
        conversations: {
          current: currentMetrics[3],
          previous: previousMetrics[3],
          growth: calculateGrowth(currentMetrics[3], previousMetrics[3])
        },
        messages: {
          current: currentMetrics[4],
          previous: previousMetrics[4],
          growth: calculateGrowth(currentMetrics[4], previousMetrics[4])
        }
      }
    };

    res.json({
      success: true,
      message: 'تم جلب بيانات النمو بنجاح',
      data: growthData
    });

  } catch (error) {
    console.error('Error fetching growth analytics:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات النمو',
      error: error.message
    });
  }
});

// Company Performance Analytics
router.get('/company-performance', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const companies = await getSharedPrismaClient().company.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            conversations: true,
            products: true
          }
        }
      }
    });

    // Calculate performance metrics for each company
    const performanceData = await Promise.all(
      companies.map(async (company) => {
        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentActivity = await Promise.all([
          getSharedPrismaClient().conversation.count({
            where: {
              companyId: company.id,
              createdAt: { gte: thirtyDaysAgo }
            }
          }),
          getSharedPrismaClient().message.count({
            where: {
              conversation: { companyId: company.id },
              createdAt: { gte: thirtyDaysAgo }
            }
          }),
          getSharedPrismaClient().customer.count({
            where: {
              companyId: company.id,
              createdAt: { gte: thirtyDaysAgo }
            }
          })
        ]);

        // Get total messages for this company
        const totalMessages = await getSharedPrismaClient().message.count({
          where: {
            conversation: { companyId: company.id }
          }
        });

        // Calculate engagement score
        const engagementScore = Math.min(100, Math.round(
          (recentActivity[1] / Math.max(1, company._count.customers)) * 10
        ));

        return {
          id: company.id,
          name: company.name,
          plan: company.plan,
          isActive: company.isActive,
          createdAt: company.createdAt,
          totalUsers: company._count.users,
          totalCustomers: company._count.customers,
          totalConversations: company._count.conversations,
          totalMessages: totalMessages,
          totalProducts: company._count.products,
          recentConversations: recentActivity[0],
          recentMessages: recentActivity[1],
          recentCustomers: recentActivity[2],
          engagementScore
        };
      })
    );

    // Sort by engagement score
    performanceData.sort((a, b) => b.engagementScore - a.engagementScore);

    res.json({
      success: true,
      message: 'تم جلب بيانات أداء الشركات بنجاح',
      data: performanceData
    });

  } catch (error) {
    console.error('Error fetching company performance:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات أداء الشركات',
      error: error.message
    });
  }
});

// Revenue Analytics (if applicable)
router.get('/revenue', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { period = '12' } = req.query; // months
    const months = parseInt(period);

    // Plan pricing (you can move this to database later)
    const planPricing = {
      BASIC: 99,
      PRO: 299,
      ENTERPRISE: 599
    };

    // Get companies by plan
    const companiesByPlan = await getSharedPrismaClient().company.groupBy({
      by: ['plan'],
      _count: {
        plan: true
      },
      where: {
        isActive: true
      }
    });

    // Calculate monthly recurring revenue
    let totalMRR = 0;
    const revenueByPlan = companiesByPlan.map(group => {
      const planRevenue = (planPricing[group.plan] || 0) * group._count.plan;
      totalMRR += planRevenue;

      return {
        plan: group.plan,
        companies: group._count.plan,
        pricePerCompany: planPricing[group.plan] || 0,
        totalRevenue: planRevenue
      };
    });

    // Projected annual revenue
    const projectedARR = totalMRR * 12;

    // Monthly growth simulation (you can replace with real data)
    const monthlyRevenue = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      // Simulate growth (replace with real historical data)
      const growthFactor = 1 + (months - i) * 0.05;
      const monthRevenue = Math.round(totalMRR * growthFactor);

      monthlyRevenue.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        revenue: monthRevenue,
        companies: Math.round(companiesByPlan.reduce((sum, p) => sum + p._count.plan, 0) * growthFactor)
      });
    }

    res.json({
      success: true,
      message: 'تم جلب بيانات الإيرادات بنجاح',
      data: {
        totalMRR,
        projectedARR,
        revenueByPlan,
        monthlyRevenue,
        averageRevenuePerCompany: Math.round(totalMRR / Math.max(1, companiesByPlan.reduce((sum, p) => sum + p._count.plan, 0)))
      }
    });

  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات الإيرادات',
      error: error.message
    });
  }
});

// System Health Analytics
router.get('/system-health', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // System metrics
    const systemMetrics = await Promise.all([
      // Active companies (had activity in last 7 days)
      getSharedPrismaClient().company.count({
        where: {
          isActive: true,
          conversations: { some: { createdAt: { gte: oneWeekAgo } } }
        }
      }),

      // Total active companies
      getSharedPrismaClient().company.count({ where: { isActive: true } }),

      // Messages in last 24 hours
      getSharedPrismaClient().message.count({
        where: { createdAt: { gte: oneDayAgo } }
      }),

      // Conversations in last 24 hours
      getSharedPrismaClient().conversation.count({
        where: { createdAt: { gte: oneDayAgo } }
      }),

      // New customers in last 24 hours
      getSharedPrismaClient().customer.count({
        where: { createdAt: { gte: oneDayAgo } }
      })
    ]);

    // Calculate health scores
    const activeCompanies = systemMetrics[0];
    const totalCompanies = systemMetrics[1];
    const dailyMessages = systemMetrics[2];
    const dailyConversations = systemMetrics[3];
    const dailyCustomers = systemMetrics[4];

    const healthScore = Math.round(
      (activeCompanies / Math.max(1, totalCompanies)) * 100
    );

    // Response time simulation (replace with real monitoring data)
    const responseTime = {
      average: Math.round(150 + Math.random() * 50), // ms
      p95: Math.round(300 + Math.random() * 100),
      p99: Math.round(500 + Math.random() * 200)
    };

    // Uptime simulation (replace with real monitoring data)
    const uptime = {
      percentage: 99.9,
      lastDowntime: null
    };

    res.json({
      success: true,
      message: 'تم جلب بيانات صحة النظام بنجاح',
      data: {
        healthScore,
        activeCompanies,
        totalCompanies,
        dailyActivity: {
          messages: dailyMessages,
          conversations: dailyConversations,
          customers: dailyCustomers
        },
        performance: {
          responseTime,
          uptime
        },
        status: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : 'needs_attention'
      }
    });

  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات صحة النظام',
      error: error.message
    });
  }
});

module.exports = router;

