/**
 * Context Manager Module
 * 
 * هذا الموديول مسؤول عن إدارة وتحليل سياق المحادثة
 * تم نقله من aiAgentService.js لتسهيل الصيانة
 */

class ContextManager {
  constructor(aiAgentService) {
    // ✅ حفظ reference لـ aiAgentService للوصول للدوال المساعدة
    this.aiAgentService = aiAgentService;
  }

  /**
   * Analyze enhanced conversation context with flow tracking
   */
  async analyzeEnhancedConversationContext(message, conversationMemory, companyId) {
    try {
      //console.log('🔍 [ENHANCED-CONTEXT] Starting enhanced conversation analysis...');

      // Enhanced context building with conversation flow tracking
      const conversationContext = this.buildEnhancedConversationContext(conversationMemory);
      const conversationState = this.analyzeConversationState(conversationMemory);
      const intentWithContext = await this.analyzeIntentWithEnhancedContext(message, conversationContext, conversationState, companyId);

      const enhancedContext = {
        intent: intentWithContext.intent,
        confidence: intentWithContext.confidence,
        conversationPhase: conversationState.phase,
        customerEngagement: conversationState.engagement,
        topicContinuity: conversationState.topicContinuity,
        needsRedirection: conversationState.needsRedirection,
        suggestedActions: conversationState.suggestedActions,
        contextualCues: intentWithContext.contextualCues,
        conversationFlow: {
          direction: conversationState.direction,
          momentum: conversationState.momentum,
          expectedNext: conversationState.expectedNext
        }
      };

      //console.log('✅ [ENHANCED-CONTEXT] Analysis complete:', {
      //   intent: enhancedContext.intent,
      //   phase: enhancedContext.conversationPhase,
      //   engagement: enhancedContext.customerEngagement,
      //   direction: enhancedContext.conversationFlow.direction
      // });

      return enhancedContext;

    } catch (error) {
      console.error('❌ [ENHANCED-CONTEXT] Error in enhanced analysis:', error);
      // ✅ Fallback to AI-based simple intent analysis (بدون keywords)
      try {
        const emptyContext = { recentContext: '', topics: [], customerBehavior: 'new', conversationLength: 0 };
        const emptyState = { phase: 'unknown', engagement: 'moderate', topicContinuity: 'unclear', direction: 'neutral', momentum: 'stable', expectedNext: 'any' };
        const basicIntentResult = await this.aiBasedFallback(message, companyId);

        return {
          intent: basicIntentResult?.intent || 'general_inquiry',
          confidence: basicIntentResult?.confidence || 0.5,
          conversationPhase: 'unknown',
          customerEngagement: 'moderate',
          topicContinuity: 'unclear',
          needsRedirection: false,
          suggestedActions: [],
          contextualCues: basicIntentResult?.contextualCues || [],
          conversationFlow: {
            direction: 'neutral',
            momentum: 'stable',
            expectedNext: 'any'
          }
        };
      } catch (fallbackError) {
        console.error('❌ [ENHANCED-CONTEXT] AI fallback also failed:', fallbackError);
        return {
          intent: 'general_inquiry',
          confidence: 0.3,
          conversationPhase: 'unknown',
          customerEngagement: 'moderate',
          topicContinuity: 'unclear',
          needsRedirection: false,
          suggestedActions: [],
          contextualCues: [],
          conversationFlow: {
            direction: 'neutral',
            momentum: 'stable',
            expectedNext: 'any'
          }
        };
      }
    }
  }

  /**
   * Build enhanced conversation context with flow analysis
   */
  buildEnhancedConversationContext(conversationMemory) {
    if (!conversationMemory || conversationMemory.length === 0) {
      return {
        recentContext: '',
        topics: [],
        customerBehavior: 'new',
        conversationLength: 0
      };
    }

    // Analyze conversation topics and patterns
    const topics = this.extractConversationTopics(conversationMemory);
    const customerBehavior = this.analyzeCustomerBehavior(conversationMemory);

    // Build rich context from recent messages (last 5 interactions)
    const recentMessages = conversationMemory.slice(-5);
    const recentContext = recentMessages.map((memory, index) => {
      const timeAgo = this.getTimeAgo(new Date(memory.createdAt || memory.timestamp));
      const position = recentMessages.length - index;
      const sender = memory.isFromCustomer ? 'العميل' : 'الرد';
      return `[${position}] منذ ${timeAgo}:\n   ${sender}: ${memory.content}\n   النية: ${memory.intent || 'غير محدد'}`;
    }).join('\n---\n');

    return {
      recentContext,
      topics,
      customerBehavior,
      conversationLength: conversationMemory.length
    };
  }

