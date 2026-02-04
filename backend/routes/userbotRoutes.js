const express = require('express');
const router = express.Router();
const telegramUserbotService = require('../services/TelegramUserbotService');
const verifyToken = require('../utils/verifyToken');

// Apply authentication to all routes
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);

// 1. Login (Send Code)
router.post('/login', async (req, res) => {
    try {
        console.log('📥 [ROUTE] /login called with body:', JSON.stringify(req.body, null, 2));
        console.log('📥 [ROUTE] User from token:', req.user ? { id: req.user.id, companyId: req.user.companyId } : 'NO USER');

        const companyId = req.user?.companyId;
        const { userbotConfigId, phoneNumber } = req.body;

        console.log('🔍 [ROUTE] Extracted data:', { companyId, userbotConfigId, phoneNumber });

        if (!companyId) {
            console.error('❌ [ROUTE] Company ID missing');
            return res.status(403).json({ error: 'Company ID required' });
        }

        if (!userbotConfigId) {
            console.error('❌ [ROUTE] userbotConfigId missing');
            return res.status(400).json({ error: 'Userbot configuration ID is required' });
        }

        if (!phoneNumber) {
            console.error('❌ [ROUTE] phoneNumber missing');
            return res.status(400).json({ error: 'Phone number is required' });
        }

        console.log('🚀 [ROUTE] Calling telegramUserbotService.sendCode...');
        console.log('🚀 [ROUTE] Service instance:', telegramUserbotService ? 'EXISTS' : 'MISSING');

        let result;
        try {
            result = await telegramUserbotService.sendCode(userbotConfigId, companyId, phoneNumber);
            console.log('📤 [ROUTE] sendCode result:', { success: result.success, error: result.error });
        } catch (serviceError) {
            console.error('❌ [ROUTE] Service error:', serviceError);
            console.error('❌ [ROUTE] Service error message:', serviceError.message);
            console.error('❌ [ROUTE] Service error stack:', serviceError.stack);
            return res.status(500).json({
                error: serviceError.message || 'Service error',
                details: process.env.NODE_ENV === 'development' ? serviceError.stack : undefined
            });
        }

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('❌ [ROUTE] Error in /login route:', error);
        console.error('❌ [ROUTE] Error message:', error.message);
        console.error('❌ [ROUTE] Error stack:', error.stack);
        res.status(500).json({
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 2. Verify (Sign In)
router.post('/verify', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId, code, password } = req.body; // password for 2FA if needed

        if (!companyId) {
            return res.status(403).json({ error: 'Company ID required' });
        }

        if (!userbotConfigId) {
            return res.status(400).json({ error: 'Userbot configuration ID is required' });
        }

        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }

        const result = await telegramUserbotService.signIn(userbotConfigId, companyId, code, password);
        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Get Dialogs (Chats)
router.get('/dialogs', async (req, res) => {
    try {
        console.log('📥 [ROUTE] /dialogs called with query:', req.query);
        const companyId = req.user?.companyId;
        const { userbotConfigId } = req.query;

        console.log('🔍 [ROUTE] Extracted data:', { companyId, userbotConfigId });

        if (!companyId) {
            console.error('❌ [ROUTE] Company ID missing');
            return res.status(403).json({ error: 'Company ID required' });
        }

        if (!userbotConfigId) {
            console.error('❌ [ROUTE] userbotConfigId missing');
            return res.status(400).json({ error: 'Userbot configuration ID is required' });
        }

        console.log('🚀 [ROUTE] Calling telegramUserbotService.getDialogs...');
        const result = await telegramUserbotService.getDialogs(userbotConfigId, companyId);
        console.log('📤 [ROUTE] getDialogs result:', { success: result.success, dataLength: result.data?.length, error: result.error });

        if (result.success) {
            // Safe JSON response handling BigInt
            const safeStringify = (data) => JSON.stringify(data, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            );
            res.setHeader('Content-Type', 'application/json');
            res.send(safeStringify(result));
        } else {
            console.error('❌ [ROUTE] getDialogs failed:', result.error);
            // Return 401 for auth errors/session expired, 400 for bad requests, 500 for others
            const status = result.error === 'AUTH_KEY_UNREGISTERED' || result.requiresReauth ? 401 :
                (result.error && result.error.includes('Not logged in')) ? 401 :
                    500;
            res.status(status).json(result);
        }
    } catch (error) {
        console.error('❌ [ROUTE] Error in /dialogs route:', error);
        res.status(500).json({
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 4. Send Message
router.post('/message', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId, chatId, message } = req.body;

        if (!companyId) {
            return res.status(403).json({ error: 'Company ID required' });
        }

        if (!userbotConfigId) {
            return res.status(400).json({ error: 'Userbot configuration ID is required' });
        }

        if (!chatId || !message) {
            return res.status(400).json({ error: 'Chat ID and message are required' });
        }

        const result = await telegramUserbotService.sendMessage(userbotConfigId, companyId, chatId, message);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Get Messages (History)
router.get('/messages', async (req, res) => {
    try {
        console.log('📥 [ROUTE] /messages called with query:', req.query);
        const companyId = req.user?.companyId;
        const { userbotConfigId, chatId, limit } = req.query;

        console.log('🔍 [ROUTE] Extracted data:', { companyId, userbotConfigId, chatId, limit });

        if (!companyId) {
            console.error('❌ [ROUTE] Company ID missing');
            return res.status(403).json({ error: 'Company ID required' });
        }

        if (!userbotConfigId) {
            console.error('❌ [ROUTE] userbotConfigId missing');
            return res.status(400).json({ error: 'Userbot configuration ID is required' });
        }

        if (!chatId) {
            console.error('❌ [ROUTE] chatId missing');
            return res.status(400).json({ error: 'Chat ID is required' });
        }

        console.log('🚀 [ROUTE] Calling telegramUserbotService.getMessages...');
        const result = await telegramUserbotService.getMessages(userbotConfigId, companyId, chatId, parseInt(limit) || 50);
        console.log('📤 [ROUTE] getMessages result:', { success: result.success, dataLength: result.data?.length, error: result.error });

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('❌ [ROUTE] Error in /messages route:', error);
        console.error('❌ [ROUTE] Error stack:', error.stack);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router;

// 6. Logout
router.post('/logout', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId } = req.body;

        if (!companyId) {
            return res.status(403).json({ error: 'Company ID required' });
        }

        if (!userbotConfigId) {
            return res.status(400).json({ error: 'Userbot configuration ID is required' });
        }

        const result = await telegramUserbotService.logout(userbotConfigId, companyId);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Get Message Media
router.get('/message/media', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId, chatId, messageId } = req.query;

        if (!companyId || !userbotConfigId || !chatId || !messageId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await telegramUserbotService.downloadMedia(userbotConfigId, companyId, chatId, messageId);

        if (result.success && result.buffer) {
            res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
            res.send(result.buffer);
        } else {
            console.error('❌ [ROUTE] Media download failed:', result.error);
            res.status(404).json(result);
        }
    } catch (error) {
        console.error('❌ [ROUTE] Error in /message/media:', error);
        res.status(500).json({ error: error.message });
    }
});

// 8. Send File (Uses multer for file handling)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Store in memory to pass buffer

router.post('/message/file', upload.single('file'), async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { userbotConfigId, chatId, caption } = req.body;
        const file = req.file;

        if (!companyId) {
            return res.status(403).json({ error: 'Company ID required' });
        }

        if (!userbotConfigId) {
            return res.status(400).json({ error: 'Userbot configuration ID is required' });
        }

        if (!chatId || !file) {
            return res.status(400).json({ error: 'Chat ID and file are required' });
        }

        const result = await telegramUserbotService.sendFile(userbotConfigId, companyId, chatId, file.buffer, file.originalname, caption);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
