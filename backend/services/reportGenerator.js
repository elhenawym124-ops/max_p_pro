/**
 * مولد التقارير المتقدم
 * Advanced Report Generator
 */
class ReportGenerator {
  constructor(monitor, alerts) {
    this.monitor = monitor;
    this.alerts = alerts;
    
    //console.log('✅ ReportGenerator initialized successfully');
  }

  /**
   * إنشاء تقرير يومي
   * @param {Date} date - التاريخ المطلوب (افتراضياً اليوم)
   * @returns {Object}
   */
  generateDailyReport(date = new Date()) {
    try {
      //console.log(`📊 [REPORTS] Generating daily report for ${date.toDateString()}`);
      
      const stats = this.monitor.getStats();
      const alertStats = this.alerts.getAlertStats();
      const chartData = this.monitor.getChartStats();
      
      const report = {
        type: 'daily',
        date: date.toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        period: {
          start: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
          end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString()
        },
        
        // ملخص الأداء
        performance: {
          totalResponses: stats.summary.totalResponses,
          successRate: stats.summary.successRate,
          errorRate: stats.summary.errorRate,
          averageResponseTime: stats.summary.averageResponseTime,
          slowRate: stats.summary.slowRate,
          emptyRate: stats.summary.emptyRate,
          healthStatus: stats.summary.healthStatus
        },
        
        // إحصائيات مفصلة
        detailed: {
          responses: {
            successful: stats.responses.successful,
            failed: stats.responses.failed,
            empty: stats.responses.empty,
            slow: stats.responses.slow
          },
          performance: {
            minResponseTime: stats.performance.minResponseTime,
            maxResponseTime: stats.performance.maxResponseTime,
            responseTimes: stats.performance.responseTimes.slice(-100) // آخر 100 رد
          },
          errors: {
            total: stats.errors.total,
            byType: stats.errors.byType,
            recent: stats.errors.recent.slice(0, 10) // آخر 10 أخطاء
          }
        },
        
        // تقرير التنبيهات
        alerts: {
          active: alertStats.active,
          total: alertStats.total,
          byType: alertStats.byType,
          bySeverity: alertStats.bySeverity,
          history: this.alerts.getAlertHistory(20)
        },
        
        // البيانات التاريخية
        charts: {
          hourly: chartData.hourly.data.slice(-24), // آخر 24 ساعة
          summary: chartData.summary
        },
        
        // التوصيات
        recommendations: this.generateRecommendations(stats, alertStats),
        
        // الملخص التنفيذي
        executiveSummary: this.generateExecutiveSummary(stats, alertStats)
      };
      
      //console.log(`✅ [REPORTS] Daily report generated successfully`);
      return report;
      
    } catch (error) {
      console.error('❌ [REPORTS] Error generating daily report:', error);
      throw error;
    }
  }

  /**
   * إنشاء تقرير أسبوعي
   * @param {Date} endDate - نهاية الأسبوع (افتراضياً اليوم)
   * @returns {Object}
   */
  generateWeeklyReport(endDate = new Date()) {
    try {
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6); // آخر 7 أيام
      
      //console.log(`📊 [REPORTS] Generating weekly report from ${startDate.toDateString()} to ${endDate.toDateString()}`);
      
      const stats = this.monitor.getStats();
      const alertStats = this.alerts.getAlertStats();
      const chartData = this.monitor.getChartStats();
      
      const report = {
        type: 'weekly',
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          days: 7
        },
        generatedAt: new Date().toISOString(),
        
        // ملخص الأسبوع
        summary: {
          totalResponses: stats.summary.totalResponses,
          averageSuccessRate: stats.summary.successRate,
          averageResponseTime: stats.summary.averageResponseTime,
          totalAlerts: alertStats.total,
          criticalAlerts: alertStats.bySeverity.critical,
          systemHealth: stats.summary.healthStatus
        },
        
        // الاتجاهات
        trends: {
          responseTimetrend: this.calculateTrend(chartData.daily.data, 'averageResponseTime'),
          successRateTrend: this.calculateTrend(chartData.daily.data, 'successRate'),
          errorRateTrend: this.calculateTrend(chartData.daily.data, 'errorRate'),
          alertsTrend: this.calculateAlertsTrend(alertStats)
        },
        
        // أفضل وأسوأ الأيام
        bestDay: this.findBestDay(chartData.daily.data),
        worstDay: this.findWorstDay(chartData.daily.data),
        
        // إحصائيات مفصلة
        detailed: {
          dailyBreakdown: chartData.daily.data.slice(-7),
          alertsBreakdown: alertStats.byType,
          errorAnalysis: this.analyzeErrors(stats.errors)
        },
        
        // التوصيات الأسبوعية
        recommendations: this.generateWeeklyRecommendations(stats, alertStats, chartData),
        
        // الملخص التنفيذي
        executiveSummary: this.generateWeeklyExecutiveSummary(stats, alertStats, chartData)
      };
      
