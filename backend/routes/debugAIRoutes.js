const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const aiAgentService = require('../services/aiAgentService');

function getPrisma() {
    return getSharedPrismaClient();
}

/**
 * Debug endpoint to check AI status for a company
 * GET /api/debug/ai-status/:companyId
 */
router.get('/ai-status/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        console.log(`🔍 [DEBUG-AI] Checking AI status for company: ${companyId}`);

        // 1. Get company info
        const company = await safeQuery(async () => {
            const prisma = getPrisma();
            return await prisma.company.findUnique({
                where: { id: companyId },
                select: { id: true, name: true }
            });
        }, 3);

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found',
                companyId
            });
        }

        // 2. Get AI settings from database
        const aiSettings = await safeQuery(async () => {
            const prisma = getPrisma();
            return await prisma.aiSettings.findUnique({
                where: { companyId },
                select: {
                    autoReplyEnabled: true,
                    replyMode: true,
                    maxRepliesPerCustomer: true,
                    ragEnabled: true,
                    multimodalEnabled: true,
                    workingHoursEnabled: true,
                    workingHours: true
                }
            });
        }, 3);

        // 3. Get active model/key info
        let activeModel = null;
        try {
            activeModel = await aiAgentService.getCurrentActiveModel(companyId);
        } catch (error) {
            console.error(`❌ [DEBUG-AI] Error getting active model:`, error.message);
            activeModel = { error: error.message };
        }

        // 4. Get recent AI responses (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAIResponses = await safeQuery(async () => {
            const prisma = getPrisma();
            return await prisma.message.count({
                where: {
                    conversation: { companyId },
                    isFromCustomer: false,
                    senderId: null, // AI messages have null senderId
                    createdAt: { gte: oneDayAgo }
                }
            });
        }, 3);

        // 5. Get connected Facebook pages
        const facebookPages = await safeQuery(async () => {
            const prisma = getPrisma();
            return await prisma.facebookPage.findMany({
                where: {
                    companyId,
                    status: 'connected'
                },
                select: {
                    id: true,
                    pageId: true,
                    pageName: true,
                    status: true
                }
            });
        }, 3);

        // 6. Cache status check (simulated - actual cache is in webhookController)
        const cacheStatus = {
            note: 'Cache status cannot be directly checked from this endpoint',
            recommendation: 'Monitor webhook logs for cache hit/miss messages'
        };

        // 7. Compile diagnostic report
        const diagnosticReport = {
            success: true,
            timestamp: new Date().toISOString(),
            company: {
                id: company.id,
                name: company.name
            },
            aiSettings: aiSettings || {
                note: 'No AI settings found for this company',
                recommendation: 'Create AI settings via admin panel'
            },
            activeModel: activeModel || {
                note: 'No active model configured',
                recommendation: 'Add and activate an AI API key'
            },
            metrics: {
                aiResponsesLast24Hours: recentAIResponses,
                connectedFacebookPages: facebookPages.length
            },
            facebookPages,
            cacheStatus,
            healthChecks: {
                hasAISettings: !!aiSettings,
                aiEnabled: aiSettings?.autoReplyEnabled || false,
                hasActiveModel: !!(activeModel && !activeModel.error),
                hasFacebookPages: facebookPages.length > 0
            },
            overallStatus: getOverallStatus(aiSettings, activeModel, facebookPages)
        };

        res.json(diagnosticReport);

    } catch (error) {
        console.error(`❌ [DEBUG-AI] Error in diagnostic endpoint:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Helper function to determine overall AI status
 */
function getOverallStatus(aiSettings, activeModel, facebookPages) {
    const checks = [];

    if (!aiSettings) {
        checks.push({ status: 'error', message: 'No AI settings configured' });
    } else if (!aiSettings.autoReplyEnabled) {
        checks.push({ status: 'warning', message: 'AI is disabled in settings' });
    } else {
        checks.push({ status: 'ok', message: 'AI is enabled' });
    }

    if (!activeModel || activeModel.error) {
        checks.push({ status: 'error', message: 'No active AI model/key' });
    } else {
        checks.push({ status: 'ok', message: `Active model: ${activeModel.model}` });
    }

    if (facebookPages.length === 0) {
        checks.push({ status: 'warning', message: 'No Facebook pages connected' });
    } else {
        checks.push({ status: 'ok', message: `${facebookPages.length} Facebook page(s) connected` });
    }

    const hasErrors = checks.some(c => c.status === 'error');
    const hasWarnings = checks.some(c => c.status === 'warning');

    return {
        overall: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
        checks,
        summary: hasErrors
            ? 'Critical issues detected - AI will not work'
            : hasWarnings
                ? 'Configuration incomplete or AI disabled'
                : 'All systems operational'
    };
}

module.exports = router;
