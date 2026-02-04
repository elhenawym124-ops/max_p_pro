# 🚀 دليل تكامل DeepSeek - من الوثائق الرسمية

## 📚 ما تعلمناه من الوثائق الرسمية

### **1. Rate Limits - الحقيقة الكاملة**

من الوثائق الرسمية:
> "DeepSeek API does NOT constrain user's rate limit. We will try our best to serve every request."

**معنى هذا:**
- ✅ **لا توجد rate limits محددة** (لا RPM، لا TPM، لا RPD)
- ✅ DeepSeek **لن يرفض الطلبات** بسبب rate limits
- ⚠️ لكن عند الضغط العالي: **يبطئ الاستجابة** بدلاً من الرفض
- ⏱️ إذا لم يبدأ الـ inference بعد **10 دقائق**، يغلق الاتصال

**Keep-alive Mechanism:**
- Non-streaming: يرسل empty lines
- Streaming: يرسل `: keep-alive` comments

---

### **2. Messages Format - الطريقة الصحيحة**

من الوثائق:
```json
{
  "model": "deepseek-chat",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ]
}
```

**القواعد:**
- ✅ `messages` يجب أن يكون array
- ✅ كل message له `role` و `content`
- ✅ Roles المتاحة: `system`, `user`, `assistant`, `tool`
- ✅ `content` يجب أن يكون **string صالح** (لا lone surrogates)

---

### **3. Error Codes - الأخطاء المحتملة**

| Code | السبب | الحل |
|------|-------|------|
| **400** | Bad Request - خطأ في الطلب | تحقق من format الـ messages |
| **401** | Invalid API Key أو رصيد منتهي | تحقق من المفتاح والرصيد |
| **500** | Server Error | أعد المحاولة |
| **Timeout** | أخذ وقت طويل (>10 دقائق) | قصّر الـ prompt |

**ملاحظة مهمة:**
- DeepSeek **لا يرجع 429** في الظروف العادية
- إذا حدث 429، يكون بسبب **مشكلة في الحساب** وليس rate limits

---

### **4. Parameters - المعاملات المدعومة**

| Parameter | الوصف | القيمة الافتراضية |
|-----------|-------|-------------------|
| `model` | `deepseek-chat` أو `deepseek-reasoner` | - |
| `messages` | Array of messages | - |
| `temperature` | 0 to 2 | 1.0 |
| `max_tokens` | Maximum output tokens | حسب النموذج |
| `top_p` | Nucleus sampling | 1.0 |
| `frequency_penalty` | -2 to 2 | 0 |
| `presence_penalty` | -2 to 2 | 0 |
| `stream` | Streaming response | false |

**غير مدعوم:**
- ❌ `topK` - DeepSeek لا يدعمه

---

### **5. DeepSeek Reasoner - الميزات الخاصة**

عند استخدام `deepseek-reasoner`:
- ✅ يرجع `reasoning_content` منفصل
- ✅ يستهلك "thinking tokens" إضافية
- ✅ أفضل للمهام المعقدة التي تحتاج تفكير

---

## 🛠️ أفضل الممارسات

### **1. تنظيف الـ Prompt**

**المشكلة الرئيسية:** Lone surrogates في Unicode
```javascript
// ❌ خطأ شائع
messages: [{ role: "user", content: "نص مع emoji مكسور �" }]

// ✅ الحل
messages: [{ role: "user", content: cleanPrompt("نص مع emoji مكسور �") }]
```

**طرق التنظيف:**
1. إزالة lone surrogates: `/[\uD800-\uDFFF]/g`
2. إزالة control characters: `/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g`
3. استخدام `toWellFormed()` (Node.js 20+)
4. Whitelist approach: إبقاء فقط الأحرف الآمنة

---

### **2. Error Handling الصحيح**

