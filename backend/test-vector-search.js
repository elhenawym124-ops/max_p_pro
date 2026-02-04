require('dotenv').config();
const postgresVectorService = require('./services/postgresVectorService');
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function testSearch() {
    const query = "بوت حريمي"; // "Women's boot"
    const companyId = 'Central'; // Assuming central company or null depending on logic, but service handles companyId check.

    // Note: In the sync script, we used product.companyId. 
    // We need to pick a valid companyId from the DB to test properly, or pass null if global search is allowed (usually it's per company).

    const prisma = getSharedPrismaClient();
    const product = await prisma.product.findFirst();
    const validCompanyId = product ? product.companyId : null;

    if (!validCompanyId) {
        console.error('❌ No products found to get a valid companyId.');
        return;
    }

    console.log(`🔍 Testing search for "${query}" in company: ${validCompanyId}`);

    try {
        const results = await postgresVectorService.searchProducts(query, validCompanyId, 5);

        console.log(`✅ Found ${results.length} results:`);
        results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.name} (Score: ${r.score.toFixed(4)})`);
        });
    } catch (err) {
        console.error('❌ Search Failed:', err.message);
    } finally {
        await postgresVectorService.close();
        process.exit(0);
    }
}

testSearch();
