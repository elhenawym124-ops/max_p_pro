const MessageHealthChecker = require('../utils/messageHealthChecker');
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const messageCheckHealth = async (req, res) => {
    try {
        //console.log(`🔍 [HEALTH-CHECK] Manual full system check`);

        // ✅ إضافة companyId للعزل الأمني
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const checker = new MessageHealthChecker();

        // ✅ تمرير companyId لل_checker
        const results = await checker.checkAllMessages(companyId);
        await checker.disconnect();

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('❌ [HEALTH-CHECK] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const messageFix = async (req, res) => {
    try {
        const { id } = req.params;
        //console.log(`🔧 [FIX-MESSAGE] Fixing message: ${id}`);

        const message = await getSharedPrismaClient().message.findUnique({
            where: { id }
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        // إذا كانت رسالة صورة، استخرج URL من metadata
        if (message.type === 'IMAGE' && message.metadata) {
            try {
                const metadata = JSON.parse(message.metadata);
                const originalAttachments = metadata.attachments;

                if (originalAttachments && originalAttachments[0] && originalAttachments[0].url) {
                    const fullUrl = originalAttachments[0].url;
                    const safeUrl = fullUrl.substring(0, 500); // قطع إلى حد آمن

                    const safeAttachments = JSON.stringify([{
                        type: 'image',
                        url: safeUrl,
                        title: null,
                        recovered: true
                    }]);

                    await getSharedPrismaClient().message.update({
                        where: { id },
                        data: {
                            content: safeUrl,
                            attachments: safeAttachments
                        }
                    });

                    //console.log(`✅ [FIX-MESSAGE] Fixed image message: ${id}`);

                    return res.json({
                        success: true,
                        message: 'Image message fixed successfully',
                        data: {
                            urlLength: safeUrl.length,
                            hasValidAttachments: true
                        }
                    });
                }
            } catch (e) {
                //console.log(`❌ [FIX-MESSAGE] Could not parse metadata: ${e.message}`);
            }
        }

        res.json({
            success: false,
            error: 'Could not fix this message'
        });

    } catch (error) {
        console.error('❌ [FIX-MESSAGE] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = { messageCheckHealth, messageFix }
