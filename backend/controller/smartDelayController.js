const ragService = require('../services/ragService');
const getSmartDelayStats = async (req, res) => {
    try {
        const stats = {
            activeQueues: messageQueue.size,
            queueDetails: [],
            systemConfig: MESSAGE_DELAY_CONFIG,
            systemHealth: messageQueue.size < 100 ? 'healthy' : 'busy',
            timestamp: new Date().toISOString()
        };

        // تفاصيل كل queue نشط
        for (const [senderId, queueData] of messageQueue.entries()) {
            stats.queueDetails.push({
                senderId: senderId.substring(0, 8) + '***', // إخفاء جزء من المعرف للخصوصية
                messagesCount: queueData.messages.length,
                waitingTime: Date.now() - queueData.lastMessageTime,
                totalWaitTime: queueData.totalWaitTime,
                hasTimer: !!queueData.timer
            });
        }

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

const getSmartDelayConfig = async (req, res) => {
    try {
        const { delays, maxDelay, shortMessageLength, longMessageLength } = req.body;

        if (delays) {
            Object.assign(MESSAGE_DELAY_CONFIG.DELAYS, delays);
        }

        if (maxDelay) {
            MESSAGE_DELAY_CONFIG.MAX_DELAY = maxDelay;
        }

        if (shortMessageLength) {
            MESSAGE_DELAY_CONFIG.SHORT_MESSAGE_LENGTH = shortMessageLength;
        }

        if (longMessageLength) {
            MESSAGE_DELAY_CONFIG.LONG_MESSAGE_LENGTH = longMessageLength;
        }

        //console.log('⚙️ [SMART-DELAY] تم تحديث الإعدادات:', MESSAGE_DELAY_CONFIG);

        res.json({
            success: true,
            message: 'تم تحديث الإعدادات بنجاح',
            newConfig: MESSAGE_DELAY_CONFIG
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

const getSmartDelayflush = async (req, res) => {
    try {
        const flushedQueues = [];

        for (const [senderId, queueData] of messageQueue.entries()) {
            if (queueData.timer) {
                clearTimeout(queueData.timer);
            }

            if (queueData.messages.length > 0) {
                await processQueuedMessages(senderId, queueData.messages);
                flushedQueues.push({
                    senderId: senderId.substring(0, 8) + '***',
                    messagesCount: queueData.messages.length
                });
            }
        }

        messageQueue.clear();

        //console.log('🚨 [SMART-DELAY] تم إجبار معالجة جميع الرسائل المؤقتة');

        res.json({
            success: true,
            message: `تم معالجة ${flushedQueues.length} قائمة رسائل`,
            flushedQueues: flushedQueues
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

const getSmartDelayRetryRag = async (req, res) => {
    try {
        //console.log('🔄 [RAG] طلب إعادة تحميل قاعدة المعرفة...');
        const success = await ragService.retryInitialization();
        if (success) {
            res.json({
                success: true,
                message: 'تم تحميل قاعدة المعرفة بنجاح',
                ragInitialized: true
            });
        } else {
            res.json({
                success: false,
                message: 'فشل في تحميل قاعدة المعرفة، تحقق من الاتصال بقاعدة البيانات',
                ragInitialized: false
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            ragInitialized: false
        });
    }
}

module.exports ={
    getSmartDelayStats , 
    getSmartDelayConfig ,
    getSmartDelayflush ,
    getSmartDelayRetryRag
}