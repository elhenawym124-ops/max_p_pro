/**
 * خدمة مراقبة الجودة - تدير التقييم الذكي لردود البوت
 * 🔒 Singleton Pattern - نسخة واحدة فقط في كل التطبيق
 */

const AIQualityEvaluator = require('./aiQualityEvaluator');

// 🔒 Singleton instance
let instance = null;

class QualityMonitorService {
  constructor() {
    // 🔒 إرجاع نفس الـ instance إذا كان موجود
    if (instance) {
      //console.log('♻️ [QUALITY-MONITOR] Returning existing instance');
      return instance;
    }

    this.evaluator = new AIQualityEvaluator();
    this.isEnabled = false; // ❌ معطل لتوفير الكوتة - كان يستهلك 5 استدعاءات AI لكل رسالة!
    this.evaluationQueue = [];
    this.processing = false;
    this.processingIntervalId = null; // 🔧 Store interval ID for cleanup
    
    // 📊 Storage للتقييمات المكتملة
    this.completedEvaluations = [];
    this.maxStoredEvaluations = 1000; // الحد الأقصى للتقييمات المحفوظة
    
    // إعدادات المراقبة
    this.settings = {
      autoEvaluate: true,
      alertThreshold: 50, // تنبيه عند انخفاض الجودة عن 50%
      batchSize: 10, // معالجة 10 تقييمات في المرة الواحدة
      processingInterval: 5000 // معالجة كل 5 ثوانٍ
    };

    // بدء معالجة التقييمات
    this.startProcessing();
    
    // 🔒 حفظ الـ instance
    instance = this;
    
    console.log('✅ [QUALITY-MONITOR] Quality Monitor Service initialized (Singleton)');
  }

