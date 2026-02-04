/**
 * خدمة Vector Search باستخدام PostgreSQL + pgvector
 * 
 * هذه الخدمة تستخدم PostgreSQL للبحث عن المنتجات بدلاً من MySQL
 * أسرع وأكثر كفاءة للـ Vector Search
 */

let Client;
try {
  ({ Client } = require('pg'));
} catch (e) {
  Client = null;
}
const { GoogleGenerativeAI } = require('@google/generative-ai');

class PostgresVectorService {
  constructor() {
    this.pgClient = null;
    this.genAI = null;
    this.embeddingModel = null;
    this.isInitialized = false;
    this.aiProvider = null;
  }

  /**
   * تهيئة الاتصال بـ PostgreSQL
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      if (!Client) {
        throw new Error('pg module غير مثبت');
      }

      // التحقق من وجود POSTGRES_URL
      if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL غير موجود في ملف .env');
      }

      // الاتصال بـ PostgreSQL
      this.pgClient = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: false // تعطيل SSL للاتصال المحلي
      });

      await this.pgClient.connect();
      console.log('✅ [PG-VECTOR] تم الاتصال بـ PostgreSQL');

      // التحقق من وجود pgvector (اختياري الآن)
      const result = await this.pgClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as has_vector
      `);

      this.hasVectorExtension = result.rows[0].has_vector;

      if (!this.hasVectorExtension) {
        console.log('ℹ️ [PG-VECTOR] pgvector غير موجود، استخدام الدالة المخصصة');
      }

      this.isInitialized = true;
      console.log('✅ [PG-VECTOR] تم التهيئة بنجاح');

    } catch (error) {
      console.error('❌ [PG-VECTOR] فشل الاتصال:', error.message);
      throw error;
    }
  }

  /**
   * تهيئة AI للـ embeddings (Gemini فقط)
   */
  async initializeAI(companyId) {
    if (this.genAI || this.aiProvider) return;

    try {
      // استخدام مفتاح Gemini الجديد مباشرة
      try {
        this.genAI = new GoogleGenerativeAI('AIzaSyA12XHm7fU9EEbCo_aW-iNVbtPKIqLXs74');
        this.embeddingModel = this.genAI.getGenerativeModel({
          model: "gemini-embedding-001"
        });
        this.aiProvider = 'GEMINI-DIRECT';
        console.log('✅ [PG-VECTOR] تم تهيئة Gemini المباشر للـ embeddings');
        return;
      } catch (error) {
        console.warn('⚠️ [PG-VECTOR] فشل تهيئة Gemini المباشر:', error.message);
      }

      // إذا Gemini فشل، استخدم hash-based embedding
      console.warn('⚠️ [PG-VECTOR] استخدام hash-based embedding كـ fallback');
      this.aiProvider = 'HASH-BASED';
      return;

    } catch (error) {
      console.error('❌ [PG-VECTOR] فشل تهيئة AI:', error.message);
    }
  }

  /**
   * توليد embedding للنص (Gemini أو Hash-based)
   */
  async generateEmbedding(text, companyId) {
    await this.initializeAI(companyId);

    if (!this.aiProvider) {
      console.error('❌ [PG-VECTOR] لا يوجد مزود AI متاح');
      return null;
    }

    try {
      if (this.aiProvider === 'GEMINI-DIRECT' && this.embeddingModel) {
        const result = await this.embeddingModel.embedContent({
          content: { parts: [{ text }] },
          outputDimensionality: 768
        });
        return result.embedding.values;
      }
      
      if (this.aiProvider === 'HASH-BASED') {
        return this.generateHashBasedEmbedding(text);
      }

      throw new Error(`مزود AI غير مدعوم: ${this.aiProvider}`);

    } catch (error) {
      console.error('❌ [PG-VECTOR] فشل توليد embedding:', error.message);
      // استخدام hash-based كـ fallback
      return this.generateHashBasedEmbedding(text);
    }
  }

