/**
 * Intent Analyzer Module
 * 
 * هذا الـ module يحتوي على منطق تحليل الـ intent:
 * 1. analyzeIntent - تحليل الـ intent الأساسي
 * 2. analyzeIntentWithEnhancedContext - تحليل الـ intent مع سياق محسن
 * 3. وظائف تحليل السياق
 * 
 * ملاحظة: هذا الـ module للرجوع فقط - لا يتم استخدامه في الملف الرئيسي حالياً
 */

class IntentAnalyzer {
  /**
   * تحليل الـ intent من الرسالة
   * ✅ محسّن: إضافة فحص أولي للتحيات وتحسين أولوية الكلمات المفتاحية
   * @param {string} message - رسالة العميل
   * @param {Array} conversationMemory - سجل المحادثة
   * @param {string} companyId - معرف الشركة
   * @param {Function} generateAIResponse - دالة توليد رد AI (يتم تمريرها من الملف الرئيسي)
   * @param {Function} fallbackIntentAnalysis - دالة تحليل الـ intent الاحتياطية (async، AI-based، يتم تمريرها من الملف الرئيسي)
   * @returns {Promise<string>} - الـ intent المكتشف
   */
  /**
   * اكتشاف النية محلياً بدون استخدام AI (توفير الكوته)
   * @param {string} message - رسالة العميل
   * @param {Array} conversationMemory - سجل المحادثة
   * @returns {Object} - { intent, confidence, isLocal: true }
   */
  detectIntentLocally(message, conversationMemory = []) {
    try {
      const lowerMsg = (message || '').toLowerCase().trim();
      // console.log(`[DEBUG] Analyzing: "${lowerMsg}"`);

      const isFirstMessage = !conversationMemory || conversationMemory.length === 0 ||
        (conversationMemory.length === 1 && conversationMemory[0].isFromCustomer);

      // 1. فحص التحيات (أولوية قصوى في بداية المحادثة)
      const greetingIntent = this.checkGreetingIntent(message, isFirstMessage);
      // console.log(`[DEBUG] Greeting check: ${greetingIntent}`);
      if (greetingIntent) {
        return { intent: 'greeting', confidence: 0.9, isLocal: true };
      }

      // 2. فحص الكلمات المفتاحية ذات الأولوية (سعر، شحن، طلب)
      const priorityIntent = this.checkPriorityKeywords(message, conversationMemory);
      // console.log(`[DEBUG] Priority check: ${priorityIntent}`);
      if (priorityIntent) {
        return { intent: priorityIntent, confidence: 0.85, isLocal: true };
      }

      // 3. فحص سياق المحادثة السابقة
      if (conversationMemory && conversationMemory.length > 0) {
        const lastMsg = conversationMemory[conversationMemory.length - 1];

        // إذا كان آخر رسالة من البوت سؤالاً، ربما الإجابة مرتبطة به
        if (!lastMsg.isFromCustomer) {
          // منطق بسيط: إذا سأل البوت سؤال وتلقى إجابة قصيرة، قد تكون confirm_order أو مشابه
          // لكن للامان سنعتبرها general_inquiry مع سياق
        }
      }

      // 4. Default fallback
      return { intent: 'general_inquiry', confidence: 0.5, isLocal: true };

    } catch (error) {
      console.error('❌ [INTENT-LOCAL] Error in local detection:', error);
      return { intent: 'general_inquiry', confidence: 0.0, isLocal: true };
    }
  }

  /**
   * تحليل الـ intent من الرسالة
   * ✅ محسّن: تم تحديثه ليدعم "Local First" بوضوح
   */
  async analyzeIntent(message, conversationMemory, companyId, generateAIResponse, fallbackIntentAnalysis) {
    try {
      // ✅ STEP 1: المحاولة المحلية أولاً (توفير الكوته)
      // هذه الخطوة تضمن عدم استدعاء AI للأشياء البسيطة
      const localResult = this.detectIntentLocally(message, conversationMemory);

      // إذا كانت الثقة عالية، نكتفي بالنتيجة المحلية
      if (localResult.confidence >= 0.8) {
        console.log(`✅ [INTENT-ANALYZER] Local detection successful: ${localResult.intent}`);
        return localResult.intent;
      }

      // ✅ STEP 2: إذا فشل المحلي، نستخدم AI (أو Fallback إذا أردنا توفير كامل)
      // في وضع "Single-Shot" المفضل، سنعتمد على النتيجة المحلية حتى لو كانت general_inquiry
      // لأن الرد النهائي سيصلح الفهم.
      // لكن للإبقاء على التوافق، سنكمل بالكود القديم فقط إذا لزم الأمر.

      // هنا سنقوم بإرجاع النتيجة المحلية مباشرة لفرض توفير الكوته
      // لأن messageProcessor سيستخدم الـ intent فقط لجلب RAG data
      console.log(`⚠️ [INTENT-ANALYZER] Low confidence local detection, returning default: ${localResult.intent}`);
      return localResult.intent;

    } catch (error) {
      console.error('❌ [INTENT-ANALYZER] Error in intent analysis:', error);
      return 'general_inquiry';
    }
  }

