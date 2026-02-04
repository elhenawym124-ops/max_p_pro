/**
 * نظام مراقبة بسيط وفعال
 * Simple and Effective Monitoring System
 */
class SimpleMonitor {
  constructor() {
    this.stats = {
      responses: {
        total: 0,
        empty: 0,
        slow: 0,
        successful: 0,
        failed: 0
      },
      errors: [],
      performance: {
        responseTimes: [],
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      system: {
        startTime: new Date(),
        uptime: 0,
        lastActivity: new Date()
      },
      // بيانات تاريخية للرسوم البيانية
      history: {
        hourly: [], // آخر 24 ساعة
        daily: [],  // آخر 30 يوم
        maxHourlyPoints: 24,
        maxDailyPoints: 30
      }
    };

    // حد أقصى للأخطاء المحفوظة (لتوفير الذاكرة)
    this.maxErrors = 100;

    // حد أقصى لأوقات الاستجابة المحفوظة
    this.maxResponseTimes = 1000;

    // تأخير تحميل NotificationService لتجنب circular dependency
    this.notificationService = null;

    // تشغيل حفظ البيانات التاريخية كل 15 دقيقة (reduced from 5 minutes)
    setInterval(() => {
      this.saveHistoricalData();
    }, 15 * 60 * 1000);

    //console.log('✅ SimpleMonitor initialized successfully');
  }

  // تحميل NotificationService عند الحاجة
  getNotificationService() {
    if (!this.notificationService) {
      try {
        const NotificationService = require('./notificationService');
        this.notificationService = new NotificationService();
      } catch (error) {
        console.error('⚠️ [MONITOR] Could not load NotificationService:', error.message);
      }
    }
    return this.notificationService;
  }

  /**
   * تسجيل رد جديد
   * @param {number} responseTime - وقت الاستجابة بالميلي ثانية
   * @param {boolean} isEmpty - هل الرد فارغ؟
   * @param {boolean} isSuccessful - هل الرد ناجح؟
   */
  logResponse(responseTime, isEmpty = false, isSuccessful = true) {
    try {
      // تحديث الإحصائيات الأساسية
      this.stats.responses.total++;
      
      if (isEmpty) {
        this.stats.responses.empty++;
      }
      
      if (responseTime > 10000) { // أبطأ من 10 ثواني
        this.stats.responses.slow++;
      }
      
      if (isSuccessful) {
        this.stats.responses.successful++;
      } else {
        this.stats.responses.failed++;
      }
      
      // تحديث إحصائيات الأداء
      this.updatePerformanceStats(responseTime);
      
      // تحديث آخر نشاط
      this.stats.system.lastActivity = new Date();
      
      //console.log(`📊 Response logged: ${responseTime}ms, Empty: ${isEmpty}, Success: ${isSuccessful}`);
      
    } catch (error) {
      console.error('❌ Error logging response:', error);
    }
  }

  /**
   * تسجيل خطأ جديد
   * @param {Error|string} error - الخطأ
   * @param {Object} context - السياق الإضافي
   */
  async logError(error, context = {}) {
    try {
      const errorRecord = {
        id: this.generateId(),
        message: error.message || error.toString(),
        stack: error.stack || null,
        context: context,
        timestamp: new Date(),
        type: this.categorizeError(error)
      };
      
      // إضافة الخطأ للقائمة
      this.stats.errors.unshift(errorRecord);
      
      // الحفاظ على الحد الأقصى للأخطاء
      if (this.stats.errors.length > this.maxErrors) {
        this.stats.errors = this.stats.errors.slice(0, this.maxErrors);
      }
      
      // تحديث آخر نشاط
      this.stats.system.lastActivity = new Date();
      
      // 🔔 إشعار خاص للأخطاء الصامتة
      if (context.silent) {
        //console.log(`🤐 [SILENT-ERROR] ${errorRecord.type} - ${errorRecord.message} (Hidden from customer)`);
        //console.log(`📊 [DEV-ALERT] Silent error detected - Check monitoring dashboard for details`);

        // إنشاء إشعار في قاعدة البيانات للمطورين
        await this.createSilentErrorNotification(errorRecord, context);
      } else {
        //console.log(`🚨 Error logged: ${errorRecord.type} - ${errorRecord.message}`);
      }

    } catch (logError) {
      console.error('❌ Error logging error:', logError);
    }
  }

  /**
   * إنشاء إشعار للأخطاء الصامتة
   */
  async createSilentErrorNotification(errorRecord, context) {
    try {
      const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
      // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

      // إنشاء إشعار للمطورين
      const notificationData = {
        type: 'ERROR',
        title: '🤐 خطأ صامت في النظام',
        message: `${errorRecord.message} - العميل: ${context.customerId || 'غير محدد'}`,
        // ✅ FIX: إزالة userId: null - Prisma يتوقع عدم إرسال الحقل إذا كان null
        data: JSON.stringify({
          silent: true,
          errorType: context.errorType || 'unknown',
          customerId: context.customerId,
          timestamp: errorRecord.timestamp,
          stack: errorRecord.stack,
          source: 'silent_error_system'
        })
      };

      // إضافة الشركة إذا كانت متوفرة
      if (context.companyId) {
        notificationData.company = {
          connect: { id: context.companyId }
        };
      } else {
        // ✅ FIX: companyId مطلوب في schema - إذا لم يكن موجوداً، نرجع بدون إنشاء notification
        console.warn('⚠️ [SILENT-ERROR] Cannot create notification: companyId is missing');
        return;
      }

      await safeQuery(async () => {
        return await getSharedPrismaClient().notification.create({
          data: notificationData
        });
      }, 5);

      //console.log('📊 [NOTIFICATION] Silent error notification created for developers');

    } catch (notificationError) {
      console.error('❌ Error creating silent error notification:', notificationError);
    }
  }

  /**
   * تحديث إحصائيات الأداء
   * @param {number} responseTime 
   */
  updatePerformanceStats(responseTime) {
    // إضافة وقت الاستجابة
    this.stats.performance.responseTimes.unshift(responseTime);
    
    // الحفاظ على الحد الأقصى
    if (this.stats.performance.responseTimes.length > this.maxResponseTimes) {
      this.stats.performance.responseTimes = this.stats.performance.responseTimes.slice(0, this.maxResponseTimes);
    }
    
    // حساب المتوسط
    const times = this.stats.performance.responseTimes;
    this.stats.performance.averageResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
    
    // تحديث الحد الأقصى والأدنى
    this.stats.performance.maxResponseTime = Math.max(this.stats.performance.maxResponseTime, responseTime);
    this.stats.performance.minResponseTime = Math.min(this.stats.performance.minResponseTime, responseTime);
  }

  /**
   * تصنيف نوع الخطأ
   * @param {Error|string} error 
   * @returns {string}
   */
  categorizeError(error) {
    const message = error.message || error.toString();
    
    if (message.includes('429') || message.includes('quota')) {
      return 'QUOTA_EXCEEDED';
    } else if (message.includes('timeout')) {
      return 'TIMEOUT';
    } else if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK';
    } else if (message.includes('database') || message.includes('prisma')) {
      return 'DATABASE';
    } else if (message.includes('facebook') || message.includes('graph')) {
      return 'FACEBOOK_API';
    } else {
      return 'GENERAL';
    }
  }

