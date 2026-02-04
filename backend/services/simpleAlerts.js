/**
 * نظام تنبيهات بسيط وفعال
 * Simple and Effective Alerts System
 */
class SimpleAlerts {
  constructor(monitor) {
    this.monitor = monitor;
    
    // عتبات التنبيهات (يمكن تخصيصها)
    this.thresholds = {
      errorRate: 10,        // معدل أخطاء أكثر من 10%
      emptyRate: 5,         // ردود فارغة أكثر من 5%
      slowRate: 30,         // ردود بطيئة أكثر من 30%
      responseTime: 15000,  // وقت استجابة أكثر من 15 ثانية
      minResponses: 5       // الحد الأدنى للردود قبل التحليل
    };

    // إعدادات التنبيهات المتقدمة
    this.alertSettings = {
      groupSimilarAlerts: true,     // تجميع التنبيهات المتشابهة
      suppressDuplicates: true,     // كبت التنبيهات المكررة
      suppressionTime: 15 * 60 * 1000, // 15 دقيقة كبت للتنبيهات المكررة
      maxGroupSize: 5,              // الحد الأقصى للتنبيهات في المجموعة الواحدة
      emailNotifications: false,    // تنبيهات البريد الإلكتروني (معطلة افتراضياً)
      webhookNotifications: false,  // تنبيهات Webhook (معطلة افتراضياً)
      escalationEnabled: false,     // تصعيد التنبيهات الحرجة
      escalationTime: 30 * 60 * 1000 // 30 دقيقة للتصعيد
    };
    
    // حالة التنبيهات
    this.alertsState = {
      lastCheck: new Date(),
      activeAlerts: new Map(),
      alertHistory: [],
      maxHistorySize: 50,
      groupedAlerts: new Map(), // تجميع التنبيهات المتشابهة
      suppressedAlerts: new Map() // التنبيهات المكبوتة مؤقتاً
    };
    
    // أنواع التنبيهات
    this.alertTypes = {
      HIGH_ERROR_RATE: {
        severity: 'critical',
        message: 'معدل أخطاء عالي',
        icon: '🚨',
        color: 'red'
      },
      HIGH_EMPTY_RATE: {
        severity: 'warning',
        message: 'معدل ردود فارغة عالي',
        icon: '⚠️',
        color: 'yellow'
      },
      HIGH_SLOW_RATE: {
        severity: 'warning',
        message: 'معدل ردود بطيئة عالي',
        icon: '🐌',
        color: 'yellow'
      },
      SLOW_RESPONSE_TIME: {
        severity: 'warning',
        message: 'متوسط وقت الاستجابة بطيء',
        icon: '⏰',
        color: 'yellow'
      },
      SYSTEM_CRITICAL: {
        severity: 'critical',
        message: 'النظام في حالة حرجة',
        icon: '💥',
        color: 'red'
      }
    };
    
    //console.log('✅ SimpleAlerts initialized successfully');
  }

  /**
   * فحص النظام وإرسال التنبيهات
   */
  checkAndAlert() {
    try {
      //console.log('🔍 [ALERTS] Starting system check...');
      
      const stats = this.monitor.getStats();
      const alerts = this.analyzeStats(stats);
      
      // معالجة التنبيهات الجديدة
      this.processAlerts(alerts);
      
      // تحديث آخر فحص
      this.alertsState.lastCheck = new Date();
      
      //console.log(`✅ [ALERTS] Check completed - ${alerts.length} alerts found`);
      
      return {
        alertsFound: alerts.length,
        activeAlerts: this.alertsState.activeAlerts.size,
        systemHealth: stats.summary.healthStatus,
        lastCheck: this.alertsState.lastCheck
      };
      
    } catch (error) {
      console.error('❌ [ALERTS] Error during system check:', error);
      this.monitor.logError(error, { source: 'ALERTS_SYSTEM' });
      return null;
    }
  }

