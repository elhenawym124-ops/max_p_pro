const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const ragCache = require('./ragCache');
const ragLogger = require('./ragLogger');

class RAGDataLoader {
  async loadFAQs(companyId) {
    const startTime = Date.now();

    // If no companyId provided, return fallback data immediately
    if (!companyId) {
      ragLogger.warn('loadFAQs called without companyId, using fallback data');
      return this.getFallbackFAQs();
    }

    try {
      const cached = ragCache.getFAQs(companyId);
      if (cached) {
        return cached;
      }

      const faqs = await safeQuery(async () => {
        return await getSharedPrismaClient().fAQ.findMany({
          where: {
            companyId,
            isActive: true
          },
          orderBy: {
            order: 'asc'
          }
        });
      }, 3);

      const formattedFAQs = faqs.map((faq, index) => ({
        type: 'faq',
        content: `السؤال: ${faq.question}\nالإجابة: ${faq.answer}`,
        metadata: {
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          version: faq.version,
          helpful: faq.helpful,
          notHelpful: faq.notHelpful
        }
      }));

      ragCache.setFAQs(companyId, formattedFAQs);

      const duration = Date.now() - startTime;
      ragLogger.logDatabaseOperation('loadFAQs', companyId, duration);

      return formattedFAQs;
    } catch (error) {
      const duration = Date.now() - startTime;
      ragLogger.logDatabaseOperation('loadFAQs', companyId, duration, error);

      return this.getFallbackFAQs();
    }
  }

  async loadPolicies(companyId) {
    const startTime = Date.now();

    // If no companyId provided, return fallback data immediately
    if (!companyId) {
      ragLogger.warn('loadPolicies called without companyId, using fallback data');
      return this.getFallbackPolicies();
    }

    try {
      const cached = ragCache.getPolicies(companyId);
      if (cached) {
        return cached;
      }

      const policies = await safeQuery(async () => {
        return await getSharedPrismaClient().storePage.findMany({
          where: {
            companyId,
            isActive: true,
            pageType: {
              in: ['SHIPPING_POLICY', 'RETURN_POLICY', 'REFUND_POLICY', 'PRIVACY_POLICY', 'TERMS_CONDITIONS']
            }
          },
          orderBy: {
            order: 'asc'
          }
        });
      }, 3);

      const formattedPolicies = policies.map((policy, index) => ({
        type: 'policy',
        content: `${policy.title}: ${policy.content}`,
        metadata: {
          id: policy.id,
          title: policy.title,
          content: policy.content,
          category: policy.pageType,
          slug: policy.slug,
          updatedAt: policy.updatedAt
        }
      }));

      ragCache.setPolicies(companyId, formattedPolicies);

      const duration = Date.now() - startTime;
      ragLogger.logDatabaseOperation('loadPolicies', companyId, duration);

      return formattedPolicies;
    } catch (error) {
      const duration = Date.now() - startTime;
      ragLogger.logDatabaseOperation('loadPolicies', companyId, duration, error);

      return this.getFallbackPolicies();
    }
  }

  getFallbackFAQs() {
    return [
      {
        type: 'faq',
        content: 'السؤال: ما هي طرق الدفع المتاحة؟\nالإجابة: نقبل الدفع نقداً عند الاستلام، أو عن طريق فودافون كاش، أو التحويل البنكي.',
        metadata: {
          question: 'ما هي طرق الدفع المتاحة؟',
          answer: 'نقبل الدفع نقداً عند الاستلام، أو عن طريق فودافون كاش، أو التحويل البنكي.',
          category: 'payment'
        }
      },
      {
        type: 'faq',
        content: 'السؤال: هل يمكن إرجاع المنتج؟\nالإجابة: نعم، يمكن إرجاع المنتج خلال 14 يوم من تاريخ الاستلام بشرط عدم الاستخدام.',
        metadata: {
          question: 'هل يمكن إرجاع المنتج؟',
          answer: 'نعم، يمكن إرجاع المنتج خلال 14 يوم من تاريخ الاستلام بشرط عدم الاستخدام.',
          category: 'returns'
        }
      },
      {
        type: 'faq',
        content: 'السؤال: ما هي أوقات العمل؟\nالإجابة: نعمل يومياً من 9 صباحاً حتى 6 مساءً، عدا يوم الجمعة.',
        metadata: {
          question: 'ما هي أوقات العمل؟',
          answer: 'نعمل يومياً من 9 صباحاً حتى 6 مساءً، عدا يوم الجمعة.',
          category: 'general'
        }
      }
    ];
  }

  getFallbackPolicies() {
    return [
      {
        type: 'policy',
        content: 'سياسة الإرجاع: يمكن إرجاع المنتجات خلال 14 يوم من تاريخ الشراء. يجب أن يكون المنتج في حالته الأصلية وغير مستخدم.',
        metadata: {
          title: 'سياسة الإرجاع',
          content: 'يمكن إرجاع المنتجات خلال 14 يوم من تاريخ الشراء. يجب أن يكون المنتج في حالته الأصلية وغير مستخدم.',
          category: 'returns'
        }
      },
      {
        type: 'policy',
        content: 'سياسة الضمان: جميع منتجاتنا مضمونة ضد عيوب التصنيع لمدة 6 أشهر من تاريخ الشراء.',
        metadata: {
          title: 'سياسة الضمان',
          content: 'جميع منتجاتنا مضمونة ضد عيوب التصنيع لمدة 6 أشهر من تاريخ الشراء.',
          category: 'warranty'
        }
      }
    ];
  }

  async invalidateCache(companyId, type = 'all') {
    switch (type) {
      case 'faq':
        ragCache.invalidateFAQs(companyId);
        break;
      case 'policy':
        ragCache.invalidatePolicies(companyId);
        break;
      case 'product':
        ragCache.invalidateProducts(companyId);
        break;
      default:
        ragCache.invalidateAll(companyId);
    }

    ragLogger.info('Cache invalidated', { companyId, type });
  }
}

module.exports = new RAGDataLoader();