  /**
   * توليد معرف فريد
   * @returns {string}
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * الحصول على الإحصائيات الكاملة
   * @returns {Object}
   */
  getStats() {
    // تحديث وقت التشغيل
    this.stats.system.uptime = Date.now() - this.stats.system.startTime.getTime();

    // حساب المعدلات
    const total = this.stats.responses.total;
    const errorRate = total > 0 ? (this.stats.responses.failed / total) : 0;
    const emptyRate = total > 0 ? (this.stats.responses.empty / total) : 0;
    const slowRate = total > 0 ? (this.stats.responses.slow / total) : 0;
    const successRate = total > 0 ? (this.stats.responses.successful / total) : 0;

    return {
      summary: {
        totalResponses: total,
        errorRate: Math.round(errorRate * 100 * 100) / 100, // نسبة مئوية بدقة عشرين
        emptyRate: Math.round(emptyRate * 100 * 100) / 100,
        slowRate: Math.round(slowRate * 100 * 100) / 100,
        successRate: Math.round(successRate * 100 * 100) / 100,
        averageResponseTime: Math.round(this.stats.performance.averageResponseTime),
        uptime: this.stats.system.uptime,
        lastActivity: this.stats.system.lastActivity,
        healthStatus: this.getHealthStatus()
      },
      responses: this.stats.responses,
      performance: {
        ...this.stats.performance,
        averageResponseTime: Math.round(this.stats.performance.averageResponseTime)
      },
      errors: {
        total: this.stats.errors.length,
        recent: this.stats.errors.slice(0, 10), // آخر 10 أخطاء
        byType: this.getErrorsByType()
      },
      system: this.stats.system
    };
  }

