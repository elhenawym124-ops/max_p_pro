/**
 * Scheduler Controller
 * للتحكم في جميع الموقتات (Schedulers) في النظام
 */

const { getWooCommerceAutoSyncScheduler } = require('../services/wooCommerceAutoSyncScheduler');
const turboTrackingScheduler = require('../services/turboTrackingScheduler');
const broadcastScheduler = require('../services/broadcastSchedulerService');

/**
 * الحصول على حالة جميع الموقتات
 */
const getAllSchedulersStatus = async (req, res) => {
  try {
    const wooScheduler = getWooCommerceAutoSyncScheduler();
    const wooStatus = wooScheduler.getStatus();
    
    const turboStats = turboTrackingScheduler.getStats();
    const broadcastStats = broadcastScheduler.getStats();

    const schedulers = [
      {
        id: 'woocommerce_sync',
        name: 'WooCommerce Auto Sync',
        description: 'مزامنة تلقائية للطلبات من WooCommerce',
        isRunning: wooStatus.isRunning,
        intervalMinutes: wooStatus.intervalMinutes,
        activeCompanies: wooStatus.activeCompanies,
        type: 'polling',
        icon: '🔄',
        stats: null
      },
      {
        id: 'turbo_tracking',
        name: 'Turbo Tracking Scheduler',
        description: 'تحديث حالة الشحنات من Turbo API',
        isRunning: turboStats.isRunning,
        lastRun: turboStats.lastRun,
        type: 'cron',
        schedule: 'كل 6 ساعات',
        icon: '📦',
        stats: {
          totalChecked: turboStats.stats.totalChecked,
          totalUpdated: turboStats.stats.totalUpdated,
          totalErrors: turboStats.stats.totalErrors
        }
      },
      {
        id: 'broadcast_scheduler',
        name: 'Broadcast Scheduler',
        description: 'إرسال حملات البرودكاست المجدولة',
        isRunning: broadcastStats.isRunning,
        lastCheck: broadcastStats.lastCheck,
        type: 'cron',
        schedule: 'كل 5 دقائق',
        icon: '📡',
        stats: {
          totalChecks: broadcastStats.totalChecks,
          campaignsSent: broadcastStats.campaignsSent,
          errors: broadcastStats.errors
        }
      }
    ];

    res.json({
      success: true,
      data: {
        schedulers,
        summary: {
          total: schedulers.length,
          running: schedulers.filter(s => s.isRunning).length,
          stopped: schedulers.filter(s => !s.isRunning).length
        }
      },
      message: 'تم جلب حالة الموقتات بنجاح'
    });
  } catch (error) {
    console.error('❌ [SchedulerController] Error getting schedulers status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة الموقتات',
      error: error.message
    });
  }
};

/**
 * بدء موقت معين
 */
const startScheduler = async (req, res) => {
  try {
    const { schedulerId } = req.params;

    let result = { success: false, message: 'موقت غير معروف' };

    switch (schedulerId) {
      case 'woocommerce_sync':
        const wooScheduler = getWooCommerceAutoSyncScheduler();
        await wooScheduler.start();
        result = { success: true, message: 'تم تشغيل WooCommerce Sync بنجاح' };
        break;

      case 'turbo_tracking':
        turboTrackingScheduler.start();
        result = { success: true, message: 'تم تشغيل Turbo Tracking بنجاح' };
        break;

      case 'broadcast_scheduler':
        broadcastScheduler.start();
        result = { success: true, message: 'تم تشغيل Broadcast Scheduler بنجاح' };
        break;

      default:
        return res.status(404).json({
          success: false,
          message: `الموقت ${schedulerId} غير موجود`
        });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ [SchedulerController] Error starting scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تشغيل الموقت',
      error: error.message
    });
  }
};

/**
 * إيقاف موقت معين
 */
const stopScheduler = async (req, res) => {
  try {
    const { schedulerId } = req.params;

    let result = { success: false, message: 'موقت غير معروف' };

    switch (schedulerId) {
      case 'woocommerce_sync':
        const wooScheduler = getWooCommerceAutoSyncScheduler();
        wooScheduler.stop();
        result = { success: true, message: 'تم إيقاف WooCommerce Sync بنجاح' };
        break;

      case 'turbo_tracking':
        turboTrackingScheduler.stop();
        result = { success: true, message: 'تم إيقاف Turbo Tracking بنجاح' };
        break;

      case 'broadcast_scheduler':
        broadcastScheduler.stop();
        result = { success: true, message: 'تم إيقاف Broadcast Scheduler بنجاح' };
        break;

      default:
        return res.status(404).json({
          success: false,
          message: `الموقت ${schedulerId} غير موجود`
        });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ [SchedulerController] Error stopping scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إيقاف الموقت',
      error: error.message
    });
  }
};

/**
 * تغيير فترة موقت WooCommerce
 */
const updateWooCommerceInterval = async (req, res) => {
  try {
    const { intervalMinutes } = req.body;

    if (!intervalMinutes || intervalMinutes < 1 || intervalMinutes > 60) {
      return res.status(400).json({
        success: false,
        message: 'الفترة يجب أن تكون بين 1 و 60 دقيقة'
      });
    }

    const wooScheduler = getWooCommerceAutoSyncScheduler();
    wooScheduler.setInterval(intervalMinutes);

    res.json({
      success: true,
      message: `تم تحديث فترة المزامنة إلى ${intervalMinutes} دقيقة`,
      data: { intervalMinutes }
    });
  } catch (error) {
    console.error('❌ [SchedulerController] Error updating interval:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الفترة',
      error: error.message
    });
  }
};

/**
 * تشغيل مزامنة يدوية لـ WooCommerce
 */
const triggerManualSync = async (req, res) => {
  try {
    const wooScheduler = getWooCommerceAutoSyncScheduler();
    
    // تشغيل المزامنة في الخلفية
    wooScheduler.syncAllCompanies().catch(err => {
      console.error('❌ [SchedulerController] Manual sync error:', err);
    });

    res.json({
      success: true,
      message: 'تم بدء المزامنة اليدوية'
    });
  } catch (error) {
    console.error('❌ [SchedulerController] Error triggering manual sync:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في بدء المزامنة اليدوية',
      error: error.message
    });
  }
};

/**
 * تشغيل تحديث يدوي لـ Turbo Tracking
 */
const triggerTurboUpdate = async (req, res) => {
  try {
    // تشغيل التحديث في الخلفية
    turboTrackingScheduler.updateAllShipments().catch(err => {
      console.error('❌ [SchedulerController] Turbo update error:', err);
    });

    res.json({
      success: true,
      message: 'تم بدء تحديث الشحنات'
    });
  } catch (error) {
    console.error('❌ [SchedulerController] Error triggering turbo update:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في بدء تحديث الشحنات',
      error: error.message
    });
  }
};

module.exports = {
  getAllSchedulersStatus,
  startScheduler,
  stopScheduler,
  updateWooCommerceInterval,
  triggerManualSync,
  triggerTurboUpdate
};
