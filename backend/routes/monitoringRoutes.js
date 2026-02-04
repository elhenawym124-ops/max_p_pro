const express = require('express');
const { simpleMonitor, simpleAlerts, reportGenerator, qualityMonitor } = require('../services/simpleMonitor');

// تعطيل التسجيل المفرط مؤقتاً لتقليل الضوضاء
// const originalConsoleLog = //console.log;
const silentLog = () => {};

const router = express.Router();

// Authentication is handled by global security middleware
// No additional auth middleware needed

// إعداد الترميز للتعامل مع النصوص العربية
router.use((req, res, next) => {
  //console.log('🔍 [MONITOR-ROUTER] Request received:', req.method, req.path);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

/**
 * GET /api/v1/monitor/stats
 * الحصول على الإحصائيات الكاملة
 */
router.get('/stats', (req, res) => {
  try {
    console.log('📊 [MONITOR] Stats endpoint called');
    console.log('📊 [MONITOR] simpleMonitor exists:', !!simpleMonitor);
    console.log('📊 [MONITOR] simpleMonitor.getStats exists:', !!simpleMonitor?.getStats);

    const stats = simpleMonitor.getStats();
    console.log('📊 [MONITOR] Stats retrieved successfully');

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

    console.log('📊 [MONITOR] Response sent successfully');

  } catch (error) {
    console.error('❌ [MONITOR] Error getting stats:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring stats',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/health
 * فحص سريع لحالة النظام
 */
router.get('/health', (req, res) => {
  try {
    //console.log('🏥 [MONITOR] Health check requested');
    
    const status = simpleMonitor.getQuickStatus();
    
    // تحديد HTTP status code حسب الحالة
    let httpStatus = 200;
    if (status.status === 'warning') {
      httpStatus = 200; // لا نريد إنذار كاذب
    } else if (status.status === 'critical') {
      httpStatus = 503; // Service Unavailable
    }
    
    res.status(httpStatus).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
    
    //console.log(`🏥 [MONITOR] Health check sent - Status: ${status.status}`);
    
  } catch (error) {
    console.error('❌ [MONITOR] Error getting health:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/errors
 * الحصول على قائمة الأخطاء الأخيرة
 */
router.get('/errors', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type; // فلترة حسب النوع
    
    //console.log(`🚨 [MONITOR] Errors requested - Limit: ${limit}, Type: ${type || 'all'}`);
    
    const stats = simpleMonitor.getStats();
    let errors = stats.errors.recent;
    
    // فلترة حسب النوع إذا تم تحديده
    if (type) {
      errors = errors.filter(error => error.type === type);
    }
    
    // تحديد العدد المطلوب
    errors = errors.slice(0, limit);
    
    res.json({
      success: true,
      data: {
        errors: errors,
        total: stats.errors.total,
        byType: stats.errors.byType,
        filtered: type ? true : false,
        filterType: type || null
      },
      timestamp: new Date().toISOString()
    });
    
    //console.log(`🚨 [MONITOR] ${errors.length} errors sent`);
    
  } catch (error) {
    console.error('❌ [MONITOR] Error getting errors:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get errors',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/monitor/reset
 * إعادة تعيين الإحصائيات
 */
router.post('/reset', (req, res) => {
  try {
    //console.log('🔄 [MONITOR] Reset requested');
    
    const oldStats = simpleMonitor.getQuickStatus();
    simpleMonitor.reset();
    const newStats = simpleMonitor.getQuickStatus();
    
    res.json({
      success: true,
      message: 'Monitoring stats reset successfully',
      data: {
        before: oldStats,
        after: newStats
      },
      timestamp: new Date().toISOString()
    });
    
    //console.log('✅ [MONITOR] Stats reset completed');
    
  } catch (error) {
    console.error('❌ [MONITOR] Error resetting stats:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset stats',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/performance
 * الحصول على بيانات الأداء للرسوم البيانية
 */
router.get('/performance', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    //console.log(`📈 [MONITOR] Performance data requested - Limit: ${limit}`);
    
    const stats = simpleMonitor.getStats();
    const responseTimes = stats.performance.responseTimes.slice(0, limit);
    
    // تحضير البيانات للرسوم البيانية
    const chartData = responseTimes.map((time, index) => ({
      index: responseTimes.length - index,
      responseTime: time,
      timestamp: new Date(Date.now() - (index * 30000)).toISOString() // كل 30 ثانية
    })).reverse();
    
    res.json({
      success: true,
      data: {
        chartData: chartData,
        summary: {
          average: stats.performance.averageResponseTime,
          max: stats.performance.maxResponseTime,
          min: stats.performance.minResponseTime === Infinity ? 0 : stats.performance.minResponseTime,
          total: responseTimes.length
        }
      },
      timestamp: new Date().toISOString()
    });
    
    //console.log(`📈 [MONITOR] Performance data sent - ${chartData.length} points`);
    
  } catch (error) {
    console.error('❌ [MONITOR] Error getting performance data:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get performance data',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/alerts
 * الحصول على التنبيهات النشطة
 */
router.get('/alerts', (req, res) => {
  try {
    const activeAlerts = simpleAlerts.getActiveAlerts();
    const alertStats = simpleAlerts.getAlertStats();

    res.json({
      success: true,
      data: {
        alerts: activeAlerts,
        stats: alertStats,
        summary: simpleAlerts.getQuickSummary()
      },
      timestamp: new Date().toISOString()
    });

    // لا تسجيل - تقليل الضوضاء

  } catch (error) {
    console.error('❌ [MONITOR] Error getting alerts:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/alerts/history
 * الحصول على تاريخ التنبيهات
 */
router.get('/alerts/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    //console.log(`📜 [MONITOR] Alert history requested - Limit: ${limit}`);

    const history = simpleAlerts.getAlertHistory(limit);
    const stats = simpleAlerts.getAlertStats();

    res.json({
      success: true,
      data: {
        history: history,
        stats: stats,
        total: stats.total
      },
      timestamp: new Date().toISOString()
    });

    //console.log(`📜 [MONITOR] ${history.length} alert history records sent`);

  } catch (error) {
    console.error('❌ [MONITOR] Error getting alert history:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get alert history',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/monitor/alerts/check
 * فحص فوري للنظام وإرسال التنبيهات
 */
router.post('/alerts/check', (req, res) => {
  try {
    //console.log('🔍 [MONITOR] Manual alert check requested');

    const result = simpleAlerts.checkAndAlert();

    if (result) {
      res.json({
        success: true,
        data: result,
        message: 'Alert check completed successfully',
        timestamp: new Date().toISOString()
      });

      //console.log(`✅ [MONITOR] Manual check completed - ${result.alertsFound} alerts found`);
    } else {
      res.status(500).json({
        success: false,
        error: 'Alert check failed',
        message: 'An error occurred during the alert check'
      });
    }

  } catch (error) {
    console.error('❌ [MONITOR] Error during manual alert check:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to perform alert check',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/monitor/alerts/:alertId/resolve
 * حل تنبيه يدوياً
 */
router.post('/alerts/:alertId/resolve', (req, res) => {
  try {
    const { alertId } = req.params;

    //console.log(`✅ [MONITOR] Manual alert resolution requested: ${alertId}`);

    const resolved = simpleAlerts.resolveAlert(alertId);

    if (resolved) {
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        data: { alertId, resolvedAt: new Date().toISOString() },
        timestamp: new Date().toISOString()
      });

      //console.log(`✅ [MONITOR] Alert resolved: ${alertId}`);
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found or already resolved',
        message: `Alert ${alertId} could not be resolved`
      });
    }

  } catch (error) {
    console.error('❌ [MONITOR] Error resolving alert:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      message: error.message
    });
  }
});

/**
 * PUT /api/v1/monitor/alerts/thresholds
 * تحديث عتبات التنبيهات
 */
router.put('/alerts/thresholds', (req, res) => {
  try {
    const newThresholds = req.body;

    //console.log('🔧 [MONITOR] Alert thresholds update requested:', newThresholds);

    simpleAlerts.updateThresholds(newThresholds);

    res.json({
      success: true,
      message: 'Alert thresholds updated successfully',
      data: {
        thresholds: simpleAlerts.thresholds,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    //console.log('✅ [MONITOR] Alert thresholds updated successfully');

  } catch (error) {
    console.error('❌ [MONITOR] Error updating alert thresholds:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to update alert thresholds',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/monitor/test-response
 * اختبار تسجيل رد (للاختبار فقط)
 */
router.post('/test-response', (req, res) => {
  try {
    const { responseTime = 5000, isEmpty = false, isSuccessful = true } = req.body;

    //console.log(`🧪 [MONITOR] Test response logging: ${responseTime}ms, Empty: ${isEmpty}, Success: ${isSuccessful}`);

    // تسجيل الرد
    simpleMonitor.logResponse(responseTime, isEmpty, isSuccessful);

    res.json({
      success: true,
      message: 'Test response logged successfully',
      data: {
        responseTime,
        isEmpty,
        isSuccessful,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    //console.log(`✅ [MONITOR] Test response logged successfully`);

  } catch (error) {
    console.error('❌ [MONITOR] Error logging test response:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to log test response',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/charts
 * الحصول على بيانات الرسوم البيانية
 */
router.get('/charts', (req, res) => {
  try {
    const period = req.query.period || 'hourly';
    const limit = parseInt(req.query.limit) || null;

    // //console.log(`📊 [MONITOR] Chart data requested - Period: ${period}, Limit: ${limit}`);

    const chartStats = simpleMonitor.getChartStats();
    const historicalData = simpleMonitor.getHistoricalData(period, limit);

    res.json({
      success: true,
      data: {
        period: period,
        limit: limit,
        points: historicalData,
        stats: chartStats,
        meta: {
          totalPoints: historicalData.length,
          oldestPoint: historicalData[0]?.timestamp || null,
          newestPoint: historicalData[historicalData.length - 1]?.timestamp || null,
          dataRange: historicalData.length > 0 ?
            `${historicalData.length} points over ${chartStats[period]?.coverage || 'unknown time'}` :
            'No data available'
        }
      },
      timestamp: new Date().toISOString()
    });

    // //console.log(`📊 [MONITOR] Chart data sent - ${historicalData.length} points`);

  } catch (error) {
    console.error('❌ [MONITOR] Error getting chart data:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get chart data',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/charts/summary
 * الحصول على ملخص بيانات الرسوم البيانية
 */
router.get('/charts/summary', (req, res) => {
  try {
    //console.log('📊 [MONITOR] Chart summary requested');

    const chartStats = simpleMonitor.getChartStats();

    res.json({
      success: true,
      data: chartStats,
      timestamp: new Date().toISOString()
    });

    //console.log('📊 [MONITOR] Chart summary sent');

  } catch (error) {
    console.error('❌ [MONITOR] Error getting chart summary:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get chart summary',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/monitor/charts/save
 * حفظ البيانات التاريخية فوراً (للاختبار)
 */
router.post('/charts/save', (req, res) => {
  try {
    //console.log('📊 [MONITOR] Manual chart data save requested');

    simpleMonitor.saveHistoricalData();
    const chartStats = simpleMonitor.getChartStats();

    res.json({
      success: true,
      message: 'Historical data saved successfully',
      data: chartStats,
      timestamp: new Date().toISOString()
    });

    //console.log('📊 [MONITOR] Manual chart data save completed');

  } catch (error) {
    console.error('❌ [MONITOR] Error saving chart data:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to save chart data',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/alerts/settings
 * الحصول على إعدادات التنبيهات المتقدمة
 */
router.get('/alerts/settings', (req, res) => {
  try {
    //console.log('⚙️ [MONITOR] Alert settings requested');

    const settings = simpleAlerts.getAlertSettings();

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString()
    });

    //console.log('⚙️ [MONITOR] Alert settings sent');

  } catch (error) {
    console.error('❌ [MONITOR] Error getting alert settings:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get alert settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/v1/monitor/alerts/settings
 * تحديث إعدادات التنبيهات المتقدمة
 */
router.put('/alerts/settings', (req, res) => {
  try {
    const newSettings = req.body;

    //console.log('⚙️ [MONITOR] Alert settings update requested:', newSettings);

    simpleAlerts.updateAlertSettings(newSettings);

    res.json({
      success: true,
      message: 'Alert settings updated successfully',
      data: {
        settings: simpleAlerts.getAlertSettings(),
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    //console.log('✅ [MONITOR] Alert settings updated successfully');

  } catch (error) {
    console.error('❌ [MONITOR] Error updating alert settings:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to update alert settings',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/monitor/alerts/test-email
 * اختبار إرسال تنبيه عبر البريد الإلكتروني
 */
router.post('/alerts/test-email', (req, res) => {
  try {
    //console.log('📧 [MONITOR] Test email alert requested');

    // إنشاء تنبيه تجريبي
    const testAlert = {
      id: 'test_email_' + Date.now(),
      type: 'TEST_EMAIL',
      severity: 'warning',
      message: 'اختبار تنبيه البريد الإلكتروني',
      icon: '📧',
      color: 'blue',
      timestamp: new Date(),
      data: {
        currentValue: 'test',
        threshold: 'test',
        details: 'هذا تنبيه تجريبي لاختبار نظام البريد الإلكتروني'
      },
      resolved: false
    };

    // إرسال التنبيه
    simpleAlerts.sendEmailAlert(testAlert, simpleAlerts.formatAlertMessage(testAlert));

    res.json({
      success: true,
      message: 'Test email alert sent successfully',
      data: {
        alert: testAlert,
        sentAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    //console.log('✅ [MONITOR] Test email alert sent');

  } catch (error) {
    console.error('❌ [MONITOR] Error sending test email alert:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to send test email alert',
      message: error.message
    });
  }
});

/**
 * DELETE /api/v1/monitor/alerts/suppressed
 * مسح التنبيهات المكبوتة
 */
router.delete('/alerts/suppressed', (req, res) => {
  try {
    //console.log('🔇 [MONITOR] Clear suppressed alerts requested');

    const suppressedCount = simpleAlerts.alertsState.suppressedAlerts.size;
    simpleAlerts.alertsState.suppressedAlerts.clear();

    res.json({
      success: true,
      message: 'Suppressed alerts cleared successfully',
      data: {
        clearedCount: suppressedCount,
        clearedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    //console.log(`✅ [MONITOR] ${suppressedCount} suppressed alerts cleared`);

  } catch (error) {
    console.error('❌ [MONITOR] Error clearing suppressed alerts:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to clear suppressed alerts',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/reports/daily
 * إنشاء تقرير يومي
 */
router.get('/reports/daily', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();

    //console.log(`📊 [REPORTS] Daily report requested for ${date.toDateString()}`);

    const report = reportGenerator.generateDailyReport(date);

    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });

    //console.log(`✅ [REPORTS] Daily report generated successfully`);

  } catch (error) {
    console.error('❌ [REPORTS] Error generating daily report:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to generate daily report',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/reports/weekly
 * إنشاء تقرير أسبوعي
 */
router.get('/reports/weekly', (req, res) => {
  try {
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    //console.log(`📊 [REPORTS] Weekly report requested ending ${endDate.toDateString()}`);

    const report = reportGenerator.generateWeeklyReport(endDate);

    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });

    //console.log(`✅ [REPORTS] Weekly report generated successfully`);

  } catch (error) {
    console.error('❌ [REPORTS] Error generating weekly report:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly report',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/reports/summary
 * الحصول على ملخص سريع للتقارير
 */
router.get('/reports/summary', (req, res) => {
  try {
    //console.log('📊 [REPORTS] Report summary requested');

    const dailyReport = reportGenerator.generateDailyReport();
    const summary = {
      healthScore: dailyReport.executiveSummary.healthScore,
      status: dailyReport.executiveSummary.status,
      keyMetrics: dailyReport.executiveSummary.keyMetrics,
      mainConcerns: dailyReport.executiveSummary.mainConcerns,
      recommendationsCount: dailyReport.recommendations.length,
      lastGenerated: dailyReport.generatedAt
    };

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

    //console.log(`✅ [REPORTS] Report summary sent`);

  } catch (error) {
    console.error('❌ [REPORTS] Error generating report summary:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to generate report summary',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/monitor/reports/export
 * تصدير التقرير (محاكاة)
 */
router.post('/reports/export', (req, res) => {
  try {
    const { type = 'daily', format = 'json', date } = req.body;

    //console.log(`📊 [REPORTS] Export requested - Type: ${type}, Format: ${format}`);

    let report;
    if (type === 'weekly') {
      report = reportGenerator.generateWeeklyReport(date ? new Date(date) : new Date());
    } else {
      report = reportGenerator.generateDailyReport(date ? new Date(date) : new Date());
    }

    // محاكاة التصدير
    const exportData = {
      filename: `${type}_report_${new Date().toISOString().split('T')[0]}.${format}`,
      size: JSON.stringify(report).length,
      format: format,
      generatedAt: new Date().toISOString(),
      downloadUrl: `/api/v1/monitor/reports/download/${type}_report_${Date.now()}.${format}` // رابط وهمي
    };

    // في التطبيق الحقيقي، يمكن إنشاء ملفات PDF أو Excel
    //console.log(`📄 [EXPORT] Report exported: ${exportData.filename} (${exportData.size} bytes)`);

    res.json({
      success: true,
      data: {
        export: exportData,
        report: format === 'json' ? report : null // إرسال البيانات فقط للـ JSON
      },
      message: `Report exported successfully as ${format.toUpperCase()}`,
      timestamp: new Date().toISOString()
    });

    //console.log(`✅ [REPORTS] Report exported successfully`);

  } catch (error) {
    console.error('❌ [REPORTS] Error exporting report:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to export report',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/monitor/quality/rating
 * تسجيل تقييم جديد من العميل
 */
router.post('/quality/rating', (req, res) => {
  try {
    const { messageId, conversationId, customerId, rating, comment } = req.body;

    // التحقق من البيانات المطلوبة
    if (!messageId || !conversationId || !customerId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: messageId, conversationId, customerId, rating'
      });
    }

    // إصلاح ترميز التعليق إذا كان موجوداً
    let cleanComment = comment || '';
    if (cleanComment && typeof cleanComment === 'string') {
      try {
        // تنظيف التعليق وضمان الترميز الصحيح
        cleanComment = cleanComment.trim();

        // إذا كان التعليق يحتوي على أحرف عربية، نتأكد من ترميزه
        if (/[\u0600-\u06FF]/.test(cleanComment)) {
          // النص يحتوي على أحرف عربية، نحتفظ به كما هو
          //console.log(`📝 [QUALITY] Arabic comment detected: ${cleanComment.substring(0, 50)}...`);
        }
      } catch (encodingError) {
        console.warn('⚠️ [QUALITY] Comment encoding issue:', encodingError);
        cleanComment = comment; // استخدام النص الأصلي
      }
    }

    //console.log(`📊 [QUALITY] Rating submission: ${rating} for message ${messageId}`);

    const result = qualityMonitor.logRating(messageId, conversationId, customerId, rating, cleanComment);

    res.json({
      success: true,
      data: result,
      message: 'Rating logged successfully',
      timestamp: new Date().toISOString()
    });

    //console.log(`✅ [QUALITY] Rating logged: ${result.ratingId}`);

  } catch (error) {
    console.error('❌ [QUALITY] Error logging rating:', error);

    res.status(400).json({
      success: false,
      error: 'Failed to log rating',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/monitor/quality/stats
 * الحصول على إحصائيات الجودة
 */
router.get('/quality/stats', (req, res) => {
  try {
    const stats = qualityMonitor.getQualityStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

    // لا تسجيل - تقليل الضوضاء

  } catch (error) {
    console.error('❌ [QUALITY] Error getting quality stats:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get quality stats',
      message: error.message
    });
  }
});

// ❌ REMOVED: /quality/performance and /quality/insights endpoints - Advanced Quality Dashboard removed

/**
 * POST /api/v1/monitor/quality/response
 * تسجيل رد جديد مع مقاييس الأداء
 */
router.post('/quality/response', (req, res) => {
  try {
    const { messageId, conversationId, metrics } = req.body;

    if (!messageId || !conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'messageId and conversationId are required'
      });
    }

    // تسجيل الرد مع مقاييس الأداء
    const result = qualityMonitor.logResponse(messageId, conversationId, metrics || {});

    res.json({
      success: true,
      message: 'Response logged successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

    //console.log(`✅ [QUALITY] Response logged: ${messageId} with metrics:`, metrics || 'none');

  } catch (error) {
    console.error('❌ [QUALITY] Error logging response:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to log response',
      message: error.message
    });
  }
});

module.exports = router;
