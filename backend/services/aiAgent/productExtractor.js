/**
 * Product Extractor Module
 * 
 * هذا الـ module يحتوي على منطق استخراج أسماء المنتجات من:
 * 1. الرسالة الحالية للعميل
 * 2. الذاكرة (المحادثة السابقة)
 * 3. RAG data (كـ fallback)
 * 
 * ملاحظة: هذا الـ module للرجوع فقط - لا يتم استخدامه في الملف الرئيسي حالياً
 */

class ProductExtractor {
  /**
   * استخراج اسم المنتج من الرسالة الحالية للعميل
   * @param {string} customerMessage - رسالة العميل
   * @returns {Object|null} - {productName, context} أو null
   */
  extractFromCurrentMessage(customerMessage) {
    if (!customerMessage || customerMessage.length < 3) {
      return null;
    }

    let productName = null;
    let context = customerMessage;

    // Pattern 1: منتج بالإنجليزي في الرسالة الحالية
    const englishInquiry = customerMessage.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/);
    if (englishInquiry && englishInquiry[1]) {
      const name = englishInquiry[1].trim();
      if (!['AI', 'API'].includes(name) || name.length > 3) {
        productName = name;
        console.log('🎯 [PRODUCT-EXTRACTOR] تم استخراج اسم المنتج (EN) من الرسالة الحالية:', productName);
        return { productName, context };
      }
    }

    // Pattern 2: منتج بالعربي في الرسالة الحالية
    const arabicInquiryPatterns = [
      /(?:عايز|محتاج|أشوف|اشوف|عاوز|ممكن)\s+["']?([أ-ي\s]{2,40})["']?\s*(?:متاح|موجود|ب\s*كام|؟)?/,
      /سعر\s+["']?([أ-ي\s]{2,40})["']?\s*(?:كام|؟)?/,
      /["']([أ-ي\s]{2,40})["']\s+(?:متاح|موجود|ب\s*كام)/,
      /(?:كوتشي|هاف|سابوه|بوتات|بالرينا)\s+([أ-ي\s]{2,40})/gi,
      /(?:السابوه|سابوه|الهاف|هاف|الكوتشي|كوتشي|البالرينا|بالرينا)/gi
    ];

    for (const pattern of arabicInquiryPatterns) {
      const match = customerMessage.match(pattern);
      if (match) {
        let name = null;
        if (match[1]) {
          name = match[1].trim();
        } else if (match[0]) {
          // استخراج من المطابقة الكاملة (مثل: "السابوه" → "سابوه")
          name = match[0].replace(/^ال/, '').trim();
        }

        if (name && name.length > 2 && !name.match(/صور|معلومات|تفاصيل|شحن|منتجات|المنتجات/)) {
          const ignoreWords = ['كل', 'جميع', 'أي', 'هذا', 'ذلك', 'منتجات', 'المنتجات', 'تانيه', 'تانية', 'ثانيه', 'ثانية'];
          if (!ignoreWords.some(word => name.toLowerCase().includes(word.toLowerCase()))) {
            productName = name;
            console.log('🎯 [PRODUCT-EXTRACTOR] تم استخراج اسم المنتج (AR) من الرسالة الحالية:', productName);
            return { productName, context };
          }
        }
      }
    }

    return null;
  }

  /**
   * استخراج اسم المنتج من الذاكرة (المحادثة السابقة)
   * @param {Array} conversationMemory - سجل المحادثة
   * @returns {Object|null} - {productName, context} أو null
   */
  extractFromMemory(conversationMemory) {
    if (!conversationMemory || conversationMemory.length === 0) {
      return null;
    }

    // البحث في آخر 20 رسالة (زيادة النطاق للبحث بشكل أوسع)
    const recentMessages = conversationMemory.slice(-20).reverse();

    // المرحلة 1: البحث في ردود AI أولاً
    for (const msg of recentMessages) {
      const content = msg.content || '';
      const contentLower = content.toLowerCase();

      // فقط رسائل AI
      if (!msg.isFromCustomer) {
        // Pattern 0: منتج من context tag [المنتج: ...] - الأكثر دقة
        const contextPattern = content.match(/\[المنتج:\s*([^\]]{2,100})\]/);
        if (contextPattern && contextPattern[1]) {
          const productName = contextPattern[1].trim();
          const context = content.substring(0, 150);
          console.log('🎯 [PRODUCT-EXTRACTOR] تم استخراج اسم المنتج من context tag:', productName);
          return { productName, context };
        }

        // Pattern 1: اسم منتج إنجليزي في رد AI
        const englishProductPatterns = [
          /\*\*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\*\*/, // **Belle Boot**
          /(?:منتج|المنتج)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})/, // منتج Belle Boot
          /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})/ // Belle Boot (fallback)
        ];