  /**
   * تحليل الإحصائيات واكتشاف المشاكل
   * @param {Object} stats 
   * @returns {Array} قائمة التنبيهات
   */
  analyzeStats(stats) {
    const alerts = [];
    const { summary, responses } = stats;
    
    // تجاهل التحليل إذا كان عدد الردود قليل
    if (summary.totalResponses < this.thresholds.minResponses) {
      //console.log(`📊 [ALERTS] Insufficient data for analysis (${summary.totalResponses} responses)`);
      return alerts;
    }

    // فحص معدل الأخطاء
    if (summary.errorRate > this.thresholds.errorRate) {
      alerts.push(this.createAlert('HIGH_ERROR_RATE', {
        currentValue: summary.errorRate,
        threshold: this.thresholds.errorRate,
        details: `${responses.failed} أخطاء من ${summary.totalResponses} ردود`
      }));
    }

    // فحص معدل الردود الفارغة
    if (summary.emptyRate > this.thresholds.emptyRate) {
      alerts.push(this.createAlert('HIGH_EMPTY_RATE', {
        currentValue: summary.emptyRate,
        threshold: this.thresholds.emptyRate,
        details: `${responses.empty} ردود فارغة من ${summary.totalResponses} ردود`
      }));
    }

    // فحص معدل الردود البطيئة
    if (summary.slowRate > this.thresholds.slowRate) {
      alerts.push(this.createAlert('HIGH_SLOW_RATE', {
        currentValue: summary.slowRate,
        threshold: this.thresholds.slowRate,
        details: `${responses.slow} ردود بطيئة من ${summary.totalResponses} ردود`
      }));
    }

    // فحص متوسط وقت الاستجابة
    if (summary.averageResponseTime > this.thresholds.responseTime) {
      alerts.push(this.createAlert('SLOW_RESPONSE_TIME', {
        currentValue: summary.averageResponseTime,
        threshold: this.thresholds.responseTime,
        details: `متوسط ${Math.round(summary.averageResponseTime)}ms`
      }));
    }

    // فحص الحالة العامة للنظام
    if (summary.healthStatus === 'critical') {
      alerts.push(this.createAlert('SYSTEM_CRITICAL', {
        currentValue: summary.healthStatus,
        threshold: 'healthy',
        details: `النظام يحتاج لتدخل فوري`
      }));
    }

    return alerts;
  }

  /**
   * إنشاء تنبيه جديد
   * @param {string} type 
   * @param {Object} data 
   * @returns {Object}
   */
  createAlert(type, data) {
    const alertConfig = this.alertTypes[type];
    
    return {
      id: this.generateAlertId(),
      type: type,
      severity: alertConfig.severity,
      message: alertConfig.message,
      icon: alertConfig.icon,
      color: alertConfig.color,
      timestamp: new Date(),
      data: data,
      resolved: false
    };
  }

  /**
   * معالجة التنبيهات الجديدة
   * @param {Array} alerts
   */
  processAlerts(alerts) {
    alerts.forEach(alert => {
      // فحص التنبيهات المكبوتة
      if (this.isAlertSuppressed(alert)) {
        //console.log(`🔇 [ALERTS] Alert suppressed: ${alert.type}`);
        return;
      }

      // التحقق من وجود تنبيه مشابه نشط
      const existingAlert = this.findActiveAlert(alert.type);

      if (existingAlert) {
        // تحديث التنبيه الموجود أو تجميعه
        if (this.alertSettings.groupSimilarAlerts) {
          this.groupSimilarAlert(existingAlert, alert);
        } else {
          existingAlert.data = alert.data;
          existingAlert.timestamp = alert.timestamp;
        }
        //console.log(`🔄 [ALERTS] Updated existing alert: ${alert.type}`);
      } else {
        // إضافة تنبيه جديد
        this.alertsState.activeAlerts.set(alert.id, alert);
        this.addToHistory(alert);
        this.sendAlert(alert);

        // إضافة للكبت المؤقت إذا كان مفعلاً
        if (this.alertSettings.suppressDuplicates) {
          this.addToSuppression(alert);
        }

        //console.log(`🆕 [ALERTS] New alert created: ${alert.type}`);
      }
    });

    // حل التنبيهات التي لم تعد موجودة
    this.resolveInactiveAlerts(alerts);
  }

  /**
   * فحص ما إذا كان التنبيه مكبوت مؤقتاً
   * @param {Object} alert
   * @returns {boolean}
   */
  isAlertSuppressed(alert) {
    if (!this.alertSettings.suppressDuplicates) {
      return false;
    }

    const suppressionKey = `${alert.type}_${JSON.stringify(alert.data)}`;
    const suppressedUntil = this.alertsState.suppressedAlerts.get(suppressionKey);

    if (suppressedUntil && Date.now() < suppressedUntil) {
      return true;
    }

    // إزالة الكبت المنتهي الصلاحية
    if (suppressedUntil && Date.now() >= suppressedUntil) {
      this.alertsState.suppressedAlerts.delete(suppressionKey);
    }

    return false;
  }

