/**
 * AI Agent Constants
 * 
 * Single Source of Truth for AI configuration constants
 * جميع القيم الثابتة لإعدادات الذكاء الصناعي في مكان واحد
 */

// ✅ Default AI Generation Settings
// ⚠️ ملاحظة: القيم الافتراضية الفعلية موجودة في الواجهة (Frontend)
// هذه القيم تستخدم فقط كـ fallback في حالة عدم وجود قيمة في قاعدة البيانات
const DEFAULT_AI_SETTINGS = {
  // Generation Parameters
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
  TOP_K: 40,
  MAX_OUTPUT_TOKENS: 2048, // ⚠️ يجب أن تكون نفس القيمة في الواجهة (AIManagement.tsx)
  RESPONSE_STYLE: 'balanced', // 'formal' | 'casual' | 'balanced'
  
  // Memory Settings
  MAX_MESSAGES_PER_CONVERSATION: 50,
  MEMORY_RETENTION_DAYS: 30,
  
  // Quality Settings
  MIN_QUALITY_SCORE: 70,
  
  // Retry Settings
  MAX_RETRIES: 2, // ✅ حد أقصى لعدد المحاولات
  RETRY_DELAYS: [1000, 2000], // milliseconds
};

// ✅ Token Limits by Message Type
const TOKEN_LIMITS_BY_TYPE = {
  greeting: 2048,           // ردود قصيرة
  casual_chat: 2048,       // ردود قصيرة
  product_inquiry: 4096,    // ردود متوسطة
  price_inquiry: 4096,      // ردود متوسطة
  order_confirmation: 8192, // ردود طويلة مع تفاصيل
  order_details: 8192,      // ردود طويلة
  complaint: 6144,          // ردود متوسطة-طويلة
  problem: 6144,            // ردود متوسطة-طويلة
  context_extraction: 200,  // استخراج سياق فقط
  general: 2048,            // افتراضي
};

// ✅ Retry Token Multipliers
const RETRY_TOKEN_MULTIPLIERS = {
  first: 1,      // القيمة الأصلية
  second: 2,     // ضعف القيمة
  third: 4,      // 4 أضعاف القيمة (حد أقصى)
};

// ✅ Temperature by Message Type
const TEMPERATURE_BY_TYPE = {
  greeting: null,              // يستخدم القيمة الافتراضية + 0.1
  casual_chat: null,            // يستخدم القيمة الافتراضية + 0.1
  order_confirmation: 0.3,      // دقة عالية
  order_details: 0.3,           // دقة عالية
  product_inquiry: 0.6,         // توازن
  price_inquiry: 0.6,           // توازن
  complaint: 0.4,               // دقة عالية وتعاطف
  problem: 0.4,                 // دقة عالية وتعاطف
  context_extraction: 0.1,      // دقة عالية جداً
  general: null,                // يستخدم القيمة الافتراضية
};

// ✅ TopK/TopP by Message Type
const SAMPLING_BY_TYPE = {
  order_confirmation: { topK: 10, topP: 0.8 },
  order_details: { topK: 10, topP: 0.8 },
  complaint: { topK: 20, topP: 0.9 },
  problem: { topK: 20, topP: 0.9 },
  general: { topK: 40, topP: 0.9 },
};

// ✅ Prompt Limits
const PROMPT_LIMITS = {
  MAX_PROMPT_LENGTH: 32000,      // الحد الأقصى لطول الـ prompt (characters)
  MAX_CONVERSATION_MESSAGES: 10,  // عدد الرسائل المعروضة في المحادثة
  MAX_RAG_ITEMS: 20,              // عدد عناصر RAG المعروضة
};

// ✅ Response Validation
const RESPONSE_VALIDATION = {
  MIN_LENGTH: 3,                 // الحد الأدنى لطول الرد (characters)
  MIN_LENGTH_WITH_CONTEXT: 10,    // الحد الأدنى للردود القصيرة المفيدة
  MAX_RETRIES_VALIDATION: 2,      // عدد محاولات retry للـ validation
};

// ✅ Useful Short Words (for validation)
const USEFUL_SHORT_WORDS = [
  'شكراً', 'شكرا', 'شكر', 
  'تمام', 'حاضر', 'نعم', 
  'موافق', 'ممتاز', 'أوكي', 
  'ok', 'yes', 'نعم', 'حاضر'
];

module.exports = {
  DEFAULT_AI_SETTINGS,
  TOKEN_LIMITS_BY_TYPE,
  RETRY_TOKEN_MULTIPLIERS,
  TEMPERATURE_BY_TYPE,
  SAMPLING_BY_TYPE,
  PROMPT_LIMITS,
  RESPONSE_VALIDATION,
  USEFUL_SHORT_WORDS,
};

