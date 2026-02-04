const RAGService = require('../services/ragService');

// Mock Hydration to prevent DB calls
RAGService.hydrateProducts = async (liteResults) => {
    return liteResults.map(r => ({
        ...r,
        metadata: { ...r.metadata, description: 'Hydrated Description' },
        // Ensure content is generated for retrieval matching if needed
        content: `MOCKED CONTENT for ${r.metadata.name}`
    }));
};

async function runTest() {
    console.log('🚀 Starting Context Awareness Verification (ByPass Mode - Fixed Map)...');

    const product = {
        id: 'prod_1', name: 'ساعة ذكية X100', price: 1500, companyId: 'company_A',
        category: { name: 'الكترونيات' }, searchableText: 'ساعة ذكية x100 الكترونيات',
        embedding: null
    };

    // 1. Trick Service into thinking company is loaded (It's a Map!)
    RAGService.companyProductsLoaded.set('company_A', { loadedAt: Date.now() });
    RAGService.isInitialized = true;

    // 2. Clear and Push to Index manually
    RAGService.productIndex = [];
    RAGService.productIndex.push({
        id: product.id, type: 'product',
        embedding: null,
        searchableText: product.searchableText,
        metadata: product
    });

    console.log('📊 Index Manually Populated:', RAGService.productIndex.length);

    // 3. Simulate Conversation Memory
    const memory = [
        { role: 'user', content: 'عندكم ساعات؟' },
        { role: 'assistant', content: 'اه يا فندم عندنا ساعة ذكية X100 ممتازة جدا وعليها عرض' }
    ];

    // 4. Test Vague Query: "بكام؟"
    console.log('🔎 Testing Vague Query: "بكام؟"');

    // Mock embedding
    RAGService.embeddingModel = { embedContent: async () => ({ embedding: { values: [] } }) };

    try {
        const results = await RAGService.retrieveRelevantData(
            'بكام؟',
            'price_inquiry',
            'cust_1',
            'company_A',
            null,
            memory
        );

        if (results.length > 0 && results[0].metadata.name === 'ساعة ذكية X100') {
            console.log('🎉 Context Verification PASSED!');
            console.log('   Inferred Context Product: ' + results[0].metadata.name);
        } else {
            console.log('❌ Context Verification FAILED. Results:', JSON.stringify(results.map(r => r.metadata?.name)));
            console.log('   Index Size:', RAGService.productIndex.length);
        }
    } catch (e) {
        console.error('❌ Test Error:', e);
    }
}

runTest().catch(console.error);
