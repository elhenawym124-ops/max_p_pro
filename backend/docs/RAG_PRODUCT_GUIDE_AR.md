# دليل استخدام نظام RAG للمنتجات 🚀

## ما هو RAG؟

**RAG = Retrieval-Augmented Generation**

ببساطة: النظام بيدور على المنتجات المناسبة من قاعدة البيانات ويديها للـ AI عشان يرد على العميل بمعلومات دقيقة.

---

## كيف يعمل النظام؟

### 1️⃣ تخزين المنتجات
عند إضافة منتج جديد، النظام بيعمل:
- تحويل اسم ووصف المنتج لـ **embedding** (أرقام)
- حفظ الـ embedding في قاعدة البيانات
- الحقل: `embedding` في جدول `products`

### 2️⃣ البحث عن المنتجات
عند سؤال العميل:
- تحويل السؤال لـ embedding
- البحث عن أقرب منتجات (Semantic Search)
- إرجاع أفضل 8 منتجات

### 3️⃣ الرد على العميل
- AI ياخد المنتجات المناسبة
- يكون رد احترافي بمعلومات دقيقة
- يشمل: الاسم، السعر، الوصف، الصور

---

## استخدام RAG في الكود

### مثال 1: البحث عن منتجات

```javascript
const ragService = require('./services/ragService');

// البحث عن منتجات بناءً على سؤال العميل
async function searchProducts(customerQuery, companyId) {
  const results = await ragService.retrieveRelevantData(
    customerQuery,           // "عايز حذاء رياضي"
    'product_inquiry',       // نوع السؤال
    customerId,              // معرف العميل
    companyId,               // معرف الشركة
    null,                    // IP address (optional)
    conversationMemory       // سجل المحادثة
  );
  
  return results;
}
```

### مثال 2: إضافة منتج جديد

```javascript
const EmbeddingHelper = require('./services/embeddingHelper');

// عند إضافة منتج جديد
async function addNewProduct(productData, companyId) {
  // 1. حفظ المنتج في قاعدة البيانات
  const product = await prisma.product.create({
    data: productData
  });
  
  // 2. توليد embedding للمنتج
  await EmbeddingHelper.generateAndSaveProductEmbedding(
    product.id,
    product.name,
    product.description,
    categoryName,
    companyId  // النظام هيجيب API key تلقائياً
  );
  
  // 3. إضافة المنتج لـ RAG index
  await ragService.addOrUpdateProduct(product, companyId);
  
  return product;
}
```

### مثال 3: تحديث منتج

```javascript
// عند تحديث منتج
async function updateProduct(productId, updateData, companyId) {
  // 1. تحديث في قاعدة البيانات
  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: updateData
  });
  
  // 2. تحديث embedding إذا تغير الاسم أو الوصف
  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true }
  });
  
  await EmbeddingHelper.updateEmbeddingIfNeeded(
    productId,
    updateData,
    currentProduct,
    companyId
  );
  
  // 3. تحديث في RAG index
  await ragService.addOrUpdateProduct(updatedProduct, companyId);
  
  return updatedProduct;
}
```

### مثال 4: حذف منتج

```javascript
// عند حذف منتج
async function deleteProduct(productId) {
  // 1. حذف من قاعدة البيانات
  await prisma.product.delete({
    where: { id: productId }
  });
  
  // 2. حذف من RAG index
  ragService.removeProduct(productId);
}
```

---

## التكامل مع AI للرد على العملاء

### السيناريو الكامل:

```javascript
const ragService = require('./services/ragService');
const aiAgentService = require('./services/aiAgentService');

async function handleCustomerMessage(message, customerId, companyId) {
  // 1. تحديد نية العميل
  const intent = detectIntent(message); // 'product_inquiry', 'price_inquiry', etc.
  
  // 2. البحث عن منتجات مناسبة باستخدام RAG
  const relevantProducts = await ragService.retrieveRelevantData(
    message,
    intent,
    customerId,
    companyId,
    null,
    conversationHistory
  );
  
  // 3. بناء context للـ AI
  const context = buildContextFromProducts(relevantProducts);
  
  // 4. الحصول على رد من AI
  const aiResponse = await aiAgentService.generateResponse({
    query: message,
    context: context,
    companyId: companyId,
    conversationHistory: conversationHistory
  });
  
  // 5. إرسال الرد للعميل
  return aiResponse;
}

function buildContextFromProducts(products) {
  if (!products || products.length === 0) {
    return "لا توجد منتجات متاحة حالياً.";
  }
  
  let context = "المنتجات المتاحة:\n\n";
  
  products.forEach((product, index) => {
    context += `${index + 1}. ${product.name}\n`;
    context += `   السعر: ${product.price} جنيه\n`;
    context += `   الوصف: ${product.description || 'غير متوفر'}\n`;
    context += `   المخزون: ${product.stock > 0 ? 'متوفر' : 'غير متوفر'}\n`;
    
    if (product.metadata?.variants?.length > 0) {
      const colors = product.metadata.variants
        .filter(v => v.type === 'color')
        .map(v => v.name);
      const sizes = product.metadata.variants
        .filter(v => v.type === 'size')
        .map(v => v.name);
      
      if (colors.length > 0) {
        context += `   الألوان: ${colors.join('، ')}\n`;
      }
      if (sizes.length > 0) {
        context += `   المقاسات: ${sizes.join('، ')}\n`;
      }
    }
    
    context += '\n';
  });
  
  return context;
}
```

