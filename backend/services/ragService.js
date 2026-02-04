const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ragLogger, ragCache, ragAnalytics, ragRateLimiter, ragVariantSearch, ragDataLoader } = require('./rag');
const EmbeddingHelper = require('./embeddingHelper');
const postgresVectorService = require('./postgresVectorService');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class TraceManager {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async startTrace(companyId, query, metadata = {}) {
    try {
      if (!this.prisma) return null;
      return await this.prisma.aiTrace.create({
        data: {
          companyId,
          query,
          metadata: JSON.stringify(metadata),
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('[TraceManager] Start failed:', error);
      return null;
    }
  }

  async addStep(traceId, stepType, input, output, latencyMs, metadata = {}) {
    try {
      if (!this.prisma || !traceId) return;
      await this.prisma.aiTraceStep.create({
        data: {
          traceId,
          stepType,
          input: typeof input === 'string' ? input : JSON.stringify(input),
          output: typeof output === 'string' ? output : JSON.stringify(output),
          latencyMs,
          metadata: JSON.stringify(metadata),
          order: Date.now() // Approximate order
        }
      });
    } catch (error) {
      console.error('[TraceManager] Add Step failed:', error);
    }
  }

  async completeTrace(traceId, result, score = null) {
    try {
      if (!this.prisma || !traceId) return;

      // Calculate total latency from all steps
      const steps = await this.prisma.aiTraceStep.findMany({
        where: { traceId },
        select: { latencyMs: true }
      });

      const totalLatency = steps.reduce((sum, step) => sum + (step.latencyMs || 0), 0);

      // Store result and score in metadata
      const completionMetadata = {
        result: typeof result === 'string' ? result : JSON.stringify(result),
        score: score,
        completedAt: new Date().toISOString()
      };

      await this.prisma.aiTrace.update({
        where: { id: traceId },
        data: {
          latencyMs: totalLatency,
          metadata: JSON.stringify(completionMetadata)
        }
      });
    } catch (error) {
      console.error('[TraceManager] Complete failed:', error);
    }
  }
}

class RAGService {
  constructor() {
    // سيتم تهيئة Gemini عند الحاجة من قاعدة البيانات
    this.genAI = null;
    this.embeddingModel = null;
    this.knowledgeBase = new Map(); // For FAQs and Policies only
    this.productIndex = []; // 🆕 Lite Index for Products (ID + Embedding + Metadata)
    this.isInitialized = false;
    this.initializationPromise = null;
    // إضافة cache للاستفسارات المتكررة
    this.aiChoiceCache = new Map();
    this.cacheMaxSize = 100;
    this.cacheExpiryTime = 30 * 60 * 1000; // 30 دقيقة

    // ✅ Products loading cache per company (prevents cross-company thrash + reduces DB hits)
    // Map<companyId, { loadedAt: number, count?: number }>
    this.companyProductsLoaded = new Map();
    // Map<companyId, Promise<void>> to dedupe concurrent loads
    this.companyProductsLoading = new Map();
    // Keep TTL short to reflect admin updates without sacrificing performance
    this.companyProductsTtlMs = 15 * 60 * 1000; // 15 minutes (was 2 minutes)

    // 🆕 Enhanced RAG Components
    this.logger = ragLogger;
    this.cache = ragCache;
    this.analytics = ragAnalytics;
    this.rateLimiter = ragRateLimiter;
    this.product_variantsearch = ragVariantSearch;
    this.dataLoader = ragDataLoader;

    // ✅ Embedding cache to avoid redundant API calls
    this.embeddingCache = new Map(); // Map<query, {embedding, timestamp}>
    this.embeddingCacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    this.maxEmbeddingCacheSize = 1000; // Max cache entries

    this.embeddingCacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    this.maxEmbeddingCacheSize = 1000; // Max cache entries

    // ✅ Trace Manager
    this.traceManager = new TraceManager(getSharedPrismaClient());

    this.initializeKnowledgeBase();
  }

  // ضمان التهيئة قبل أي عملية بحث
  async ensureInitialized() {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.isInitialized;
    }

    // انتظار حتى 10 ثوان للتهيئة
    let attempts = 0;
    while (!this.isInitialized && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }

    return this.isInitialized;
  }

  async initializeGemini(companyId = null) {
    //console.log(`🔧 [RAG-GEMINI] تهيئة Gemini للشركة: ${companyId}`);

    if (!this.genAI || companyId) {
      // استخدام نفس نظام الحصول على المفاتيح من aiAgentService
      const aiAgentService = require('./aiAgentService');

      try {
        // الحصول على مفتاح نشط للشركة المحددة (Force GOOGLE for embeddings)
        const activeModel = await aiAgentService.getCurrentActiveModel(companyId, 0, { preferredProvider: 'GOOGLE' });
        //console.log(`🔑 [RAG-GEMINI] النموذج النشط:`, activeModel);

        if (activeModel && activeModel.apiKey) {
          this.genAI = new GoogleGenerativeAI(activeModel.apiKey);
          // Store active model name for use in other methods (like expansion)
          this.activeModelName = activeModel.modelName || "gemini-1.5-flash";
          // Use text-embedding-004 for better performance and consistency with EmbeddingHelper
          this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
          //console.log(`✅ [RAG-GEMINI] تم تهيئة Gemini بنجاح للشركة: ${companyId}`);
        } else {
          //console.log(`❌ [RAG-GEMINI] لم يتم العثور على مفتاح نشط للشركة: ${companyId}`);
        }
      } catch (error) {
        console.error(`❌ [RAG-GEMINI] خطأ في تهيئة Gemini:`, error);
      }
    }
    return this.genAI !== null;
  }

  async initializeKnowledgeBase(companyId = null) {
    //console.log('🧠 Initializing RAG Knowledge Base...');
    if (companyId) {
      //console.log(`🏢 [RAG] Initializing for company: ${companyId}`);
    }

    try {
      this.initializationPromise = this._doInitialization(companyId);
      await this.initializationPromise;
      this.isInitialized = true;
      //console.log('✅ RAG Knowledge Base initialized');
    } catch (error) {
      console.error('❌ Error initializing RAG:', error);
      //console.log('⚠️ [RAG] النظام سيعمل بدون قاعدة المعرفة مؤقتاً');
      //console.log('🔄 [RAG] يمكن إعادة المحاولة لاحقاً عند استقرار الاتصال');
      this.isInitialized = false;

      // لا نرمي الخطأ هنا لأن النظام يجب أن يستمر في العمل
      // حتى لو فشل تحميل قاعدة المعرفة
    } finally {
      this.initializationPromise = null;
    }
  }

  // دالة لإعادة محاولة تحميل قاعدة المعرفة
  async retryInitialization() {
    if (this.isInitialized) {
      //console.log('✅ [RAG] قاعدة المعرفة محملة بالفعل');
      return true;
    }

    //console.log('🔄 [RAG] إعادة محاولة تحميل قاعدة المعرفة...');
    await this.initializeKnowledgeBase();
    return this.isInitialized;
  }

  async _doInitialization(companyId = null) {
    // 🔐 لا نحمل أي منتجات عند التشغيل - سيتم تحميلها عند الطلب فقط
    //console.log('🔐 [RAG] تهيئة RAG بدون تحميل منتجات - العزل الكامل مفعل');

    // Only load FAQs and Policies if companyId is provided
    // Otherwise, they will be loaded on-demand when needed
    if (companyId) {
      await this.loadFAQs(companyId);
      await this.loadPolicies(companyId);
    }

    //console.log('✅ [RAG] تم تهيئة RAG مع العزل الكامل');
  }

  // 🔐 تحميل منتجات شركة محددة فقط
  async loadProductsForCompany(companyId) {
    if (!companyId) {
      //console.log('⚠️ [RAG] لا يمكن تحميل منتجات بدون companyId');
      return;
    }

    // ✅ If a load for this company is already in-flight, await it (avoids duplicate DB work)
    const inFlight = this.companyProductsLoading.get(companyId);
    if (inFlight) {
      await inFlight;
      return;
    }

    // ✅ If recently loaded, skip (prevents reloading on every message)
    const cached = this.companyProductsLoaded.get(companyId);
    const now = Date.now();
    if (cached && now - cached.loadedAt < this.companyProductsTtlMs) {
      return;
    }

    // ✅ IMPORTANT: Do NOT delete other companies' products.
    // We keep all products in memory with strict filtering by companyId on retrieval/search.
    const loadPromise = (async () => {
      //console.log(`🔐 [RAG] تحميل/تحديث منتجات الشركة: ${companyId}`);
      await this.loadProducts(companyId);
      this.companyProductsLoaded.set(companyId, { loadedAt: Date.now() });
      try {
        const stats = this.getStats();
        console.log(`✅ [RAG] Products loaded for company ${companyId}. KB stats:`, stats);
      } catch (_) {
        // ignore logging failures
      }
    })();

    this.companyProductsLoading.set(companyId, loadPromise);
    try {
      await loadPromise;
    } finally {
      this.companyProductsLoading.delete(companyId);
    }
  }

  // 🧹 مسح منتجات شركة محددة من الذاكرة (لتجنب البيانات القديمة)
  clearCompanyProducts(companyId) {
    if (!companyId) return;

    // Remove from loaded cache to force reload next time
    this.companyProductsLoaded.delete(companyId);

    // 🆕 Clear from productIndex
    const initialLength = this.productIndex.length;
    this.productIndex = this.productIndex.filter(item => item.metadata.companyId !== companyId);
    const clearedCount = initialLength - this.productIndex.length;

    if (clearedCount > 0) {
      this.logger.info('[RAG] Cleared products from index', { companyId, clearedCount });
    }
  }

  // 🆕 إضافة أو تحديث منتج واحد في productIndex (لتحسين الأداء)
  async addOrUpdateProduct(product, companyId = null) {
    if (!product || !product.id) {
      this.logger.warn('[RAG] Cannot add/update product: missing id', { product: product?.name });
      return;
    }

    try {
      // Parse embedding
      let embedding = null;
      if (product.embedding) {
        try {
          embedding = typeof product.embedding === 'string'
            ? JSON.parse(product.embedding)
            : product.embedding;
        } catch (e) {
          this.logger.warn('[RAG] Failed to parse embedding', { productId: product.id, error: e.message });
        }
      }

      // Find existing product in index
      const existingIndex = this.productIndex.findIndex(p => p.id === product.id);

      // Get category name if needed
      let categoryName = product.category?.name || '';
      if (!categoryName && product.categoryId) {
        try {
          const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
          const category = await safeQuery(async () => {
            return await getSharedPrismaClient().category.findUnique({
              where: { id: product.categoryId },
              select: { name: true }
            });
          }, 2);
          categoryName = category?.name || '';
        } catch (e) {
          // Ignore category fetch errors
        }
      }

      const productItem = {
        id: product.id,
        type: 'product',
        searchableText: (product.name + ' ' + categoryName).toLowerCase(),
        metadata: {
          companyId: product.companyId || companyId,
          price: Number(product.price) || 0,
          categoryId: product.categoryId,
          stock: product.stock || 0,
          name: product.name
        }
      };

      if (existingIndex >= 0) {
        // Update existing
        this.productIndex[existingIndex] = productItem;
        this.logger.info('[RAG] Updated product in index', { productId: product.id, productName: product.name });
      } else {
        // Add new
        this.productIndex.push(productItem);
        this.logger.info('[RAG] Added product to index', { productId: product.id, productName: product.name });
      }
    } catch (error) {
      this.logger.error('[RAG] Error adding/updating product in index', {
        productId: product.id,
        error: error.message
      });
    }
  }

  // 🆕 حذف منتج واحد من productIndex (لتحسين الأداء)
  removeProduct(productId) {
    if (!productId) {
      this.logger.warn('[RAG] Cannot remove product: missing productId');
      return;
    }

    const initialLength = this.productIndex.length;
    this.productIndex = this.productIndex.filter(item => item.id !== productId);
    const removed = initialLength - this.productIndex.length;

    if (removed > 0) {
      this.logger.info('[RAG] Removed product from index', { productId });
    } else {
      this.logger.debug('[RAG] Product not found in index', { productId });
    }
  }

  async loadProducts(companyId = null) {
    let products;
    let retryCount = 0;
    const maxRetries = 3;

    // ✅ FIX: Clear existing products for this company before loading new ones to prevent stale data
    if (companyId) {
      this.clearCompanyProducts(companyId);
    }

    while (retryCount < maxRetries) {
      try {
        //console.log(`🔄 [RAG] محاولة الاتصال بقاعدة البيانات (${retryCount + 1}/${maxRetries})...`);

        // 🔐 إضافة العزل حسب الشركة
        const whereClause = { isActive: true };
        if (companyId) {
          whereClause.companyId = companyId;
          //console.log(`🏢 [RAG] تحميل منتجات الشركة: ${companyId}`);
        } else {
          //console.log(`⚠️ [RAG] تحميل جميع المنتجات (لا يوجد companyId)`);
        }

        products = await safeQuery(async () => {
          return await getSharedPrismaClient().product.findMany({
            where: whereClause,
            include: {
              category: true,
              product_variants: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' }
              }
            }
          });
        }, 3);

        //console.log(`✅ [RAG] تم تحميل ${products.length} منتج من قاعدة البيانات بنجاح`);
        break; // نجح الاتصال، اخرج من الحلقة

      } catch (error) {
        retryCount++;
        //console.log(`❌ [RAG] فشل في الاتصال (محاولة ${retryCount}/${maxRetries}):`, error.message);

        if (retryCount < maxRetries) {
          //console.log(`⏳ [RAG] انتظار 5 ثواني قبل المحاولة التالية...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // انتظار 5 ثواني
        } else {
          //console.log('❌ [RAG] فشل في جميع المحاولات، سيتم استخدام النظام بدون قاعدة بيانات');
          throw error; // إعادة رمي الخطأ بعد فشل جميع المحاولات
        }
      }
    }

    for (const product of products) {
      // 🆕 Lite Memory Strategy:
      // Store ONLY what is needed for SEARCH: Embedding, Price, Category, Basic Text
      // Full details (Description, Images, Variants) are fetched ON DEMAND via ID

      // Parse embedding
      let embedding = null;
      if (product.embedding) {
        try {
          embedding = JSON.parse(product.embedding);
        } catch (e) { /* ignore */ }
      }

      // If missing embedding, trigger generation in background (but don't block)
      if (!product.embedding) {
        EmbeddingHelper.generateAndSaveProductEmbedding(
          product.id,
          product.name,
          product.description,
          product.category?.name,
          product.companyId
        ).catch(() => { });
      }

      // Add to Lite Index
      this.productIndex.push({
        id: product.id,
        type: 'product',
        // Searchable Text for fallback/hybrid
        searchableText: (product.name + ' ' + (product.category?.name || '')).toLowerCase(),
        // Metadata for Filtering
        metadata: {
          companyId: product.companyId,
          price: Number(product.price),
          categoryId: product.categoryId,
          stock: product.stock,
          name: product.name // Need name for some debug/logic
        }
      });
    }

    //console.log(`📦 Loaded ${products.length} products into Lite Index (Memory Optimized)`);
  }

  // ✅ Save embedding to database for future use
  async saveEmbeddingToDatabase(productId, embedding) {
    try {
      await safeQuery(async () => {
        return await getSharedPrismaClient().product.update({
          where: { id: productId },
          data: {
            embedding: JSON.stringify(embedding),
            embeddingGeneratedAt: new Date()
          }
        });
      }, 2);
      //console.log(`💾 [DB] Saved embedding for product: ${productId}`);
    } catch (error) {
      console.error(`❌ [DB] Failed to save embedding for product ${productId}:`, error.message);
      throw error;
    }
  }

  async loadFAQs(companyId = null) {
    const startTime = Date.now();

    try {
      const faqs = await this.dataLoader.loadFAQs(companyId);

      faqs.forEach((faq, index) => {
        const key = companyId ? `faq_${companyId}_${index}` : `faq_${index}`;
        this.knowledgeBase.set(key, faq);
      });

      const duration = Date.now() - startTime;
      this.logger.info('FAQs loaded successfully', {
        companyId,
        count: faqs.length,
        duration
      });

      return faqs;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to load FAQs', {
        companyId,
        error: error.message,
        duration
      });
      throw error;
    }
  }

  async loadPolicies(companyId = null) {
    const startTime = Date.now();

    try {
      const policies = await this.dataLoader.loadPolicies(companyId);

      policies.forEach((policy, index) => {
        const key = companyId ? `policy_${companyId}_${index}` : `policy_${index}`;
        this.knowledgeBase.set(key, policy);
      });

      const duration = Date.now() - startTime;
      this.logger.info('Policies loaded successfully', {
        companyId,
        count: policies.length,
        duration
      });

      return policies;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to load Policies', {
        companyId,
        error: error.message,
        duration
      });
      throw error;
    }
  }

  async retrieveRelevantData(query, intent, customerId, companyId = null, ipAddress = null, conversationMemory = []) {
    const startTime = Date.now();

    // ✅ Runtime validation: ipAddress should be a string or null
    if (ipAddress && typeof ipAddress !== 'string') {
      this.logger.warn('[RAG-SECURITY] Invalid ipAddress passed to retrieveRelevantData:', {
        type: typeof ipAddress,
        companyId
      });
      ipAddress = null;
    }

    this.logger.info('RAG retrieval started', { query: query.substring(0, 50), intent, companyId });

    // ضمان التهيئة قبل البحث
    await this.ensureInitialized();

    // ✅ Always ensure the correct company's products are available in memory.
    if (companyId) {
      await this.loadProductsForCompany(companyId);
    }

    // 🧠 Context Inference - ✅ OPTIMIZED: Using Set to avoid O(n*m) complexity
    let finalQuery = query;
    let contextProduct = null;

    // Only attempt context inference for product/price inquiries and if memory exists
    if (conversationMemory && conversationMemory.length > 0 && (intent === 'product_inquiry' || intent === 'price_inquiry' || intent === 'general_inquiry')) {
      // Detect vague query (e.g. "bkam?", "mawjood?", "3ayz mno")
      const isVague = query.split(' ').length <= 3 || ['بكام', 'سعره', 'موجود', 'منه', 'الوان', 'مقاسات', 'تفاصيل'].some(w => query.includes(w));

      if (isVague) {
        // ✅ OPTIMIZATION: Create Set of product names for O(1) lookup instead of O(n*m) nested loop
        const companyProducts = companyId
          ? this.productIndex.filter(p => p.metadata?.companyId === companyId)
          : this.productIndex;

        if (companyProducts.length > 0) {
          // Create a Map of product name -> product for faster lookup
          const productNamesMap = new Map();
          companyProducts.forEach(prod => {
            if (prod.metadata?.name) {
              const normalizedName = prod.metadata.name.toLowerCase();
              productNamesMap.set(normalizedName, prod.metadata.name);
              // Also add normalized version for flexible matching
              const normalized = this.normalizeArabicText(normalizedName);
              if (normalized !== normalizedName) {
                productNamesMap.set(normalized, prod.metadata.name);
              }
            }
          });

          // Search in conversation memory (from most recent to oldest)
          for (const msg of conversationMemory.slice().reverse()) {
            if (msg.role === 'assistant' && msg.content) {
              const msgLower = msg.content.toLowerCase();

              // Check if any product name appears in the message
              for (const [normalizedName, actualName] of productNamesMap.entries()) {
                if (msgLower.includes(normalizedName)) {
                  contextProduct = actualName;
                  break;
                }
              }

              if (contextProduct) break;
            }
          }
        }

        if (contextProduct) {
          this.logger.debug('[RAG-CONTEXT] Inferred context from conversation', {
            contextProduct,
            query
          });
          finalQuery = `${contextProduct} ${query}`;
        }
      }
    }

    let relevantData = [];
    let wasSuccessful = true;

    try {
      // البحث حسب النية
      switch (intent) {
        case 'product_inquiry':
        case 'price_inquiry':
          relevantData.push(...await this.searchProducts(finalQuery, companyId));
          break;

        case 'shipping_info':
        case 'shipping_inquiry':
          // ✅ Semantic search for FAQs/Policies
          relevantData.push(...await this.semanticSearch('faq', finalQuery, companyId, ['شحن', 'توصيل']));
          relevantData.push(...await this.semanticSearch('policy', finalQuery, companyId, ['شحن']));
          break;

        case 'order_status':
          const customerOrders = await this.getCustomerOrders(customerId);
          relevantData.push(...customerOrders);
          break;

        case 'complaint':
          relevantData.push(...await this.semanticSearch('policy', finalQuery, companyId, ['إرجاع', 'ضمان']));
          break;

        default:
          relevantData.push(...await this.searchProducts(finalQuery, companyId));
      }

      // 🔐 تحقق نهائي من العزل
      if (companyId) {
        const filteredData = relevantData.filter(item => {
          if (item.type === 'product') {
            return item.metadata?.companyId === companyId;
          }
          return true;
        });
        relevantData = filteredData;
      }

      wasSuccessful = relevantData.length > 0;

      // ✅ تقليل من 12 إلى 8 منتجات + إضافة البيانات المضغوطة
      const limitedResults = relevantData.slice(0, 8);

      const responseTime = Date.now() - startTime;

      // 📊 Log analytics
      if (companyId) {
        await this.analytics.logSearch(
          companyId,
          customerId,
          query,
          intent,
          limitedResults.length,
          responseTime,
          wasSuccessful
        );

        await this.analytics.logPerformance(
          companyId,
          'retrieveRelevantData',
          responseTime,
          null,
          false,
          false
        );
      }

      return limitedResults.map(item => {
        if (item.type === 'product') {
          return {
            ...item,
            compressed: this.compressProductData(item)
          };
        }
        return item;
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('RAG retrieval failed', {
        query: query.substring(0, 50),
        intent,
        companyId,
        error: error.message,
        responseTime
      });

      if (companyId) {
        await this.analytics.logPerformance(
          companyId,
          'retrieveRelevantData',
          responseTime,
          null,
          false,
          true,
          error.message
        );
      }

      return [];
    }
  }

  // 🆕 Hydrate function to fetch full details for lightweight search results
  async hydrateProducts(liteResults, companyId) {
    if (!liteResults || liteResults.length === 0) return [];

    const ids = liteResults.map(r => r.id);
    //console.log(`💧 [RAG] Hydrating ${ids.length} products from DB...`);

    try {
      const dbProducts = await safeQuery(async () => {
        return await getSharedPrismaClient().product.findMany({
          where: { id: { in: ids } },
          include: {
            category: true,
            product_variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }
          }
        });
      }, 3);

      const hydratedMap = new Map();
      // Mimic the old loadProducts logic to enrich the object
      for (const product of dbProducts) {
        let content = `
                المنتج: ${product.name}
                الفئة: ${product.category?.name || 'غير محدد'}
                السعر الأساسي: ${product.price} جنيه
                الوصف: ${product.description || ''}
                المخزون: ${product.stock}
             `.trim();

        // Process Images
        let productImages = [];
        try {
          if (product.images) {
            let cleanImages = typeof product.images === 'string' ? product.images.trim() : JSON.stringify(product.images);
            if (typeof product.images === 'string' && !cleanImages.endsWith(']')) {
              const lastComplete = cleanImages.lastIndexOf('","');
              if (lastComplete > 0) cleanImages = cleanImages.substring(0, lastComplete + 1) + ']';
            }
            productImages = JSON.parse(cleanImages);
          }
        } catch (e) { }
        const imageInfo = ImageHelper.getImageStatus(productImages);

        // Process Variants
        if (product.product_variants?.length > 0) {
          const prices = product.product_variants.map(v => Number(v.price));
          content += `\nنطاق الأسعار: ${Math.min(...prices)} - ${Math.max(...prices)}`;

          // ✅ FIX: Extract and add sizes and colors from variants
          const colors = new Set();
          const sizes = new Set();

          product.product_variants.forEach(v => {
            if (v.type === 'color' && v.name) {
              colors.add(v.name);
            } else if (v.type === 'size' && v.name) {
              sizes.add(v.name);
            } else if (v.name) {
              // Fallback: Try to detect from name if type is not set
              const nameLower = v.name.toLowerCase();
              // Check if it looks like a size (numbers like 38, 39, 40, 41, etc. or S/M/L/XL)
              const sizeMatch = v.name.match(/\b(3[5-9]|4[0-9]|5[0-9]|[SMLX]{1,3}L?)\b/i);
              if (sizeMatch) {
                sizes.add(v.name.trim());
              } else {
                // Check if it looks like a color
                const colorKeywords = ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'بني', 'رمادي', 'كحلي', 'بيج', 'وردي', 'برتقالي', 'أصفر', 'black', 'white', 'red', 'blue', 'green', 'brown', 'gray', 'grey', 'beige', 'pink', 'orange', 'yellow'];
                if (colorKeywords.some(color => nameLower.includes(color.toLowerCase()))) {
                  colors.add(v.name.trim());
                }
              }
            }
          });

          if (sizes.size > 0) {
            const sortedSizes = Array.from(sizes).sort((a, b) => {
              // Sort numbers first, then letters
              const aNum = parseInt(a);
              const bNum = parseInt(b);
              if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
              if (!isNaN(aNum)) return -1;
              if (!isNaN(bNum)) return 1;
              return a.localeCompare(b);
            });
            content += `\nالمقاسات المتاحة: ${sortedSizes.join('، ')}`;
          }

          if (colors.size > 0) {
            content += `\nالألوان المتاحة: ${Array.from(colors).join('، ')}`;
          }
        }

        hydratedMap.set(product.id, {
          ...product, // 🆕 Spread product fields at top level (name, price, etc)
          type: 'product',
          content: content,
          imageInfo: imageInfo,
          metadata: {
            ...product,
            companyId: product.companyId,
            images: imageInfo.validImages,
            imageStatus: imageInfo.status,
            imageCount: imageInfo.count,
            hasValidImages: imageInfo.hasImages,
            variants: product.product_variants?.map(v => ({
              id: v.id, name: v.name, type: v.type, price: v.price, stock: v.stock,
              hasImages: (v.images && v.images.length > 5)
            })) || []
          }
        });
      }

      // Merge DB data with Score/Ranking info
      return liteResults.map(lite => {
        const rich = hydratedMap.get(lite.id);
        if (!rich) return null;
        return {
          ...rich,
          ...lite, // 🆕 Preserve all search properties like score, rrfScore, etc.
          key: `product_${lite.id}`
        };
      }).filter(p => p !== null);

    } catch (err) {
      console.error('❌ [RAG] Hydration failed:', err);
      return [];
    }
  }

  // 🆕 Query Expansion (HyDE Lite) to improve recall
  // ✅ OPTIMIZED: Should be called only for vague queries (checked in searchProducts)
  async expandQueryWithAI(query, companyId) {
    if (!this.genAI) await this.initializeGemini(companyId);
    if (!this.genAI) return query; // Fallback to original

    const cacheKey = `expand_${companyId || 'global'}_${query}`;
    const cached = ragCache.get(cacheKey);
    if (cached) {
      this.logger.debug('[RAG-EXPANSION] Cache hit', { query: query.substring(0, 50) });
      return cached;
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.activeModelName || "gemini-1.5-flash",
        generationConfig: { maxOutputTokens: 100, temperature: 0.1 }
      });

      const prompt = `
        User Query: "${query}"
        Task: Act as an expert shopping assistant. Expand this query into a single descriptive paragraph that captures the intent, synonyms, related categories, and technical specifications of the ideal product. 
        Focus on providing a rich set of keywords in both Arabic and English. 
        Example: "smart watch" -> "A wearable electronic device, digital wrist-worn computer with health monitoring, fitness tracking, heart rate sensor, GPS, and smartphone notifications. compatible with Android and iOS. ساعة ذكية رياضية، وساعة يد رقمية ذكية، سوار رياضي متطور."
        
        Write only the replacement descriptive paragraph. Do not include introductory text.
      `.trim();

      const result = await model.generateContent(prompt);
      const expandedText = result.response.text().trim();

      // ✅ Report Usage (Phase 6)
      if (this.rateLimiter && result.response.usageMetadata) {
        this.rateLimiter.reportUsage(
          companyId,
          result.response.usageMetadata.totalTokenCount,
          'expansion'
        );
      }

      ragCache.set(cacheKey, expandedText, 3600); // 1 hour cache
      return expandedText;
    } catch (error) {
      this.logger.error('Query expansion failed', { error: error.message });
      return query;
    }
  }

  // 🆕 Reciprocal Rank Fusion (RRF) for merging search results
  calculateRRF(vectorResults, textResults, k = 60) {
    const scores = new Map();

    // vectorResults and textResults are arrays of { id, ... }
    vectorResults.forEach((res, rank) => {
      const score = 1 / (k + rank + 1);
      scores.set(res.id, (scores.get(res.id) || 0) + score);
    });

    textResults.forEach((res, rank) => {
      const score = 1 / (k + rank + 1);
      scores.set(res.id, (scores.get(res.id) || 0) + score);
    });

    // Merge and sort
    const merged = Array.from(scores.entries())
      .map(([id, score]) => {
        const original = vectorResults.find(r => r.id === id) || textResults.find(r => r.id === id);
        return { ...original, rrfScore: score };
      })
      .sort((a, b) => b.rrfScore - a.rrfScore);

    return merged;
  }

  // 🆕 Advanced Re-ranking via AI
  async rerankResults(query, candidates, companyId) {
    if (!candidates || candidates.length <= 1) return candidates;
    if (!this.genAI) await this.initializeGemini(companyId);

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0.1 }
      });

      const itemsList = candidates.slice(0, 10).map((c, i) =>
        `[${i}] Name: ${c.name || (c.metadata ? c.metadata.name : 'Unknown')}, Price: ${c.price}, Category: ${c.category?.name || 'N/A'}`
      ).join('\n');

      const prompt = `
        User Search Query: "${query}"
        Candidates:
        ${itemsList}

        Task: Based on the search query, re-order the candidates from most relevant to least relevant. 
        Only return a comma-separated list of indices. Example: 2,0,1,3
      `.trim();

      const result = await model.generateContent(prompt);
      const textResult = result.response.text().trim();

      // ✅ Report Usage (Phase 6)
      if (this.rateLimiter && result.response.usageMetadata) {
        this.rateLimiter.reportUsage(
          companyId,
          result.response.usageMetadata.totalTokenCount,
          'rerank'
        );
      }

      // Robustly extract indices like "2, 0, 1" even if there is surrounding text
      const rankingOrder = textResult
        .match(/\d+/g)
        ?.map(n => parseInt(n)) || [];

      // Re-order
      const reranked = [];
      const usedIndices = new Set();

      for (const idx of rankingOrder) {
        if (candidates[idx]) {
          reranked.push(candidates[idx]);
          usedIndices.add(idx);
        }
      }

      // Add remaining that weren't in the list
      candidates.forEach((c, i) => {
        if (!usedIndices.has(i)) reranked.push(c);
      });

      return reranked;
    } catch (error) {
      this.logger.error('Re-ranking failed', { error: error.message });
      return candidates; // Fallback
    }
  }

  async searchProducts(query, companyId = null, ipAddress = null) {
    const startTime = Date.now();
    let trace = null;
    if (companyId) { // Only trace if companyId is present
      trace = await this.traceManager.startTrace(companyId, query);
    }
    // 🛡️ Rate Limiting (Phase 6)
    if (companyId && this.rateLimiter) {
      const limitCheck = await this.rateLimiter.checkRateLimit(companyId, ipAddress, 'search');
      if (!limitCheck.allowed) {
        this.logger.warn(`Rate limit exceeded for company ${companyId}: ${limitCheck.reason}`);
        return [];
      }
    }

    // 🧠 Smart Caching (Phase 6)
    const cacheKey = `search_${companyId}_${query}`;
    const cachedResults = this.cache.getSearch(companyId, query, 'products');
    if (cachedResults) {
      this.logger.info(`Smart Cache Hit for query: ${query}`);
      return cachedResults;
    }

    const results = [];
    let queryEmbedding = null;
    const searchTerms = query.toLowerCase().split(' ');

    // 1️⃣ General Query Check
    const isGeneralQuery = ['منتجات', 'احذية', 'كوتشي', 'shoes'].some(k => query.toLowerCase().includes(k));
    if (isGeneralQuery) {
      // Return latest 20 products for company from Lite Index
      const candidates = this.productIndex
        .filter(p => !companyId || p.metadata.companyId === companyId)
        .slice(0, 20)
        .map(p => ({ ...p, score: 10 }));
      return await this.hydrateProducts(candidates, companyId);
    }

    // 2️⃣ Query Expansion (Advanced 2025) - ✅ OPTIMIZED: Use AI only when needed
    let expandedQuery = query;

    // ✅ Smart check: Only expand vague/unclear queries
    const shouldExpand = (() => {
      // Skip expansion for clear queries (containing brand names or product names)
      const brandNames = ['نايك', 'nike', 'أديداس', 'adidas', 'بوما', 'puma', 'اسكوتش', 'scotch'];
      const hasBrand = brandNames.some(brand => query.toLowerCase().includes(brand.toLowerCase()));

      // Skip expansion for long queries (already specific)
      const wordCount = query.trim().split(/\s+/).length;
      const isLongQuery = wordCount > 4;

      // Only expand if query is vague (short + no brand)
      const isVague = wordCount <= 3 || ['بكام', 'موجود', 'منه', 'عايز', 'اشوف', 'ممكن'].some(w => query.includes(w));

      return isVague && !hasBrand && !isLongQuery;
    })();

    if (shouldExpand) {
      this.logger.debug('[RAG-EXPANSION] Expanding vague query', { query });
      expandedQuery = await this.expandQueryWithAI(query, companyId);
    } else {
      this.logger.debug('[RAG-EXPANSION] Skipping expansion for clear query', { query });
    }

    if (trace && expandedQuery !== query) {
      await this.traceManager.addStep(trace.id, 'EXPANSION', query, expandedQuery, Date.now() - startTime);
    }

    // 3️⃣ DB-Level Vector Search
    const vectorResults = await this.dbVectorSearch('product', expandedQuery, companyId);

    // 4️⃣ Keyword Search (DB-Level)
    const textResults = await this.dbTextSearch('product', query, companyId);

    // 6️⃣ Merge with RRF (Phase 4 Advanced)
    const mergedResults = this.calculateRRF(vectorResults, textResults);

    if (trace) {
      await this.traceManager.addStep(trace.id, 'RETRIEVAL', expandedQuery, JSON.stringify(mergedResults.slice(0, 5)), Date.now() - startTime, { vectorCount: vectorResults.length, textCount: textResults.length });
    }

    if (query.includes('نايك')) {
      console.log(`DEBUG [RAG] Top Merged:`, mergedResults.slice(0, 3).map(r => `${r.metadata?.name} (RRF: ${r.rrfScore.toFixed(4)})`));
    }

    // 7️⃣ Final Slice & Hydrate - ✅ OPTIMIZED: Reduce from 20 to 10 before hydration
    const finalLite = mergedResults.slice(0, 10); // Reduced from 20 to 10

    // FETCH FULL DETAILS
    const hydratedResults = await this.hydrateProducts(finalLite, companyId);

    // 8️⃣ Final Re-ranking (AI Judge) - ✅ OPTIMIZED: Use AI only when results are ambiguous
    let reRanked = hydratedResults;

    if (hydratedResults.length > 3) {
      // ✅ Smart check: Only rerank if results are too similar (ambiguous ranking)
      const scores = hydratedResults.map(r => r.score || r.rrfScore || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;

      // Calculate score ratio between top 2 results
      const topScore = scores[0] || 0;
      const secondScore = scores[1] || 0;
      const scoreRatio = secondScore > 0 ? topScore / secondScore : Infinity;

      // Only rerank if results are ambiguous (low variance OR similar top scores)
      const isAmbiguous = variance < 0.1 || (scoreRatio < 1.3 && topScore > 0);

      if (isAmbiguous) {
        this.logger.debug('[RAG-RERANK] Results ambiguous, using AI reranking', {
          variance: variance.toFixed(4),
          scoreRatio: scoreRatio.toFixed(2),
          resultsCount: hydratedResults.length
        });
        reRanked = await this.rerankResults(query, hydratedResults, companyId);
      } else {
        this.logger.debug('[RAG-RERANK] Results clearly ranked, skipping AI reranking', {
          topScore: topScore.toFixed(2),
          secondScore: secondScore.toFixed(2),
          scoreRatio: scoreRatio.toFixed(2)
        });
      }
    }

    // ✅ FALLBACK: If no results found, return all company products (for general queries)
    if (reRanked.length === 0 && companyId) {
      console.log(`🔍 [RAG-FALLBACK-SEARCH] No hybrid search matches, returning all products for company: ${companyId}`);
      const allCompanyProducts = this.productIndex.filter(p => p.metadata?.companyId === companyId);
      if (allCompanyProducts.length > 0) {
        const hydratedAll = await this.hydrateProducts(allCompanyProducts.slice(0, 10), companyId);
        return hydratedAll;
      }
    }

    // ✅ Smart Caching (Phase 6)
    this.cache.setSearch(companyId || 'global', query, 'products', reRanked);

    // Asynchronous completion
    if (trace) {
      // Attach traceId to results for frontend playground
      reRanked.traceId = trace.id;

      this.traceManager.completeTrace(trace.id, JSON.stringify(reRanked.slice(0, 5)), reRanked.length > 0 ? reRanked[0].score : 0).catch(e => console.error(e));
    }

    return reRanked;
  }

  /**
   * 🆕 Database-level Vector Search using MariaDB native functions
   * @param {'product' | 'faq' | 'policy'} type 
   * @param {string} queryText 
   * @param {string} companyId 
   * @param {number} limit 
   */
  async dbVectorSearch(type, queryText, companyId, limit = 20) {
    try {
      // 1. استخدام PostgreSQL إذا كان النوع هو منتج
      if (type === 'product' || type === 'products') {
        const results = await postgresVectorService.searchProducts(queryText, companyId, limit);
        return results;
      }

      // 2. Generate Query Embedding (Centralized)
      const queryEmbedding = await this.generateEmbedding(queryText, companyId);
      if (!queryEmbedding) return [];

      // 2. Determine table name
      const tableMap = { 'product': 'products', 'faq': 'faqs', 'policy': 'policies' };
      const tableName = tableMap[type];
      if (!tableName) return [];

      // 3. Perform Vector Search via raw SQL
      // MariaDB 11.8+ supports VEC_DISTANCE_COSINE
      // We cast the text embedding to VECTOR type
      const embeddingStr = JSON.stringify(queryEmbedding);

      const results = await getSharedPrismaClient().$queryRawUnsafe(`
        SELECT id, name, 
        (1 - VEC_DISTANCE_COSINE(VEC_FROMTEXT(embedding), VEC_FROMTEXT(?))) as vector_score
        FROM ${tableName}
        WHERE companyId = ? AND embedding IS NOT NULL AND isActive = 1
        ORDER BY vector_score DESC
        LIMIT ?
      `, embeddingStr, companyId, limit);

      // DEBUG: Log top result score
      if (results.length > 0) {
        this.logger.debug(`[RAG-VEC-SEARCH] Top ${type} score: ${results[0].vector_score} for "${results[0].name}"`);
      }

      // Map back to expected format
      return results.map(r => ({
        ...r,
        id: r.id,
        score: parseFloat(r.vector_score || 0),
        type: type,
        metadata: r // Keep original for now
      }));

    } catch (error) {
      this.logger.error(`[RAG-VEC-SEARCH] DB search failed for ${type}:`, { error: error.message });
      return [];
    }
  }

  /**
   * 🆕 Database-level Text Search (Keywords)
   * @param {'product' | 'faq' | 'policy'} type 
   * @param {string} query 
   * @param {string} companyId 
   */
  async dbTextSearch(type, query, companyId, limit = 20) {
    try {
      const tableMap = { 'product': 'products', 'faq': 'faqs', 'policy': 'policies' };
      const tableName = tableMap[type];

      // Basic Full-text fallback or keyword matching if Full-text index not yet optimized
      // For now, we use a simple LIKE based approach or Full-text if available
      // In Phase 2, we will optimize this with a proper MariaDB Full-text index

      const keywords = query.toLowerCase().split(' ').filter(k => k.length > 2);
      if (keywords.length === 0) return [];

      const searchTerms = keywords.map(k => `%${k}%`);

      // Simple Keyword Score based on matches
      const results = await getSharedPrismaClient().$queryRawUnsafe(`
        SELECT *, 
        (CASE WHEN name LIKE ? THEN 5 ELSE 0 END + CASE WHEN description LIKE ? THEN 2 ELSE 0 END) as text_score
        FROM ${tableName}
        WHERE companyId = ? AND isActive = 1 AND (name LIKE ? OR description LIKE ?)
        ORDER BY text_score DESC
        LIMIT ?
      `, searchTerms[0], searchTerms[0], companyId, searchTerms[0], searchTerms[0], limit);

      return results.map(r => ({
        ...r,
        id: r.id,
        score: parseFloat(r.text_score || 0),
        type: type,
        metadata: r
      }));
    } catch (error) {
      this.logger.error(`[RAG-TEXT-SEARCH] DB search failed for ${type}:`, { error: error.message });
      return [];
    }
  }

  /**
   * 🆕 Semantic search for non-product types (FAQs/Policies)
   */
  async semanticSearch(type, query, companyId, hardKeywords = []) {
    // 1. Try vector search
    const vectorResults = await this.dbVectorSearch(type, query, companyId);

    // 2. If hard keywords provided (e.g. for specific intents), boost matches
    if (hardKeywords.length > 0) {
      const textResults = await this.dbTextSearch(type, hardKeywords.join(' '), companyId);
      return this.calculateRRF(vectorResults, textResults);
    }

    return vectorResults;
  }

  /**
   * 🆕 Centralized embedding generation
   */
  async generateEmbedding(text, companyId) {
    // Check internal cache
    const cacheKey = `embedding_${text}`;
    const cached = this.embeddingCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.embeddingCacheTTL) return cached.embedding;

    // Initialize Gemini if not done
    await this.initializeGemini(companyId);
    if (!this.embeddingModel) return null;

    try {
      const result = await this.embeddingModel.embedContent(text);
      const embedding = result.embedding.values;

      // Cache it
      this.embeddingCache.set(cacheKey, { embedding, timestamp: Date.now() });
      return embedding;
    } catch (error) {
      this.logger.error('[RAG-GENERATE-EMBEDDING] Failed:', { error: error.message });
      return null;
    }
  }

  searchByType(type, keywords) {
    const results = [];

    for (const [key, item] of this.knowledgeBase.entries()) {
      if (item.type === type) {
        const content = item.content.toLowerCase();
        const hasKeyword = keywords.some(keyword =>
          content.includes(keyword.toLowerCase())
        );

        if (hasKeyword) {
          results.push({
            ...item,
            key
          });
        }
      }
    }

    return results;
  }

  async generalSearch(query, companyId = null) {
    const results = [];
    const searchTerms = query.toLowerCase().split(' ');

    // 1️⃣ Search Products in Lite Index
    for (const item of this.productIndex) {
      if (companyId && item.metadata.companyId !== companyId) continue;

      const score = this.calculateRelevanceScore(item.searchableText, searchTerms);

      if (score > 0) {
        results.push({
          ...item, // Lite item
          score,
          key: `product_${item.id}`
        });
      }
    }

    // 2️⃣ Search FAQs/Policies in KnowledgeBase
    for (const [key, item] of this.knowledgeBase.entries()) {
      if (item.type === 'product') continue; // Should be empty of products anyway

      const content = item.content.toLowerCase();
      const score = this.calculateRelevanceScore(content, searchTerms);

      if (score > 0) {
        results.push({
          ...item,
          score,
          key
        });
      }
    }

    const sorted = results.sort((a, b) => b.score - a.score).slice(0, 20);

    // ✅ CRITICAL FIX: If no keyword matches, return ALL company products
    // This handles "what products do you have" type queries
    if (sorted.length === 0 && companyId) {
      console.log(`🔍 [RAG-GENERAL] No keyword matches, returning all products for company: ${companyId}`);
      const allCompanyProducts = this.productIndex.filter(p => p.metadata?.companyId === companyId);
      if (allCompanyProducts.length > 0) {
        const hydratedAll = await this.hydrateProducts(allCompanyProducts.slice(0, 10), companyId);
        return hydratedAll;
      }
    }

    // 3️⃣ Hydrate Products
    const productsToHydrate = sorted.filter(r => r.type === 'product');
    const others = sorted.filter(r => r.type !== 'product');

    const hydratedProducts = await this.hydrateProducts(productsToHydrate, companyId);

    return [...hydratedProducts, ...others].sort((a, b) => b.score - a.score);
  }

  // تطبيع النص العربي
  normalizeArabicText(text) {
    if (!text) return '';

    return text
      // توحيد الألف
      .replace(/[أإآا]/g, 'ا')
      // توحيد الياء
      .replace(/[يى]/g, 'ي')
      // توحيد التاء المربوطة
      .replace(/[ة]/g, 'ه')
      // إزالة التشكيل
      .replace(/[ًٌٍَُِّْ]/g, '')
      // توحيد المسافات
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  // إضافة مرادفات العلامات التجارية والمصطلحات
  expandSearchTerms(searchTerms) {
    const synonyms = {
      // العلامات التجارية
      'اديداس': ['أديداس', 'adidas', 'اديداس', 'ستان سميث', 'adedas'],
      'أديداس': ['اديداس', 'adidas', 'ستان سميث', 'adedas'],
      'adidas': ['أديداس', 'اديداس', 'ستان سميث', 'adedas'],
      'نايك': ['nike', 'نايكي', 'اير فورس', 'naik', 'نايكى'],
      'نايكي': ['نايك', 'nike', 'اير فورس', 'naik'],
      'nike': ['نايك', 'نايكي', 'اير فورس', 'naik'],
      'بوما': ['puma', 'بومة', 'سويد', 'booma'],
      'puma': ['بوما', 'بومة', 'سويد', 'booma'],
      'اسكوتش': ['scotch', 'اسكتش', 'سكوتش', 'skotch'],
      'scotch': ['اسكوتش', 'اسكتش', 'سكوتش', 'skotch'],

      // الألوان - مع الأخطاء الإملائية الشائعة
      'ابيض': ['أبيض', 'الابيض', 'الأبيض', 'white', 'ابيظ', 'بيضاء'],
      'أبيض': ['ابيض', 'الابيض', 'الأبيض', 'white', 'ابيظ'],
      'الابيض': ['ابيض', 'أبيض', 'الأبيض', 'white', 'ابيظ'],
      'الأبيض': ['ابيض', 'أبيض', 'الابيض', 'white', 'ابيظ'],
      'white': ['ابيض', 'أبيض', 'الابيض', 'الأبيض', 'ابيظ'],
      'اسود': ['أسود', 'الاسود', 'الأسود', 'black', 'اسوت', 'سودة'],
      'أسود': ['اسود', 'الاسود', 'الأسود', 'black', 'اسوت'],
      'الاسود': ['اسود', 'أسود', 'الأسود', 'black', 'اسوت'],
      'الأسود': ['اسود', 'أسود', 'الاسود', 'black', 'اسوت'],
      'black': ['اسود', 'أسود', 'الاسود', 'الأسود', 'اسوت'],
      'احمر': ['أحمر', 'الاحمر', 'red', 'حمراء'],
      'ازرق': ['أزرق', 'الازرق', 'blue', 'زرقاء'],
      'اخضر': ['أخضر', 'الاخضر', 'green', 'خضراء'],
      'رمادي': ['grey', 'gray', 'رصاصي'],

      // المقاسات والخصائص
      'مقاس': ['مقاسات', 'size', 'sizes', 'حجم', 'أحجام', 'مقاص'],
      'مقاسات': ['مقاس', 'size', 'sizes', 'حجم', 'أحجام'],
      'size': ['مقاس', 'مقاسات', 'حجم', 'أحجام'],
      'sizes': ['مقاس', 'مقاسات', 'حجم', 'أحجام'],
      'صغير': ['small', 'صغيره', 'صغيرة', 's'],
      'متوسط': ['medium', 'وسط', 'm'],
      'كبير': ['large', 'كبيره', 'كبيرة', 'l'],

      // أنواع المنتجات - مع الأخطاء الشائعة
      'كوتشي': ['حذاء', 'أحذية', 'احذية', 'shoes', 'sneakers', 'كوتشى', 'جزمه'],
      'حذاء': ['كوتشي', 'أحذية', 'احذية', 'shoes', 'sneakers', 'جزمه'],
      'أحذية': ['كوتشي', 'حذاء', 'احذية', 'shoes', 'sneakers', 'جزمه'],
      'احذية': ['كوتشي', 'حذاء', 'أحذية', 'shoes', 'sneakers', 'جزمه'],
      'shoes': ['كوتشي', 'حذاء', 'أحذية', 'احذية', 'sneakers', 'جزمه'],
      'sneakers': ['كوتشي', 'حذاء', 'أحذية', 'احذية', 'shoes', 'جزمه'],

      // الجنس
      'حريمي': ['نسائي', 'نساء', 'women', 'female', 'ستات', 'بنات'],
      'نسائي': ['حريمي', 'نساء', 'women', 'female', 'ستات'],
      'نساء': ['حريمي', 'نسائي', 'women', 'female', 'ستات'],
      'women': ['حريمي', 'نسائي', 'نساء', 'female', 'ستات'],
      'رجالي': ['رجال', 'men', 'male', 'ولادي'],
      'رجال': ['رجالي', 'men', 'male', 'ولادي'],
      'men': ['رجالي', 'رجال', 'male', 'ولادي'],

      // العامية المصرية الشائعة
      'عايز': ['أريد', 'عاوز', 'محتاج', 'نفسي'],
      'عاوز': ['أريد', 'عايز', 'محتاج', 'نفسي'],
      'ممكن': ['هل يمكن', 'ممكن اشوف', 'ممكن تبعت'],
      'ابعت': ['أرسل', 'ارسل', 'وريني', 'ورني'],
      'ابعتلي': ['أرسل لي', 'ارسل لي', 'بعت لي'],
      'وريني': ['أرني', 'اريني', 'شوفني', 'اشوف'],
      'عندك': ['لديك', 'موجود', 'متوفر'],
      'فيه': ['يوجد', 'موجود', 'متوفر', 'في'],
      'ايه': ['ماذا', 'وش', 'شنو', 'ما هو'],

      // الأسعار
      'بكام': ['بكم', 'السعر', 'كام', 'ب كام', 'بكم سعره'],
      'كام': ['بكام', 'بكم', 'السعر', 'كم'],
      'سعر': ['ثمن', 'تمن', 'كام', 'بكام'],
      'ثمن': ['سعر', 'تمن', 'كام'],

      // الرياضة والنشاطات
      'رياضي': ['sport', 'رياضه', 'رياضية', 'للرياضة'],
      'جري': ['running', 'للجري', 'ركض', 'جرى'],
      'مشي': ['walking', 'للمشي', 'سير'],
      'كاجوال': ['casual', 'كاجول', 'عادي', 'يومي']
    };

    const expandedTerms = [...searchTerms];

    for (const term of searchTerms) {
      const normalizedTerm = this.normalizeArabicText(term);
      if (synonyms[normalizedTerm]) {
        expandedTerms.push(...synonyms[normalizedTerm]);
      }
    }

    return [...new Set(expandedTerms)]; // إزالة التكرار
  }

  calculateRelevanceScore(content, searchTerms, productMetadata = null) {
    const normalizedContent = this.normalizeArabicText(content);
    const expandedTerms = this.expandSearchTerms(searchTerms);
    let score = 0;

    // ✅ NEW: بونص ضخم إذا كان الاستفسار يطابق اسم المنتج مباشرة
    if (productMetadata?.name) {
      const normalizedProductName = this.normalizeArabicText(productMetadata.name);
      const normalizedQuery = searchTerms.map(t => this.normalizeArabicText(t)).join(' ');

      // مطابقة كاملة لاسم المنتج
      if (normalizedProductName.includes(normalizedQuery) || normalizedQuery.includes(normalizedProductName)) {
        score += 50; // بونص ضخم للمطابقة المباشرة
      }

      // مطابقة جزئية لكلمات اسم المنتج
      const productNameWords = normalizedProductName.split(' ');
      const queryWords = normalizedQuery.split(' ');
      const matchingWords = productNameWords.filter(word =>
        queryWords.some(qw => qw.includes(word) || word.includes(qw))
      ).length;

      if (matchingWords > 0) {
        score += matchingWords * 10; // بونص لكل كلمة متطابقة
      }
    }

    expandedTerms.forEach(term => {
      const normalizedTerm = this.normalizeArabicText(term);

      if (normalizedTerm.length > 1) {
        try {
          const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // البحث عن المطابقة التامة (نقاط أعلى)
          const exactMatches = (normalizedContent.match(new RegExp(`\\b${escapedTerm}\\b`, 'g')) || []).length;
          score += exactMatches * 5;

          // البحث عن المطابقة الجزئية (نقاط أقل)
          const partialMatches = (normalizedContent.match(new RegExp(escapedTerm, 'g')) || []).length;
          score += (partialMatches - exactMatches) * 2;

          // بونص للكلمات المهمة
          const importantWords = ['كوتشي', 'حذاء', 'أحذية', 'نايك', 'أديداس', 'بوما'];
          if (importantWords.some(word => this.normalizeArabicText(word) === normalizedTerm)) {
            score += 3;
          }

        } catch (error) {
          const occurrences = normalizedContent.split(normalizedTerm).length - 1;
          score += occurrences * 2;
        }
      }
    });

    return score;
  }

  // البحث الدلالي المحسن
  calculateSemanticScore(query, item) {
    const normalizedQuery = this.normalizeArabicText(query);
    let semanticScore = 0;

    // تحليل نية البحث
    const colorQueries = ['لون', 'ألوان', 'الوان', 'أبيض', 'ابيض', 'أسود', 'اسود'];
    const sizeQueries = ['مقاس', 'مقاسات', 'حجم', 'أحجام', 'size'];
    const priceQueries = ['سعر', 'اسعار', 'أسعار', 'كام', 'بكام', 'price'];
    const imageQueries = ['صور', 'صورة', 'شوف', 'أشوف', 'اشوف', 'image'];

    // إذا كان البحث عن الألوان وهناك متغيرات ألوان
    if (colorQueries.some(term => normalizedQuery.includes(term))) {
      if (item.metadata?.product_variants?.some(v => v.type === 'color')) {
        semanticScore += 5;
      }
    }

    // إذا كان البحث عن المقاسات وهناك متغيرات مقاسات
    if (sizeQueries.some(term => normalizedQuery.includes(term))) {
      if (item.metadata?.product_variants?.some(v => v.type === 'size')) {
        semanticScore += 5;
      }
    }

    // إذا كان البحث عن السعر
    if (priceQueries.some(term => normalizedQuery.includes(term))) {
      if (item.metadata?.price) {
        semanticScore += 3;
      }
    }

    // إذا كان البحث عن الصور
    if (imageQueries.some(term => normalizedQuery.includes(term))) {
      if (item.metadata?.images?.length > 0) {
        semanticScore += 5;
      }
    }

    // بونص للمنتجات المتوفرة
    if (item.metadata?.stock > 0 ||
      item.metadata?.product_variants?.some(v => v.stock > 0)) {
      semanticScore += 2;
    }

    return semanticScore;
  }

  /**
   * Compress product data for efficient token usage in AI prompts
   * Reduces token consumption by ~70% while maintaining essential information
   * @param {Object} item - Product item from knowledge base
   * @returns {Object} Compressed product data
   */
  compressProductData(item) {
    const metadata = item.metadata;

    if (!metadata) {
      return { summary: 'منتج غير متوفر', id: null };
    }

    // Build essential info
    let compressed = `${metadata.name}`;

    // Price information (concise)
    if (metadata.product_variants && metadata.product_variants.length > 0) {
      const prices = metadata.product_variants.map(v => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) {
        compressed += ` - ${minPrice} جنيه`;
      } else {
        compressed += ` - ${minPrice}-${maxPrice} جنيه`;
      }
    } else {
      compressed += ` - ${metadata.price} جنيه`;
    }

    // Stock status (simple)
    const hasStock = metadata.stock > 0 || metadata.product_variants?.some(v => v.stock > 0);
    compressed += hasStock ? ' (متوفر)' : ' (نفذ)';

    // ✅ IMPROVEMENT: Add colors and sizes from variants (FIXED: Prioritize v.type over regex)
    if (metadata.product_variants && metadata.product_variants.length > 0) {
      const colors = new Set();
      const sizes = new Set();

      metadata.product_variants.forEach(v => {
        if (!v.name) return;

        // ✅ FIX: Prioritize v.type (most reliable method)
        if (v.type === 'color') {
          colors.add(v.name.trim());
          return;
        }
        if (v.type === 'size') {
          sizes.add(v.name.trim());
          return;
        }

        // Fallback: Try to detect from name if type is not set
        const nameLower = v.name.toLowerCase();

        // Check if it looks like a size (numbers like 38, 39, 40, 41, etc. or S/M/L/XL)
        const sizeMatch = v.name.match(/\b(3[5-9]|4[0-9]|5[0-9]|[SMLX]{1,3}L?)\b/i);
        if (sizeMatch) {
          sizes.add(v.name.trim());
          return;
        }

        // Check if it looks like a color
        const colorKeywords = ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'بني', 'رمادي', 'كحلي', 'بيج', 'وردي', 'برتقالي', 'أصفر', 'black', 'white', 'red', 'blue', 'green', 'brown', 'gray', 'grey', 'beige', 'pink', 'orange', 'yellow'];
        if (colorKeywords.some(color => nameLower.includes(color.toLowerCase()))) {
          colors.add(v.name.trim());
        }
      });

      if (colors.size > 0) {
        compressed += ` | الألوان: ${Array.from(colors).slice(0, 5).join('، ')}`;
      }
      if (sizes.size > 0) {
        // Sort sizes numerically/alphabetically for better display
        const sortedSizes = Array.from(sizes).sort((a, b) => {
          const aNum = parseInt(a);
          const bNum = parseInt(b);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          return a.localeCompare(b);
        });
        compressed += ` | المقاسات: ${sortedSizes.slice(0, 15).join('، ')}`;
      }
    }

    // ✅ IMPROVEMENT: Add short description (first 100 chars)
    if (metadata.description) {
      // Strip HTML tags and get first meaningful text
      const cleanDesc = metadata.description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);
      if (cleanDesc.length > 20) {
        compressed += ` | ${cleanDesc}${cleanDesc.length >= 100 ? '...' : ''}`;
      }
    }

    return {
      summary: compressed,
      id: metadata.id,
      name: metadata.name,
      hasImages: metadata.hasValidImages || false,
      variantsCount: metadata.product_variants?.length || 0,
      isAvailable: hasStock
    };
  }

  /**
   * Calculate advanced ranking score for better product discovery
   * Considers: promoted ads, stock, sales, ratings, and user preferences
   * @param {Object} item - Product item from knowledge base
   * @param {number} baseScore - Base relevance score from search
   * @param {Object} customerData - Customer information for personalization
   * @returns {number} Enhanced score
   */
  calculateAdvancedScore(item, baseScore, customerData = null) {
    let score = baseScore;
    const metadata = item.metadata;

    if (!metadata) {
      return score;
    }

    // 1. ✅ Promoted Products Bonus (highest priority)
    if (metadata.hasPromotedAd) {
      score += 50;
      //console.log(`🎯 [RANKING] Promoted product bonus: +50 for ${metadata.name}`);
    }

    // 2. Stock Availability Priority
    const hasStock = metadata.stock > 0 || metadata.product_variants?.some(v => v.stock > 0);

    if (hasStock) {
      // Bonus based on stock level
      if (metadata.stock > 10) {
        score += 10; // High stock
      } else if (metadata.stock > 0) {
        score += 5; // Low stock but available
      }

      // Check variant stock
      if (metadata.product_variants?.length > 0) {
        const totalVariantStock = metadata.product_variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        if (totalVariantStock > 10) {
          score += 8;
        } else if (totalVariantStock > 0) {
          score += 4;
        }
      }
    } else {
      // Penalty for out of stock
      score -= 30;
    }

    // 3. Sales Count Ranking (if available)
    if (metadata.salesCount) {
      if (metadata.salesCount > 100) {
        score += 20; // Best seller
      } else if (metadata.salesCount > 50) {
        score += 15;
      } else if (metadata.salesCount > 20) {
        score += 10;
      } else if (metadata.salesCount > 10) {
        score += 5;
      }
    }

    // 4. Rating-Based Ranking (if available)
    if (metadata.rating) {
      if (metadata.rating >= 4.5) {
        score += 15; // Excellent
      } else if (metadata.rating >= 4.0) {
        score += 10; // Good
      } else if (metadata.rating >= 3.5) {
        score += 5; // Average
      }
      // No penalty for low ratings, just no bonus
    }

    // 5. Image Availability Bonus
    if (metadata.hasValidImages && metadata.imageCount > 0) {
      score += 5;
      if (metadata.imageCount >= 3) {
        score += 3; // Multiple images bonus
      }
    }

    // 6. Variants Availability Bonus
    if (metadata.product_variants?.length > 0) {
      score += 7; // Has options
      if (metadata.product_variants.length >= 5) {
        score += 3; // Many options
      }
    }

    // 7. Personalization (if customer data available)
    if (customerData?.previousPurchases?.length > 0) {
      // Check if customer bought from same category before
      const boughtSameCategory = customerData.previousPurchases.some(
        p => p.categoryId === metadata.categoryId || p.category === metadata.category
      );

      if (boughtSameCategory) {
        score += 15; // Customer preference bonus
      }
    }

    // 8. New Product Bonus (if createdAt is recent)
    if (metadata.createdAt) {
      const productAge = Date.now() - new Date(metadata.createdAt).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (productAge < thirtyDays) {
        score += 8; // New arrival
      }
    }

    return score;
  }

  async getCustomerOrders(customerId) {
    try {
      const orders = await safeQuery(async () => {
        return await getSharedPrismaClient().order.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });
      }, 3);

      return orders.map(order => ({
        type: 'order',
        content: `
          طلب رقم: ${order.id}
          التاريخ: ${order.createdAt.toLocaleDateString('ar-EG')}
          الحالة: ${this.translateOrderStatus(order.status)}
          المبلغ الإجمالي: ${order.total} جنيه
          المنتجات: ${order.items.map(item => item.product.name).join(', ')}
        `.trim(),
        metadata: {
          orderId: order.id,
          status: order.status,
          total: order.total,
          date: order.createdAt
        }
      }));
    } catch (error) {
      console.error('❌ Error getting customer orders:', error);
      return [];
    }
  }

  translateOrderStatus(status) {
    const statusMap = {
      'PENDING': 'قيد المراجعة',
      'CONFIRMED': 'مؤكد',
      'SHIPPED': 'تم الشحن',
      'DELIVERED': 'تم التوصيل',
      'CANCELLED': 'ملغي'
    };

    return statusMap[status] || status;
  }

  // تحديث البيانات
  async updateKnowledgeBase() {
    //console.log('🔄 Updating RAG Knowledge Base...');
    this.knowledgeBase.clear();
    await this.initializeKnowledgeBase();
  }

  // إضافة بيانات جديدة
  async addToKnowledgeBase(type, content, metadata) {
    const key = `${type}_${Date.now()}`;
    this.knowledgeBase.set(key, {
      type,
      content,
      metadata
    });

    //console.log(`✅ Added new ${type} to knowledge base`);
  }

  // استخراج المنتجات المذكورة في السياق
  extractProductsFromContext(conversationMemory) {
    const productKeywords = [];

    // البحث في الرسائل السابقة عن أسماء المنتجات
    conversationMemory.forEach(interaction => {
      const userMessage = interaction.userMessage?.toLowerCase() || '';
      const aiResponse = interaction.aiResponse?.toLowerCase() || '';

      // البحث عن كلمات مفتاحية للمنتجات
      const productPatterns = [
        /كوتشي\s*(حريمي|لمسة|سوان)/g,
        /لمسة\s*(من\s*)?سوان/g,
        /حريمي/g,
        /سوان/g
      ];

      productPatterns.forEach(pattern => {
        const userMatches = userMessage.match(pattern);
        const aiMatches = aiResponse.match(pattern);

        if (userMatches) {
          userMatches.forEach(match => {
            if (!productKeywords.includes(match.trim())) {
              productKeywords.push(match.trim());
              //console.log(`🔍 [CONTEXT] Found product in user message: "${match.trim()}"`);
            }
          });
        }

        if (aiMatches) {
          aiMatches.forEach(match => {
            if (!productKeywords.includes(match.trim())) {
              productKeywords.push(match.trim());
              //console.log(`🔍 [CONTEXT] Found product in AI response: "${match.trim()}"`);
            }
          });
        }
      });
    });

    return productKeywords;
  }

  // استخراج الكلمات المفتاحية من الاستفسار
  extractSearchTerms(query) {
    // تنظيف النص وتقسيمه إلى كلمات
    const words = query
      .toLowerCase()
      .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, ' ') // إبقاء العربية والمسافات فقط
      .split(/\s+/)
      .filter(word => word.length > 1); // إزالة الكلمات القصيرة جداً

    // إزالة كلمات الوصل والأدوات
    const stopWords = ['في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي', 'عايز', 'اشوف', 'ممكن', 'صور', 'صورة'];

    return words.filter(word => !stopWords.includes(word));
  }

  // البحث عن منتج محدد باستخدام AI للفهم المباشر
  async retrieveSpecificProduct(query, intent, customerId, conversationMemory = [], companyId = null) {
    // 🔐 تحميل منتجات الشركة المحددة فقط
    if (companyId) {
      //console.log(`🔐 [RAG] Loading products for specific search - company: ${companyId}`);
      await this.loadProductsForCompany(companyId);
    }
    try {
      //console.log(`🤖 [AI-PRODUCT-SEARCH] Using AI to understand product request: "${query}"`);

      // جمع المنتجات المتاحة مع فلترة حسب الشركة
      const availableProducts = [];
      for (const [key, item] of this.knowledgeBase.entries()) {
        if (item.type === 'product') {
          // 🔐 فلترة حسب الشركة إذا تم تمرير companyId
          if (companyId && item.metadata?.companyId && item.metadata.companyId !== companyId) {
            continue; // تخطي المنتجات من شركات أخرى
          }

          availableProducts.push({
            name: item.metadata?.name || 'منتج غير محدد',
            description: item.content || '',
            price: item.metadata?.price || 0
          });
        }
      }

      if (companyId) {
        //console.log(`🏢 [RAG] Filtered products for company ${companyId}: ${availableProducts.length} products`);
      }

      if (availableProducts.length === 0) {
        //console.log(`❌ [AI-PRODUCT-SEARCH] No products available in knowledge base`);
        return { product: null, confidence: 0, isSpecific: false };
      }

      // استخدام AI لفهم المنتج المطلوب
      //console.log(`🤖 [AI-PRODUCT-SEARCH] استدعاء AI لاختيار المنتج للشركة: ${companyId}`);
      const aiResult = await this.askAIForProductChoice(query, availableProducts, conversationMemory, companyId);

      if (aiResult && aiResult.productName && aiResult.confidence >= 0.7) {
        // البحث عن المنتج في قاعدة المعرفة
        const foundProduct = this.findProductByName(aiResult.productName);

        if (foundProduct) {
          //console.log(`✅ [AI-PRODUCT-SEARCH] AI selected: ${aiResult.productName} (Confidence: ${(aiResult.confidence * 100).toFixed(1)}%)`);
          //console.log(`🧠 [AI-REASONING] ${aiResult.reasoning}`);

          return {
            product: foundProduct,
            confidence: aiResult.confidence,
            isSpecific: true,
            reasoning: aiResult.reasoning
          };
        }
      }

      // لا نستخدم fallback - الذكاء الاصطناعي هو المسؤول الوحيد
      //console.log(`🚫 [AI-PRODUCT-SEARCH] No fallback - AI is the only decision maker`);
      //console.log(`🤖 [AI-PRODUCT-SEARCH] AI confidence was too low: ${aiResult?.confidence || 0}`);
      //console.log(`🧠 [AI-REASONING] ${aiResult?.reasoning || 'No reasoning provided'}`);

      //console.log(`❌ [AI-PRODUCT-SEARCH] No product found with AI or fallback (AI Confidence: ${aiResult?.confidence || 0})`);

      // 🔐 تحقق نهائي من العزل قبل الإرجاع
      if (companyId) {
        //console.log(`🔐 [RAG] Final isolation check - no products found for company: ${companyId}`);
      }

      return { product: null, confidence: aiResult?.confidence || 0, isSpecific: false };

    } catch (error) {
      console.error('❌ [RAG-SPECIFIC] Error in retrieveSpecificProduct:', error);
      return {
        product: null,
        confidence: 0,
        isSpecific: false
      };
    }
  }

  // تطبيع الكلمات للمطابقة الأفضل
  normalizeWordForMatching(word) {
    return word
      .replace(/ة$/g, 'ه')  // تاء مربوطة → هاء
      .replace(/ه$/g, 'ة')  // هاء → تاء مربوطة
      .replace(/ى$/g, 'ي')  // ألف مقصورة → ياء
      .replace(/أ|إ|آ/g, 'ا'); // همزات → ألف
  }

  // فحص المطابقة المرنة بين كلمتين
  isFlexibleMatch(word1, word2) {
    const normalized1 = this.normalizeWordForMatching(word1.toLowerCase());
    const normalized2 = this.normalizeWordForMatching(word2.toLowerCase());

    return normalized1 === normalized2 ||
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1);
  }

  // حساب بونص السياق للمنتج مع مراعاة طلب "منتج آخر"
  calculateContextBonus(item, conversationMemory, currentQuery = '') {
    if (!conversationMemory || conversationMemory.length === 0) {
      return 0;
    }

    let bonus = 0;
    const productName = (item.metadata?.name || '').toLowerCase();

    // فحص إذا كان العميل يطلب منتج آخر/مختلف
    const requestingDifferentProduct = this.isRequestingDifferentProduct(currentQuery);

    conversationMemory.forEach((interaction, index) => {
      const userMessage = interaction.userMessage?.toLowerCase() || '';
      const aiResponse = interaction.aiResponse?.toLowerCase() || '';

      // كلما كانت المحادثة أحدث، كلما زاد البونص
      const recencyMultiplier = conversationMemory.length - index;

      // فحص ذكر المنتج في رسالة المستخدم
      if (userMessage.includes(productName) || this.productMentionedInText(productName, userMessage)) {
        let userBonus = 15 * recencyMultiplier;

        // إذا كان يطلب منتج آخر، قلل البونص للمنتج المذكور مؤخراً
        if (requestingDifferentProduct && index === 0) {
          userBonus = Math.max(5, userBonus * 0.3); // تقليل كبير للتفاعل الأخير
          //console.log(`🔄 [CONTEXT-PENALTY] Requesting different product, reducing bonus for recent mention: ${userBonus}`);
        }

        bonus += userBonus;
        //console.log(`🧠 [CONTEXT-BONUS] Product mentioned in user message (interaction ${index + 1}): +${userBonus}`);
      }

      // فحص ذكر المنتج في رد AI
      if (aiResponse.includes(productName) || this.productMentionedInText(productName, aiResponse)) {
        let aiBonus = 10 * recencyMultiplier;

        // إذا كان يطلب منتج آخر، قلل البونص للمنتج المذكور مؤخراً
        if (requestingDifferentProduct && index === 0) {
          aiBonus = Math.max(3, aiBonus * 0.2); // تقليل أكبر للتفاعل الأخير
          //console.log(`🔄 [CONTEXT-PENALTY] Requesting different product, reducing AI bonus: ${aiBonus}`);
        }

        bonus += aiBonus;
        //console.log(`🧠 [CONTEXT-BONUS] Product mentioned in AI response (interaction ${index + 1}): +${aiBonus}`);
      }
    });

    return bonus;
  }

  // فحص إذا كان العميل يطلب منتج مختلف/آخر
  isRequestingDifferentProduct(query) {
    const differentProductKeywords = [
      'التاني', 'الثاني', 'الاخر', 'الآخر', 'غيره', 'غيرها', 'مختلف', 'تاني', 'ثاني',
      'اخر', 'آخر', 'بديل', 'غير', 'سوا', 'كمان', 'برضو', 'تاني حاجة'
    ];

    const normalizedQuery = query.toLowerCase();
    const found = differentProductKeywords.some(keyword => normalizedQuery.includes(keyword));

    if (found) {
      //console.log(`🔄 [DIFFERENT-PRODUCT] Detected request for different product in: "${query}"`);
    }

    return found;
  }

  // فحص ذكر المنتج في النص
  productMentionedInText(productName, text) {
    // تقسيم اسم المنتج إلى كلمات
    const productWords = productName.split(' ').filter(word => word.length > 2);

    // فحص وجود معظم كلمات المنتج في النص
    const foundWords = productWords.filter(word =>
      text.includes(word) ||
      this.isFlexibleMatch(word, text)
    );

    // إذا وجدت 70% من كلمات المنتج أو أكثر
    return foundWords.length >= Math.ceil(productWords.length * 0.7);
  }

  // إنشاء مفتاح cache
  createCacheKey(query, availableProducts, conversationMemory) {
    const productsKey = availableProducts.map(p => p.name).sort().join('|');
    const contextKey = conversationMemory.map(m => m.userMessage).join('|');
    return `${query}:${productsKey}:${contextKey}`;
  }

  // فحص وتنظيف cache
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.aiChoiceCache.entries()) {
      if (now - value.timestamp > this.cacheExpiryTime) {
        this.aiChoiceCache.delete(key);
      }
    }

    // تحديد حجم cache
    if (this.aiChoiceCache.size > this.cacheMaxSize) {
      const entries = Array.from(this.aiChoiceCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - this.cacheMaxSize);
      toDelete.forEach(([key]) => this.aiChoiceCache.delete(key));
    }
  }

  // استخدام AI لاختيار المنتج المناسب مع cache
  async askAIForProductChoice(query, availableProducts, conversationMemory = [], companyId = null) {
    try {
      // فحص cache أولاً
      const cacheKey = this.createCacheKey(query, availableProducts, conversationMemory);
      const cached = this.aiChoiceCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryTime) {
        console.log(`🚀 [AI-CACHE] Using cached result for: "${query.substring(0, 50)}..."`);
        console.log(`🚀 [AI-CACHE] Cached product: ${cached.result?.productName}`);
        return cached.result;
      }

      // تنظيف cache منتهي الصلاحية
      this.cleanExpiredCache();

      // 🔍 فلترة أولية: البحث عن المنتجات التي تحتوي على كلمات من الـ query
      const queryWords = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !['عايز', 'اشوف', 'ممكن', 'ابعتلي', 'وريني'].includes(word));

      // ✅ OPTIMIZATION: Log only in debug mode
      if (process.env.DEBUG_RAG) {
        this.logger.debug('[RAG-FILTER] Extracted keywords', {
          keywords: queryWords,
          totalProducts: availableProducts.length
        });
      }

      // 🔧 دالة تنظيف متقدمة للنصوص
      const normalizeText = (text) => {
        return text
          .toLowerCase()
          .replace(/^ال/, '') // إزالة "ال" التعريف من البداية
          .replace(/\s+ال/g, ' ') // إزالة "ال" من وسط النص
          .replace(/[0-9]/g, '') // إزالة الأرقام
          .replace(/[\/\-_]/g, ' ') // تحويل الرموز لمسافات
          .replace(/(.)\1+/g, '$1') // إزالة الأحرف المكررة (ساااابوه → سابوه)
          .replace(/\s+/g, ' ') // توحيد المسافات
          .trim();
      };

      // فلترة المنتجات المرشحة بدقة أعلى
      const filteredProducts = availableProducts.filter((product, index) => {
        const productNameNormalized = normalizeText(product.name);
        const queryNormalized = normalizeText(query);

        // استخراج الكلمات الأساسية من المنتج (بدون أرقام)
        const productWords = productNameNormalized.split(' ').filter(w => w.length > 2);
        const queryWordsNorm = queryNormalized.split(' ').filter(w => w.length > 2);

        // ✅ OPTIMIZATION: Log only in debug mode and only first 3 products
        if (process.env.DEBUG_RAG && index < 3) {
          this.logger.debug('[RAG-FILTER] Testing product', {
            productName: product.name,
            normalizedProduct: productNameNormalized,
            normalizedQuery: queryNormalized
          });
        }

        // Priority 1: Exact match بعد التنظيف
        if (productNameNormalized === queryNormalized) {
          if (process.env.DEBUG_RAG && index < 3) {
            this.logger.debug('[RAG-FILTER] Priority 1: Exact match', { productName: product.name });
          }
          return true;
        }

        // Priority 2: Product name يحتوي على الـ query كاملاً
        if (productNameNormalized.includes(queryNormalized)) {
          if (process.env.DEBUG_RAG && index < 3) {
            this.logger.debug('[RAG-FILTER] Priority 2: Product contains query', { productName: product.name });
          }
          return true;
        }

        // Priority 3: Query يحتوي على الـ product name كاملاً
        if (queryNormalized.includes(productNameNormalized)) {
          if (process.env.DEBUG_RAG && index < 3) {
            this.logger.debug('[RAG-FILTER] Priority 3: Query contains product', { productName: product.name });
          }
          return true;
        }

        // Priority 4: تطابق الكلمات - على الأقل كلمة واحدة مهمة (3+ أحرف)
        const matchingWords = queryWordsNorm.filter(queryWord =>
          queryWord.length >= 3 && productWords.some(prodWord =>
            prodWord.includes(queryWord) || queryWord.includes(prodWord)
          )
        );

        if (matchingWords.length > 0) {
          if (process.env.DEBUG_RAG && index < 3) {
            this.logger.debug('[RAG-FILTER] Priority 4: Word match', {
              productName: product.name,
              matchingWords
            });
          }
          return true;
        }

        return false;
      });

      this.logger.info('[RAG-FILTER] Filtered products', {
        total: availableProducts.length,
        filtered: filteredProducts.length,
        products: filteredProducts.map(p => p.name).slice(0, 5) // Log only first 5
      });

      // إذا لم يتم العثور على منتجات مطابقة، ارجع null مباشرة
      if (filteredProducts.length === 0) {
        this.logger.info('[RAG-FILTER] No products match query keywords', { query });
        return {
          productName: null,
          confidence: 0,
          reasoning: 'لم يتم العثور على منتجات تطابق الكلمات المفتاحية في الطلب'
        };
      }

      // استخدام المنتجات المفلترة فقط
      const productsToAnalyze = filteredProducts.length > 0 ? filteredProducts : availableProducts;

      // تحضير السياق
      let contextText = '';
      if (conversationMemory && conversationMemory.length > 0) {
        contextText = conversationMemory.map((interaction, index) =>
          `${index + 1}. العميل: "${interaction.userMessage}" | AI: "${interaction.aiResponse}"`
        ).join('\n');
      }

      // تحضير قائمة المنتجات المفلترة
      const productsText = productsToAnalyze.map((product, index) =>
        `${index + 1}. ${product.name} (${product.price} جنيه)`
      ).join('\n');

      const prompt = `أنت خبير دقيق جداً في مطابقة المنتجات. مهمتك إيجاد المنتج المطابق بالضبط للطلب.

طلب العميل: "${query}"

المنتجات المرشحة:
${productsText}

${contextText ? `المحادثة السابقة:\n${contextText}\n` : ''}

⚠️ قواعد المطابقة الصارمة جداً:
1. ✅ اختر المنتج ONLY إذا كان اسمه يطابق الطلب بالضبط أو يحتوي على نفس الكلمات الأساسية
2. ❌ إذا كان هناك منتجان يحتويان على كلمة مشتركة (مثل "Boot")، اختر الأقرب للطلب الأصلي
3. ❌ لا تختار منتج فقط لأنه يحتوي على جزء من الكلمة - يجب أن يكون مطابق كامل
4. ❌ إذا لم تجد مطابقة دقيقة 100%، اجعل productName = null و confidence < 0.7

أمثلة:
- طلب "GlamBoot" → اختر "GlamBoot" (مطابقة تامة) ✅
- طلب "GlamBoot" → لا تختر "Shiny Half Boot" (مختلف رغم وجود Boot) ❌
- طلب "كوتشي سوان" → اختر "كوتشي سوان سكوتشي" (يحتوي على الكلمات) ✅

أجب بـ JSON فقط:
{
  "productName": "اسم المنتج الدقيق من القائمة أو null",
  "confidence": 0.95,
  "reasoning": "سبب الاختيار بالتفصيل"
}`;

      // استخدام نفس نظام التبديل المتقدم من aiAgentService
      //console.log(`🔧 [AI-CHOICE] استخدام نظام التبديل المتقدم للشركة: ${companyId}`);

      const aiAgentService = require('./aiAgentService');

      try {
        // استخدام نفس دالة generateAIResponse مع نظام التبديل المتقدم
        const result = await aiAgentService.generateAIResponse(prompt, [], false, null, companyId);
        if (process.env.DEBUG_RAG) {
          this.logger.debug('[AI-CHOICE] AI response received', { responseLength: result.length });
        }

        // تنظيف وتحليل الرد
        let cleanResponse = result.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
        }

        try {
          const parsed = JSON.parse(cleanResponse);
          if (process.env.DEBUG_RAG) {
            this.logger.debug('[AI-CHOICE] Parsed response', parsed);
          }

          // حفظ في cache
          this.aiChoiceCache.set(cacheKey, {
            result: parsed,
            timestamp: Date.now()
          });

          return parsed;
        } catch (parseError) {
          //console.log(`⚠️ [AI-CHOICE] فشل في تحليل JSON، محاولة استخراج المعلومات:`, parseError.message);

          // محاولة استخراج المعلومات بدون JSON
          const productMatch = cleanResponse.match(/منتج[:\s]*(.+?)(?:\n|$)/i);
          const confidenceMatch = cleanResponse.match(/ثقة[:\s]*([0-9.]+)/i);

          const fallbackResult = {
            productName: productMatch ? productMatch[1].trim() : null,
            confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
            reasoning: cleanResponse.substring(0, 200)
          };

          //console.log(`🔄 [AI-CHOICE] نتيجة احتياطية:`, fallbackResult);
          return fallbackResult;
        }

      } catch (error) {
        console.error(`❌ [AI-CHOICE] خطأ في استدعاء generateAIResponse:`, error);
        return null;
      }

    } catch (error) {
      console.error(`❌ [AI-CHOICE] Error asking AI for product choice:`, error);
      return null;
    }
  }

  // البحث عن منتج بالاسم
  findProductByName(productName, companyId = null) {
    if (!productName) return null;

    // ✅ تنظيف اسم المنتج من السعر بين الأقواس قبل البحث
    // مثال: "سوان بوت (499 جنيه)" → "سوان بوت"
    let cleanedProductName = productName.trim();

    // إزالة أي محتوى بين أقواس (مثل: (499 جنيه)، (349 جنيه)، إلخ)
    cleanedProductName = cleanedProductName.replace(/\s*\([^)]*\)/g, '');

    // إزالة أي أرقام منفصلة في نهاية الاسم (مثل: "سوان بوت 499" → "سوان بوت")
    cleanedProductName = cleanedProductName.replace(/\s+\d+\s*$/, '');

    // تنظيف المسافات الزائدة
    cleanedProductName = cleanedProductName.trim();

    const normalizedSearchName = this.normalizeArabicText(cleanedProductName.toLowerCase());

    // ✅ Log only in debug mode
    if (process.env.DEBUG_RAG) {
      console.log(`🔍 [FIND-PRODUCT] Searching for: "${productName}" → cleaned: "${cleanedProductName}" (normalized: "${normalizedSearchName}")`);
    }

    let exactMatch = null;
    let bestPartialMatch = null;
    let bestMatchScore = 0;

    // ✅ FIX: البحث في productIndex بدلاً من knowledgeBase
    for (const item of this.productIndex) {
      // ✅ Filter by company if provided
      if (companyId && item.metadata?.companyId !== companyId) continue;

      const itemName = this.normalizeArabicText((item.metadata?.name || '').toLowerCase());

      // Priority 1: مطابقة دقيقة تامة
      if (itemName === normalizedSearchName) {
        if (process.env.DEBUG_RAG) {
          console.log(`  ✅ Exact match found: "${item.metadata?.name}"`);
        }
        exactMatch = item;
        break; // Stop immediately on exact match
      }

      // Priority 2: جمع مطابقات جزئية و حساب score
      const searchWords = normalizedSearchName.split(' ').filter(w => w.length > 2);
      const itemWords = itemName.split(' ').filter(w => w.length > 2);

      const matchingWords = searchWords.filter(searchWord =>
        itemWords.some(itemWord => this.isFlexibleMatch(searchWord, itemWord))
      );

      const matchPercentage = searchWords.length > 0 ? matchingWords.length / searchWords.length : 0;

      if (matchPercentage >= 0.7) {
        // Calculate similarity score (prefer shorter names with higher match %)
        const score = matchPercentage * 100 - itemWords.length; // Penalize longer names

        if (process.env.DEBUG_RAG) {
          console.log(`  🔍 Partial match: "${item.metadata?.name}" - ${matchingWords.length}/${searchWords.length} words (${(matchPercentage * 100).toFixed(0)}%) - score: ${score.toFixed(1)}`);
        }

        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestPartialMatch = item;
        }
      }
    }

    if (exactMatch) {
      if (process.env.DEBUG_RAG) {
        console.log(`✅ [FIND-PRODUCT] Returning exact match: "${exactMatch.metadata?.name}"`);
      }
      return exactMatch;
    }

    if (bestPartialMatch) {
      if (process.env.DEBUG_RAG) {
        console.log(`✅ [FIND-PRODUCT] Returning best partial match: "${bestPartialMatch.metadata?.name}" (score: ${bestMatchScore.toFixed(1)})`);
      }
      return bestPartialMatch;
    }

    if (process.env.DEBUG_RAG) {
      console.log(`❌ [FIND-PRODUCT] No match found for: "${productName}"`);
    }
    return null;
  }

  /**
   * جلب جميع المنتجات ذات الإعلان الممول (hasPromotedAd = true)
   * @param {string} companyId - معرف الشركة
   * @returns {Promise<Array>} قائمة المنتجات الممولة
   */
  async getPromotedProducts(companyId = null) {
    if (!companyId) {
      this.logger.warn('[PROMOTED-PRODUCTS] companyId is required');
      return [];
    }

    this.logger.info('[PROMOTED-PRODUCTS] Fetching promoted products', { companyId });

    // ✅ FIX: البحث في productIndex بدلاً من knowledgeBase
    // ✅ نحتاج fetch من DB للحصول على hasPromotedAd لأنها غير موجودة في productIndex metadata
    const companyProducts = this.productIndex.filter(item =>
      item.metadata?.companyId === companyId
    );

    if (companyProducts.length === 0) {
      this.logger.info('[PROMOTED-PRODUCTS] No products found in index', { companyId });
      return [];
    }

    const productIds = companyProducts.map(p => p.id);

    try {
      // Fetch products with hasPromotedAd from DB
      const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
      const promotedProducts = await safeQuery(async () => {
        return await getSharedPrismaClient().product.findMany({
          where: {
            id: { in: productIds },
            companyId: companyId,
            hasPromotedAd: true,
            isActive: true
          },
          select: {
            id: true,
            hasPromotedAd: true
          }
        });
      }, 3);

      const promotedIds = new Set(promotedProducts.map(p => p.id));
      const results = companyProducts
        .filter(item => promotedIds.has(item.id))
        .map(item => ({
          ...item,
          score: 100, // نقاط عالية للمنتجات الممولة
          key: `product_${item.id}`
        }));

      this.logger.info('[PROMOTED-PRODUCTS] Found promoted products', {
        companyId,
        count: results.length
      });

      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      this.logger.error('[PROMOTED-PRODUCTS] Error fetching promoted products', {
        companyId,
        error: error.message
      });
      return [];
    }
  }

  // حساب نقاط المطابقة للمنتج المحدد
  calculateSpecificProductScore(query, searchTerms, item, conversationMemory = []) {
    let score = 0;
    const productName = (item.metadata?.name || '').toLowerCase();
    const productContent = (item.content || '').toLowerCase();

    // بونص إضافي إذا كان المنتج مذكور في السياق
    const contextBonus = this.calculateContextBonus(item, conversationMemory, query);
    if (contextBonus > 0) {
      score += contextBonus;
      //console.log(`🧠 [SCORE] Context bonus: +${contextBonus} (product mentioned in conversation)`);
    }

    // مطابقة اسم المنتج (أعلى أولوية)
    if (productName) {
      // مطابقة تامة لاسم المنتج
      if (query.includes(productName)) {
        score += 10;
        //console.log(`🎯 [SCORE] Full name match: +10 (${productName})`);
      }

      // مطابقة جزئية لكلمات اسم المنتج
      const nameWords = productName.split(' ').filter(word => word.length > 2);
      nameWords.forEach(word => {
        if (query.includes(word)) {
          score += 5;
          //console.log(`🎯 [SCORE] Name word match: +5 (${word})`);
        }
      });
    }

    // مطابقة الكلمات المفتاحية مع المرونة
    searchTerms.forEach(term => {
      // مطابقة مباشرة
      if (productName.includes(term)) {
        score += 3;
        //console.log(`🔍 [SCORE] Search term in name: +3 (${term})`);
      } else if (productContent.includes(term)) {
        score += 1;
        //console.log(`🔍 [SCORE] Search term in content: +1 (${term})`);
      } else {
        // مطابقة مرنة
        const nameWords = productName.split(' ');
        nameWords.forEach(nameWord => {
          if (this.isFlexibleMatch(term, nameWord)) {
            score += 4; // نقاط أعلى للمطابقة المرنة
            //console.log(`🔄 [SCORE] Flexible match: +4 (${term} ≈ ${nameWord})`);
          }
        });
      }
    });

    // بونص للكلمات المميزة مع المرونة
    const uniqueWords = ['لمسة', 'سوان', 'حريمي'];
    uniqueWords.forEach(uniqueWord => {
      searchTerms.forEach(searchTerm => {
        if (this.isFlexibleMatch(searchTerm, uniqueWord) && productName.includes(uniqueWord)) {
          score += 8; // نقاط عالية للكلمات المميزة
          //console.log(`⭐ [SCORE] Unique flexible match: +8 (${searchTerm} ≈ ${uniqueWord})`);
        }
      });
    });

    return score;
  }

  // إحصائيات
  getStats() {
    const stats = {};

    for (const [key, item] of this.knowledgeBase.entries()) {
      stats[item.type] = (stats[item.type] || 0) + 1;
    }

    return {
      total: this.knowledgeBase.size,
      byType: stats
    };
  }

  /**
   * 🆕 جلب جميع الـ categories الخاصة بشركة معينة
   */
  async getCategoriesForCompany(companyId) {
    if (!companyId) {
      console.error('❌ [RAG-CATEGORIES] No companyId provided');
      return [];
    }

    try {
      const categories = await safeQuery(async () => {
        return await getSharedPrismaClient().category.findMany({
          where: {
            companyId: companyId,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            description: true
          },
          orderBy: { name: 'asc' }
        });
      }, 3);

      console.log(`✅ [RAG-CATEGORIES] تم جلب ${categories.length} تصنيف للشركة: ${companyId}`);
      return categories;
    } catch (error) {
      console.error('❌ [RAG-CATEGORIES] خطأ في جلب التصنيفات:', error);
      return [];
    }
  }

  /**
   * 🆕 الكشف عن الـ category المطلوبة من رسالة العميل باستخدام AI
   */
  async detectCategoryFromMessage(customerMessage, companyId) {
    try {
      console.log(`\n🔍 [CATEGORY-DETECTION] ===== بدء الكشف عن التصنيف =====`);
      console.log(`📝 [CATEGORY-DETECTION] رسالة العميل: "${customerMessage}"`);
      console.log(`🏢 [CATEGORY-DETECTION] معرف الشركة: ${companyId}`);

      // جلب جميع التصنيفات المتاحة
      console.log(`📦 [CATEGORY-DETECTION] جاري جلب التصنيفات المتاحة...`);
      const categories = await this.getCategoriesForCompany(companyId);

      console.log(`📊 [CATEGORY-DETECTION] عدد التصنيفات المتاحة: ${categories.length}`);

      if (categories.length === 0) {
        console.log('⚠️ [CATEGORY-DETECTION] لا توجد تصنيفات متاحة للشركة - إنهاء البحث');
        return null;
      }

      // عرض التصنيفات المتاحة
      console.log(`📋 [CATEGORY-DETECTION] التصنيفات المتاحة:`);
      categories.forEach((cat, idx) => {
        console.log(`   ${idx + 1}. ${cat.name}${cat.description ? ` (${cat.description})` : ''}`);
      });

      // تهيئة Gemini للشركة
      console.log(`🔧 [CATEGORY-DETECTION] جاري تهيئة Gemini للشركة...`);
      await this.initializeGemini(companyId);

      if (!this.genAI) {
        console.error('❌ [CATEGORY-DETECTION] Gemini غير مهيأ - إنهاء البحث');
        return null;
      }

      console.log(`✅ [CATEGORY-DETECTION] Gemini جاهز للاستخدام`);

      // إنشاء قائمة التصنيفات المتاحة
      const categoriesList = categories.map((cat, idx) =>
        `${idx + 1}. ${cat.name}${cat.description ? ` (${cat.description})` : ''}`
      ).join('\n');

      console.log(`📝 [CATEGORY-DETECTION] قائمة التصنيفات:\n${categoriesList}`);

      // بناء الـ prompt للـ AI
      const prompt = `أنت مساعد ذكي متخصص في تحليل طلبات العملاء وتحديد إذا كان الطلب لـ Category كامل أم لمنتجات محددة.

التصنيفات المتاحة:
${categoriesList}

رسالة العميل: "${customerMessage}"

مهمتك:
1. حلل رسالة العميل بعناية
2. حدد إذا كان العميل يطلب **category كامل** أم **منتجات محددة بأسمائها**

⚠️ قواعد مهمة جداً:

❌ **أرجع null في هذه الحالات** (ليس category):
- إذا ذكر العميل **أسماء منتجات محددة** (مثل: "Chelsea Boot", "GlamBoot", "Belle Boot")
- إذا ذكر العميل **أرقام موديلات** (مثل: "90/420", "83/176", "80/091")
- إذا ذكر العميل **أكثر من منتج بأسمائهم** (مثل: "عايز هاف 90/420 و سابوه 80/091")
- إذا كان الطلب محدد جداً لمنتج معين

✅ **أرجع اسم الـ category في هذه الحالات فقط**:
- إذا طلب العميل رؤية **كل** منتجات التصنيف (مثل: "عايز اشوف البوتات", "ابعتلي الكوتشيات")
- إذا طلب "كل المنتجات" → أرجع "all"
- إذا سأل عن التصنيف بشكل عام (مثل: "عندكوا ايه من الأحذية")

أمثلة:

**طلبات category (✅ أرجع category):**
- "عايز اشوف البوتات" → "بوتات" (كل البوتات)
- "ابعتلي صور الكوتشيات" → "كوتشيات" (كل الكوتشيات)
- "عندكوا ايه من الأحذية" → "احذيه حريمي" (كل الأحذية)
- "كل المنتجات" → "all"

**طلبات منتجات محددة (❌ أرجع null):**
- "عايز كوتشي Chelsea Boot" → null (منتج محدد)
- "عايز اشوف ال هاف حريمي 90/420" → null (منتج محدد برقم موديل)
- "عايز اشوف ال هاف 90/420 و سابوه 80/091" → null (منتجين محددين بأرقام موديلات)
- "ابعتلي صورة GlamBoot" → null (منتج محدد بالاسم)
- "عايز Belle Boot و Fiora Boot" → null (منتجين محددين)

**🔍 كيف تفرق:**
- لو فيه **أرقام موديل** (90/420, 83/176, إلخ) → null
- لو فيه **أسماء محددة** للمنتجات → null
- لو فيه حرف **"و"** بين منتجات → غالباً null (منتجات محددة)
- لو الطلب **عام** للتصنيف بدون تحديد → category

أرجع إجابتك بصيغة JSON فقط بدون أي نص إضافي:
{
  "categoryName": "اسم التصنيف بالضبط كما في القائمة" أو null أو "all",
  "confidence": رقم من 0 إلى 1 (ثقتك في القرار),
  "reasoning": "سبب اختيارك"
}`;

      console.log(`🤖 [CATEGORY-DETECTION] جاري استدعاء AI لتحليل الرسالة...`);

      // استخدام gemini-2.0-flash-exp لأنه متاح في v1beta API
      const modelName = "gemini-2.0-flash-exp";
      console.log(`🤖 [CATEGORY-DETECTION] استخدام الموديل: ${modelName}`);

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 20,
          maxOutputTokens: 500
        }
      });

      console.log(`⏳ [CATEGORY-DETECTION] انتظار رد AI...`);

      let result;
      let responseText;

      try {
        result = await model.generateContent(prompt);
        console.log(`✅ [CATEGORY-DETECTION] تم استلام رد من Gemini`);

        if (!result || !result.response) {
          console.error('❌ [CATEGORY-DETECTION] رد Gemini فارغ أو غير صحيح');
          console.error('📋 [CATEGORY-DETECTION] Result:', JSON.stringify(result, null, 2));
          return null;
        }

        responseText = result.response.text();
        console.log(`✅ [CATEGORY-DETECTION] تم استخراج النص من الرد`);

      } catch (aiError) {
        console.error('❌ [CATEGORY-DETECTION] خطأ في استدعاء Gemini AI:', aiError);
        console.error('📋 [CATEGORY-DETECTION] تفاصيل خطأ AI:', aiError.message);
        console.error('📍 [CATEGORY-DETECTION] Stack:', aiError.stack);
        return null;
      }

      console.log(`📨 [CATEGORY-DETECTION] رد AI:`);
      console.log(`${responseText}`);

      // استخراج JSON من الرد
      console.log(`🔍 [CATEGORY-DETECTION] استخراج JSON من الرد...`);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ [CATEGORY-DETECTION] لم يتم العثور على JSON في رد AI');
        console.error(`📝 [CATEGORY-DETECTION] الرد الكامل: ${responseText}`);
        return null;
      }

      console.log(`✅ [CATEGORY-DETECTION] تم العثور على JSON، جاري التحليل...`);
      console.log(`📝 [CATEGORY-DETECTION] JSON المستخرج: ${jsonMatch[0]}`);

      let aiResult;
      try {
        aiResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('❌ [CATEGORY-DETECTION] خطأ في تحليل JSON:', parseError);
        console.error('📝 [CATEGORY-DETECTION] JSON الخام:', jsonMatch[0]);
        return null;
      }

      console.log(`📊 [CATEGORY-DETECTION] نتيجة التحليل:`);
      console.log(`   📦 Category Name: ${aiResult.categoryName}`);
      console.log(`   📈 Confidence: ${aiResult.confidence ? (aiResult.confidence * 100).toFixed(1) + '%' : 'غير محدد'}`);
      console.log(`   🧠 Reasoning: ${aiResult.reasoning || 'غير محدد'}`);

      // التحقق من وجود الحقول المطلوبة
      // ملاحظة: categoryName يمكن أن يكون null (معناه مش category)، لكن مش undefined
      if (aiResult.categoryName === undefined || aiResult.confidence === undefined) {
        console.error('❌ [CATEGORY-DETECTION] رد AI غير كامل - categoryName أو confidence مفقود');
        console.error('📋 [CATEGORY-DETECTION] AI Result:', JSON.stringify(aiResult, null, 2));
        return null;
      }

      // إذا كان categoryName = null، هذا يعني أن الطلب لمنتج محدد وليس category
      if (aiResult.categoryName === null) {
        console.log(`✅ [CATEGORY-DETECTION] AI رد بـ null - الطلب لمنتج محدد وليس category`);
        console.log(`🧠 [CATEGORY-DETECTION] Reasoning: ${aiResult.reasoning}`);
        return aiResult; // أرجع النتيجة كاملة مع null
      }

      // إذا كانت الثقة منخفضة، أرجع null
      if (aiResult.confidence < 0.6) {
        console.log(`⚠️ [CATEGORY-DETECTION] ثقة منخفضة (${(aiResult.confidence * 100).toFixed(1)}%) - الحد الأدنى: 60%`);
        console.log(`❌ [CATEGORY-DETECTION] تم رفض النتيجة - سيتم البحث عن منتج محدد`);
        return null;
      }

      console.log(`✅ [CATEGORY-DETECTION] ثقة عالية - تم قبول النتيجة!`);
      console.log(`🎯 [CATEGORY-DETECTION] التصنيف المكتشف: "${aiResult.categoryName}"`);
      return aiResult;

    } catch (error) {
      console.error('❌ [CATEGORY-DETECTION] خطأ في الكشف عن التصنيف:', error);
      console.error('📋 [CATEGORY-DETECTION] تفاصيل الخطأ:', error.message);
      console.error('📍 [CATEGORY-DETECTION] Stack trace:', error.stack);
      return null;
    }
  }

  /**
   * 🆕 جلب جميع المنتجات من category معينة
   */
  async retrieveProductsByCategory(categoryName, companyId) {
    try {
      console.log(`\n📦 [CATEGORY-PRODUCTS] ===== بدء جلب المنتجات =====`);
      console.log(`📦 [CATEGORY-PRODUCTS] التصنيف المطلوب: "${categoryName}"`);
      console.log(`🏢 [CATEGORY-PRODUCTS] معرف الشركة: ${companyId}`);

      if (!companyId) {
        console.error('❌ [CATEGORY-PRODUCTS] لم يتم توفير companyId - إنهاء البحث');
        return { products: [], images: [] };
      }

      // حالة خاصة: كل المنتجات
      if (categoryName === 'all') {
        console.log('🌟 [CATEGORY-PRODUCTS] حالة خاصة: طلب جميع المنتجات');
        console.log('🔍 [CATEGORY-PRODUCTS] جاري البحث في قاعدة البيانات...');

        const allProducts = await safeQuery(async () => {
          return await getSharedPrismaClient().product.findMany({
            where: {
              companyId: companyId,
              isActive: true
            },
            include: {
              category: true,
              product_variants: {
                where: { isActive: true }
              }
            },
            orderBy: { name: 'asc' }
          });
        }, 3);

        console.log(`✅ [CATEGORY-PRODUCTS] تم جلب ${allProducts.length} منتج (كل المنتجات)`);

        if (allProducts.length > 0) {
          console.log(`📋 [CATEGORY-PRODUCTS] أول 3 منتجات:`);
          allProducts.slice(0, 3).forEach((p, idx) => {
            console.log(`   ${idx + 1}. ${p.name} - ${p.price} جنيه`);
          });
        }

        return this._formatProductsResponse(allProducts);
      }

      // البحث عن الـ category بالاسم
      console.log(`🔍 [CATEGORY-PRODUCTS] البحث عن التصنيف "${categoryName}" في قاعدة البيانات...`);
      const category = await safeQuery(async () => {
        return await getSharedPrismaClient().category.findFirst({
          where: {
            companyId: companyId,
            name: categoryName,
            isActive: true
          }
        });
      }, 3);

      if (!category) {
        console.log(`⚠️ [CATEGORY-PRODUCTS] التصنيف "${categoryName}" غير موجود في قاعدة البيانات`);
        console.log(`💡 [CATEGORY-PRODUCTS] تأكد من أن التصنيف موجود وفعال (isActive = true)`);
        return { products: [], images: [] };
      }

      console.log(`✅ [CATEGORY-PRODUCTS] تم العثور على التصنيف - ID: ${category.id}`);

      // جلب المنتجات من هذا التصنيف
      console.log(`🔍 [CATEGORY-PRODUCTS] جاري جلب المنتجات من التصنيف...`);
      const products = await safeQuery(async () => {
        return await getSharedPrismaClient().product.findMany({
          where: {
            companyId: companyId,
            categoryId: category.id,
            isActive: true
          },
          include: {
            category: true,
            product_variants: {
              where: { isActive: true }
            }
          },
          orderBy: { name: 'asc' }
        });
      }, 3);

      console.log(`✅ [CATEGORY-PRODUCTS] تم جلب ${products.length} منتج من التصنيف "${categoryName}"`);

      if (products.length > 0) {
        console.log(`📋 [CATEGORY-PRODUCTS] المنتجات المتاحة:`);
        products.forEach((p, idx) => {
          const imagesCount = p.images ? (typeof p.images === 'string' ? JSON.parse(p.images).length : p.images.length) : 0;
          console.log(`   ${idx + 1}. ${p.name} - ${p.price} جنيه (${imagesCount} صورة)`);
        });
      } else {
        console.log(`⚠️ [CATEGORY-PRODUCTS] لا توجد منتجات في هذا التصنيف`);
      }

      return this._formatProductsResponse(products);

    } catch (error) {
      console.error('❌ [CATEGORY-PRODUCTS] خطأ في جلب منتجات التصنيف:', error);
      console.error('📋 [CATEGORY-PRODUCTS] تفاصيل الخطأ:', error.message);
      return { products: [], images: [] };
    }
  }

  /**
   * 🔧 دالة مساعدة لتنسيق المنتجات والصور
   */
  _formatProductsResponse(products) {
    console.log(`\n🔧 [FORMAT-PRODUCTS] ===== بدء تنسيق المنتجات والصور =====`);
    console.log(`📦 [FORMAT-PRODUCTS] عدد المنتجات للتنسيق: ${products.length}`);

    const allImages = [];
    const productsInfo = [];

    for (const product of products) {
      console.log(`\n📦 [FORMAT-PRODUCTS] معالجة المنتج: ${product.name}`);

      // استخراج الصور
      let productImages = [];
      try {
        if (product.images) {
          if (typeof product.images === 'string') {
            console.log(`   🔍 [FORMAT-PRODUCTS] الصور من نوع string، جاري التحويل...`);
            productImages = JSON.parse(product.images);
          } else if (Array.isArray(product.images)) {
            console.log(`   ✅ [FORMAT-PRODUCTS] الصور من نوع array`);
            productImages = product.images;
          }
          console.log(`   📊 [FORMAT-PRODUCTS] عدد الصور الخام: ${productImages.length}`);
        } else {
          console.log(`   ⚠️ [FORMAT-PRODUCTS] لا توجد صور لهذا المنتج`);
        }
      } catch (e) {
        console.warn(`   ❌ [FORMAT-PRODUCTS] خطأ في تحليل صور المنتج ${product.name}:`, e.message);
      }

      // التحقق من صحة الصور
      const validImages = productImages.filter(img =>
        img &&
        typeof img === 'string' &&
        (img.includes('http') || img.includes('https'))
      );

      console.log(`   ✅ [FORMAT-PRODUCTS] عدد الصور الصالحة: ${validImages.length}`);

      // إضافة أول صورة فقط من كل منتج
      if (validImages.length > 0) {
        const firstImage = validImages[0];
        console.log(`   📸 [FORMAT-PRODUCTS] إضافة أول صورة فقط: ${firstImage.substring(0, 50)}...`);
        allImages.push({
          type: 'image',
          payload: {
            url: firstImage,
            title: `${product.name}`
          }
        });
      }

      // معلومات المنتج
      productsInfo.push({
        type: 'product',
        content: `منتج متاح: ${product.name}`,
        metadata: {
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          category: product.category?.name,
          description: product.description,
          images: validImages,
          hasImages: validImages.length > 0,
          companyId: product.companyId
        }
      });

      console.log(`   ✅ [FORMAT-PRODUCTS] تم إضافة المنتج للقائمة`);
    }

    console.log(`\n📊 [FORMAT-PRODUCTS] ===== الإحصائيات النهائية =====`);
    console.log(`📦 [FORMAT-PRODUCTS] إجمالي المنتجات: ${products.length}`);
    console.log(`📸 [FORMAT-PRODUCTS] إجمالي الصور: ${allImages.length}`);
    console.log(`✅ [FORMAT-PRODUCTS] التنسيق اكتمل بنجاح`);

    return {
      products: productsInfo,
      images: allImages,
      totalProducts: products.length,
      totalImages: allImages.length
    };
  }

  // تم إزالة simpleProductSearch - النظام يعتمد على الذكاء الاصطناعي فقط
}

