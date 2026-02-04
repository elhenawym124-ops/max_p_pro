/**
 * استخراج أسئلة من بيانات الشركة (منتجات، سياسات، إلخ)
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const fs = require('fs');
const path = require('path');

const COMPANY_ID = 'cmem8ayyr004cufakqkcsyn97'; // شركة التسويق

class CompanyQuestionGenerator {
  constructor(companyId) {
    this.companyId = companyId;
    this.prisma = getSharedPrismaClient();
    this.questions = [];
    this.questionId = 1;
  }

  /**
   * استخراج أسئلة من المنتجات
   */
  async generateProductQuestions() {
    const products = await this.prisma.product.findMany({
      where: {
        companyId: this.companyId,
        isActive: true
      },
      take: 20 // أول 20 منتج
    });

    if (products.length === 0) {
      console.log('⚠️  لا توجد منتجات في الشركة');
      return;
    }

    console.log(`✅ تم العثور على ${products.length} منتج`);

    for (const product of products) {
      // سؤال عن المنتج
      this.questions.push({
        id: this.questionId++,
        question: `عندك ${product.name}؟`,
        expectedIntent: 'product_inquiry',
        context: null,
        expectedResponse: `عرض معلومات عن ${product.name}`,
        difficulty: 'easy',
        category: 'product_inquiry',
        basedOn: `product:${product.id}`
      });

      // سؤال عن السعر
      if (product.price) {
        this.questions.push({
          id: this.questionId++,
          question: `كام سعر ${product.name}؟`,
          expectedIntent: 'price_inquiry',
          context: null,
          expectedResponse: `عرض سعر ${product.name}`,
          difficulty: 'easy',
          category: 'price_inquiry',
          basedOn: `product:${product.id}`
        });
      }

      // سؤال عن الصور
      if (product.images) {
        this.questions.push({
          id: this.questionId++,
          question: `ممكن صور ${product.name}؟`,
          expectedIntent: 'product_inquiry',
          context: null,
          expectedResponse: `عرض صور ${product.name}`,
          difficulty: 'easy',
          category: 'product_inquiry',
          basedOn: `product:${product.id}`
        });
      }

      // سؤال عن المقاسات (إذا كان هناك variants)
      const variants = await this.prisma.productVariant.findMany({
        where: { productId: product.id },
        take: 5
      });

      if (variants.length > 0) {
        this.questions.push({
          id: this.questionId++,
          question: `عندك ${product.name} في مقاس ${variants[0].size || 'كبير'}؟`,
          expectedIntent: 'product_inquiry',
          context: null,
          expectedResponse: `التحقق من توفر المقاس`,
          difficulty: 'medium',
          category: 'product_inquiry',
          basedOn: `product:${product.id},variant:${variants[0].id}`
        });
      }
    }
  }

  /**
   * استخراج أسئلة من الفئات
   */
  async generateCategoryQuestions() {
    const categories = await this.prisma.category.findMany({
      where: {
        companyId: this.companyId
      },
      take: 10
    });

    if (categories.length === 0) {
      return;
    }

    console.log(`✅ تم العثور على ${categories.length} فئة`);

    for (const category of categories) {
      this.questions.push({
        id: this.questionId++,
        question: `عندك إيه في ${category.name}؟`,
        expectedIntent: 'product_inquiry',
        context: null,
        expectedResponse: `عرض منتجات فئة ${category.name}`,
        difficulty: 'medium',
        category: 'product_inquiry',
        basedOn: `category:${category.id}`
      });
    }
  }

  /**
   * استخراج أسئلة عامة بناءً على بيانات الشركة
   */
  async generateGeneralQuestions() {
    const company = await this.prisma.company.findUnique({
      where: { id: this.companyId }
    });

    if (!company) return;

    // أسئلة التحية
    this.questions.push({
      id: this.questionId++,
      question: 'السلام عليكم',
      expectedIntent: 'greeting',
      context: null,
      expectedResponse: 'رد ترحيبي',
      difficulty: 'easy',
      category: 'greeting',
      basedOn: 'company:general'
    });

    // سؤال عن الشحن
    this.questions.push({
      id: this.questionId++,
      question: 'الشحن كام؟',
      expectedIntent: 'shipping_inquiry',
      context: null,
      expectedResponse: 'معلومات عن الشحن',
      difficulty: 'easy',
      category: 'shipping_inquiry',
      basedOn: 'company:general'
    });

    // سؤال عن طريقة الدفع
    this.questions.push({
      id: this.questionId++,
      question: 'ازاي أدفع؟',
      expectedIntent: 'general_inquiry',
      context: null,
      expectedResponse: 'معلومات عن طرق الدفع',
      difficulty: 'easy',
      category: 'support_inquiry',
      basedOn: 'company:general'
    });
  }

  /**
   * توليد جميع الأسئلة
   */
  async generateAllQuestions() {
    console.log(`\n🔍 استخراج أسئلة من بيانات الشركة...\n`);
    console.log(`🏢 Company ID: ${this.companyId}\n`);

    await this.generateProductQuestions();
    await this.generateCategoryQuestions();
    await this.generateGeneralQuestions();

    console.log(`\n✅ تم توليد ${this.questions.length} سؤال\n`);

    return this.questions;
  }

  /**
   * حفظ الأسئلة في ملف JSON
   */
  saveQuestions() {
    const output = {
      metadata: {
        version: '2.0',
        createdAt: new Date().toISOString(),
        description: `أسئلة مستخرجة من بيانات شركة ${this.companyId}`,
        totalQuestions: this.questions.length,
        companyId: this.companyId
      },
      questions: this.questions,
      statistics: {
        byCategory: this.getStatisticsByCategory(),
        byDifficulty: this.getStatisticsByDifficulty()
      }
    };

    const filePath = path.join(__dirname, `company-questions-${this.companyId}-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`📄 تم حفظ الأسئلة في: ${filePath}\n`);

    return filePath;
  }

  getStatisticsByCategory() {
    const stats = {};
    this.questions.forEach(q => {
      stats[q.category] = (stats[q.category] || 0) + 1;
    });
    return stats;
  }

  getStatisticsByDifficulty() {
    const stats = {};
    this.questions.forEach(q => {
      stats[q.difficulty] = (stats[q.difficulty] || 0) + 1;
    });
    return stats;
  }
}

// تشغيل
async function main() {
  try {
    const generator = new CompanyQuestionGenerator(COMPANY_ID);
    await generator.generateAllQuestions();
    const filePath = generator.saveQuestions();

    console.log('📊 الإحصائيات:');
    console.log(JSON.stringify(generator.getStatisticsByCategory(), null, 2));
    console.log('\n✅ اكتمل!\n');

  } catch (error) {
    console.error('❌ خطأ:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

