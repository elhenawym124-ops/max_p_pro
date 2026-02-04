/**
 * مثال عملي كامل: استخدام RAG للرد على العملاء عن المنتجات
 * 
 * هذا المثال يوضح كيفية:
 * 1. البحث عن منتجات باستخدام RAG
 * 2. الرد على العملاء باستخدام AI
 * 3. إدارة سياق المحادثة
 */

const ragService = require('../services/ragService');
const aiAgentService = require('../services/aiAgentService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * معالج رسائل العملاء الرئيسي
 */
class CustomerChatHandler {
  constructor() {
    this.conversationMemory = new Map(); // تخزين سجل المحادثات
  }

  /**
   * معالجة رسالة من العميل
   */
  async handleMessage(customerId, companyId, message, platform = 'whatsapp') {
    try {
      console.log(`📨 رسالة جديدة من العميل ${customerId}: "${message}"`);

      // 1. الحصول على سجل المحادثة
      const conversationHistory = this.getConversationHistory(customerId);

      // 2. تحديد نية العميل
      const intent = this.detectIntent(message);
      console.log(`🎯 النية المكتشفة: ${intent}`);

      // 3. البحث عن معلومات ذات صلة باستخدام RAG
      const relevantData = await ragService.retrieveRelevantData(
        message,
        intent,
        customerId,
        companyId,
        null, // IP address (optional)
        conversationHistory
      );

      console.log(`📦 تم العثور على ${relevantData.length} منتج/معلومة ذات صلة`);

      // 4. بناء السياق للـ AI
      const context = this.buildContext(relevantData, intent);

      // 5. توليد الرد باستخدام AI
      const aiResponse = await this.generateAIResponse(
        message,
        context,
        conversationHistory,
        companyId
      );

      // 6. حفظ المحادثة
      this.saveToConversationHistory(customerId, message, aiResponse);

      // 7. إرجاع الرد
      return {
        success: true,
        response: aiResponse,
        products: relevantData.filter(d => d.type === 'product'),
        intent: intent
      };

    } catch (error) {
      console.error('❌ خطأ في معالجة الرسالة:', error);
      return {
        success: false,
        response: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
        error: error.message
      };
    }
  }

  /**
   * تحديد نية العميل من الرسالة
   */
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();

    // استفسار عن منتج
    if (lowerMessage.includes('عايز') || 
        lowerMessage.includes('محتاج') ||
        lowerMessage.includes('عندكم') ||
        lowerMessage.includes('موجود')) {
      return 'product_inquiry';
    }

    // استفسار عن السعر
    if (lowerMessage.includes('بكام') || 
        lowerMessage.includes('سعر') ||
        lowerMessage.includes('ثمن') ||
        lowerMessage.includes('كام')) {
      return 'price_inquiry';
    }

    // استفسار عن الشحن
    if (lowerMessage.includes('شحن') || 
        lowerMessage.includes('توصيل') ||
        lowerMessage.includes('ديليفري')) {
      return 'shipping_inquiry';
    }

    // حالة الطلب
    if (lowerMessage.includes('طلب') || 
        lowerMessage.includes('أوردر') ||
        lowerMessage.includes('order')) {
      return 'order_status';
    }

    // شكوى
    if (lowerMessage.includes('مشكلة') || 
        lowerMessage.includes('شكوى') ||
        lowerMessage.includes('complaint')) {
      return 'complaint';
    }

    return 'general_inquiry';
  }

  /**
   * بناء السياق من البيانات المسترجعة
   */
  buildContext(relevantData, intent) {
    if (!relevantData || relevantData.length === 0) {
      return "لا توجد معلومات متاحة حالياً.";
    }

    let context = "";

    // معالجة المنتجات
    const products = relevantData.filter(d => d.type === 'product');
    if (products.length > 0) {
      context += "المنتجات المتاحة:\n\n";
      
      products.forEach((product, index) => {
        context += `${index + 1}. **${product.name}**\n`;
        context += `   💰 السعر: ${product.price} جنيه\n`;
        
        if (product.description) {
          context += `   📝 الوصف: ${product.description.substring(0, 150)}...\n`;
        }
        
        context += `   📦 المخزون: ${product.stock > 0 ? 'متوفر' : 'غير متوفر'}\n`;
        
        // إضافة معلومات الألوان والمقاسات
        if (product.metadata?.variants?.length > 0) {
          const colors = product.metadata.variants
            .filter(v => v.type === 'color')
            .map(v => v.name);
          const sizes = product.metadata.variants
            .filter(v => v.type === 'size')
            .map(v => v.name);
          
          if (colors.length > 0) {
            context += `   🎨 الألوان المتاحة: ${colors.join('، ')}\n`;
          }
          if (sizes.length > 0) {
            context += `   📏 المقاسات المتاحة: ${sizes.join('، ')}\n`;
          }
        }
        
        // إضافة معلومات الصور
        if (product.metadata?.hasValidImages) {
          context += `   📸 يوجد ${product.metadata.imageCount} صورة\n`;
        }
        
        context += '\n';
      });
    }

    // معالجة FAQs
    const faqs = relevantData.filter(d => d.type === 'faq');
    if (faqs.length > 0) {
      context += "\n\nمعلومات إضافية:\n";
      faqs.forEach(faq => {
        context += `- ${faq.content}\n`;
      });
    }

    // معالجة السياسات
    const policies = relevantData.filter(d => d.type === 'policy');
    if (policies.length > 0) {
      context += "\n\nسياسات الشركة:\n";
      policies.forEach(policy => {
        context += `- ${policy.content}\n`;
      });
    }

    return context;
  }

  /**
   * توليد رد من AI
   */
  async generateAIResponse(message, context, conversationHistory, companyId) {
    try {
      // بناء prompt للـ AI
      const systemPrompt = `أنت مساعد مبيعات محترف. مهمتك مساعدة العملاء في اختيار المنتجات المناسبة.

تعليمات مهمة:
- كن ودوداً ومحترفاً
- استخدم المعلومات المتوفرة فقط
- إذا لم تجد المنتج، اقترح بدائل مشابهة
- اذكر السعر والمخزون بوضوح
- شجع العميل على الشراء بطريقة لطيفة

المعلومات المتاحة:
${context}`;

      // استخدام AI Agent Service
      const response = await aiAgentService.generateResponse({
        query: message,
        systemPrompt: systemPrompt,
        companyId: companyId,
        conversationHistory: conversationHistory,
        maxTokens: 500
      });

      return response.content || response;

    } catch (error) {
      console.error('❌ خطأ في توليد رد AI:', error);
      return 'عذراً، أواجه مشكلة في الرد حالياً. يمكنك التواصل مع خدمة العملاء مباشرة.';
    }
  }

  /**
   * الحصول على سجل المحادثة
   */
  getConversationHistory(customerId) {
    if (!this.conversationMemory.has(customerId)) {
      this.conversationMemory.set(customerId, []);
    }
    return this.conversationMemory.get(customerId);
  }

  /**
   * حفظ في سجل المحادثة
   */
  saveToConversationHistory(customerId, userMessage, aiResponse) {
    const history = this.getConversationHistory(customerId);
    
    // إضافة رسالة المستخدم
    history.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // إضافة رد AI
    history.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    // الاحتفاظ بآخر 20 رسالة فقط
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    this.conversationMemory.set(customerId, history);
  }

  /**
   * مسح سجل المحادثة
   */
  clearConversationHistory(customerId) {
    this.conversationMemory.delete(customerId);
  }
}

