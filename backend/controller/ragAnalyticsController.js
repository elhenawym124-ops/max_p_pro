const RAGAnalytics = require('../services/rag/ragAnalytics');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

class RAGAnalyticsController {

    /**
     * Get overall search statistics (success rate, avg latency, top intents)
     * GET /api/v1/rag-analytics/stats
     */
    async getSearchStats(req, res) {
        try {
            const companyId = req.user.companyId;
            const { startDate, endDate } = req.query;

            // Default to last 30 days if not specified
            const end = endDate ? new Date(endDate) : new Date();
            const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));

            const stats = await RAGAnalytics.getSearchStats(companyId, start, end);

            // Process stats for frontend (Calculate total searches, success rate)
            let totalSearches = 0;
            let successfulSearches = 0;
            let totalLatency = 0;

            stats.forEach(s => {
                totalSearches += s._count;
                if (s.wasSuccessful) successfulSearches += s._count;
                totalLatency += (s._avg.responseTime || 0) * s._count;
            });

            const successRate = totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0;
            const avgLatency = totalSearches > 0 ? totalLatency / totalSearches : 0;

            res.json({
                success: true,
                data: {
                    totalSearches,
                    successRate: parseFloat(successRate.toFixed(1)),
                    avgLatency: Math.round(avgLatency),
                    breakdown: stats
                }
            });
        } catch (error) {
            console.error('Error fetching search stats:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch search stats' });
        }
    }

    /**
     * Get failed searches (queries with no results)
     * GET /api/v1/rag-analytics/failed-searches
     */
    async getFailedSearches(req, res) {
        try {
            const companyId = req.user.companyId;
            const { limit } = req.query;

            const failedSearches = await RAGAnalytics.getFailedSearches(companyId, limit ? parseInt(limit) : 50);

            res.json({
                success: true,
                data: failedSearches
            });
        } catch (error) {
            console.error('Error fetching failed searches:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch failed searches' });
        }
    }

    /**
     * Get top search terms (aggregated from DB)
     * GET /api/v1/rag-analytics/top-terms
     */
    async getTopSearchTerms(req, res) {
        try {
            const companyId = req.user.companyId;
            const prisma = getSharedPrismaClient();

            // Simple aggregation to find most frequent queries
            // Note: This matches exact strings. For better results, we might want to normalize later or use more advanced grouping.
            const topTerms = await prisma.searchAnalytics.groupBy({
                by: ['query'],
                where: {
                    companyId: companyId
                },
                _count: {
                    query: true
                },
                orderBy: {
                    _count: {
                        query: 'desc'
                    }
                },
                take: 20
            });

            res.json({
                success: true,
                data: topTerms.map(t => ({
                    term: t.query,
                    count: t._count.query
                }))
            });
        } catch (error) {
            console.error('Error fetching top search terms:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch top terms' });
        }
    }
    /**
     * Get RAG Traces
     * GET /api/v1/rag-analytics/traces
     */
    async getTraces(req, res) {
        try {
            const companyId = req.user.companyId;
            const prisma = getSharedPrismaClient();

            const traces = await prisma.aiTrace.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: 50,
                include: { steps: { select: { stepType: true, latencyMs: true } } }
            });

            res.json({ success: true, data: traces });
        } catch (error) {
            console.error('Error fetching traces:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch traces' });
        }
    }

    /**
     * Get Trace Details
     * GET /api/v1/rag-analytics/traces/:id
     */
    async getTraceDetails(req, res) {
        try {
            const { id } = req.params;
            const companyId = req.user.companyId;
            const prisma = getSharedPrismaClient();

            const trace = await prisma.aiTrace.findFirst({
                where: { id, companyId },
                include: { steps: { orderBy: { order: 'asc' } } }
            });

            if (!trace) {
                return res.status(404).json({ success: false, error: 'Trace not found' });
            }

            res.json({ success: true, data: trace });
        } catch (error) {
            console.error('Error fetching trace details:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch trace details' });
        }
    }
}

module.exports = new RAGAnalyticsController();
