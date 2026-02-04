/**
 * خدمة تنويع الردود ومنع التكرار
 * Response Diversity Service
 * 
 * يمنع تكرار نفس العبارات والأساليب في المحادثة الواحدة
 * ويضمن تنوع طبيعي في الردود
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class ResponseDiversityService {
  constructor() {
    this.usedPhrases = new Map(); // conversationId -> Set of used phrases
    this.phraseSynonyms = this.initializeSynonyms();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000); // كل ساعة
    //console.log('🔄 [ResponseDiversity] Service initialized');
  }

  /**
   * قاموس البدائل للعبارات الشائعة
   */
  initializeSynonyms() {
    return {
      // التحيات
      greeting: [
        'أهلاً بيك',
        'اهلاً وسهلاً',
        'ازيك، أقدر أساعدك؟',
        'يسعد مساك',
        'نورت',
        'أهلاً فيك',
        'مرحباً بيك',
        'يسعدني أساعدك'
      ],
      
      // الرد على السعر
      price_response: [
        'سعره {price} جنيه',
        'ب {price} جنيه بس',
        'هيكلفك {price} جنيه',
        '{price} جنيه يا فندم',
        'السعر {price} ج',
        'تمنه {price} جنيه',
        'بسعر {price} جنيه'
      ],
      
      // التوفر - نعم
      availability_yes: [
        'أيوه موجود',
        'متوفر حالياً',
        'موجود يا فندم',
        'آه عندنا',
        'أيوه في المخزن',
        'متاح دلوقتي',
        'موجود وجاهز للشحن'
      ],
      
      // التوفر - لا
      availability_no: [
        'للأسف خلص',
        'مش متوفر حالياً',
        'خلص من المخزن',
        'نفذ للأسف',
        'مش موجود دلوقتي',
        'غير متاح حالياً',
        'نفذت الكمية'
      ],
      
      // الشكر / العفو
      thank_you: [
        'العفو',
        'تحت أمرك',
        'في الخدمة دايماً',
        'أي وقت',
        'دايماً في الخدمة',
        'بالتأكيد',
        'على الرحب والسعة'
      ],
      
      // التأكيد
      confirmation: [
        'تمام',
        'ماشي',
        'حاضر',
        'اوكي',
        'فهمتك',
        'حاضر يا فندم',
        'تمام كده'
      ],
      
      // السؤال عن المساعدة الإضافية
      ask_more: [
        'عايز تعرف حاجة تانية؟',
        'في حاجة تانية أساعدك بيها؟',
        'ممكن أساعدك في حاجة تانية؟',
        'حضرتك محتاج حاجة تانية؟',
        'أي خدمة تانية؟',
        'عايز تسأل عن حاجة تانية؟',
        'في حاجة تانية؟'
      ],
      
      // الوداع
      goodbye: [
        'شكراً ليك',
        'في أمان الله',
        'نورت',
        'تشرفنا بيك',
        'يوم سعيد',
        'مع السلامة',
        'أتمنى أكون ساعدتك'
      ]
    };
  }

  /**
   * اختيار بديل غير مستخدم
   */
  async selectDiversePhrase(conversationId, phraseType, params = {}) {
    // جلب العبارات المستخدمة في هذه المحادثة
    if (!this.usedPhrases.has(conversationId)) {
      this.usedPhrases.set(conversationId, new Set());
    }
    
    const usedInConvo = this.usedPhrases.get(conversationId);
    const availablePhrases = this.phraseSynonyms[phraseType] || [];
    
    if (availablePhrases.length === 0) {
      return ''; // لا يوجد بدائل
    }
    
    // فلترة العبارات غير المستخدمة
    let unusedPhrases = availablePhrases.filter(phrase => !usedInConvo.has(phrase));
    
    // إذا استخدمنا كل الخيارات، reset
    if (unusedPhrases.length === 0) {
      usedInConvo.clear();
      unusedPhrases = [...availablePhrases];
    }
    
    // اختيار عشوائي
    const selected = unusedPhrases[Math.floor(Math.random() * unusedPhrases.length)];
    
    // حفظ الاستخدام
    usedInConvo.add(selected);
    
    // استبدال المتغيرات
    let finalPhrase = selected;
    for (const [key, value] of Object.entries(params)) {
      finalPhrase = finalPhrase.replace(`{${key}}`, value);
    }
    
    return finalPhrase;
  }

  /**
   * تحليل الرد وإضافة تنويع
   */
  async diversifyResponse(response, conversationId, conversationMemory) {
    try {
      // ✅ فحص القيم قبل الاستخدام
      if (!response || typeof response !== 'string') {
        return response;
      }
      
      // فحص إذا كان الرد مشابه للردود السابقة
      const similarity = this.calculateSimilarityWithHistory(response, conversationMemory);
      
      if (similarity > 0.7) {
        //console.log(`⚠️ [ResponseDiversity] High similarity detected (${(similarity * 100).toFixed(0)}%) - rephrasing...`);
        
        // الرد مشابه جداً - نحاول تنويعه
        response = await this.addVariation(response, conversationMemory);
      }
      
      // حفظ هذا الرد في التاريخ
      if (conversationId) {
        this.trackResponse(conversationId, response);
      }
      
      return response;
      
    } catch (error) {
      // ✅ Silent error handling - لا نريد أن يعطل هذا العملية
      console.error('❌ [ResponseDiversity] Error diversifying response:', error.message);
      return response; // إرجاع الرد الأصلي عند حدوث خطأ
    }
  }

  /**
   * إضافة تنويع للرد
   */
  async addVariation(response, conversationMemory) {
    // محاولة تغيير بداية الرد
    const startPatterns = [
      { old: /^السعر /i, replacements: ['سعره ', 'ب ', 'تمنه ', 'هيكلفك '] },
      { old: /^متوفر/i, replacements: ['موجود', 'أيوه عندنا', 'متاح'] },
      { old: /^أهلاً بيك/i, replacements: ['اهلاً وسهلاً', 'نورت', 'مرحباً بيك'] },
      { old: /^تمام/i, replacements: ['ماشي', 'حاضر', 'اوكي'] },
      { old: /^شكراً/i, replacements: ['العفو', 'تحت أمرك', 'في الخدمة'] }
    ];

    for (const pattern of startPatterns) {
      if (pattern.old.test(response)) {
        const replacement = pattern.replacements[Math.floor(Math.random() * pattern.replacements.length)];
        response = response.replace(pattern.old, replacement);
        break;
      }
    }

    return response;
  }

  /**
   * حساب التشابه مع الردود السابقة
   */
  calculateSimilarityWithHistory(response, conversationMemory) {
    // ✅ فحص القيم قبل الاستخدام
    if (!response || typeof response !== 'string') {
      return 0;
    }
    
    if (!conversationMemory || conversationMemory.length === 0) {
      return 0;
    }
    
    // فحص آخر 3 ردود فقط - تصفية الردود الفارغة
    const recentResponses = conversationMemory
      .slice(-3)
      .map(m => m.aiResponse || m.content || null)
      .filter(res => res && typeof res === 'string' && res.trim().length > 0);
    
    if (recentResponses.length === 0) {
      return 0;
    }
    
    let maxSimilarity = 0;
    
    for (const prevResponse of recentResponses) {
      const similarity = this.calculateStringSimilarity(response, prevResponse);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return maxSimilarity;
  }

  /**
   * حساب التشابه بين نصين (Jaccard similarity)
   */
  calculateStringSimilarity(str1, str2) {
    // ✅ فحص القيم قبل الاستخدام
    if (!str1 || !str2 || typeof str1 !== 'string' || typeof str2 !== 'string') {
      return 0;
    }
    
    // تحويل لأحرف صغيرة وتقسيم لكلمات
    const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 || words2.size === 0) {
      return 0;
    }
    
    // حساب التقاطع والاتحاد
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * تتبع الرد في المحادثة
   */
  trackResponse(conversationId, response) {
    if (!this.usedPhrases.has(conversationId)) {
      this.usedPhrases.set(conversationId, new Set());
    }
    
    // استخراج أول 5 كلمات
    const firstWords = response.split(/\s+/).slice(0, 5).join(' ');
    this.usedPhrases.get(conversationId).add(firstWords);
  }

  /**
   * تنظيف الذاكرة القديمة
   */
  cleanup() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    const now = Date.now();
    
    // في implementation حقيقي، نحتاج تتبع timestamp لكل محادثة
    // حالياً نحتفظ بأحدث 1000 محادثة فقط
    if (this.usedPhrases.size > 1000) {
      const entries = Array.from(this.usedPhrases.entries());
      // حذف أقدم 200 محادثة
      entries.slice(0, 200).forEach(([key]) => {
        this.usedPhrases.delete(key);
      });
      
      //console.log(`🧹 [ResponseDiversity] Cleaned up old conversations. Size: ${this.usedPhrases.size}`);
    }
  }

  /**
   * إيقاف الخدمة
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * إعادة تعيين المحادثة (للاختبار)
   */
  resetConversation(conversationId) {
    if (this.usedPhrases.has(conversationId)) {
      this.usedPhrases.delete(conversationId);
      //console.log(`🔄 [ResponseDiversity] Reset conversation: ${conversationId}`);
    }
  }

  /**
   * الحصول على إحصائيات
   */
  getStats() {
    return {
      totalConversations: this.usedPhrases.size,
      totalPhrasesTracked: Array.from(this.usedPhrases.values()).reduce((sum, set) => sum + set.size, 0),
      availableSynonyms: Object.keys(this.phraseSynonyms).reduce((sum, key) => {
        return sum + this.phraseSynonyms[key].length;
      }, 0)
    };
  }
}

// Singleton instance
let instance = null;

function getResponseDiversityService() {
  if (!instance) {
    instance = new ResponseDiversityService();
  }
  return instance;
}

module.exports = getResponseDiversityService();
module.exports.ResponseDiversityService = ResponseDiversityService;