  /**
   * تحديد حالة صحة النظام
   * @returns {string} - 'healthy', 'warning', 'critical'
   */
  getHealthStatus() {
    const total = this.stats.responses.total;
    if (total === 0) return 'unknown';

    const errorRate = this.stats.responses.failed / total;
    const emptyRate = this.stats.responses.empty / total;
    const slowRate = this.stats.responses.slow / total;

    // حالة حرجة
    if (errorRate > 0.2 || emptyRate > 0.1 || slowRate > 0.3) {
      return 'critical';
    }

    // حالة تحذير
    if (errorRate > 0.1 || emptyRate > 0.05 || slowRate > 0.15) {
      return 'warning';
    }

    // حالة صحية
    return 'healthy';
  }

  /**
   * تجميع الأخطاء حسب النوع
   * @returns {Object}
   */
  getErrorsByType() {
    const errorsByType = {};

    this.stats.errors.forEach(error => {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = 0;
      }
      errorsByType[error.type]++;
    });

    return errorsByType;
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  reset() {
    //console.log('🔄 Resetting SimpleMonitor stats...');

    this.stats = {
      responses: {
        total: 0,
        empty: 0,
        slow: 0,
        successful: 0,
        failed: 0
      },
      errors: [],
      performance: {
        responseTimes: [],
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      system: {
        startTime: new Date(),
        uptime: 0,
        lastActivity: new Date()
      }
    };

    //console.log('✅ SimpleMonitor stats reset successfully');
  }

  /**
   * الحصول على ملخص سريع للحالة
   * @returns {Object}
   */
  getQuickStatus() {
    const stats = this.getStats();
    return {
      status: stats.summary.healthStatus,
      totalResponses: stats.summary.totalResponses,
      errorRate: stats.summary.errorRate + '%',
      averageResponseTime: stats.summary.averageResponseTime + 'ms',
      uptime: Math.round(stats.summary.uptime / 1000) + 's',
      lastError: stats.errors.recent[0] || null
    };
  }

  /**
   * حفظ البيانات التاريخية للرسوم البيانية
   */
  saveHistoricalData() {
    try {
      const now = new Date();
      const stats = this.getStats();

      // إنشاء نقطة بيانات جديدة
      const dataPoint = {
        timestamp: now.toISOString(),
        totalResponses: stats.summary.totalResponses,
        errorRate: stats.summary.errorRate,
        averageResponseTime: stats.summary.averageResponseTime,
        successRate: stats.summary.successRate,
        slowRate: stats.summary.slowRate,
        emptyRate: stats.summary.emptyRate,
        activeErrors: stats.errors.total
      };

      // حفظ البيانات الساعية (كل 5 دقائق)
      this.stats.history.hourly.push(dataPoint);

      // الحفاظ على آخر 24 ساعة (288 نقطة × 5 دقائق = 24 ساعة)
      if (this.stats.history.hourly.length > 288) {
        this.stats.history.hourly = this.stats.history.hourly.slice(-288);
      }

      // حفظ البيانات اليومية (كل ساعة)
      const currentHour = now.getHours();
      const lastDailyPoint = this.stats.history.daily[this.stats.history.daily.length - 1];

      if (!lastDailyPoint || new Date(lastDailyPoint.timestamp).getHours() !== currentHour) {
        // إنشاء ملخص يومي
        const dailyPoint = {
          timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour).toISOString(),
          totalResponses: stats.summary.totalResponses,
          errorRate: stats.summary.errorRate,
          averageResponseTime: stats.summary.averageResponseTime,
          successRate: stats.summary.successRate,
          slowRate: stats.summary.slowRate,
          emptyRate: stats.summary.emptyRate,
          activeErrors: stats.errors.total
        };

        this.stats.history.daily.push(dailyPoint);

        // الحفاظ على آخر 30 يوم (720 نقطة × ساعة = 30 يوم)
        if (this.stats.history.daily.length > 720) {
          this.stats.history.daily = this.stats.history.daily.slice(-720);
        }
      }

      //console.log(`📊 [MONITOR] Historical data saved - Hourly: ${this.stats.history.hourly.length}, Daily: ${this.stats.history.daily.length}`);

    } catch (error) {
      console.error('❌ [MONITOR] Error saving historical data:', error);
    }
  }