// ✅ Vector Embeddings System for semantic search
class VectorEmbeddings {
  /**
   * Generate embedding vector for text using Google's embedding model
   * @param {Object} embeddingModel - The initialized embedding model
   * @param {string} text - Text to generate embedding for
   * @returns {Promise<Array<number>|null>} Embedding vector or null on error
   */
  static async generateEmbedding(embeddingModel, text) {
    if (!embeddingModel) {
      console.error('❌ [EMBEDDINGS] Embedding model not initialized');
      return null;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('❌ [EMBEDDINGS] Invalid text provided');
      return null;
    }

    try {
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('❌ [EMBEDDINGS] Error generating embedding:', error.message);
      return null;
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * @param {Array<number>} embedding1 - First embedding vector
   * @param {Array<number>} embedding2 - Second embedding vector
   * @returns {number} Similarity score between 0 and 1
   */
  static calculateCosineSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2) {
      return 0;
    }

    if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
      return 0;
    }

    if (embedding1.length !== embedding2.length) {
      console.error('❌ [EMBEDDINGS] Embedding dimensions mismatch');
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const norm1Sqrt = Math.sqrt(norm1);
    const norm2Sqrt = Math.sqrt(norm2);

    if (norm1Sqrt === 0 || norm2Sqrt === 0) {
      return 0;
    }

    const similarity = dotProduct / (norm1Sqrt * norm2Sqrt);

    // Handle floating point errors
    return isNaN(similarity) ? 0 : Math.max(0, Math.min(1, similarity));
  }

