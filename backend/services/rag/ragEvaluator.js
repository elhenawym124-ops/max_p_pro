const { getSharedPrismaClient } = require('../sharedDatabase');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ragLogger = require('./ragLogger');
const aiAgentService = require('../aiAgentService');

class RAGEvaluator {
    constructor() {
        this.genAI = null;
    }

    async initializeAI(companyId = null) {
        if (this.genAI) return;
        try {
            this.currentActiveModel = await aiAgentService.getCurrentActiveModel(companyId);
            if (this.currentActiveModel && this.currentActiveModel.apiKey) {
                this.modelName = this.currentActiveModel.model || this.currentActiveModel.modelName || "gemini-1.5-flash";
                console.log(`🔧 [EVAL] Initializing Gemini (${this.modelName}) with key: ${this.currentActiveModel.apiKey.substring(0, 6)}...`);
                this.genAI = new GoogleGenerativeAI(this.currentActiveModel.apiKey);
            } else {
                console.error(`❌ [EVAL] No active API key found for company: ${companyId}`);
            }
        } catch (error) {
            console.error(`❌ [EVAL] Initialization Error:`, error);
            ragLogger.error('Failed to initialize AI for Evaluator', { error: error.message });
        }
    }

    /**
     * Generates synthetic questions for a set of products
     * @param {string} companyId 
     * @param {number} limit 
     */
    async generateSyntheticQueries(companyId, limit = 10) {
        await this.initializeAI(companyId);
        if (!this.genAI) throw new Error('AI not initialized');

        const prisma = getSharedPrismaClient();
        const products = await prisma.product.findMany({
            where: { companyId, isActive: true },
            take: limit,
            include: { category: true }
        });

        let model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: { temperature: 0.7 }
        });

        const dataset = [];

        for (const product of products) {
            let attempts = 0;
            const maxAttempts = 3;
            let success = false;

            while (attempts < maxAttempts && !success) {
                const prompt = `
            Product Name: ${product.name}
            Description: ${product.description || 'N/A'}
            Category: ${product.category?.name || 'N/A'}
    
            Task: Generate 3 diverse user search queries (in Arabic) that should ideally lead a customer to find this specific product.
            - One query should be the direct name or part of it.
            - One query should be a description of its use/benefit.
            - One query should be a "vague" or "slang" Egyptian Arabic query.
    
            Return only a JSON array of strings.
            Example: ["ساعة ابل اصدار 9", "عايز ساعة ذكية للرياضة", "بكام الساعة السمارت اللى عندكم"]
          `.trim();

                try {
                    const result = await model.generateContent(prompt);
                    let text = result.response.text().trim();

                    // 🆕 Robust cleaning for JSON
                    if (text.includes('```')) {
                        text = text.replace(/```json|```/g, '').trim();
                    }

                    // Find first [ and last ]
                    const startIdx = text.indexOf('[');
                    const endIdx = text.lastIndexOf(']');

                    if (startIdx === -1 || endIdx === -1) {
                        throw new Error(`Invalid JSON format in AI response: ${text.substring(0, 50)}...`);
                    }

                    const queries = JSON.parse(text.substring(startIdx, endIdx + 1));

                    console.log(`   ✅ [EVAL] Generated ${queries.length} queries for: ${product.name}`);

                    queries.forEach(q => {
                        dataset.push({
                            query: q,
                            expectedProductId: product.id,
                            productName: product.name
                        });
                    });
                    success = true;
                } catch (err) {
                    attempts++;
                    console.error(`   ❌ [EVAL] Attempt ${attempts} failed for ${product.name}: ${err.message}`);

                    // 🆕 Handle Rate Limits (429), Leaked Keys (403), etc.
                    // We rotate on basically ANY AI error during audit to find a working key
                    console.warn(`   ⚠️ [EVAL] AI Error detected. Rotating key and backing off...`);

                    // Report to Manager
                    if (this.currentActiveModel) {
                        try {
                            const reason = err.message.includes('429') ? 'RPM' : 'UNKNOWN';
                            await aiAgentService.markModelAsExhaustedFrom429(
                                this.modelName,
                                reason,
                                companyId,
                                this.currentActiveModel.modelId,
                                err.message
                            );
                        } catch (e) { }
                    }

                    // Wait backoff
                    await new Promise(r => setTimeout(r, 2000));

                    // Reset and Re-initialize
                    this.genAI = null;
                    await this.initializeAI(companyId);

                    if (this.genAI) {
                        // Re-instantiate model
                        model = this.genAI.getGenerativeModel({
                            model: this.modelName,
                            generationConfig: { temperature: 0.7 }
                        });
                    } else {
                        console.error(`   ❌ [EVAL] Failed to re-initialize AI. No keys left?`);
                        break;
                    }
                }
            }
        }

        return dataset;
    }

    /**
     * Audits the retrieval performance for a given query
     */
    async auditRetrieval(query, expectedProductId, ragService, companyId) {
        const startTime = Date.now();
        const results = await ragService.searchProducts(query, companyId);
        const duration = Date.now() - startTime;

        if (results.length > 0) {
            console.log(`      DEBUG: query="${query.substring(0, 15)}" top1_id="${results[0].id}" expected="${expectedProductId}"`);
        } else {
            console.log(`      DEBUG: query="${query.substring(0, 15)}" NO RESULTS AT ALL`);
        }

        const top1 = results[0]?.id === expectedProductId;
        const top3 = results.slice(0, 3).some(p => p.id === expectedProductId);
        const top5 = results.slice(0, 5).some(p => p.id === expectedProductId);

        // Position finding
        const position = results.findIndex(p => p.id === expectedProductId);

        return {
            query,
            expectedProductId,
            found: position !== -1,
            position: position !== -1 ? position + 1 : null,
            top1,
            top3,
            top5,
            latency: duration,
            resultsCount: results.length,
            rawResults: results // Keep for judging
        };
    }

    /**
     * LLM-as-a-Judge: Rates the overall relevance of the top results
     */
    async judgeRelevance(query, results, companyId) {
        await this.initializeAI(companyId);
        if (!this.genAI) return null;

        const model = this.genAI.getGenerativeModel({ model: this.modelName });

        const resultsSummary = results.slice(0, 5).map((r, i) =>
            `[${i + 1}] Name: ${r.name}, Description: ${r.description?.substring(0, 50)}...`
        ).join('\n');

        const prompt = `
      Search Query: "${query}"
      Top 5 Results:
      ${resultsSummary}

      Task: Rate the relevance of these search results to the query on a scale of 0 to 10.
      Justify your score briefly in one sentence.
      Return JSON: { "score": 8, "justification": "..." }
    `.trim();

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            return JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
        } catch (err) {
            return { score: 0, justification: "Judge failed: " + err.message };
        }
    }

    async runFullAudit(companyId, ragService, limit = 10) {
        ragLogger.info(`Starting Full RAG Audit for company ${companyId}`);
        const dataset = await this.generateSyntheticQueries(companyId, limit);
        const report = {
            totalQueries: dataset.length,
            successTop1: 0,
            successTop3: 0,
            successTop5: 0,
            avgLatency: 0,
            details: []
        };

        let totalLatency = 0;

        for (const item of dataset) {
            const audit = await this.auditRetrieval(item.query, item.expectedProductId, ragService, companyId);

            if (audit.top1) report.successTop1++;
            if (audit.top3) report.successTop3++;
            if (audit.top5) report.successTop5++;

            totalLatency += audit.latency;

            // 🆕 Enable LLM-as-a-Judge Relevance Score
            try {
                // Judge the top 3 results for quality assessment
                const judge = await this.judgeRelevance(item.query, audit.rawResults?.slice(0, 3) || [], companyId);
                audit.judgeScore = judge?.score || 0;
                audit.judgeJustification = judge?.justification || "";
            } catch (e) {
                audit.judgeScore = 0;
            }

            report.details.push(audit);
        }

        report.avgLatency = totalLatency / dataset.length;
        report.accuracyTop1 = (report.successTop1 / report.totalQueries) * 100;
        report.accuracyTop3 = (report.successTop3 / report.totalQueries) * 100;

        return report;
    }
}

module.exports = new RAGEvaluator();