      //console.log(`✅ [REPORTS] Weekly report generated successfully`);
      return report;
      
    } catch (error) {
      console.error('❌ [REPORTS] Error generating weekly report:', error);
      throw error;
    }
  }

  /**
   * إنشاء توصيات بناءً على البيانات
   * @param {Object} stats 
   * @param {Object} alertStats 
   * @returns {Array}
   */
  generateRecommendations(stats, alertStats) {
    const recommendations = [];
    
    // توصيات الأداء
    if (stats.summary.averageResponseTime > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'تحسين وقت الاستجابة',
        description: `متوسط وقت الاستجابة ${Math.round(stats.summary.averageResponseTime)}ms مرتفع جداً`,
        suggestion: 'فحص الخوادم وتحسين قاعدة البيانات وتحسين الكود'
      });
    }
    
    // توصيات الأخطاء
    if (stats.summary.errorRate > 5) {
      recommendations.push({
        type: 'errors',
        priority: 'high',
        title: 'تقليل معدل الأخطاء',
        description: `معدل الأخطاء ${stats.summary.errorRate.toFixed(2)}% مرتفع`,
        suggestion: 'مراجعة الأخطاء الأخيرة وإصلاح المشاكل الأساسية'
      });
    }
    
    // توصيات التنبيهات
    if (alertStats.active > 0) {
      recommendations.push({
        type: 'alerts',
        priority: alertStats.bySeverity.critical > 0 ? 'critical' : 'medium',
        title: 'حل التنبيهات النشطة',
        description: `يوجد ${alertStats.active} تنبيه نشط`,
        suggestion: 'مراجعة وحل التنبيهات النشطة في أسرع وقت ممكن'
      });
    }
    
    // توصيات الردود الفارغة
    if (stats.summary.emptyRate > 3) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        title: 'تحسين جودة الردود',
        description: `معدل الردود الفارغة ${stats.summary.emptyRate.toFixed(2)}% مرتفع`,
        suggestion: 'مراجعة نظام الذكاء الاصطناعي وتحسين قاعدة المعرفة'
      });
    }
    
    return recommendations;
  }

  /**
   * إنشاء ملخص تنفيذي
   * @param {Object} stats 
   * @param {Object} alertStats 
   * @returns {Object}
   */
  generateExecutiveSummary(stats, alertStats) {
    const healthScore = this.calculateHealthScore(stats, alertStats);
    
    return {
      healthScore: healthScore,
      status: healthScore >= 90 ? 'excellent' : healthScore >= 75 ? 'good' : healthScore >= 50 ? 'fair' : 'poor',
      keyMetrics: {
        totalResponses: stats.summary.totalResponses,
        successRate: `${stats.summary.successRate.toFixed(1)}%`,
        averageResponseTime: `${Math.round(stats.summary.averageResponseTime)}ms`,
        activeAlerts: alertStats.active
      },
      mainConcerns: this.identifyMainConcerns(stats, alertStats),
      overallTrend: this.determineOverallTrend(stats, alertStats)
    };
  }

  /**
   * حساب نقاط الصحة العامة للنظام
   * @param {Object} stats 
   * @param {Object} alertStats 
   * @returns {number}
   */
  calculateHealthScore(stats, alertStats) {
    let score = 100;
    
    // خصم نقاط للأخطاء
    score -= stats.summary.errorRate * 2;
    
    // خصم نقاط لوقت الاستجابة البطيء
    if (stats.summary.averageResponseTime > 5000) {
      score -= Math.min(30, (stats.summary.averageResponseTime - 5000) / 1000);
    }
    
    // خصم نقاط للردود الفارغة
    score -= stats.summary.emptyRate * 1.5;
    
    // خصم نقاط للتنبيهات النشطة
    score -= alertStats.active * 5;
    score -= alertStats.bySeverity.critical * 10;
    
    return Math.max(0, Math.round(score));
  }

  /**
   * تحديد المخاوف الرئيسية
   * @param {Object} stats 
   * @param {Object} alertStats 
   * @returns {Array}
   */
  identifyMainConcerns(stats, alertStats) {
    const concerns = [];
    
    if (alertStats.bySeverity.critical > 0) {
      concerns.push('تنبيهات حرجة نشطة');
    }
    
    if (stats.summary.errorRate > 10) {
      concerns.push('معدل أخطاء مرتفع جداً');
    }
    
    if (stats.summary.averageResponseTime > 15000) {
      concerns.push('وقت استجابة بطيء جداً');
    }
    
    if (stats.summary.slowRate > 50) {
      concerns.push('نسبة عالية من الردود البطيئة');
    }
    
    return concerns.length > 0 ? concerns : ['لا توجد مخاوف رئيسية'];
  }

  /**
   * تحديد الاتجاه العام
   * @param {Object} stats 
   * @param {Object} alertStats 
   * @returns {string}
   */
  determineOverallTrend(stats, alertStats) {
    // منطق بسيط لتحديد الاتجاه
    if (alertStats.bySeverity.critical > 0) return 'تدهور';
    if (stats.summary.successRate > 95 && stats.summary.averageResponseTime < 10000) return 'تحسن';
    if (stats.summary.successRate > 90) return 'مستقر';
    return 'يحتاج مراقبة';
  }

  /**
   * حساب الاتجاه للمقياس المحدد
   * @param {Array} data 
   * @param {string} metric 
   * @returns {string}
   */
  calculateTrend(data, metric) {
    if (data.length < 2) return 'غير كافي';
    
    const recent = data.slice(-3).map(d => d[metric]).filter(v => v !== undefined);
    const older = data.slice(-6, -3).map(d => d[metric]).filter(v => v !== undefined);
    
    if (recent.length === 0 || older.length === 0) return 'غير كافي';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (Math.abs(change) < 5) return 'مستقر';
    return change > 0 ? 'متزايد' : 'متناقص';
  }

  /**
   * حساب اتجاه التنبيهات
   * @param {Object} alertStats 
   * @returns {string}
   */
  calculateAlertsTrend(alertStats) {
    // منطق بسيط لاتجاه التنبيهات
    if (alertStats.active === 0) return 'مستقر';
    if (alertStats.bySeverity.critical > 0) return 'متزايد';
    return 'مراقبة مطلوبة';
  }

  /**
   * العثور على أفضل يوم
   * @param {Array} dailyData 
   * @returns {Object}
   */
  findBestDay(dailyData) {
    if (dailyData.length === 0) return null;
    
    return dailyData.reduce((best, current) => {
      const bestScore = (best.successRate || 0) - (best.averageResponseTime || 0) / 1000;
      const currentScore = (current.successRate || 0) - (current.averageResponseTime || 0) / 1000;
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * العثور على أسوأ يوم
   * @param {Array} dailyData 
   * @returns {Object}
   */
  findWorstDay(dailyData) {
    if (dailyData.length === 0) return null;
    
    return dailyData.reduce((worst, current) => {
      const worstScore = (worst.successRate || 100) - (worst.averageResponseTime || 0) / 1000;
      const currentScore = (current.successRate || 100) - (current.averageResponseTime || 0) / 1000;
      return currentScore < worstScore ? current : worst;
    });
  }

  /**
   * تحليل الأخطاء
   * @param {Object} errors 
   * @returns {Object}
   */
  analyzeErrors(errors) {
    return {
      total: errors.total,
      mostCommonType: Object.keys(errors.byType).reduce((a, b) => 
        errors.byType[a] > errors.byType[b] ? a : b, 'none'
      ),
      recentCount: errors.recent.length,
      trend: errors.total > 10 ? 'مرتفع' : errors.total > 5 ? 'متوسط' : 'منخفض'
    };
  }

  /**
   * إنشاء توصيات أسبوعية
   * @param {Object} stats 
   * @param {Object} alertStats 
   * @param {Object} chartData 
   * @returns {Array}
   */
  generateWeeklyRecommendations(stats, alertStats, chartData) {
    const recommendations = this.generateRecommendations(stats, alertStats);
    
    // إضافة توصيات أسبوعية خاصة
    if (chartData.daily.data.length > 3) {
      const avgResponseTimes = chartData.daily.data.map(d => d.averageResponseTime).filter(t => t);
      const trend = this.calculateTrend(chartData.daily.data, 'averageResponseTime');
      
      if (trend === 'متزايد') {
        recommendations.push({
          type: 'trend',
          priority: 'medium',
          title: 'اتجاه تدهور الأداء',
          description: 'وقت الاستجابة يتزايد خلال الأسبوع',
          suggestion: 'مراجعة الأحمال والموارد وتحسين الأداء'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * إنشاء ملخص تنفيذي أسبوعي
   * @param {Object} stats 
   * @param {Object} alertStats 
   * @param {Object} chartData 
   * @returns {Object}
   */
  generateWeeklyExecutiveSummary(stats, alertStats, chartData) {
    const dailySummary = this.generateExecutiveSummary(stats, alertStats);
    
    return {
      ...dailySummary,
      weeklyInsights: {
        totalDataPoints: chartData.summary.totalDataPoints,
        dataQuality: chartData.daily.data.length > 5 ? 'جيد' : 'محدود',
        consistencyScore: this.calculateConsistencyScore(chartData.daily.data)
      }
    };
  }

  /**
   * حساب نقاط الاتساق
   * @param {Array} dailyData 
   * @returns {number}
   */
  calculateConsistencyScore(dailyData) {
    if (dailyData.length < 3) return 0;
    
    const successRates = dailyData.map(d => d.successRate).filter(r => r !== undefined);
    const avg = successRates.reduce((a, b) => a + b, 0) / successRates.length;
    const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) / successRates.length;
    
    return Math.max(0, 100 - Math.sqrt(variance));
  }
}

module.exports = {
  ReportGenerator
};