  /**
   * توليد embedding بسيط باستخدام hash (fallback)
   */
  generateHashBasedEmbedding(text) {
    const crypto = require('crypto');
    
    // تنظيف النص
    const cleanText = text.toLowerCase().trim();
    
    // توليد hash
    const hash = crypto.createHash('sha256').update(cleanText).digest();
    
    // تحويل hash لـ embedding 768 dimension
    const embedding = [];
    for (let i = 0; i < 768; i++) {
      // استخدام hash bytes لتوليد قيم بين -1 و 1
      const byteIndex = i % hash.length;
      const value = (hash[byteIndex] - 128) / 128; // تحويل 0-255 إلى -1 إلى 1
      embedding.push(value);
    }
    
    console.log(`✅ [PG-VECTOR] تم توليد hash-based embedding: ${embedding.length} dimensions`);
    return embedding;
  }

  /**
   * البحث عن منتجات باستخدام Vector Search
   */
  async searchProducts(query, companyId, limit = 10) {
    const startTime = Date.now();

    try {
      await this.initialize();

      // 1. توليد embedding للاستعلام
      console.log(`🔍 [PG-VECTOR] البحث عن: "${query}"`);
      const queryEmbedding = await this.generateEmbedding(query, companyId);

      if (!queryEmbedding) {
        console.warn('⚠️ [PG-VECTOR] فشل توليد embedding، استخدام بحث نصي');
        return await this.fallbackTextSearch(query, companyId, limit);
      }

      // 3. البحث باستخدام pgvector أو الدالة المخصصة
      let result;
      if (this.hasVectorExtension) {
        const embeddingStr = `[${queryEmbedding.join(',')}]`;
        result = await this.pgClient.query(`
          SELECT 
            id, name, description, price, stock,
            company_id, category_id, is_active,
            (1 - (embedding <=> $1::vector)) as similarity_score
          FROM products
          WHERE 
            company_id = $2 
            AND is_active = true
            AND embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector
          LIMIT $3
        `, [embeddingStr, companyId, limit]);
      } else {
        // استخدام الدالة المخصصة
        result = await this.pgClient.query(`
          SELECT 
            id, name, description, price, stock,
            company_id, category_id, is_active,
            cosine_similarity(embedding, $1::float8[]) as similarity_score
          FROM products
          WHERE 
            company_id = $2 
            AND is_active = true
            AND embedding IS NOT NULL
          ORDER BY similarity_score DESC
          LIMIT $3
        `, [queryEmbedding, companyId, limit]);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [PG-VECTOR] وجدت ${result.rows.length} منتج في ${duration}ms`);

      // 4. تحويل النتائج إلى صيغة موحدة
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price),
        stock: row.stock,
        companyId: row.company_id,
        categoryId: row.category_id,
        isActive: row.is_active,
        score: parseFloat(row.similarity_score),
        type: 'product',
        source: 'postgres_vector'
      }));

    } catch (error) {
      console.error('❌ [PG-VECTOR] فشل البحث:', error.message);

      // Fallback إلى بحث نصي
      return await this.fallbackTextSearch(query, companyId, limit);
    }
  }

  /**
   * بحث نصي احتياطي (في حالة فشل Vector Search)
   */
  async fallbackTextSearch(query, companyId, limit = 10) {
    try {
      // تهيئة تلقائية إذا لم يكن متصل
      await this.initialize();

      console.log('🔄 [PG-VECTOR] استخدام البحث النصي الاحتياطي');

      const result = await this.pgClient.query(`
        SELECT 
          id, name, description, price, stock,
          company_id, category_id, is_active,
          0.5 as similarity_score
        FROM products
        WHERE 
          company_id = $1 
          AND is_active = true
          AND (
            name ILIKE $2 
            OR description ILIKE $2
          )
        ORDER BY 
          CASE 
            WHEN name ILIKE $2 THEN 1 
            ELSE 2 
          END,
          name
        LIMIT $3
      `, [companyId, `%${query}%`, limit]);

      console.log(`✅ [PG-VECTOR] البحث النصي وجد ${result.rows.length} منتج`);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price),
        stock: row.stock,
        companyId: row.company_id,
        categoryId: row.category_id,
        isActive: row.is_active,
        score: parseFloat(row.similarity_score),
        type: 'product',
        source: 'postgres_text'
      }));

    } catch (error) {
      console.error('❌ [PG-VECTOR] فشل البحث النصي:', error.message);
      return [];
    }
  }
}

module.exports = new PostgresVectorService();
