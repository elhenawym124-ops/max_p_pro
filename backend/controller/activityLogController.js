const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { validationResult } = require('express-validator');

/**
 * الحصول على نشاطات المستخدم الحالي
 * GET /api/v1/activity/my-activities
 */
exports.getMyActivities = async (req, res) => {
  try {
    // التحقق من وجود req.user
    if (!req.user || !req.user.id || !req.user.companyId) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير مصرح به'
      });
    }

    const prisma = getSharedPrismaClient();

    const {
      page = 1,
      limit = 20,
      category,
      action,
      severity,
      isSuccess,
      startDate,
      endDate,
      search
    } = req.query;

    // بناء where clause لـ Prisma
    const where = {
      userId: req.user.id,
      companyId: req.user.companyId
    };

    if (category) where.category = category;
    if (action) where.action = action;
    if (severity) where.severity = severity;
    if (isSuccess !== undefined) where.isSuccess = isSuccess === 'true';

    // فلتر التاريخ
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // البحث في الوصف
    if (search) {
      where.description = { contains: search };
    }

    // الحصول على النشاطات مع Pagination
    const skip = (page - 1) * limit;
    let activitiesRaw, total;
    try {
      [activitiesRaw, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: skip,
          take: parseInt(limit)
        }),
        prisma.activityLog.count({ where })
      ]);
    } catch (prismaError) {
      throw prismaError;
    }

    // Parse metadata و tags من JSON strings
    const activities = activitiesRaw.map((activity) => {
      try {
        return {
          ...activity,
          metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
          tags: activity.tags ? JSON.parse(activity.tags) : null
        };
      } catch (parseError) {
        return {
          ...activity,
          metadata: null,
          tags: null
        };
      }
    });

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: total > 0 ? Math.ceil(total / limit) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching my activities:', error);
    console.error('Error stack:', error.stack);
    console.error('Filter used:', { userId: req.user?.id, companyId: req.user?.companyId });
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب النشاطات',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * الحصول على تفاصيل نشاط محدد
 * GET /api/v1/activity/:id
 */
exports.getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const activityRaw = await prisma.activityLog.findFirst({
      where: {
        id: id,
        OR: [
          { userId: req.user.id }, // المستخدم نفسه
          { 
            companyId: req.user.companyId, 
            userId: { not: req.user.id } 
          } // مدير الشركة
        ]
      }
    });

    if (!activityRaw) {
      return res.status(404).json({
        success: false,
        message: 'النشاط غير موجود'
      });
    }

    // Parse metadata و tags
    const activity = {
      ...activityRaw,
      metadata: activityRaw.metadata ? JSON.parse(activityRaw.metadata) : null,
      tags: activityRaw.tags ? JSON.parse(activityRaw.tags) : null
    };

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'النشاط غير موجود'
      });
    }

    // التحقق من الصلاحيات - فقط المستخدم نفسه أو مدير الشركة
    if (activity.userId !== req.user.id && 
        req.user.role !== 'company_admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض هذا النشاط'
      });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب النشاط',
      error: error.message
    });
  }
};

/**
 * الحصول على إحصائيات نشاطات المستخدم
 * GET /api/v1/activity/my-stats
 */
exports.getMyStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();

    // بناء where clause
    const where = {
      userId: req.user.id,
      companyId: req.user.companyId
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // إحصائيات حسب التصنيف (باستخدام groupBy)
    const categoryData = await prisma.activityLog.groupBy({
      by: ['category'],
      where,
      _count: { id: true }
    });

    // حساب successCount و failureCount لكل تصنيف
    const categoryStats = await Promise.all(
      categoryData.map(async (item) => {
        const successCount = await prisma.activityLog.count({
          where: {
            ...where,
            category: item.category,
            isSuccess: true
          }
        });
        return {
          _id: item.category,
          count: item._count.id,
          successCount,
          failureCount: item._count.id - successCount
        };
      })
    );

    categoryStats.sort((a, b) => b.count - a.count);

    // إجمالي النشاطات
    const totalActivities = await prisma.activityLog.count({ where });

    // آخر نشاط
    const lastActivityRaw = await prisma.activityLog.findFirst({
      where,
      orderBy: { createdAt: 'desc' }
    });

    let lastActivity = null;
    if (lastActivityRaw) {
      try {
        lastActivity = {
          ...lastActivityRaw,
          metadata: lastActivityRaw.metadata ? JSON.parse(lastActivityRaw.metadata) : null,
          tags: lastActivityRaw.tags ? JSON.parse(lastActivityRaw.tags) : null
        };
      } catch (parseError) {
        lastActivity = {
          ...lastActivityRaw,
          metadata: null,
          tags: null
        };
      }
    }

    res.json({
      success: true,
      data: {
        totalActivities,
        categoryStats,
        dailyStats: [], // يمكن إضافتها لاحقاً
        lastActivity
      }
    });
  } catch (error) {
    console.error('Error fetching my stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات',
      error: error.message
    });
  }
};

/**
 * الحصول على نشاطات جميع موظفي الشركة (للمديرين فقط)
 * GET /api/v1/activity/company-activities
 */
exports.getCompanyActivities = async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (req.user.role !== 'company_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض نشاطات الشركة'
      });
    }

    const {
      page = 1,
      limit = 20,
      userId,
      category,
      action,
      severity,
      isSuccess,
      startDate,
      endDate,
      search
    } = req.query;

    const prisma = getSharedPrismaClient();

    // بناء where clause
    const where = {
      companyId: req.user.companyId
    };

    if (userId) where.userId = userId;
    if (category) where.category = category;
    if (action) where.action = action;
    if (severity) where.severity = severity;
    if (isSuccess !== undefined) where.isSuccess = isSuccess === 'true';

    // فلتر التاريخ
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // البحث
    if (search) {
      where.description = { contains: search };
    }

    // الحصول على النشاطات
    const skip = (page - 1) * limit;
    const [activitiesRaw, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.activityLog.count({ where })
    ]);

    // Parse metadata و tags
    const activities = activitiesRaw.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
      tags: activity.tags ? JSON.parse(activity.tags) : null
    }));

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching company activities:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب نشاطات الشركة',
      error: error.message
    });
  }
};

