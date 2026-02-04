/**
 * نظام مراقبة جودة الردود
 * Quality Monitoring System for Response Quality
 */
class QualityMonitor {
  constructor() {
    // إحصائيات التقييم
    this.qualityStats = {
      ratings: {
        total: 0,
        positive: 0,    // 👍
        negative: 0,    // 👎
        satisfaction: 0 // نسبة الرضا
      },
      responses: {
        rated: 0,       // عدد الردود المقيمة
        unrated: 0,     // عدد الردود غير المقيمة
        totalResponses: 0
      },
      trends: {
        lastHour: { positive: 0, negative: 0 },
        lastDay: { positive: 0, negative: 0 },
        lastWeek: { positive: 0, negative: 0 }
      }
    };

    // قاعدة بيانات بسيطة للتقييمات
    this.ratingsDatabase = [];
    this.maxRatingsHistory = 1000; // الحد الأقصى للتقييمات المحفوظة

    // مؤشرات الجودة المتقدمة
    this.responseMetrics = new Map(); // معرف الرسالة -> مقاييس الأداء
    this.dailyStats = new Map(); // التاريخ -> إحصائيات يومية
    this.conversationMetrics = new Map(); // معرف المحادثة -> مقاييس المحادثة

    // إعدادات النظام
    this.settings = {
      enableRating: true,
      minRatingsForAnalysis: 5,
      satisfactionThreshold: 80, // 80% حد الرضا المقبول
      negativeRateThreshold: 20, // 20% حد التقييمات السلبية
      slowResponseThreshold: 5000, // 5 ثوانٍ - حد الاستجابة البطيئة
      excellentSatisfactionThreshold: 90, // 90% رضا ممتاز
      goodSatisfactionThreshold: 70, // 70% رضا جيد
      poorSatisfactionThreshold: 50 // 50% رضا ضعيف
    };

    //console.log('✅ QualityMonitor initialized successfully');
  }

  /**
   * تسجيل تقييم جديد من العميل
   * @param {string} messageId - معرف الرسالة
   * @param {string} conversationId - معرف المحادثة
   * @param {string} customerId - معرف العميل
   * @param {string} rating - التقييم ('positive' أو 'negative')
   * @param {string} comment - تعليق اختياري
   */
  logRating(messageId, conversationId, customerId, rating, comment = '') {
    try {
      // التحقق من صحة البيانات
      if (!messageId || !conversationId || !customerId || !rating) {
        throw new Error('Missing required rating data');
      }

      if (!['positive', 'negative'].includes(rating)) {
        throw new Error('Invalid rating value. Must be "positive" or "negative"');
      }

      // تنظيف وإصلاح الترميز للتعليق
      const cleanComment = this.sanitizeComment(comment);

      // إنشاء سجل التقييم
      const ratingRecord = {
        id: this.generateRatingId(),
        messageId,
        conversationId,
        customerId,
        rating,
        comment: cleanComment,
        timestamp: new Date(),
        processed: false
      };

      // إضافة للقاعدة
      this.ratingsDatabase.push(ratingRecord);

      // تحديث الإحصائيات
      this.updateQualityStats(rating);

      // تحديث الإحصائيات اليومية
      this.updateDailyStats(ratingRecord.timestamp, 'rating', { rating });

      // تنظيف القاعدة إذا تجاوزت الحد الأقصى
      this.cleanupRatingsDatabase();

      //console.log(`📊 [QUALITY] Rating logged: ${rating} for message ${messageId}`);

      return {
        success: true,
        ratingId: ratingRecord.id,
        timestamp: ratingRecord.timestamp
      };

    } catch (error) {
      console.error('❌ [QUALITY] Error logging rating:', error);
      throw error;
    }
  }

  /**
   * تحديث إحصائيات الجودة
   * @param {string} rating 
   */
  updateQualityStats(rating) {
    // تحديث الإحصائيات الأساسية
    this.qualityStats.ratings.total++;
    this.qualityStats.responses.rated++;

    if (rating === 'positive') {
      this.qualityStats.ratings.positive++;
      this.qualityStats.trends.lastHour.positive++;
      this.qualityStats.trends.lastDay.positive++;
      this.qualityStats.trends.lastWeek.positive++;
    } else {
      this.qualityStats.ratings.negative++;
      this.qualityStats.trends.lastHour.negative++;
      this.qualityStats.trends.lastDay.negative++;
      this.qualityStats.trends.lastWeek.negative++;
    }

    // حساب نسبة الرضا
    this.calculateSatisfactionRate();
  }

