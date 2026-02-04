const cron = require('node-cron');
const telegramUserbotService = require('../services/TelegramUserbotService');

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 Telegram Scheduled Messages Processor
// ═══════════════════════════════════════════════════════════════════════════════

let schedulerTask = null;

function startTelegramScheduler() {
    if (schedulerTask) {
        console.log('⚠️ [Telegram Scheduler] Already running');
        return;
    }

    // Run every minute
    schedulerTask = cron.schedule('* * * * *', async () => {
        try {
            console.log('⏰ [Telegram Scheduler] Processing scheduled messages...');
            const result = await telegramUserbotService.processScheduledMessages();
            
            if (result.success && result.processed > 0) {
                console.log(`✅ [Telegram Scheduler] Processed ${result.processed} messages`);
            }
        } catch (error) {
            // Silently handle P2021 error (table doesn't exist)
            if (error.code === 'P2021' && error.meta?.table === 'telegram_scheduled_messages') {
                // Table doesn't exist yet, skip silently
                return;
            }
            console.error('❌ [Telegram Scheduler] Error:', error);
        }
    });

    console.log('✅ [Telegram Scheduler] Started - Running every minute');
}

function stopTelegramScheduler() {
    if (schedulerTask) {
        schedulerTask.stop();
        schedulerTask = null;
        console.log('🛑 [Telegram Scheduler] Stopped');
    }
}

module.exports = {
    startTelegramScheduler,
    stopTelegramScheduler
};
