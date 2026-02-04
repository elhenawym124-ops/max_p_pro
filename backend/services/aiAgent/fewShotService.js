const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');

/**
 * Few-Shot Learning Service
 * نظام متكامل لإدارة الأمثلة وبناء Few-Shot Prompts
 */
class FewShotService {
  constructor() {
    this.examplesCache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 دقائق
  }

  /**
   * الحصول على إعدادات Few-Shot للشركة
   */
  async getSettings(companyId) {
    try {
      const settings = await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotSettings.findUnique({
          where: { companyId }
        });
      });

      if (!settings) {
        return {
          enabled: false,
          maxExamplesPerPrompt: 3,
          selectionStrategy: 'priority',
          autoLearnFromGood: false,
          minQualityScore: 80.0
        };
      }

      return settings;
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error getting settings:', error);
      return {
        enabled: false,
        maxExamplesPerPrompt: 3,
        selectionStrategy: 'priority',
        autoLearnFromGood: false,
        minQualityScore: 80.0
      };
    }
  }

  /**
   * تحديث إعدادات Few-Shot
   */
  async updateSettings(companyId, settings) {
    try {
      const updated = await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotSettings.upsert({
          where: { companyId },
          update: settings,
          create: {
            companyId,
            ...settings
          }
        });
      });

      console.log(`✅ [FEW-SHOT] Settings updated for company: ${companyId}`);
      return updated;
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error updating settings:', error);
      throw error;
    }
  }

  /**
   * إضافة مثال جديد
   */
  async addExample(companyId, exampleData) {
    try {
      const example = await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotExample.create({
          data: {
            companyId,
            customerMessage: exampleData.customerMessage,
            aiResponse: exampleData.aiResponse,
            category: exampleData.category || null,
            tags: exampleData.tags ? JSON.stringify(exampleData.tags) : null,
            priority: exampleData.priority || 0,
            notes: exampleData.notes || null,
            isActive: exampleData.isActive !== undefined ? exampleData.isActive : true
          }
        });
      });

      // مسح الكاش
      this.clearCache(companyId);

      console.log(`✅ [FEW-SHOT] Example added: ${example.id}`);
      return example;
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error adding example:', error);
      throw error;
    }
  }

  /**
   * تحديث مثال موجود
   */
  async updateExample(exampleId, updateData) {
    try {
      const example = await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotExample.update({
          where: { id: exampleId },
          data: {
            ...updateData,
            tags: updateData.tags ? JSON.stringify(updateData.tags) : undefined,
            updatedAt: new Date()
          }
        });
      });

      // مسح الكاش
      this.clearCache(example.companyId);

      console.log(`✅ [FEW-SHOT] Example updated: ${exampleId}`);
      return example;
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error updating example:', error);
      throw error;
    }
  }

  /**
   * حذف مثال
   */
  async deleteExample(exampleId) {
    try {
      const example = await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotExample.delete({
          where: { id: exampleId }
        });
      });

      this.clearCache(example.companyId);

      console.log(`✅ [FEW-SHOT] Example deleted: ${exampleId}`);
      return example;
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error deleting example:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع الأمثلة للشركة
   */
  async getExamples(companyId, filters = {}) {
    try {
      const where = {
        companyId,
        isActive: filters.isActive !== undefined ? filters.isActive : true
      };

      if (filters.category) {
        where.category = filters.category;
      }

      const examples = await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotExample.findMany({
          where,
          orderBy: [
            { priority: 'desc' },
            { usageCount: 'desc' },
            { createdAt: 'desc' }
          ]
        });
      });

      // تحويل tags من JSON string إلى array
      return examples.map(ex => ({
        ...ex,
        tags: ex.tags ? JSON.parse(ex.tags) : []
      }));
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error getting examples:', error);
      return [];
    }
  }

  /**
   * اختيار الأمثلة المناسبة للبرومبت
   */
  async selectExamples(companyId, customerMessage, messageContext = {}) {
    try {
      const settings = await this.getSettings(companyId);

      if (!settings.enabled) {
        return [];
      }

      // الحصول على جميع الأمثلة النشطة
      const allExamples = await this.getExamples(companyId, { isActive: true });

      if (allExamples.length === 0) {
        return [];
      }

      let selectedExamples = [];

      switch (settings.selectionStrategy) {
        case 'priority':
          selectedExamples = this._selectByPriority(allExamples, settings.maxExamplesPerPrompt);
          break;

        case 'random':
          selectedExamples = this._selectRandom(allExamples, settings.maxExamplesPerPrompt);
          break;

        case 'category_match':
          selectedExamples = this._selectByCategory(
            allExamples,
            messageContext.category,
            settings.maxExamplesPerPrompt
          );
          break;

        case 'smart':
          selectedExamples = await this._selectSmart(
            allExamples,
            customerMessage,
            messageContext,
            settings.maxExamplesPerPrompt
          );
          break;

        default:
          selectedExamples = this._selectByPriority(allExamples, settings.maxExamplesPerPrompt);
      }

      // تحديث إحصائيات الاستخدام
      await this._updateUsageStats(selectedExamples.map(ex => ex.id));

      return selectedExamples;
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error selecting examples:', error);
      return [];
    }
  }

  /**
   * بناء Few-Shot Prompt من الأمثلة
   */
  buildFewShotPrompt(examples) {
    if (!examples || examples.length === 0) {
      return '';
    }

    let prompt = '\n\n📚 أمثلة على الردود المطلوبة (Few-Shot Examples):\n';
    prompt += '=====================================\n';
    prompt += '💡 استخدمي هذه الأمثلة كمرجع لأسلوب وجودة الردود المطلوبة.\n\n';

    examples.forEach((example, index) => {
      prompt += `مثال ${index + 1}:\n`;
      prompt += `👤 العميل: "${example.customerMessage}"\n`;
      prompt += `🤖 الرد المثالي: "${example.aiResponse}"\n\n`;
    });

    prompt += '=====================================\n';
    prompt += '🎯 الآن، ردّي على رسالة العميل الحالية بنفس الأسلوب والجودة:\n\n';

    return prompt;
  }

  /**
   * التعلم التلقائي من الردود الجيدة
   */
  async learnFromGoodResponse(companyId, customerMessage, aiResponse, qualityScore, category = null) {
    try {
      const settings = await this.getSettings(companyId);

      if (!settings.enabled || !settings.autoLearnFromGood) {
        return null;
      }

      if (qualityScore < settings.minQualityScore) {
        return null;
      }

      // إضافة المثال تلقائياً
      const example = await this.addExample(companyId, {
        customerMessage,
        aiResponse,
        category,
        priority: Math.floor(qualityScore / 10), // جودة 90 = أولوية 9
        tags: ['auto_learned'],
        notes: `تم التعلم تلقائياً - جودة: ${qualityScore}%`
      });

      console.log(`🎓 [FEW-SHOT] Auto-learned from good response: ${example.id} (Quality: ${qualityScore}%)`);
      return example;
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error auto-learning:', error);
      return null;
    }
  }

  /**
   * الحصول على إحصائيات Few-Shot
   */
  async getStats(companyId) {
    try {
      const [totalExamples, activeExamples, settings] = await Promise.all([
        safeQuery(async () => {
          return await getSharedPrismaClient().fewShotExample.count({
            where: { companyId }
          });
        }),
        safeQuery(async () => {
          return await getSharedPrismaClient().fewShotExample.count({
            where: { companyId, isActive: true }
          });
        }),
        this.getSettings(companyId)
      ]);

      const examplesByCategory = await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotExample.groupBy({
          by: ['category'],
          where: { companyId, isActive: true },
          _count: true
        });
      });

      const mostUsedExamples = await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotExample.findMany({
          where: { companyId, isActive: true },
          orderBy: { usageCount: 'desc' },
          take: 5,
          select: {
            id: true,
            customerMessage: true,
            category: true,
            usageCount: true,
            priority: true
          }
        });
      });

      return {
        totalExamples,
        activeExamples,
        inactiveExamples: totalExamples - activeExamples,
        enabled: settings.enabled,
        maxExamplesPerPrompt: settings.maxExamplesPerPrompt,
        selectionStrategy: settings.selectionStrategy,
        autoLearnEnabled: settings.autoLearnFromGood,
        examplesByCategory: examplesByCategory.map(cat => ({
          category: cat.category || 'uncategorized',
          count: cat._count
        })),
        mostUsedExamples
      };
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error getting stats:', error);
      return null;
    }
  }

  // ==================== Private Methods ====================

  /**
   * اختيار حسب الأولوية
   */
  _selectByPriority(examples, maxCount) {
    return examples
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.usageCount - a.usageCount;
      })
      .slice(0, maxCount);
  }

  /**
   * اختيار عشوائي
   */
  _selectRandom(examples, maxCount) {
    const shuffled = [...examples].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxCount);
  }

  /**
   * اختيار حسب التصنيف
   */
  _selectByCategory(examples, category, maxCount) {
    if (!category) {
      return this._selectByPriority(examples, maxCount);
    }

    const categoryExamples = examples.filter(ex => ex.category === category);
    
    if (categoryExamples.length >= maxCount) {
      return this._selectByPriority(categoryExamples, maxCount);
    }

    // إذا لم يكن هناك أمثلة كافية من نفس التصنيف، أضف من تصنيفات أخرى
    const remaining = maxCount - categoryExamples.length;
    const otherExamples = examples
      .filter(ex => ex.category !== category)
      .slice(0, remaining);

    return [...categoryExamples, ...otherExamples];
  }

  /**
   * اختيار ذكي (بناءً على التشابه)
   */
  async _selectSmart(examples, customerMessage, messageContext, maxCount) {
    // TODO: يمكن تحسين هذا باستخدام embedding similarity
    // حالياً سنستخدم مزيج من الأولوية والتصنيف
    
    const category = messageContext.category || this._detectCategory(customerMessage);
    
    const categoryExamples = examples.filter(ex => ex.category === category);
    const highPriorityExamples = examples.filter(ex => ex.priority >= 5);
    
    const combined = [...new Set([...categoryExamples, ...highPriorityExamples])];
    
    return this._selectByPriority(combined.length > 0 ? combined : examples, maxCount);
  }

  /**
   * كشف التصنيف من رسالة العميل
   */
  _detectCategory(customerMessage) {
    const msg = customerMessage.toLowerCase();
    
    if (msg.includes('سعر') || msg.includes('كام') || msg.includes('ثمن')) {
      return 'pricing';
    }
    if (msg.includes('شحن') || msg.includes('توصيل') || msg.includes('وصول')) {
      return 'shipping';
    }
    if (msg.includes('شكوى') || msg.includes('مشكلة') || msg.includes('عيب')) {
      return 'complaint';
    }
    if (msg.includes('مقاس') || msg.includes('لون') || msg.includes('مواصفات')) {
      return 'product_info';
    }
    
    return 'general';
  }

  /**
   * تحديث إحصائيات الاستخدام
   */
  async _updateUsageStats(exampleIds) {
    try {
      await safeQuery(async () => {
        return await getSharedPrismaClient().fewShotExample.updateMany({
          where: { id: { in: exampleIds } },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date()
          }
        });
      });
    } catch (error) {
      console.error('❌ [FEW-SHOT] Error updating usage stats:', error);
    }
  }

  /**
   * مسح الكاش
   */
  clearCache(companyId) {
    const cacheKey = `examples_${companyId}`;
    this.examplesCache.delete(cacheKey);
  }
}

module.exports = new FewShotService();