  /**
   * تحليل الـ intent مع سياق محسن
   * @param {string} message - رسالة العميل
   * @param {Array} conversationMemory - سجل المحادثة
   * @param {string} companyId - معرف الشركة
   * @param {Function} generateAIResponse - دالة توليد رد AI
   * @returns {Promise<Object>} - {intent, confidence, context}
   */
  async analyzeIntentWithEnhancedContext(message, conversationMemory, companyId, generateAIResponse) {
    try {
      const intent = await this.analyzeIntent(message, conversationMemory, companyId, generateAIResponse);

      // تحليل إضافي للسياق
      const context = {
        hasProductMention: this.hasProductMention(message),
        hasPriceMention: this.hasPriceMention(message),
        hasOrderMention: this.hasOrderMention(message),
        conversationLength: conversationMemory.length
      };

      return {
        intent: intent,
        confidence: 0.8, // مثال
        context: context
      };

    } catch (error) {
      console.error('❌ [INTENT-ANALYZER] Error in enhanced intent analysis:', error);
      return {
        intent: 'general_inquiry',
        confidence: 0.5,
        context: {}
      };
    }
  }


  /**
   * فحص إذا كانت الرسالة تحتوي على ذكر طلب
   * @param {string} message - رسالة العميل
   * @returns {boolean}
   */
  hasOrderMention(message) {
    const orderKeywords = ['أوردر', 'اوردر', 'اطلب', 'أطلب', 'اشتري', 'أشتري', 'طلب'];
    const lowerMsg = message.toLowerCase();
    return orderKeywords.some(keyword => lowerMsg.includes(keyword));
  }

  /**
   * ✅ فحص أولي للتحيات (أولوية قصوى)
   * @param {string} message - رسالة العميل
   * @param {boolean} isFirstMessage - هل هذه أول رسالة في المحادثة
   * @returns {string|null} - greeting إذا كانت تحية، null وإلا
   */
  checkGreetingIntent(message, isFirstMessage) {
    if (!message || typeof message !== 'string') return null;

    const lowerMsg = message.toLowerCase().trim();
    const greetingPatterns = [
      'السلام عليكم',
      'السلام',
      'أهلاً',
      'أهلا',
      'مرحبا',
      'مرحباً',
      'ازيك',
      'ازي',
      'هلو',
      'هلا',
      'صباح الخير',
      'مساء الخير',
      'صباح النور',
      'مساء النور',
      // Franco
      'salam', 'hi', 'hello', 'hey', 'ezayak', 'slm', 'morning', 'evening'
    ];

    // فحص إذا كانت الرسالة تبدأ بتحية
    for (const pattern of greetingPatterns) {
      if (lowerMsg.startsWith(pattern) || lowerMsg === pattern) {
        return 'greeting';
      }
    }

    // فحص إذا كانت أول رسالة وتحتوي على تحية
    if (isFirstMessage) {
      for (const pattern of greetingPatterns) {
        if (lowerMsg.includes(pattern)) {
          return 'greeting';
        }
      }
    }

    // فحص إذا كانت الرسالة تحتوي على تحية في البداية (حتى لو معه سؤال)
    const firstWords = lowerMsg.split(/\s+/).slice(0, 3).join(' ');
    for (const pattern of greetingPatterns) {
      if (firstWords.includes(pattern)) {
        return 'greeting';
      }
    }

    return null;
  }