  /**
   * تقييم رد البوت تلقائياً
   * @param {Object} responseData - بيانات الرد
   * @returns {Promise<Object>} - نتيجة التقييم
   */
  async evaluateResponse(responseData) {
    try {
      if (!this.isEnabled) {
        //console.log('⚠️ [QUALITY-MONITOR] Quality monitoring is disabled');
        return null;
      }

      //console.log(`🔍 [QUALITY-MONITOR] Queuing evaluation for message: ${responseData.messageId}`);

      // إضافة للقائمة للمعالجة
      this.evaluationQueue.push({
        ...responseData,
        queuedAt: new Date()
      });

      // معالجة فورية إذا كانت القائمة صغيرة
      if (this.evaluationQueue.length <= 3 && !this.processing) {
        this.processQueue();
      }

      return { queued: true, position: this.evaluationQueue.length };

    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] Error queuing evaluation:', error);
      throw error;
    }
  }

  /**
   * معالجة قائمة التقييمات
   */
  async processQueue() {
    if (this.processing || this.evaluationQueue.length === 0) {
      return;
    }

    this.processing = true;
    //console.log(`⚡ [QUALITY-MONITOR] Processing ${this.evaluationQueue.length} evaluations`);

    try {
      // معالجة دفعة من التقييمات
      const batch = this.evaluationQueue.splice(0, this.settings.batchSize);
      
      for (const responseData of batch) {
        try {
          const evaluation = await this.evaluator.evaluateResponse(responseData);

          // التحقق من صحة التقييم قبل الاستخدام
          if (!evaluation) {
            console.warn(`⚠️ [QUALITY-MONITOR] No evaluation result for ${responseData.messageId}`);
            continue;
          }

          if (!evaluation.scores) {
            console.warn(`⚠️ [QUALITY-MONITOR] No scores in evaluation for ${responseData.messageId}`);
            continue;
          }

          if (typeof evaluation.scores.overall !== 'number' || isNaN(evaluation.scores.overall)) {
            console.warn(`⚠️ [QUALITY-MONITOR] Invalid overall score for ${responseData.messageId}: ${evaluation.scores.overall}`);
            continue;
          }

          // 💾 حفظ التقييم المكتمل
          this.storeEvaluation(evaluation);
          
          // فحص إذا كانت الجودة منخفضة
          if (evaluation.scores.overall < this.settings.alertThreshold) {
            this.handleLowQualityAlert(evaluation);
          }

          // إشعار بالتقييم المكتمل
          this.notifyEvaluationComplete(evaluation);

        } catch (error) {
          console.error(`❌ [QUALITY-MONITOR] Error evaluating ${responseData.messageId}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] Error processing queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * بدء معالجة التقييمات بشكل دوري
   */
  startProcessing() {
    this.processingIntervalId = setInterval(() => {
      if (this.evaluationQueue.length > 0) {
        this.processQueue();
      }
    }, this.settings.processingInterval);

    //console.log('🔄 [QUALITY-MONITOR] Started periodic processing');
  }

  /**
   * إيقاف معالجة التقييمات وتنظيف الموارد
   */
  stopProcessing() {
    if (this.processingIntervalId) {
      clearInterval(this.processingIntervalId);
      this.processingIntervalId = null;
      //console.log('🛑 [QUALITY-MONITOR] Stopped periodic processing');
    }
  }

  /**
   * تنظيف الموارد عند إغلاق الخدمة
   */
  cleanup() {
    this.stopProcessing();
    this.evaluationQueue = [];
    this.completedEvaluations = [];
    //console.log('🧹 [QUALITY-MONITOR] Cleanup completed');
  }

  /**
   * التعامل مع تنبيهات الجودة المنخفضة
   * @param {Object} evaluation - التقييم
   */
  handleLowQualityAlert(evaluation) {
    // التحقق من صحة البيانات
    if (!evaluation || !evaluation.scores || typeof evaluation.scores.overall !== 'number') {
      console.warn('⚠️ [QUALITY-ALERT] Invalid evaluation data for alert');
      return;
    }

    //console.log(`🚨 [QUALITY-ALERT] Low quality response detected: ${evaluation.messageId} - Score: ${evaluation.scores.overall}%`);

    // يمكن إضافة إشعارات أخرى هنا
    // مثل إرسال إيميل أو webhook

    const alert = {
      type: 'low_quality',
      messageId: evaluation.messageId,
      score: evaluation.scores.overall,
      issues: evaluation.issues || [],
      timestamp: new Date(),
      severity: evaluation.scores.overall < 30 ? 'critical' : 'warning'
    };

    // حفظ التنبيه (يمكن إضافة قاعدة بيانات لاحقاً)
    this.saveAlert(alert);
  }

  /**
   * إشعار بإكمال التقييم
   * @param {Object} evaluation - التقييم
   */
  notifyEvaluationComplete(evaluation) {
    // التحقق من صحة البيانات
    if (!evaluation || !evaluation.scores || typeof evaluation.scores.overall !== 'number') {
      console.warn('⚠️ [QUALITY-MONITOR] Invalid evaluation data for notification');
      return;
    }

    //console.log(`✅ [QUALITY-MONITOR] Evaluation completed: ${evaluation.messageId} - ${evaluation.qualityLevel || 'Unknown'} (${evaluation.scores.overall}%)`);

    // يمكن إضافة webhook أو إشعارات أخرى هنا
  }

  /**
   * حفظ التقييم المكتمل
   * @param {Object} evaluation - التقييم
   */
  storeEvaluation(evaluation) {
    try {
      // إضافة timestamp إذا لم يكن موجوداً
      if (!evaluation.timestamp) {
        evaluation.timestamp = new Date().toISOString();
      }
      
      // إضافة للقائمة (الأحدث أولاً)
      this.completedEvaluations.unshift(evaluation);
      
      // الحفاظ على الحد الأقصى
      if (this.completedEvaluations.length > this.maxStoredEvaluations) {
        this.completedEvaluations = this.completedEvaluations.slice(0, this.maxStoredEvaluations);
      }
      
      //console.log(`💾 [QUALITY-MONITOR] Evaluation stored: ${evaluation.messageId} - ${evaluation.qualityLevel} (${evaluation.scores.overall}%)`);
      //console.log(`📊 [QUALITY-MONITOR] Total stored evaluations: ${this.completedEvaluations.length}`);
      
    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] Error storing evaluation:', error);
    }
  }
  
  /**
   * حفظ التنبيه
   * @param {Object} alert - التنبيه
   */
  saveAlert(alert) {
    // TODO: حفظ في قاعدة البيانات
    //console.log('💾 [QUALITY-MONITOR] Alert saved:', alert);
  }

  /**
   * الحصول على إحصائيات الجودة
   * @returns {Object} - إحصائيات شاملة
   */
  getQualityStatistics() {
    try {
      // 📊 حساب الإحصائيات من التقييمات المخزنة
      const stats = this.calculateStatisticsFromStored();
      
      // إضافة معلومات إضافية
      stats.monitoring = {
        isEnabled: this.isEnabled,
        queueLength: this.evaluationQueue.length,
        processing: this.processing,
        storedEvaluations: this.completedEvaluations.length,
        settings: this.settings
      };

      return stats;

    } catch (error) {
      console.error('❌ [QUALITY-MONITOR] Error getting statistics:', error);
      throw error;
    }
  }
  
  /**
   * حساب الإحصائيات من التقييمات المخزنة
   * @returns {Object} - الإحصائيات
   */
  calculateStatisticsFromStored() {
    const evaluations = this.completedEvaluations;
    
    if (evaluations.length === 0) {
      return {
        overall: {
          totalEvaluations: 0,
          averageScore: 0,
          qualityDistribution: {
            excellent: 0,
            good: 0,
            acceptable: 0,
            poor: 0,
            very_poor: 0
          },
          topIssues: []
        },
        relevance: { average: 0, trend: 'stable' },
        accuracy: { average: 0, trend: 'stable' },
        clarity: { average: 0, trend: 'stable' },
        completeness: { average: 0, trend: 'stable' },
        ragUsage: { average: 0, trend: 'stable' }
      };
    }
    
    // حساب المتوسطات
    const calculateAverage = (metric) => {
      const values = evaluations
        .filter(e => e.scores && typeof e.scores[metric] === 'number')
        .map(e => e.scores[metric]);
      return values.length > 0 
        ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
        : 0;
    };
    
    // توزيع الجودة
    const distribution = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0,
      very_poor: 0
    };
    
    evaluations.forEach(e => {
      if (e.qualityLevel && distribution[e.qualityLevel] !== undefined) {
        distribution[e.qualityLevel]++;
      }
    });
    
    // أهم المشاكل
    const allIssues = evaluations
      .filter(e => e.issues && e.issues.length > 0)
      .flatMap(e => e.issues);
    
    const issueCount = {};
    allIssues.forEach(issue => {
      issueCount[issue] = (issueCount[issue] || 0) + 1;
    });
    
    const topIssues = Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));
    
    return {
      overall: {
        totalEvaluations: evaluations.length,
        averageScore: calculateAverage('overall'),
        qualityDistribution: distribution,
        topIssues
      },
      relevance: { average: calculateAverage('relevance'), trend: 'stable' },
      accuracy: { average: calculateAverage('accuracy'), trend: 'stable' },
      clarity: { average: calculateAverage('clarity'), trend: 'stable' },
      completeness: { average: calculateAverage('completeness'), trend: 'stable' },
      ragUsage: { average: calculateAverage('ragUsage'), trend: 'stable' }
    };
  }

  /**
   * الحصول على تقييم رسالة محددة
   * @param {string} messageId - معرف الرسالة
   * @returns {Object|null} - التقييم
   */
  getEvaluation(messageId) {
    return this.evaluator.getEvaluation(messageId);
  }

  /**
   * الحصول على آخر التقييمات
   * @param {number} limit - عدد التقييمات
   * @returns {Array} - قائمة التقييمات
   */
  getRecentEvaluations(limit = 10) {
    return this.completedEvaluations.slice(0, limit);
  }

  /**
   * الحصول على التقييمات حسب مستوى الجودة
   * @param {string} qualityLevel - مستوى الجودة
   * @param {number} limit - عدد النتائج
   * @returns {Array} - قائمة التقييمات
   */
  getEvaluationsByQuality(qualityLevel, limit = 20) {
    return this.completedEvaluations
      .filter(evaluation => evaluation.qualityLevel === qualityLevel)
      .slice(0, limit);
  }

  /**
   * الحصول على التقييمات ذات المشاكل
   * @param {number} limit - عدد النتائج
   * @returns {Array} - قائمة التقييمات المشكوك فيها
   */
  getProblematicEvaluations(limit = 20) {
    return this.completedEvaluations
      .filter(evaluation => {
        // التحقق من صحة البيانات
        if (!evaluation || !evaluation.scores || typeof evaluation.scores.overall !== 'number') {
          return false;
        }
        return (evaluation.issues && evaluation.issues.length > 0) || evaluation.scores.overall < 60;
      })
      .sort((a, b) => (a.scores?.overall || 0) - (b.scores?.overall || 0)) // الأسوأ أولاً
      .slice(0, limit);
  }

  /**
   * تحليل الاتجاهات
   * @param {number} days - عدد الأيام للتحليل
   * @returns {Object} - تحليل الاتجاهات
   */
  analyzeTrends(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentEvaluations = this.completedEvaluations
      .filter(evaluation => new Date(evaluation.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (recentEvaluations.length === 0) {
      return {
        period: `${days} days`,
        totalEvaluations: 0,
        trends: {},
        insights: ['لا توجد بيانات كافية للتحليل']
      };
    }

    // تحليل الاتجاهات لكل معيار
    const trends = {};
    const metrics = ['relevance', 'accuracy', 'clarity', 'completeness', 'ragUsage', 'overall'];

    metrics.forEach(metric => {
      const values = recentEvaluations
        .filter(evaluation => evaluation && evaluation.scores && typeof evaluation.scores[metric] === 'number')
        .map(evaluation => evaluation.scores[metric]);
      trends[metric] = this.calculateDetailedTrend(values);
    });

    // رؤى ذكية
    const insights = this.generateTrendInsights(trends, recentEvaluations);

    return {
      period: `${days} days`,
      totalEvaluations: recentEvaluations.length,
      trends,
      insights,
      qualityDistribution: this.calculateQualityDistribution(recentEvaluations),
      averageScore: recentEvaluations.length > 0 ? Math.round(
        recentEvaluations
          .filter(evaluation => evaluation && evaluation.scores && typeof evaluation.scores.overall === 'number')
          .reduce((sum, evaluation) => sum + evaluation.scores.overall, 0) /
        Math.max(recentEvaluations.filter(evaluation => evaluation && evaluation.scores && typeof evaluation.scores.overall === 'number').length, 1)
      ) : 0
    };
  }

  /**
   * حساب اتجاه مفصل
   * @param {Array} values - القيم
   * @returns {Object} - تحليل الاتجاه
   */
  calculateDetailedTrend(values) {
    if (values.length < 2) {
      return { direction: 'stable', change: 0, confidence: 'low' };
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const changePercent = Math.abs(change / firstAvg) * 100;

    let direction = 'stable';
    let confidence = 'low';

    if (Math.abs(change) > 2) {
      direction = change > 0 ? 'improving' : 'declining';
      confidence = changePercent > 10 ? 'high' : changePercent > 5 ? 'medium' : 'low';
    }

    return {
      direction,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      confidence,
      firstPeriodAvg: Math.round(firstAvg * 100) / 100,
      secondPeriodAvg: Math.round(secondAvg * 100) / 100
    };
  }

  /**
   * توليد رؤى ذكية للاتجاهات
   * @param {Object} trends - الاتجاهات
   * @param {Array} evaluations - التقييمات
   * @returns {Array} - قائمة الرؤى
   */
  generateTrendInsights(trends, evaluations) {
    const insights = [];

    // تحليل الاتجاه العام
    if (trends.overall.direction === 'improving' && trends.overall.confidence !== 'low') {
      insights.push(`📈 الجودة العامة تتحسن بنسبة ${trends.overall.changePercent}%`);
    } else if (trends.overall.direction === 'declining' && trends.overall.confidence !== 'low') {
      insights.push(`📉 الجودة العامة تتراجع بنسبة ${trends.overall.changePercent}%`);
    }

    // تحليل المعايير الفردية
    const improvingMetrics = Object.entries(trends)
      .filter(([metric, trend]) => trend.direction === 'improving' && trend.confidence !== 'low')
      .map(([metric]) => metric);

    const decliningMetrics = Object.entries(trends)
      .filter(([metric, trend]) => trend.direction === 'declining' && trend.confidence !== 'low')
      .map(([metric]) => metric);

    if (improvingMetrics.length > 0) {
      const metricNames = this.translateMetricNames(improvingMetrics);
      insights.push(`✅ تحسن ملحوظ في: ${metricNames.join('، ')}`);
    }

    if (decliningMetrics.length > 0) {
      const metricNames = this.translateMetricNames(decliningMetrics);
      insights.push(`⚠️ تراجع في: ${metricNames.join('، ')}`);
    }

    // تحليل استخدام RAG
    if (trends.ragUsage.direction === 'declining') {
      insights.push('🔍 انخفاض في استخدام قاعدة المعرفة - قد يؤثر على دقة الردود');
    }

    // تحليل الوضوح
    if (trends.clarity.direction === 'declining') {
      insights.push('📝 تراجع في وضوح الردود - يحتاج مراجعة الصياغة');
    }

    return insights.length > 0 ? insights : ['📊 الأداء مستقر بشكل عام'];
  }

  /**
   * ترجمة أسماء المعايير
   * @param {Array} metrics - المعايير
   * @returns {Array} - الأسماء المترجمة
   */
  translateMetricNames(metrics) {
    const translations = {
      relevance: 'ملاءمة الردود',
      accuracy: 'دقة المعلومات',
      clarity: 'وضوح الردود',
      completeness: 'اكتمال الإجابات',
      ragUsage: 'استخدام قاعدة المعرفة',
      overall: 'الجودة العامة'
    };

    return metrics.map(metric => translations[metric] || metric);
  }

  /**
   * حساب توزيع الجودة
   * @param {Array} evaluations - التقييمات
   * @returns {Object} - توزيع الجودة
   */
  calculateQualityDistribution(evaluations) {
    const distribution = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0,
      very_poor: 0
    };

    evaluations.forEach(evaluation => {
      distribution[evaluation.qualityLevel]++;
    });

    // تحويل إلى نسب مئوية
    const total = evaluations.length;
    Object.keys(distribution).forEach(level => {
      distribution[level] = Math.round((distribution[level] / total) * 100);
    });

    return distribution;
  }

  /**
   * تفعيل/إيقاف المراقبة
   * @param {boolean} enabled - حالة التفعيل
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    //console.log(`🔧 [QUALITY-MONITOR] Quality monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * تحديث إعدادات المراقبة
   * @param {Object} newSettings - الإعدادات الجديدة
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    //console.log('⚙️ [QUALITY-MONITOR] Settings updated:', this.settings);
  }

  /**
   * الحصول على حالة النظام
   * @returns {Object} - حالة النظام
   */
  getSystemStatus() {
    return {
      isEnabled: this.isEnabled,
      queueLength: this.evaluationQueue.length,
      processing: this.processing,
      totalEvaluations: this.completedEvaluations.length,
      maxStoredEvaluations: this.maxStoredEvaluations,
      settings: this.settings,
      uptime: process.uptime()
    };
  }
}

module.exports = QualityMonitorService;