        for (const pattern of englishProductPatterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            const productName = match[1].trim();
            const ignoreWords = ['تمام', 'طيب', 'كوتشي', 'بوت', 'صور', 'منتج', 'المنتج', 'سعر', 'سعره'];
            if (productName.length >= 4 && !ignoreWords.some(word => productName.toLowerCase() === word.toLowerCase())) {
              const context = content.substring(0, 150);
              console.log('🎯 [PRODUCT-EXTRACTOR] تم استخراج اسم المنتج (EN) من رد AI:', productName);
              return { productName, context };
            }
          }
        }

        // Pattern 2: منتج في مربع أو علامات تنصيص
        const boxedPattern = content.match(/[📦🎁✨]\s*["']?([^"'\n]{3,50})["']?/);
        if (boxedPattern && boxedPattern[1]) {
          const productName = boxedPattern[1].trim();
          const context = content.substring(0, 150);
          console.log('🎯 [PRODUCT-EXTRACTOR] تم استخراج اسم المنتج من رد AI (مربع):', productName);
          return { productName, context };
        }

        // Pattern 3: "المنتج [name] متاح" or similar
        const availabilityPatterns = [
          /(?:المنتج|منتج)\s+["']?([أ-يA-Za-z\s]{2,40})["']?\s+(?:متاح|موجود|متوفر)/,
          /["']([أ-يA-Za-z\s]{2,40})["']\s+(?:متاح|موجود|متوفر)/,
          /(?:عندنا|لدينا)\s+["']?([أ-يA-Za-z\s]{2,40})["']?/
        ];

        for (const pattern of availabilityPatterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            const productName = match[1].trim();
            const ignoreWords = ['كل', 'جميع', 'أي', 'هذا', 'ذلك', 'التي', 'الذي'];
            if (!ignoreWords.some(word => productName === word)) {
              const context = content.substring(0, 150);
              console.log('🎯 [PRODUCT-EXTRACTOR] تم استخراج اسم المنتج (AR) من رد AI:', productName);
              return { productName, context };
            }
          }
        }
      }
    }

    // المرحلة 2: البحث في رسائل العميل
    for (const msg of recentMessages) {
      const content = msg.content || '';

      // فقط رسائل العميل
      if (msg.isFromCustomer) {
        // Pattern 1: منتج بالإنجليزي في سؤال العميل
        const englishInquiry = content.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/);
        if (englishInquiry && englishInquiry[1]) {
          const productName = englishInquiry[1].trim();
          const ignoreWords = ['عايز', 'اشوف', 'ممكن'];
          if (!ignoreWords.some(word => productName.toLowerCase().includes(word.toLowerCase()))) {
            console.log('🎯 [PRODUCT-EXTRACTOR] تم استخراج اسم المنتج (EN) من سؤال العميل:', productName);
            return { productName, context: content };
          }
        }

        // Pattern 2: منتج بالعربي في سؤال العميل
        const arabicInquiryPatterns = [
          /(?:عايز|محتاج|أشوف|اشوف|عاوز)\s+["']?([أ-ي\s]{2,40})["']?\s*(?:متاح|موجود|ب\s*كام|؟)?/,
          /سعر\s+["']?([أ-ي\s]{2,40})["']?\s*(?:كام|؟)?/,
          /["']([أ-ي\s]{2,40})["']\s+(?:متاح|موجود|ب\s*كام)/
        ];

        for (const pattern of arabicInquiryPatterns) {
          const match = content.match(pattern);
          if (match && match[1] && !match[1].match(/صور|معلومات|تفاصيل|شحن/)) {
            const productName = match[1].trim();
            const ignoreWords = ['كل', 'جميع', 'أي', 'هذا', 'ذلك', 'المنتجات', 'منتجات', 'كل المنتجات', 'كل المنتجاات'];
            if (!ignoreWords.some(word => productName.toLowerCase().includes(word.toLowerCase()))) {
              console.log('🎯 [PRODUCT-EXTRACTOR] تم استخراج اسم المنتج (AR) من سؤال العميل:', productName);
              return { productName, context: content };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * استخراج اسم المنتج من RAG data (fallback)
   * @param {Array} ragData - بيانات RAG
   * @returns {Object|null} - {productName, context} أو null
   */
  extractFromRAGData(ragData) {
    if (!ragData || ragData.length === 0) {
      return null;
    }

    // استخدم أول منتج في الـ RAG data (الأكثر صلة)
    const firstProduct = ragData[0];
    if (firstProduct && firstProduct.name) {
      const productName = firstProduct.name;
      const context = `المنتج المطلوب: ${firstProduct.name}`;
      console.log('🔄 [PRODUCT-EXTRACTOR] استخراج من RAG data:', productName);
      return { productName, context };
    }

    return null;
  }

  /**
   * استخراج اسم المنتج بالترتيب: الرسالة الحالية → الذاكرة → RAG data
   * @param {string} customerMessage - رسالة العميل
   * @param {Array} conversationMemory - سجل المحادثة
   * @param {Array} ragData - بيانات RAG
   * @returns {Object|null} - {productName, context} أو null
   */
  extractProduct(customerMessage, conversationMemory, ragData) {
    // الأولوية 1: الرسالة الحالية
    const fromCurrent = this.extractFromCurrentMessage(customerMessage);
    if (fromCurrent) {
      return fromCurrent;
    }

    // الأولوية 2: الذاكرة
    const fromMemory = this.extractFromMemory(conversationMemory);
    if (fromMemory) {
      return fromMemory;
    }

    // الأولوية 3: RAG data (fallback)
    const fromRAG = this.extractFromRAGData(ragData);
    if (fromRAG) {
      return fromRAG;
    }

    return null;
  }
}

module.exports = new ProductExtractor();