  /**
   * إضافة تنبيه للكبت المؤقت
   * @param {Object} alert
   */
  addToSuppression(alert) {
    const suppressionKey = `${alert.type}_${JSON.stringify(alert.data)}`;
    const suppressUntil = Date.now() + this.alertSettings.suppressionTime;

    this.alertsState.suppressedAlerts.set(suppressionKey, suppressUntil);

    //console.log(`🔇 [ALERTS] Alert added to suppression: ${alert.type} until ${new Date(suppressUntil).toISOString()}`);
  }

  /**
   * تجميع التنبيهات المتشابهة
   * @param {Object} existingAlert
   * @param {Object} newAlert
   */
  groupSimilarAlert(existingAlert, newAlert) {
    // إنشاء مجموعة إذا لم تكن موجودة
    if (!existingAlert.grouped) {
      existingAlert.grouped = {
        count: 1,
        firstOccurrence: existingAlert.timestamp,
        lastOccurrence: existingAlert.timestamp,
        occurrences: [existingAlert.timestamp]
      };
    }

    // إضافة التنبيه الجديد للمجموعة
    existingAlert.grouped.count++;
    existingAlert.grouped.lastOccurrence = newAlert.timestamp;
    existingAlert.grouped.occurrences.push(newAlert.timestamp);

    // تحديث البيانات بأحدث قيم
    existingAlert.data = newAlert.data;
    existingAlert.timestamp = newAlert.timestamp;

    // الحفاظ على الحد الأقصى للمجموعة
    if (existingAlert.grouped.occurrences.length > this.alertSettings.maxGroupSize) {
      existingAlert.grouped.occurrences = existingAlert.grouped.occurrences.slice(-this.alertSettings.maxGroupSize);
    }

    //console.log(`📊 [ALERTS] Alert grouped: ${existingAlert.type} (${existingAlert.grouped.count} occurrences)`);
  }

  /**
   * إرسال التنبيه
   * @param {Object} alert
   */
  sendAlert(alert) {
    const alertMessage = this.formatAlertMessage(alert);

    // إرسال للكونسول
    //console.log(`${alert.icon} [${alert.severity.toUpperCase()}] ${alertMessage}`);

    // إرسال تنبيهات إضافية حسب الإعدادات
    if (this.alertSettings.emailNotifications) {
      this.sendEmailAlert(alert, alertMessage);
    }

    if (this.alertSettings.webhookNotifications) {
      this.sendWebhookAlert(alert, alertMessage);
    }

    // تصعيد التنبيهات الحرجة
    if (this.alertSettings.escalationEnabled && alert.severity === 'critical') {
      this.scheduleEscalation(alert);
    }
  }

