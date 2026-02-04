/**
 * Turbo Tracking Scheduler Service
 * خدمة لتحديث حالة الشحنات بشكل دوري من Turbo API
 */

const cron = require('node-cron');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const TurboService = require('./turboService');

class TurboTrackingScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.lastRun = null;
    this.stats = {
      totalChecked: 0,
      totalUpdated: 0,
      totalErrors: 0
    };
  }

  /**
   * بدء خدمة التتبع
   */
  start() {
    if (this.cronJob) {
      console.log('⚠️ [TURBO-TRACKING] Service already running');
      return;
    }

    console.log('🚀 [TURBO-TRACKING] Starting tracking scheduler...');

    // فحص كل 6 ساعات (يمكن تعديله حسب الحاجة)
    // يمكن تغييره إلى '0 */6 * * *' للفحص كل 6 ساعات
    // أو '0 */1 * * *' للفحص كل ساعة
    this.cronJob = cron.schedule('0 */6 * * *', async () => {
      await this.updateAllShipments();
    });

    console.log('✅ [TURBO-TRACKING] Scheduler started - checking every 6 hours');
    
    // تشغيل فحص أولي بعد 5 دقائق من بدء السيرفر
    setTimeout(() => {
      console.log('🔄 [TURBO-TRACKING] Running initial check...');
      this.updateAllShipments();
    }, 5 * 60 * 1000); // 5 دقائق
  }

  /**
   * إيقاف خدمة التتبع
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('🛑 [TURBO-TRACKING] Scheduler stopped');
    }
  }

  /**
   * تحديث حالة جميع الشحنات
   */
  async updateAllShipments() {
    if (this.isRunning) {
      console.log('⚠️ [TURBO-TRACKING] Update already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    console.log('🔄 [TURBO-TRACKING] Starting batch update of shipment statuses...');

    try {
      const prisma = getSharedPrismaClient();

      // جلب جميع الطلبات التي لديها turboTrackingNumber
      const orders = await safeQuery(async () => {
        return await prisma.order.findMany({
          where: {
            turboTrackingNumber: {
              not: null
            },
            // تحديث فقط الشحنات التي لم يتم تسليمها أو إلغاؤها
            turboShipmentStatus: {
              notIn: ['delivered', 'cancelled', 'returned']
            }
          },
          select: {
            id: true,
            orderNumber: true,
            companyId: true,
            turboTrackingNumber: true,
            turboShipmentId: true,
            turboShipmentStatus: true,
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            }
          },
          // تحديث فقط الشحنات التي لم يتم تحديثها في آخر 6 ساعات
          // أو التي لم يتم تحديثها من قبل
          orderBy: {
            updatedAt: 'asc'
          },
          take: 100 // تحديث 100 طلب في كل مرة لتجنب الضغط على API
        });
      }, 3);

      if (!orders || orders.length === 0) {
        console.log('ℹ️ [TURBO-TRACKING] No shipments to update');
        this.isRunning = false;
        this.lastRun = new Date();
        return;
      }

      console.log(`📦 [TURBO-TRACKING] Found ${orders.length} shipments to check`);

      let updated = 0;
      let errors = 0;
      let checked = 0;

      // تجميع الطلبات حسب الشركة لتقليل عدد استدعاءات API
      const ordersByCompany = {};
      for (const order of orders) {
        if (!order.company.turboEnabled || !order.company.turboApiKey) {
          continue;
        }
        if (!ordersByCompany[order.companyId]) {
          ordersByCompany[order.companyId] = [];
        }
        ordersByCompany[order.companyId].push(order);
      }

      // تحديث كل شركة على حدة
      for (const [companyId, companyOrders] of Object.entries(ordersByCompany)) {
        try {
          const firstOrder = companyOrders[0];
          const turboService = new TurboService(firstOrder.company.turboApiKey, companyId);

          for (const order of companyOrders) {
            checked++;
            try {
              if (!order.turboTrackingNumber) {
                continue;
              }

              console.log(`🔍 [TURBO-TRACKING] Checking order ${order.orderNumber} (${order.turboTrackingNumber})`);

              // تتبع الشحنة
              const trackingResult = await turboService.trackShipment(order.turboTrackingNumber);

              if (trackingResult && trackingResult.success) {
                const newStatus = trackingResult.status;
                const oldStatus = order.turboShipmentStatus;

                // تحديث فقط إذا تغيرت الحالة
                if (newStatus && newStatus !== oldStatus) {
                  await safeQuery(async () => {
                    return await prisma.order.updateMany({
                      where: {
                        orderNumber: order.orderNumber,
                        companyId: companyId
                      },
                      data: {
                        turboShipmentStatus: newStatus,
                        turboMetadata: JSON.stringify(trackingResult.data || trackingResult),
                        updatedAt: new Date()
                      }
                    });
                  }, 3);

                  updated++;
                  console.log(`✅ [TURBO-TRACKING] Updated order ${order.orderNumber}: ${oldStatus} → ${newStatus}`);
                } else {
                  console.log(`ℹ️ [TURBO-TRACKING] Order ${order.orderNumber} status unchanged: ${newStatus}`);
                }
              }

              // إضافة تأخير صغير بين الطلبات لتجنب rate limiting
              await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
            } catch (orderError) {
              errors++;
              console.error(`❌ [TURBO-TRACKING] Error updating order ${order.orderNumber}:`, orderError.message);
            }
          }
        } catch (companyError) {
          console.error(`❌ [TURBO-TRACKING] Error processing company ${companyId}:`, companyError.message);
          errors += companyOrders.length;
        }
      }

      this.stats.totalChecked += checked;
      this.stats.totalUpdated += updated;
      this.stats.totalErrors += errors;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [TURBO-TRACKING] Batch update completed in ${duration}s`);
      console.log(`📊 [TURBO-TRACKING] Stats: Checked: ${checked}, Updated: ${updated}, Errors: ${errors}`);
      console.log(`📊 [TURBO-TRACKING] Total Stats: Checked: ${this.stats.totalChecked}, Updated: ${this.stats.totalUpdated}, Errors: ${this.stats.totalErrors}`);

      this.lastRun = new Date();
    } catch (error) {
      console.error('❌ [TURBO-TRACKING] Error in batch update:', error);
      this.stats.totalErrors++;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * تحديث حالة شحنة واحدة (للاستخدام اليدوي)
   */
  async updateSingleShipment(orderNumber, companyId) {
    try {
      const prisma = getSharedPrismaClient();

      const order = await safeQuery(async () => {
        return await prisma.order.findFirst({
          where: {
            orderNumber: orderNumber,
            companyId: companyId
          },
          include: {
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true
              }
            }
          }
        });
      }, 3);

      if (!order || !order.turboTrackingNumber) {
        throw new Error('Order not found or no tracking number');
      }

      if (!order.company.turboEnabled || !order.company.turboApiKey) {
        throw new Error('Turbo is not enabled for this company');
      }

      const turboService = new TurboService(order.company.turboApiKey, companyId);
      const trackingResult = await turboService.trackShipment(order.turboTrackingNumber);

      if (trackingResult && trackingResult.success) {
        const newStatus = trackingResult.status;

        await safeQuery(async () => {
          return await prisma.order.updateMany({
            where: {
              orderNumber: orderNumber,
              companyId: companyId
            },
            data: {
              turboShipmentStatus: newStatus,
              turboMetadata: JSON.stringify(trackingResult.data || trackingResult),
              updatedAt: new Date()
            }
          });
        }, 3);

        return {
          success: true,
          status: newStatus,
          data: trackingResult
        };
      }

      return {
        success: false,
        error: 'Failed to track shipment'
      };
    } catch (error) {
      console.error(`❌ [TURBO-TRACKING] Error updating single shipment:`, error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الخدمة
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      stats: { ...this.stats }
    };
  }
}

// إنشاء instance واحد من الخدمة (Singleton)
const turboTrackingScheduler = new TurboTrackingScheduler();

module.exports = turboTrackingScheduler;

