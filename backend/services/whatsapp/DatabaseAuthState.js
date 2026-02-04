/**
 * 📱 Database Auth State Adapter for Baileys
 * تخزين بيانات المصادقة في قاعدة البيانات بدلاً من ملفات JSON
 * 
 * هذا يحل مشكلة كثرة الملفات ويحسن الأداء
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues // ❌ Removed to prevent early loading issues
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');

// Dynamic import for Baileys
let initAuthCreds, BufferJSON;
const initBaileysAuth = async () => {
  const baileys = await import('@whiskeysockets/baileys');
  initAuthCreds = baileys.initAuthCreds;
  BufferJSON = baileys.BufferJSON;
};

// Cache للحالة لتقليل استعلامات قاعدة البيانات
const authStateCache = new Map();

// Debounce timer للحفظ لتقليل استعلامات قاعدة البيانات
const saveTimers = new Map();
const SAVE_DEBOUNCE_MS = 1000; // حفظ بعد ثانية واحدة من آخر تحديث

/**
 * استخدام قاعدة البيانات لتخزين حالة المصادقة
 * @param {string} sessionId - معرف الجلسة
 * @returns {Promise<{state: object, saveCreds: function}>}
 */
async function useDatabaseAuthState(sessionId) {
    // Initialize Baileys if not already done
    if (!initAuthCreds) {
        await initBaileysAuth();
    }

    // تحميل البيانات من قاعدة البيانات
    let authData = await loadAuthState(sessionId);

    // تهيئة الحالة
    let state = {
        creds: authData.creds || initAuthCreds(),
        keys: {} // سيتم استبداله بالـ interface لاحقاً
    };

    // تخزين بيانات المفاتيح في متغير منفصل
    let keysData = authData.keys || {};

    // دالة تحميل الحالة من قاعدة البيانات
    async function loadAuthState(sessionId) {
        // التحقق من الـ cache أولاً
        if (authStateCache.has(sessionId)) {
            return authStateCache.get(sessionId);
        }

        const session = await getSharedPrismaClient().whatsAppSession.findUnique({
            where: { id: sessionId },
            select: { authState: true }
        });

        let authData = { creds: null, keys: {} };

        if (session?.authState) {
            try {
                // استخدام BufferJSON.reviver لاستعادة Buffers
                if (!BufferJSON) {
                    await initBaileysAuth();
                }
                authData = JSON.parse(session.authState, BufferJSON.reviver);
            } catch (error) {
                console.error(`❌ Error parsing auth state for session ${sessionId}:`, error);
            }
        }

        // حفظ في الـ cache
        authStateCache.set(sessionId, authData);
        return authData;
    }

    // دالة حفظ الحالة في قاعدة البيانات (مع debouncing)
    async function saveAuthState(immediate = false) {
        // إلغاء الـ timer السابق إن وجد
        if (saveTimers.has(sessionId)) {
            clearTimeout(saveTimers.get(sessionId));
            saveTimers.delete(sessionId);
        }

        // إذا كان فوري (مثل عند حفظ creds) أو debounce
        const saveFunction = async () => {
            try {
                const dataToSave = {
                    creds: state.creds,
                    keys: keysData // حفظ بيانات المفاتيح النظيفة
                };

                await getSharedPrismaClient().whatsAppSession.update({
                    where: { id: sessionId },
                    data: {
                        // استخدام BufferJSON.replacer لحفظ Buffers
                        authState: JSON.stringify(dataToSave, BufferJSON.replacer, 2),
                        updatedAt: new Date()
                    }
                });

                // تحديث الـ cache
                authStateCache.set(sessionId, dataToSave);

                console.log(`✅ Auth state saved to database for session ${sessionId}`);
            } catch (error) {
                if (isPermissionError(error)) {
                    // Silently handle permission errors - they're expected if DB user lacks UPDATE permissions
                    // Only log in development mode
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`⚠️ [DB-PERMISSION] Cannot save auth state for session ${sessionId}: ${getPermissionErrorMessage(error)}`);
                    }
                } else {
                    console.error(`❌ Error saving auth state for session ${sessionId}:`, error);
                }
            } finally {
                saveTimers.delete(sessionId);
            }
        };

        if (immediate) {
            await saveFunction();
        } else {
            // Debounce: انتظر قبل الحفظ
            const timer = setTimeout(saveFunction, SAVE_DEBOUNCE_MS);
            saveTimers.set(sessionId, timer);
        }
    }

    // إنشاء key management object متوافق مع Baileys
    const keys = {
        get: async (type, ids) => {
            // يمكننا إعادة التحميل هنا إذا أردنا التأكد من التزامن عبر العمليات
            // ولكن للتبسيط سنعتمد على الذاكرة المحلية + التحديثات
            // authData = await loadAuthState(sessionId); 
            // keysData = authData.keys || {}; 

            if (!keysData[type]) {
                return {};
            }

            const result = {};
            for (const id of ids) {
                const keyId = String(id);
                if (keysData[type][keyId]) {
                    result[keyId] = keysData[type][keyId];
                }
            }
            return result;
        },
        set: async (data) => {
            // data format: { 'session': { 'id1': {...}, 'id2': {...} }, 'pre-key': {...} }
            for (const category in data) {
                if (!keysData[category]) {
                    keysData[category] = {};
                }

                // دمج البيانات الجديدة
                for (const keyId in data[category]) {
                    keysData[category][String(keyId)] = data[category][keyId];
                }
            }

            // حفظ في قاعدة البيانات
            await saveAuthState();
        }
    };

    // ربط keys object بالحالة
    state.keys = keys;

    // دالة حفظ بيانات المصادقة (فوري - بدون debounce)
    const saveCreds = async () => {
        await saveAuthState(true); // immediate = true
    };

    return {
        state,
        saveCreds
    };
}

module.exports = {
    useDatabaseAuthState
};


