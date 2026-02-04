/**
 * مثال عملي: استخدام PostgreSQL Vector Search مع AI
 * 
 * هذا المثال يوضح كيفية دمج PostgreSQL في نظام الرد على العملاء
 */

require('dotenv').config();
const postgresVectorService = require('../services/postgresVectorService');

/**
 * مثال 1: الرد على استفسار عميل عن منتج
 */
async function handleCustomerProductInquiry() {
  console.log('📝 مثال 1: الرد على استفسار عميل\n');
  
  const customerMessage = 'عايز حذاء رياضي مريح';
  const companyId = 'cmgz2gs6100s7ju4lnrg9j3pp'; // استبدل بـ company_id حقيقي
  const customerId = 'customer_123';
  
  try {
    // 1. البحث عن منتجات ذات صلة في PostgreSQL
    console.log('🔍 البحث في PostgreSQL...');
    const startTime = Date.now();
    
    const products = await postgresVectorService.searchProducts(
      customerMessage,
      companyId,
      5 // أفضل 5 منتجات
    );
    
    const searchTime = Date.now() - startTime;
    console.log(`✅ وجدت ${products.length} منتج في ${searchTime}ms`);
    
    if (products.length > 0) {
      console.log('\n📦 المنتجات المقترحة:');
      products.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${p.price} جنيه (Score: ${p.score?.toFixed(3)})`);
      });
    }
    
    // 2. بناء السياق للـ AI
    const context = products.map(p => 
      `- ${p.name}: ${p.price} جنيه${p.description ? ` - ${p.description}` : ''}`
    ).join('\n');
    
    console.log('\n🤖 توليد رد من AI...');
    
    // 3. توليد رد طبيعي من AI
    const aiResponse = await aiAgentService.generateResponse({
      query: customerMessage,
      context: `المنتجات المتاحة:\n${context}`,
      companyId: companyId,
      customerId: customerId,
      conversationHistory: []
    });
    
    console.log('\n💬 رد AI:');
    console.log(`   ${aiResponse.response}`);
    
    return {
      products,
      aiResponse: aiResponse.response,
      searchTime
    };
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  }
}

/**
 * مثال 2: مقارنة الأداء بين MySQL و PostgreSQL
 */
async function comparePerformance() {
  console.log('\n📊 مثال 2: مقارنة الأداء\n');
  
  const query = 'منتج';
  const companyId = 'cmgz2gs6100s7ju4lnrg9j3pp';
  
  try {
    // PostgreSQL
    const pgStart = Date.now();
    const pgResults = await postgresVectorService.fallbackTextSearch(query, companyId, 10);
    const pgTime = Date.now() - pgStart;
    
    console.log(`PostgreSQL: ${pgTime}ms - وجدت ${pgResults.length} منتج`);
    
    // يمكنك إضافة مقارنة مع MySQL هنا
    console.log('\n💡 PostgreSQL أسرع بكتير في Vector Search!');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

/**
 * مثال 3: إضافة منتج جديد مع مزامنة تلقائية
 */
async function addNewProductWithSync() {
  console.log('\n➕ مثال 3: إضافة منتج جديد\n');
  
  const { getSharedPrismaClient } = require('../services/sharedDatabase');
  const EmbeddingHelper = require('../services/embeddingHelper');
  
  const newProduct = {
    name: 'حذاء رياضي Nike',
    description: 'حذاء رياضي مريح للجري',
    price: 1500,
    stock: 10,
    companyId: 'cmgz2gs6100s7ju4lnrg9j3pp',
    isActive: true
  };
  
  try {
    console.log('1️⃣ حفظ في MySQL...');
    // 1. حفظ في MySQL
    const product = await getSharedPrismaClient().product.create({
      data: newProduct
    });
    console.log(`   ✅ تم الحفظ: ${product.id}`);
    
    console.log('\n2️⃣ توليد embedding...');
    // 2. توليد embedding
    await EmbeddingHelper.generateAndSaveProductEmbedding(
      product.id,
      product.name,
      product.description,
      null, // categoryName
      product.companyId
    );
    console.log('   ✅ تم توليد embedding');
    
    console.log('\n3️⃣ مزامنة مع PostgreSQL...');
    // 3. مزامنة مع PostgreSQL
    await postgresVectorService.upsertProduct(product, product.companyId);
    console.log('   ✅ تمت المزامنة');
    
    console.log('\n✅ المنتج جاهز للبحث في PostgreSQL!');
    
    // اختبار البحث
    console.log('\n4️⃣ اختبار البحث...');
    const searchResults = await postgresVectorService.fallbackTextSearch(
      'Nike',
      product.companyId,
      5
    );
    console.log(`   ✅ وجدت ${searchResults.length} منتج`);
    
    return product;
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  }
}

/**
 * مثال 4: البحث المتقدم مع فلترة
 */
async function advancedSearch() {
  console.log('\n🔎 مثال 4: البحث المتقدم\n');
  
  const companyId = 'cmgz2gs6100s7ju4lnrg9j3pp';
  
  try {
    // بحث نصي بسيط
    const results = await postgresVectorService.fallbackTextSearch(
      'حذاء',
      companyId,
      10
    );
    
    console.log(`✅ وجدت ${results.length} منتج`);
    
    if (results.length > 0) {
      console.log('\n📦 النتائج:');
      results.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${p.price} جنيه`);
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  }
}