  /**
   * Analyze current conversation state and flow
   */
  analyzeConversationState(conversationMemory) {
    const state = {
      phase: 'discovery', // discovery, consideration, decision, support
      engagement: 'moderate', // low, moderate, high
      topicContinuity: 'stable', // stable, shifting, scattered
      needsRedirection: false,
      suggestedActions: [],
      direction: 'neutral', // positive, neutral, negative
      momentum: 'stable', // increasing, stable, decreasing
      expectedNext: 'any' // specific expectations based on flow
    };

    if (!conversationMemory || conversationMemory.length === 0) {
      state.phase = 'initial';
      state.expectedNext = 'greeting_or_inquiry';
      return state;
    }

    // Analyze conversation phase based on intents and content
    const recentIntents = conversationMemory.slice(-3).map(m => m.intent || 'unknown');
    const hasProductInquiry = recentIntents.includes('product_inquiry');
    const hasPriceInquiry = recentIntents.includes('price_inquiry');
    const hasOrderInquiry = recentIntents.includes('order_inquiry');

    if (hasOrderInquiry || conversationMemory.some(m => {
      const msg = m.userMessage || (m.isFromCustomer ? m.content : '');
      return msg && (msg.includes('أريد أطلب') || msg.includes('عايز أشتري'));
    })) {
      state.phase = 'decision';
      state.expectedNext = 'order_details_or_confirmation';
    } else if (hasPriceInquiry && hasProductInquiry) {
      state.phase = 'consideration';
      state.expectedNext = 'decision_or_more_questions';
    } else if (hasProductInquiry) {
      state.phase = 'discovery';
      state.expectedNext = 'price_or_details_inquiry';
    }

    // Analyze engagement level
    const messageFrequency = this.calculateMessageFrequency(conversationMemory);
    const responseLength = conversationMemory.slice(-3).reduce((avg, m) => {
      const msgLength = m.userMessage?.length || (m.isFromCustomer ? m.content?.length : 0) || 0;
      return avg + msgLength;
    }, 0) / Math.min(3, conversationMemory.length);

    if (messageFrequency > 2 && responseLength > 20) {
      state.engagement = 'high';
    } else if (messageFrequency < 0.5 || responseLength < 10) {
      state.engagement = 'low';
    }

    // Analyze topic continuity
    const topicConsistency = this.analyzeTopicConsistency(conversationMemory);
    if (topicConsistency < 0.3) {
      state.topicContinuity = 'scattered';
      state.needsRedirection = true;
      state.suggestedActions.push('focus_conversation');
    } else if (topicConsistency < 0.6) {
      state.topicContinuity = 'shifting';
    }

    // Analyze conversation direction and momentum
    const sentimentTrend = this.analyzeSentimentTrend(conversationMemory);
    if (sentimentTrend > 0.2) {
      state.direction = 'positive';
      state.momentum = 'increasing';
    } else if (sentimentTrend < -0.2) {
      state.direction = 'negative';
      state.momentum = 'decreasing';
      state.suggestedActions.push('improve_sentiment');
    }

    return state;
  }

