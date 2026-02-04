/**
 * نظام معالجة أخطاء الذكاء الاصطناعي المحسن
 * Enhanced AI Error Handler System
 * 
 * يوفر آليات fallback ذكية لمعالجة أخطاء الـ AI بطريقة تضمن استمرارية الخدمة
 */

class AIErrorHandler {
  constructor() {
    this.errorStats = new Map(); // إحصائيات الأخطاء
    this.fallbackResponses = this.initializeFallbackResponses();
    this.errorThresholds = {
      api_quota_exceeded: 3,      // حد أخطاء تجاوز API
      network_timeout: 5,         // حد أخطاء الشبكة
      invalid_response: 10,       // حد الردود غير الصحيحة
      general_error: 15           // حد الأخطاء العامة
    };
  }

  /**
   * تصنيف نوع الخطأ
   * @param {Error} error - كائن الخطأ
   * @returns {string} - نوع الخطأ المصنف
   */
  classifyError(error) {
    const errorMessage = error.message.toLowerCase();
    const errorCode = error.code || error.status;

    // أخطاء تجاوز حد API
    if (errorCode === 429 ||
      errorMessage.includes('quota') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('rate limit')) {
      return 'api_quota_exceeded';
    }

    // أخطاء الشبكة والاتصال
    if (errorCode === 'ECONNRESET' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ETIMEDOUT' ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection')) {
      return 'network_timeout';
    }

    // أخطاء Authentication
    if (errorCode === 401 ||
      errorCode === 403 ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid api key')) {
      return 'auth_error';
    }

    // أخطاء الاستجابة غير الصحيحة
    if (errorMessage.includes('invalid response') ||
      errorMessage.includes('parsing error') ||
      errorMessage.includes('json') ||
      errorMessage.includes('malformed')) {
      return 'invalid_response';
    }

    // أخطاء الخدمة غير متاحة
    if (errorCode >= 500 && errorCode < 600) {
      return 'service_unavailable';
    }

