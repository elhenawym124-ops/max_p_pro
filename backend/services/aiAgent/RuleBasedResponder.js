/**
 * Rule-Based Responder (Production-Grade)
 * 
 * ✅ Multi-Tenant Support - Company-specific responses
 * ✅ Per-Intent Confidence Thresholds
 * ✅ Context Awareness - Respects active flows
 * ✅ Structured Logging
 * ✅ Kill-Switch via Feature Flag
 */

class RuleBasedResponder {
    constructor() {
        // ===============================
        // DEFAULT RESPONSES (FALLBACK)
        // ===============================
        this.defaultResponses = {
            greeting: {
                ar_eg: [
                    "وعليكم السلام! كيف أقدر أساعدك؟ 😊",
                    "أهلاً وسهلاً! إزي أقدر أخدمك النهارده؟",
                    "مرحباً! عندك أي استفسار؟ 💬"
                ],
                ar_gulf: [
                    "وعليكم السلام! شلونك؟ شخبارك؟",
                    "هلا والله! كيف أقدر أخدمك؟",
                    "أهلين! شلون أساعدك؟"
                ],
                formal: [
                    "وعليكم السلام ورحمة الله. كيف يمكنني مساعدتك؟",
                    "أهلاً وسهلاً. تحت أمرك."
                ]
            },
            thanks: {
                ar_eg: [
                    "العفو! لو محتاج أي حاجة تانية أنا هنا 😊",
                    "تحت أمرك دايماً! 🙏"
                ],
                ar_gulf: [
                    "يا هلا! خدمتك واجب علينا",
                    "ما سوينا شي! أي خدمة ثانية؟"
                ],
                formal: [
                    "عفواً، هذا واجبنا. هل هناك شيء آخر؟"
                ]
            },
            confirmation: {
                ar_eg: [
                    "تمام! هل تحتاج مساعدة في شيء آخر؟",
                    "ممتاز! أي خدمة تانية؟"
                ],
                ar_gulf: [
                    "تمام! شي ثاني تبي مساعدة فيه؟"
                ],
                formal: [
                    "تم. هل تحتاج إلى مساعدة إضافية؟"
                ]
            },
            farewell: {
                ar_eg: [
                    "في أمان الله! نتشرف بخدمتك 👋",
                    "مع السلامة! لو احتجت أي حاجة رجعلي 💬"
                ],
                ar_gulf: [
                    "مع السلامة! نورتنا 👋",
                    "الله يحفظك! ننتظرك دوم"
                ],
                formal: [
                    "في أمان الله. كانت سعادتنا بخدمتك."
                ]
            }
        };

        // ===============================
        // PER-INTENT CONFIDENCE THRESHOLDS
        // ===============================
        this.intentConfidence = {
            greeting: 0.70,     // تحيات شائعة - threshold منخفض
            thanks: 0.70,       // شكر بسيط
            confirmation: 0.85, // تأكيدات - أعلى لتجنب الخطأ
            farewell: 0.80      // وداع
        };

        // ===============================
        // PATTERNS FOR DETECTION
        // ===============================
        this.patterns = {
            greeting: [
                /^السلام\s*عليكم$/i, /^السلام$/i, /^سلام$/i,
                /^أهلا$/i, /^أهلاً$/i, /^مرحبا$/i, /^مرحباً$/i,
                /^هلو$/i, /^هاي$/i, /^hi$/i, /^hello$/i, /^hey$/i,
                /^صباح الخير$/i, /^مساء الخير$/i,
                /^شلونك$/i, /^هلا$/i  // Gulf patterns
            ],
            thanks: [
                /^شكرا$/i, /^شكراً$/i, /^شكرًا$/i, /^مشكور$/i,
                /^تسلم$/i, /^thanks$/i, /^thank you$/i, /^thx$/i,
                /^الله يعطيك العافية$/i, /^يعطيك العافية$/i,
                /^مشكورين$/i, /^تسلمون$/i  // Gulf patterns
            ],
            confirmation: [
                /^تمام$/i, /^اوك$/i, /^أوك$/i, /^ok$/i, /^okay$/i,
                /^حاضر$/i, /^ماشي$/i, /^طيب$/i, /^👍$/, /^✅$/,
                /^زين$/i, /^اوكي$/i  // Gulf patterns
            ],
            farewell: [
                /^مع السلامة$/i, /^باي$/i, /^bye$/i, /^سلام$/i,
                /^في أمان الله$/i, /^الله معاك$/i,
                /^فمان الله$/i, /^الله يحفظك$/i  // Gulf patterns
            ]
        };

        // ===============================
        // INTENTS SAFE FOR RULE-BASED (No Active Flow Check)
        // ===============================
        this.safeIntents = ['greeting', 'farewell'];

        // Confirmation/thanks need flow check
        this.flowSensitiveIntents = ['confirmation', 'thanks'];
    }

