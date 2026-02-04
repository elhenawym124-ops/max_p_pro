/**
 * بناء البرومبتات الديناميكية الذكية
 * Dynamic Prompt Builder Service
 * 
 * يبني برومبتات متقدمة تتكيف مع:
 * - وقت اليوم
 * - مرحلة المحادثة
 * - الحالة العاطفية للعميل
 * - أسلوب كلام العميل
 */

class DynamicPromptBuilder {
  constructor() {
    this.promptTemplates = new Map();
    this.conversationStyles = new Map();
    this.emotionalTones = new Map();
    this.initializeTemplates();
  }

  /**
   * تهيئة القوالب
   */
  initializeTemplates() {
    // سيتم تهيئة القوالب عند الحاجة
    //console.log('✨ [DynamicPromptBuilder] Service initialized');
  }

  /**
   * بناء برومبت ديناميكي بناءً على السياق الكامل
   */
  async buildContextAwarePrompt(context) {
    const {
      customerMessage,
      customerProfile,
      conversationHistory,
      emotionalState,
      conversationPhase,
      timeOfDay,
      customerTone,
      urgencyLevel,
      companyPrompts
    } = context;

    let prompt = '';

    // 1. البرومبت الأساسي من الشركة (إذا وُجد)
    // ✅ هذا هو المصدر الرئيسي للشخصية الآن (من قاعدة البيانات)
    if (companyPrompts && companyPrompts.personalityPrompt) {
      prompt += `${companyPrompts.personalityPrompt.trim()}\n\n`;
    } else {
      // fallback بسيط جداً لو مفيش برومبت (نظرياً مش هيحصل لأننا عملنا migration)
      prompt += `أنت مساعد ذكي محترف. ساعد العميل في استفساره.\n\n`;
    }

    // 2. معلومات العميل بشكل ذكي (ديناميكي لا يمكن تخزينه في DB)
    prompt += this.buildCustomerContext(customerProfile, conversationHistory);

    return prompt;
  }

  /**
   * بناء قسم الشخصية الديناميكي
   * DEPRECATED (Moved to System Prompt)
   */
  // Removed buildPersonalitySection

  /**
   * بناء أمثلة على الأسلوب
   * DEPRECATED (Moved to System Prompt)
   */
  // Removed buildStyleExamples

  /**
   * توجيهات التعامل العاطفي
   * DEPRECATED (Moved to System Prompt)
   */
  // Removed buildEmotionalGuidance

  /**
   * أمثلة للردود الجيدة والسيئة
   * DEPRECATED (Moved to System Prompt)
   */
  // Removed buildGoodBadExamples

  /**
   * بناء سياق العميل
   */
  buildCustomerContext(profile, history) {
    const isReturning = history && history.length > 0;
    const orderCount = profile?.orderCount || 0;
    const customerName = profile?.name || 'عميل';

    let context = `\n\n📊 معلومات العميل:\n`;
    context += `- الاسم: ${customerName}\n`;

    if (isReturning) {
      context += `- عميل راجع (عنده ${orderCount} طلب سابق) ⭐\n`;
      context += `- آخر تفاعل: ${this.getLastInteractionTime(history)}\n`;
    } else {
      context += `- عميل جديد (أول مرة) 🎉\n`;
    }

    // إضافة معلومات المحادثة السابقة إن وجدت
    if (history && history.length > 0) {
      context += `\n📚 آخر 3 تفاعلات:\n`;
      history.slice(-3).forEach((interaction, index) => {
        context += `${index + 1}. العميل: "${interaction.userMessage.substring(0, 50)}..."\n`;
        context += `   ردك: "${interaction.aiResponse.substring(0, 50)}..."\n`;
      });
      context += `💡 استخدمي هذا السياق للاستمرارية\n`;
    }

    return context;
  }

  /**
   * حساب الوقت منذ آخر تفاعل
   */
  getLastInteractionTime(history) {
    if (!history || history.length === 0) return 'N/A';

    const lastInteraction = history[history.length - 1];
    const time = new Date(lastInteraction.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffMinutes < 5) return 'دقائق قليلة';
    if (diffMinutes < 60) return `${diffMinutes} دقيقة`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ساعة`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} يوم`;
  }

  /**
   * تحديد وقت اليوم
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * تحليل الحالة العاطفية من الرسالة
   */
  async detectEmotionalState(message) {
    const keywords = {
      angry: ['زعلان', 'منزعج', 'غضبان', 'مش راضي', 'سيء', 'متأخر', 'مشكلة', 'غلط'],
      happy: ['رائع', 'ممتاز', 'جميل', 'شكراً', 'تمام', 'حلو', 'جامد'],
      confused: ['مش فاهم', '؟؟', 'ازاي', 'يعني إيه', 'محتار', 'مش عارف'],
      worried: ['قلقان', 'خايف', 'متأكد', 'ضمان', 'مضمون', 'أمان']
    };

    const lowerMessage = message.toLowerCase();

    // حساب النقاط لكل حالة
    const scores = {};
    for (const [emotion, words] of Object.entries(keywords)) {
      scores[emotion] = words.filter(word => lowerMessage.includes(word)).length;
    }

    // اختيار الحالة صاحبة أعلى نقاط
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'neutral';

    return Object.keys(scores).find(emotion => scores[emotion] === maxScore) || 'neutral';
  }

  /**
   * تحليل أسلوب كلام العميل
   */
  detectCustomerTone(message) {
    const formalIndicators = ['حضرتك', 'سيادتكم', 'تفضلوا', 'أود', 'يرجى'];
    const casualIndicators = ['ازيك', 'ايه', 'عايز', 'حلو', 'كده', 'يعني'];

    const lowerMessage = message.toLowerCase();

    const formalScore = formalIndicators.filter(word => lowerMessage.includes(word)).length;
    const casualScore = casualIndicators.filter(word => lowerMessage.includes(word)).length;

    if (formalScore > casualScore) return 'formal';
    if (casualScore > formalScore) return 'casual';
    return 'balanced';
  }

  /**
   * تحليل مستوى الاستعجال
   */
  detectUrgencyLevel(message) {
    const urgentKeywords = ['فوري', 'سريع', 'مستعجل', 'ضروري', 'الآن', 'دلوقتي', '!!!'];
    const lowerMessage = message.toLowerCase();

    return urgentKeywords.some(word => lowerMessage.includes(word)) ? 'high' : 'normal';
  }

  /**
   * تحديد مرحلة المحادثة
   */
  determineConversationPhase(conversationMemory) {
    if (!conversationMemory || conversationMemory.length === 0) {
      return 'opening';
    } else if (conversationMemory.length < 3) {
      return 'middle';
    } else {
      return 'closing';
    }
  }
}

// Singleton instance
let instance = null;

function getDynamicPromptBuilder() {
  if (!instance) {
    instance = new DynamicPromptBuilder();
  }
  return instance;
}

module.exports = getDynamicPromptBuilder();
module.exports.DynamicPromptBuilder = DynamicPromptBuilder;

