/**
 * مثال بسيط: استخدام PostgreSQL للبحث عن المنتجات
 * 
 * هذا المثال يوضح كيفية استخدام PostgreSQL في أبسط صورة
 */

require('dotenv').config();
const postgresVectorService = require('../services/postgresVectorService');

/**
 * مثال 1: البحث البسيط عن منتجات
 */
async function simpleProductSearch() {
  console.log('🔍 مثال 1: البحث البسيط\n');
  
  const searchQuery = 'حذاء';
  const companyId = 'cmgz2gs6100s7ju4lnrg9j3pp'; // استبدل بـ company_id من قاعدة بياناتك
  
  try {
    console.log(`البحث عن: "${searchQuery}"`);
    const startTime = Date.now();
    
    // البحث النصي في PostgreSQL
    const products = await postgresVectorService.fallbackTextSearch(
      searchQuery,
      companyId,
      5
    );
    
    const searchTime = Date.now() - startTime;
    console.log(`✅ وجدت ${products.length} منتج في ${searchTime}ms\n`);
    
    if (products.length > 0) {
      console.log('📦 النتائج:');
      products.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${p.price} جنيه`);
      });
    } else {
      console.log('⚠️ لم يتم العثور على منتجات');
    }
    
    return products;
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  }
}

/**
 * مثال 2: البحث في جميع الشركات
 */
async function searchAllCompanies() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 مثال 2: البحث في جميع الشركات\n');
  
  try {
    const products = await postgresVectorService.fallbackTextSearch(
      'منتج',
      null, // null = جميع الشركات
      10
    );
    
    console.log(`✅ وجدت ${products.length} منتج من جميع الشركات\n`);
    
    // تجميع حسب الشركة
    const byCompany = {};
    products.forEach(p => {
      if (!byCompany[p.companyId]) {
        byCompany[p.companyId] = [];
      }
      byCompany[p.companyId].push(p);
    });
    
    console.log('📊 توزيع المنتجات:');
    Object.keys(byCompany).forEach(companyId => {
      console.log(`   ${companyId}: ${byCompany[companyId].length} منتج`);
    });
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

/**
 * مثال 3: الحصول على إحصائيات
 */
async function getStatistics() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 مثال 3: الإحصائيات\n');
  
  try {
    const stats = await postgresVectorService.getStats();
    
    console.log('📈 إحصائيات PostgreSQL:');
    console.log(`   إجمالي المنتجات: ${stats.total_products}`);
    console.log(`   منتجات مع embeddings: ${stats.products_with_embeddings}`);
    console.log(`   منتجات نشطة: ${stats.active_products}`);
    
    const embeddingPercentage = (stats.products_with_embeddings / stats.total_products * 100).toFixed(1);
    console.log(`   نسبة المنتجات مع embeddings: ${embeddingPercentage}%`);
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

/**
 * مثال 4: كود التكامل مع WhatsApp/AI Controller
 */
function showIntegrationExample() {
  console.log('\n' + '='.repeat(60));
  console.log('💡 مثال 4: كود التكامل\n');
  
  console.log('استخدم هذا الكود في whatsappController.js أو aiController.js:\n');
  console.log(`
const postgresVectorService = require('./services/postgresVectorService');

async function handleCustomerMessage(message, companyId) {
  try {
    // البحث في PostgreSQL
    const products = await postgresVectorService.fallbackTextSearch(
      message,
      companyId,
      5
    );
    
    // بناء رد
    if (products.length > 0) {
      const response = 'المنتجات المتاحة:\\n' + 
        products.map((p, i) => 
          \`\${i + 1}. \${p.name} - \${p.price} جنيه\`
        ).join('\\n');
      
      return response;
    } else {
      return 'عذراً، لم أجد منتجات مطابقة';
    }
    
  } catch (error) {
    console.error('Error:', error);
    return 'عذراً، حدث خطأ';
  }
}
  `);
  
  console.log('✅ هذا الكود جاهز للاستخدام مباشرة!');
}

/**
 * تشغيل جميع الأمثلة
 */
async function runAllExamples() {
  console.log('🚀 أمثلة بسيطة لاستخدام PostgreSQL\n');
  console.log('='.repeat(60));
  
  try {
    // مثال 1
    await simpleProductSearch();
    
    // مثال 2
    await searchAllCompanies();
    
    // مثال 3
    await getStatistics();
    
    // مثال 4
    showIntegrationExample();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ اكتملت جميع الأمثلة!');
    console.log('\n📚 للمزيد:');
    console.log('   - docs/POSTGRESQL_MIGRATION_GUIDE_AR.md');
    console.log('   - docs/POSTGRES_SUCCESS_NEXT_STEPS_AR.md');
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
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
  simpleProductSearch,
  searchAllCompanies,
  getStatistics
};
