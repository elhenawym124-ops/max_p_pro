# AI Agent Modules

هذا المجلد يحتوي على modules منفصلة تم إنشاؤها لإعادة هيكلة `aiAgentService.js`.

## ملاحظة مهمة

**✅ جميع الـ modules مستخدمة الآن في `aiAgentService.js` باستخدام Lazy Initialization Pattern.**

الملف الرئيسي `aiAgentService.js` يستخدم getter methods لتحميل الـ modules عند الحاجة فقط، مما يحسن الأداء.

## Modules المستخدمة

### 1. `productExtractor.js`
- **الاستخدام**: استخراج أسماء المنتجات من:
  - الرسالة الحالية للعميل
  - الذاكرة (المحادثة السابقة)
  - RAG data (كـ fallback)
- **الحالة**: ✅ مستخدم في `aiAgentService.js`

### 2. `imageProcessor.js`
- **الاستخدام**: معالجة الصور وطلبات العملاء:
  - `isCustomerRequestingImages()` - كشف إذا كان العميل يطلب صور
  - `getSmartResponse()` - دالة موحدة ذكية للحصول على الرد والصور
  - `filterImagesByColor()` - فلترة الصور حسب اللون
  - `getProductImagesFromDB()` - جلب صور المنتج من قاعدة البيانات
  - `extractImagesFromRAGData()` - استخراج الصور من RAG data بذكاء (✅ تم دمجه من `imageExtractor.js`)
  - `searchImagesByColorInDatabase()` - البحث عن صور بلون محدد في قاعدة البيانات
- **الحالة**: ✅ مستخدم في `aiAgentService.js` عبر `getImageProcessor()`
- **ملاحظة**: تم دمج `imageExtractor.js` في `imageProcessor.js`

### 3. `modelManager.js`
- **الاستخدام**: إدارة نماذج Gemini:
  - `getActiveGeminiKey()` - الحصول على المفتاح النشط
  - `getActiveGeminiKeyWithModel()` - الحصول على المفتاح والنموذج النشط
  - `findNextAvailableModel()` - البحث عن نموذج احتياطي
  - `markModelAsExhausted()` - تحديد نموذج كمستنفد
  - `updateModelUsage()` - تحديث عداد الاستخدام
  - `activateKey()` - تفعيل مفتاح
- **الحالة**: ✅ مستخدم في `aiAgentService.js` عبر `getModelManager()`

### 4. `orderProcessor.js`
- **الاستخدام**: معالجة الطلبات:
  - `detectOrderConfirmation()` - كشف تأكيد الطلب
  - `extractCustomerDataFromMessage()` - استخراج بيانات العميل من الرسالة
  - `extractOrderDetailsFromMemory()` - استخراج تفاصيل الطلب من الذاكرة
  - `checkDataCompleteness()` - فحص اكتمال البيانات
  - `generateDataRequestResponse()` - إنشاء رد لطلب البيانات المفقودة
  - `attemptOrderCreationWithNewData()` - محاولة إنشاء الطلب بالبيانات الجديدة
- **الحالة**: ✅ مستخدم في `aiAgentService.js` عبر `getOrderProcessor()`

### 5. `intentAnalyzer.js`
- **الاستخدام**: تحليل النوايا (intent):
  - `analyzeIntent()` - تحليل الـ intent الأساسي
  - `analyzeIntentWithEnhancedContext()` - تحليل الـ intent مع سياق محسن
  - `checkGreetingIntent()` - فحص أولي للتحيات
  - `checkPriorityKeywords()` - فحص أولي للكلمات المفتاحية
- **الحالة**: ✅ مستخدم مباشرة في `aiAgentService.js`

### 6. `contextManager.js`
- **الاستخدام**: إدارة وتحليل سياق المحادثة:
  - `analyzeEnhancedConversationContext()` - تحليل السياق المتقدم
  - `buildEnhancedConversationContext()` - بناء السياق
  - `analyzeConversationState()` - تحليل حالة المحادثة
  - `analyzeIntentWithEnhancedContext()` - تحليل النوايا مع سياق محسن
  - `enhanceResponseWithConversationState()` - تحسين الرد بناءً على حالة المحادثة
