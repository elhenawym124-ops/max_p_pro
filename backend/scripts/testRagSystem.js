
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const ragService = require('../services/ragService');

async function testRag() {
  try {
    console.log('🚀 Starting RAG System Test...');

    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    // 1. Find a company with products
    const company = await prisma.company.findFirst({
      where: {
        products: { some: {} },
        isActive: true
      },
      include: {
        products: { take: 1 }
      }
    });

    if (!company) {
      console.log('❌ No active company with products found.');
      process.exit(1);
    }

    const companyId = company.id;
    console.log(`🏢 Testing with Company: ${company.name} (${companyId})`);

    // 2. Initialize RAG Service
    console.log('🔧 Initializing RAG Service...');
    // Note: We need to initialize Gemini for the embeddings to work if we are generating them, 
    // but here we expect them to be in DB already.
    // However, vector search calculates cosine similarity which doesn't need Gemini if query embedding is mock or if we really generate query embedding.
    // Real query embedding generation needs Gemini.
    const geminiInitialized = await ragService.initializeGemini(companyId);
    console.log(`   Gemini Initialized: ${geminiInitialized}`);

    await ragService.initializeKnowledgeBase(companyId); 

    // 3. Load Products (Cold Start)
    console.log('📥 Loading Products (Cold Start)...');
    const startLoad = Date.now();
    await ragService.loadProductsForCompany(companyId);
    const endLoad = Date.now();
    console.log(`⏱️ Products loaded in ${endLoad - startLoad}ms`);

    // Verify KB content
    let productCount = 0;
    let embeddingCount = 0;
    for (const [key, item] of ragService.knowledgeBase.entries()) {
      if (item.type === 'product' && item.metadata.companyId === companyId) {
        productCount++;
        if (item.embedding) embeddingCount++;
      }
    }
    console.log(`📊 KB Stats for Company: ${productCount} products, ${embeddingCount} with embeddings`);

    if (productCount === 0) {
      console.log('⚠️ No products loaded into KB!');
    }

    // 4. Perform Search
    const product = company.products[0];
    const query = product ? product.name.split(' ')[0] : "منتج"; 
    console.log(`🔍 Searching for "${query}"...`);
    
    const startSearch = Date.now();
    const results = await ragService.retrieveRelevantData(query, 'product_inquiry', 'test-customer', companyId);
    const endSearch = Date.now();
    
    console.log(`⏱️ Search took ${endSearch - startSearch}ms`);
    console.log(`✅ Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log('   Top Result:', results[0].metadata.name);
      console.log('   Score:', results[0].score);
      console.log('   Has Embedding:', !!results[0].embedding);
      if (results[0].compressed) {
        console.log('   Compressed Data:', JSON.stringify(results[0].compressed));
      }
    }

    // 5. Test Cache (Warm Search - Load Products again)
    console.log('🔥 Testing Warm Load (Cache)...');
    const startWarm = Date.now();
    await ragService.loadProductsForCompany(companyId); 
    const endWarm = Date.now();
    console.log(`⏱️ Reload (Cache) took ${endWarm - startWarm}ms`);
    
    if ((endWarm - startWarm) > 100) {
        console.log('⚠️ Warning: Warm load took longer than expected (>100ms). Cache might not be working efficiently.');
    } else {
        console.log('✅ Cache working: Reload was instant.');
    }

    // 6. Test Cache Clearing
    console.log('🧹 Testing Cache Clearing...');
    ragService.clearCompanyProducts(companyId);
    
    // Verify cleared
    let remainingCount = 0;
    for (const [key, item] of ragService.knowledgeBase.entries()) {
      if (item.type === 'product' && item.metadata.companyId === companyId) {
        remainingCount++;
      }
    }
    console.log(`📊 Products after clear: ${remainingCount}`);
    
    if (remainingCount === 0) {
        console.log('✅ Cache cleared successfully.');
    } else {
        console.log('❌ Failed to clear cache completely.');
    }

    console.log('🎉 RAG System Test Complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

testRag();
