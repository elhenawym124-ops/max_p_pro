const express = require('express');
const router = express.Router();
const telegramBotService = require('../services/TelegramBotService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require('../utils/verifyToken');
const { globalSecurity } = require('../middleware/globalSecurity');

// Apply security middleware to all routes
router.use(globalSecurity);

// ═══════════════════════════════════════════════════════════════════════════════
// 🤖 Telegram Bot Management Routes
// ═══════════════════════════════════════════════════════════════════════════════

// Get status of all bots for company
router.get('/settings/status/:companyId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const userCompanyId = req.user?.companyId;

        // Verify company access
        if (companyId !== userCompanyId) {
            return res.status(403).json({ success: false, error: 'Unauthorized access' });
        }

        const bots = await getSharedPrismaClient().telegramConfig.findMany({
            where: {
                companyId,
                type: 'BOT'
            },
            select: {
                id: true,
                label: true,
                botName: true,
                botUsername: true,
                isActive: true,
                createdAt: true
            }
        });

        const formattedBots = bots.map(bot => ({
            id: bot.id,
            label: bot.label,
            username: bot.botUsername,
            running: bot.isActive && telegramBotService.bots.has(bot.id),
            active: bot.isActive
        }));

        res.json({
            success: true,
            bots: formattedBots
        });
    } catch (error) {
        console.error('❌ Error getting telegram status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Connect bot
router.post('/settings/connect', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { botToken, label } = req.body;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!botToken) {
            return res.status(400).json({ success: false, error: 'Bot token is required' });
        }

        // Create or update config
        const config = await getSharedPrismaClient().telegramConfig.create({
            data: {
                companyId,
                type: 'BOT',
                botToken,
                label: label || 'Telegram Bot',
                isActive: true
            }
        });

        // Start bot
        await telegramBotService.startBot(config.id, companyId, botToken);

        res.json({
            success: true,
            message: 'Bot connected successfully',
            data: {
                id: config.id,
                label: config.label
            }
        });
    } catch (error) {
        console.error('❌ Error connecting bot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Disconnect bot
router.post('/settings/disconnect', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.body;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!id) {
            return res.status(400).json({ success: false, error: 'Config ID is required' });
        }

        // Verify ownership
        const config = await getSharedPrismaClient().telegramConfig.findFirst({
            where: { id, companyId, type: 'BOT' }
        });

        if (!config) {
            return res.status(404).json({ success: false, error: 'Bot not found' });
        }

        // Stop bot
        await telegramBotService.stopBot(id);

        // Update config
        await getSharedPrismaClient().telegramConfig.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({
            success: true,
            message: 'Bot disconnected successfully'
        });
    } catch (error) {
        console.error('❌ Error disconnecting bot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send reply from Dashboard -> Telegram User
router.post('/bot/send', async (req, res) => {
    try {
        const { conversationId, content, attachment } = req.body;

        if (!conversationId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Missing conversationId or content'
            });
        }

        const result = await telegramBotService.sendReply(conversationId, content, attachment);

        if (result.success) {
            res.json({ success: true, message: 'Message sent via Telegram Bot' });
        } else {
            res.status(500).json({ success: false, message: result.error });
        }

    } catch (error) {
        console.error('❌ Error sending Telegram message:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 Userbot Management Routes
// ═══════════════════════════════════════════════════════════════════════════════

// Get all userbots for company
router.get('/userbots', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        const userbots = await getSharedPrismaClient().telegramConfig.findMany({
            where: {
                companyId,
                type: 'USERBOT'
            },
            select: {
                id: true,
                label: true,
                apiId: true,
                apiHash: true,
                sessionString: true,
                clientPhone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Mask sensitive data
        const safeUserbots = userbots.map(ub => ({
            ...ub,
            apiId: ub.apiId ? '***' + ub.apiId.slice(-4) : null,
            apiHash: ub.apiHash ? '***' + ub.apiHash.slice(-8) : null,
            sessionString: ub.sessionString ? '***' + ub.sessionString.slice(-10) : null
        }));

        res.json({
            success: true,
            data: safeUserbots
        });
    } catch (error) {
        console.error('❌ Error getting userbots:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create new userbot
router.post('/userbots', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { label, apiId, apiHash } = req.body;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        if (!apiId || !apiHash) {
            return res.status(400).json({ success: false, error: 'API ID and API Hash are required' });
        }

        const userbot = await getSharedPrismaClient().telegramConfig.create({
            data: {
                companyId,
                type: 'USERBOT',
                label: label || 'Telegram Userbot',
                apiId,
                apiHash,
                isActive: false
            }
        });

        res.json({
            success: true,
            data: {
                id: userbot.id,
                label: userbot.label,
                apiId: '***' + apiId.slice(-4),
                apiHash: '***' + apiHash.slice(-8),
                isActive: userbot.isActive
            }
        });
    } catch (error) {
        console.error('❌ Error creating userbot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete userbot
router.delete('/userbots/:id', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.params;

        if (!companyId) {
            return res.status(403).json({ success: false, error: 'Company ID required' });
        }

        const userbot = await getSharedPrismaClient().telegramConfig.findFirst({
            where: {
                id,
                companyId,
                type: 'USERBOT'
            }
        });

        if (!userbot) {
            return res.status(404).json({ success: false, error: 'Userbot not found' });
        }

        await getSharedPrismaClient().telegramConfig.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Userbot deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting userbot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
