const { initializeSharedDatabase, getSharedPrismaClient } = require('../services/sharedDatabase');
const { RAGService } = require('../services/ragService');
const ragEvaluator = require('../services/rag/ragEvaluator');

async function runAudit() {
    console.log('🧪 Starting RAG Quality Audit...');

    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    // Find a company with products (preferably the one we seeded earlier)
    const company = await prisma.company.findFirst({
        where: {
            products: { some: {} }
        }
    });

    if (!company) {
        console.error('❌ No company with products found to audit.');
        process.exit(1);
    }

    console.log(`🎯 Auditing Company: ${company.name} (${company.id})`);

    const ragService = new RAGService();
    await ragService.initializeGemini(company.id);

    // Ensure products are loaded
    await ragService.loadProductsForCompany(company.id);

    console.log('🔄 Generating synthetic search queries (LLM)...');

    // Fetch real products for fallback
    const actualProducts = await prisma.product.findMany({
        where: { companyId: company.id },
        take: 5
    });

    const fallbackDataset = actualProducts.map(p => ({
        query: p.name, // Use simple name as fallback query
        expectedProductId: p.id,
        productName: p.name
    }));

    let dataset = [];
    try {
        // Try to force 1.5 flash for generation
        ragEvaluator.modelName = "gemini-1.5-flash";
        dataset = await ragEvaluator.generateSyntheticQueries(company.id, 5);
    } catch (e) {
        console.warn('⚠️ AI Query Generation failed. Using dynamic fallback test dataset.');
        dataset = fallbackDataset;
    }

    if (!dataset || dataset.length === 0) {
        console.warn('⚠️ AI generated an empty dataset. Using dynamic fallback test dataset.');
        dataset = fallbackDataset;
    }

    const report = {
        totalQueries: dataset.length,
        successTop1: 0,
        successTop3: 0,
        successTop5: 0,
        avgLatency: 0,
        avgJudgeScore: 0,
        details: []
    };

    let totalLatency = 0;
    let totalJudgeScore = 0;

    console.log(`📊 Starting Retrieval Audit for ${dataset.length} queries...`);

    for (const item of dataset) {
        const audit = await ragEvaluator.auditRetrieval(item.query, item.expectedProductId, ragService, company.id);

        if (audit.top1) report.successTop1++;
        if (audit.top3) report.successTop3++;
        if (audit.top5) report.successTop5++;

        totalLatency += audit.latency;

        // 🆕 Add judge score calculation
        try {
            console.log(`      Judging relevance...`);
            const judge = await ragEvaluator.judgeRelevance(item.query, audit.rawResults?.slice(0, 3) || [], company.id);
            audit.judgeScore = judge?.score || 0;
            audit.judgeJustification = judge?.justification || "";
            totalJudgeScore += audit.judgeScore;
        } catch (e) {
            console.warn(`      ⚠️ Judging failed: ${e.message}`);
        }

        report.details.push(audit);

        console.log(`   ${audit.top1 ? '✅' : '❌'} Query: "${item.query.substring(0, 20)}..." -> Pos: ${audit.position || 'NF'} Score: ${audit.judgeScore || 0}/10`);
    }

    report.avgLatency = totalLatency / dataset.length;
    report.avgJudgeScore = totalJudgeScore / dataset.length;
    report.accuracyTop1 = (report.successTop1 / report.totalQueries) * 100;
    report.accuracyTop3 = (report.successTop3 / report.totalQueries) * 100;


    console.log('\n==========================================');
    console.log('📊 RAG AUDIT REPORT');
    console.log('==========================================');
    console.log(`Total Queries Tested: ${report.totalQueries}`);
    console.log(`Accuracy @ Top 1:     ${report.accuracyTop1.toFixed(2)}%`);
    console.log(`Accuracy @ Top 3:     ${report.accuracyTop3.toFixed(2)}%`);
    console.log(`Avg Relevance Score:  ${report.avgJudgeScore.toFixed(2)}/10`);
    console.log(`Avg Search Latency:   ${report.avgLatency.toFixed(2)}ms`);
    console.log('==========================================\n');

    console.log('🔍 Detailed Failures (pos > 1 or NOT FOUND):');
    report.details.filter(d => !d.top1).forEach(d => {
        console.log(`- Query: "${d.query}"`);
        console.log(`  Expected ID: ${d.expectedProductId}`);
        console.log(`  Found at Pos: ${d.position || 'NOT FOUND'}`);
    });

    process.exit(0);
}

runAudit().catch(err => {
    console.error('❌ Audit failed:', err);
    process.exit(1);
});