/**
 * الحصول على إحصائيات الشركة (للمديرين فقط)
 * GET /api/v1/activity/company-stats
 */
exports.getCompanyStats = async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (req.user.role !== 'company_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض إحصائيات الشركة'
      });
    }

    const { startDate, endDate } = req.query;
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;

    // بناء where clause
    const where = { companyId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // إحصائيات حسب التصنيف
    const categoryData = await prisma.activityLog.groupBy({
      by: ['category'],
      where,
      _count: { id: true }
    });

    const categoryStats = categoryData.map(item => ({
      _id: item.category,
      count: item._count.id
    })).sort((a, b) => b.count - a.count);

    // أكثر المستخدمين نشاطاً
    const userData = await prisma.activityLog.groupBy({
      by: ['userId'],
      where,
      _count: { id: true }
    });

    const mostActiveUsers = userData
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10)
      .map(item => ({
        userId: item.userId,
        activityCount: item._count.id
      }));

    // إجمالي النشاطات
    const totalActivities = await prisma.activityLog.count({ where });

    // النشاطات الحساسة الأخيرة
    const criticalActivitiesRaw = await prisma.activityLog.findMany({
      where: {
        companyId,
        severity: { in: ['HIGH', 'CRITICAL'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const criticalActivities = criticalActivitiesRaw.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
      tags: activity.tags ? JSON.parse(activity.tags) : null
    }));

    res.json({
      success: true,
      data: {
        totalActivities,
        categoryStats,
        mostActiveUsers,
        dailyStats: [], // يمكن إضافتها لاحقاً
        severityStats: [], // يمكن إضافتها لاحقاً
        criticalActivities
      }
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب إحصائيات الشركة',
      error: error.message
    });
  }
};

/**
 * الحصول على نشاطات مستخدم محدد (للمديرين فقط)
 * GET /api/v1/activity/user/:userId
 */
exports.getUserActivities = async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (req.user.role !== 'company_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض نشاطات المستخدمين'
      });
    }

    const { userId } = req.params;
    const {
      page = 1,
      limit = 20,
      category,
      action,
      startDate,
      endDate
    } = req.query;

    const prisma = getSharedPrismaClient();

    // بناء where clause
    const where = {
      userId: userId,
      companyId: req.user.companyId
    };

    if (category) where.category = category;
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // الحصول على النشاطات
    const skip = (page - 1) * limit;
    const [activitiesRaw, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.activityLog.count({ where })
    ]);

    // Parse metadata و tags
    const activities = activitiesRaw.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
      tags: activity.tags ? JSON.parse(activity.tags) : null
    }));

    // إحصائيات المستخدم
    const userStatsData = await prisma.activityLog.groupBy({
      by: ['category'],
      where,
      _count: { id: true }
    });

    const userStats = userStatsData.map(item => ({
      _id: item.category,
      count: item._count.id
    })).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        activities,
        userStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب نشاطات المستخدم',
      error: error.message
    });
  }
};

/**
 * تصدير نشاطات المستخدم (CSV)
 * GET /api/v1/activity/export
 */
exports.exportActivities = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const prisma = getSharedPrismaClient();

    // بناء where clause
    const where = {};

    // إذا كان مستخدم عادي، فقط نشاطاته
    if (req.user.role !== 'company_admin' && req.user.role !== 'super_admin') {
      where.userId = req.user.id;
    } else {
      // إذا كان مدير، يمكنه تصدير نشاطات الشركة أو مستخدم محدد
      where.companyId = req.user.companyId;
      if (userId) {
        where.userId = userId;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const activitiesRaw = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000 // حد أقصى للتصدير
    });

    // Parse metadata
    const activities = activitiesRaw.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    }));

    // تحويل إلى CSV
    const csv = [
      ['التاريخ', 'المستخدم', 'التصنيف', 'الإجراء', 'الوصف', 'الحالة', 'الخطورة'].join(','),
      ...activities.map(a => [
        new Date(a.createdAt).toLocaleString('ar-EG'),
        a.userId || 'غير معروف', // userId الآن string وليس object
        a.category,
        a.action,
        `"${a.description}"`,
        a.isSuccess ? 'نجح' : 'فشل',
        a.severity
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=activities-${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // BOM for UTF-8
  } catch (error) {
    console.error('Error exporting activities:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تصدير النشاطات',
      error: error.message
    });
  }
};

/**
 * حذف النشاطات القديمة (للسوبر أدمن فقط - Cleanup)
 * DELETE /api/v1/activity/cleanup
 */
exports.cleanupOldActivities = async (req, res) => {
  try {
    // فقط السوبر أدمن
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لحذف النشاطات'
      });
    }

    const { days = 90 } = req.body;
    const prisma = getSharedPrismaClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // حذف النشاطات الأقدم من التاريخ المحدد
    const result = await prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        severity: { not: 'CRITICAL' } // الاحتفاظ بالنشاطات الحرجة
      }
    });

    res.json({
      success: true,
      message: `تم حذف ${result.count} نشاط قديم`,
      data: {
        deletedCount: result.count,
        cutoffDate
      }
    });
  } catch (error) {
    console.error('Error cleaning up activities:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف النشاطات القديمة',
      error: error.message
    });
  }
};
