/**
 * Learning Monitor Module
 * 
 * هذا الـ module يحتوي على منطق التعلم والمراقبة:
 * 1. collectLearningData - جمع بيانات التعلم
 * 2. determineOutcome - تحديد نتيجة التفاعل
 * 3. updateLearningDataWithFeedback - تحديث بيانات التعلم
 * 4. monitorImprovementPerformance - مراقبة أداء التحسينات
 * 5. calculateImprovement - حساب التحسن في المؤشرات
 * 6. calculateAverageImprovement - حساب متوسط التحسن
 * 
 * ✅ نقل من aiAgentService.js
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class LearningMonitor {
  constructor(aiAgentService) {
    this.aiAgentService = aiAgentService;
    this.prisma = getSharedPrismaClient();
    // ❌ REMOVED: learningService - Pattern System removed
  }

  /**
   * جمع بيانات التعلم من التفاعل
   * ✅ نقل من aiAgentService.js
   */
  async collectLearningData(interactionData) {
    try {
      const {
        companyId,
        customerId,
        conversationId,
        userMessage,
        aiResponse,
        intent,
        sentiment,
        processingTime,
        ragDataUsed,
        memoryUsed,
        model,
        confidence
      } = interactionData;

      // تحضير بيانات التعلم
      const learningData = {
        companyId,
        customerId,
        conversationId,
        type: 'conversation',
        data: {
          userMessage,
          aiResponse,
          intent,
          sentiment,
          processingTime,
          ragDataUsed,
          memoryUsed,
          model,
          confidence,
          timestamp: new Date()
        },
        outcome: this.determineOutcome(userMessage, aiResponse, intent),
        feedback: null // سيتم تحديثه لاحقاً عند وجود تغذية راجعة
      };

      // ❌ REMOVED: Pattern System - learningService removed
      // حفظ بيانات التعلم مباشرة في قاعدة البيانات
      try {
        const savedData = await this.prisma.learningData.create({
          data: {
            companyId: learningData.companyId,
            customerId: learningData.customerId,
            conversationId: learningData.conversationId,
            type: learningData.type,
            data: JSON.stringify(learningData.data),
            outcome: learningData.outcome,
            feedback: learningData.feedback
          }
        });
        return { success: true, data: savedData };
      } catch (dbError) {
        console.error(`❌ [AIAgent] Failed to save learning data: ${dbError.message}`);
        return { success: false, error: dbError.message };
      }

    } catch (error) {
      console.error('❌ [AIAgent] Error in collectLearningData:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تحديد نتيجة التفاعل
   * ✅ نقل من aiAgentService.js
   */
  determineOutcome(userMessage, aiResponse, intent) {
    const userLower = userMessage.toLowerCase();
    const responseLower = aiResponse.toLowerCase();

    // مؤشرات النجاح
    if (userLower.includes('شكرا') || userLower.includes('ممتاز') || userLower.includes('تمام')) {
      return 'satisfied';
    }

    // مؤشرات الشراء
    if (intent === 'purchase' || userLower.includes('أريد أشتري') || userLower.includes('هاخد')) {
      return 'purchase_intent';
    }

    // مؤشرات الحل
    if (intent === 'support' && (responseLower.includes('حل') || responseLower.includes('إجابة'))) {
      return 'resolved';
    }

    // مؤشرات عدم الرضا
    if (userLower.includes('مش فاهم') || userLower.includes('مش واضح') || userLower.includes('غلط')) {
      return 'unsatisfied';
    }

    // افتراضي
    return 'ongoing';
  }

  /**
   * تحديث بيانات التعلم مع التغذية الراجعة
   * ✅ نقل من aiAgentService.js
   */
  async updateLearningDataWithFeedback(conversationId, feedback) {
    try {
      //console.log(`📝 [AIAgent] Updating learning data with feedback for conversation: ${conversationId}`);

      // البحث عن بيانات التعلم للمحادثة
      const learningData = await this.prisma.learningData.findFirst({
        where: {
          conversationId: conversationId,
          type: 'conversation'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (learningData) {
        // تحديث التغذية الراجعة
        await this.prisma.learningData.update({
          where: { id: learningData.id },
          data: {
            feedback: JSON.stringify(feedback),
            outcome: feedback.satisfactionScore > 3 ? 'satisfied' : 'unsatisfied'
          }
        });

        //console.log(`✅ [AIAgent] Learning data updated with feedback`);
        return { success: true };
      } else {
        //console.log(`⚠️ [AIAgent] No learning data found for conversation: ${conversationId}`);
        return { success: false, error: 'No learning data found' };
      }

    } catch (error) {
      console.error('❌ [AIAgent] Error updating learning data with feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * مراقبة أداء التحسينات
   * ❌ REMOVED: Pattern System (was consuming AI quota)
   */
  async monitorImprovementPerformance(companyId) {
    // ❌ REMOVED: Pattern System functionality
    return {
      success: true,
      data: [],
      summary: {
        totalImprovements: 0,
        averageImprovement: 0
      }
    };
  }

  /**
   * حساب التحسن في المؤشرات
   * ✅ نقل من aiAgentService.js
   */
  calculateImprovement(beforeMetrics, afterMetrics) {
    const improvements = {};

    // مقارنة المؤشرات المشتركة
    const commonMetrics = ['responseTime', 'satisfactionScore', 'resolutionRate'];

    commonMetrics.forEach(metric => {
      if (beforeMetrics[metric] && afterMetrics[metric]) {
        const before = parseFloat(beforeMetrics[metric]);
        const after = parseFloat(afterMetrics[metric]);

        if (metric === 'responseTime') {
          // للوقت، التحسن يعني انخفاض
          improvements[metric] = ((before - after) / before * 100).toFixed(2);
        } else {
          // للمؤشرات الأخرى، التحسن يعني زيادة
          improvements[metric] = ((after - before) / before * 100).toFixed(2);
        }
      }
    });

    return improvements;
  }

  /**
   * حساب متوسط التحسن
   * ✅ نقل من aiAgentService.js
   */
  calculateAverageImprovement(performanceData) {
    if (performanceData.length === 0) return 0;

    let totalImprovement = 0;
    let count = 0;

    performanceData.forEach(data => {
      Object.values(data.improvement).forEach(value => {
        if (!isNaN(parseFloat(value))) {
          totalImprovement += parseFloat(value);
          count++;
        }
      });
    });

    return count > 0 ? (totalImprovement / count).toFixed(2) : 0;
  }
}

module.exports = LearningMonitor;