---

## أمثلة عملية للاستخدام

### مثال 1: عميل يسأل عن منتج

**سؤال العميل:** "عندكم حذاء رياضي؟"

**ما يحدث:**
1. RAG يبحث عن منتجات تحتوي "حذاء رياضي"
2. يجيب أفضل 8 منتجات مطابقة
3. AI يرد: "نعم، عندنا حذاء رياضي نايكي بسعر 1200 جنيه..."

### مثال 2: عميل يسأل عن السعر

**سؤال العميل:** "بكام الحذاء ده؟"

**ما يحدث:**
1. RAG يستخدم سياق المحادثة (Conversation Memory)
2. يفهم إن العميل بيسأل عن آخر منتج اتكلموا عنه
3. AI يرد: "الحذاء الرياضي نايكي سعره 1200 جنيه"

### مثال 3: عميل يسأل عن الألوان

**سؤال العميل:** "عندكم منه ألوان إيه؟"

**ما يحدث:**
1. RAG يجيب تفاصيل المنتج من قاعدة البيانات
2. يشمل الـ variants (الألوان والمقاسات)
3. AI يرد: "متوفر بالألوان: أسود، أبيض، أزرق"

---

## المتطلبات

### 1. API Key من Google Gemini
- النظام بيستخدم Google Gemini لتوليد embeddings
- محتاج API key نشط في جدول `gemini_keys`
- النظام بيدعم Central Keys و Company-specific Keys

### 2. قاعدة البيانات
- جدول `products` لازم يكون فيه حقل `embedding`
- النظام بيحفظ embeddings تلقائياً

### 3. الإعدادات
```javascript
// في ملف .env
GEMINI_API_KEY=your_api_key_here
```

---

## نصائح مهمة

### ✅ أفضل الممارسات:

1. **وصف المنتجات بدقة**
   - كلما كان الوصف أفضل، كلما كان البحث أدق
   - استخدم كلمات مفتاحية واضحة

2. **تحديث Embeddings**
   - عند تغيير اسم أو وصف المنتج، النظام بيحدث embedding تلقائياً
   - لو عايز تحديث يدوي، استخدم `EmbeddingHelper.generateAndSaveProductEmbedding()`

3. **عزل البيانات بين الشركات**
   - النظام بيدعم Multi-tenancy
   - كل شركة بتشوف منتجاتها بس
   - استخدم `companyId` دايماً

4. **Cache Management**
   - النظام بيعمل cache للمنتجات لمدة 15 دقيقة
   - لو عايز تحديث فوري، استخدم `clearCompanyProducts(companyId)`

### ⚠️ تجنب:

1. **عدم تمرير companyId**
   - دايماً مرر `companyId` لضمان العزل الصحيح

2. **تحديث متكرر للـ embeddings**
   - Embeddings مكلفة، حدثها بس لما يكون ضروري

3. **تحميل منتجات كتير في الذاكرة**
   - النظام بيحمل بس اللي محتاجه
   - استخدم Pagination للمنتجات الكتيرة

---

## API Endpoints المتاحة

### البحث عن منتجات
```
POST /api/rag/search
Body: {
  "query": "حذاء رياضي",
  "companyId": "company_123",
  "customerId": "customer_456"
}
```

### إضافة منتج
```
POST /api/products
Body: {
  "name": "حذاء رياضي نايكي",
  "description": "حذاء رياضي مريح...",
  "price": 1200,
  "companyId": "company_123"
}
```

---

## الخلاصة

النظام جاهز وشغال! كل اللي محتاجه:

1. ✅ **إضافة منتجات** - النظام هيعمل embedding تلقائياً
2. ✅ **استخدام RAG للبحث** - استدعي `ragService.retrieveRelevantData()`
3. ✅ **ربط مع AI** - استخدم النتائج في context للـ AI
4. ✅ **الرد على العملاء** - AI هيرد بمعلومات دقيقة عن منتجاتك

**مش محتاج تعمل أي setup إضافي!** 🎉
