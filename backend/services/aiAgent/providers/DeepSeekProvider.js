const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class DeepSeekProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'DeepSeek';
        this.defaultBaseUrl = 'https://api.deepseek.com';
    }

    /**
     * @override
     * ✅ ENHANCED: فصل System/User messages، دعم DeepSeek Reasoner، تحسين Error Handling
     */
    async generateResponse(prompt, options = {}) {
        const {
            model = 'deepseek-chat',
            temperature = 0.7,
            maxOutputTokens = 2048,
            topK,
            topP,
            stream = false
        } = options;

        // ✅ تحويل maxOutputTokens إلى max_tokens (DeepSeek format)
        const max_tokens = maxOutputTokens || options.max_tokens || 2048;

        const url = `${this.baseUrl || this.defaultBaseUrl}/chat/completions`;

        // ✅ CRITICAL FIX: فصل System و User messages
        const messages = this._parsePromptToMessages(prompt);

        // ✅ DEBUG: طباعة الـ messages للتأكد
        console.log('🔍 [DEEPSEEK-DEBUG] Messages array:', JSON.stringify(messages, null, 2));
        console.log('🔍 [DEEPSEEK-DEBUG] Messages count:', messages.length);
        console.log('🔍 [DEEPSEEK-DEBUG] First message role:', messages[0]?.role);
        console.log('🔍 [DEEPSEEK-DEBUG] First message content length:', messages[0]?.content?.length);

        // ✅ بناء request body
        const requestBody = {
            model,
            messages,
            temperature,
            max_tokens,
            stream
        };

        // ✅ DEBUG: طباعة الـ request body
        console.log('🔍 [DEEPSEEK-DEBUG] Request body:', JSON.stringify({
            model,
            messagesCount: messages.length,
            temperature,
            max_tokens,
            stream
        }, null, 2));

        // ✅ DeepSeek لا يدعم topK/topP بنفس طريقة Gemini - نتجاهلهم
        // لكن يمكن استخدام top_p إذا كان متوفر
        if (topP !== undefined && topP !== null) {
            requestBody.top_p = topP;
        }

        try {
            // ❌ REMOVED: Timeout - تم إزالته حسب طلب المستخدم
            
            console.log('📡 [DEEPSEEK-DEBUG] Sending request to:', url);
            console.log('📡 [DEEPSEEK-DEBUG] Model:', model);
            console.log('📡 [DEEPSEEK-DEBUG] API Key (first 10 chars):', this.apiKey?.substring(0, 10) + '...');
            
            const response = await axios.post(url, requestBody, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
                // ❌ REMOVED: timeout - تم إزالته
            });
            
            console.log('✅ [DEEPSEEK-DEBUG] Response received successfully');

            const choice = response.data.choices[0];
            const message = choice.message;
            
            // ✅ ENHANCED: دعم DeepSeek Reasoner - استخراج reasoning_content
            let content = message.content || '';
            let reasoningContent = null;
            let thinkingTokens = 0;

            // DeepSeek Reasoner يرجع reasoning_content منفصل
            if (message.reasoning_content) {
                reasoningContent = message.reasoning_content;
                // حساب thinking tokens تقريبياً
                thinkingTokens = Math.ceil(reasoningContent.length / 4);
            }
        
            // ✅ حساب التكلفة
            const inputTokens = response.data.usage?.prompt_tokens || 0;
            const outputTokens = response.data.usage?.completion_tokens || 0;
            const cost = this.estimateCost(inputTokens, outputTokens);
            
            // ✅ تحويل إلى Google-compatible format مع دعم reasoning
            return {
                // Google format compatibility
                text: () => content,
                usageMetadata: {
                    totalTokenCount: response.data.usage?.total_tokens || 0,
                    promptTokenCount: inputTokens,
                    candidatesTokenCount: outputTokens,
                    // ✅ إضافة thinking tokens للحساب الدقيق
                    thinkingTokens: thinkingTokens
                },
                candidates: [{
                    content: {
                        parts: [{ text: content }]
                    },
                    finishReason: choice.finish_reason === 'stop' ? 'STOP' : 'OTHER'
                }],
                promptFeedback: null,
                
                // Original DeepSeek format (for backward compatibility)
                success: true,
                content: content,
                reasoningContent: reasoningContent, // ✅ NEW: reasoning من DeepSeek Reasoner
                usage: response.data.usage,
                model: response.data.model,
                provider: 'DEEPSEEK',
                // ✅ NEW: معلومات التكلفة
                cost: cost
            };
            
            // ✅ Log التكلفة للمتابعة
            console.log(`💰 [DEEPSEEK-COST] ${model}: ${inputTokens} input + ${outputTokens} output = ${cost.formatted}`);
        } catch (error) {
            // ✅ DEBUG: طباعة تفاصيل الخطأ الكاملة
            console.error('❌ [DEEPSEEK-DEBUG] Full error:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.config?.data ? JSON.parse(error.config.data) : null
                }
            });
            
            // ✅ SIMPLIFIED: Error Handling بسيط لـ DeepSeek
            const status = error.response?.status;
            const errorData = error.response?.data?.error || {};
            const errorMessage = errorData.message || error.message;
            const errorType = errorData.type || 'unknown_error';
            const errorCode = errorData.code || error.code || 'unknown';
            
            // ✅ DeepSeek لا يرجع 429 rate limits في الظروف العادية
            // الأخطاء المحتملة:
            // - 401: Invalid API key (رصيد منتهي أو مفتاح خاطئ)
            // - 400: Bad request (خطأ في الطلب)
            // - 500: Server error
            // - TIMEOUT: الطلب أخذ وقت طويل جداً
            
            let enhancedMessage = errorMessage;
            let isRetryable = false;
            
            // ❌ REMOVED: Timeout handling - تم إزالته حسب طلب المستخدم
            // if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            //     enhancedMessage = `DeepSeek timeout - Request took too long (>${timeout/1000}s). Try again or use a shorter prompt.`;
            //     isRetryable = true;
            //     const timeoutError = new Error(enhancedMessage);
            //     timeoutError.code = 'TIMEOUT';
            //     timeoutError.timeout = timeout;
            //     throw timeoutError;
            // }
            
            if (status === 401) {
                enhancedMessage = `DeepSeek authentication failed - Check API key or account balance: ${errorMessage}`;
                isRetryable = false; // لا فائدة من إعادة المحاولة
            } else if (status === 400) {
                // ✅ BEST PRACTICE: توضيح أكثر لخطأ 400
                if (errorMessage.includes('lone leading surrogate') || errorMessage.includes('surrogate')) {
                    enhancedMessage = `DeepSeek bad request - Unicode error in prompt (lone surrogates). Clean your prompt! - ${errorMessage}`;
                } else if (errorMessage.includes('messages')) {
                    enhancedMessage = `DeepSeek bad request - Invalid messages format - ${errorMessage}`;
                } else {
                    enhancedMessage = `DeepSeek bad request - ${errorMessage}`;
                }
                isRetryable = false;
            } else if (status >= 500) {
                enhancedMessage = `DeepSeek server error - ${errorMessage}`;
                isRetryable = true; // خطأ مؤقت من السيرفر
            }
            
            console.error('DeepSeek Provider Error:', {
                status,
                type: errorType,
                code: errorCode,
                message: errorMessage,
                enhanced: enhancedMessage,
                retryable: isRetryable
            });
            
            // ✅ إنشاء error object بسيط
            const errorObj = new Error(enhancedMessage);
            errorObj.status = status;
            errorObj.message = enhancedMessage;
            errorObj.type = errorType;
            errorObj.code = errorCode;
            errorObj.provider = 'DEEPSEEK';
            errorObj.retryable = isRetryable; // ✅ NEW: هل يمكن إعادة المحاولة؟
            
            throw errorObj;
        }
    }

    /**
     * ✅ CRITICAL: تنظيف الـ prompt من Unicode surrogates المكسورة
     * DeepSeek API يرفض "lone leading surrogate" في الـ JSON
     */
    _cleanPrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            console.log('🧹 [CLEAN-PROMPT] Empty or invalid prompt, using fallback');
            return 'مرحبا';
        }
        
        const originalLength = prompt.length;
        console.log(`🧹 [CLEAN-PROMPT] Original prompt length: ${originalLength}`);
        
        // ✅ METHOD 1: استخدام JSON.stringify/parse لإزالة الأحرف المكسورة تلقائياً
        let cleaned;
        try {
            // هذه الطريقة تزيل تلقائياً أي أحرف غير صالحة في JSON
            cleaned = JSON.parse(JSON.stringify(prompt));
        } catch (e) {
            console.warn('⚠️ [CLEAN-PROMPT] JSON method failed, using regex fallback');
            cleaned = prompt;
        }
        
        // ✅ METHOD 2: إزالة lone surrogates يدوياً
        // Lone surrogates: U+D800 to U+DFFF (بدون أزواج صحيحة)
        cleaned = cleaned.replace(/[\uD800-\uDFFF]/g, '');
        
        // ✅ METHOD 3: إزالة control characters غير الصالحة
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // ✅ METHOD 4: تنظيف emoji المكسورة (استخدام toWellFormed إذا متوفر)
        if (typeof cleaned.toWellFormed === 'function') {
            cleaned = cleaned.toWellFormed();
        }
        
        // ✅ METHOD 5: إزالة أي أحرف غير قابلة للطباعة
        // نبقي فقط على: ASCII printable, Arabic, newlines, tabs
        cleaned = cleaned.replace(/[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\n\r\t]/g, '');
        
        // ✅ METHOD 6: إزالة أي zero-width characters مخفية
        cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        const cleanedLength = cleaned.trim().length;
        const removedChars = originalLength - cleanedLength;
        
        console.log(`🧹 [CLEAN-PROMPT] Cleaned prompt length: ${cleanedLength}`);
        console.log(`🧹 [CLEAN-PROMPT] Removed ${removedChars} characters`);
        
        // ✅ التأكد من عدم وجود نص فارغ
        if (cleanedLength === 0) {
            console.warn('⚠️ [CLEAN-PROMPT] Prompt became empty after cleaning, using fallback');
            return 'مرحبا';
        }
        
        // ✅ اختبار نهائي: محاولة stringify للتأكد من صلاحية النص
        try {
            JSON.stringify({ test: cleaned });
            console.log('✅ [CLEAN-PROMPT] Prompt is valid JSON-safe');
        } catch (e) {
            console.error('❌ [CLEAN-PROMPT] Prompt still has invalid characters after cleaning!');
            // آخر محاولة: استخدام فقط الأحرف الآمنة
            cleaned = cleaned.split('').filter(char => {
                try {
                    JSON.stringify(char);
                    return true;
                } catch {
                    return false;
                }
            }).join('');
        }
        
        return cleaned.trim();
    }

    /**
     * ✅ SIMPLIFIED: إرسال الـ prompt كله كـ user message
     * DeepSeek يفهم الـ instructions من داخل الـ prompt نفسه
     */
    _parsePromptToMessages(prompt) {
        // ✅ CRITICAL FIX: تنظيف الـ prompt أولاً
        const cleanedPrompt = this._cleanPrompt(prompt);
        
        // ✅ إرسال الـ prompt النظيف كـ user message
        return [{
            role: 'user',
            content: cleanedPrompt
        }];
    }

    /**
     * ✅ NEW: تقدير عدد التوكنز لـ DeepSeek
     * DeepSeek يستخدم tokenizer مختلف عن Gemini
     * التقدير: ~4 أحرف = 1 token (أفضل من 3.5 لـ Gemini)
     */
    estimateTokenCount(text) {
        if (!text) return 0;
        
        // ✅ DeepSeek tokenizer أفضل قليلاً مع النصوص العربية
        // نستخدم 4 أحرف لكل token بدلاً من 3.5
        const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        const numbers = (text.match(/\d+/g) || []).length;
        
        // حساب تقريبي
        const arabicTokens = Math.ceil(arabicChars / 4);
        const englishTokens = Math.ceil(englishWords * 1.3); // كلمة إنجليزية ≈ 1.3 token
        const numberTokens = numbers;
        
        return arabicTokens + englishTokens + numberTokens;
    }

    /**
     * ✅ NEW: حساب التكلفة التقديرية لـ DeepSeek
     * Pricing: $0.14 / 1M input tokens, $0.28 / 1M output tokens
     */
    estimateCost(inputTokens, outputTokens) {
        const inputCost = (inputTokens / 1000000) * 0.14;  // $0.14 per 1M tokens
        const outputCost = (outputTokens / 1000000) * 0.28; // $0.28 per 1M tokens
        return {
            inputCost: inputCost,
            outputCost: outputCost,
            totalCost: inputCost + outputCost,
            formatted: `$${(inputCost + outputCost).toFixed(6)}`
        };
    }

    /**
     * ✅ NEW: تقدير Thinking Tokens لـ DeepSeek Reasoner
     * DeepSeek Reasoner يستخدم tokens إضافية للتفكير
     */
    estimateThinkingTokens(promptLength, isComplexTask = false) {
        // ✅ DeepSeek Reasoner يستخدم ~10-30% من prompt length كـ thinking tokens
        const baseThinking = Math.ceil(promptLength * 0.15);
        
        // للمهام المعقدة، قد يستخدم أكثر
        if (isComplexTask) {
            return Math.ceil(baseThinking * 1.5);
        }
        
        return baseThinking;
    }

    /**
     * @override
     */
    async testConnection() {
        try {
            const result = await this.generateResponse('ping', { max_tokens: 1 });
            return result.success;
        } catch (error) {
            return false;
        }
    }
}

module.exports = DeepSeekProvider;
