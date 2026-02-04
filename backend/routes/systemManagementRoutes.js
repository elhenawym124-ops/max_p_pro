/**
 * System Management Routes
 * مسارات إدارة أنظمة النظام
 */

const express = require('express');
const router = express.Router();
const systemManager = require('../services/systemManager');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

/**
 * GET /api/v1/admin/systems
 * الحصول على جميع الأنظمة
 */
router.get('/systems', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const systems = await systemManager.getAllSystems();
    const stats = await systemManager.getSystemStats();

    res.json({
      success: true,
      data: {
        systems,
        stats
      },
      message: 'تم جلب الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting systems:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأنظمة',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/statistics
 * الحصول على إحصائيات النظام العامة (للداشبورد)
 */
router.get('/statistics', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalCustomers,
      totalConversations,
      companiesByPlan,
      recentCompanies,
      recentUsers,
      recentCustomers
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.customer.count(),
      prisma.conversation.count(),
      prisma.company.groupBy({
        by: ['plan'],
        _count: { plan: true }
      }),
      prisma.company.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.customer.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ]);

    const planDistribution = {};
    companiesByPlan.forEach(p => {
      planDistribution[p.plan] = p._count.plan;
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalCompanies,
          activeCompanies,
          totalUsers,
          totalCustomers,
          totalConversations
        },
        planDistribution,
        recentActivity: {
          newCompaniesLast30Days: recentCompanies,
          newUsersLast30Days: recentUsers,
          newCustomersLast30Days: recentCustomers
        }
      },
      message: 'تم جلب الإحصائيات بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/active-users
 * الحصول على المستخدمين النشطين على التاسكات (التيمر شغال)
 */
router.get('/active-users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const activeTimers = await prisma.devTimeLog.findMany({
      where: { isRunning: true },
      include: {
        dev_team_member: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        dev_task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            type: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    const formattedData = activeTimers.map(entry => {
      const now = new Date();
      const duration = Math.floor((now - new Date(entry.startTime)) / 1000);
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = duration % 60;

      return {
        id: entry.id,
        user: {
          id: entry.dev_team_member.user.id,
          name: `${entry.dev_team_member.user.firstName} ${entry.dev_team_member.user.lastName}`,
          email: entry.dev_team_member.user.email,
          avatar: entry.dev_team_member.user.avatar,
          role: entry.dev_team_member.role
        },
        task: {
          id: entry.dev_task.id,
          title: entry.dev_task.title,
          status: entry.dev_task.status,
          priority: entry.dev_task.priority,
          type: entry.dev_task.type
        },
        startTime: entry.startTime,
        duration: {
          total: duration,
          hours,
          minutes,
          seconds,
          formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        },
        description: entry.description
      };
    });

    res.json({
      success: true,
      data: {
        activeUsers: formattedData,
        count: formattedData.length
      },
      message: 'تم جلب المستخدمين النشطين بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting active users:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين النشطين',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/:systemName/toggle
 * تفعيل/تعطيل نظام
 */
router.post('/systems/:systemName/toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systemName } = req.params;
    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isEnabled يجب أن يكون true أو false'
      });
    }

    // ✅ FIX: التحقق من وجود النظام قبل التبديل
    if (!systemManager.systems.has(systemName)) {
      return res.status(404).json({
        success: false,
        message: `النظام غير موجود: ${systemName}`
      });
    }

    const systemAuditService = require('../services/systemAuditService');

    // ... (existing imports)

    // ... inside toggle route after success
    const success = await systemManager.toggleSystem(systemName, isEnabled);

    if (success) {
      // ✅ AUDIT LOG
      await systemAuditService.logAction(
        req.user.id,
        'TOGGLE_SYSTEM',
        systemName,
        `System ${isEnabled ? 'Enabled' : 'Disabled'}`,
        { isEnabled, systemName }
      );

      res.json({
        success: true,
        data: {
          systemName,
          isEnabled
        },
        message: `تم ${isEnabled ? 'تفعيل' : 'تعطيل'} النظام بنجاح`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في تغيير حالة النظام'
      });
    }
  } catch (error) {
    console.error('❌ [SystemManagement] Error toggling system:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير حالة النظام',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/:systemName/status
 * فحص حالة نظام معين
 */
router.get('/systems/:systemName/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systemName } = req.params;
    const isEnabled = await systemManager.isSystemEnabled(systemName);

    res.json({
      success: true,
      data: {
        systemName,
        isEnabled
      },
      message: 'تم جلب حالة النظام بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting system status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة النظام',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/stats
 * الحصول على إحصائيات الأنظمة
 */
router.get('/systems/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const stats = await systemManager.getSystemStats();

    res.json({
      success: true,
      data: stats,
      message: 'تم جلب إحصائيات الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الأنظمة',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/bulk-toggle
 * تفعيل/تعطيل عدة أنظمة مرة واحدة
 */
router.post('/systems/bulk-toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { systems } = req.body; // [{ systemName, isEnabled }, ...]

    if (!Array.isArray(systems)) {
      return res.status(400).json({
        success: false,
        message: 'systems يجب أن يكون مصفوفة'
      });
    }

    const results = [];
    for (const system of systems) {
      const { systemName, isEnabled } = system;
      const success = await systemManager.toggleSystem(systemName, isEnabled);
      results.push({
        systemName,
        isEnabled,
        success
      });
    }

    res.json({
      success: true,
      data: results,
      message: 'تم تحديث الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error bulk toggling systems:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الأنظمة',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/initialize
 * تهيئة إعدادات الأنظمة
 */
router.post('/systems/initialize', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await systemManager.initializeSystemSettings();

    res.json({
      success: true,
      message: 'تم تهيئة إعدادات الأنظمة بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error initializing systems:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تهيئة إعدادات الأنظمة',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/keys-status
 * الحصول على حالة أنظمة المفاتيح
 */
router.get('/systems/keys-status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const status = await systemManager.getKeysSystemStatus();

    res.json({
      success: true,
      data: status,
      message: 'تم جلب حالة أنظمة المفاتيح بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting keys status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة أنظمة المفاتيح',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/systems/key-rotation-strategy
 * الحصول على استراتيجية تبديل المفاتيح الحالية
 */
router.get('/systems/key-rotation-strategy', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const strategy = await systemManager.getKeyRotationStrategy();

    res.json({
      success: true,
      data: {
        strategy,
        options: [
          {
            value: 'MODEL_FIRST',
            label: 'Model-First (النظام الحالي)',
            description: 'يجرب نفس النموذج على كل المفاتيح ثم ينتقل للنموذج التالي'
          },
          {
            value: 'KEY_FIRST',
            label: 'Key-First (النظام الجديد)',
            description: 'يستهلك كل نماذج المفتاح ثم ينتقل للمفتاح التالي'
          }
        ]
      },
      message: 'تم جلب استراتيجية تبديل المفاتيح بنجاح'
    });
  } catch (error) {
    console.error('❌ [SystemManagement] Error getting key rotation strategy:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب استراتيجية تبديل المفاتيح',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/admin/systems/key-rotation-strategy
 * تحديث استراتيجية تبديل المفاتيح
 */
router.post('/systems/key-rotation-strategy', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { strategy } = req.body;

    if (!strategy || !['MODEL_FIRST', 'KEY_FIRST'].includes(strategy)) {
      return res.status(400).json({
        success: false,
        message: 'الاستراتيجية يجب أن تكون MODEL_FIRST أو KEY_FIRST'
      });
    }

    const success = await systemManager.setKeyRotationStrategy(strategy);

    if (success) {
      res.json({
        success: true,
        data: { strategy },
        message: `تم تحديث استراتيجية تبديل المفاتيح إلى ${strategy === 'KEY_FIRST' ? 'Key-First' : 'Model-First'} بنجاح`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في تحديث استراتيجية تبديل المفاتيح'
      });
    }
  } catch (error) {
    console.error('❌ [SystemManagement] Error setting key rotation strategy:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث استراتيجية تبديل المفاتيح',
      error: error.message
    });
  }
});

module.exports = router;