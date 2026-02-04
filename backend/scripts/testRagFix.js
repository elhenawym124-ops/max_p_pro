
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const ragService = require('../services/ragService');

async function testRag() {
  try {
    console.log('🚀 Starting RAG System Test (Verification Run)...');

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
    await ragService.initializeGemini(companyId);
    await ragService.initializeKnowledgeBase(companyId); 

    // 3. Load Products (Cold Start)
    console.log('📥 Loading Products (Cold Start)...');
    const startLoad = Date.now();
    await ragService.loadProductsForCompany(companyId);
    const endLoad = Date.now();
    console.log(`⏱️ Cold Load took ${endLoad - startLoad}ms`);

    // Verify KB content
    let productCount = 0;
    for (const [key, item] of ragService.knowledgeBase.entries()) {
      if (item.type === 'product' && item.metadata.companyId === companyId) {
        productCount++;
      }
    }
    console.log(`📊 KB Stats: ${productCount} products`);

    // 4. Test Cache Clearing & Reloading logic
    console.log('🧹 Clearing Cache (Simulating Product Update)...');
    ragService.clearCompanyProducts(companyId);
    
    // Verify cleared from KB
    let remainingCount = 0;
    for (const [key, item] of ragService.knowledgeBase.entries()) {
      if (item.type === 'product' && item.metadata.companyId === companyId) {
        remainingCount++;
      }
    }
    console.log(`📊 Products in KB after clear: ${remainingCount}`);
    
    if (remainingCount !== 0) {
        console.error('❌ Failed to clear products from KB');
        process.exit(1);
    }

    // 5. Reload Products (Should NOT use cache because we cleared it)
    console.log('🔄 Reloading Products (Should trigger DB fetch)...');
    const startReload = Date.now();
    await ragService.loadProductsForCompany(companyId); 
    const endReload = Date.now();
    console.log(`⏱️ Reload took ${endReload - startReload}ms`);
    
    // Verify KB content again
    let reloadedCount = 0;
    for (const [key, item] of ragService.knowledgeBase.entries()) {
      if (item.type === 'product' && item.metadata.companyId === companyId) {
        reloadedCount++;
      }
    }
    console.log(`📊 KB Stats after reload: ${reloadedCount} products`);

    if (reloadedCount > 0) {
        console.log('✅ Success: Products reloaded from DB after cache clear.');
    } else {
        console.log('❌ Failure: Products NOT reloaded. Cache invalidation might be incomplete.');
    }

    console.log('🎉 RAG System Verification Complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

testRag();
