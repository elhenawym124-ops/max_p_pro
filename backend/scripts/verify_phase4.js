const { initializeSharedDatabase, getSharedPrismaClient } = require('../services/sharedDatabase');
const { RAGService } = require('../services/ragService');

async function testPhase4() {
    console.log('🔄 Initializing DB and RAG...');
    await initializeSharedDatabase();

    const ragService = new RAGService();
    console.log('✅ RAGService instance created');

    await ragService.initializeGemini(); // Ensure Gemini is ready
    console.log('✅ Gemini initialized');

    const company = await getSharedPrismaClient().company.findFirst();
    const companyId = company ? company.id : null;

    if (!companyId) {
        console.error('❌ No company found in DB.');
        return;
    }

    console.log(`🎯 Testing with Company ID: ${companyId}`);

    // Ensure products are loaded into Lite Index
    console.log('📥 Loading products for company...');
    await ragService.loadProductsForCompany(companyId);
    console.log(`✅ Loaded ${ragService.productIndex.filter(p => p.metadata.companyId === companyId).length} products into Lite Index`);

    // Test 1: Query Expansion
    console.log('\n--- 🧠 Test 1: Query Expansion (HyDE Lite) ---');
    const query = "ساعة ذكية رياضية";
    const expanded = await ragService.expandQueryWithAI(query, companyId);
    console.log(`Original: "${query}"`);
    console.log(`Expanded: "${expanded}"`);

    // Test 2: Advanced Search with RRF & Re-ranking
    console.log('\n--- 🚀 Test 2: Advanced Search (Vector + Text + RRF + Re-ranking) ---');
    const results = await ragService.searchProducts(query, companyId);
    console.log(`Found ${results.length} products.`);

    if (results.length > 0) {
        console.log('--- 🧪 Debug: First Result Object ---');
        console.log(JSON.stringify(results[0], null, 2));

        console.log('\nTop 3 Results:');
        results.slice(0, 3).forEach((p, i) => {
            console.log(`${i + 1}. ${p.name} (RRF Score: ${p.rrfScore || 'N/A'}) - Price: ${p.price}`);
        });
    } else {
        console.log('⚠️ No products found. Make sure you have products in the DB.');
    }

    process.exit(0);
}

testPhase4().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