    return 'general_error';
  }

  /**
   * تسجيل الخطأ في الإحصائيات
   * @param {string} errorType - نوع الخطأ
   * @param {Error} error - كائن الخطأ
   * @param {Object} context - سياق إضافي
   */
  logError(errorType, error, context = {}) {
    const timestamp = Date.now();
    const errorKey = `${errorType}_${context.companyId || 'unknown'}`;

    if (!this.errorStats.has(errorKey)) {
      this.errorStats.set(errorKey, {
        count: 0,
        firstOccurrence: timestamp,
        lastOccurrence: timestamp,
        errors: []
      });
    }

    const stats = this.errorStats.get(errorKey);
    stats.count++;
    stats.lastOccurrence = timestamp;
    stats.errors.push({
      timestamp,
      message: error.message,
      stack: error.stack,
      context
    });

    // الاحتفاظ بآخر 10 أخطاء فقط لكل نوع
    if (stats.errors.length > 10) {
      stats.errors = stats.errors.slice(-10);
    }

    console.error(`💥 [AI-ERROR] ${errorType.toUpperCase()}:`, {
      message: error.message,
      count: stats.count,
      companyId: context.companyId,
      conversationId: context.conversationId,
      customerId: context.customerId
    });
  }

  /**
   * فحص ما إذا كان الخطأ تجاوز الحد المسموح
   * @param {string} errorType - نوع الخطأ
   * @param {string} companyId - معرف الشركة
   * @returns {boolean} - هل تجاوز الحد
   */
  isErrorThresholdExceeded(errorType, companyId = 'unknown') {
    const errorKey = `${errorType}_${companyId}`;
    const stats = this.errorStats.get(errorKey);

    if (!stats) return false;

    const threshold = this.errorThresholds[errorType] || 20;
    const timeWindow = 60 * 60 * 1000; // ساعة واحدة
    const currentTime = Date.now();

    // فحص الأخطاء في الساعة الماضية
    const recentErrors = stats.errors.filter(err =>
      currentTime - err.timestamp < timeWindow
    ).length;

    return recentErrors >= threshold;
  }

  /**
   * الحصول على رد fallback مناسب
   * @param {string} errorType - نوع الخطأ
   * @param {Object} context - السياق
   * @returns {Object} - الرد البديل
   */
  getFallbackResponse(errorType, context = {}) {
    // 🤐 النظام الصامت - لا نرجع أي رد للعميل
    // حسب طلب العميل: الحفاظ على واجهة "إنسان" وعدم إظهار رسائل خطأ آلية

    return {
      success: false,
      content: null, // 🤐 content: null يمنع إرسال أي رسالة للعميل
      shouldEscalate: this.shouldEscalate(errorType, context),
      errorType,
      fallback: false, // ليس fallback تقليدي (لا يوجد رد)
      confidence: 0,
      requiresHumanIntervention: true, // دائماً نطلب تدخل بشري في الصمت لعدم ترك العميل
      silent: true // 🤐 علامة صريحة للنظام الصامت
    };
  }

  /**
   * تحديد ما إذا كان يجب تصعيد الحالة
   * @param {string} errorType - نوع الخطأ
   * @param {Object} context - السياق
   * @returns {boolean} - هل يجب التصعيد
   */
  shouldEscalate(errorType, context = {}) {
    const { companyId, isUrgent, consecutiveFailures } = context;

    // تصعيد فوري للحالات الحرجة
    if (isUrgent || consecutiveFailures >= 3) {
      return true;
    }

    // تصعيد إذا تجاوز الحد المسموح
    if (this.isErrorThresholdExceeded(errorType, companyId)) {
      return true;
    }

    // تصعيد لأخطاء المصادقة
    if (errorType === 'auth_error') {
      return true;
    }

    return false;
  }

  /**
   * تحديد ما إذا كانت الحالة تتطلب تدخل بشري
   * @param {string} errorType - نوع الخطأ
   * @param {Object} context - السياق
   * @returns {boolean} - هل تتطلب تدخل بشري
   */
  requiresHumanIntervention(errorType, context = {}) {
    // الحالات التي تتطلب تدخل بشري فوري
    const criticalErrorTypes = ['auth_error', 'service_unavailable'];

    if (criticalErrorTypes.includes(errorType)) {
      return true;
    }

    // إذا تكررت الأخطاء أكثر من المسموح
    if (this.isErrorThresholdExceeded(errorType, context.companyId)) {
      return true;
    }

    return false;
  }

  /**
   * تهيئة الردود البديلة
   * @returns {Object} - قاموس الردود البديلة
   */
  initializeFallbackResponses() {
    return {
      general: [
        'شكراً لتواصلك معنا! سأقوم بمراجعة استفسارك وأعود إليك قريباً. 💬',
        'مرحباً! تم استلام رسالتك وسيقوم فريقنا بالرد عليك في أقرب وقت ممكن. ⏰',
        'أهلاً وسهلاً! دعني أتحقق من المعلومات وأعود إليك بالتفاصيل. 🔍',
        'شكراً لصبرك! سأحتاج لبعض الوقت لمراجعة طلبك والرد عليك بدقة. ⚡'
      ],

      quota_exceeded: [
        'شكراً لك! نظامنا مشغول حالياً، لكن سيقوم فريق خدمة العملاء بالتواصل معك قريباً. 🚀',
        'مرحباً! نواجه ضغط عالي على الخدمة حالياً، لكن فريقنا سيهتم بطلبك شخصياً. 👥',
        'أهلاً! للحصول على أفضل خدمة، سيقوم أحد ممثلي خدمة العملاء بالرد عليك قريباً. ⭐'
      ],

      network_issues: [
        'مرحباً! نواجه بعض التحديات التقنية حالياً، لكن سنعود إليك بأسرع وقت ممكن. 🔧',
        'شكراً لصبرك! يبدو أن هناك مشكلة مؤقتة في الاتصال، سيقوم فريقنا بمتابعة طلبك. 📞',
        'أهلاً! نواجه بطء في الشبكة حالياً، لكن سنتأكد من الرد على استفسارك قريباً. 🌐'
      ],

      service_maintenance: [
        'مرحباً! نقوم بصيانة تحسينات على نظامنا حالياً لتوفير خدمة أفضل لك. 🛠️',
        'شكراً لتواصلك! نظامنا تحت التطوير لخدمتك بشكل أفضل، سيعود قريباً. 🚀',
        'أهلاً! نحن نعمل على تحسين خدماتنا حالياً، فريق خدمة العملاء سيتولى طلبك. 💪'
      ],

      urgent_fallback: [
        'مرحباً! بسبب طبيعة استفسارك العاجلة، سأقوم بتحويلك فوراً لفريق الدعم المتخصص. 🚨',
        'شكراً لتواصلك! هذا الأمر يحتاج اهتمام خاص، سيتم التواصل معك فوراً. ⚡',
        'أهلاً! نظراً لأهمية طلبك، سيقوم مدير خدمة العملاء بالتواصل معك مباشرة. 👔'
      ],

      product_inquiry: [
        'مرحباً! بخصوص استفسارك عن المنتج، سأقوم بجمع كل التفاصيل وأعود إليك قريباً. 📦',
        'شكراً لاهتمامك! دعني أتحقق من توفر المنتج والأسعار وأعود إليك بالتفاصيل. 💰',
        'أهلاً! سأحتاج لبعض الوقت للتأكد من مواصفات المنتج وأعود إليك بكل المعلومات. 📋'
      ],

      order_inquiry: [
        'مرحباً! بخصوص طلبك، دعني أتحقق من الحالة والتفاصيل وأعود إليك فوراً. 🔍',
        'شكراً! سأراجع معلومات طلبك مع فريق الشحن وأعطيك آخر التحديثات. 📞',
        'أهلاً! حالة طلبك مهمة لنا، سأتابع مع الفريق وأعود إليك بالتفاصيل. ⏰'
      ],

      shipping_inquiry: [
        'مرحباً! بخصوص الشحن، سأتحقق من أحدث المعلومات مع فريق التوصيل وأعود إليك. 🚚',
        'شكراً! دعني أراجع حالة الشحنة وأعطيك تحديث دقيق عن موعد الوصول. 📍',
        'أهلاً! سأتواصل مع شركة الشحن للحصول على آخر المعلومات عن طلبك. 📦'
      ]
    };
  }

  /**
   * معالجة شاملة للخطأ وإرجاع الرد المناسب
   * @param {Error} error - كائن الخطأ
   * @param {Object} context - السياق الكامل
   * @returns {Object} - الرد النهائي
   */
  async handleError(error, context = {}) {
    try {
      // تصنيف الخطأ
      const errorType = this.classifyError(error);

      // تسجيل الخطأ
      this.logError(errorType, error, context);

      // ✅ INTEGRATION: إرسال تنبيه فوري للنظام الصامت (Silent Mode Alert)
      try {
        const { simpleMonitor } = require('./simpleMonitor');
        // نرسل الخطأ للمراقب مع علامة silent
        // هذا سيقوم بإنشاء إشعار فوري للمشرفين في لوحة التحكم
        simpleMonitor.logError(error, {
          ...context,
          silent: true, // 🔔 علامة هامة جداً لتفعيل التنبيه الفوري
          errorType: errorType,
          companyId: context.companyId
        });
      } catch (monitorError) {
        console.error('⚠️ [AI-ERROR-HANDLER] Failed to send silent alert:', monitorError.message);
      }

      // إنشاء مهمة تلقائية عند حدوث خطأ في AI
      try {
        const aiErrorTaskService = require('./aiAgent/aiErrorTaskService');
        await aiErrorTaskService.createErrorTask(error, {
          ...context,
          errorType: errorType,
          userMessage: context.userMessage || ''
        });
      } catch (taskError) {
        // لا نريد إيقاف العملية الرئيسية إذا فشل إنشاء المهمة
        console.error('⚠️ [AI-ERROR-HANDLER] Failed to create error task:', taskError.message);
      }

      // الحصول على الرد البديل
      const fallbackResponse = this.getFallbackResponse(errorType, context);

      // إضافة معلومات إضافية للاستجابة
      const response = {
        ...fallbackResponse,
        timestamp: new Date().toISOString(),
        errorDetails: {
          type: errorType,
          message: error.message,
          context: {
            companyId: context.companyId,
            conversationId: context.conversationId,
            customerId: context.customerId
          }
        }
      };

      //console.log(`🔄 [AI-FALLBACK] Generated fallback response for ${errorType}:`, {
      //   content: response.content.substring(0, 50) + '...',
      //   shouldEscalate: response.shouldEscalate,
      //   requiresHumanIntervention: response.requiresHumanIntervention
      // });

      return response;

    } catch (handlingError) {
      console.error('💥 [AI-ERROR-HANDLER] Critical error in error handling:', handlingError);

      // 🤐 النظام الصامت - لا نرجع أي رد للعميل حتى في حالة الخطأ الحرجة
      return {
        success: false,
        content: null, // 🤐 النظام الصامت - لا نرسل رسالة للعميل
        shouldEscalate: true,
        errorType: 'critical_system_error',
        fallback: false,
        confidence: 0,
        requiresHumanIntervention: true,
        timestamp: new Date().toISOString(),
        silent: true // 🤐 علامة النظام الصامت
      };
    }
  }

  /**
   * الحصول على إحصائيات الأخطاء
   * @param {string} companyId - معرف الشركة (اختياري)
   * @returns {Object} - إحصائيات مفصلة
   */
  getErrorStats(companyId = null) {
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      recentErrors: [],
      criticalErrors: 0,
      healthScore: 100
    };

    for (const [errorKey, errorData] of this.errorStats) {
      if (companyId && !errorKey.includes(companyId)) {
        continue;
      }

      stats.totalErrors += errorData.count;

      const errorType = errorKey.split('_')[0];
      if (!stats.errorsByType[errorType]) {
        stats.errorsByType[errorType] = 0;
      }
      stats.errorsByType[errorType] += errorData.count;

      // الأخطاء الحديثة (آخر ساعة)
      const recentErrors = errorData.errors.filter(err =>
        Date.now() - err.timestamp < 60 * 60 * 1000
      );
      stats.recentErrors.push(...recentErrors);

      // الأخطاء الحرجة
      if (['auth_error', 'service_unavailable'].includes(errorType)) {
        stats.criticalErrors += errorData.count;
      }
    }

    // حساب نقاط الصحة
    stats.healthScore = Math.max(0, 100 - (stats.recentErrors.length * 5) - (stats.criticalErrors * 10));

    return stats;
  }

  /**
   * إعادة تعيين إحصائيات الأخطاء
   * @param {string} companyId - معرف الشركة (اختياري)
   */
  resetErrorStats(companyId = null) {
    if (companyId) {
      // إعادة تعيين أخطاء شركة معينة
      for (const errorKey of this.errorStats.keys()) {
        if (errorKey.includes(companyId)) {
          this.errorStats.delete(errorKey);
        }
      }
    } else {
      // إعادة تعيين جميع الأخطاء
      this.errorStats.clear();
    }

    //console.log(`🔄 [AI-ERROR-HANDLER] Error stats reset${companyId ? ` for company ${companyId}` : ' globally'}`);
  }
}

module.exports = AIErrorHandler;