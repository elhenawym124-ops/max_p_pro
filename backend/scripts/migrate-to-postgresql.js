/**
 * سكريبت نقل البيانات من MySQL إلى PostgreSQL
 * 
 * الاستخدام:
 * 1. تأكد من إعداد PostgreSQL وتثبيت pgvector
 * 2. أضف POSTGRES_URL في ملف .env
 * 3. شغل: node scripts/migrate-to-postgresql.js
 */

// ✅ تحميل متغيرات البيئة من ملف .env
require('dotenv').config();

const { PrismaClient: MySQLClient } = require('@prisma/client');
const { Client: PostgresClient } = require('pg');

// ✅ الخطوة 1: إعداد الاتصالات
const mysqlClient = new MySQLClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // MySQL
    }
  }
});

// التحقق من وجود POSTGRES_URL
if (!process.env.POSTGRES_URL) {
  console.error('❌ POSTGRES_URL غير موجود في ملف .env');
  console.log('أضف السطر التالي في .env:');
  console.log('POSTGRES_URL="postgresql://appuser:your_password@localhost:5432/maxp"');
  process.exit(1);
}

const postgresClient = new PostgresClient({
  connectionString: process.env.POSTGRES_URL,
  ssl: false // تعطيل SSL للاتصال المحلي
});

/**
 * إنشاء جدول المنتجات في PostgreSQL مع pgvector
 */
async function createPostgresSchema() {
  console.log('📝 إنشاء Schema في PostgreSQL...');
  
  await postgresClient.query(`
    -- تفعيل pgvector extension
    CREATE EXTENSION IF NOT EXISTS vector;
    
    -- جدول المنتجات
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(500) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      stock INTEGER DEFAULT 0,
      company_id VARCHAR(255) NOT NULL,
      category_id VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      
      -- حقل الـ embedding كـ vector
      embedding vector(768), -- Google Gemini embedding size
      embedding_generated_at TIMESTAMP,
      
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      
      -- Indexes للبحث السريع
      CONSTRAINT idx_company_active UNIQUE (company_id, id)
    );
    
    -- Index على الـ embedding للبحث السريع
    CREATE INDEX IF NOT EXISTS idx_product_embedding 
    ON products USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
    
    -- Indexes إضافية
    CREATE INDEX IF NOT EXISTS idx_product_company ON products(company_id);
    CREATE INDEX IF NOT EXISTS idx_product_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_product_name ON products(name);
  `);
  
  console.log('✅ تم إنشاء Schema بنجاح');
}

/**
 * نقل المنتجات من MySQL إلى PostgreSQL
 */
async function migrateProducts(batchSize = 100) {
  console.log('🔄 بدء نقل المنتجات...');
  
  // الحصول على إجمالي عدد المنتجات
  const totalCount = await mysqlClient.product.count();
  console.log(`📊 إجمالي المنتجات: ${totalCount}`);
  
  let migratedCount = 0;
  let skip = 0;
  
  while (skip < totalCount) {
    // جلب دفعة من المنتجات
    const products = await mysqlClient.product.findMany({
      skip: skip,
      take: batchSize,
      include: {
        category: true
      }
    });
    
    console.log(`📦 معالجة دفعة ${skip + 1} - ${skip + products.length}...`);
    
    // نقل كل منتج
    for (const product of products) {
      try {
        // تحويل embedding من JSON string إلى array
        let embeddingArray = null;
        if (product.embedding) {
          try {
            embeddingArray = JSON.parse(product.embedding);
          } catch (e) {
            console.warn(`⚠️ فشل تحليل embedding للمنتج ${product.id}`);
          }
        }
        
        // إدراج في PostgreSQL
        await postgresClient.query(`
          INSERT INTO products (
            id, name, description, price, stock, 
            company_id, category_id, is_active,
            embedding, embedding_generated_at,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            stock = EXCLUDED.stock,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
        `, [
          product.id,
          product.name,
          product.description,
          product.price.toString(),
          product.stock,
          product.companyId,
          product.categoryId,
          product.isActive,
          embeddingArray ? `[${embeddingArray.join(',')}]` : null,
          product.embeddingGeneratedAt,
          product.createdAt,
          product.updatedAt
        ]);
        
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ خطأ في نقل المنتج ${product.id}:`, error.message);
      }
    }
    
    skip += batchSize;
    console.log(`✅ تم نقل ${migratedCount} من ${totalCount} منتج`);
  }
  
  console.log(`🎉 اكتمل النقل! تم نقل ${migratedCount} منتج`);
}

/**
 * التحقق من النقل
 */
async function verifyMigration() {
  console.log('\n🔍 التحقق من النقل...');
  
  // عدد المنتجات في MySQL
  const mysqlCount = await mysqlClient.product.count();
  
  // عدد المنتجات في PostgreSQL
  const pgResult = await postgresClient.query('SELECT COUNT(*) FROM products');
  const pgCount = parseInt(pgResult.rows[0].count);
  
  console.log(`📊 MySQL: ${mysqlCount} منتج`);
  console.log(`📊 PostgreSQL: ${pgCount} منتج`);
  
  if (mysqlCount === pgCount) {
    console.log('✅ النقل ناجح! الأعداد متطابقة');
  } else {
    console.log('⚠️ تحذير: الأعداد غير متطابقة');
  }
  
  // اختبار بحث vector
  console.log('\n🧪 اختبار Vector Search...');
  const testResult = await postgresClient.query(`
    SELECT id, name, 
           CASE 
             WHEN embedding IS NOT NULL THEN 'Has embedding'
             ELSE 'No embedding'
           END as embedding_status
    FROM products
    WHERE embedding IS NOT NULL
    LIMIT 5
  `);
  
  console.log(`✅ تم العثور على ${testResult.rows.length} منتجات مع embeddings`);
}

/**
 * الدالة الرئيسية
 */
async function main() {
  try {
    console.log('🚀 بدء عملية النقل من MySQL إلى PostgreSQL\n');
    
    // الاتصال بـ PostgreSQL
    await postgresClient.connect();
    console.log('✅ تم الاتصال بـ PostgreSQL');
    
    // إنشاء Schema
    await createPostgresSchema();
    
    // نقل البيانات
    await migrateProducts(100);
    
    // التحقق
    await verifyMigration();
    
    console.log('\n✅ اكتملت عملية النقل بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في عملية النقل:', error);
    throw error;
  } finally {
    await mysqlClient.$disconnect();
    await postgresClient.end();
  }
}

// تشغيل
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main, migrateProducts, createPostgresSchema };
