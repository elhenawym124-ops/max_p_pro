/**
 * Rate Limit Reset Service
 * خدمة لإعادة ضبط Rate Limits (RPM, RPH, RPD) تلقائياً
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');

class RateLimitResetService {
  constructor() {
    this.isRunning = false;
    this.resetInterval = null;
  }

  /**
   * بدء خدمة Reset التلقائية
   * تعمل كل دقيقة للتحقق من النوافذ المنتهية
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ [RATE-LIMIT-RESET] Service already running');
      return;
    }

    console.log('🚀 [RATE-LIMIT-RESET] Starting rate limit reset service...');
    this.isRunning = true;

    // فحص كل 10 ثواني للتحقق من النوافذ المنتهية (تحسين: كان كل دقيقة)
    this.resetInterval = setInterval(async () => {
      await this.resetExpiredWindows();
    }, 10 * 1000); // كل 10 ثواني

    // تشغيل فحص أولي
    this.resetExpiredWindows();
  }

  /**
   * إيقاف خدمة Reset
   */
  stop() {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 [RATE-LIMIT-RESET] Service stopped');
  }

  /**
   * إعادة ضبط النوافذ المنتهية (RPM, RPH, RPD)
   */
  async resetExpiredWindows() {
    try {
      // ✅ FIX: التحقق من اتصال Prisma قبل الاستخدام
      try {
        await getSharedPrismaClient().$connect();
      } catch (connectError) {
        // Prisma قد يكون متصل بالفعل، تجاهل الخطأ
        if (!connectError.message?.includes('already connected')) {
          console.warn('⚠️ [RATE-LIMIT-RESET] Prisma connection warning:', connectError.message);
        }
      }
      
      const now = new Date();
      let resetCount = 0;

      // جلب جميع النماذج
      const allModels = await getSharedPrismaClient().geminiKeyModel.findMany({
        where: {
          isEnabled: true
        }
      });

      for (const model of allModels) {
        try {
          let usage;
          try {
            usage = JSON.parse(model.usage || '{}');
          } catch (e) {
            console.warn(`⚠️ [RATE-LIMIT-RESET] خطأ في تحليل JSON للنموذج ${model.id}`);
            continue;
          }

          let needsUpdate = false;
          const rpmWindowMs = 60 * 1000; // 1 دقيقة
          const rphWindowMs = 60 * 60 * 1000; // 1 ساعة
          const rpdWindowMs = 24 * 60 * 60 * 1000; // 1 يوم

          // التحقق من RPM (Requests Per Minute)
          if (usage.rpm && usage.rpm.windowStart) {
            const rpmWindowStart = new Date(usage.rpm.windowStart);
            if ((now - rpmWindowStart) >= rpmWindowMs) {
              usage.rpm = {
                used: 0,
                limit: usage.rpm.limit || 15,
                windowStart: null // سيتم ضبطه عند الاستخدام التالي
              };
              needsUpdate = true;
            }
          }

          // التحقق من RPH (Requests Per Hour)
          if (usage.rph && usage.rph.windowStart) {
            const rphWindowStart = new Date(usage.rph.windowStart);
            if ((now - rphWindowStart) >= rphWindowMs) {
              usage.rph = {
                used: 0,
                limit: usage.rph.limit || 900,
                windowStart: null
              };
              needsUpdate = true;
            }
          }

          // التحقق من RPD (Requests Per Day)
          if (usage.rpd && usage.rpd.windowStart) {
            const rpdWindowStart = new Date(usage.rpd.windowStart);
            if ((now - rpdWindowStart) >= rpdWindowMs) {
              usage.rpd = {
                used: 0,
                limit: usage.rpd.limit || 1000,
                windowStart: null
              };
              needsUpdate = true;
            }
          }

          // تحديث السجل إذا لزم الأمر
          if (needsUpdate) {
            try {
              await getSharedPrismaClient().geminiKeyModel.update({
                where: { id: model.id },
                data: {
                  usage: JSON.stringify(usage),
                  updatedAt: now
                }
              });
              resetCount++;
            } catch (updateError) {
              if (isPermissionError(updateError)) {
                // Silently handle permission errors - they're expected if DB user lacks UPDATE permissions
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`⚠️ [DB-PERMISSION] Cannot update model ${model.id}: ${getPermissionErrorMessage(updateError)}`);
                }
              } else {
                throw updateError;
              }
            }
          }
        } catch (error) {
          if (isPermissionError(error)) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ [DB-PERMISSION] Error processing model ${model.id}: ${getPermissionErrorMessage(error)}`);
            }
          } else {
            console.error(`❌ [RATE-LIMIT-RESET] خطأ في تحديث النموذج ${model.id}:`, error.message);
          }
        }
      }

      if (resetCount > 0) {
        console.log(`✅ [RATE-LIMIT-RESET] تم إعادة ضبط ${resetCount} نموذج`);
      }
    } catch (error) {
      // ✅ FIX: معالجة خطأ Prisma connection بشكل أفضل
      if (error.message?.includes('Engine is not yet connected')) {
        console.warn('⚠️ [RATE-LIMIT-RESET] Prisma engine not connected, will retry on next interval');
        // محاولة إعادة الاتصال
        try {
          await getSharedPrismaClient().$connect();
        } catch (reconnectError) {
          console.warn('⚠️ [RATE-LIMIT-RESET] Failed to reconnect:', reconnectError.message);
        }
      } else {
        console.error('❌ [RATE-LIMIT-RESET] خطأ عام في إعادة الضبط:', error);
      }
    }
  }

  /**
   * إعادة ضبط يدوية لجميع النماذج (للاستخدام في حالات الطوارئ)
   */
  async manualReset() {
    console.log('🔄 [RATE-LIMIT-RESET] Manual reset requested...');
    await this.resetExpiredWindows();
  }
}

// إنشاء instance واحد للخدمة (Singleton)
let rateLimitResetServiceInstance = null;

function getRateLimitResetService() {
  if (!rateLimitResetServiceInstance) {
    rateLimitResetServiceInstance = new RateLimitResetService();
  }
  return rateLimitResetServiceInstance;
}

module.exports = {
  RateLimitResetService,
  getRateLimitResetService
};