// ==================== أمثلة الاستخدام ====================

/**
 * مثال 1: رسالة بسيطة عن منتج
 */
async function example1_SimpleProductInquiry() {
  console.log('\n========== مثال 1: استفسار بسيط عن منتج ==========\n');
  
  const handler = new CustomerChatHandler();
  
  const result = await handler.handleMessage(
    'customer_123',           // معرف العميل
    'company_456',            // معرف الشركة
    'عندكم حذاء رياضي؟'      // رسالة العميل
  );
  
  console.log('\n✅ النتيجة:');
  console.log('الرد:', result.response);
  console.log('عدد المنتجات:', result.products?.length || 0);
}

/**
 * مثال 2: محادثة متعددة الرسائل
 */
async function example2_MultiTurnConversation() {
  console.log('\n========== مثال 2: محادثة متعددة الرسائل ==========\n');
  
  const handler = new CustomerChatHandler();
  const customerId = 'customer_789';
  const companyId = 'company_456';
  
  // الرسالة الأولى
  console.log('\n👤 العميل: عندكم حذاء رياضي؟');
  let result = await handler.handleMessage(customerId, companyId, 'عندكم حذاء رياضي؟');
  console.log('🤖 الرد:', result.response);
  
  // الرسالة الثانية (سياق من المحادثة السابقة)
  console.log('\n👤 العميل: بكام؟');
  result = await handler.handleMessage(customerId, companyId, 'بكام؟');
  console.log('🤖 الرد:', result.response);
  
  // الرسالة الثالثة
  console.log('\n👤 العميل: عندكم منه ألوان إيه؟');
  result = await handler.handleMessage(customerId, companyId, 'عندكم منه ألوان إيه؟');
  console.log('🤖 الرد:', result.response);
}

/**
 * مثال 3: إضافة منتج جديد وتحديث RAG
 */
