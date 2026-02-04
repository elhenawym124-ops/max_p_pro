// FIX: Mock first before requiring service to ensure destructuring picks up the mock
const sharedDatabase = require('../services/sharedDatabase');

const dummyProducts = [
    {
        id: 'prod_1', name: 'Red Running Shoe', price: 500, companyId: 'company_A', category: { name: 'Shoes' },
        embedding: JSON.stringify([0.1, 0.2, 0.3])
    },
    {
        id: 'prod_2', name: 'Blue T-Shirt', price: 100, companyId: 'company_A', category: { name: 'Clothes' },
        embedding: null
    },
    {
        id: 'prod_3', name: 'Green Hat', price: 50, companyId: 'company_B', category: { name: 'Accessories' },
        embedding: null
    }
];

// Mock Prisma
const mockPrisma = {
    product: {
        findMany: async (args) => {
            console.log('🔍 [MOCK-DB] findMany called with:', JSON.stringify(args, null, 2));

            // CASE 1: Load Products by Company
            if (args.where && args.where.companyId === 'company_A') {
                return dummyProducts;
            }

            // CASE 2: Hydrate Products by IDs
            if (args.where && args.where.id && args.where.id.in) {
                const ids = args.where.id.in;
                return dummyProducts.filter(p => ids.includes(p.id));
            }
            return [];
        }
    }
};

// Override
sharedDatabase.getSharedPrismaClient = () => mockPrisma;

// NOW require the service
const RAGService = require('../services/ragService');

async function runTest() {
    console.log('🚀 Starting RAG Verification...');

    // 1. Check Init
    console.log('Values in Index:', RAGService.productIndex ? RAGService.productIndex.length : 'undefined');

    // 2. Load Dummy Products via Company ID (Mock DB will handle fetching)
    console.log('📥 Loading products for company_A...');
    await RAGService.loadProducts('company_A');

    console.log('📊 Index Size:', RAGService.productIndex.length);
    // We expect 2 products for company_A (prod_1, prod_2). prod_3 is company_B.
    if (RAGService.productIndex.length !== 2) {
        console.error('❌ Index size mismatch! Expected 2, got ' + RAGService.productIndex.length);
        // Proceed anyway to see search results
    }

    // 3. Test Search (Hybrid)
    console.log('🔎 Testing Search: "Red Shoe" for company_A');
    // Mock embedding generation
    RAGService.embeddingModel = {
        embedContent: async () => ({ embedding: { values: [0.1, 0.2, 0.35] } })
    };

    // Force search
    const results = await RAGService.searchProducts('Red Shoe', 'company_A');

    console.log('✅ Search Results:', JSON.stringify(results, null, 2));

    if (results.length > 0 && results[0].id === 'prod_1') {
        console.log('🎉 Verification PASSED!');
    } else {
        console.error('❌ Verification FAILED');
    }
}

runTest().catch(console.error);
