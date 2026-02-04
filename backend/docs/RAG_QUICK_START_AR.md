# البداية السريعة - نظام RAG للمنتجات 🚀

## ما هو RAG؟

**RAG = Retrieval-Augmented Generation**

ببساطة شديدة:
- العميل يسأل: "عندكم حذاء رياضي؟"
- النظام يدور في قاعدة البيانات ويجيب أقرب منتجات
- AI ياخد المنتجات دي ويرد على العميل بمعلومات دقيقة

---

## النظام موجود وشغال! ✅

عندك بالفعل:
- ✅ Vector Database (تخزين embeddings)
- ✅ Embedding Service (تحويل المنتجات لأرقام)
- ✅ RAG Service (البحث الذكي)
- ✅ Integration مع Google Gemini

**مش محتاج تعمل setup جديد!**

---

## الاستخدام في 3 خطوات

### 1️⃣ إضافة منتج جديد

```javascript
const EmbeddingHelper = require('./services/embeddingHelper');
const ragService = require('./services/ragService');

// إضافة المنتج
const product = await prisma.product.create({
  data: {
    name: 'حذاء رياضي نايكي',
    description: 'حذاء مريح للجري',
    price: 1200,
    companyId: companyId
  }
});

// توليد embedding تلقائياً
await EmbeddingHelper.generateAndSaveProductEmbedding(
  product.id,
  product.name,
  product.description,
  'أحذية',
  companyId
);

// إضافة لـ RAG
await ragService.addOrUpdateProduct(product, companyId);
```

### 2️⃣ البحث عن منتجات

```javascript
const ragService = require('./services/ragService');

const products = await ragService.retrieveRelevantData(
  'عايز حذاء رياضي',     // سؤال العميل
  'product_inquiry',      // نوع السؤال
  customerId,
  companyId
);

console.log(`وجدت ${products.length} منتج`);
```

### 3️⃣ الرد على العميل

```javascript
const aiAgentService = require('./services/aiAgentService');

// بناء context من المنتجات
const context = products.map(p => 
  `${p.name} - ${p.price} جنيه`
).join('\n');

// الحصول على رد من AI
const response = await aiAgentService.generateResponse({
  query: 'عايز حذاء رياضي',
  systemPrompt: `المنتجات المتاحة:\n${context}`,
  companyId: companyId
});

// إرسال الرد للعميل
console.log(response);
```

---

## مثال كامل: معالج رسائل WhatsApp

```javascript
const { CustomerChatHandler } = require('./examples/rag-customer-chat-example');

const handler = new CustomerChatHandler();

// معالجة رسالة من عميل
const result = await handler.handleMessage(
  'customer_123',
  'company_456',
  'عندكم حذاء رياضي؟'
);

console.log(result.response);
// "نعم، عندنا حذاء رياضي نايكي بسعر 1200 جنيه..."
```

---

## الملفات المهمة

### 📚 الوثائق
- `docs/RAG_PRODUCT_GUIDE_AR.md` - دليل شامل بالعربية
- `docs/RAG_QUICK_START_AR.md` - هذا الملف

### 💻 الكود
- `services/ragService.js` - خدمة RAG الرئيسية
- `services/embeddingHelper.js` - توليد embeddings
- `examples/rag-customer-chat-example.js` - أمثلة عملية كاملة

---

## تشغيل الأمثلة

```bash
# تشغيل جميع الأمثلة
node backend/examples/rag-customer-chat-example.js

# أو استيراد في الكود
const { CustomerChatHandler } = require('./examples/rag-customer-chat-example');
```

---

## المتطلبات

### 1. API Key من Google Gemini
- محتاج API key نشط في جدول `gemini_keys`
- النظام بيدعم Central Keys و Company Keys

### 2. قاعدة البيانات
- جدول `products` فيه حقل `embedding` (موجود ✅)
- جدول `gemini_keys` فيه API keys نشطة

---

## أسئلة شائعة

### ❓ هل محتاج أعمل setup للـ Vector Database؟
**لا!** النظام جاهز وشغال. بس استخدمه.

### ❓ كيف أضيف منتج جديد؟
استخدم `EmbeddingHelper.generateAndSaveProductEmbedding()` بعد إضافة المنتج.

### ❓ هل النظام بيدعم أكثر من شركة؟
**نعم!** النظام بيعزل البيانات بين الشركات تلقائياً باستخدام `companyId`.

### ❓ كيف أحدث منتج موجود؟
استخدم `EmbeddingHelper.updateEmbeddingIfNeeded()` - بيحدث embedding بس لو الاسم أو الوصف اتغير.

### ❓ كيف أحذف منتج؟
استخدم `ragService.removeProduct(productId)` بعد حذف المنتج من قاعدة البيانات.

---

## نصائح مهمة

### ✅ افعل:
- استخدم `companyId` دايماً لضمان العزل
- اكتب وصف واضح للمنتجات
- استخدم الأمثلة الموجودة في `examples/`

### ❌ لا تفعل:
- لا تحدث embeddings بدون داعي (مكلفة)
- لا تنسى `companyId` في الاستدعاءات
- لا تحمل منتجات كتير في الذاكرة مرة واحدة

---

## الدعم

للمزيد من التفاصيل، راجع:
- `docs/RAG_PRODUCT_GUIDE_AR.md` - دليل شامل
- `examples/rag-customer-chat-example.js` - أمثلة عملية

---

## الخلاصة

النظام **جاهز وشغال**! 🎉

كل اللي محتاجه:
1. أضف منتجات
2. استخدم RAG للبحث
3. AI يرد على العملاء

**ابدأ الآن!** 🚀
