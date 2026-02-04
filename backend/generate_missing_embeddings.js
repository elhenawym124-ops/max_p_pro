#!/usr/bin/env node

/**
 * سكريبت لتوليد embeddings للمنتجات المفقودة
 * 
 * هذا السكريبت يفحص المنتجات في PostgreSQL ويولد embeddings للمنتجات اللي مش عندها
 */

const postgresVectorService = require('./services/postgresVectorService');
const { Client } = require('pg');

class EmbeddingGenerator {
  constructor() {
    this.pgClient = null;
    this.processed = 0;
    this.success = 0;
    this.failed = 0;
  }

  async initialize() {
    // التحقق من إعدادات PostgreSQL
    // استخدام نفس الطريقة اللي بيستخدمها السكريبت الأساسي
    const postgresUrl = "postgresql://appuser:your_password@localhost:5432/maxp"

    // الاتصال بـ PostgreSQL
    this.pgClient = new Client({
      connectionString: postgresUrl,
      ssl: false,
      connectionTimeoutMillis: 10000
    });

    try {
      await this.pgClient.connect();
      console.log('✅ متصل بـ PostgreSQL');
      
      // اختبار الاتصال
      await this.pgClient.query('SELECT 1');
      console.log('✅ تم التحقق من الاتصال');
      
    } catch (error) {
      console.error('❌ فشل الاتصال بـ PostgreSQL:', error.message);
      throw error;
    }
  }

  async generateMissingEmbeddings() {
    console.log('🔍 البحث عن المنتجات بدون embeddings...\n');

    try {
      await this.initialize();

      // جلب المنتجات بدون embeddings
      const result = await this.pgClient.query(`
        SELECT id, name, description, company_id
        FROM products 
        WHERE embedding IS NULL 
        AND is_active = true
        ORDER BY id
        LIMIT 50
      `);

      const products = result.rows;
      console.log(`📊 وجدت ${products.length} منتج بدون embeddings`);

      if (products.length === 0) {
        console.log('✅ جميع المنتجات لديها embeddings!');
        return;
      }

      // معالجة كل منتج
      for (const product of products) {
        await this.processProduct(product);
        
        // استراحة قصيرة بين المنتجات
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('\n' + '='.repeat(50));
      console.log('📋 ملخص العملية:');
      console.log(`   📊 المعالجة: ${this.processed} منتج`);
      console.log(`   ✅ نجح: ${this.success} منتج`);
      console.log(`   ❌ فشل: ${this.failed} منتج`);
      console.log('='.repeat(50));

    } catch (error) {
      console.error('❌ خطأ في العملية:', error.message);
    } finally {
      if (this.pgClient) {
        await this.pgClient.end();
      }
    }
  }

  async processProduct(product) {
    this.processed++;
    
    try {
      console.log(`🔄 [${this.processed}] معالجة: ${product.name}`);

      // تحضير النص للـ embedding
      const embeddingText = `${product.name} ${product.description || ''}`.trim();
      
      // توليد embedding باستخدام hash-based method (مستقر وسريع)
      const crypto = require('crypto');
      const cleanText = embeddingText.toLowerCase().trim();
      const hash = crypto.createHash('sha256').update(cleanText).digest();
      
      const embedding = [];
      for (let i = 0; i < 768; i++) {
        const byteIndex = i % hash.length;
        const value = (hash[byteIndex] - 128) / 128;
        embedding.push(value);
      }
      console.log(`   🔧 تم توليد hash-based embedding (${embedding.length} dimensions)`);

      if (!embedding || !Array.isArray(embedding) || embedding.length !== 768) {
        throw new Error(`embedding غير صالح: ${embedding ? embedding.length : 'null'} dimensions`);
      }

      // تحويل embedding لتنسيق PostgreSQL vector
      const vectorString = `[${embedding.join(',')}]`;
      
      // حفظ embedding في قاعدة البيانات
      await this.pgClient.query(`
        UPDATE products 
        SET 
          embedding = $1::vector,
          embedding_generated_at = NOW(), 
          updated_at = NOW()
        WHERE id = $2
      `, [vectorString, product.id]);

      this.success++;
      console.log(`   ✅ تم حفظ embedding (${embedding.length} dimensions)`);

    } catch (error) {
      this.failed++;
      console.error(`   ❌ فشل: ${error.message}`);
      
      // تسجيل تفاصيل أكثر للتشخيص
      if (error.stack) {
        console.error(`   📋 تفاصيل الخطأ: ${error.stack.split('\n')[0]}`);
      }
    }
  }
}

// تشغيل السكريبت
if (require.main === module) {
  const generator = new EmbeddingGenerator();
  generator.generateMissingEmbeddings().catch(error => {
    console.error('💥 فشل السكريبت:', error);
    process.exit(1);
  });
}

module.exports = EmbeddingGenerator;