  /**
   * Enhanced intent analysis with contextual understanding
   * ✅ AI-FIRST APPROACH: يعتمد بالكامل على الذكاء الاصطناعي بدون كلمات مفتاحية
   * ✅ IMPROVED FALLBACK: Fallback يعتمد على AI أيضاً مع retry mechanism
   */
  async analyzeIntentWithEnhancedContext(message, conversationContext, conversationState, companyId) {
    const maxRetries = 3;
    let lastError = null;

    // ✅ المحاولة الأولى: استخدام prompt محسن مع سياق كامل
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const enhancedPrompt = `
أنت خبير متقدم في تحليل المحادثات وفهم نوايا العملاء بعمق.

الرسالة الحالية: "${message}"

${conversationContext.recentContext ? `السياق المتقدم للمحادثة:
=====================================
${conversationContext.recentContext}
=====================================` : '⚠️ هذه أول رسالة في المحادثة.'}

حالة المحادثة الحالية:
- المرحلة: ${conversationState.phase}
- مستوى التفاعل: ${conversationState.engagement}
- استمرارية الموضوع: ${conversationState.topicContinuity}
- اتجاه المحادثة: ${conversationState.direction}
- الزخم: ${conversationState.momentum}

مهمتك:
1. حدد النية الأساسية من الخيارات التالية:
   - greeting: تحية أو بداية محادثة (أولوية قصوى إذا كانت الرسالة تبدأ بتحية)
   - price_inquiry: استفسار عن الأسعار (أولوية عالية للكلمات: كام، بكام، سعر، ثمن)
   - product_inquiry: استفسار عن المنتجات
   - shipping_inquiry: استفسار عن الشحن
   - order_inquiry: رغبة في الطلب
   - clarification: طلب توضيح
   - comparison: مقارنة منتجات
   - support: طلب دعم أو مساعدة
   - general_inquiry: استفسار عام

2. حدد الإشارات السياقية المهمة
3. قدر مستوى الثقة (0.1-1.0)

🔴 قواعد الأولوية (يجب تطبيقها بالترتيب):

1. ✅ التحيات (أولوية قصوى):
   - إذا كانت الرسالة تبدأ بـ: "السلام"، "أهلاً"، "مرحبا"، "ازيك"، "هلو" = greeting
   - حتى لو كان بعد التحية سؤال = greeting (التحية هي النية الأساسية)
   - مثال: "أهلاً، عندك إيه من المنتجات؟" = greeting (وليس product_inquiry)

2. ✅ الأسعار (أولوية عالية):
   - إذا كان السؤال يحتوي على: "كام"، "بكام"، "بكم"، "سعر"، "سعره"، "ثمن"، "تمن" = price_inquiry
   - حتى لو كان في السياق منتج = price_inquiry (السؤال عن السعر أولوية)
   - مثال: "كام سعر الكوتشي ده؟" = price_inquiry (وليس product_inquiry)

3. ✅ المنتجات:
   - إذا طلب "صور" أو "صورة" أو "ممكن أشوف" = product_inquiry
   - إذا كان السياق يتحدث عن منتج وطلب شيء غامض = product_inquiry

4. ✅ الطلبات:
   - إذا قال "أطلب" أو "أشتري" أو "أوردر" = order_inquiry

5. ✅ الشحن:
   - إذا سأل عن "شحن" أو "توصيل" = shipping_inquiry

صيغة الرد (JSON فقط):
{
  "intent": "اختر_من_القائمة",
  "confidence": 0.8,
  "contextualCues": ["إشارة1", "إشارة2"],
  "reasoning": "السبب في تحديد هذه النية"
}

⚠️ ملاحظات مهمة جداً:
- ركز على السياق والمعنى وليس فقط الكلمات
- إذا كانت الرسالة تحتوي على تحية + سؤال، النية الأساسية هي greeting
- إذا كان السؤال عن السعر (حتى مع ذكر منتج)، النية هي price_inquiry
- استخدم السياق من المحادثة السابقة لتحديد النية بدقة
- إذا كان السياق غامض، استخدم clarification
- أجب بصيغة JSON فقط (بدون شرح أو نص إضافي)

أجب بصيغة JSON فقط.
`;

        const aiResponse = await this.aiAgentService.generateAIResponse(enhancedPrompt, [], false, null, companyId);

        // ✅ FIX: Handle both string and object response formats
        const aiContent = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;

        if (!aiContent || typeof aiContent !== 'string') {
          throw new Error('Empty or invalid AI response');
        }

        try {
          // تنظيف الرد من أي نص إضافي
          let cleanedResponse = aiContent.trim();

          // محاولة استخراج JSON من الرد
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[0];
          }

          const result = JSON.parse(cleanedResponse);

          // Validate the result
          const validIntents = ['product_inquiry', 'price_inquiry', 'shipping_inquiry', 'order_inquiry', 'greeting', 'clarification', 'comparison', 'support', 'general_inquiry'];

          if (validIntents.includes(result.intent)) {
            console.log(`✅ [AI-INTENT] Detected: ${result.intent} (confidence: ${result.confidence || 0.7}) - Attempt ${attempt}`);
            return {
              intent: result.intent,
              confidence: result.confidence || 0.7,
              contextualCues: result.contextualCues || [],
              reasoning: result.reasoning || 'AI analysis'
            };
          } else {
            throw new Error(`Invalid intent: ${result.intent}`);
          }
        } catch (parseError) {
          console.warn(`⚠️ [AI-INTENT] Parse error on attempt ${attempt}:`, parseError.message);
          lastError = parseError;

          // محاولة استخراج النية من النص
          const extractedIntent = this.extractIntentFromAIResponse(aiResponse);
          if (extractedIntent) {
            console.log(`✅ [AI-INTENT] Extracted intent: ${extractedIntent} from unstructured response`);
            return {
              intent: extractedIntent,
              confidence: 0.6,
              contextualCues: [],
              reasoning: 'Extracted from AI unstructured response'
            };
          }

          // إذا فشل التحليل، جرب مرة أخرى مع prompt أبسط
          if (attempt < maxRetries) {
            console.log(`🔄 [AI-INTENT] Retrying with simpler prompt (attempt ${attempt + 1}/${maxRetries})...`);
            continue;
          }
        }
      } catch (error) {
        console.error(`❌ [AI-INTENT] Error on attempt ${attempt}:`, error.message);
        lastError = error;

        // إذا كانت آخر محاولة، استخدم fallback AI
        if (attempt === maxRetries) {
          break;
        }

        // انتظر قليلاً قبل إعادة المحاولة
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }

    // ✅ FALLBACK: استخدام AI مع prompt أبسط وأسرع
    console.log('🔄 [AI-INTENT] Using AI fallback with simplified prompt...');
    try {
      const fallbackResult = await this.aiBasedFallback(message, companyId);
      if (fallbackResult) {
        return fallbackResult;
      }
    } catch (fallbackError) {
      console.error('❌ [AI-INTENT] AI fallback also failed:', fallbackError.message);
    }

    // ✅ LAST RESORT: إرجاع نية عامة مع معلومات الخطأ
    console.error('❌ [AI-INTENT] All AI attempts failed, using general_inquiry');
    return {
      intent: 'general_inquiry',
      confidence: 0.3,
      contextualCues: [],
      reasoning: `AI analysis failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      error: true
    };
  }

  /**
   * ✅ AI-Based Fallback: استخدام AI مع prompt أبسط وأسرع
   * بديل عن keyword-based fallback
   */
  async aiBasedFallback(message, companyId) {
    try {
      const simplePrompt = `
حدد نية هذه الرسالة من الخيارات التالية فقط:
greeting, price_inquiry, product_inquiry, shipping_inquiry, order_inquiry, clarification, comparison, support, general_inquiry

الرسالة: "${message}"

أجب بكلمة واحدة فقط (اسم النية بدون شرح).
`;

      const aiResponse = await this.aiAgentService.generateAIResponse(simplePrompt, [], false, null, companyId);

      // ✅ FIX: Handle both string and object response formats
      const aiContent = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;

      if (!aiContent) {
        return null;
      }

      // تنظيف الرد
      const cleanedResponse = aiContent.trim().toLowerCase().split('\n')[0].trim();

      // التحقق من النية
      const validIntents = ['product_inquiry', 'price_inquiry', 'shipping_inquiry', 'order_inquiry', 'greeting', 'clarification', 'comparison', 'support', 'general_inquiry'];

      for (const intent of validIntents) {
        if (cleanedResponse.includes(intent) || cleanedResponse === intent.replace('_inquiry', '')) {
          console.log(`✅ [AI-FALLBACK] Detected intent: ${intent}`);
          return {
            intent: intent,
            confidence: 0.5,
            contextualCues: [],
            reasoning: 'AI fallback analysis'
          };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ [AI-FALLBACK] Error in AI fallback:', error.message);
      return null;
    }
  }

  /**
   * ✅ استخراج النية من رد AI غير منظم
   */
  extractIntentFromAIResponse(response) {
    if (!response || typeof response !== 'string') {
      return null;
    }

    const text = response.toLowerCase();
    const validIntents = ['product_inquiry', 'price_inquiry', 'shipping_inquiry', 'order_inquiry', 'greeting', 'clarification', 'comparison', 'support', 'general_inquiry'];

    // البحث عن النية في النص
    for (const intent of validIntents) {
      if (text.includes(intent) || text.includes(intent.replace('_', ' '))) {
        return intent;
      }
    }

    // محاولة مطابقة بالعربية
    const arabicMatches = {
      'greeting': ['تحية', 'مرحبا', 'أهلاً', 'السلام'],
      'price_inquiry': ['سعر', 'ثمن', 'تمن', 'بكام', 'كام'],
      'product_inquiry': ['منتج', 'صور', 'صورة', 'كوتشي'],
      'shipping_inquiry': ['شحن', 'توصيل'],
      'order_inquiry': ['طلب', 'أطلب', 'أشتري', 'شراء'],
      'clarification': ['توضيح', 'فهم', 'شرح'],
      'comparison': ['مقارنة', 'فرق', 'مقارن'],
      'support': ['مساعدة', 'دعم', 'مساعدة'],
      'general_inquiry': ['استفسار', 'سؤال', 'عام']
    };

    for (const [intent, keywords] of Object.entries(arabicMatches)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return intent;
        }
      }
    }

    return null;
  }

  /**
   * Enhanced conversation state management for response generation
   */
  enhanceResponseWithConversationState(baseResponse, conversationState, enhancedContext) {
    try {
      // 🤐 التحقق من أن baseResponse ليس null أو فارغ
      if (!baseResponse || typeof baseResponse !== 'string' || baseResponse.trim().length === 0) {
        return null;
      }

      //console.log('🎨 [ENHANCED-RESPONSE] Enhancing response with conversation state...');

      // ✅ SMART ENHANCEMENT: إضافة تحسينات ذكية فقط عند الحاجة
      let enhancedResponse = baseResponse;

      // تحقق من أن الرد الأساسي موجود ومفيد
      if (baseResponse.trim().length < 10) {
        return baseResponse; // رد قصير جداً - نسيبه زي ما هو
      }

      // تجنب إضافة أي شيء إذا كان الرد يحتوي على أسئلة أو طلبات واضحة
      const hasQuestion = baseResponse.includes('؟') || baseResponse.includes('?');
      const hasActionRequest = /تحب|عايز|محتاج|ممكن|أبعت|وريني|اشوف/.test(baseResponse);

      if (hasQuestion || hasActionRequest) {
        // الرد يحتوي على سؤال أو طلب فعل - نسيبه زي ما هو
        return baseResponse;
      }

      // إضافة توجيه خفيف فقط في حالات محددة جداً:

      // 1. لو المحادثة في مرحلة القرار وengagement عالي - ساعده يكمل
      if (conversationState.phase === 'decision' &&
        conversationState.engagement === 'high' &&
        conversationState.momentum === 'increasing') {
        // المستخدم مهتم وجاهز للشراء - لا داعي لإضافة أي شيء
        return enhancedResponse;
      }

      // 2. لو engagement منخفض جداً ولم يكن هناك تقدم - سؤال خفيف
      if (conversationState.engagement === 'low' &&
        conversationState.momentum === 'stagnant' &&
        !hasQuestion &&
        Math.random() > 0.8) { // 20% فقط من الوقت
        enhancedResponse += '\n\nفي حاجة محددة تحبي تعرفي عنها أكتر؟';
      }

      //console.log('✅ [ENHANCED-RESPONSE] Response enhanced intelligently');
      return enhancedResponse;

    } catch (error) {
      console.error('❌ [ENHANCED-RESPONSE] Error enhancing response:', error);
      return baseResponse; // Return original response if enhancement fails
    }
  }

  /**
   * Helper functions for Enhanced Conversation Flow Analysis
   */

  /**
   * Extract conversation topics from memory
   */
  extractConversationTopics(conversationMemory) {
    const topics = new Map();

    conversationMemory.forEach(memory => {
      // ✅ Add null safety check
      if (!memory) return;

      // ✅ دعم كلا الـ formats (القديم والجديد)
      let userMessage = '';
      if (memory.userMessage) {
        userMessage = memory.userMessage.toLowerCase();
      } else if (memory.content && memory.isFromCustomer) {
        userMessage = memory.content.toLowerCase();
      } else {
        return; // Skip if no user message
      }

      const intent = memory.intent || 'unknown';

      // Extract product-related topics
      const productKeywords = ['كوتشي', 'حذاء', 'شوز', 'حقيبة', 'جزمة', 'صندل'];
      const foundProducts = productKeywords.filter(keyword => userMessage.includes(keyword));
      foundProducts.forEach(product => {
        topics.set(`product_${product}`, (topics.get(`product_${product}`) || 0) + 1);
      });

      // Extract color topics
      const colorKeywords = ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'بني', 'رمادي'];
      const foundColors = colorKeywords.filter(color => userMessage.includes(color));
      foundColors.forEach(color => {
        topics.set(`color_${color}`, (topics.get(`color_${color}`) || 0) + 1);
      });

      // Extract size topics
      const sizePattern = /\b(\d{2})\b|مقاس|مقاسات|سايز/g;
      if (sizePattern.test(userMessage)) {
        topics.set('sizing', (topics.get('sizing') || 0) + 1);
      }

      // Extract intent-based topics
      topics.set(`intent_${intent}`, (topics.get(`intent_${intent}`) || 0) + 1);
    });

    // Convert to sorted array
    return Array.from(topics.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 topics
  }

  /**
   * Analyze customer behavior patterns
   */
  analyzeCustomerBehavior(conversationMemory) {
    if (conversationMemory.length === 0) return 'new';

    const totalMessages = conversationMemory.length;
    const uniqueIntents = new Set(conversationMemory.map(m => m.intent)).size;
    const messageFrequency = this.calculateMessageFrequency(conversationMemory);
    const avgMessageLength = conversationMemory.reduce((sum, m) => {
      const msgLength = m.userMessage?.length || (m.isFromCustomer ? m.content?.length : 0) || 0;
      return sum + msgLength;
    }, 0) / totalMessages;

    // Determine behavior type
    if (totalMessages >= 10 && uniqueIntents >= 3) {
      return 'engaged_explorer'; // Active customer exploring multiple aspects
    } else if (messageFrequency > 2 && avgMessageLength > 30) {
      return 'detail_seeker'; // Wants detailed information
    } else if (messageFrequency > 1 && avgMessageLength < 15) {
      return 'quick_decider'; // Fast, concise decision maker
    } else if (totalMessages >= 5 && uniqueIntents <= 2) {
      return 'focused_buyer'; // Focused on specific product/service
    } else if (messageFrequency < 0.5) {
      return 'casual_browser'; // Slow, casual browsing
    } else {
      return 'standard'; // Standard behavior pattern
    }
  }

  /**
   * Calculate message frequency (messages per hour)
   */
  calculateMessageFrequency(conversationMemory) {
    if (conversationMemory.length < 2) return 0;

    const firstMessage = new Date(conversationMemory[0].timestamp);
    const lastMessage = new Date(conversationMemory[conversationMemory.length - 1].timestamp);
    const timeDiffHours = (lastMessage - firstMessage) / (1000 * 60 * 60);

    return timeDiffHours > 0 ? conversationMemory.length / timeDiffHours : 0;
  }

  /**
   * Analyze topic consistency across conversation
   */
  analyzeTopicConsistency(conversationMemory) {
    if (conversationMemory.length < 2) return 1.0;

    const topics = this.extractConversationTopics(conversationMemory);
    if (topics.length === 0) return 0.5;

    // Calculate how focused the conversation is on top topics
    const totalTopicMentions = topics.reduce((sum, topic) => sum + topic.count, 0);
    const topTopicMentions = topics.slice(0, 2).reduce((sum, topic) => sum + topic.count, 0);

    return totalTopicMentions > 0 ? topTopicMentions / totalTopicMentions : 0.5;
  }

  /**
   * Analyze sentiment trend across conversation
   */
  analyzeSentimentTrend(conversationMemory) {
    if (conversationMemory.length < 2) return 0;

    const sentimentValues = conversationMemory.map(memory => {
      const sentiment = memory.sentiment || 'neutral';
      switch (sentiment) {
        case 'positive': return 1;
        case 'negative': return -1;
        default: return 0;
      }
    });

    // Calculate trend using simple linear regression approach
    const n = sentimentValues.length;
    const recent = sentimentValues.slice(-3); // Last 3 messages
    const earlier = sentimentValues.slice(0, Math.min(3, n - 3)); // Earlier messages

    const recentAvg = recent.length > 0 ? recent.reduce((sum, val) => sum + val, 0) / recent.length : 0;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, val) => sum + val, 0) / earlier.length : 0;

    return recentAvg - earlierAvg; // Positive = improving, negative = declining
  }

  /**
   * Extract intent from unstructured AI response
   */
  extractIntentFromResponse(response) {
    // ✅ FIX: Check if response is valid before processing
    if (!response || typeof response !== 'string') {
      console.warn('⚠️ [CONTEXT-MANAGER] extractIntentFromResponse received invalid response:', response);
      return null;
    }

    const text = response.toLowerCase();
    const validIntents = ['product_inquiry', 'price_inquiry', 'shipping_inquiry', 'order_inquiry', 'greeting', 'clarification', 'comparison', 'support', 'general_inquiry'];

    for (const intent of validIntents) {
      if (text.includes(intent) || text.includes(intent.replace('_', ' '))) {
        return intent;
      }
    }

    // Try to match Arabic terms
    if (text.includes('منتج') || text.includes('صور')) return 'product_inquiry';
    if (text.includes('سعر') || text.includes('ثمن')) return 'price_inquiry';
    if (text.includes('شحن') || text.includes('توصيل')) return 'shipping_inquiry';
    if (text.includes('طلب') || text.includes('شراء')) return 'order_inquiry';
    if (text.includes('تحية') || text.includes('مرحبا')) return 'greeting';
    if (text.includes('توضيح') || text.includes('فهم')) return 'clarification';
    if (text.includes('مقارنة') || text.includes('فرق')) return 'comparison';
    if (text.includes('مساعدة') || text.includes('دعم')) return 'support';

    return null;
  }

  /**
   * ✅ Quick intent check using pattern matching (optimization) - محسّن
   * يعطي أولوية للتحيات والأسعار قبل المنتجات
   */
  /**
   * ✅ Quick intent check using pattern matching (optimization) - محسّن
   * يعطي أولوية للتحيات والأسعار قبل المنتجات
   * Returns: { intent, confidence } or null
   */
  quickIntentCheck(message) {
    if (!message || typeof message !== 'string') return null;

    const lowerMsg = message.toLowerCase().trim();

    // Helper for confidence calculation
    const calculateConfidence = (baseConfidence, msgLength) => {
      // Penalty for long messages (likely more complex)
      const lengthPenalty = msgLength > 50 ? 0.1 : 0;
      return Math.max(0.6, Math.min(0.99, baseConfidence - lengthPenalty));
    };

    // ✅ الأولوية 1: التحيات (أولوية قصوى)
    const greetingPatterns = [
      'السلام عليكم', 'السلام', 'أهلاً', 'أهلا', 'مرحبا', 'مرحباً',
      'ازيك', 'ازي', 'هلو', 'هلا', 'صباح الخير', 'مساء الخير'
    ];
    for (const pattern of greetingPatterns) {
      if (lowerMsg === pattern) {
        // Exact match
        return { intent: 'greeting', confidence: 0.99 };
      }
      if (lowerMsg.startsWith(pattern)) {
        return { intent: 'greeting', confidence: calculateConfidence(0.95, lowerMsg.length) };
      }
    }
    // فحص أول 3 كلمات للتحيات
    const firstWords = lowerMsg.split(/\s+/).slice(0, 3).join(' ');
    for (const pattern of greetingPatterns) {
      if (firstWords.includes(pattern)) {
        return { intent: 'greeting', confidence: calculateConfidence(0.90, lowerMsg.length) };
      }
    }

    // ✅ الأولوية 2: الأسعار (أولوية عالية)
    const priceKeywords = [
      'كام', 'بكام', 'بكم', 'ب كام', 'ب كم',
      'سعر', 'سعره', 'سعرها', 'سعر ال', 'السعر',
      'ثمن', 'ثمنه', 'ثمنها', 'ثمن ال', 'الثمن',
      'تمن', 'تمنه', 'تمنها', 'تمن ال', 'التمن',
      'شحال', 'شحال ثمن', 'شحال السعر'
    ];
    for (const keyword of priceKeywords) {
      if (lowerMsg === keyword) {
        return { intent: 'price_inquiry', confidence: 0.99 };
      }
      if (lowerMsg.includes(keyword)) {
        return { intent: 'price_inquiry', confidence: calculateConfidence(0.85, lowerMsg.length) };
      }
    }

    // ✅ الأولوية 3: الشحن
    if (lowerMsg.includes('شحن') || lowerMsg.includes('توصيل') ||
      lowerMsg.includes('شحنت') || lowerMsg.includes('توصل') ||
      lowerMsg.includes('delivery') || lowerMsg.includes('shipping')) {
      return { intent: 'shipping_inquiry', confidence: calculateConfidence(0.80, lowerMsg.length) };
    }

    // ✅ الأولوية 4: الطلبات
    if (lowerMsg.includes('أوردر') || lowerMsg.includes('اوردر') ||
      lowerMsg.includes('اطلب') || lowerMsg.includes('أطلب') ||
      lowerMsg.includes('اشتري') || lowerMsg.includes('أشتري') ||
      lowerMsg.includes('طلب') || lowerMsg.includes('احجز')) {
      return { intent: 'order_inquiry', confidence: calculateConfidence(0.85, lowerMsg.length) };
    }

    // ✅ الأولوية 5: المنتجات (بعد فحص كل شيء آخر)
    if (lowerMsg.includes('صور') || lowerMsg.includes('صورة') ||
      lowerMsg.includes('صوره') || lowerMsg.includes('صورتها') ||
      lowerMsg.includes('أشوف') || lowerMsg.includes('اشوف') ||
      lowerMsg.includes('عايز أشوف') || lowerMsg.includes('عاوز أشوف') ||
      lowerMsg.includes('ممكن أشوف') || lowerMsg.includes('ممكن اشوف') ||
      lowerMsg.includes('عندك ايه') || lowerMsg.includes('ايه المنتجات') ||
      lowerMsg.includes('منتج') || lowerMsg.includes('منتجات') ||
      lowerMsg.includes('كوتشي') || lowerMsg.includes('كوتشيات')) {
      return { intent: 'product_inquiry', confidence: calculateConfidence(0.75, lowerMsg.length) };
    }

    return null; // No quick match, need AI analysis
  }

  /**
   * ✅ Fallback intent analysis - AI-Based (بدون keywords)
   * ⚠️ DEPRECATED: استخدام aiBasedFallback بدلاً منها
   * هذه الدالة محفوظة للتوافق مع الكود القديم فقط
   */
  async fallbackIntentAnalysis(message, companyId = null) {
    // ✅ استخدام AI-based fallback بدلاً من keywords
    if (companyId && this.aiAgentService) {
      try {
        const aiResult = await this.aiBasedFallback(message, companyId);
        if (aiResult) {
          return aiResult.intent;
        }
      } catch (error) {
        console.error('❌ [FALLBACK] AI fallback failed, using default:', error.message);
      }
    }

    // ✅ Last resort: إرجاع نية عامة (بدون استخدام keywords)
    console.warn('⚠️ [FALLBACK] No AI available, returning general_inquiry');
    return 'general_inquiry';
  }

  /**
   * Get time ago string in Arabic
   */
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `${diffMins} دقيقة`;
    if (diffHours < 24) return `${diffHours} ساعة`;
    if (diffDays < 7) return `${diffDays} يوم`;
    return `${Math.floor(diffDays / 7)} أسبوع`;
  }

  /**
   * Conversation context memory optimization
   */
  optimizeConversationMemoryForContext(conversationMemory, currentIntent, maxContextSize = 5) {
    if (!conversationMemory || conversationMemory.length <= maxContextSize) {
      return conversationMemory;
    }

    //console.log('🔧 [MEMORY-OPTIMIZE] Optimizing conversation memory for context...');

    // Always include the most recent messages
    const recentMessages = conversationMemory.slice(-2);

    // Include intent-relevant messages
    const intentRelevantMessages = conversationMemory.filter(memory => {
      const memoryIntent = memory.intent || 'unknown';
      return memoryIntent === currentIntent && !recentMessages.includes(memory);
    }).slice(-2); // Last 2 relevant messages

    // Include high-engagement messages (longer user messages)
    const highEngagementMessages = conversationMemory.filter(memory => {
      const msgLength = memory.userMessage?.length || (memory.isFromCustomer ? memory.content?.length : 0) || 0;
      return msgLength > 30 &&
        !recentMessages.includes(memory) &&
        !intentRelevantMessages.includes(memory);
    }).slice(-1); // Last 1 high-engagement message

    // Combine and sort by timestamp
    const optimizedMemory = [...recentMessages, ...intentRelevantMessages, ...highEngagementMessages]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-maxContextSize);

    //console.log(`📊 [MEMORY-OPTIMIZE] Optimized from ${conversationMemory.length} to ${optimizedMemory.length} messages`);

    return optimizedMemory;
  }

  /**
   * Get current time of day for pattern context
   * ✅ نقل من aiAgentService.js
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Analyze customer sentiment
   * ✅ نقل من aiAgentService.js
   */
  analyzeSentiment(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('شكرا') || lowerMessage.includes('ممتاز') || lowerMessage.includes('جميل')) {
      return 'positive';
    } else if (lowerMessage.includes('مشكلة') || lowerMessage.includes('سيء') || lowerMessage.includes('غلط')) {
      return 'negative';
    }

    return 'neutral';
  }

  /**
   * Calculate similarity between two strings (0 = completely different, 1 = identical)
   * Uses Levenshtein distance algorithm
   * ✅ نقل من aiAgentService.js
   */
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    // Calculate Levenshtein distance
    const editDistance = this.levenshteinDistance(longer, shorter);

    // Convert to similarity score (0-1)
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * ✅ نقل من aiAgentService.js
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

module.exports = ContextManager;