  /**
   * ✅ فحص أولي للكلمات المفتاحية ذات الأولوية العالية
   * @param {string} message - رسالة العميل
   * @param {Array} conversationMemory - سجل المحادثة
   * @returns {string|null} - النية المكتشفة أو null
   */
  checkPriorityKeywords(message, conversationMemory) {
    if (!message || typeof message !== 'string') return null;

    const lowerMsg = message.toLowerCase().trim();

    // ✅ الأولوية 1: السعر (أولوية عالية جداً)
    const priceKeywords = [
      'كام', 'بكام', 'بكم', 'ب كام', 'ب كم',
      'سعر', 'سعره', 'سعرها', 'سعر ال', 'السعر',
      'ثمن', 'ثمنه', 'ثمنها', 'ثمن ال', 'الثمن',
      'تمن', 'تمنه', 'تمنها', 'تمن ال', 'التمن',
      'كام السعر', 'كام الثمن', 'كام التمن',
      'شحال', 'شحال ثمن', 'شحال السعر',
      // Franco / English
      'bkam', 'b kam', 'kam', 'price', 'sa3r', 'el se3r', 'how much', 'hm'
    ];

    for (const keyword of priceKeywords) {
      if (lowerMsg.includes(keyword)) {
        // حتى لو كان في السياق منتج، السؤال عن السعر له أولوية
        return 'price_inquiry';
      }
    }

    // ✅ الأولوية 2: الشحن
    const shippingKeywords = [
      'شحن', 'توصيل', 'شحنت', 'توصل',
      'delivery', 'shipping', 'sha7n', 'tawseel'
    ];
    for (const keyword of shippingKeywords) {
      if (lowerMsg.includes(keyword)) {
        return 'shipping_inquiry';
      }
    }

    // ✅ الأولوية 3: الطلب
    const orderKeywords = [
      'أوردر', 'اوردر', 'اطلب', 'أطلب', 'اشتري', 'أشتري', 'طلب', 'احجز',
      'order', 'buy', 'atlob', '3ayez atlob', 'booking'
    ];
    for (const keyword of orderKeywords) {
      if (lowerMsg.includes(keyword)) {
        return 'order_inquiry';
      }
    }

    // ✅ الأولوية 4: المنتجات (فقط إذا لم يكن سؤال عن السعر)
    const productKeywords = [
      'صور', 'صورة', 'صوره', 'صورتها', 'ممكن أشوف', 'عايز أشوف', 'عاوز أشوف',
      'photo', 'pic', 'picture', 'image', 'images', 'show me'
    ];
    for (const keyword of productKeywords) {
      if (lowerMsg.includes(keyword)) {
        return 'product_inquiry';
      }
    }

    return null;
  }

  /**
   * ✅ تحسين hasPriceMention - إضافة كلمات مفتاحية أكثر
   * @param {string} message - رسالة العميل
   * @returns {boolean}
   */
  hasPriceMention(message) {
    if (!message || typeof message !== 'string') return false;
    const priceKeywords = [
      'سعر', 'سعره', 'سعرها', 'سعر ال', 'السعر',
      'بكام', 'بكم', 'ب كام', 'ب كم',
      'كام', 'كآم', 'كم',
      'ثمن', 'ثمنه', 'ثمنها', 'ثمن ال', 'الثمن',
      'تمن', 'تمنه', 'تمنها', 'تمن ال', 'التمن',
      'شحال', 'شحال ثمن', 'شحال السعر',
      'كم سعره', 'كام سعره', 'كم السعر', 'كام السعر'
    ];
    const lowerMsg = message.toLowerCase();
    return priceKeywords.some(keyword => lowerMsg.includes(keyword));
  }

  /**
   * ✅ تحسين hasProductMention - إضافة كلمات مفتاحية أكثر
   * @param {string} message - رسالة العميل
   * @returns {boolean}
   */
  hasProductMention(message) {
    if (!message || typeof message !== 'string') return false;
    const productKeywords = [
      'منتج', 'منتجات',
      'كوتشي', 'كوتشيات', 'كوتشاي', 'كوتشايات',
      'حذاء', 'أحذية', 'حذاية',
      'شوز', 'شوزات',
      'حقيبة', 'حقائب',
      'جزمة', 'جزم',
      'صندل', 'صنادل',
      'بوت', 'بوتات', 'boot', 'boots',
      'هاف', 'هافات',
      'سابوه', 'سابوهات'
    ];
    const lowerMsg = message.toLowerCase();
    return productKeywords.some(keyword => lowerMsg.includes(keyword));
  }
}

module.exports = new IntentAnalyzer();