    /**
     * ✅ MAIN METHOD: Try to respond with rule-based response
     * Now supports: Multi-tenant, confidence per intent, context awareness, kill-switch
     * 
     * @param {string} message - Customer message
     * @param {string} intent - Detected intent
     * @param {number} confidence - Intent confidence (0-1)
     * @param {Object} context - Additional context
     * @param {string} context.companyId - Company ID
     * @param {Object} context.companySettings - Company AI settings
     * @param {Object} context.conversationState - Current conversation state
     * @param {string} context.conversationId - Conversation ID (for logging)
     * @returns {Object|null} - Response object or null for AI fallback
     */
    tryRespond(message, intent, confidence, context = {}) {
        const {
            companyId = 'unknown',
            companySettings = {},
            conversationState = {},
            conversationId = null
        } = context;

        try {
            // ===============================
            // 1. KILL-SWITCH CHECK
            // ===============================
            if (companySettings.enableRuleResponses === false) {
                this._log('RULE_BASED_DISABLED', { companyId, reason: 'kill_switch' });
                return null;
            }

            // ===============================
            // 2. GET INTENT-SPECIFIC THRESHOLD
            // ===============================
            const threshold = this.intentConfidence[intent] || 0.85;
            if (confidence < threshold) {
                this._log('RULE_BASED_LOW_CONFIDENCE', {
                    companyId, intent, confidence, threshold
                });
                return null;
            }

            const trimmedMessage = (message || '').trim();

            // ===============================
            // 3. CONTEXT AWARENESS CHECK
            // ===============================
            if (this.flowSensitiveIntents.includes(intent)) {
                // Check if there's an active flow (order, inquiry, etc.)
                if (conversationState.activeFlow ||
                    conversationState.pendingQuestion ||
                    conversationState.awaitingConfirmation) {
                    this._log('RULE_BASED_FLOW_ACTIVE', {
                        companyId, intent, activeFlow: conversationState.activeFlow
                    });
                    return null; // Let AI handle context-sensitive responses
                }
            }

            // ===============================
            // 4. CHECK CUSTOM TEMPLATES (SMART REPLIES)
            // ===============================
            if (companySettings.customRuleResponses?.templates) {
                const templates = companySettings.customRuleResponses.templates;
                const matchedTemplate = templates.find(t =>
                    t.keywords.some(k => trimmedMessage.toLowerCase().includes(k.toLowerCase()))
                );

                if (matchedTemplate) {
                    this._log('SMART_REPLY_MATCH', {
                        companyId,
                        template: matchedTemplate.name,
                        keyword: matchedTemplate.keywords.find(k => trimmedMessage.toLowerCase().includes(k.toLowerCase()))
                    });
                    return {
                        content: this._randomPick(matchedTemplate.responses),
                        source: 'smart-reply',
                        intent: matchedTemplate.type,
                        metadata: {
                            templateId: matchedTemplate.id,
                            templateName: matchedTemplate.name
                        }
                    };
                }
            }

            // ===============================
            // 5. PATTERN MATCHING (FALLBACK)
            // ===============================
            if (!this.matchesPattern(trimmedMessage, intent)) {
                return null;
            }

            // ===============================
            // 6. GET COMPANY-SPECIFIC RESPONSES
            // ===============================
            const response = this._getResponse(intent, companySettings);
            if (!response) {
                return null;
            }

            // ===============================
            // 7. STRUCTURED LOGGING (SUCCESS)
            // ===============================
            this._log('RULE_BASED_RESPONSE', {
                companyId,
                conversationId,
                intent,
                confidence,
                threshold,
                locale: companySettings.locale || 'ar_eg',
                tokensSaved: true
            });

            return {
                content: response,
                source: 'rule-based',
                intent: intent,
                tokensSaved: true,
                metadata: {
                    confidence,
                    threshold,
                    locale: companySettings.locale || 'ar_eg'
                }
            };

        } catch (error) {
            this._log('RULE_BASED_ERROR', {
                companyId, intent, error: error.message
            });
            return null;
        }
    }

    /**
     * Get response based on company settings (locale, custom responses)
     */
    _getResponse(intent, companySettings) {
        // Legacy support for locale-based responses
        const locale = companySettings.responseLocale || companySettings.locale || 'ar_eg';

        // Check for old structure customRuleResponses (not templates)
        if (companySettings.customRuleResponses?.[intent] && Array.isArray(companySettings.customRuleResponses[intent])) {
            return this._randomPick(companySettings.customRuleResponses[intent]);
        }

        // Fallback to default responses by locale
        const intentResponses = this.defaultResponses[intent];
        if (!intentResponses) return null;

        const localeResponses = intentResponses[locale] || intentResponses['ar_eg'];
        if (!localeResponses || localeResponses.length === 0) return null;

        return this._randomPick(localeResponses);
    }

    /**
     * Pattern matching
     */
    matchesPattern(message, type) {
        const patterns = this.patterns[type];
        if (!patterns) return false;
        return patterns.some(pattern => pattern.test(message));
    }

    /**
     * Random pick from array
     */
    _randomPick(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * ✅ STRUCTURED LOGGING
     */
    _log(type, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            ...data
        };

        // Console log with emoji for easy identification
        const emoji = {
            'RULE_BASED_RESPONSE': '⚡',
            'RULE_BASED_DISABLED': '🚫',
            'RULE_BASED_LOW_CONFIDENCE': '📉',
            'RULE_BASED_FLOW_ACTIVE': '🔄',
            'RULE_BASED_ERROR': '❌'
        }[type] || '📋';

        console.log(`${emoji} [${type}]`, JSON.stringify(logEntry));

        // TODO: In production, send to centralized logging (e.g., CloudWatch, Datadog)
        // logger.info(logEntry);
    }

    /**
     * Get stats for monitoring
     */
    getStats() {
        return {
            supportedIntents: Object.keys(this.intentConfidence),
            thresholds: this.intentConfidence,
            safeIntents: this.safeIntents,
            flowSensitiveIntents: this.flowSensitiveIntents,
            supportedLocales: ['ar_eg', 'ar_gulf', 'formal']
        };
    }

    /**
     * Update confidence threshold at runtime
     */
    updateThreshold(intent, newThreshold) {
        if (this.intentConfidence[intent] !== undefined) {
            this.intentConfidence[intent] = newThreshold;
            this._log('THRESHOLD_UPDATED', { intent, newThreshold });
        }
    }
}

module.exports = new RuleBasedResponder();
