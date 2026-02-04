/**
 * خدمة التكيف مع أسلوب العميل
 * Tone Adaptation Service
 * 
 * يحلل أسلوب كلام العميل ويكيّف الردود لتتماشى معه
 * (رسمي / عامي / متوازن)
 */

class ToneAdaptationService {
  constructor() {
    this.toneIndicators = this.initializeToneIndicators();
    //console.log('🎯 [ToneAdaptation] Service initialized');
  }

  /**
   * تهيئة مؤشرات الأسلوب
   */
  initializeToneIndicators() {
    return {
      formal: {
        keywords: [
          'حضرتك', 'سيادتكم', 'تفضل', 'تفضلوا', 'أود', 'يسعدني',
          'تشرفنا', 'سعداء', 'يرجى', 'نأمل', 'نتمنى'
        ],
        patterns: [
          /^أود أن/,
          /^هل يمكن/,
          /^أرجو/,
          /^من فضلك/,
          /حضرتك/
        ],
        score: 0
      },
      
      casual: {
        keywords: [
          'ازيك', 'ايه', 'عايز', 'عاوز', 'حلو', 'كده', 'يعني',
          'بقى', 'يا عم', 'يا معلم', 'يسطا', 'واد', 'بتاع'
        ],
        patterns: [
          /ازيك/,
          /عامل ايه/,
          /ايه الأخبار/,
          /يا عم/,
          /يعني/
        ],
        score: 0
      },
      
      slang: {
        keywords: [
          'يسطا', 'يا معلم', 'يا برنس', 'جامد', 'تمام أوي',
          'حلو أوي', 'كويس', 'ماشي', 'يلا'
        ],
        patterns: [
          /يسطا/,
          /يا معلم/,
          /جامد/
        ],
        score: 0
      },
      
      professional: {
        keywords: [
          'استفسار', 'معلومات', 'تفاصيل', 'مواصفات', 'سعر',
          'شراء', 'طلب', 'توصيل', 'دفع', 'فاتورة'
        ],
        patterns: [
          /^أريد معرفة/,
          /^ما هي/,
          /^كم/
        ],
        score: 0
      }
    };
  }

  /**
   * تحليل أسلوب كلام العميل من آخر رسائله
   */
  analyzeTone(messages) {
    if (!messages || messages.length === 0) {
      return {
        dominantTone: 'balanced',
        scores: {},
        confidence: 0
      };
    }

    // جمع آخر 5 رسائل من العميل فقط
    const recentMessages = messages.slice(-5);
    const allText = recentMessages.join(' ').toLowerCase();
    
    const tones = JSON.parse(JSON.stringify(this.toneIndicators)); // deep copy
    
    // حساب النقاط لكل tone
    for (const [toneName, toneData] of Object.entries(tones)) {
      let score = 0;
      
      // فحص الكلمات المفتاحية
      for (const keyword of toneData.keywords) {
        const regex = new RegExp(keyword, 'g');
        const matches = allText.match(regex);
        if (matches) {
          score += matches.length * 2; // كل تطابق = نقطتان
        }
      }
      
      // فحص الأنماط
      for (const pattern of toneData.patterns) {
        if (pattern.test(allText)) {
          score += 5; // كل pattern = 5 نقاط
        }
      }
      
      tones[toneName].score = score;
    }
    
    // اختيار الـ tone صاحب أعلى نقاط
    const sortedTones = Object.entries(tones)
      .sort((a, b) => b[1].score - a[1].score);
    
    const dominantTone = sortedTones[0][0];
    const confidence = this.calculateConfidence(tones);
    
    return {
      dominantTone,
      scores: Object.fromEntries(
        Object.entries(tones).map(([name, data]) => [name, data.score])
      ),
      confidence,
      details: {
        topTones: sortedTones.slice(0, 2).map(([name, data]) => ({
          name,
          score: data.score
        }))
      }
    };
  }

  /**
   * حساب مستوى الثقة في التحليل
   */
  calculateConfidence(tones) {
    const scores = Object.values(tones).map(t => t.score);
    const max = Math.max(...scores);
    const secondMax = Math.max(...scores.filter(s => s !== max));
    
    if (max === 0) return 0; // لا توجد مؤشرات
    if (secondMax === 0) return 1; // مؤشر واحد واضح جداً
    
    // نسبة الفرق بين الأعلى والثاني
    return (max - secondMax) / max;
  }

  /**
   * تكييف الرد بناءً على أسلوب العميل
   */
  adaptResponseToTone(response, analysis) {
    const { dominantTone, confidence } = analysis;
    
    // إذا كانت الثقة منخفضة جداً، استخدم أسلوب متوازن
    if (confidence < 0.2) {
      return this.applyBalancedTone(response);
    }
    
    switch (dominantTone) {
      case 'formal':
        return this.applyFormalTone(response);
      case 'casual':
        return this.applyCasualTone(response);
      case 'slang':
        return this.applySlangTone(response);
      case 'professional':
        return this.applyProfessionalTone(response);
      default:
        return response;
    }
  }

  /**
   * تطبيق أسلوب رسمي
   */
  applyFormalTone(response) {
    const replacements = {
      // من عامي لرسمي
      'أهلاً بيك': 'أهلاً بحضرتك',
      'ازيك': 'كيف حالك',
      'عايز': 'تريد',
      'كده': 'بهذا الشكل',
      'حلو': 'جيد',
      'تمام': 'جيد جداً',
      'يعني': 'أي',
      'عاوز': 'ترغب',
      'بقى': 'الآن',
      'دلوقتي': 'حالياً',
      
      // تحسين العبارات
      'جامد': 'ممتاز',
      'كويس': 'جيد',
      'ماشي': 'حسناً'
    };
    
    return this.applyReplacements(response, replacements);
  }

