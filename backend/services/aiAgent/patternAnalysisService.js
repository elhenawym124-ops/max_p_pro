const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');

class PatternAnalysisService {
    constructor() {
        this.prisma = getSharedPrismaClient();
    }

    /**
     * Run daily analysis for all active companies
     */
    async runGlobalDailyAnalysis() {
        console.log('🔄 [PatternSystem] Starting global daily analysis...');
        try {
            // Get all active companies
            const companies = await this.prisma.company.findMany({
                where: { isActive: true },
                select: { id: true }
            });

            for (const company of companies) {
                await this.analyzeCompanyPatterns(company.id);
            }

            console.log('✅ [PatternSystem] Global analysis completed.');
        } catch (error) {
            console.error('❌ [PatternSystem] Global analysis failed:', error);
        }
    }

    /**
     * Analyze patterns for a specific company (Last 24 hours)
     */
    async analyzeCompanyPatterns(companyId) {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            // Fetch LearningData for last 24h
            const records = await safeQuery(async () => {
                return await this.prisma.learningData.findMany({
                    where: {
                        companyId,
                        createdAt: { gte: yesterday },
                        type: 'conversation'
                    }
                });
            });

            if (!records || records.length === 0) return;

            const analysis = {
                total: records.length,
                satisfied: 0,
                unsatisfied: 0,
                intents: {}
            };

            // Aggregation
            for (const record of records) {
                if (record.outcome === 'satisfied') analysis.satisfied++;
                if (record.outcome === 'unsatisfied' || record.outcome === 'escalated') analysis.unsatisfied++;

                let data = {};
                try {
                    data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
                } catch (e) { }

                const intent = data.intent || 'unknown';
                if (!analysis.intents[intent]) {
                    analysis.intents[intent] = { total: 0, unsatisfied: 0 };
                }
                analysis.intents[intent].total++;
                if (record.outcome === 'unsatisfied') {
                    analysis.intents[intent].unsatisfied++;
                }
            }

            // Identify Weaknesses (Intents with > 30% dissatisfaction and > 3 occurrences)
            const weaknesses = [];
            for (const [intent, stats] of Object.entries(analysis.intents)) {
                const failureRate = stats.unsatisfied / stats.total;
                if (stats.total >= 3 && failureRate > 0.3) {
                    weaknesses.push({
                        intent,
                        total: stats.total,
                        unsatisfied: stats.unsatisfied,
                        rate: (failureRate * 100).toFixed(1) + '%'
                    });
                }
            }

            if (weaknesses.length > 0) {
                console.warn(`⚠️ [PatternSystem] Detected weaknesses for ${companyId}:`, weaknesses);
                // Here we could store this in a 'Pattern' table or create an Alert
                // For now, we rely on the log or potentially creating an AINotification
                await this.createPatternAlert(companyId, weaknesses);
            }

        } catch (error) {
            console.error(`❌ [PatternSystem] Analysis failed for ${companyId}:`, error.message);
        }
    }

    async createPatternAlert(companyId, weaknesses) {
        try {
            const message = weaknesses.map(w => `- ${w.intent}: ${w.rate} failure rate (${w.unsatisfied}/${w.total})`).join('\n');

            await safeQuery(async () => {
                return await this.prisma.aINotification.create({
                    data: {
                        companyId,
                        type: 'pattern_weakness',
                        severity: 'medium',
                        title: 'Low Performance Patterns Detected',
                        message: `We detected recurring issues in the following topics:\n${message}`,
                        metadata: JSON.stringify(weaknesses)
                    }
                });
            });
        } catch (e) {
            console.error('Failed to create pattern alert:', e);
        }
    }
}

module.exports = new PatternAnalysisService();