  /**
   * إرسال تنبيه عبر البريد الإلكتروني (محاكاة)
   * @param {Object} alert
   * @param {string} message
   */
  async sendEmailAlert(alert, message) {
    try {
      // محاكاة إرسال البريد الإلكتروني
      //console.log(`📧 [EMAIL] Sending alert email...`);
      //console.log(`📧 [EMAIL] To: admin@company.com`);
      //console.log(`📧 [EMAIL] Subject: ${alert.severity === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'} - ${alert.message}`);
      //console.log(`📧 [EMAIL] Body: ${message}`);
      //console.log(`📧 [EMAIL] Timestamp: ${alert.timestamp}`);

      // في التطبيق الحقيقي، يمكن استخدام مكتبة مثل nodemailer
      // await nodemailer.sendMail({
      //   to: 'admin@company.com',
      //   subject: `${alert.severity === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'} - ${alert.message}`,
      //   text: message,
      //   html: this.formatEmailHTML(alert, message)
      // });

      //console.log(`✅ [EMAIL] Alert email sent successfully`);

    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send alert email:`, error);
    }
  }

  /**
   * إرسال تنبيه عبر Webhook (محاكاة)
   * @param {Object} alert
   * @param {string} message
   */
  async sendWebhookAlert(alert, message) {
    try {
      // محاكاة إرسال Webhook
      //console.log(`🔗 [WEBHOOK] Sending alert webhook...`);
      //console.log(`🔗 [WEBHOOK] URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL`);
      //console.log(`🔗 [WEBHOOK] Payload:`, {
      //   text: message,
      //   severity: alert.severity,
      //   type: alert.type,
      //   timestamp: alert.timestamp,
      //   data: alert.data
      // });

      // في التطبيق الحقيقي، يمكن استخدام fetch أو axios
      // await fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     text: message,
      //     severity: alert.severity,
      //     type: alert.type,
      //     timestamp: alert.timestamp
      //   })
      // });

      //console.log(`✅ [WEBHOOK] Alert webhook sent successfully`);

    } catch (error) {
      console.error(`❌ [WEBHOOK] Failed to send alert webhook:`, error);
    }
  }

  /**
   * جدولة تصعيد التنبيه الحرج
   * @param {Object} alert
   */
  scheduleEscalation(alert) {
    //console.log(`⏰ [ESCALATION] Scheduling escalation for critical alert: ${alert.type}`);

    setTimeout(() => {
      // التحقق من أن التنبيه ما زال نشطاً
      const currentAlert = this.alertsState.activeAlerts.get(alert.id);

      if (currentAlert && !currentAlert.resolved) {
        //console.log(`🚨 [ESCALATION] Escalating unresolved critical alert: ${alert.type}`);

        // إرسال تنبيه تصعيد
        const escalationAlert = {
          ...alert,
          id: this.generateAlertId(),
          type: 'ESCALATED_' + alert.type,
          message: `تصعيد: ${alert.message}`,
          icon: '🚨',
          timestamp: new Date(),
          escalated: true,
          originalAlert: alert.id
        };

        this.sendAlert(escalationAlert);
        this.addToHistory(escalationAlert);
      }
    }, this.alertSettings.escalationTime);
  }

  /**
   * تنسيق رسالة التنبيه
   * @param {Object} alert 
   * @returns {string}
   */
  formatAlertMessage(alert) {
    let message = `${alert.message}`;
    
    if (alert.data.currentValue !== undefined) {
      if (typeof alert.data.currentValue === 'number') {
        if (alert.data.currentValue < 100) {
          message += ` (${alert.data.currentValue.toFixed(2)}%)`;
        } else {
          message += ` (${Math.round(alert.data.currentValue)}ms)`;
        }
      }
    }
    
    if (alert.data.details) {
      message += ` - ${alert.data.details}`;
    }
    
    return message;
  }

  /**
   * البحث عن تنبيه نشط من نفس النوع
   * @param {string} type 
   * @returns {Object|null}
   */
  findActiveAlert(type) {
    for (const [id, alert] of this.alertsState.activeAlerts) {
      if (alert.type === type && !alert.resolved) {
        return alert;
      }
    }
    return null;
  }

  /**
   * حل التنبيهات غير النشطة
   * @param {Array} currentAlerts 
   */
  resolveInactiveAlerts(currentAlerts) {
    const currentTypes = new Set(currentAlerts.map(a => a.type));
    
    for (const [id, alert] of this.alertsState.activeAlerts) {
      if (!currentTypes.has(alert.type) && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        //console.log(`✅ [ALERTS] Alert resolved: ${alert.type}`);
      }
    }
  }

  /**
   * إضافة للتاريخ
   * @param {Object} alert 
   */
  addToHistory(alert) {
    this.alertsState.alertHistory.unshift(alert);
    
    // الحفاظ على الحد الأقصى للتاريخ
    if (this.alertsState.alertHistory.length > this.alertsState.maxHistorySize) {
      this.alertsState.alertHistory = this.alertsState.alertHistory.slice(0, this.alertsState.maxHistorySize);
    }
  }

  /**
   * توليد معرف فريد للتنبيه
   * @returns {string}
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * الحصول على التنبيهات النشطة
   * @returns {Array}
   */
  getActiveAlerts() {
    const activeAlerts = [];

    for (const [id, alert] of this.alertsState.activeAlerts) {
      if (!alert.resolved) {
        activeAlerts.push(alert);
      }
    }

    // ترتيب حسب الخطورة والوقت
    return activeAlerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      const aSeverity = severityOrder[a.severity] || 0;
      const bSeverity = severityOrder[b.severity] || 0;

      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity; // الأكثر خطورة أولاً
      }

      return new Date(b.timestamp) - new Date(a.timestamp); // الأحدث أولاً
    });
  }

  /**
   * الحصول على تاريخ التنبيهات
   * @param {number} limit
   * @returns {Array}
   */
  getAlertHistory(limit = 20) {
    return this.alertsState.alertHistory.slice(0, limit);
  }

  /**
   * الحصول على إحصائيات التنبيهات
   * @returns {Object}
   */
  getAlertStats() {
    const activeAlerts = this.getActiveAlerts();
    const history = this.alertsState.alertHistory;

    // تجميع حسب النوع
    const byType = {};
    const bySeverity = { critical: 0, warning: 0, info: 0 };

    history.forEach(alert => {
      // حسب النوع
      if (!byType[alert.type]) {
        byType[alert.type] = 0;
      }
      byType[alert.type]++;

      // حسب الخطورة
      if (bySeverity[alert.severity] !== undefined) {
        bySeverity[alert.severity]++;
      }
    });

    return {
      active: activeAlerts.length,
      total: history.length,
      byType: byType,
      bySeverity: bySeverity,
      lastCheck: this.alertsState.lastCheck,
      thresholds: this.thresholds
    };
  }

  /**
   * تحديث عتبات التنبيهات
   * @param {Object} newThresholds
   */
  updateThresholds(newThresholds) {
    //console.log('🔧 [ALERTS] Updating thresholds:', newThresholds);

    this.thresholds = {
      ...this.thresholds,
      ...newThresholds
    };

    //console.log('✅ [ALERTS] Thresholds updated successfully');
  }

  /**
   * تحديث إعدادات التنبيهات المتقدمة
   * @param {Object} newSettings
   */
  updateAlertSettings(newSettings) {
    //console.log('🔧 [ALERTS] Updating alert settings:', newSettings);

    this.alertSettings = {
      ...this.alertSettings,
      ...newSettings
    };

    //console.log('✅ [ALERTS] Alert settings updated successfully');
  }

  /**
   * الحصول على إعدادات التنبيهات الحالية
   * @returns {Object}
   */
  getAlertSettings() {
    return {
      thresholds: this.thresholds,
      settings: this.alertSettings,
      state: {
        activeAlerts: this.alertsState.activeAlerts.size,
        suppressedAlerts: this.alertsState.suppressedAlerts.size,
        groupedAlerts: Array.from(this.alertsState.activeAlerts.values()).filter(a => a.grouped).length,
        lastCheck: this.alertsState.lastCheck
      }
    };
  }

  /**
   * حل تنبيه يدوياً
   * @param {string} alertId
   * @returns {boolean}
   */
  resolveAlert(alertId) {
    const alert = this.alertsState.activeAlerts.get(alertId);

    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = 'manual';

      //console.log(`✅ [ALERTS] Alert manually resolved: ${alert.type}`);
      return true;
    }

    return false;
  }

  /**
   * مسح التنبيهات المحلولة القديمة
   * @param {number} maxAge - العمر الأقصى بالميلي ثانية
   */
  cleanupResolvedAlerts(maxAge = 24 * 60 * 60 * 1000) { // 24 ساعة افتراضياً
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [id, alert] of this.alertsState.activeAlerts) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt.getTime() < cutoffTime) {
        this.alertsState.activeAlerts.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      //console.log(`🧹 [ALERTS] Cleaned up ${cleanedCount} old resolved alerts`);
    }

    return cleanedCount;
  }

  /**
   * إعادة تعيين نظام التنبيهات
   */
  reset() {
    //console.log('🔄 [ALERTS] Resetting alerts system...');

    this.alertsState = {
      lastCheck: new Date(),
      activeAlerts: new Map(),
      alertHistory: [],
      maxHistorySize: 50
    };

    //console.log('✅ [ALERTS] Alerts system reset successfully');
  }

  /**
   * الحصول على ملخص سريع للتنبيهات
   * @returns {Object}
   */
  getQuickSummary() {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

    return {
      hasAlerts: activeAlerts.length > 0,
      totalActive: activeAlerts.length,
      critical: criticalAlerts.length,
      warnings: warningAlerts.length,
      lastCheck: this.alertsState.lastCheck,
      mostRecentAlert: activeAlerts[0] || null
    };
  }
}

module.exports = {
  SimpleAlerts
};
