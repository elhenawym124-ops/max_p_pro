/**
 * 🔄 WooCommerce Auto Sync Scheduler
 * مزامنة تلقائية للطلبات بنظام Polling - يعمل على localhost بدون webhooks
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const { isPermissionError, getPermissionErrorMessage } = require('../utils/dbPermissionHelper');
const { importSingleOrder } = require('./wooCommerceImportService');

class WooCommerceAutoSyncScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.defaultIntervalMinutes = 5; // كل 5 دقائق افتراضياً
    this.activeCompanies = new Map(); // companyId -> intervalId
  }

  /**
   * بدء المزامنة التلقائية لجميع الشركات
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ [WOOCOMMERCE-SCHEDULER] Already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 [WOOCOMMERCE-SCHEDULER] Starting auto sync scheduler...');

    // تشغيل أول مزامنة بعد 30 ثانية من بدء السيرفر
    setTimeout(() => {
      this.syncAllCompanies();
    }, 30000);

    // جدولة المزامنة الدورية
    this.intervalId = setInterval(() => {
      this.syncAllCompanies();
    }, this.defaultIntervalMinutes * 60 * 1000);

    console.log(`✅ [WOOCOMMERCE-SCHEDULER] Started - syncing every ${this.defaultIntervalMinutes} minutes`);
  }

  /**
   * إيقاف المزامنة التلقائية
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 [WOOCOMMERCE-SCHEDULER] Stopped');
  }

  /**
   * مزامنة جميع الشركات المفعلة
   */
  async syncAllCompanies() {
    try {
      const prisma = getSharedPrismaClient();

      // جلب الشركات التي لديها مزامنة تلقائية مفعلة
      const companiesWithAutoSync = await prisma.wooCommerceSettings.findMany({
        where: {
          syncEnabled: true,
          isActive: true
        },
        select: {
          companyId: true,
          syncInterval: true,
          lastSyncAt: true
        }
      });

      if (companiesWithAutoSync.length === 0) {
        console.log('📭 [WOOCOMMERCE-SCHEDULER] No companies with auto sync enabled');
        return;
      }

      console.log(`🔄 [WOOCOMMERCE-SCHEDULER] Syncing ${companiesWithAutoSync.length} companies...`);

      for (const company of companiesWithAutoSync) {
        // التحقق من الفاصل الزمني للمزامنة
        const syncIntervalMinutes = company.syncInterval || this.defaultIntervalMinutes;
        const lastSync = company.lastSyncAt ? new Date(company.lastSyncAt) : new Date(0);
        const now = new Date();
        const minutesSinceLastSync = (now - lastSync) / (1000 * 60);

        // تخطي إذا لم يحن وقت المزامنة بعد
        if (minutesSinceLastSync < syncIntervalMinutes) {
          continue;
        }

        // تشغيل المزامنة
        await this.syncCompany(company.companyId);
      }

    } catch (error) {
      console.error('❌ [WOOCOMMERCE-SCHEDULER] Error syncing companies:', error.message);
    }
  }

  /**
   * مزامنة شركة واحدة
   */
  async syncCompany(companyId) {
    try {
      console.log(`🔄 [WOOCOMMERCE-SCHEDULER] Syncing company: ${companyId}`);

      const prisma = getSharedPrismaClient();

      const settings = await prisma.wooCommerceSettings.findUnique({
        where: { companyId }
      });

      if (!settings || !settings.syncEnabled) {
        return { success: false, message: 'Sync disabled' };
      }

      const axios = require('axios');
      const baseURL = settings.storeUrl.replace(/\/$/, '');

      const wooClient = {
        get: async (endpoint, params = {}) => {
          const response = await axios.get(`${baseURL}/wp-json/wc/v3${endpoint}`, {
            params,
            auth: {
              username: settings.consumerKey,
              password: settings.consumerSecret
            },
            timeout: 30000
          });
          return response.data;
        }
      };

      const results = {
        imported: 0,
        updated: 0,
        errors: []
      };

      // جلب الطلبات الجديدة من WooCommerce
      const lastSync = settings.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // آخر 24 ساعة إذا لم يكن هناك مزامنة سابقة

      try {
        const wooOrders = await wooClient.get('/orders', {
          after: lastSync.toISOString(),
          per_page: 50,
          orderby: 'date',
          order: 'desc'
        });

        console.log(`📦 [WOOCOMMERCE-SCHEDULER] Found ${wooOrders.length} orders to sync`);

        for (const wooOrder of wooOrders) {
          try {
            const importResult = await importSingleOrder(prisma, companyId, wooOrder, {
              duplicateAction: 'update', // Auto-sync always updates existing orders
              statusMapping: settings.statusMapping,
              triggeredBy: 'system'
            });

            if (importResult.status === 'imported') results.imported++;
            else if (importResult.status === 'updated') results.updated++;

          } catch (orderError) {
            if (isPermissionError(orderError)) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`⚠️ [DB-PERMISSION] Cannot process order ${wooOrder.id}: ${getPermissionErrorMessage(orderError)}`);
              }
            } else {
              console.error(`❌ [WOOCOMMERCE-SCHEDULER] Error processing order ${wooOrder.id}:`, orderError.message);
            }
            results.errors.push(`Order ${wooOrder.id}: ${orderError.message}`);
          }
        }

      } catch (fetchError) {
        console.error(`❌ [WOOCOMMERCE-SCHEDULER] Error fetching orders:`, fetchError.message);
        results.errors.push(`Fetch error: ${fetchError.message}`);
      }

      // تحديث وقت آخر مزامنة
      try {
        await prisma.wooCommerceSettings.update({
          where: { companyId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: results.errors.length > 0 ? 'partial' : 'success',
            lastSyncMessage: `Imported: ${results.imported}, Updated: ${results.updated}`
          }
        });
      } catch (updateError) {
        if (isPermissionError(updateError)) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ [DB-PERMISSION] Cannot update sync settings: ${getPermissionErrorMessage(updateError)}`);
          }
        } else {
          throw updateError;
        }
      }

      // تسجيل المزامنة
      if (results.imported > 0 || results.updated > 0 || results.errors.length > 0) {
        try {
          await prisma.wooCommerceSyncLog.create({
            data: {
              companyId,
              syncType: 'auto_polling',
              syncDirection: 'from_woo',
              status: results.errors.length > 0 ? 'partial' : 'success',
              totalItems: results.imported + results.updated,
              successCount: results.imported + results.updated,
              failedCount: results.errors.length,
              triggeredBy: 'scheduler',
              completedAt: new Date()
            }
          });
        } catch (logError) {
          if (isPermissionError(logError)) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ [DB-PERMISSION] Cannot create sync log: ${getPermissionErrorMessage(logError)}`);
            }
          } else {
            // Log non-permission errors
            console.error(`❌ [WOOCOMMERCE-SCHEDULER] Error creating sync log:`, logError.message);
          }
        }
      }

      console.log(`✅ [WOOCOMMERCE-SCHEDULER] Company ${companyId}: Imported ${results.imported}, Updated ${results.updated}`);
      return { success: true, results };

    } catch (error) {
      console.error(`❌ [WOOCOMMERCE-SCHEDULER] Error syncing company ${companyId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Helper functions removed as they are now handled by wooCommerceImportService

  /**
   * الحصول على حالة المزامنة
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.defaultIntervalMinutes,
      activeCompanies: this.activeCompanies.size
    };
  }

  /**
   * تغيير فترة المزامنة
   */
  setInterval(minutes) {
    this.defaultIntervalMinutes = minutes;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
    console.log(`⏱️ [WOOCOMMERCE-SCHEDULER] Interval changed to ${minutes} minutes`);
  }
}

// Singleton instance
let instance = null;

const getWooCommerceAutoSyncScheduler = () => {
  if (!instance) {
    instance = new WooCommerceAutoSyncScheduler();
  }
  return instance;
};

module.exports = {
  WooCommerceAutoSyncScheduler,
  getWooCommerceAutoSyncScheduler
};