  /**
   * Generate embeddings for multiple texts in batches to avoid rate limits
   * @param {Object} embeddingModel - The initialized embedding model
   * @param {Array<string>} texts - Array of texts to generate embeddings for
   * @param {number} batchSize - Number of texts to process per batch
   * @returns {Promise<Array<Array<number>|null>>} Array of embedding vectors
   */
  static async generateBatchEmbeddings(embeddingModel, texts, batchSize = 10) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const embeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      console.log(`🔄 [EMBEDDINGS] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding(embeddingModel, text))
      );

      embeddings.push(...batchEmbeddings);

      // Rate limiting: wait 100ms between batches to avoid API throttling
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  }

  /**
   * Find most similar items to query using vector similarity
   * @param {Array<number>} queryEmbedding - Query embedding vector
   * @param {Array<Object>} items - Items with embedding property
   * @param {number} topK - Number of top results to return
   * @returns {Array<Object>} Top K most similar items with similarity scores
   */
  static findMostSimilar(queryEmbedding, items, topK = 20) {
    if (!queryEmbedding || !Array.isArray(items)) {
      return [];
    }

    const scoredItems = items
      .filter(item => item.embedding)
      .map(item => ({
        ...item,
        vectorScore: this.calculateCosineSimilarity(queryEmbedding, item.embedding)
      }))
      .filter(item => item.vectorScore > 0.3) // Minimum similarity threshold
      .sort((a, b) => b.vectorScore - a.vectorScore)
      .slice(0, topK);

    return scoredItems;
  }
}

// دوال مساعدة لإدارة حالة الصور
class ImageHelper {
  static getImageStatus(images) {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return {
        status: 'غير متوفرة',
        count: 0,
        hasImages: false,
        validImages: []
      };
    }

    const validImages = images.filter(img =>
      img &&
      typeof img === 'string' &&
      (img.includes('http') || img.includes('https')) &&
      img.length > 10
    );

    return {
      status: validImages.length > 0 ? 'متوفرة' : 'غير متوفرة',
      count: validImages.length,
      hasImages: validImages.length > 0,
      validImages: validImages
    };
  }

  static validateImageUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static getImageQualityInfo(images) {
    const imageInfo = this.getImageStatus(images);

    return {
      ...imageInfo,
      quality: imageInfo.hasImages ? 'جيدة' : 'غير متوفرة',
      isComplete: imageInfo.count >= 1,
      needsMore: imageInfo.count < 3
    };
  }
}

// Export both the class and a singleton instance
module.exports = new RAGService();
module.exports.ImageHelper = ImageHelper;

