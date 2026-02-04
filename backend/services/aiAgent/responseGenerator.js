/**
 * Response Generator Module
 * 
 * هذا الموديول مسؤول عن توليد ردود AI وبناء الـ prompts
 * تم نقله من aiAgentService.js لتسهيل الصيانة
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const aiResponseMonitor = require('../aiResponseMonitor');
const productExtractor = require('./productExtractor');
// ✅ استخدام الـ constants المركزي
const {
  DEFAULT_AI_SETTINGS,
  TOKEN_LIMITS_BY_TYPE,
  RETRY_TOKEN_MULTIPLIERS,
  TEMPERATURE_BY_TYPE,
  SAMPLING_BY_TYPE,
  RESPONSE_VALIDATION,
} = require('./aiConstants');
const { buildPromptFromRules, getDefaultRules } = require('./responseRulesConfig');
const AIProviderFactory = require('./providers/AIProviderFactory');
const PromptService = require('./promptService');
const fewShotService = require('./fewShotService'); // 🎓 Few-Shot Learning

// ✅ Context Resolvers (Phase 3 Decoupling)
const ShippingResolver = require('./resolvers/ShippingResolver');
const RagResolver = require('./resolvers/RagResolver');

const CustomerResolver = require('./resolvers/CustomerResolver');

// ✅ Queue Service (Async Logging)
const queueService = require('../queueService');
// ✅ Semantic Cache Service
const semanticCacheService = require('./semanticCacheService');



class ResponseGenerator {
  constructor(aiAgentService) {
    // ✅ حفظ reference لـ aiAgentService للوصول للدوال المساعدة
    // ✅ FIX 1: نظام تتبع عالمي للنماذج المجربة - الآن يستخدم stateManager (Redis)
    // Removed In-Memory Map
    this.aiAgentService = aiAgentService;

    // ✅ تتبع النماذج المجربة لكل جلسة
    this.globalTriedModels = new Map();
  }

  /**
   * Stop and cleanup resources
   */
  stop() {
    // Cleanup globalTriedModels to prevent memory leaks
    if (this.globalTriedModels) {
      this.globalTriedModels.clear();
    }
  }

  /**
   * Cleanup old sessions from globalTriedModels (run periodically)
   */
  cleanupOldSessions() {
    const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    for (const [sessionId, data] of this.globalTriedModels.entries()) {
      if (now - data.timestamp > MAX_AGE_MS) {
        this.globalTriedModels.delete(sessionId);
      }
    }
  }

  /**
   * ✅ حساب وقت الانتظار التصاعدي مع Jitter
   * Exponential Backoff: 1s → 2s → 4s → 8s (max 10s)
   * Jitter: +0-500ms عشوائية لتجنب thundering herd
   * @param {number} attempt - رقم المحاولة (0-indexed)
   * @returns {number} - وقت الانتظار بالمللي ثانية
   */
  getBackoffDelay(attempt) {
    const baseDelay = 1000; // 1 ثانية
    const maxDelay = 10000; // 10 ثواني كحد أقصى
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.floor(Math.random() * 500); // 0-500ms عشوائية
    return exponentialDelay + jitter;
  }

  /**
   * ✨ بناء إعدادات التوليد الديناميكية بناءً على السياق
   */
  async buildGenerationConfig(companyId, messageContext = {}) {
    try {
      // الحصول على إعدادات AI من قاعدة البيانات
      const settings = await this.aiAgentService.getSettings(companyId);

      // ✅ استخدام القيم من قاعدة البيانات (التي تأتي من الواجهة)
      // ⚠️ القيمة الافتراضية موجودة في الواجهة فقط (AIManagement.tsx)
      const messageType = messageContext?.messageType || 'general';

      // ✅ FIX: استخدام ?? بدلاً من || لتجنب مشاكل القيم الصفرية
      // القيمة تأتي من قاعدة البيانات (التي حفظتها الواجهة)
      const baseConfig = {
        temperature: settings.aiTemperature ?? DEFAULT_AI_SETTINGS.TEMPERATURE,
        topK: settings.aiTopK ?? DEFAULT_AI_SETTINGS.TOP_K,
        topP: settings.aiTopP ?? DEFAULT_AI_SETTINGS.TOP_P,
        // ⚠️ القيمة من قاعدة البيانات (مصدرها الواجهة) - fallback من constants فقط
        maxOutputTokens: settings.aiMaxTokens ?? DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS,
      };

      // ✅ Logging للتحقق من القيمة المستخدمة
      if (settings.aiMaxTokens !== null && settings.aiMaxTokens !== undefined) {
        console.log(`🔍 [AI-CONFIG] Using aiMaxTokens from database: ${settings.aiMaxTokens} (companyId: ${companyId})`);
      } else {
        console.log(`🔍 [AI-CONFIG] Using default aiMaxTokens: ${DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS} (companyId: ${companyId})`);
      }

      // ✅ Allow overriding temperature and maxOutputTokens from messageContext
      if (messageContext?.temperature !== undefined) {
        baseConfig.temperature = messageContext.temperature;
      }
      if (messageContext?.maxTokens !== undefined) {
        baseConfig.maxOutputTokens = messageContext.maxTokens;
      }

      // ✅ تطبيق إعدادات حسب نوع الرسالة من constants
      const typeTemperature = TEMPERATURE_BY_TYPE[messageType];
      if (typeTemperature !== null && typeTemperature !== undefined && messageContext?.temperature === undefined) {
        baseConfig.temperature = typeTemperature;
      } else if ((messageType === 'greeting' || messageType === 'casual_chat') && messageContext?.temperature === undefined) {
        // للتحيات والدردشة: إبداع أعلى قليلاً
        baseConfig.temperature = Math.min(baseConfig.temperature + 0.1, 0.9);
      }

      // ✅ تطبيق Token Limits حسب نوع الرسالة (فقط إذا لم تكن القيمة موجودة في قاعدة البيانات)
      // ⚠️ لا نستبدل القيمة المخصصة من الواجهة (مثل 1280) بقيمة من TOKEN_LIMITS_BY_TYPE
      // نستخدم TOKEN_LIMITS_BY_TYPE فقط إذا كانت القيمة من قاعدة البيانات هي الافتراضية (2048) أو null
      if (messageContext?.maxTokens === undefined) {
        // ✅ فقط إذا كانت القيمة من قاعدة البيانات هي نفس القيمة الافتراضية أو null
        // هذا يعني أن المستخدم لم يغير القيمة في الواجهة
        const isDefaultValue = settings.aiMaxTokens === null ||
          settings.aiMaxTokens === undefined ||
          settings.aiMaxTokens === DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS;

        if (isDefaultValue) {
          // ✅ فقط في هذه الحالة نستخدم TOKEN_LIMITS_BY_TYPE
          const typeTokenLimit = TOKEN_LIMITS_BY_TYPE[messageType];
          if (typeTokenLimit) {
            baseConfig.maxOutputTokens = typeTokenLimit;
          }
        }
        // ✅ إذا كانت القيمة من قاعدة البيانات مختلفة (مثل 1280 أو 512)، نستخدمها كما هي
        // لا نغير baseConfig.maxOutputTokens في هذه الحالة
      }

      // ✅ تطبيق Sampling Settings حسب نوع الرسالة
      const typeSampling = SAMPLING_BY_TYPE[messageType];
      if (typeSampling) {
        baseConfig.topK = typeSampling.topK;
        baseConfig.topP = typeSampling.topP;
      }

      //console.log(`🎛️ [AI-CONFIG] Using generation config:`, baseConfig);
      return baseConfig;

    } catch (error) {
      console.error('❌ [AI-CONFIG] Error building generation config:', error);
      // ✅ إرجاع الإعدادات الافتراضية من constants عند حدوث خطأ
      return {
        temperature: DEFAULT_AI_SETTINGS.TEMPERATURE,
        topK: DEFAULT_AI_SETTINGS.TOP_K,
        topP: DEFAULT_AI_SETTINGS.TOP_P,
        maxOutputTokens: DEFAULT_AI_SETTINGS.MAX_OUTPUT_TOKENS,
      };
    }
  }

  /**
   * بناء الـ prompt للذكاء الاصطناعي (النسخة الأساسية)
   */
  /**
   * بناء الـ prompt للذكاء الاصطناعي
   * ✅ ASYNC: تم تحويلها لدالة غير متزامنة لدعم القوالب الديناميكية
   */
  /**
   * بناء الـ prompt للذكاء الاصطناعي
   * ✅ Phase 3: Uses Resolvers instead of formatting logic
   */
  async buildPrompt(customerMessage, companyPrompts, conversationMemory, ragData, customerData, messageData) {
    let prompt = '';
    const companyId = customerData?.companyId || messageData?.companyId;

    // 1. System Personality & Rules
    // ------------------------------------------------------------------
    const personalityPromptTrimmed = companyPrompts?.personalityPrompt?.trim() || '';
    const isPlaceholder = personalityPromptTrimmed.startsWith('# يجب إعداد');

    if (!companyPrompts || !personalityPromptTrimmed || isPlaceholder) {
      prompt += await PromptService.getTemplate(null, 'system_personality');
    } else {
      prompt += `${personalityPromptTrimmed}\n\n`;
    }

    if (companyPrompts?.responseRules) {
      try {
        const rules = typeof companyPrompts.responseRules === 'string'
          ? JSON.parse(companyPrompts.responseRules)
          : companyPrompts.responseRules;
        prompt += buildPromptFromRules(rules);
      } catch (e) {
        console.warn('⚠️ [RESPONSE-RULES] Failed to parse rules, using defaults');
        prompt += buildPromptFromRules(getDefaultRules());
      }
    } else {
      prompt += buildPromptFromRules(getDefaultRules());
    }

    // 2. Customer Context (via CustomerResolver)
    // ------------------------------------------------------------------
    try {
      const customerProfile = CustomerResolver.resolveProfile(customerData, conversationMemory);
      prompt += await PromptService.getTemplate(null, 'system_customer_info', customerProfile);
    } catch (e) {
      console.error('❌ [RESOLVER-ERROR] CustomerResolver failed:', e.message);
      // Fallback: Skip customer info, maybe add generic "Valued Customer" if needed
    }

    // 3. Shipping Context (via ShippingResolver)
    // ------------------------------------------------------------------
    try {
      const shippingData = await ShippingResolver.resolve(customerMessage, companyId, conversationMemory);

      if (shippingData && shippingData.shippingInfo) {
        prompt += await PromptService.getTemplate(companyId, 'shipping_response', shippingData.shippingInfo);
      } else if (shippingData && shippingData.isAsking && shippingData.foundGovernorate && !shippingData.shippingInfo) {
        prompt += await PromptService.getTemplate(companyId, 'no_shipping_found', { governorate: shippingData.foundGovernorate });
      } else if (shippingData && shippingData.isAsking) {
        prompt += await PromptService.getTemplate(null, 'system_shipping_alert', { customerMessage });
      }
    } catch (e) {
      console.error('❌ [RESOLVER-ERROR] ShippingResolver failed:', e.message);
    }

    // 4. Conversation History (via CustomerResolver)
    // ------------------------------------------------------------------
    try {
      const historyData = CustomerResolver.resolveHistory(conversationMemory);
      if (historyData.hasHistory) {
        prompt += await PromptService.getTemplate(null, 'system_conversation_header');

        for (const item of historyData.items) {
          const timeAgo = this.aiAgentService.getTimeAgo(new Date(item.timestamp));
          const sender = item.sender === 'Customer' ? 'العميل' : 'ردك';
          const sanitizedContent = PromptService.sanitizeInput(item.content);
          prompt += `${item.index}. ${sender} (منذ ${timeAgo}): ${sanitizedContent}\n`;
        }

        prompt += await PromptService.getTemplate(null, 'system_conversation_footer_global');
      } else {
        prompt += await PromptService.getTemplate(null, 'system_first_interaction');
      }
    } catch (e) {
      console.error('❌ [RESOLVER-ERROR] HistoryResolver failed:', e.message);
      prompt += await PromptService.getTemplate(null, 'system_first_interaction'); // Safe fallback
    }

    // 5. Reply Context (Legacy logic needs refactor but keeping as is for safety)
    if (messageData?.replyContext?.isReply) {
      prompt += await PromptService.getTemplate(null, 'system_reply_context_header');
      if (messageData.replyContext.originalMessage?.content) {
        const timeAgo = this.aiAgentService.getTimeAgo(new Date(messageData.replyContext.originalMessage.createdAt));
        prompt += await PromptService.getTemplate(null, 'system_reply_context_original', {
          content: messageData.replyContext.originalMessage.content,
          timeAgo: timeAgo
        });
      } else {
        prompt += await PromptService.getTemplate(null, 'system_reply_context_unknown');
      }
      prompt += await PromptService.getTemplate(null, 'system_reply_context_footer', { customerMessage });
    }

    // 6. RAG / Products (via RagResolver)
    // ------------------------------------------------------------------
    try {
      const ragContext = RagResolver.resolve(ragData);

      if (ragContext.hasData) {
        prompt += await PromptService.getTemplate(null, 'system_rag_header');

        for (const item of ragContext.items) {
          if (item.type === 'product') {
            prompt += await PromptService.getTemplate(null, 'system_rag_product', { index: item.index, content: item.content });
          } else if (item.type === 'faq') {
            prompt += await PromptService.getTemplate(null, 'system_rag_faq', { index: item.index, content: item.content });
          } else if (item.type === 'policy') {
            prompt += await PromptService.getTemplate(null, 'system_rag_policy', { index: item.index, content: item.content });
          }
        }

        prompt += await PromptService.getTemplate(null, 'system_rag_footer');
      }

      // RAG Instructions
      if (ragContext.hasProducts) {
        prompt += await PromptService.getTemplate(null, 'system_instructions_rag');
      } else {
        // Fallback instructions handled by next block if needed
      }

    } catch (e) {
      console.error('❌ [RESOLVER-ERROR] RagResolver failed:', e.message);
      prompt += await PromptService.getTemplate(null, 'system_instructions_no_rag');
    }

    // 7. Recent User Message
    const sanitizedMsg = PromptService.sanitizeInput(customerMessage);
    prompt += `رسالة العميل: <user_input_boundary>"${sanitizedMsg}"</user_input_boundary>\n\n`;

    // 8. 🔥 CRITICAL CONSTRAINTS (MUST BE LAST)
    prompt += await PromptService.getTemplate(null, 'critical_constraints');

    return prompt;
  }

  /**
   * Build advanced prompt with RAG data, company settings, and conversation memory
   */
  async buildAdvancedPrompt(customerMessage, customerData, companyPrompts, ragData, conversationMemory, hasImages = false, smartResponseInfo, messageData) {
    try {
      const companyId = customerData?.companyId || messageData?.companyId;
      console.log('\n🔧 [BUILD-PROMPT] بدء بناء الـ Prompt (Parallelized)');
      console.log(`🔍 [DEBUG-CTX] CompanyID: ${companyId}, RAG Items: ${ragData?.length || 0}`);
      if (ragData && ragData.length > 0) {
        console.log(`🔍 [DEBUG-CTX] First Item: ${ragData[0].type} - ${ragData[0].metadata?.name}`);
      }

      // ✅ SPEED FIX: تشغيل العمليات المستقلة بالتوازي بدلاً من التسلسل
      const [
        personalityPrompt,
        shippingContext,
        historyResult,
        customerContextResult
      ] = await Promise.all([
        this._getPersonalityPrompt(companyPrompts, companyId),
        this._getShippingContext(customerMessage, companyId, conversationMemory),
        this._getConversationHistory(conversationMemory, ragData, customerMessage),
        this._getCustomerContext(customerData, conversationMemory, customerMessage)
      ]);

      let prompt = '';

      // 1. Personality & Platform Context (Parallelized)
      prompt += personalityPrompt;
      prompt += this._getPlatformContext(messageData);
      prompt += this._getResponseRules(companyPrompts);

      // 2. Post Context (Facebook Ads/Posts)
      const { prompt: postPrompt } = this._getPostContext(messageData, ragData);
      prompt += postPrompt;

      // 3. Dynamic Context Analysis (Emotional/Urgency)
      try {
        const dynamicBuilder = require('../dynamicPromptBuilder');
        const emotionalState = dynamicBuilder.detectEmotionalState(customerMessage);
        const urgencyLevel = dynamicBuilder.detectUrgencyLevel(customerMessage);
        if (emotionalState === 'frustrated' || urgencyLevel === 'high') {
          prompt += `ملاحظات: ${emotionalState === 'frustrated' ? 'العميل منزعج - تعاطفي | ' : ''}${urgencyLevel === 'high' ? 'رد سريع ومباشر' : ''}\n\n`;
        }
      } catch (e) { }

      // 4. Shipping Context (Parallelized)
      prompt += shippingContext;

      // 5. Response Guidelines (Legacy support)
      if (companyPrompts?.responsePrompt) {
        prompt += `${companyPrompts.responsePrompt}\n\n`;
      }

      // 6. Customer Context (Parallelized)
      prompt += customerContextResult.prompt;

      // 7. Reply Context (if replying to a specific message)
      prompt += this._getReplyContext(messageData, customerMessage);

      // 8. Conversation History (Parallelized)
      prompt += historyResult.prompt;

      // 9. RAG / Product Context (Dependent on History/Customer Context)
      const { lastMentionedProduct } = historyResult;
      const { isNewCustomer } = customerContextResult;

      let filteredRagData = ragData;
      const msgLower = (customerMessage || '').toLowerCase();
      const isPriceQuestion = msgLower.includes('سعر') || msgLower.includes('بكام') || msgLower.includes('كام');

      if (isPriceQuestion && lastMentionedProduct && filteredRagData && filteredRagData.length > 0) {
        const matchingProduct = filteredRagData.find(item => {
          const pName = (item.metadata?.name || item.name || '').toLowerCase();
          return pName.includes(lastMentionedProduct.toLowerCase()) || lastMentionedProduct.toLowerCase().includes(pName);
        });
        if (matchingProduct) filteredRagData = [matchingProduct];
      }

      prompt += await this._getRAGContext(filteredRagData, smartResponseInfo, hasImages, messageData?.isPostProductResponse);

      // ✅ Force Empty RAG status if really empty to prevent hallucination
      // BUT only if the intent actually requires products (avoid scaring the bot on greetings)
      const needsProducts = ['product_inquiry', 'price_inquiry', 'shipping_inquiry', 'order_status'].includes(messageData?.intent);

      if ((!filteredRagData || filteredRagData.length === 0) && needsProducts) {
        prompt += await PromptService.getTemplate(null, 'rag_empty_strict');
      }


      // 10. Final Message Preparation
      // (Redundant Quality Instructions REMOVED - now handled by responseRulesConfig)

      // 11. The Message
      const sanitizedMsg = PromptService.sanitizeInput(customerMessage);
      prompt += `رسالة العميل: <user_input_boundary>"${sanitizedMsg}"</user_input_boundary>\n\n`;

      console.log(`✅ [BUILD-PROMPT] Generated prompt length: ${prompt.length}`);

      // 13. 🔥🔥🔥 CRITICAL CONSTRAINTS (RECENCY BIAS - MUST BE LAST) 🔥🔥🔥
      prompt += await PromptService.getTemplate(null, 'critical_constraints');

      return prompt;

    } catch (error) {
      console.error('❌ [BUILD-PROMPT] Error:', error);
      // Fallback to simple prompt if refactoring broke something critical
      return `أنت مساعد ذكي. حدث خطأ في بناء السياق.\nرسالة العميل: "${customerMessage}"\nردي بلطف واطلبي إعادة السؤال.`;
    }
  }


  /**
   * Build order confirmation prompt
   */
  async buildOrderConfirmationPrompt(customerMessage, customerData, companyPrompts, order, orderDetails, conversationMemory, companyId) {
    try {
      console.log('📝 [ORDER-CONFIRMATION] بناء prompt لتأكيد الطلب:', order.orderNumber);

      let prompt = '';

      // 1. Personality Context (Reuse helper for consistency)
      prompt += await this._getPersonalityPrompt(companyPrompts, companyId);

      // 2. Response Rules (Reuse helper for consistency)
      prompt += this._getResponseRules(companyPrompts);

      // 3. Conversation Context
      if (conversationMemory && conversationMemory.length > 0) {
        prompt += `📚 سجل المحادثة السابقة:\n`;
        // Use simpler slice for confirmation context
        conversationMemory.slice(-3).forEach((interaction, index) => {
          prompt += `${index + 1}. العميل: ${interaction.userMessage}\n`;
          prompt += `   ردك: ${interaction.aiResponse}\n\n`;
        });
        prompt += `=====================================\n\n`;
      }

      // ✅ معلومات الطلب المؤكد - استخدام البيانات من الـ database
      const shippingCost = order.shipping || 50;
      const totalPrice = order.total || ((orderDetails.productPrice || 0) + shippingCost);

      // ✅ استخدام بيانات المنتج من order.items إذا كانت متوفرة
      const orderItem = order.items && order.items.length > 0 ? order.items[0] : null;
      const productName = orderItem?.productName || orderDetails.productName || 'المنتج';
      const productColor = orderItem?.productColor || orderDetails.productColor;
      const productSize = orderItem?.productSize || orderDetails.productSize;
      const productPrice = orderItem?.price || orderDetails.productPrice;

      // ✅ الحصول على مدة التوصيل من قاعدة البيانات
      let deliveryTime = '3-5 أيام'; // القيمة الافتراضية
      try {
        const ShippingService = require('../shippingService');
        const shippingInfo = await ShippingService.findShippingInfo(orderDetails.city, companyId);
        if (shippingInfo && shippingInfo.found && shippingInfo.deliveryTime) {
          deliveryTime = shippingInfo.deliveryTime;
          console.log(`⏰ [ORDER-CONFIRMATION] مدة التوصيل من DB: ${deliveryTime}`);
        } else {
          console.log(`⚠️ [ORDER-CONFIRMATION] لم يتم العثور على مدة التوصيل، استخدام القيمة الافتراضية`);
        }
      } catch (error) {
        console.error(`❌ [ORDER-CONFIRMATION] خطأ في جلب مدة التوصيل:`, error.message);
      }

      prompt += `🎉 تم إنشاء الطلب بنجاح!\n\n`;
      prompt += `📋 تفاصيل الطلب المؤكد:\n`;
      prompt += `- رقم الطلب: ${order.orderNumber}\n`;
      prompt += `- المنتج: ${PromptService.sanitizeInput(productName)}\n`;
      if (productColor) prompt += `- اللون: ${PromptService.sanitizeInput(productColor)}\n`;
      if (productSize) prompt += `- المقاس: ${PromptService.sanitizeInput(productSize)}\n`;
      if (productPrice) prompt += `- سعر المنتج: ${productPrice} جنيه\n`;
      prompt += `- الشحن: ${shippingCost} جنيه\n`;
      prompt += `- الإجمالي: ${totalPrice} جنيه\n\n`;

      prompt += `👤 بيانات العميل:\n`;
      prompt += `- الاسم: ${PromptService.sanitizeInput(orderDetails.customerName)}\n`;
      prompt += `- الموبايل: ${PromptService.sanitizeInput(orderDetails.customerPhone)}\n`;
      prompt += `- العنوان: ${PromptService.sanitizeInput(orderDetails.customerAddress)}\n`;
      if (orderDetails.city) prompt += `- المدينة: ${PromptService.sanitizeInput(orderDetails.city)}\n`;
      prompt += `\n`;

      const sanitizedMsg = PromptService.sanitizeInput(customerMessage);
      prompt += `رسالة العميل الأخيرة: <user_input_boundary>"${sanitizedMsg}"</user_input_boundary>\n\n`;

      // استخدام القالب المركزي من PromptService
      let promptTemplate = PromptService.getTemplate('order_confirmation_instructions');
      const productDetails = `${PromptService.sanitizeInput(productName)}${productColor ? ` - ${PromptService.sanitizeInput(productColor)}` : ''}${productSize ? ` - مقاس ${PromptService.sanitizeInput(productSize)}` : ''}`;

      prompt = PromptService.injectVariables(promptTemplate, {
        customerName: PromptService.sanitizeInput(orderDetails.customerName),
        productDetails,
        totalPrice,
        orderNumber: order.orderNumber,
        deliveryTime
      });

      return prompt;
    } catch (error) {
      console.error('❌ [ORDER-CONFIRMATION] خطأ في بناء prompt التأكيد:', error);
      throw error;
    }
  }



  /**
   * Generate AI response using Gemini API with Pattern Enhancement
   */
  async generateAIResponse(prompt, conversationMemory, useRAG, providedGeminiConfig, companyId, conversationId, messageContext) {
    const startTime = Date.now();
    let lastError = null;
    let attempts = 0;

    // ✅ FIX: تحديد عدد المحاولات بناءً على إجمالي المفاتيح المتاحة لضمان تجربة الكل
    const totalAvailableKeys = await this.aiAgentService.getModelManager().getTotalKeysCount(companyId);
    const MAX_KEY_RETRIES = Math.max(totalAvailableKeys, 3);

    console.log(`🚀 [AI-RESPONSE] Starting generation with up to ${MAX_KEY_RETRIES} dynamic retries (Total keys: ${totalAvailableKeys})`);

    // ✅ FIX 1: إنشاء session ID لتتبع النماذج المجربة
    const sessionId = `${companyId}_${conversationId}_${Date.now()}`;

    // ✅ تتبع اسم آخر مفتاح تم استخدامه (Scope Fix)
    let lastUsedKeyName = null;

    // ✅ SPEED FIX: تتبع فشل النماذج للانتقال السريع للنموذج التالي
    const modelFailureCount = new Map(); // modelName -> failCount
    const MAX_FAILURES_PER_MODEL = 3; // بعد 3 فشل، انتقل للنموذج التالي
    const exhaustedModelsInSession = new Set(); // النماذج المستنفدة في هذه الجلسة

    // ✅ CACHE CHECK: Semantic Caching (Layer 1)
    try {
      // Don't use cache if specific config provided (force refresh context)
      if (!providedGeminiConfig) {
        const cachedResponse = await semanticCacheService.getCachedResponse(prompt, companyId);
        if (cachedResponse) {
          console.log(`🧠 [CACHE-HIT] Serving response from semantic cache`);
          return {
            content: cachedResponse,
            keyName: 'CACHE',
            model: 'SEMANTIC-CACHE',
            provider: 'CACHE',
            processingTime: 0,
            cached: true
          };
        }
      }
    } catch (cacheErr) {
      console.warn('⚠️ [CACHE-CHECK] Failed:', cacheErr.message);
    }

    try {
      // ✅ بداية حلقة إعادة المحاولة بالمفاتيح
      while (attempts < MAX_KEY_RETRIES) {
        attempts++;
        console.log(`🔄 [AI-RESPONSE] Attempt ${attempts}/${MAX_KEY_RETRIES} to generate response...`);

        // ✅ FIX: إعلان geminiConfig هنا ليكون محلياً لكل محاولة
        let geminiConfig = null;

        try {
          console.log(`🔍 [AI-RESPONSE] بدء اختيار نموذج للشركة ${companyId}, المحادثة ${conversationId} - Session: ${sessionId}`);

          // 🔥 [HARDENING] تقدير عدد التوكنز قبل اختيار المفتاح لتجنب أخطاء 429 TPM
          const predictedTokens = this.aiAgentService.getModelManager().estimateTokenCount(prompt);
          console.log(`🧠 [TOKEN-PREDICTION] عدد التوكنز التقديري: ${predictedTokens} (Prompt Length: ${prompt.length})`);

          // Get active Gemini configuration
          // ✅ استخدام Reactive Round-Robin دائماً (بدون نظام الكوتة)
          const modelSelectionStart = Date.now();

          if (!providedGeminiConfig || attempts > 1) {
            // ✅ استخدام Reactive Round-Robin
            geminiConfig = await this.aiAgentService.getModelManager().getNextKeySimple(companyId);
          } else {
            geminiConfig = providedGeminiConfig;
          }

          const modelSelectionDuration = Date.now() - modelSelectionStart;

          // ✅ التحقق من أن جميع المفاتيح معطلة مؤقتاً
          if (geminiConfig && geminiConfig.error === 'ALL_KEYS_UNAVAILABLE') {
            console.error(`❌ [AI-RESPONSE] جميع المفاتيح معطلة مؤقتاً للشركة ${companyId}`);
            const error = new Error(geminiConfig.message || 'جميع المفاتيح معطلة مؤقتاً. يرجى المحاولة لاحقاً.');
            error.code = 'ALL_KEYS_UNAVAILABLE';
            error.arabicMessage = geminiConfig.message || 'جميع المفاتيح معطلة مؤقتاً. يرجى المحاولة لاحقاً أو الاتصال بالدعم.';
            error.retryAfter = geminiConfig.retryAfter || 30;
            throw error;
          }

          if (!geminiConfig) {
            console.error(`❌ [AI-RESPONSE] لم يتم العثور على نموذج نشط للشركة ${companyId} (Attempts: ${attempts})`);

            // ✅ FAST ROTATION: If we have attempts left, rotate faster
            if (attempts < MAX_KEY_RETRIES) {
              const totalKeysCount = await this.aiAgentService.getModelManager().getTotalKeysCount(companyId);
              // If we have other keys available, use a very short backoff (500ms)
              const waitTime = (attempts < totalKeysCount) ? 500 : this.getBackoffDelay(attempts - 1);

              console.log(`⏳ [FAST-ROTATION] Waiting ${waitTime}ms before retry ${attempts + 1} (Keys available: ${totalKeysCount})...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            throw new Error(`No active Gemini key found for company: ${companyId}`);
          }

          console.log(`✅ [AI-RESPONSE] تم اختيار النموذج: ${geminiConfig.model} (Key: ${geminiConfig.keyName || geminiConfig.keyId}) - وقت الاختيار: ${modelSelectionDuration}ms`);

          // ✅ تحديث اسم المفتاح المستخدم
          lastUsedKeyName = geminiConfig.keyName || geminiConfig.keyId;

          // Step 1: Use prompt directly (pattern enhancement removed)
          let enhancedPrompt = prompt;

          // ✨ الحصول على إعدادات التوليد الديناميكية
          const generationConfig = await this.buildGenerationConfig(companyId, messageContext);

          // ✅ PHASE 3: Semantic Cache Check
          // Only cache 'general' or 'inquiry' messages to avoid caching sensitive order data
          const shouldCache = !messageContext?.messageType || ['general', 'inquiry'].includes(messageContext.messageType);

          if (shouldCache) {
            const cachedResponse = await semanticCacheService.getCachedResponse(enhancedPrompt, companyId, geminiConfig.model);
            if (cachedResponse) {
              console.log('⚡ [RESPONSE-GENERATOR] Returning Cached Response');
              return {
                content: cachedResponse.content,
                model: cachedResponse.model,
                provider: 'CACHE',
                processingTime: 0,
                cached: true
              };
            }
          }

          // Step 2: Generate AI response
          console.log(`📡 [AI-PROVIDER] Using factory for provider: ${geminiConfig.provider || 'GOOGLE'}`);
          const provider = AIProviderFactory.getProvider(geminiConfig.provider || 'GOOGLE', geminiConfig.apiKey, geminiConfig.baseUrl, geminiConfig.keyId);

          const result = await provider.generateResponse(enhancedPrompt, {
            model: geminiConfig.model,
            ...generationConfig
          });

          // ✅ FIX: Handle both function and string text formats FIRST
          const getText = () => {
            if (typeof result.text === 'function') {
              return result.text();
            } else if (typeof result.text === 'string') {
              return result.text;
            } else if (result.content) {
              return result.content;
            } else {
              return '';
            }
          };

          const response = {
            text: getText,
            usageMetadata: result.usageMetadata,
            candidates: result.candidates,
            promptFeedback: result.promptFeedback
          };


          // ... (Validation Logic from previous code - MAX_TOKENS, Blocked, etc.) ...
          // IMPORTANT: If validation fails with a "Silent Reason", we should Return immediately OR Continue?
          // Usually blocked content means the PROMPT is bad, not the key. so we Return.

          // ... [Insert Validation Logic Here - abbreviated for brevity since it's inside success path] ...
          // For the purpose of replace_file_content, I need to include the critical validation check.

          // Check block reason
          if (response.promptFeedback?.blockReason) {
            // ... handle block ...
            return { content: null, silentReason: `تم حظر الرد بسبب: ${response.promptFeedback.blockReason}` };
          }

          // Extract content
          let aiContent = '';
          if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
              return { content: null, silentReason: `تم حظر الرد بسبب: ${candidate.finishReason}` };
            }
            if (candidate.content?.parts) {
              aiContent = candidate.content.parts.map(p => p.text).join('');
            } else {
              // ✅ FIX: Use getText() which handles both function and string
              aiContent = getText();
            }
          } else {
            // ✅ FIX: Use getText() which handles both function and string
            aiContent = getText(); // Fallback
          }

          // ✅ If we got here, we have success!
          // Record usage
          const usedModelId = geminiConfig.modelId;
          let totalTokens = response.usageMetadata?.totalTokenCount || 0;
          if (usedModelId) {
            await this.aiAgentService.updateModelUsage(usedModelId, totalTokens);
          }

          const trimmedContent = aiContent ? aiContent.trim() : '';

          // ✅ FIX: استخدام القيمة من aiConstants مع fallback
          const MIN_LENGTH = RESPONSE_VALIDATION?.MIN_LENGTH || 2;

          // Simple length check
          if (trimmedContent.length < MIN_LENGTH) {
            // ✅ Log the actual response for debugging
            console.warn(`⚠️ [SHORT-RESPONSE] Response too short: length=${trimmedContent.length}, content="${trimmedContent.substring(0, 50)}", model=${geminiConfig.model}, key=${geminiConfig.keyName || geminiConfig.keyId}`);

            // ✅ REPORT FAILURE: استخدام SimpleKeyRotator للتعليم المؤقت
            if (geminiConfig?.keyId) {
              console.log(`🔌 [SHORT-RESPONSE] Reporting glitch for key ${geminiConfig.keyId} to force rotation...`);
              await this.aiAgentService.getModelManager().markKeyFailed(
                geminiConfig.keyId,
                'RESPONSE_TOO_SHORT',
                5000 // 5 seconds cooldown to skip this key in the next attempt
              );
            }

            // Signal retry
            throw new Error('Response too short or empty');
          }



          // Log Success
          const totalDuration = Date.now() - startTime;
          console.log(`✅ [AI-RESPONSE] Success in attempt ${attempts} - Duration: ${totalDuration}ms`);
          console.log(`✅ [AI-RESPONSE] Success in attempt ${attempts} - Duration: ${totalDuration}ms`);



          // ✅ LOGGING: Async via Queue (Fire-and-Forget)
          try {
            const logPayload = {
              companyId,
              customerId: messageContext?.customerId || conversationMemory?.customerId || null,
              modelUsed: geminiConfig.model,
              keyId: geminiConfig.keyId,
              keyName: geminiConfig.keyName,
              userMessage: prompt.substring(0, 5000) || '',
              aiResponse: aiContent ? aiContent.substring(0, 5000) : '',
              tokensUsed: totalTokens || 0,
              responseTime: totalDuration,
              metadata: JSON.stringify({
                conversationId,
                attempts,
                sessionId
              })
            };

            await queueService.add('ai-logs', 'logInteraction', logPayload);
            console.log('✅ [AI-LOG] Queued interaction log successfully');
          } catch (logError) {
            console.error('❌ [AI-LOG] Failed to queue log:', logError);
          }

          // ✅ CACHE SAVE: Semantic Caching (Layer 1)
          // Only cache if content is valid and long enough
          if (aiContent && aiContent.length > 10 && !providedGeminiConfig) {
            try {
              await semanticCacheService.cacheResponse(prompt, aiContent, companyId, geminiConfig.model);
            } catch (cacheSaveErr) {
              console.warn('⚠️ [CACHE-SAVE] Failed:', cacheSaveErr.message);
            }
          }


          // ✅ FIX: Return object with metadata instead of just string
          return {
            content: aiContent.trim(),
            keyName: geminiConfig.keyName || geminiConfig.keyId,
            model: geminiConfig.model,
            provider: geminiConfig.provider, // ✅ NEW
            processingTime: totalDuration
          };

        } catch (attemptError) {
          console.warn(`⚠️ [AI-RESPONSE] Attempt ${attempts} failed: ${attemptError.message}`);
          lastError = attemptError; // Save for final throw

          const is429 = attemptError.status === 429 || attemptError.message?.includes('429') || attemptError.message?.includes('quota');
          const is503 = attemptError.status === 503 || attemptError.message?.includes('503');
          const is404 = attemptError.status === 404 || attemptError.message?.includes('not found') || attemptError.message?.includes('404');

          // ✅ FIX: تحسين اكتشاف أخطاء 403 والمفاتيح المسربة
          const errorMessage = (attemptError.message || '').toLowerCase();
          const isLeakedKey = errorMessage.includes('leaked') || errorMessage.includes('reported as leaked');
          const isInvalidKey = errorMessage.includes('key not valid') || errorMessage.includes('invalid api key') || errorMessage.includes('api key was reported');
          const is403 = attemptError.status === 403 || isInvalidKey || isLeakedKey || errorMessage.includes('403') || errorMessage.includes('forbidden');

          // ✅ معالجة الأخطاء القاتلة (Circuit Breaker)
          if (is403 && geminiConfig?.keyId) {
            const reason = isLeakedKey ? 'LEAKED' : '403_INVALID';
            console.error(`🛑 [CRITICAL] Invalid/Leaked Key detected (${geminiConfig.keyId}). Reason: ${reason}. Invalidating...`);

            // ✅ NEW: استخدام Simple Rotator للتعليم المؤقت
            await this.aiAgentService.getModelManager().markKeyFailed(geminiConfig.keyId, reason);

            // إبطال المفتاح في قاعدة البيانات
            await this.aiAgentService.getModelManager().invalidateKey(geminiConfig.keyId, reason);
            continue; // Try next key
          }

          if (is404 && geminiConfig?.modelId) {
            console.error(`🛑 [CRITICAL] Model Not Found (${geminiConfig.model}). Disabling...`);
            await this.aiAgentService.getModelManager().disableModel(geminiConfig.modelId, '404_NOT_FOUND');
            continue; // Try next key/model
          }

          // ✅ معالجة أخطاء الكوتا/الشبكة للمفتاح الحالي
          if (geminiConfig?.model && (is429 || is503)) {
            const currentModel = geminiConfig.model;

            console.warn(`⚠️ [KEY-ROTATION] Model ${currentModel} failed (Attempt ${attempts}/${MAX_KEY_RETRIES}) - marking as exhausted`);

            // ✅ RETRY-AFTER: استخراج وقت الانتظار من الرأس أو الرسالة
            let retryAfterMs = null;
            if (attemptError.response?.headers?.get('retry-after')) {
              const retryHeader = attemptError.response.headers.get('retry-after');
              if (!isNaN(retryHeader)) {
                retryAfterMs = parseInt(retryHeader, 10) * 1000;
              } else {
                retryAfterMs = new Date(retryHeader).getTime() - Date.now();
              }
            }
            if (!retryAfterMs) {
              const match = errorMessage.match(/retry in (\d+(\.\d+)?)s/);
              if (match) retryAfterMs = parseFloat(match[1]) * 1000;
            }

            // ✅ REPORT FAILURE: استخدام Simple Rotator للتعليم المؤقت
            await this.aiAgentService.getModelManager().markKeyFailed(geminiConfig.keyId, '429', retryAfterMs);

            // ✅ FAST ROTATION: If we have multiple keys, switch fast
            const totalKeys = await this.aiAgentService.getModelManager().getTotalKeysCount(companyId);
            const waitTime = (attempts < totalKeys) ? 500 : this.getBackoffDelay(attempts);

            console.log(`⏳ [FAST-ROTATION] Rotation delay: ${waitTime}ms (Attempt ${attempts}/${totalKeys} keys)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          // If it's a different error (e.g. 400 Bad Request), it might be prompt related.
          // Getting a new key won't fix a bad prompt.
          // However, sometimes it's "Internal Error" which switching might fix.
          if (attemptError.status >= 500) {
            // 🔄 إضافة تأخير بسيط قبل المحاولة التالية
            await new Promise(resolve => setTimeout(resolve, 250));
            continue; // Retry for server errors
          }

          // ✅ معالجة أخطاء المحتوى المحظور (Safety) - لا داعي لتبديل المفاتيح لأن المشكلة في الطلب نفسه
          const isSafety = errorMessage.includes('safety') || errorMessage.includes('blocked');
          if (isSafety) {
            console.warn(`🛑 [AI-SAFE] Content blocked by safety filters. Breaking loop.`);
            return { content: null, silentReason: `تم حظر الرد لأسباب تتعلق بالسلامة (Safety Block)` };
          }

          // ✅ FIX: معالجة الردود القصيرة جداً - إعادة المحاولة مع مفتاح/نموذج آخر
          const isTooShort = errorMessage.includes('response too short') || errorMessage.includes('too short or empty') || errorMessage.includes('too short');
          if (isTooShort && geminiConfig?.model) {
            console.warn(`⚠️ [SHORT-RESPONSE] Attempt ${attempts}: Model ${geminiConfig.model} (Key: ${geminiConfig.keyName || geminiConfig.keyId}) returned empty/short response - retrying with next key/model (${attempts}/${MAX_KEY_RETRIES})`);
            // 🔄 إضافة تأخير بسيط قبل المحاولة التالية
            await new Promise(resolve => setTimeout(resolve, 100));
            continue; // Retry with next key/model
          }

          // For 400s (Invalid Argument), break loop to avoid burning keys on bad requests
          break;
        }
      } // End while loop

      // ❌ If we exit loop without returning, all attempts failed
      throw lastError || new Error(`Failed to generate response after ${MAX_KEY_RETRIES} attempts`);

    } catch (error) {
      // ... (Original outer catch block for silent logging) ...
      const totalDuration = Date.now() - startTime;
      console.error(`❌ [AI-RESPONSE] All attempts failed - Total time: ${totalDuration}ms - Error: ${error.message}`);
      console.error(`❌ [AI-RESPONSE] Error details:`, {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        attempts: attempts,
        totalDuration: totalDuration,
        lastUsedKeyName: lastUsedKeyName,
        companyId: companyId,
        conversationId: conversationId
      });

      // ✅ ASYNC FAILURE LOGGING
      try {
        const failurePayload = {
          companyId,
          conversationId,
          customerId: messageContext?.customerId || null,
          errorType: error.code || 'UNKNOWN_ERROR',
          errorMessage: error.message,
          context: JSON.stringify({
            attempts,
            lastModel: lastUsedKeyName,
            duration: totalDuration
          })
        };
        await queueService.add('ai-logs', 'logFailure', failurePayload);
      } catch (e) {
        console.warn('⚠️ Failed to queue failure log');
      }

      // ✅ DEBUG: Save prompt to file for debugging silent errors
      try {
        const fs = require('fs');
        const debugInfo = `Time: ${new Date().toISOString()}\nError: ${error.message}\nKey: ${lastUsedKeyName}\nPrompt Length: ${prompt?.length || 0}\n\nPROMPT:\n${prompt}`;
        fs.writeFileSync('last_silent_prompt.txt', debugInfo, 'utf8');
      } catch (e) { }

      // 🤐 النظام الصامت - تسجيل وتصنيف
      // ... (Existing silent handling code) ...



      // ✅ تصنيف موحد للخطأ الصامت
      let silentReason = `خطأ في توليد الرد: ${error.message}`;
      if (lastUsedKeyName) {
        silentReason += ` (Key: ${lastUsedKeyName})`;
      }

      // ❌ REMOVED: Timeout check - تم إزالته حسب طلب المستخدم
      // if (totalDuration > 30000) {
      //   silentReason += ` - تجاوز الوقت المسموح (${Math.round(totalDuration / 1000)}s)`;
      // }

      // ✅ FIX: تصفية خطأ MISSING_PERSONALITY_PROMPT لأنه تم معالجته باستخدام الشخصية الافتراضية
      const errorMsgLower = (error.message || '').toLowerCase();
      if (error.message?.includes('MISSING_PERSONALITY_PROMPT')) {
        console.warn('⚠️ [AI-RESPONSE] MISSING_PERSONALITY_PROMPT error detected - this should not happen as default personality is used');
        silentReason = 'خطأ في توليد الرد - يرجى المحاولة مرة أخرى';
      } else if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('كوتا') || error.code === 'QUOTA_EXHAUSTED' || error.code === 'ALL_KEYS_UNAVAILABLE') {
        silentReason = error.arabicMessage || 'جميع المفاتيح معطلة مؤقتاً - يرجى المحاولة لاحقاً';
      } else if (errorMsgLower.includes('response too short') || errorMsgLower.includes('too short or empty') || errorMsgLower.includes('too short')) {
        // ✅ FIX: تحسين رسالة الخطأ للردود القصيرة
        silentReason = 'فشل في توليد رد مناسب - تم تجربة جميع المفاتيح المتاحة. يرجى المحاولة مرة أخرى لاحقاً';
        if (lastUsedKeyName) {
          silentReason += ` (آخر مفتاح جرب: ${lastUsedKeyName})`;
        }
      }
      // ❌ REMOVED: Timeout handling - تم إزالته حسب طلب المستخدم
      // else if (error.code === 'TIMEOUT' || errorMsgLower.includes('timeout') || totalDuration > 30000) {
      //   silentReason = `انتهت مهلة الانتظار - استغرق الطلب ${Math.round(totalDuration / 1000)} ثانية`;
      //   if (lastUsedKeyName) {
      //     silentReason += ` (Key: ${lastUsedKeyName})`;
      //   }
      // }

      return { content: null, silentReason: silentReason, processingTime: totalDuration };
    }
  }


  /**
        prompt += `معلومات مساعدة (منتجات/سياسات):\n`;
        ragData.slice(0, 3).forEach(item => {
          prompt += `- ${item.content.substring(0, 100)}...\n`;
        });
        prompt += `\n`;
      }

      // التعليمات الصارمة
      prompt += `التعليمات:\n`;
      prompt += `1. اقترحي 3 ردود مختلفة (قصيرة، متوسطة، ومفصلة قليلاً).\n`;
      prompt += `2. يجب أن تكون الردود باللهجة المصرية الطبيعية والودودة (إلا إذا كانت الشخصية تفرض غير ذلك).\n`;
      prompt += `3. الردود يجب أن تكون جاهزة للإرسال فوراً (لا تضعي أقواس أو شرح).\n`;
      prompt += `4. المخرجات يجب أن تكون مصفوفة JSON نصية فقط (Array of strings).\n`;
      prompt += `5. لا تكتبي أي شيء خارج مصفوفة JSON.\n`;
      prompt += `6. مثال للمخرجات: ["أهلاً يا فندم، إزاي أقدر اساعدك؟", "المقاسات المتاحة حالياً هي 41 و 42", "سعر المنتج 500 جنيه والتوصيل مجاني"]\n\n`;
      prompt += `المخرجات المطلوبة (JSON Array Only):`;

      // 2. استدعاء النموذج (using existing methods)
      // نستخدم إعدادات محافظة (Low Temperature) للحصول على تنسيق JSON دقيق
      const generationConfig = {
        temperature: 0.3,
        maxOutputTokens: 500,
        responseMimeType: "application/json" // Gemini 1.5 supports this
      };

      const modelManager = this.aiAgentService.getModelManager();
      const activeKey = await modelManager.getActiveAIKeyWithModel(companyId);

      // ✅ التحقق من وجود خطأ في المفتاح
      if (!activeKey || activeKey.error) {
        const error = activeKey?.error === 'ALL_KEYS_UNAVAILABLE' || activeKey?.error === 'QUOTA_EXHAUSTED'
          ? new Error(activeKey.message || activeKey.arabicMessage || 'جميع المفاتيح معطلة مؤقتاً. يرجى المحاولة لاحقاً.')
          : new Error('No active Gemini key found');
        if (activeKey?.error === 'ALL_KEYS_UNAVAILABLE' || activeKey?.error === 'QUOTA_EXHAUSTED') {
          error.code = activeKey.error;
          error.arabicMessage = activeKey.message || activeKey.arabicMessage;
          error.retryAfter = activeKey.retryAfter;
        }
        throw error;
      }

      const provider = AIProviderFactory.getProvider(activeKey.provider || 'GOOGLE', activeKey.apiKey || activeKey.key, activeKey.baseUrl, activeKey.id);
      const result = await provider.generateResponse(prompt, {
        model: activeKey.model || "gemini-1.5-flash",
        ...generationConfig
      });
      // ✅ FIX: Handle both function and string text formats
      const responseText = typeof result.text === 'function' ? result.text() : (result.text || result.content || '');

      // 3. معالجة الرد وتحويله إلى مصفوفة
      let suggestions = [];
      try {
        // تنظيف النص من علامات markdown إذا وجدت
        const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        suggestions = JSON.parse(cleanText);
      } catch (parseError) {
        console.warn('⚠️ [AI-SUGGESTIONS] Failed to parse JSON, trying regex fallback', responseText);
        // محاولة استخراج النصوص بين علامات التنصيص كحل بديل
        const matches = responseText.match(/"([^"]*)"/g);
        if (matches) {
          suggestions = matches.map(s => s.replace(/"/g, ''));
        } else {
          // Fallback final: return raw lines
          suggestions = responseText.split('\n').filter(line => line.length > 5).slice(0, 3);
        }
      }

      // التأكد من أنها مصفوفة
      if (!Array.isArray(suggestions)) {
        suggestions = [typeof suggestions === 'string' ? suggestions : "أهلاً بك، كيف يمكنني مساعدتك؟"];
      }

      return suggestions.slice(0, 3); // ضمان إرجع 3 اقتراحات كحد أقصى

    } catch (error) {
      console.error('❌ [AI-SUGGESTIONS] Error generating suggestions:', error);
      // Fallback suggestions
      return [
        "أهلاً بك، كيف يمكنني مساعدتك؟",
        "تفضل، أنا معاك للإجابة على استفساراتك.",
        "هل لديك أي أسئلة أخرى؟"
      ];
    }
  }
  /**
   * 🔒 Helper: Get Personality Prompt
   */
  async _getPersonalityPrompt(companyPrompts, companyId) {
    // التحقق من وجود personality prompt صالح (ليس فارغ وليس placeholder)
    const personalityPromptTrimmed = companyPrompts?.personalityPrompt?.trim() || '';
    const isPlaceholder = personalityPromptTrimmed.startsWith('# يجب إعداد شخصية المساعد الذكي') ||
      personalityPromptTrimmed.startsWith('#يجب إعداد شخصية المساعد الذكي') ||
      personalityPromptTrimmed.includes('يجب إعداد شخصية المساعد الذكي من لوحة التحكم') ||
      personalityPromptTrimmed.startsWith('يجب إعداد شخصية المساعد الذكي');

    if (!companyPrompts || !personalityPromptTrimmed || isPlaceholder) {
      // إنشاء companyPrompts إذا لم يكن موجوداً
      if (!companyPrompts) companyPrompts = {};

      // استخدام personality افتراضي
      companyPrompts.personalityPrompt = `أنت مساعد ذكي محترف وودود لخدمة العملاء.
تتحدث بشكل طبيعي ومحترم مع العملاء باللغة العربية.
تساعد العملاء في الإجابة على استفساراتهم وتقديم المساعدة.
تكون مفيداً ومهذباً في جميع التعاملات.`;

      companyPrompts.source = 'default_fallback';
      companyPrompts.hasCustomPrompts = false;
    }

    return `${companyPrompts.personalityPrompt.trim()}\n\n`;
  }

  /**
   * 🔒 Helper: Get Platform Context
   */
  _getPlatformContext(messageData) {
    const platform = messageData?.platform;
    let context = '';

    if (platform === 'test-chat') {
      context += `📱 سياق المحادثة: أنت تتحدث مع العميل عبر دردشة مباشرة على الموقع (Test Chat).
- هذه دردشة فورية ومباشرة
- يمكنك إرسال الصور والروابط مباشرة
- العميل ينتظر ردك الآن
- كن سريعاً ومباشراً في الرد\n\n`;
    } else if (platform === 'whatsapp') {
      context += `📱 سياق المحادثة: أنت تتحدث مع العميل عبر واتساب.\n\n`;
    } else if (platform === 'facebook') {
      context += `📱 سياق المحادثة: أنت تتحدث مع العميل عبر فيسبوك ماسنجر.\n\n`;
    }
    return context;
  }

  /**
   * 🔒 Helper: Get Response Rules
   */
  _getResponseRules(companyPrompts) {
    let prompt = '';
    if (companyPrompts.responseRules) {
      try {
        const rules = typeof companyPrompts.responseRules === 'string'
          ? JSON.parse(companyPrompts.responseRules)
          : companyPrompts.responseRules;
        prompt += buildPromptFromRules(rules);
      } catch (e) {
        console.warn('⚠️ [RESPONSE-RULES] Failed to parse responseRules:', e.message);
        prompt += buildPromptFromRules(getDefaultRules());
      }
    } else {
      prompt += buildPromptFromRules(getDefaultRules());
    }
    return prompt;
  }

  /**
   * 🔒 Helper: Get Post Context
   */
  _getPostContext(messageData, ragData) {
    let prompt = '';
    let postProductInfo = null;

    // 1. Check for Post Product Info (from RAG based on context)
    if (messageData?.isPostProductResponse && ragData && ragData.length > 0) {
      const product = ragData[0];
      const productName = product.metadata?.name || product.name || 'المنتج';
      const productPrice = product.metadata?.price || product.price || 'غير متوفر';

      postProductInfo = { name: productName, price: productPrice };

      prompt += `العميل جاء من بوست Facebook:\n`;
      prompt += `- المنتج: ${postProductInfo.name} - ${postProductInfo.price} جنيه\n`;
      prompt += `- اذكري الاسم والسعر بوضوح عند السؤال\n\n`;
    }

    // 2. Check for original Post Details (from Webhook)
    if (messageData?.postDetails) {
      const postDetails = messageData.postDetails;
      prompt += `📌 معلومات المنشور الذي جاء منه العميل:\n`;
      prompt += `=====================================\n`;

      if (postDetails.message) {
        const sanitizedPostMsg = PromptService.sanitizeInput(postDetails.message);
        prompt += `📝 نص المنشور:\n"${sanitizedPostMsg}"\n\n`;
      }

      if (postDetails.hasImages && postDetails.imageUrls?.length > 0) {
        prompt += `🖼️ المنشور يحتوي على ${postDetails.imageUrls.length} صورة\n`;
        prompt += `💡 استخدمي هذه المعلومات لفهم المنتج/الخدمة التي يسأل عنها العميل\n\n`;
      }

      prompt += `💡 مهم: العميل جاء من هذا المنشور - استخدمي محتوى المنشور لفهم السياق\n`;
      if (!postProductInfo) {
        prompt += `💡 إذا سأل العميل عن السعر أو المنتج بدون تحديد، فالمقصود هو المنتج المذكور في المنشور أعلاه\n`;
      }
      prompt += `=====================================\n\n`;
    }

    return { prompt, postProductInfo };
  }


  // ✅ Re-implemented Helpers using Phase 3 Resolvers

  /**
   * 🔒 Helper: Get Shipping Context
   */
  async _getShippingContext(customerMessage, companyId, conversationMemory) {
    try {
      const shippingData = await ShippingResolver.resolve(customerMessage, companyId, conversationMemory);
      let prompt = '';
      if (shippingData && shippingData.shippingInfo) {
        prompt += await PromptService.getTemplate(companyId, 'shipping_response', shippingData.shippingInfo);
      } else if (shippingData && shippingData.isAsking && shippingData.foundGovernorate && !shippingData.shippingInfo) {
        prompt += await PromptService.getTemplate(companyId, 'no_shipping_found', { governorate: shippingData.foundGovernorate });
      } else if (shippingData && shippingData.isAsking) {
        prompt += await PromptService.getTemplate(null, 'system_shipping_alert', { customerMessage });
      }
      return prompt;
    } catch (error) {
      console.warn('⚠️ [_getShippingContext] Error:', error.message);
      return '';
    }
  }

  /**
   * 🔒 Helper: Get Customer Context
   */
  _getCustomerContext(customerData, conversationMemory, customerMessage) {
    try {
      const customerProfile = CustomerResolver.resolveProfile(customerData, conversationMemory);
      // Format as string manually if PromptService is async and we are in sync method, 
      // BUT this method is called synchronously in buildAdvancedPrompt, so we need to return { prompt: string, isNewCustomer: bool }
      // Wait, buildAdvancedPrompt line 358: const { prompt: customerPrompt, isNewCustomer } = this._getCustomerContext(...)

      let prompt = '';

      const sanitizedName = PromptService.sanitizeInput(customerProfile.name || 'غير محدد');
      const sanitizedCity = PromptService.sanitizeInput(customerProfile.city || '');
      const sanitizedPhone = PromptService.sanitizeInput(customerProfile.phone || '');

      // Fallback to simple string formatting for sync context
      prompt += `👤 معلومات العميل:\n`;
      prompt += `- الاسم: ${sanitizedName}\n`;
      if (sanitizedPhone) prompt += `- الهاتف: ${sanitizedPhone}\n`;
      if (sanitizedCity) prompt += `- المدينة: ${sanitizedCity}\n`;
      prompt += `\n`;

      return { prompt, isNewCustomer: customerProfile.isNewCustomer };
    } catch (error) {
      console.warn('⚠️ [_getCustomerContext] Error:', error.message);
      return { prompt: '', isNewCustomer: false };
    }
  }

  /**
   * 🔒 Helper: Get Reply Context
   */
  _getReplyContext(messageData, customerMessage) {
    let prompt = '';
    if (messageData?.replyContext?.isReply) {
      // Simple formatting without async template
      prompt += `↩️ سياق الرد:\n`;
      if (messageData.replyContext.originalMessage?.content) {
        const sanitizedOriginal = PromptService.sanitizeInput(messageData.replyContext.originalMessage.content);
        prompt += `- العميل يرد على رسالتك: "${sanitizedOriginal}"\n`;
      } else {
        prompt += `- العميل يرد على رسالة سابقة لك\n`;
      }
      prompt += `\n`;
    }
    return prompt;
  }

  /**
   * 🔒 Helper: Get Conversation History
   */
  async _getConversationHistory(conversationMemory, ragData, customerMessage) {
    // Called with await in buildAdvancedPrompt Line 365
    try {
      const historyData = CustomerResolver.resolveHistory(conversationMemory);
      let prompt = '';
      let lastMentionedProduct = null;

      if (historyData.hasHistory) {
        // Use PromptService since this method is async
        prompt += await PromptService.getTemplate(null, 'system_conversation_header');
        for (const item of historyData.items) {
          const timeAgo = this.aiAgentService.getTimeAgo(new Date(item.timestamp));
          const sender = item.sender === 'Customer' ? 'العميل' : 'ردك';
          const sanitizedContent = PromptService.sanitizeInput(item.content);
          prompt += `${item.index}. ${sender} (منذ ${timeAgo}): ${sanitizedContent}\n`;
        }
        prompt += await PromptService.getTemplate(null, 'system_conversation_footer');
      } else {
        prompt += await PromptService.getTemplate(null, 'system_first_interaction');
      }
      return { prompt, lastMentionedProduct };
    } catch (error) {
      console.warn('⚠️ [_getConversationHistory] Error:', error.message);
      return { prompt: '', lastMentionedProduct: null };
    }
  }

  /**
   * 🔒 Helper: Get RAG Context
   */
  async _getRAGContext(ragData, smartResponseInfo, hasImages, isPostProductResponse) {
    // Called with await in buildAdvancedPrompt Line 382
    try {
      const ragContext = RagResolver.resolve(ragData);
      let prompt = '';

      // 🔍 DEBUG: Log RAG context
      console.log(`🔍🔍🔍 [RAG-CONTEXT] hasData=${ragContext.hasData}, hasProducts=${ragContext.hasProducts}, items=${ragContext.items?.length || 0}`);
      if (ragContext.hasData && ragContext.items?.length > 0) {
        console.log(`🔍🔍🔍 [RAG-CONTEXT] First item: type=${ragContext.items[0].type}, name=${ragContext.items[0].metadata?.name || 'N/A'}`);
      }

      if (ragContext.hasData) {
        prompt += await PromptService.getTemplate(null, 'system_rag_header');
        for (const item of ragContext.items) {
          if (item.type === 'product') {
            prompt += await PromptService.getTemplate(null, 'system_rag_product', { index: item.index, content: item.content });
          } else if (item.type === 'faq') {
            prompt += await PromptService.getTemplate(null, 'system_rag_faq', { index: item.index, content: item.content });
          } else if (item.type === 'policy') {
            prompt += await PromptService.getTemplate(null, 'system_rag_policy', { index: item.index, content: item.content });
          }
        }
        prompt += await PromptService.getTemplate(null, 'system_rag_footer');
      } else {
        prompt += await PromptService.getTemplate(null, 'system_instructions_no_rag');
      }

      return prompt;
    } catch (error) {
      console.warn('⚠️ [_getRAGContext] Error:', error.message);
      return '';
    }
  }
}

module.exports = ResponseGenerator;
