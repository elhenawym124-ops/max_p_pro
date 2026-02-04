/**
 * Script to clear all exhausted keys cache
 * Run this to reset the quota exhaustion state
 */

const { getModelManager } = require('./services/aiAgent/modelManager');

async function clearExhaustedCache() {
    try {
        console.log('🧹 Clearing exhausted keys cache...');

        const modelManager = getModelManager();

        if (modelManager && modelManager.stateStore) {
            await modelManager.stateStore.clearAll();
            console.log('✅ StateStore cleared successfully!');
        } else {
            console.log('⚠️ ModelManager not initialized yet. Restarting the backend server will clear the cache.');
        }

        // Also clear any cooldowns
        if (modelManager && modelManager.clearExpiredExhaustedFlags) {
            await modelManager.clearExpiredExhaustedFlags();
            console.log('✅ Exhausted flags cleared!');
        }

        console.log('\n📋 الحل الأسهل: أعد تشغيل السيرفر الخلفي (Backend) بالضغط على Ctrl+C ثم تشغيله مرة أخرى.');

    } catch (error) {
        console.error('❌ Error clearing cache:', error.message);
        console.log('\n📋 الحل البديل: أعد تشغيل السيرفر الخلفي (Backend) لمسح الذاكرة المؤقتة.');
    }
}

clearExhaustedCache();