async function example3_AddNewProduct() {
  console.log('\n========== مثال 3: إضافة منتج جديد ==========\n');
  
  const EmbeddingHelper = require('../services/embeddingHelper');
  const prisma = getSharedPrismaClient();
  
  const companyId = 'company_456';
  
  // 1. إضافة منتج جديد
  const newProduct = await prisma.product.create({
    data: {
      name: 'حذاء رياضي نايكي',
      description: 'حذاء رياضي مريح مناسب للجري والمشي، مصنوع من مواد عالية الجودة',
      price: 1200,
      stock: 50,
      companyId: companyId,
      isActive: true,
      categoryId: 'category_shoes'
    }
  });
  
  console.log('✅ تم إضافة المنتج:', newProduct.name);
  
  // 2. توليد embedding
  console.log('🔄 جاري توليد embedding...');
  await EmbeddingHelper.generateAndSaveProductEmbedding(
    newProduct.id,
    newProduct.name,
    newProduct.description,
    'أحذية',
    companyId
  );
  
  console.log('✅ تم توليد embedding بنجاح');
  
  // 3. إضافة إلى RAG index
  await ragService.addOrUpdateProduct(newProduct, companyId);
  console.log('✅ تم إضافة المنتج إلى RAG index');
  
  // 4. اختبار البحث
  const handler = new CustomerChatHandler();
  const result = await handler.handleMessage(
    'customer_test',
    companyId,
    'عايز حذاء نايكي'
  );
  
  console.log('\n📝 نتيجة البحث:');
  console.log('الرد:', result.response);
}

/**
 * مثال 4: تحديث منتج موجود
 */
async function example4_UpdateProduct() {
  console.log('\n========== مثال 4: تحديث منتج موجود ==========\n');
  
  const EmbeddingHelper = require('../services/embeddingHelper');
  const prisma = getSharedPrismaClient();
  
  const productId = 'product_123';
  const companyId = 'company_456';
  
  // 1. الحصول على المنتج الحالي
  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true }
  });
  
  // 2. تحديث المنتج
  const updateData = {
    name: 'حذاء رياضي نايكي - إصدار محدث',
    description: 'حذاء رياضي محدث بتقنية جديدة للراحة القصوى',
    price: 1350
  };
  
  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: updateData
  });
  
  console.log('✅ تم تحديث المنتج:', updatedProduct.name);
  
  // 3. تحديث embedding
  console.log('🔄 جاري تحديث embedding...');
  await EmbeddingHelper.updateEmbeddingIfNeeded(
    productId,
    updateData,
    currentProduct,
    companyId
  );
  
  console.log('✅ تم تحديث embedding');
  
  // 4. تحديث في RAG index
  await ragService.addOrUpdateProduct(updatedProduct, companyId);
  console.log('✅ تم تحديث RAG index');
}

/**
 * مثال 5: استخدام في WhatsApp Controller
 */
async function example5_WhatsAppIntegration() {
  console.log('\n========== مثال 5: التكامل مع WhatsApp ==========\n');
  
  // هذا مثال على كيفية استخدام النظام في WhatsApp Controller
  
  const handler = new CustomerChatHandler();
  
  // محاكاة رسالة من WhatsApp
  const whatsappMessage = {
    from: '201234567890',
    body: 'عايز تيشيرت قطن',
    companyId: 'company_456'
  };
  
  // معالجة الرسالة
  const result = await handler.handleMessage(
    whatsappMessage.from,
    whatsappMessage.companyId,
    whatsappMessage.body,
    'whatsapp'
  );
  
  // إرسال الرد عبر WhatsApp
  console.log('\n📱 إرسال رد WhatsApp:');
  console.log('إلى:', whatsappMessage.from);
  console.log('الرسالة:', result.response);
  
  // إرسال صور المنتجات (إذا وجدت)
  if (result.products && result.products.length > 0) {
    result.products.forEach(product => {
      if (product.metadata?.hasValidImages) {
        console.log(`📸 إرسال صورة المنتج: ${product.name}`);
        // هنا يتم إرسال الصورة عبر WhatsApp API
      }
    });
  }
}

// ==================== تشغيل الأمثلة ====================

async function runAllExamples() {
  try {
    await example1_SimpleProductInquiry();
    await example2_MultiTurnConversation();
    // await example3_AddNewProduct(); // تعليق لتجنب إضافة بيانات تجريبية
    // await example4_UpdateProduct();  // تعليق لتجنب تعديل بيانات حقيقية
    await example5_WhatsAppIntegration();
    
    console.log('\n✅ تم تشغيل جميع الأمثلة بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في تشغيل الأمثلة:', error);
  }
}

// تصدير للاستخدام
module.exports = {
  CustomerChatHandler,
  example1_SimpleProductInquiry,
  example2_MultiTurnConversation,
  example3_AddNewProduct,
  example4_UpdateProduct,
  example5_WhatsAppIntegration,
  runAllExamples
};

// تشغيل إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runAllExamples();
}