  /**
   * الحصول على البيانات التاريخية للرسوم البيانية
   * @param {string} period - 'hourly' أو 'daily'
   * @param {number} limit - عدد النقاط المطلوبة
   * @returns {Array}
   */
  getHistoricalData(period = 'hourly', limit = null) {
    try {
      const data = this.stats.history[period] || [];

      if (limit && limit > 0) {
        return data.slice(-limit);
      }

      return data;
    } catch (error) {
      console.error('❌ [MONITOR] Error getting historical data:', error);
      return [];
    }
  }

  /**
   * الحصول على إحصائيات الرسوم البيانية
   * @returns {Object}
   */
  getChartStats() {
    try {
      const hourlyData = this.getHistoricalData('hourly', 48); // آخر 4 ساعات
      const dailyData = this.getHistoricalData('daily', 24);   // آخر 24 ساعة

      return {
        hourly: {
          data: hourlyData,
          count: hourlyData.length,
          period: '5 minutes',
          coverage: `${Math.round(hourlyData.length * 5 / 60 * 10) / 10} hours`
        },
        daily: {
          data: dailyData,
          count: dailyData.length,
          period: '1 hour',
          coverage: `${dailyData.length} hours`
        },
        summary: {
          totalDataPoints: this.stats.history.hourly.length + this.stats.history.daily.length,
          oldestHourly: this.stats.history.hourly[0]?.timestamp || null,
          oldestDaily: this.stats.history.daily[0]?.timestamp || null,
          lastUpdate: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ [MONITOR] Error getting chart stats:', error);
      return {
        hourly: { data: [], count: 0, period: '5 minutes', coverage: '0 hours' },
        daily: { data: [], count: 0, period: '1 hour', coverage: '0 hours' },
        summary: { totalDataPoints: 0, oldestHourly: null, oldestDaily: null, lastUpdate: new Date().toISOString() }
      };
    }
  }
}

// إنشاء instance مشترك
const simpleMonitor = new SimpleMonitor();

// إنشاء نظام التنبيهات
const { SimpleAlerts } = require('./simpleAlerts');
const simpleAlerts = new SimpleAlerts(simpleMonitor);

// إنشاء مولد التقارير
const { ReportGenerator } = require('./reportGenerator');
const reportGenerator = new ReportGenerator(simpleMonitor, simpleAlerts);

// إنشاء نظام مراقبة الجودة
const { QualityMonitor } = require('./qualityMonitor');
const qualityMonitor = new QualityMonitor();

// تشغيل فحص التنبيهات كل 15 دقيقة (reduced from 5 minutes)
setInterval(() => {
  simpleAlerts.checkAndAlert();
}, 15 * 60 * 1000);

// تنظيف التنبيهات المحلولة كل ساعة
setInterval(() => {
  simpleAlerts.cleanupResolvedAlerts();
}, 60 * 60 * 1000);

//console.log('✅ SimpleMonitor and SimpleAlerts system initialized');

module.exports = {
  SimpleMonitor,
  simpleMonitor,
  SimpleAlerts,
  simpleAlerts,
  ReportGenerator,
  reportGenerator,
  QualityMonitor,
  qualityMonitor
};

