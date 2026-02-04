/**
 * Image Processor Module
 * 
 * هذا الـ module مسؤول عن معالجة الصور: كشف طلب الصور، جلب الصور، فلترة الصور
 * تم نقله من aiAgentService.js لتسهيل الصيانة
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const ragService = require('../ragService'); // ✅ Moved from inside functions to top level
const Logger = require('../logger'); // ✅ Use centralized logging system

// ✅ Error Classes for unified error handling
class ImageProcessorError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'ImageProcessorError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ImageProcessorError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class ProcessingError extends ImageProcessorError {
  constructor(message, details = null) {
    super(message, 'PROCESSING_ERROR', details);
    this.name = 'ProcessingError';
  }
}

// ✅ Constants for magic numbers and strings
const CONSTANTS = {
  MEMORY_LIMITS: {
    RECENT_MESSAGES: 3,
    CONTEXT_SEARCH: 15,
    FULL_CONTEXT: 20,
    MULTIPLE_PRODUCTS: 5,
    CONTEXT_EXTRACTION: 6,
    WIDE_CONTEXT: 20
  },
  THRESHOLDS: {
    MIN_CONFIDENCE: 0.6,
    MIN_SIMILARITY: 0.4,
    SHORT_MESSAGE: 12,
    MAX_MESSAGE_LENGTH: 30,
    MIN_PRODUCT_NAME_LENGTH: 3,
    MAX_COLOR_IMAGES: 3
  },
  PATTERNS: {
    IGNORE_WORDS: ['كل', 'جميع', 'أي', 'هذا', 'ذلك', 'التي', 'الذي'],
    SHORT_YES: ['اه', 'ايوه', 'ايوة', 'نعم', 'تمام', 'ماشي', 'اوكي', 'تمام اوي', 'تمام جدا', 'اه تمام'],
    EXCLUDE_PRODUCT_NAMES: ['AI', 'API'],
    EXCLUDE_WORDS: ['صور', 'كل', 'جميع']
  },
  AI_CONFIG: {
    MODEL: 'gemini-2.5-flash',
    TEMPERATURE: 0.1,
    MAX_TOKENS: 200
  }
};

class ImageProcessor {
  constructor(aiAgentService) {
    this.prisma = getSharedPrismaClient();
    // ✅ حفظ reference لـ aiAgentService للوصول للدوال المساعدة
    this.aiAgentService = aiAgentService;
    // ✅ Store constants for easy access
    this.CONSTANTS = CONSTANTS;
    // ✅ Initialize logger
    this.logger = new Logger('ImageProcessor');
  }

  /**
   * Helper: Extract English product name from text
   * @param {string} text - Text to extract product name from
   * @returns {string|null} - Product name or null
   */
  extractEnglishProductName(text) {
    if (!text || typeof text !== 'string') return null;

    const englishMatch = text.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/);
    if (englishMatch && englishMatch[1]) {
      const productName = englishMatch[1].trim();
      if (!CONSTANTS.PATTERNS.EXCLUDE_PRODUCT_NAMES.includes(productName) &&
        productName.length > CONSTANTS.THRESHOLDS.MIN_PRODUCT_NAME_LENGTH) {
        return productName;
      }
    }
    return null;
  }

  /**
   * Helper: Extract Arabic product name from text
   * @param {string} text - Text to extract product name from
   * @returns {string|null} - Product name or null
   */
  extractArabicProductName(text) {
    if (!text || typeof text !== 'string') return null;

    // Pattern: اسم بعد "ال" مباشرة
    const afterAlPattern = text.match(/ال\s+([\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){0,3})/);
    if (afterAlPattern && afterAlPattern[1]) {
      const potentialName = afterAlPattern[1].trim();
      if (potentialName.length >= CONSTANTS.THRESHOLDS.MIN_PRODUCT_NAME_LENGTH &&
        !CONSTANTS.PATTERNS.EXCLUDE_WORDS.includes(potentialName.toLowerCase())) {
        return potentialName;
      }
    }
    return null;
  }

  /**
   * Helper: Normalize product name
   * @param {string} name - Product name to normalize
   * @returns {string} - Normalized product name
   */
  normalizeProductName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().replace(/^ال/, ''); // Remove "ال" prefix
  }

  /**
   * Helper: Check if word should be ignored
   * @param {string} word - Word to check
   * @param {Array} ignoreList - List of words to ignore
   * @returns {boolean} - True if word should be ignored
   */
  shouldIgnoreWord(word, ignoreList = CONSTANTS.PATTERNS.IGNORE_WORDS) {
    if (!word || typeof word !== 'string') return true;
    return ignoreList.some(ignoreWord => word.toLowerCase().includes(ignoreWord.toLowerCase()));
  }

  /**
   * Helper: Parse JSON safely
   * @param {string} jsonString - JSON string to parse
   * @param {*} defaultValue - Default value if parsing fails
   * @returns {*} - Parsed JSON or default value
   */
  parseJSONSafely(jsonString, defaultValue = null) {
    try {
      if (!jsonString || typeof jsonString !== 'string') return defaultValue;
      return JSON.parse(jsonString);
    } catch (error) {
      this.logger.error('Error parsing JSON', { error: error.message });
      return defaultValue;
    }
  }

  /**
   * Helper: Extract product from conversation memory
   * @param {Array} memory - Conversation memory
   * @param {number} limit - Maximum number of messages to check
   * @returns {string|null} - Product name or null
   */
  extractProductFromMemory(memory, limit = CONSTANTS.MEMORY_LIMITS.RECENT_MESSAGES) {
    if (!Array.isArray(memory) || memory.length === 0) return null;

    const recentMessages = memory.slice(-limit).reverse();
    for (const msg of recentMessages) {
      const content = msg.content || msg.userMessage || '';
      const englishName = this.extractEnglishProductName(content);
      if (englishName) return englishName;

      const arabicName = this.extractArabicProductName(content);
      if (arabicName) return arabicName;
    }
    return null;
  }

  /**
   * 🧠 استخدام الذكاء الاصطناعي المتقدم لتحديد طلب الصور
   * @param {string} message - رسالة العميل
   * @param {Array} conversationMemory - ذاكرة المحادثة السابقة
   * @param {string} companyId - معرف الشركة
   * @returns {Promise<boolean>} - true إذا كان العميل يطلب صور، false خلاف ذلك
   * @throws {ValidationError} إذا كانت المدخلات غير صحيحة
   */
  async isCustomerRequestingImages(message, conversationMemory, companyId) {
    try {
      // ✅ Input Validation
      if (!message || typeof message !== 'string') {
        throw new ValidationError('message must be a non-empty string', { message, type: typeof message });
      }
      if (!Array.isArray(conversationMemory)) {
        throw new ValidationError('conversationMemory must be an array', { conversationMemory, type: typeof conversationMemory });
      }
      if (!companyId || typeof companyId !== 'string') {
        throw new ValidationError('companyId must be a non-empty string', { companyId, type: typeof companyId });
      }

      // Fetch custom detection settings from AiSettings
      const aiSettings = await safeQuery(async () => {
        return await getSharedPrismaClient().aiSetting.findUnique({
          where: { companyId },
          select: { responseRules: true }
        });
      });

      let customFallbacks = {};
      if (aiSettings?.responseRules) {
        try {
          const rules = JSON.parse(aiSettings.responseRules);
          customFallbacks = rules.fallbacks || {};
        } catch (e) {
          this.logger.warn('Failed to parse responseRules for detection', { error: e.message });
        }
      }


      // بناء السياق من المحادثة السابقة
      let conversationContext = '';
      if (conversationMemory.length > 0) {
        const recentMessages = conversationMemory.slice(-CONSTANTS.MEMORY_LIMITS.RECENT_MESSAGES);
        conversationContext = recentMessages.map(memory =>
          `العميل: ${memory.userMessage}\nالرد: ${memory.aiResponse}`
        ).join('\n---\n');
      } else {
      }

      const msgLower = (message || '').toLowerCase().trim();

      // ⚡ Quick rule 1: Explicit image request keywords (very high confidence)
      let explicitImageWords = [
        'صور', 'صورة', 'صوره', 'ممكن صورة', 'ابعتلي صور', 'ابعت صور',
        'عايز صور', 'عايزه صور', 'عايزة صور', 'عاوز صور', 'عاوزة صور',
        'اريد صور', 'اشوف صور', 'شوف صور', 'وريني صور', 'ورني صور',
        'ابعتي صور', 'ابعتيلي صور', 'ابعتى صور'
      ];

      // Override with custom keywords if exists
      if (customFallbacks.explicit_image_keywords) {
        explicitImageWords = customFallbacks.explicit_image_keywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      }

      // Check for explicit image request
      const hasExplicitImageRequest = explicitImageWords.some(keyword => {
        const keywordLower = keyword.toLowerCase();
        // Match whole word or at word boundary
        return msgLower.includes(keywordLower);
      });

      if (hasExplicitImageRequest) {
        this.logger.debug('Explicit image request detected - returning true immediately');
        return true;
      }

      // ⚡ Quick rule 0: Price question - NO IMAGES (لكن بعد فحص طلب الصور الصريح)
      // ✅ Fix: بعض العملاء يسألوا عن السعر + الصور معاً ("بكام؟ ابعت صور")، فلازم نحترم طلب الصور الصريح
      let priceKeywords = [
        'عامل كام', 'عاملة كام', 'عامله كام',
        'بكام', 'بكم', 'ب كام', 'ب كم',
        'سعره', 'سعرها', 'سعر ال', 'سعر',
        'ثمنه', 'ثمنها', 'ثمن',
        'تمنه', 'تمنها', 'تمن',
        'كام الثمن', 'كام التمن', 'كام السعر'
      ];

      // Override with custom keywords if exists
      if (customFallbacks.price_keywords) {
        priceKeywords = customFallbacks.price_keywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      }

      const isPriceQuestion = priceKeywords.some(keyword => msgLower.includes(keyword));

      if (isPriceQuestion) {
        this.logger.debug('Price question detected (no explicit image request) - returning FALSE (no images)');
        return false;
      }

      // ⚡ Quick rule 2: if last AI asked about sending images and user replied with a short affirmative, treat as requesting images
      try {
        const shortYes = CONSTANTS.PATTERNS.SHORT_YES;
        const userSaidYes = shortYes.some(y => msgLower.includes(y)) && msgLower.length <= CONSTANTS.THRESHOLDS.SHORT_MESSAGE;

        if (userSaidYes && Array.isArray(conversationMemory) && conversationMemory.length > 0) {
          const recent = conversationMemory.slice(-CONSTANTS.MEMORY_LIMITS.RECENT_MESSAGES);
          let aiOffersImagesPatterns = [
            'أبعتلك صور', 'ابعتلك صور', 'أبعت لك صور', 'ابعت لك صور',
            'أبعتلك صوره', 'ابعتلك صوره', 'أبعت لك صوره', 'ابعت لك صوره',
            'تحبي أبعتلك صور', 'تحب أبعتلك صور', 'عايزه صورته', 'عايز صورته',
            'أبعت الصور', 'ابعت الصور', 'أبعتلك الصورة', 'ابعتلك الصورة',
            'تبقي عايز صور', 'تحبي اشوفك صور', 'ارسل الصور'
          ].map(s => s.toLowerCase());

          // Override with custom patterns if exists
          if (customFallbacks.ai_offers_images_patterns) {
            aiOffersImagesPatterns = customFallbacks.ai_offers_images_patterns.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          }

          const aiRecentlyOfferedImages = recent.some(m => {
            // NEW FORMAT: content/isFromCustomer
            if (m && m.content && m.isFromCustomer === false) {
              const aiText = (m.content || '').toLowerCase();
              return aiOffersImagesPatterns.some(p => aiText.includes(p));
            }
            // OLD FORMAT: aiResponse/userMessage
            if (m && m.aiResponse) {
              const aiText = (m.aiResponse || '').toLowerCase();
              return aiOffersImagesPatterns.some(p => aiText.includes(p));
            }
            return false;
          });

          if (aiRecentlyOfferedImages) {
            return true;
          }
        }
      } catch (quickRuleErr) {
        // Ignore and continue to AI detection
      }

      // Prompt متقدم للذكاء الاصطناعي
      const advancedImageRequestPrompt = `
أنت خبير في فهم نوايا العملاء. حلل الرسالة التالية بعمق لتحديد إذا كان العميل يريد رؤية صور للمنتجات.

الرسالة الحالية: "${message}"

${conversationContext ? `سياق المحادثة السابقة:\n${conversationContext}\n` : ''}

معايير التحليل:
1. الطلب المباشر للصور: "ممكن صورة"، "ابعتلي صور"، "عايز أشوف صور"
2. الطلب غير المباشر: "عايز أشوف"، "وريني"، "كيف شكله"، "شكله ايه"
3. السياق العام: هل يسأل عن منتج ويريد رؤيته؟
4. النية الضمنية: هل يبدو مهتم برؤية المنتج بصرياً؟

تجنب الإيجابيات الخاطئة:
- "أشوف المتاح" = يريد معرفة ما متوفر (ليس بالضرورة صور)
- "شوف لي" = قد يعني البحث وليس الصور
- "إيه اللي عندكم" = استفسار عام وليس طلب صور

حلل بعناية وأجب:
- "نعم" إذا كان يطلب صور بوضوح (مباشر أو غير مباشر)
- "لا" إذا كان مجرد استفسار عام أو لا يريد صور

التحليل والقرار:`;

      const response = await this.aiAgentService.generateAIResponse(advancedImageRequestPrompt, [], false, null, companyId);

      // ✅ FIX: Check for null response before using trim()
      if (!response || typeof response !== 'string') {
        this.logger.warn('AI response is null or invalid for image request detection', { response });
        // Fallback to explicit keywords
        const explicitImageKeywords = [
          'ممكن صورة', 'ابعتلي صور', 'عايز صور', 'اريد صور',
          'صورة للمنتج', 'صور المنتج', 'وريني صور'
        ];
        const messageNormalized = message.toLowerCase();
        return explicitImageKeywords.some(keyword => messageNormalized.includes(keyword));
      }

      const analysisText = response.trim().toLowerCase();

      // تحليل أكثر دقة للرد
      const containsYes = analysisText.includes('نعم');
      const containsNoYes = analysisText.includes('لا نعم');
      const isRequesting = containsYes && !containsNoYes;


      // تسجيل مفصل للتحليل

      return isRequesting;

    } catch (error) {
      this.logger.error('Error in AI analysis', { error: error.message, stack: error.stack });

      // Fallback محدود جداً - فقط للطلبات الواضحة
      const explicitImageKeywords = [
        'ممكن صورة', 'ابعتلي صور', 'عايز صور', 'اريد صور',
        'صورة للمنتج', 'صور المنتج', 'وريني صور'
      ];

      const messageNormalized = message.toLowerCase();
      const hasExplicitRequest = explicitImageKeywords.some(keyword =>
        messageNormalized.includes(keyword)
      );

      return hasExplicitRequest;
    }
  }

  /**
   * Use AI to find products from conversation context
   * @param {string} message - رسالة العميل
   * @param {Array} conversationMemory - ذاكرة المحادثة السابقة
   * @returns {Promise<Array>} - مصفوفة المنتجات المستخرجة من السياق
   * @throws {ValidationError} إذا كانت المدخلات غير صحيحة
   */
  async findProductsFromContext(message, conversationMemory) {
    try {
      // ✅ Input Validation
      if (!message || typeof message !== 'string') {
        throw new ValidationError('message must be a non-empty string', { message, type: typeof message });
      }
      if (!Array.isArray(conversationMemory)) {
        throw new ValidationError('conversationMemory must be an array', { conversationMemory, type: typeof conversationMemory });
      }

      // Build context from recent conversation
      const recentMessages = conversationMemory.slice(-CONSTANTS.MEMORY_LIMITS.MULTIPLE_PRODUCTS);
      const conversationContext = recentMessages.map(memory =>
        `العميل: ${memory.userMessage}\nالرد: ${memory.aiResponse}`
      ).join('\n---\n');

      const contextPrompt = `
بناءً على سياق المحادثة التالية، هل تم ذكر أي منتجات؟

${conversationContext}

الرسالة الحالية: "${message}"

إذا تم ذكر منتجات في المحادثة، أجب بـ "نعم"
إذا لم يتم ذكر أي منتجات، أجب بـ "لا"
`;

      const response = await this.aiAgentService.generateAIResponse(contextPrompt, [], false);
      const hasProductContext = response.trim().toLowerCase().includes('نعم');

      if (hasProductContext) {
        if (!this.aiAgentService.ragService) {
          this.aiAgentService.ragService = ragService;
          await this.aiAgentService.ragService.ensureInitialized();
        }
        return await this.aiAgentService.ragService.retrieveData('منتج', 'product_inquiry', null); // companyId سيتم تمريره لاحقاً
      }

      return [];

    } catch (error) {
      return [];
    }
  }

  /**
   * ✅ ENHANCED: Find specific product from conversation context with improved memory extraction
   * @param {string} message - رسالة العميل
   * @param {Array} conversationMemory - ذاكرة المحادثة السابقة
   * @param {string} companyId - معرف الشركة
   * @returns {Promise<Object|null>} - المنتج المحدد أو null
   */
  async findSpecificProductFromContext(message, conversationMemory, companyId) {
    try {
      // ✅ استخدام productExtractor المحسن
      const productExtractor = require('./productExtractor');
      const productInfo = productExtractor.extractProduct(message, conversationMemory, []);

      if (productInfo && productInfo.productName) {
        this.logger.debug('Product extracted from context:', productInfo.productName);

        // البحث عن المنتج في قاعدة البيانات
        const product = await this.prisma.product.findFirst({
          where: {
            companyId: companyId,
            OR: [
              { name: { contains: productInfo.productName, mode: 'insensitive' } },
              { description: { contains: productInfo.productName, mode: 'insensitive' } }
            ]
          },
          select: {
            id: true,
            name: true,
            price: true,
            description: true,
            images: true
          }
        });

        if (product) {
          this.logger.debug('✅ Found matching product in database:', product.name);
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            images: product.images
          };
        } else {
          this.logger.debug('⚠️ Product mentioned in conversation but not found in database:', productInfo.productName);
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Error finding specific product from context:', error);
      return null;
    }
  }

  /**
   * Extract product ID from RAG data
   * @param {Object} ragItem - عنصر RAG data
   * @returns {Promise<string|null>} - معرف المنتج أو null
   * @throws {ValidationError} إذا كان ragItem غير صحيح
   */
  async extractProductIdFromRAG(ragItem) {
    try {
      // ✅ Input Validation
      if (!ragItem || typeof ragItem !== 'object') {
        throw new ValidationError('ragItem must be an object', { ragItem, type: typeof ragItem });
      }

      // Search for product in database based on RAG content
      const products = await safeQuery(async () => {
        return await this.prisma.product.findMany({
          where: {
            OR: [
              { name: { contains: 'كوتشي' } },
              { name: { contains: 'حذاء' } },
              { name: { contains: 'حريمي' } }
            ]
          }
        });
      }, 6); // Priority 6 - عملية عادية

      return products.length > 0 ? products[0].id : null;
    } catch (error) {
      this.logger.error('Error extracting product ID:', { error: error.message, stack: error.stack });
      return null;
    }
  }

  /**
   * Get product images from database
   * @param {string} productId - معرف المنتج
   * @returns {Promise<Array>} - مصفوفة الصور
   * @throws {ValidationError} إذا كان productId غير صحيح
   */
  async getProductImagesFromDB(productId) {
    try {
      // ✅ Input Validation
      if (!productId || typeof productId !== 'string') {
        throw new ValidationError('productId must be a non-empty string', { productId, type: typeof productId });
      }

      const product = await safeQuery(async () => {
        return await this.prisma.product.findUnique({
          where: { id: productId },
          include: {
            product_variants: true
          }
        });
      }, 6); // Priority 6 - عملية عادية

      if (!product) {
        return this.getDefaultProductImages();
      }

      const productImages = [];

      // Check for product images in JSON format - اخذ أول صورة فقط
      if (product.images) {
        try {
          const parsedImages = JSON.parse(product.images);
          if (Array.isArray(parsedImages) && parsedImages.length > 0) {

            // أخذ أول صورة فقط بدلاً من كل الصور
            const firstImageUrl = parsedImages[0];
            productImages.push({
              type: 'image',
              payload: {
                url: firstImageUrl,
                title: `${product.name}`
              }
            });
          }
        } catch (parseError) {
        }
      }

      // Check for single image URL
      if (product.imageUrl && productImages.length === 0) {
        productImages.push({
          type: 'image',
          payload: {
            url: product.imageUrl,
            title: `${product.name} - صورة المنتج`
          }
        });
      }

      // Check variant images
      if (product.product_variants && product.product_variants.length > 0) {
        product.product_variants.forEach((variant, index) => {
          if (variant.imageUrl) { // ✅ إزالة الحد - إضافة كل variant images
            productImages.push({
              type: 'image',
              payload: {
                url: variant.imageUrl,
                title: `${product.name} - ${variant.color || variant.name}`
              }
            });
          }
        });
      }

      if (productImages.length > 0) {
        return productImages; // ✅ إرجاع كل الصور بدون حد
      } else {
        return this.getCustomizedProductImages(product);
      }

    } catch (error) {
      this.logger.error('Error getting product images from DB:', { error: error.message, stack: error.stack });
      return this.getDefaultProductImages();
    }
  }

  /**
   * Get customized product images based on product data
   */
  getCustomizedProductImages(product) {
    // Use real, accessible image URLs that Facebook can download
    return [
      {
        type: 'image',
        payload: {
          url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
          title: `${product.name} - صورة المنتج`
        }
      },
      {
        type: 'image',
        payload: {
          url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop',
          title: `${product.name} - زاوية أخرى`
        }
      },
      {
        type: 'image',
        payload: {
          url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop',
          title: `${product.name} - التفاصيل`
        }
      }
    ];
  }

  /**
   * ❌ معطل - لا نرسل صور افتراضية بعد الآن
   */
  getDefaultProductImages() {
    return [];
  }

  /**
   * فلترة الصور بناءً على اللون المطلوب
   * @param {Array} images - مصفوفة الصور
   * @param {string} customerMessage - رسالة العميل
   * @returns {Promise<Array>} - مصفوفة الصور المفلترة حسب اللون
   * @throws {ValidationError} إذا كانت المدخلات غير صحيحة
   */
  async filterImagesByColor(images, customerMessage) {
    try {
      // ✅ Input Validation
      if (!Array.isArray(images)) {
        throw new ValidationError('images must be an array', { images, type: typeof images });
      }
      if (!customerMessage || typeof customerMessage !== 'string') {
        throw new ValidationError('customerMessage must be a non-empty string', { customerMessage, type: typeof customerMessage });
      }


      // كشف الألوان المطلوبة (محدث ليشمل الألف واللام)
      const colorKeywords = {
        'ابيض': ['أبيض', 'ابيض', 'الابيض', 'الأبيض', 'white'],
        'اسود': ['أسود', 'اسود', 'الاسود', 'الأسود', 'black'],
        'احمر': ['أحمر', 'احمر', 'الاحمر', 'الأحمر', 'red'],
        'ازرق': ['أزرق', 'ازرق', 'الازرق', 'الأزرق', 'blue'],
        'اخضر': ['أخضر', 'اخضر', 'الاخضر', 'الأخضر', 'green'],
        'اصفر': ['أصفر', 'اصفر', 'الاصفر', 'الأصفر', 'yellow'],
        'بني': ['بني', 'البني', 'brown'],
        'رمادي': ['رمادي', 'الرمادي', 'gray', 'grey'],
        'بيج': ['بيج', 'البيج', 'beige']
      };

      const normalizedMessage = customerMessage.toLowerCase();

      let requestedColor = null;

      // البحث عن اللون المطلوب
      for (const [color, variants] of Object.entries(colorKeywords)) {
        const found = variants.some(variant => {
          return normalizedMessage.includes(variant.toLowerCase());
        });

        if (found) {
          requestedColor = color;
          break;
        }
      }

      // إذا لم يتم طلب لون محدد، أرجع جميع الصور
      if (!requestedColor) {
        return images;
      }


      // 🔍 البحث عن صور تحتوي على اللون المطلوب
      let filteredImages = images.filter((image) => {
        const title = image.payload.title.toLowerCase();
        const url = image.payload.url.toLowerCase();
        const variantName = image.payload.variantName?.toLowerCase() || '';

        // البحث عن اللون في العنوان، الرابط، أو اسم المتغير
        const colorVariants = colorKeywords[requestedColor];

        const foundMatch = colorVariants.some(variant => {
          const variantLower = variant.toLowerCase();
          const titleMatch = title.includes(variantLower);
          const urlMatch = url.includes(variantLower);
          const variantMatch = variantName.includes(variantLower) || variantName === variantLower;

          return titleMatch || urlMatch || variantMatch;
        });

        return foundMatch;
      });

      // إذا لم نجد صور بالون المطلوب، نبحث في قاعدة البيانات
      if (filteredImages.length === 0) {

        // محاولة البحث في قاعدة البيانات عن منتجات بالون المطلوب
        filteredImages = await this.searchImagesByColorInDatabase(requestedColor, images);

      }

      // إذا لم نجد أي صور بالون المطلوب، نرجع مصفوفة فارغة
      if (filteredImages.length === 0) {
        return [];
      }

      // تحديث عناوين الصور المفلترة
      filteredImages.forEach((image) => {
        if (image.payload && image.payload.title) {
          // إضافة اللون للعنوان إذا لم يكن موجود
          if (!image.payload.title.toLowerCase().includes(requestedColor)) {
            image.payload.title += ` - اللون ${requestedColor}`;
          }
        }
      });

      return filteredImages;

    } catch (error) {
      this.logger.error('[COLOR-FILTER] Error filtering images by color:', { error: error.message, stack: error.stack });
      return images; // في حالة الخطأ، أرجع جميع الصور
    }
  }

  /**
   * 🔍 البحث عن صور بلون محدد في قاعدة البيانات
   * @param {string} requestedColor - اللون المطلوب
   * @param {Array} [fallbackImages] - صور بديلة إذا لم يتم العثور على صور باللون المطلوب
   * @returns {Promise<Array>} - مصفوفة الصور المطابقة للون المطلوب
   * @throws {ValidationError} إذا كان requestedColor غير صحيح
   */
  async searchImagesByColorInDatabase(requestedColor, fallbackImages) {
    try {
      // ✅ Input Validation
      if (!requestedColor || typeof requestedColor !== 'string') {
        throw new ValidationError('requestedColor must be a non-empty string', { requestedColor, type: typeof requestedColor });
      }
      if (fallbackImages && !Array.isArray(fallbackImages)) {
        throw new ValidationError('fallbackImages must be an array if provided', { fallbackImages, type: typeof fallbackImages });
      }


      // البحث في قاعدة البيانات عن منتجات بالون المطلوب
      const colorVariants = {
        'ابيض': ['أبيض', 'ابيض', 'الابيض', 'الأبيض', 'white', 'White'],
        'اسود': ['أسود', 'اسود', 'الاسود', 'الأسود', 'black', 'Black'],
        'احمر': ['أحمر', 'احمر', 'الاحمر', 'الأحمر', 'red', 'Red'],
        'ازرق': ['أزرق', 'ازرق', 'الازرق', 'الأزرق', 'blue', 'Blue'],
        'اخضر': ['أخضر', 'اخضر', 'الاخضر', 'الأخضر', 'green', 'Green'],
        'اصفر': ['أصفر', 'اصفر', 'الاصفر', 'الأصفر', 'yellow', 'Yellow'],
        'بني': ['بني', 'البني', 'brown', 'Brown'],
        'رمادي': ['رمادي', 'الرمادي', 'gray', 'grey', 'Gray', 'Grey'],
        'بيج': ['بيج', 'البيج', 'beige', 'Beige']
      };

      const searchTerms = colorVariants[requestedColor] || [requestedColor];

      // البحث في جدول المنتجات والمتغيرات
      const products = await safeQuery(async () => {
        return await this.prisma.product.findMany({
          where: {
            OR: [
              { name: { contains: searchTerms[0] } },
              { name: { contains: searchTerms[1] } },
              { description: { contains: searchTerms[0] } },
              { description: { contains: searchTerms[1] } },
              // البحث في المتغيرات
              {
                product_variants: {
                  some: {
                    type: 'color',
                    name: { in: searchTerms },
                    isActive: true
                  }
                }
              }
            ],
            isActive: true
          },
          include: {
            product_variants: {
              where: {
                type: 'color',
                name: { in: searchTerms },
                isActive: true
              }
            }
          },
          take: 3
        });
      }, 6); // Priority 6 - عملية عادية

      const colorImages = [];

      for (const product of products) {
        // فحص المتغيرات أولاً (أولوية للألوان المحددة) - أخذ أول صورة فقط
        if (product.product_variants && product.product_variants.length > 0) {
          for (const variant of product.product_variants) {
            if (variant.images) {
              try {
                const variantImages = JSON.parse(variant.images);
                if (Array.isArray(variantImages) && variantImages.length > 0) {
                  // أخذ أول صورة فقط من كل variant
                  const firstVariantImage = variantImages[0];
                  colorImages.push({
                    type: 'image',
                    payload: {
                      url: firstVariantImage,
                      title: `${product.name} - اللون ${variant.name}`
                    }
                  });
                }
              } catch (parseError) {
              }
            }
          }
        }

        // إذا لم نجد صور في المتغيرات، فحص صور المنتج العامة
        if (colorImages.length === 0) {
          if (product.images) {
            try {
              const parsedImages = JSON.parse(product.images);
              if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                // أخذ أول صورة فقط من الصور العامة
                const firstGeneralImage = parsedImages[0];
                colorImages.push({
                  type: 'image',
                  payload: {
                    url: firstGeneralImage,
                    title: `${product.name} - اللون ${requestedColor}`
                  }
                });
              }
            } catch (parseError) {
            }
          }

          // فحص صورة واحدة
          if (product.imageUrl && colorImages.length < 3) {
            colorImages.push({
              type: 'image',
              payload: {
                url: product.imageUrl,
                title: `${product.name} - اللون ${requestedColor}`
              }
            });
          }
        }
      }

      if (colorImages.length > 0) {
        return colorImages.slice(0, CONSTANTS.THRESHOLDS.MAX_COLOR_IMAGES);
      }

      return [];

    } catch (error) {
      this.logger.error('[DB-COLOR-SEARCH] Database search failed:', { error: error.message, stack: error.stack });
      return [];
    }
  }

  /**
   * دالة موحدة ذكية للحصول على الرد والصور
   * @param {string} customerMessage - رسالة العميل
   * @param {string} intent - نية العميل (product_inquiry, price_inquiry, etc.)
   * @param {Array} conversationMemory - ذاكرة المحادثة السابقة
   * @param {string} [customerId] - معرف العميل (اختياري)
   * @param {string} companyId - معرف الشركة
   * @returns {Promise<Object>} - كائن يحتوي على images و ragData و hasSpecificProduct و productInfo
   * @throws {ValidationError} إذا كانت المدخلات غير صحيحة
   */
  async getSmartResponse(customerMessage, intent, conversationMemory, customerId, companyId) {
    try {
      // ✅ Input Validation
      if (!customerMessage || typeof customerMessage !== 'string') {
        throw new ValidationError('customerMessage must be a non-empty string', { customerMessage, type: typeof customerMessage });
      }
      if (!intent || typeof intent !== 'string') {
        throw new ValidationError('intent must be a non-empty string', { intent, type: typeof intent });
      }
      if (!Array.isArray(conversationMemory)) {
        throw new ValidationError('conversationMemory must be an array', { conversationMemory, type: typeof conversationMemory });
      }
      if (customerId && typeof customerId !== 'string') {
        throw new ValidationError('customerId must be a string if provided', { customerId, type: typeof customerId });
      }
      if (!companyId || typeof companyId !== 'string') {
        throw new ValidationError('companyId must be a non-empty string', { companyId, type: typeof companyId });
      }


      // فحص إذا كان العميل يطلب صور
      const wantsImages = await this.isCustomerRequestingImages(customerMessage, conversationMemory, companyId);

      // الحصول على RAG data أولاً (سنحتاجها في جميع الحالات)
      // ✅ ragService is now imported at top level
      let ragData = [];
      let productImages = [];

      // ✅ الأولوية القصوى: فحص الرسالة الحالية أولاً قبل البحث في الذاكرة
      // إذا ذكر العميل منتج في رسالته الحالية، نستخدمه مباشرة
      let productFromCurrentMessage = null;
      let productNameFromCurrentMessage = null; // للتوافق مع الكود الموجود
      const msgLower = customerMessage.toLowerCase();

      // ✅ فحص الرسالة الحالية دائماً، ليس فقط عند isVagueImageRequest
      this.logger.debug('فحص الرسالة الحالية للبحث عن اسم منتج');

      // Pattern 1: منتج بالإنجليزي في الرسالة الحالية
      const englishMatch = customerMessage.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/);
      if (englishMatch && englishMatch[1]) {
        const productName = englishMatch[1].trim();
        if (!CONSTANTS.PATTERNS.EXCLUDE_PRODUCT_NAMES.includes(productName) && productName.length > CONSTANTS.THRESHOLDS.MIN_PRODUCT_NAME_LENGTH) {
          productFromCurrentMessage = productName;
          productNameFromCurrentMessage = productName;
          this.logger.debug('تم استخراج منتج (EN) من الرسالة الحالية', { product: productFromCurrentMessage });
        }
      }

      // 🆕 فحص خاص: لو العميل يطلب صور/معلومات بدون ذكر منتج محدد
      const isVagueImageRequest = (msgLower.includes('صور') || msgLower.includes('ابعت') ||
        msgLower.includes('ارسل') || msgLower.includes('شوف') ||
        msgLower.includes('عايز') || msgLower.includes('اشوف'));

      if (!productNameFromCurrentMessage && isVagueImageRequest) {

        // Pattern 1: اسم منتج بالإنجليزي (Capital letters) - مثل "Belle", "UGG", "Chelsea Boot"
        const englishMatch = customerMessage.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/);
        if (englishMatch && englishMatch[1]) {
          productNameFromCurrentMessage = englishMatch[1].trim();
          this.logger.debug('تم العثور على منتج في الرسالة الحالية (EN)', { product: productNameFromCurrentMessage });
        }

        // Pattern 2: اسم منتج بعد "ال" - مثل "عايز اشوف ال belle" أو "ال Belle Boot"
        if (!productNameFromCurrentMessage) {
          // Pattern 2a: اسم إنجليزي بعد "ال" مباشرة (حروف كبيرة أو صغيرة)
          const afterAlEnglishPattern = customerMessage.match(/ال\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,3})/);
          if (afterAlEnglishPattern && afterAlEnglishPattern[1]) {
            const potentialName = afterAlEnglishPattern[1].trim();
            // تجاهل الكلمات القصيرة جداً أو الكلمات العامة
            if (potentialName.length >= CONSTANTS.THRESHOLDS.MIN_PRODUCT_NAME_LENGTH && !CONSTANTS.PATTERNS.EXCLUDE_WORDS.includes(potentialName.toLowerCase())) {
              productNameFromCurrentMessage = potentialName;
              this.logger.debug('تم العثور على منتج في الرسالة الحالية (ال + EN)', { product: productNameFromCurrentMessage });
            }
          }

          // Pattern 2b: اسم عربي بعد "ال"
          if (!productNameFromCurrentMessage) {
            const afterAlPattern = customerMessage.match(/ال\s+([أ-ي\s]{2,40})/);
            if (afterAlPattern && afterAlPattern[1]) {
              const potentialName = afterAlPattern[1].trim();
              // تجاهل الكلمات العامة
              const ignoreWords = ['كل', 'جميع', 'أي', 'هذا', 'ذلك', 'التي', 'الذي', 'صور', 'منتجات', 'بوتات'];
              if (!ignoreWords.some(word => potentialName.toLowerCase().includes(word.toLowerCase()))) {
                productNameFromCurrentMessage = potentialName;
                this.logger.debug('تم العثور على منتج في الرسالة الحالية (بعد ال - AR)', { product: productNameFromCurrentMessage });
              }
            }
          }
        }

        // Pattern 3: اسم منتج بالعربي بعد كلمات مفتاحية
        if (!productNameFromCurrentMessage) {
          const arabicPatterns = [
            /(?:عايز|محتاج|أشوف|اشوف|عاوز)\s+["']?([أ-ي\s]{2,40})["']?\s*(?:متاح|موجود|ب\s*كام|؟)?/i,
            /سعر\s+["']?([أ-ي\s]{2,40})["']?\s*(?:كام|؟)?/i,
            /["']([أ-ي\s]{2,40})["']\s*(?:متوفر|متاح|سعره|ب)/i,
            /(?:عندنا|لدينا)\s+["']?([أ-ي\s]{2,40})["']?\s*(?:متوفر|ب|سعر)/i
          ];

          for (const pattern of arabicPatterns) {
            const arabicMatch = customerMessage.match(pattern);
            if (arabicMatch && arabicMatch[1]) {
              const productName = arabicMatch[1].trim();
              // تجاهل الكلمات العامة
              const ignoreWords = ['كل', 'جميع', 'أي', 'هذا', 'ذلك', 'التي', 'الذي', 'صور', 'منتجات'];
              if (!ignoreWords.some(word => productName === word)) {
                productNameFromCurrentMessage = productName;
                this.logger.debug('تم العثور على منتج في الرسالة الحالية (AR)', { product: productNameFromCurrentMessage });
                break;
              }
            }
          }
        }

        // ✅ PRIORITY 2: فقط إذا لم يوجد منتج في الرسالة الحالية، البحث في المحادثة السابقة
        if (!productNameFromCurrentMessage && conversationMemory && conversationMemory.length > 0) {
          this.logger.debug('لم يتم العثور على منتج في الرسالة الحالية - البحث في المحادثة السابقة');

          // استخراج آخر منتج من المحادثة
          const recentMessages = conversationMemory.slice(-CONSTANTS.MEMORY_LIMITS.CONTEXT_SEARCH).reverse();
          let lastProductName = null;

          for (const msg of recentMessages) {
            const content = msg.content || '';

            // Pattern 1: اسم منتج بالإنجليزي (Capital letters)
            const englishMatch = content.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/);
            if (englishMatch && englishMatch[1]) {
              lastProductName = englishMatch[1];
              this.logger.debug('تم العثور على آخر منتج من المحادثة (EN)', { product: lastProductName });
              break;
            }

            // Pattern 2: اسم منتج بالعربي بعد كلمات مفتاحية
            const arabicPatterns = [
              /منتج\s+["']?([أ-ي\s]{2,40})["']?\s*(?:متوفر|متاح|سعره|ب|،|\.)/,
              /المنتج\s+["']?([أ-ي\s]{2,40})["']?\s*(?:متوفر|متاح|سعره|ب|،|\.)/,
              /سعر\s+["']?([أ-ي\s]{2,40})["']?\s*(?:هو|:|\d)/,
              /["']([أ-ي\s]{2,40})["']\s*(?:متوفر|متاح|سعره|ب)/,
              /(?:عندنا|لدينا)\s+["']?([أ-ي\s]{2,40})["']?\s*(?:متوفر|ب|سعر)/
            ];

            for (const pattern of arabicPatterns) {
              const arabicMatch = content.match(pattern);
              if (arabicMatch && arabicMatch[1]) {
                const productName = arabicMatch[1].trim();
                // تجاهل الكلمات العامة
                const ignoreWords = ['كل', 'جميع', 'أي', 'هذا', 'ذلك', 'التي', 'الذي'];
                if (!ignoreWords.some(word => productName === word)) {
                  lastProductName = productName;
                  this.logger.debug('تم العثور على آخر منتج من المحادثة (AR)', { product: lastProductName });
                  break;
                }
              }
            }

            if (lastProductName) break;
          }

          if (lastProductName) {
            productNameFromCurrentMessage = lastProductName;
            this.logger.info('استخدام آخر منتج من المحادثة', { product: productNameFromCurrentMessage });
          }
        }

        // ✅ استبدال الرسالة باسم المنتج إذا تم العثور عليه
        if (productNameFromCurrentMessage) {
          this.logger.info('إعادة البحث باستخدام اسم المنتج', { product: productNameFromCurrentMessage });
          // استبدال الرسالة بالمنتج المستخرج
          customerMessage = productNameFromCurrentMessage;
        }
      }

      if (wantsImages) {

        // 🆕 PRIORITY 1: فحص إذا كان العميل يطلب category معينة أو كل المنتجات
        this.logger.debug('فحص إذا كان الطلب لـ category معينة');
        const categoryDetection = await ragService.detectCategoryFromMessage(customerMessage, companyId);

        if (categoryDetection && categoryDetection.categoryName && categoryDetection.confidence >= 0.6) {
          this.logger.info('تم اكتشاف category', { category: categoryDetection.categoryName, confidence: categoryDetection.confidence });
          this.logger.debug('Category reasoning', { reasoning: categoryDetection.reasoning });

          // جلب جميع المنتجات من هذا التصنيف
          const categoryResult = await ragService.retrieveProductsByCategory(
            categoryDetection.categoryName,
            companyId
          );

          if (categoryResult.images.length > 0) {
            this.logger.info('تم جلب منتجات من التصنيف', { totalProducts: categoryResult.totalProducts, totalImages: categoryResult.totalImages });

            return {
              images: categoryResult.images,
              ragData: categoryResult.products,
              hasSpecificProduct: false, // هذا category وليس منتج محدد
              categoryInfo: {
                categoryName: categoryDetection.categoryName,
                totalProducts: categoryResult.totalProducts,
                totalImages: categoryResult.totalImages
              }
            };
          } else {
            this.logger.warn('التصنيف لا يحتوي على منتجات بصور', { category: categoryDetection.categoryName });

            // 🔧 FIX: بدلاً من استخدام السياق القديم، ابحث عن المنتج المذكور في الرسالة الحالية
            this.logger.debug('محاولة استخراج اسم منتج من الرسالة الحالية');

            // استخراج الكلمات المفتاحية من الرسالة
            const extractedProductName = customerMessage
              .replace(/^(عايز|عايزه|عاوز|عاوزه|محتاج|محتاجه|ممكن|اشوف|ابعتلي|وريني|اعرف|اشتري|ابي|مهتم|مهتمه|اريد|ارى)\s+/gi, '')
              .replace(/\s+(صور|صورة|صوره|الصور|الصوره)\s*$/gi, '')
              .replace(/^ال/, '') // إزالة "ال" التعريف
              .trim();

            this.logger.debug('اسم المنتج المستخرج', { product: extractedProductName });

            if (extractedProductName && extractedProductName.length > 2) {
              this.logger.debug('البحث عن المنتج في جميع المنتجات', { product: extractedProductName });

              const specificResult = await ragService.retrieveSpecificProduct(
                extractedProductName,
                intent,
                customerId,
                conversationMemory,
                companyId
              );

              if (specificResult && specificResult.isSpecific && specificResult.product) {
                const productName = specificResult.product.metadata?.name;
                this.logger.info('تم العثور على المنتج', { product: productName });

                let specificImages = [];
                if (specificResult.product.metadata?.images && specificResult.product.metadata.images.length > 0) {
                  this.logger.debug('المنتج يحتوي على صور', { count: specificResult.product.metadata.images.length });
                  specificImages = specificResult.product.metadata.images.map((imageUrl, index) => ({
                    type: 'image',
                    payload: {
                      url: imageUrl,
                      title: `${productName} - صورة ${index + 1}`
                    }
                  }));
                }

                const filteredImages = await this.filterImagesByColor(specificImages, customerMessage);

                return {
                  images: filteredImages,
                  ragData: [{
                    type: 'product',
                    content: `منتج متاح: ${productName}`,
                    metadata: {
                      ...specificResult.product.metadata,
                      hasImages: filteredImages.length > 0,
                      confidence: specificResult.confidence,
                      reasoning: specificResult.reasoning
                    }
                  }],
                  hasSpecificProduct: true,
                  productInfo: specificResult
                };
              } else {
                this.logger.warn('لم يتم العثور على منتج بهذا الاسم', { product: extractedProductName });
              }
            }

            this.logger.warn('فشل استخراج المنتج - استمرار للبحث العادي');
            // استمر للبحث العادي فقط إذا فشل كل شيء
          }
        } else {
          this.logger.debug('لم يتم اكتشاف category (أو ثقة منخفضة) - سيتم البحث عن منتج محدد');
        }

        // 🆕 فحص إذا كان العميل طلب أكتر من منتج
        // دعم: "و", "and", "،", "," أو newlines أو إشارة للمنتجات السابقة
        const hasMultipleProducts = /(\s+(و|and|،|,)\s+|\n)/gi.test(customerMessage);
        const refersToMultiple = /(الاتنين|الاثنين|التنين|كلهم|كلاهما|both|all)/gi.test(customerMessage);

        this.logger.debug('فحص منتجات متعددة', { hasMultipleProducts, refersToMultiple });

        // إذا كان العميل يشير لمنتجات متعددة من المحادثة السابقة
        if (refersToMultiple && conversationMemory && conversationMemory.length > 0) {
          this.logger.debug('العميل يشير لمنتجات من المحادثة السابقة');

          // استخراج أسماء المنتجات من آخر رسالة للعميل
          const recentMessages = conversationMemory.slice(-CONSTANTS.MEMORY_LIMITS.MULTIPLE_PRODUCTS);
          const productNames = [];

          for (const msg of recentMessages) {
            // البحث في رسائل العميل والـ AI لاستخراج أسماء المنتجات
            const content = msg.content || msg.userMessage || '';
            if (content) {
              // البحث عن أسماء منتجات بأنماط مختلفة
              // Pattern 1: اسم بالإنجليزي (مثل: Chelsea Boot, Swan Chunky)
              const englishMatches = content.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/g);
              if (englishMatches) {
                productNames.push(...englishMatches);
              }

              // Pattern 2: كوتشي + اسم (مثل: كوتشي سوان شانكي)
              const kotchiMatches = content.match(/كوتشي\s+([^\n.،,؛!?]+)/gi);
              if (kotchiMatches) {
                productNames.push(...kotchiMatches);
              }

              // Pattern 3: البحث عن أسماء منتجات مذكورة في ردود الـ AI
              if (msg.role === 'assistant' || msg.aiResponse) {
                const aiContent = msg.aiResponse || msg.content || '';
                const productMentions = aiContent.match(/(?:عندنا|متوفر|اسمه)\s+([^\n.،,؛!?]{5,30})/gi);
                if (productMentions) {
                  productNames.push(...productMentions.map(m => m.replace(/(?:عندنا|متوفر|اسمه)\s+/gi, '')));
                }
              }
            }
          }

          // إزالة التكرارات وتنظيف أسماء المنتجات
          const uniqueProductNames = [...new Set(productNames.map(name => name.trim()))].filter(name => name.length > 2);

          if (uniqueProductNames.length >= 2) {
            this.logger.info('تم استخراج منتجات فريدة من المحادثة', { count: uniqueProductNames.length, products: uniqueProductNames });

            // البحث عن كل منتج
            // ✅ Performance: استخدام Promise.all لتحسين الأداء (parallel processing)
            const productPromises = uniqueProductNames.map(async (productNameQuery) => {
              this.logger.debug('البحث عن منتج', { product: productNameQuery });

              // ✅ استخدم اسم المنتج مباشرة بدون كلمات زائدة لدقة أعلى
              const specificResult = await ragService.retrieveSpecificProduct(productNameQuery, intent, customerId, conversationMemory, companyId);

              if (specificResult && specificResult.isSpecific && specificResult.product) {
                const productId = specificResult.product.metadata?.id || specificResult.product.metadata?.name;
                const productName = specificResult.product.metadata?.name;

                let specificImages = [];
                if (specificResult.product.metadata?.images && specificResult.product.metadata.images.length > 0) {
                  this.logger.debug('المنتج يحتوي على صور', { count: specificResult.product.metadata.images.length });
                  specificImages = specificResult.product.metadata.images.map((imageUrl, index) => ({
                    type: 'image',
                    payload: {
                      url: imageUrl,
                      title: `${productName} - صورة ${index + 1}`
                    }
                  }));
                }

                // ✅ FIX: foundProductName كان undefined (يسبب ReferenceError ويكسر مسار الصور بالكامل)
                return { specificResult, productId, productName: productName, specificImages };
              }
              return null;
            });

            // ✅ انتظار جميع النتائج بالتوازي
            const productResults = await Promise.all(productPromises);

            // ✅ تجميع النتائج وإزالة التكرارات
            const allProducts = [];
            const allImages = [];
            const foundProductIds = new Set();

            for (const result of productResults) {
              if (!result) continue;

              const { specificResult, productId, productName: resultProductName, specificImages } = result;

              if (foundProductIds.has(productId)) {
                this.logger.debug('المنتج مكرر - تم تخطيه', { product: resultProductName });
                continue;
              }

              this.logger.info('تم العثور على منتج', { product: resultProductName });
              foundProductIds.add(productId);
              allProducts.push(specificResult);

              if (specificImages.length > 0) {
                this.logger.debug('تمت إضافة صور للمنتج', { count: specificImages.length, filtered: false });
                allImages.push(...specificImages);
              }
            }

            if (allProducts.length > 0) {
              this.logger.info('تم العثور على منتجات من المحادثة', { count: allProducts.length, imagesCount: allImages.length });

              ragData = allProducts.map(result => ({
                type: 'product',
                content: `منتج متاح: ${result.product.metadata.name}`,
                metadata: {
                  ...result.product.metadata,
                  hasImages: true,
                  confidence: result.confidence,
                  reasoning: result.reasoning
                }
              }));

              this.logger.info('سيتم إرجاع صور للمنتجات', { count: allImages.length });

              return {
                images: allImages,
                ragData: ragData,
                hasSpecificProduct: true,
                productInfo: allProducts[0],
                multipleProducts: allProducts
              };
            }
          }
        }

        if (hasMultipleProducts) {
          this.logger.debug('العميل طلب منتجات متعددة - تقسيم الطلب');
          this.logger.debug('الرسالة الأصلية', { message: customerMessage });

          // إزالة كلمات الطلب من البداية
          let cleanMessage = customerMessage
            .replace(/^(عايز|عايزه|عاوز|عاوزه|محتاج|محتاجه|ممكن|اشوف|ابعتلي|وريني|اعرف|اشتري|ابي|مهتم|مهتمه|اريد|ارى)\s+/gi, '')
            .trim();

          this.logger.debug('الرسالة بعد التنظيف', { message: cleanMessage });

          // تقسيم الرسالة لمنتجات منفصلة (دعم newlines و separators)
          const productRequests = cleanMessage
            .split(/\s+(و|and|،|,)\s+|\n/gi)
            .map(part => part ? part.trim() : '') // تأكد من أن part موجود
            .filter(part =>
              part && // تأكد من أن part موجود
              part.length > 2 &&
              !['و', 'and', '،', ','].includes(part) &&
              !part.match(/^(عايز|عايزه|اشوف|ممكن|ابعتلي|وريني|اعرف)$/i) // تخطي كلمات الطلب
            );

          this.logger.info('تم تقسيم الطلب إلى منتجات', { count: productRequests.length, products: productRequests });

          // البحث عن كل منتج على حدة
          // ✅ Performance: استخدام Promise.all لتحسين الأداء (parallel processing)
          const validRequests = productRequests
            .map(req => req.trim())
            .filter(req => req.length >= 3); // تخطي الكلمات القصيرة جداً

          const productPromises = validRequests.map(async (trimmedRequest) => {
            this.logger.debug('البحث عن منتج', { product: trimmedRequest });

            // ✅ استخدم اسم المنتج مباشرة بدون كلمات زائدة لدقة أعلى
            const specificResult = await ragService.retrieveSpecificProduct(trimmedRequest, intent, customerId, conversationMemory, companyId);

            this.logger.debug('RAG Result', {
              product: trimmedRequest,
              isSpecific: specificResult?.isSpecific,
              productName: specificResult?.product?.metadata?.name,
              productId: specificResult?.product?.metadata?.id,
              confidence: specificResult?.confidence,
              reasoning: specificResult?.reasoning
            });

            if (specificResult && specificResult.isSpecific && specificResult.product) {
              const productId = specificResult.product.metadata?.id || specificResult.product.metadata?.name;
              const productName = specificResult.product.metadata?.name;

              let specificImages = [];
              if (specificResult.product.metadata?.images && specificResult.product.metadata.images.length > 0) {
                this.logger.debug('المنتج يحتوي على صور', { count: specificResult.product.metadata.images.length });
                specificImages = specificResult.product.metadata.images.map((imageUrl, index) => ({
                  type: 'image',
                  payload: {
                    url: imageUrl,
                    title: `${productName} - صورة ${index + 1}`
                  }
                }));
              } else {
                this.logger.debug('المنتج لا يحتوي على صور', { product: productName });
              }

              return { specificResult, productId, productName, specificImages, trimmedRequest };
            } else {
              this.logger.debug('لم يتم العثور على المنتج', { product: trimmedRequest, confidence: specificResult?.confidence || 0 });
              return null;
            }
          });

          // ✅ انتظار جميع النتائج بالتوازي
          const productResults = await Promise.all(productPromises);

          // ✅ تجميع النتائج وإزالة التكرارات
          const allProducts = [];
          const allImages = [];
          const foundProductIds = new Set(); // لتتبع المنتجات المكررة

          for (const result of productResults) {
            if (!result) continue;

            const { specificResult, productId, productName, specificImages } = result;

            // تحقق من عدم تكرار المنتج
            if (foundProductIds.has(productId)) {
              this.logger.debug('المنتج مكرر - تم تخطيه', { product: productName });
              continue;
            }

            this.logger.info('تم العثور على منتج', { product: productName });
            foundProductIds.add(productId);
            allProducts.push(specificResult);

            // في حالة المنتجات المتعددة، نرسل كل الصور بدون فلترة لون
            if (specificImages.length > 0) {
              this.logger.debug('تمت إضافة صور للمنتج', { count: specificImages.length, filtered: false });
              allImages.push(...specificImages);
            }
          }

          if (allProducts.length > 0) {
            this.logger.info('تم العثور على منتجات', { found: allProducts.length, requested: productRequests.length });

            // إنشاء RAG data لجميع المنتجات
            ragData = allProducts.map(result => ({
              type: 'product',
              content: `منتج متاح: ${result.product.metadata.name}`,
              metadata: {
                ...result.product.metadata,
                hasImages: true,
                confidence: result.confidence,
                reasoning: result.reasoning
              }
            }));

            return {
              images: allImages,
              ragData: ragData,
              hasSpecificProduct: true,
              productInfo: allProducts[0], // المنتج الأول للتوافق
              multipleProducts: allProducts
            };
          }
        }

        // محاولة ذكية: المستخدم أكد باقتضاب بعد عرض صور سابقاً -> اعتمد على آخر منتج مذكور في الذاكرة
        try {
          const msgLower = (customerMessage || '').toLowerCase();
          const shortYes = ['اه', 'ايوه', 'ايوة', 'نعم', 'تمام', 'ماشي', 'اوكي', 'اه تمام'];
          const isShortAffirm = shortYes.some(y => msgLower.includes(y)) && msgLower.length <= 12;
          if (isShortAffirm && Array.isArray(conversationMemory) && conversationMemory.length > 0) {
            const recent = conversationMemory.slice(-CONSTANTS.MEMORY_LIMITS.CONTEXT_EXTRACTION);
            const candidateTexts = [];
            for (const m of recent) {
              if (!m) continue;
              if (m.content && m.isFromCustomer === false) candidateTexts.push(m.content);
              if (m.aiResponse) candidateTexts.push(m.aiResponse);
              if (m.userMessage && m.isFromCustomer) candidateTexts.push(m.userMessage);
            }
            // ابحث عن أسماء منتجات محتمَلة (نفس منطق استخراج الأسماء أعلاه بشكل مختصر)
            let lastProductName = null;
            for (const text of candidateTexts.reverse()) {
              const t = (text || '').trim();
              if (!t) continue;
              const englishMatches = t.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/g);
              if (englishMatches && englishMatches.length) {
                lastProductName = englishMatches[englishMatches.length - 1];
                break;
              }
              const kotchiMatches = t.match(/كوتشي\s+([^\n.،,؛!?]{2,30})/gi);
              if (kotchiMatches && kotchiMatches.length) {
                lastProductName = kotchiMatches[kotchiMatches.length - 1].replace(/كوتشي\s+/i, '').trim();
                break;
              }
              // Pattern: أسماء منتجات عربية شائعة
              const arabicMatches = t.match(/(السابوه|سابوه|البوتات|بوتات|الهاف|هاف|البالرينا|بالرينا|السوان|سوان|الشانكي|شانكي|الفيورا|فيورا)/gi);
              if (arabicMatches && arabicMatches.length) {
                lastProductName = arabicMatches[arabicMatches.length - 1].replace(/^ال/, '');
                break;
              }
            }
            if (lastProductName && lastProductName.length >= 2) {
              // ✅ استخدم اسم المنتج مباشرة بدون كلمات زائدة لدقة أعلى
              const specificResult = await ragService.retrieveSpecificProduct(lastProductName, intent, customerId, conversationMemory, companyId);
              if (specificResult && specificResult.isSpecific && specificResult.product) {
                const productName = specificResult.product.metadata?.name;
                let specificImages = [];
                if (specificResult.product.metadata?.images && specificResult.product.metadata.images.length > 0) {
                  specificImages = specificResult.product.metadata.images.map((imageUrl, index) => ({
                    type: 'image',
                    payload: { url: imageUrl, title: `${productName} - صورة ${index + 1}` }
                  }));
                }
                const filteredImages = await this.filterImagesByColor(specificImages, customerMessage);
                return {
                  images: filteredImages,
                  ragData: [{
                    type: 'product',
                    content: `منتج متاح: ${productName}`,
                    metadata: {
                      ...specificResult.product.metadata,
                      hasImages: filteredImages.length > 0,
                      confidence: specificResult.confidence,
                      reasoning: specificResult.reasoning
                    }
                  }],
                  hasSpecificProduct: true,
                  productInfo: specificResult
                };
              }
            }
          }
        } catch (_affirmCtxErr) {
          // تجاهل والفallback للمنطق التالي
        }

        // ⚡ محاولة ذكية 2: لو طلب صور عام بدون اسم منتج → استنتج من الذاكرة
        try {
          const msgLower = (customerMessage || '').toLowerCase().trim();

          // ✅ أولاً: كشف الطلبات العامة الصريحة (كل المنتجات)
          const isExplicitAllProductsRequest = (
            msgLower.includes('كل المنتجات') ||
            msgLower.includes('المنتجات كلها') ||
            msgLower.includes('كل الصور') ||
            msgLower.includes('الصور كلها') ||
            msgLower.includes('كل اللي عندك') ||
            (msgLower.includes('صور') && msgLower.includes('كل')) ||
            // General: any phrase like "كل ال <category>"
            msgLower.includes('كل ال')
          );

          // فحص لو الرسالة طلب صور عام بدون اسم منتج صريح
          const isGenericImageRequest = (
            (msgLower.includes('صور') || msgLower.includes('صورة') || msgLower.includes('اشوف')) &&
            msgLower.length < 30 && // رسالة قصيرة
            !/([A-Z][a-zA-Z]+|كوتشي\s+\w+|سابوه|بوتات|هاف|بالرينا|سلبير|حذاء|كعب|سوان|شانكي)/.test(customerMessage) && // مفيش اسم منتج واضح (إنجليزي أو عربي)
            !isExplicitAllProductsRequest && // ✅ ومش طلب صريح لكل المنتجات
            !productNameFromCurrentMessage // ✅ ✅ ومفيش منتج تم استخراجه من الرسالة الحالية
          );

          // 🔒 CRITICAL: لو تم استخراج منتج من الرسالة الحالية، استخدمه مباشرة ولا تروح للـ context القديم
          if (productNameFromCurrentMessage && !isGenericImageRequest) {
            this.logger.info('تم العثور على منتج في الرسالة الحالية - سيتم البحث عنه مباشرة', { product: productNameFromCurrentMessage });
            this.logger.debug('تخطي البحث في السياق القديم لأن المنتج موجود في الرسالة الحالية');

            // ✅ البحث عن المنتج مباشرة
            const specificResult = await ragService.retrieveSpecificProduct(
              productNameFromCurrentMessage,
              intent,
              customerId,
              conversationMemory,
              companyId
            );

            if (specificResult && specificResult.isSpecific && specificResult.product) {
              const productName = specificResult.product.metadata?.name;
              this.logger.info('تم العثور على المنتج', { product: productName });

              let specificImages = [];
              if (specificResult.product.metadata?.images && specificResult.product.metadata.images.length > 0) {
                this.logger.debug('المنتج يحتوي على صور', { count: specificResult.product.metadata.images.length });
                specificImages = specificResult.product.metadata.images.map((imageUrl, index) => ({
                  type: 'image',
                  payload: {
                    url: imageUrl,
                    title: `${productName} - صورة ${index + 1}`
                  }
                }));
              }

              const filteredImages = await this.filterImagesByColor(specificImages, customerMessage);

              return {
                images: filteredImages,
                ragData: [{
                  type: 'product',
                  content: `منتج متاح: ${productName}`,
                  metadata: {
                    ...specificResult.product.metadata,
                    hasImages: filteredImages.length > 0,
                    confidence: specificResult.confidence,
                    reasoning: specificResult.reasoning
                  }
                }],
                hasSpecificProduct: true,
                productInfo: specificResult
              };
            } else {
              this.logger.warn('لم يتم العثور على المنتج في قاعدة البيانات', { product: productNameFromCurrentMessage });
            }
          }

          if (isGenericImageRequest && Array.isArray(conversationMemory) && conversationMemory.length > 0) {
            this.logger.debug('طلب صور عام بدون اسم منتج - استنتاج من السياق');
            const recent = conversationMemory.slice(-CONSTANTS.MEMORY_LIMITS.WIDE_CONTEXT);
            const candidateTexts = [];

            // 🔄 جمع الرسائل من الأحدث للأقدم (reverse order)
            for (let i = recent.length - 1; i >= 0; i--) {
              const m = recent[i];
              if (!m) continue;
              // جمع كل المحتوى من الرسائل
              if (m.content && m.isFromCustomer === false) candidateTexts.push(m.content);
              if (m.aiResponse) candidateTexts.push(m.aiResponse);
              if (m.content && m.isFromCustomer) candidateTexts.push(m.content);
              if (m.userMessage) candidateTexts.push(m.userMessage);
            }

            // ابحث عن آخر منتج مذكور باستخدام AI للدقة
            let lastProductName = null;

            // جمع آخر 10 رسائل من المحادثة (من الأحدث للأقدم)
            const recentMessages = candidateTexts.slice(0, 10).join('\n');
            this.logger.debug('تم جمع نصوص من الرسائل', { textsCount: candidateTexts.length, messagesCount: recent.length });

            if (recentMessages && recentMessages.length > 5) {
              this.logger.debug('استخدام AI لاستخراج آخر منتج من السياق');

              try {
                const contextPrompt = `حلل المحادثة التالية واستخرج **آخر اسم منتج** تم ذكره:

📋 المحادثة الأخيرة (مرتبة من الأحدث للأقدم):
${recentMessages}

مهمتك:
- ابحث عن **آخر منتج** تم ذكره في المحادثة
- الرسائل مرتبة من **الأحدث للأقدم** (أول رسالة = الأحدث)
- المنتج يمكن أن يكون:
  - اسم إنجليزي (مثل: GlamBoot, Chelsea Boot, Belle Boot, UGG, Swan, Chunky, Fiora)
  - اسم عربي (مثل: السابوه, البوتات, الكوتشي, الهاف, البالرينا, الشانكي, السوان, الفيورا, البيل)
  - اسم مع رقم موديل (مثل: هاف 90/420, سابوه 80/091)

⚠️ قواعد مهمة:
- لو فيه أكثر من منتج، اختار **الأحدث** (أول واحد يظهر في الرسائل)
- لو مفيش أي منتج واضح، أرجع null
- **احذف "ال" التعريف من البداية** (السابوه → سابوه)
- **تأكد من الإملاء الصحيح** - لا تكرر الأحرف (ساابوه ❌ → سابوه ✅)
- **انسخ الاسم بالضبط** كما ورد في المحادثة بدون إضافات
- **لا تستخدم منتجات قديمة** - ركز على أول منتج يظهر

أمثلة:
- "السابوه" → أرجع: "سابوه" (بدون ال)
- "البوتات" → أرجع: "بوتات" (بدون ال)
- "GlamBoot" → أرجع: "GlamBoot" (كما هو)
- "هاف UGG" → أرجع: "هاف UGG" (كما هو)

أرجع JSON فقط:
{
  "productName": "اسم المنتج" أو null,
  "confidence": رقم من 0 إلى 1
}`;

                // ✅ استخدام aiAgentService.generateAIResponse بدلاً من الوصول المباشر لـ ragService.genAI
                // Note: generateAIResponse سيستخدم buildGenerationConfig الذي يبني generationConfig بناءً على companyId
                // لكن نحتاج لتمرير messageContext لتعديل temperature و maxOutputTokens
                const messageContext = {
                  messageType: 'context_extraction',
                  temperature: CONSTANTS.AI_CONFIG.TEMPERATURE,
                  maxTokens: CONSTANTS.AI_CONFIG.MAX_TOKENS
                };

                const aiResponse = await this.aiAgentService.generateAIResponse(
                  contextPrompt,
                  [],
                  false,
                  null, // سيتم استخدام getCurrentActiveModel من aiAgentService
                  companyId,
                  null, // conversationId
                  messageContext
                );

                // ✅ FIX: Handle both string and object response formats
                const responseText = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;

                this.logger.debug('رد AI', { response: responseText });

                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const aiResult = JSON.parse(jsonMatch[0]);
                  if (aiResult.productName && aiResult.confidence > 0.5) {
                    lastProductName = aiResult.productName;
                    this.logger.info('استخرجت المنتج من السياق', { product: lastProductName, confidence: (aiResult.confidence * 100).toFixed(0) + '%' });
                  } else {
                    this.logger.warn('ثقة منخفضة أو لا يوجد منتج', { confidence: aiResult.confidence });
                  }
                }
              } catch (aiError) {
                this.logger.error('خطأ في AI', { error: aiError.message, stack: aiError.stack });
              }
            }

            // Fallback: إذا AI فشل، استخدم Patterns التقليدية
            if (!lastProductName) {
              this.logger.debug('AI لم يجد منتج، استخدام patterns تقليدية');

              for (const text of candidateTexts) {
                const t = (text || '').trim();
                if (!t) continue;

                // Pattern 1: اسم بالإنجليزي (GlamBoot, Chelsea Boot, etc.)
                const englishMatches = t.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/g);
                if (englishMatches && englishMatches.length) {
                  lastProductName = englishMatches[englishMatches.length - 1];
                  this.logger.debug('وجدت منتج إنجليزي', { product: lastProductName });
                  break;
                }

                // Pattern 2: كوتشي + اسم
                const kotchiMatches = t.match(/كوتشي\s+([^\n.،,؛!?]{2,30})/gi);
                if (kotchiMatches && kotchiMatches.length) {
                  lastProductName = kotchiMatches[kotchiMatches.length - 1].replace(/كوتشي\s+/i, '').trim();
                  this.logger.debug('وجدت كوتشي', { product: lastProductName });
                  break;
                }

                // Pattern 3: أسماء منتجات عربية شائعة (موسّعة)
                const arabicProductMatches = t.match(/(السابوه|سابوه|البوتات|بوتات|الهاف|هاف|البالرينا|بالرينا|الكوتشي|السلبير|سلبير|الحذاء|حذاء|الكعب|كعب|الشانكي|شانكي|السوان|سوان|الفيورا|فيورا|البيل|بيل)/gi);
                if (arabicProductMatches && arabicProductMatches.length) {
                  lastProductName = arabicProductMatches[arabicProductMatches.length - 1].replace(/^ال/, '');
                  this.logger.debug('وجدت منتج عربي', { product: lastProductName });
                  break;
                }
              }
            }

            if (lastProductName && lastProductName.length >= 2) {
              this.logger.info('استنتجت المنتج من السياق - سأبحث عنه', { product: lastProductName });
              // ✅ استخدم اسم المنتج مباشرة بدون كلمات زائدة لدقة أعلى
              const specificResult = await ragService.retrieveSpecificProduct(lastProductName, intent, customerId, conversationMemory, companyId);

              if (specificResult && specificResult.isSpecific && specificResult.product) {
                const foundProductName = specificResult.product.metadata?.name;
                this.logger.info('تم العثور على المنتج', { product: foundProductName });

                // ⚡ Validation: تأكد أن المنتج الراجع يطابق المنتج المستنتج
                this.logger.debug('Comparing products', { found: foundProductName, expected: lastProductName });

                // 🔧 دالة تنظيف متقدمة - إزالة الأرقام والرموز والأحرف المكررة
                const normalizeForComparison = (text) => {
                  return text
                    .toLowerCase()
                    .replace(/^ال/, '') // إزالة "ال" التعريف
                    .replace(/[0-9]/g, '') // إزالة الأرقام
                    .replace(/[\/\-_]/g, ' ') // تحويل الرموز لمسافات
                    .replace(/(.)\1+/g, '$1') // إزالة الأحرف المكررة
                    .replace(/\s+/g, ' ') // توحيد المسافات
                    .trim();
                };

                const normalizedFound = normalizeForComparison(foundProductName);
                const normalizedExpected = normalizeForComparison(lastProductName);

                this.logger.debug('Normalized found', { normalized: normalizedFound });
                this.logger.debug('Normalized expected', { normalized: normalizedExpected });

                // Advanced similarity check - content-based word matching
                let similarity = 0;

                // Priority 1: Exact match after normalization = 100%
                if (normalizedFound === normalizedExpected) {
                  similarity = 1;
                  this.logger.debug('Exact match after normalization', { similarity: '100%' });
                }
                // Priority 2: Word-level similarity (أولوية أعلى من character matching)
                else {
                  // Extract significant words (length >= 3) بعد التنظيف
                  const getWords = (str) => {
                    return normalizeForComparison(str)
                      .split(/\s+/)  // Split by spaces
                      .filter(w => w.length >= 3 && !/^\d+$/.test(w)); // استبعاد الأرقام البحتة
                  };

                  const wordsFound = getWords(foundProductName);
                  const wordsExpected = getWords(lastProductName);

                  this.logger.debug('Words found', { words: wordsFound });
                  this.logger.debug('Words expected', { words: wordsExpected });

                  if (wordsFound.length === 0 || wordsExpected.length === 0) {
                    similarity = 0;
                    this.logger.debug('No significant words', { similarity: '0%' });
                  } else {
                    // Count matching words
                    const matchingWords = wordsExpected.filter(expectedWord =>
                      wordsFound.some(foundWord =>
                        foundWord === expectedWord ||
                        foundWord.includes(expectedWord) ||
                        expectedWord.includes(foundWord)
                      )
                    );

                    this.logger.debug('Matching words', { words: matchingWords });

                    // Similarity = ratio of matching words
                    similarity = matchingWords.length / Math.max(wordsExpected.length, wordsFound.length);
                    this.logger.debug('Word-based similarity', { matching: matchingWords.length, total: Math.max(wordsExpected.length, wordsFound.length), similarity: (similarity * 100).toFixed(1) + '%' });
                  }
                }

                this.logger.debug('Similarity check', { found: foundProductName, expected: lastProductName, similarity: (similarity * 100).toFixed(1) + '%' });

                // إذا كان التشابه أقل من 40%، تجاهل النتيجة
                // خليناها 40% عشان تسمح بالمنتجات اللي فيها كلمات إضافية (مثل: "سابوه حريمي")
                if (similarity < 0.4) {
                  this.logger.warn('المنتج الراجع لا يطابق المتوقع - تجاهل النتيجة', { found: foundProductName, expected: lastProductName, similarity: (similarity * 100).toFixed(1) + '%' });
                  // لا ترجع شيء - استمر في البحث بالطريقة العادية
                } else {
                  this.logger.info('تم التحقق من تطابق المنتج', { similarity: (similarity * 100).toFixed(1) + '%' });
                  const productName = foundProductName;
                  let specificImages = [];

                  if (specificResult.product.metadata?.images && specificResult.product.metadata.images.length > 0) {
                    specificImages = specificResult.product.metadata.images.map((imageUrl, index) => ({
                      type: 'image',
                      payload: { url: imageUrl, title: `${productName} - صورة ${index + 1}` }
                    }));
                    this.logger.debug('المنتج المستنتج يحتوي على صور', { count: specificImages.length });
                  }

                  const filteredImages = await this.filterImagesByColor(specificImages, customerMessage);
                  return {
                    images: filteredImages,
                    ragData: [{
                      type: 'product',
                      content: `منتج متاح: ${productName}`,
                      metadata: {
                        ...specificResult.product.metadata,
                        hasImages: filteredImages.length > 0,
                        confidence: specificResult.confidence,
                        reasoning: specificResult.reasoning
                      }
                    }],
                    hasSpecificProduct: true,
                    productInfo: specificResult
                  };
                }
              }
            }
          }
        } catch (_genericImageErr) {
          this.logger.warn('خطأ في استنتاج المنتج', { error: _genericImageErr.message });
          // تجاهل والاستمرار
        }

        // ✅ كشف الطلبات العامة قبل البحث عن منتج محدد
        const msgCheck = (customerMessage || '').toLowerCase().trim();
        const isAllProductsRequest = (
          msgCheck.includes('كل المنتجات') ||
          msgCheck.includes('المنتجات كلها') ||
          msgCheck.includes('كل الصور') ||
          msgCheck.includes('الصور كلها') ||
          msgCheck.includes('كل اللي عندك') ||
          (msgCheck.includes('صور') && msgCheck.includes('كل'))
        );

        // استخدام النظام الذكي للمنتجات (منتج واحد) - لكن skip لو طلب كل المنتجات
        let specificResult = null;

        if (!isAllProductsRequest) {
          this.logger.debug('البحث عن منتج واحد محدد');
          specificResult = await ragService.retrieveSpecificProduct(customerMessage, intent, customerId, conversationMemory, companyId);
        } else {
          this.logger.debug('تخطي البحث عن منتج محدد - العميل يريد كل المنتجات');
        }

        if (specificResult && specificResult.isSpecific && specificResult.product) {
          this.logger.info('تم العثور على منتج واحد', { product: specificResult.product.metadata?.name, confidence: (specificResult.confidence * 100).toFixed(1) + '%' });

          // إنشاء الصور من المنتج المحدد
          if (specificResult.product.metadata?.images) {
            this.logger.debug('المنتج يحتوي على صور', { count: specificResult.product.metadata.images.length });

            const specificImages = specificResult.product.metadata.images.map((imageUrl, index) => ({
              type: 'image',
              payload: {
                url: imageUrl,
                title: `${specificResult.product.metadata.name} - صورة ${index + 1}`
              }
            }));

            // فلترة الصور بناءً على اللون
            const filteredImages = await this.filterImagesByColor(specificImages, customerMessage);

            productImages.push(...filteredImages);
          }

          // إنشاء RAG data للرد النصي
          ragData = [{
            type: 'product',
            content: `منتج متاح: ${specificResult.product.metadata.name}`,
            metadata: {
              ...specificResult.product.metadata,
              hasImages: productImages.length > 0,
              confidence: specificResult.confidence,
              reasoning: specificResult.reasoning
            }
          }];

          return {
            images: productImages,
            ragData: ragData,
            hasSpecificProduct: true,
            productInfo: specificResult
          };
        } else {
          // البحث في RAG data العامة عن منتجات بصور
          ragData = await ragService.retrieveRelevantData(customerMessage, intent, customerId, companyId, null, conversationMemory);
          productImages = await this.extractImagesFromRAGData(ragData, customerMessage, companyId);

          if (productImages.length > 0) {
            return {
              images: productImages,
              ragData: ragData,
              hasSpecificProduct: false,
              productInfo: null
            };
          } else {
            // لا نرسل صور افتراضية أو احتياطية
            // بدلاً من ذلك، نضيف رسالة توضيحية في RAG data
            ragData.push({
              type: 'system_message',
              content: 'العميل طلب صور لكن لا توجد صور متاحة حالياً للمنتجات المطلوبة',
              metadata: {
                customerRequestedImages: true,
                noImagesAvailable: true,
                searchedProducts: true
              }
            });
          }
        }
      } else {
        // العميل لا يطلب صور - رد نصي فقط
        ragData = await ragService.retrieveRelevantData(customerMessage, intent, customerId, companyId, null, conversationMemory);
      }

      // النتيجة النهائية: رد نصي فقط بدون صور
      return {
        images: [],
        ragData: ragData,
        hasSpecificProduct: false,
        productInfo: null
      };

    } catch (error) {
      this.logger.error('Error in unified response', { error: error.message, stack: error.stack });

      // Fallback آمن
      try {
        // ✅ ragService is now imported at top level
        const ragData = await ragService.retrieveRelevantData(customerMessage, intent, customerId, companyId, null, conversationMemory);
        return {
          images: [],
          ragData: ragData,
          hasSpecificProduct: false,
          productInfo: null
        };
      } catch (fallbackError) {
        this.logger.error('Fallback also failed', { error: fallbackError.message, stack: fallbackError.stack });
        return {
          images: [],
          ragData: [],
          hasSpecificProduct: false,
          productInfo: null
        };
      }
    }
  }

  /**
   * استخراج الصور من RAG data بذكاء
   * ✅ نقل من imageExtractor.js
   * @param {Array} ragData - بيانات RAG
   * @param {string} customerMessage - رسالة العميل
   * @param {string} companyId - معرف الشركة
   * @returns {Promise<Array>} - مصفوفة الصور
   */
  async extractImagesFromRAGData(ragData, customerMessage, companyId) {
    try {
      // ✅ Input Validation
      if (!Array.isArray(ragData)) {
        throw new ValidationError('ragData must be an array', { ragData, type: typeof ragData });
      }
      if (!customerMessage || typeof customerMessage !== 'string') {
        throw new ValidationError('customerMessage must be a non-empty string', { customerMessage, type: typeof customerMessage });
      }
      if (!companyId || typeof companyId !== 'string') {
        throw new ValidationError('companyId must be a non-empty string', { companyId, type: typeof companyId });
      }

      if (ragData.length === 0) {
        this.logger.debug('[EXTRACT-IMAGES] RAG data is empty');
        return [];
      }

      this.logger.debug('[EXTRACT-IMAGES] Processing RAG data for images', {
        count: ragData.length,
        types: ragData.map(i => i.type),
        firstItemMetadata: ragData[0]?.metadata ? JSON.stringify(ragData[0].metadata).substring(0, 200) : 'none'
      });

      // ✅ Define Helper first: بناء صور لمنتج واحد
      const buildImagesForProduct = async (prodItem) => {
        const out = [];
        if (prodItem.metadata.product_variants && prodItem.metadata.product_variants.length > 0) {
          for (const variant of prodItem.metadata.product_variants) {
            if (variant.images && variant.images.length > 0) {
              const firstVariantImage = variant.images[0];
              out.push({
                type: 'image',
                payload: {
                  url: firstVariantImage,
                  title: `${prodItem.metadata.name || 'منتج'} - اللون ${variant.name}`,
                  variantName: variant.name,
                  variantType: variant.type
                }
              });
            }
          }
        }
        if (out.length === 0) {
          const general = prodItem.metadata.images || [];
          if (general.length > 0) {
            const firstGeneralImage = general[0];
            out.push({
              type: 'image',
              payload: {
                url: firstGeneralImage,
                title: `${prodItem.metadata.name || 'منتج'}`
              }
            });
          }
        }
        // Fallback: لو مفيش صور في RAG metadata، حاول تجيب من قاعدة البيانات
        if (out.length === 0 && prodItem.metadata?.id) {
          try {
            const dbImages = await this.getProductImagesFromDB(prodItem.metadata.id);
            if (Array.isArray(dbImages) && dbImages.length > 0) {
              out.push(...dbImages);
            }
          } catch (e) {
            this.logger.warn('[EXTRACT-IMAGES] DB fallback failed', { error: e.message, productId: prodItem.metadata.id });
          }
        }

        this.logger.debug('[EXTRACT-IMAGES] Built images for product', {
          name: prodItem.metadata.name,
          imageCount: out.length,
          sources: out.map(i => i.payload.title)
        });

        return out;
      };

      // كشف طلب "كل المنتجات" أو عدد محدد من المنتجات
      const msgLc = (customerMessage || '').toLowerCase();
      const isAllProductsRequest = (
        msgLc.includes('كل المنتجات') ||
        msgLc.includes('المنتجات كلها') ||
        msgLc.includes('كل الصور') ||
        msgLc.includes('الصور كلها') ||
        (msgLc.includes('صور') && msgLc.includes('كل')) ||
        msgLc.includes('كل ال')
      );

      // عدد المنتجات المطلوب إذا ذُكر رقم صراحة
      let requestedCount = 0;
      const numberPatterns = [
        { value: 2, words: ['منتجين', 'اتنين', 'اثنين', '2', '٢'] },
        { value: 3, words: ['ثلاث', 'ثلاثة', 'تلاتة', 'تلاته', '3', '٣'] },
        { value: 4, words: ['اربعه', 'أربعة', 'اربعة', '4', '٤'] },
        { value: 5, words: ['خمسه', 'خمسة', '5', '٥'] }
      ];
      for (const pat of numberPatterns) {
        if (pat.words.some(w => msgLc.includes(w))) {
          requestedCount = pat.value;
          break;
        }
      }

      if (isAllProductsRequest || requestedCount > 1) {
        const productItems = ragData.filter(item => item.type === 'product' && item.metadata);
        if (productItems.length === 0) {
          return [];
        }

        const selectedItems = (requestedCount > 1 && !isAllProductsRequest)
          ? productItems.slice(0, requestedCount)
          : productItems;

        let allImages = [];
        for (const item of selectedItems) {
          const imgs = await buildImagesForProduct(item);
          allImages.push(...imgs);
        }

        if (allImages.length === 0) {
          return [];
        }

        // فلترة حسب اللون إن وُجد
        const filteredAll = await this.filterImagesByColor(allImages, customerMessage);
        return filteredAll;
      }

      // استخدام AI لتحديد أفضل منتج مطابق للطلب
      const productAnalysisPrompt = `
أنت خبير في مطابقة طلبات العملاء مع المنتجات المتاحة.

طلب العميل: "${customerMessage}"

المنتجات المتاحة:
${ragData.filter(item => item.type === 'product' && item.metadata)
          .map((item, index) => `${index + 1}. ${item.metadata.name || 'منتج'} - ${item.content || 'لا يوجد وصف'}`)
          .join('\n')}

حدد أفضل منتج يطابق طلب العميل:
- إذا كان هناك منتج مطابق بوضوح، اذكر رقمه
- إذا لم يكن هناك مطابقة واضحة، قل "لا يوجد"

الرد:`;

      const aiResponse = await this.aiAgentService.generateAIResponse(productAnalysisPrompt, [], false, null, companyId);

      // ✅ FIX: Handle both string and object response formats
      const aiContent = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;

      // ✅ FIX: حماية من الردود الصامتة/null حتى لا ينهار مسار الصور
      const responseText = (aiContent || '').trim().toLowerCase();

      let selectedProduct = null;

      // البحث عن رقم المنتج في الرد
      const numberMatch = responseText.match(/(\d+)/);
      if (numberMatch && !responseText.includes('لا يوجد')) {
        const productIndex = parseInt(numberMatch[1]) - 1;
        const productItems = ragData.filter(item => item.type === 'product' && item.metadata);

        if (productIndex >= 0 && productIndex < productItems.length) {
          selectedProduct = productItems[productIndex];
        }
      }

      // لا نستخدم fallback - إذا لم يجد AI منتج مطابق، نرجع قائمة فارغة
      if (!selectedProduct) {
        this.logger.warn('لم يتم العثور على منتج محدد من AI - سيتم طلب اسم المنتج أو صورته من العميل');

        // محاولة مطابقة مباشرة بالاسم إذا كان customerMessage يحتوي على اسم منتج واضح
        const productItems = ragData.filter(item => item.type === 'product' && item.metadata);
        const normalizedMessage = (customerMessage || '').toLowerCase().trim();

        const directMatch = productItems.find(item => {
          const productName = (item.metadata?.name || '').toLowerCase();
          return productName.includes(normalizedMessage) ||
            normalizedMessage.includes(productName) ||
            productName === normalizedMessage;
        });

        if (directMatch) {
          this.logger.info('تم العثور على مطابقة مباشرة', { product: directMatch.metadata?.name });
          selectedProduct = directMatch;
        } else {
          this.logger.warn('لا توجد مطابقة مباشرة - لن نرسل منتج خاطئ');
          return [];
        }
      }

      // استخراج الصور من المنتج المختار باستخدام Helper
      const productImages = await buildImagesForProduct(selectedProduct);

      if (productImages.length === 0) {
        return [];
      }

      // فلترة الصور بناءً على اللون إذا طلب العميل لون محدد
      const filteredImages = await this.filterImagesByColor(productImages, customerMessage);
      return filteredImages;

    } catch (error) {
      this.logger.error('Error in intelligent image extraction', { error: error.message, stack: error.stack });

      // في حالة الخطأ، نحاول إرجاع صور بديلة بسيطة
      try {
        const fallbackImages = ragData?.filter(item =>
          item.type === 'product' &&
          item.metadata?.images?.length > 0
        ).flatMap(item =>
          item.metadata.images.map(imageUrl => ({
            type: 'image',
            payload: {
              url: imageUrl,
              title: item.metadata.name || 'منتج'
            }
          }))
        ) || [];

        return fallbackImages;
      } catch (fallbackError) {
        this.logger.error('Fallback also failed', { error: fallbackError.message, stack: fallbackError.stack });
        return [];
      }
    }
  }
}

module.exports = ImageProcessor;
module.exports.ImageProcessorError = ImageProcessorError;
module.exports.ValidationError = ValidationError;
module.exports.ProcessingError = ProcessingError;
