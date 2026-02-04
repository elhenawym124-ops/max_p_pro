/**
 * Safe JSON Parse Utility
 * 
 * Provides a robust wrapper around JSON.parse to prevent crashes from malformed JSON.
 * Returns a fallback value (defaulting to null or {}) on failure instead of throwing.
 */

const safeJsonParse = (jsonString, fallback = null) => {
    if (jsonString === null || jsonString === undefined) {
        return fallback;
    }

    // If it's already an object, return it (handle specific case where object is passed)
    if (typeof jsonString === 'object') {
        return jsonString;
    }

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        // Optional: Log error if needed, but usually we want silent failover for defensive coding
        // console.warn(`⚠️ [SAFE-JSON] Failed to parse JSON: ${error.message}`);
        return fallback;
    }
};

module.exports = {
    safeJsonParse
};