  /**
   * تطبيق أسلوب عامي
   */
  applyCasualTone(response) {
    const replacements = {
      // من رسمي لعامي
      'أهلاً بحضرتك': 'أهلاً بيك',
      'كيف حالك': 'ازيك',
      'تريد': 'عايز',
      'جيد جداً': 'تمام',
      'حسناً': 'ماشي',
      'ممتاز': 'جامد',
      'جيد': 'كويس',
      'حالياً': 'دلوقتي',
      'الآن': 'دلوقتي'
    };
    
    return this.applyReplacements(response, replacements);
  }

  /**
   * تطبيق أسلوب عامي ثقيل (slang)
   */
  applySlangTone(response) {
    const replacements = {
      'ممتاز': 'جامد',
      'جيد': 'حلو',
      'تمام': 'تمام أوي',
      'جميل': 'حلو أوي',
      'رائع': 'تحفة'
    };
    
    // تطبيق أسلوب عامي أولاً
    let adapted = this.applyCasualTone(response);
    
    // ثم إضافة slang
    adapted = this.applyReplacements(adapted, replacements);
    
    return adapted;
  }

  /**
   * تطبيق أسلوب مهني
   */
  applyProfessionalTone(response) {
    const replacements = {
      'أهلاً بيك': 'مرحباً بك',
      'عايز': 'ترغب في',
      'تمام': 'ممتاز',
      'حلو': 'جيد',
      'كده': 'هكذا',
      'دلوقتي': 'حالياً',
      'بقى': 'الآن'
    };
    
    return this.applyReplacements(response, replacements);
  }

  /**
   * تطبيق أسلوب متوازن (افتراضي)
   */
  applyBalancedTone(response) {
    // أسلوب متوازن - لا رسمي جداً ولا عامي جداً
    // في الأغلب لا نحتاج تغيير
    return response;
  }

  /**
   * تطبيق الاستبدالات على النص
   */
  applyReplacements(text, replacements) {
    let result = text;
    
    for (const [oldWord, newWord] of Object.entries(replacements)) {
      // استخدام regex للبحث عن الكلمة كاملة
      const regex = new RegExp(`\\b${oldWord}\\b`, 'gi');
      result = result.replace(regex, newWord);
    }
    
    return result;
  }

  /**
   * إضافة توجيه للـ prompt بناءً على الـ tone
   */
  getToneGuidanceForPrompt(analysis) {
    const { dominantTone, confidence } = analysis;
    
    if (confidence < 0.2) {
      return `\n🎯 أسلوب الرد: متوازن (بين الرسمي والودود)\n`;
    }

    const guidance = {
      formal: `\n🎯 أسلوب الرد: رسمي ومحترم
- استخدمي "حضرتك" بدل "أنت"
- تجنبي العامية الثقيلة
- كوني مهذبة ومهنية
- استخدمي لغة فصيحة بسيطة
مثال: "تشرفنا بحضرتك، كيف يمكنني المساعدة؟"
`,

      casual: `\n🎯 أسلوب الرد: ودود وغير رسمي
- استخدمي لغة بسيطة ومباشرة
- كلمي بطبيعية زي الأصحاب
- متبالغيش في الرسميات
- استخدمي العامية المصرية الخفيفة
مثال: "أهلاً بيك! عايز أساعدك في إيه؟ 😊"
`,

      slang: `\n🎯 أسلوب الرد: عامي لكن محترم
- استخدمي عامية مصرية واضحة
- كوني ودودة جداً
- متخرجيش عن حدود الاحترام
- خليكي natural وسهلة
مثال: "ازيك يا معلم، عايز إيه النهارده؟ 🙂"
`,

      professional: `\n🎯 أسلوب الرد: مهني ومباشر
- ركزي على المعلومات والتفاصيل الدقيقة
- كوني دقيقة وواضحة
- قللي من الكلام الزائد
- اذكري الأرقام والتفاصيل بوضوح
مثال: "المنتج متوفر بسعر 299 جنيه، الشحن مجاني، والتوصيل خلال 2-3 أيام."
`
    };

    return guidance[dominantTone] || '';
  }

  /**
   * الحصول على نصائح للتكيف
   */
  getAdaptationTips(analysis) {
    const { dominantTone, confidence } = analysis;
    
    if (confidence < 0.3) {
      return {
        suggestion: 'الأسلوب غير واضح - استخدم أسلوب متوازن',
        reliability: 'low',
        adaptationLevel: 'minimal'
      };
    }
    
    if (confidence > 0.7) {
      return {
        suggestion: `أسلوب العميل واضح جداً: ${dominantTone} - تكيّف بشكل كامل`,
        reliability: 'high',
        adaptationLevel: 'full'
      };
    }
    
    return {
      suggestion: `أسلوب العميل: ${dominantTone} - تكيّف بشكل معتدل`,
      reliability: 'medium',
      adaptationLevel: 'moderate'
    };
  }

  /**
   * الحصول على إحصائيات
   */
  getStats() {
    return {
      totalTones: Object.keys(this.toneIndicators).length,
      keywordsPerTone: Object.entries(this.toneIndicators).reduce((acc, [name, data]) => {
        acc[name] = data.keywords.length;
        return acc;
      }, {})
    };
  }
}

// Singleton instance
let instance = null;

function getToneAdaptationService() {
  if (!instance) {
    instance = new ToneAdaptationService();
  }
  return instance;
}

module.exports = getToneAdaptationService();
module.exports.ToneAdaptationService = ToneAdaptationService;