  /**
   * حساب نسبة الرضا
   */
  calculateSatisfactionRate() {
    const total = this.qualityStats.ratings.total;
    if (total === 0) {
      this.qualityStats.ratings.satisfaction = 0;
      return;
    }

    const positive = this.qualityStats.ratings.positive;
    this.qualityStats.ratings.satisfaction = Math.round((positive / total) * 100 * 100) / 100;
  }

  /**
   * تسجيل رد جديد مع مقاييس الأداء
   * @param {string} messageId - معرف الرسالة
   * @param {string} conversationId - معرف المحادثة
   * @param {Object} metrics - مقاييس الأداء
   */
  logResponse(messageId, conversationId, metrics = {}) {
    try {
      const timestamp = new Date();

      // تسجيل مقاييس الاستجابة
      const responseMetrics = {
        messageId,
        conversationId,
        timestamp,
        responseTime: metrics.responseTime || 0, // وقت الاستجابة بالميلي ثانية
        contentLength: metrics.contentLength || 0, // طول المحتوى
        hasImages: metrics.hasImages || false, // هل يحتوي على صور
        intent: metrics.intent || 'unknown', // نوع الاستفسار
        confidence: metrics.confidence || 0, // مستوى الثقة في الرد
        model: metrics.model || 'unknown', // النموذج المستخدم
        ragUsed: metrics.ragUsed || false, // هل تم استخدام RAG
        isSlowResponse: (metrics.responseTime || 0) > this.settings.slowResponseThreshold
      };

      this.responseMetrics.set(messageId, responseMetrics);

      // تحديث إحصائيات الردود
      this.qualityStats.responses.totalResponses++;
      this.qualityStats.responses.unrated++;

      // تحديث الإحصائيات اليومية
      this.updateDailyStats(timestamp, 'response', responseMetrics);

      //console.log(`📝 [QUALITY] Response logged: ${messageId} (awaiting rating)`);

      return {
        success: true,
        messageId,
        timestamp,
        status: 'awaiting_rating',
        metrics: responseMetrics
      };

    } catch (error) {
      console.error('❌ [QUALITY] Error logging response:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الجودة
   * @returns {Object}
   */
  getQualityStats() {
    const stats = {
      ...this.qualityStats,
      analysis: this.analyzeQuality(),
      recentRatings: this.getRecentRatings(10),
      trends: this.calculateTrends(),
      performance: this.getPerformanceMetrics(),
      dailyInsights: this.getDailyInsights()
    };

    return stats;
  }

  /**
   * تحليل جودة الردود
   * @returns {Object}
   */
  analyzeQuality() {
    const total = this.qualityStats.ratings.total;
    const satisfaction = this.qualityStats.ratings.satisfaction;
    const negativeRate = total > 0 ? Math.round((this.qualityStats.ratings.negative / total) * 100 * 100) / 100 : 0;

    let status = 'unknown';
    let concerns = [];

    if (total >= this.settings.minRatingsForAnalysis) {
      if (satisfaction >= 90) {
        status = 'excellent';
      } else if (satisfaction >= this.settings.satisfactionThreshold) {
        status = 'good';
      } else if (satisfaction >= 60) {
        status = 'fair';
        concerns.push('معدل الرضا منخفض');
      } else {
        status = 'poor';
        concerns.push('معدل الرضا منخفض جداً');
      }

      if (negativeRate > this.settings.negativeRateThreshold) {
        concerns.push('نسبة عالية من التقييمات السلبية');
      }
    }

    return {
      status,
      satisfaction,
      negativeRate,
      concerns,
      hasEnoughData: total >= this.settings.minRatingsForAnalysis,
      recommendation: this.getRecommendation(status, concerns)
    };
  }

  /**
   * الحصول على توصيات التحسين
   * @param {string} status 
   * @param {Array} concerns 
   * @returns {string}
   */
  getRecommendation(status, concerns) {
    if (status === 'excellent') {
      return 'الأداء ممتاز، استمر على هذا المستوى';
    }

    if (status === 'good') {
      return 'الأداء جيد، يمكن تحسينه أكثر';
    }

    if (concerns.length > 0) {
      return 'يحتاج تحسين فوري - راجع الردود السلبية وحسن المحتوى';
    }

    return 'بحاجة لمزيد من البيانات للتحليل';
  }

  /**
   * الحصول على آخر التقييمات
   * @param {number} limit 
   * @returns {Array}
   */
  getRecentRatings(limit = 10) {
    return this.ratingsDatabase
      .slice(-limit)
      .reverse()
      .map(rating => ({
        id: rating.id,
        rating: rating.rating,
        comment: rating.comment,
        timestamp: rating.timestamp,
        customerId: rating.customerId.substring(0, 8) + '...' // إخفاء جزء من المعرف للخصوصية
      }));
  }

  /**
   * حساب الاتجاهات
   * @returns {Object}
   */
  calculateTrends() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // إعادة حساب الاتجاهات من البيانات الفعلية
    const hourlyRatings = this.ratingsDatabase.filter(r => r.timestamp >= oneHourAgo);
    const dailyRatings = this.ratingsDatabase.filter(r => r.timestamp >= oneDayAgo);
    const weeklyRatings = this.ratingsDatabase.filter(r => r.timestamp >= oneWeekAgo);

    return {
      lastHour: this.calculatePeriodStats(hourlyRatings),
      lastDay: this.calculatePeriodStats(dailyRatings),
      lastWeek: this.calculatePeriodStats(weeklyRatings)
    };
  }

  /**
   * حساب إحصائيات فترة معينة
   * @param {Array} ratings 
   * @returns {Object}
   */
  calculatePeriodStats(ratings) {
    const positive = ratings.filter(r => r.rating === 'positive').length;
    const negative = ratings.filter(r => r.rating === 'negative').length;
    const total = ratings.length;
    const satisfaction = total > 0 ? Math.round((positive / total) * 100 * 100) / 100 : 0;

    return { positive, negative, total, satisfaction };
  }

  /**
   * تنظيف قاعدة البيانات
   */
  cleanupRatingsDatabase() {
    if (this.ratingsDatabase.length > this.maxRatingsHistory) {
      const excess = this.ratingsDatabase.length - this.maxRatingsHistory;
      this.ratingsDatabase.splice(0, excess);
      //console.log(`🧹 [QUALITY] Cleaned up ${excess} old ratings`);
    }
  }

  /**
   * إنشاء معرف فريد للتقييم
   * @returns {string}
   */
  generateRatingId() {
    return 'rating_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * البحث عن تقييمات حسب المعايير
   * @param {Object} criteria 
   * @returns {Array}
   */
  searchRatings(criteria = {}) {
    let results = [...this.ratingsDatabase];

    if (criteria.rating) {
      results = results.filter(r => r.rating === criteria.rating);
    }

    if (criteria.customerId) {
      results = results.filter(r => r.customerId === criteria.customerId);
    }

    if (criteria.conversationId) {
      results = results.filter(r => r.conversationId === criteria.conversationId);
    }

    if (criteria.fromDate) {
      results = results.filter(r => r.timestamp >= new Date(criteria.fromDate));
    }

    if (criteria.toDate) {
      results = results.filter(r => r.timestamp <= new Date(criteria.toDate));
    }

    return results.reverse(); // الأحدث أولاً
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats() {
    this.qualityStats = {
      ratings: { total: 0, positive: 0, negative: 0, satisfaction: 0 },
      responses: { rated: 0, unrated: 0, totalResponses: 0 },
      trends: {
        lastHour: { positive: 0, negative: 0 },
        lastDay: { positive: 0, negative: 0 },
        lastWeek: { positive: 0, negative: 0 }
      }
    };

    this.ratingsDatabase = [];
    //console.log('🔄 [QUALITY] Stats reset successfully');
  }

  /**
   * الحصول على مقاييس الأداء
   * @returns {Object}
   */
  getPerformanceMetrics() {
    const metrics = Array.from(this.responseMetrics.values());

    if (metrics.length === 0) {
      return {
        responseTime: {
          average: 0,
          min: 0,
          max: 0,
          slowResponses: 0,
          fastResponses: 0
        },
        contentQuality: {
          averageLength: 0,
          withImages: 0,
          withoutImages: 0
        },
        aiMetrics: {
          averageConfidence: 0,
          ragUsage: 0,
          modelDistribution: {}
        },
        intentAnalysis: {}
      };
    }

    // حساب مقاييس وقت الاستجابة
    const responseTimes = metrics.map(m => m.responseTime).filter(t => t > 0);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const slowResponses = metrics.filter(m => m.isSlowResponse).length;
    const fastResponses = metrics.length - slowResponses;

    // حساب مقاييس جودة المحتوى
    const contentLengths = metrics.map(m => m.contentLength).filter(l => l > 0);
    const avgContentLength = contentLengths.length > 0
      ? Math.round(contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length)
      : 0;
    const withImages = metrics.filter(m => m.hasImages).length;
    const withoutImages = metrics.length - withImages;

    // حساب مقاييس الذكاء الاصطناعي
    const confidences = metrics.map(m => m.confidence).filter(c => c > 0);
    const avgConfidence = confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
      : 0;
    const ragUsage = metrics.filter(m => m.ragUsed).length;

    // توزيع النماذج
    const modelDistribution = {};
    metrics.forEach(m => {
      const model = m.model || 'unknown';
      modelDistribution[model] = (modelDistribution[model] || 0) + 1;
    });

    // تحليل الأهداف
    const intentAnalysis = {};
    metrics.forEach(m => {
      const intent = m.intent || 'unknown';
      intentAnalysis[intent] = (intentAnalysis[intent] || 0) + 1;
    });

    return {
      responseTime: {
        average: avgResponseTime,
        min: minResponseTime,
        max: maxResponseTime,
        slowResponses,
        fastResponses,
        slowResponseRate: metrics.length > 0 ? Math.round((slowResponses / metrics.length) * 100) : 0
      },
      contentQuality: {
        averageLength: avgContentLength,
        withImages,
        withoutImages,
        imageUsageRate: metrics.length > 0 ? Math.round((withImages / metrics.length) * 100) : 0
      },
      aiMetrics: {
        averageConfidence: avgConfidence,
        ragUsage,
        ragUsageRate: metrics.length > 0 ? Math.round((ragUsage / metrics.length) * 100) : 0,
        modelDistribution
      },
      intentAnalysis,
      totalResponses: metrics.length
    };
  }

  /**
   * تحديث الإحصائيات اليومية
   * @param {Date} timestamp - وقت الحدث
   * @param {string} eventType - نوع الحدث (response, rating)
   * @param {Object} data - بيانات الحدث
   */
  updateDailyStats(timestamp, eventType, data) {
    const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!this.dailyStats.has(dateKey)) {
      this.dailyStats.set(dateKey, {
        date: dateKey,
        responses: {
          total: 0,
          slow: 0,
          fast: 0,
          avgResponseTime: 0,
          totalResponseTime: 0
        },
        ratings: {
          total: 0,
          positive: 0,
          negative: 0,
          satisfaction: 0
        },
        intents: new Map(),
        models: new Map(),
        ragUsage: 0
      });
    }

    const dayStats = this.dailyStats.get(dateKey);

    if (eventType === 'response') {
      dayStats.responses.total++;
      dayStats.responses.totalResponseTime += data.responseTime || 0;
      dayStats.responses.avgResponseTime = dayStats.responses.totalResponseTime / dayStats.responses.total;

      if (data.isSlowResponse) {
        dayStats.responses.slow++;
      } else {
        dayStats.responses.fast++;
      }

      // تتبع الأنواع
      const intent = data.intent || 'unknown';
      dayStats.intents.set(intent, (dayStats.intents.get(intent) || 0) + 1);

      const model = data.model || 'unknown';
      dayStats.models.set(model, (dayStats.models.get(model) || 0) + 1);

      if (data.ragUsed) {
        dayStats.ragUsage++;
      }
    }

    if (eventType === 'rating') {
      dayStats.ratings.total++;
      if (data.rating === 'positive') {
        dayStats.ratings.positive++;
      } else {
        dayStats.ratings.negative++;
      }
      dayStats.ratings.satisfaction = dayStats.ratings.total > 0
        ? Math.round((dayStats.ratings.positive / dayStats.ratings.total) * 100)
        : 0;
    }
  }

  /**
   * الحصول على رؤى يومية
   * @returns {Object}
   */
  getDailyInsights() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayStats = this.dailyStats.get(today);
    const yesterdayStats = this.dailyStats.get(yesterday);

    // الحصول على آخر 7 أيام
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dayStats = this.dailyStats.get(date);
      if (dayStats) {
        last7Days.push({
          date,
          responses: dayStats.responses.total,
          ratings: dayStats.ratings.total,
          satisfaction: dayStats.ratings.satisfaction,
          avgResponseTime: Math.round(dayStats.responses.avgResponseTime)
        });
      }
    }

    // حساب الاتجاهات
    const trends = {
      satisfaction: this.calculateTrend(last7Days, 'satisfaction'),
      responseTime: this.calculateTrend(last7Days, 'avgResponseTime'),
      volume: this.calculateTrend(last7Days, 'responses')
    };

    return {
      today: todayStats || null,
      yesterday: yesterdayStats || null,
      last7Days,
      trends,
      insights: this.generateInsights(todayStats, yesterdayStats, trends)
    };
  }

  /**
   * حساب الاتجاه للمقياس المحدد
   * @param {Array} data - البيانات
   * @param {string} metric - المقياس
   * @returns {Object}
   */
  calculateTrend(data, metric) {
    if (data.length < 2) {
      return { direction: 'stable', change: 0, percentage: 0 };
    }

    const values = data.map(d => d[metric] || 0);
    const recent = values.slice(-3); // آخر 3 أيام
    const previous = values.slice(-6, -3); // 3 أيام قبلها

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.length > 0
      ? previous.reduce((a, b) => a + b, 0) / previous.length
      : recentAvg;

    const change = recentAvg - previousAvg;
    const percentage = previousAvg > 0 ? Math.round((change / previousAvg) * 100) : 0;

    let direction = 'stable';
    if (Math.abs(percentage) > 5) {
      direction = change > 0 ? 'increasing' : 'decreasing';
    }

    return { direction, change: Math.round(change), percentage };
  }

  /**
   * توليد رؤى ذكية
   * @param {Object} todayStats - إحصائيات اليوم
   * @param {Object} yesterdayStats - إحصائيات الأمس
   * @param {Object} trends - الاتجاهات
   * @returns {Array}
   */
  generateInsights(todayStats, yesterdayStats, trends) {
    const insights = [];

    // رؤى حول الرضا
    if (trends.satisfaction.direction === 'decreasing' && Math.abs(trends.satisfaction.percentage) > 10) {
      insights.push({
        type: 'warning',
        category: 'satisfaction',
        message: `معدل الرضا انخفض بنسبة ${Math.abs(trends.satisfaction.percentage)}% خلال الأيام الماضية`,
        priority: 'high'
      });
    } else if (trends.satisfaction.direction === 'increasing' && trends.satisfaction.percentage > 10) {
      insights.push({
        type: 'success',
        category: 'satisfaction',
        message: `معدل الرضا تحسن بنسبة ${trends.satisfaction.percentage}% - أداء ممتاز!`,
        priority: 'medium'
      });
    }

    // رؤى حول وقت الاستجابة
    if (trends.responseTime.direction === 'increasing' && trends.responseTime.percentage > 20) {
      insights.push({
        type: 'warning',
        category: 'performance',
        message: `أوقات الاستجابة تزداد - متوسط الزيادة ${trends.responseTime.percentage}%`,
        priority: 'high'
      });
    }

    // رؤى حول الحجم
    if (trends.volume.direction === 'increasing' && trends.volume.percentage > 50) {
      insights.push({
        type: 'info',
        category: 'volume',
        message: `زيادة كبيرة في عدد الاستفسارات (${trends.volume.percentage}%) - قد تحتاج لمراقبة إضافية`,
        priority: 'medium'
      });
    }

    // رؤى يومية
    if (todayStats && yesterdayStats) {
      const satisfactionChange = todayStats.ratings.satisfaction - yesterdayStats.ratings.satisfaction;
      if (Math.abs(satisfactionChange) > 15) {
        insights.push({
          type: satisfactionChange > 0 ? 'success' : 'warning',
          category: 'daily',
          message: `معدل الرضا اليوم ${satisfactionChange > 0 ? 'أفضل' : 'أسوأ'} من الأمس بـ ${Math.abs(satisfactionChange)} نقطة`,
          priority: 'medium'
        });
      }
    }

    return insights;
  }

  /**
   * تحديث إعدادات النظام
   * @param {Object} newSettings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    //console.log('⚙️ [QUALITY] Settings updated:', newSettings);
  }

  /**
   * تنظيف وإصلاح ترميز التعليق
   * @param {string} comment
   * @returns {string}
   */
  sanitizeComment(comment) {
    if (!comment || typeof comment !== 'string') {
      return '';
    }

    try {
      // إزالة المسافات الزائدة
      let cleaned = comment.trim();

      // التأكد من الترميز الصحيح للنص العربي
      // إذا كان النص يحتوي على أحرف عربية، نتأكد من ترميزه
      if (/[\u0600-\u06FF]/.test(cleaned)) {
        // النص يحتوي على أحرف عربية، نحتفظ به كما هو
        return cleaned;
      }

      // إذا كان النص يحتوي على علامات استفهام، قد يكون هناك مشكلة في الترميز
      if (cleaned.includes('?') && cleaned.length > 10) {
        console.warn('⚠️ [QUALITY] Possible encoding issue in comment:', cleaned);
        // يمكن إضافة منطق إضافي لإصلاح الترميز هنا
      }

      // قطع التعليق إذا كان طويلاً جداً
      if (cleaned.length > 500) {
        cleaned = cleaned.substring(0, 500) + '...';
      }

      return cleaned;

    } catch (error) {
      console.error('❌ [QUALITY] Error sanitizing comment:', error);
      return comment.toString().trim();
    }
  }
}

module.exports = {
  QualityMonitor
};