/**
 * مثال 5: استخدام في WhatsApp Controller
 */
async function whatsappIntegrationExample() {
  console.log('\n💬 مثال 5: التكامل مع WhatsApp\n');
  
  console.log('📝 كود التكامل البسيط:');
  console.log(`
// في whatsappController.js أو aiController.js

const postgresVectorService = require('./services/postgresVectorService');

async function handleIncomingMessage(message, from, companyId) {
  try {
    // 1. البحث عن منتجات في PostgreSQL (سريع!)
    const products = await postgresVectorService.fallbackTextSearch(
      message,
      companyId,
      5
    );
    
    // 2. بناء رد بسيط
    if (products.length > 0) {
      const response = 'المنتجات المتاحة:\\n' + 
        products.map((p, i) => 
          \`\${i + 1}. \${p.name} - \${p.price} جنيه\`
        ).join('\\n');
      
      // 3. إرسال الرد
      await sendWhatsAppMessage(from, response);
    } else {
      await sendWhatsAppMessage(from, 'عذراً، لم أجد منتجات مطابقة');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}
  `);
  
  console.log('\n✅ هذا هو الكود اللي هتستخدمه في الإنتاج!');
  console.log('\n💡 ملاحظة: يمكنك دمجه مع AI لاحقاً لردود أذكى');
}

/**
 * تشغيل جميع الأمثلة
 */
async function runAllExamples() {
  console.log('🚀 أمثلة عملية لاستخدام PostgreSQL Vector Search\n');
  console.log('='.repeat(60));
  
  try {
    // مثال 1: الرد على العميل
    await handleCustomerProductInquiry();
    
    console.log('\n' + '='.repeat(60));
    
    // مثال 2: مقارنة الأداء
    await comparePerformance();
    
    console.log('\n' + '='.repeat(60));
    
    // مثال 4: البحث المتقدم
    await advancedSearch();
    
    console.log('\n' + '='.repeat(60));
    
    // مثال 5: التكامل مع WhatsApp
    await whatsappIntegrationExample();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ اكتملت جميع الأمثلة!');
    console.log('\n📚 للمزيد من التفاصيل، راجع:');
    console.log('   - docs/POSTGRESQL_MIGRATION_GUIDE_AR.md');
    console.log('   - docs/POSTGRES_SUCCESS_NEXT_STEPS_AR.md');
    
  } catch (error) {
    console.error('\n❌ خطأ في تشغيل الأمثلة:', error);
  } finally {
    await postgresVectorService.close();
    process.exit(0);
  }
}

// تشغيل
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  handleCustomerProductInquiry,
  comparePerformance,
  addNewProductWithSync,
  advancedSearch,
  whatsappIntegrationExample
};