- **الحالة**: ✅ مستخدم في `aiAgentService.js` عبر `getContextManager()`

### 7. `messageProcessor.js`
- **الاستخدام**: معالجة رسائل العملاء الرئيسية:
  - `processCustomerMessage()` - الدالة الرئيسية لمعالجة الرسائل
  - `processImageWithAI()` - معالجة الصور مع AI
  - `processWithAI()` - معالجة نصية مع AI
  - `saveImageResponseToMemory()` - حفظ ردود الصور في الذاكرة
- **الحالة**: ✅ مستخدم في `aiAgentService.js` عبر `getMessageProcessor()`

### 8. `responseGenerator.js`
- **الاستخدام**: توليد ردود AI:
  - `buildPrompt()` - بناء الـ prompt الأساسي
  - `buildAdvancedPrompt()` - بناء الـ prompt المتقدم
  - `generateAIResponse()` - توليد رد AI باستخدام Gemini
  - `buildGenerationConfig()` - بناء إعدادات التوليد
  - `buildOrderConfirmationPrompt()` - بناء prompt لتأكيد الطلب
- **الحالة**: ✅ مستخدم في `aiAgentService.js` عبر `getResponseGenerator()`

### 9. `settingsManager.js`
- **الاستخدام**: إدارة إعدادات الذكاء الاصطناعي:
  - `getCompanyPrompts()` - جلب prompts الشركة
  - `getSettings()` - جلب إعدادات AI
  - `updateSettings()` - تحديث الإعدادات
  - `reloadSystemPrompt()` - إعادة تحميل system prompt
- **الحالة**: ✅ مستخدم في `aiAgentService.js` عبر `getSettingsManager()`

### 10. `learningMonitor.js`
- **الاستخدام**: جمع بيانات التعلم ومراقبة الأداء:
  - `collectLearningData()` - جمع بيانات التعلم
  - `determineOutcome()` - تحديد نتيجة التفاعل
  - `updateLearningDataWithFeedback()` - تحديث بيانات التعلم مع التغذية الراجعة
  - `monitorImprovementPerformance()` - مراقبة أداء التحسينات
  - `calculateImprovement()` - حساب التحسن في المؤشرات
- **الحالة**: ✅ مستخدم في `aiAgentService.js` عبر `getLearningMonitor()`

## الملفات المحذوفة

### ❌ `imageExtractor.js`
- **الحالة**: تم حذفه
- **السبب**: تم دمج وظائفه في `imageProcessor.js`
- **التاريخ**: 2024

### ❌ `promptBuilder.js`
- **الحالة**: تم حذفه
- **السبب**: الوظائف موجودة في `responseGenerator.js` بشكل أفضل وأكثر تفصيلاً
- **التاريخ**: 2024

## Lazy Initialization Pattern

يستخدم `aiAgentService.js` نمط Lazy Initialization لتحميل الـ modules عند الحاجة فقط:

```javascript
getMessageProcessor() {
  if (!this._messageProcessor) {
    const MessageProcessor = require('./aiAgent/messageProcessor');
    this._messageProcessor = new MessageProcessor(this);
  }
  return this._messageProcessor;
}
```

هذا يحسن الأداء من خلال:
- تقليل وقت التحميل الأولي
- تحميل الـ modules فقط عند الحاجة
- تقليل استهلاك الذاكرة

## الحالة الحالية

- ✅ جميع الـ modules المستخدمة تعمل بشكل صحيح
- ✅ تم دمج `imageExtractor.js` في `imageProcessor.js`
- ✅ تم حذف `promptBuilder.js` (الوظائف موجودة في `responseGenerator.js`)
- ✅ جميع الـ modules تستخدم Lazy Initialization Pattern
- ✅ النظام يعمل بكفاءة وأداء جيد

## التوصيات المستقبلية

1. **إضافة JSDoc comments** أفضل لكل دالة لتسهيل الصيانة
2. **إضافة Unit Tests** لكل module لضمان الجودة
3. **تحسين Error Handling** في الـ modules
4. **إضافة Logging** أفضل لتتبع الأداء