```javascript
try {
    const response = await axios.post(url, requestBody);
} catch (error) {
    const status = error.response?.status;
    
    if (status === 400) {
        // خطأ في format الطلب - تحقق من messages
        console.error('Bad request:', error.response?.data);
    } else if (status === 401) {
        // مشكلة في المفتاح أو الرصيد - لا تعيد المحاولة
        console.error('Authentication failed');
    } else if (status >= 500) {
        // خطأ من السيرفر - يمكن إعادة المحاولة
        console.error('Server error - retry');
    }
}
```

---

### **3. Timeout Handling**

```javascript
// ✅ timeout معقول
const timeout = model === 'deepseek-reasoner' ? 120000 : 90000;

axios.post(url, requestBody, {
    timeout: timeout
});
```

**لماذا؟**
- DeepSeek قد يبطئ تحت الضغط
- Reasoner يحتاج وقت أطول للتفكير
- لكن لا نريد انتظار 10 دقائق كاملة

---

### **4. Messages Structure**

```javascript
// ✅ الطريقة الصحيحة
const messages = [
    {
        role: "system",
        content: "أنت مساعد ذكي..."
    },
    {
        role: "user", 
        content: cleanPrompt(userMessage)
    }
];

// ❌ خطأ شائع
const messages = [
    {
        role: "user",
        content: systemPrompt + "\n\n" + userMessage // لا تدمج!
    }
];
```

---

### **5. Response Parsing**

```javascript
const choice = response.data.choices[0];
const message = choice.message;

// ✅ للـ chat
const content = message.content || '';

// ✅ للـ reasoner
const reasoningContent = message.reasoning_content || null;

// ✅ Token usage
const usage = {
    promptTokens: response.data.usage?.prompt_tokens || 0,
    completionTokens: response.data.usage?.completion_tokens || 0,
    totalTokens: response.data.usage?.total_tokens || 0
};
```

---

## 🔧 المشاكل الشائعة والحلول

### **Problem 1: خطأ 400 - "lone leading surrogate"**

**السبب:** الـ prompt يحتوي على emoji أو Unicode مكسور

**الحل:**
```javascript
function cleanPrompt(text) {
    // إزالة lone surrogates
    let cleaned = text.replace(/[\uD800-\uDFFF]/g, '');
    
    // إزالة control characters
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // استخدام toWellFormed إذا متوفر
    if (typeof cleaned.toWellFormed === 'function') {
        cleaned = cleaned.toWellFormed();
    }
    
    return cleaned.trim();
}
```

---

### **Problem 2: Timeout بعد وقت طويل**

**السبب:** الـ prompt طويل جداً أو السيرفر تحت ضغط

**الحل:**
1. قصّر الـ prompt
2. زود الـ timeout للـ reasoner
3. استخدم streaming للحصول على ردود تدريجية

---

### **Problem 3: استهلاك عالي للتوكنز**

**السبب:** الـ prompt غير محسّن

**الحل:**
1. افصل system/user messages بشكل صحيح
2. استخدم `max_tokens` مناسب
3. قلل conversation history
4. استخدم RAG بذكاء

---

## ✅ Checklist للتكامل الصحيح

- [ ] تنظيف الـ prompt من lone surrogates
- [ ] استخدام messages array صحيح
- [ ] timeout معقول (90-120 ثانية)
- [ ] error handling شامل
- [ ] logging مفصل للتتبع
- [ ] cost tracking للمراقبة
- [ ] fallback لـ Gemini عند الحاجة

---

## 🎯 الخلاصة

**DeepSeek يختلف عن Gemini في:**
1. ❌ لا توجد rate limits تقليدية
2. ✅ يبطئ بدلاً من الرفض
3. ⚠️ حساس جداً لـ Unicode errors
4. 🧠 يدعم reasoning mode قوي

**للنجاح مع DeepSeek:**
- نظف الـ prompts جيداً
- استخدم error handling ذكي
- راقب التكلفة
- اختبر بشكل مستمر
