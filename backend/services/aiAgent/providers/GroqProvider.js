const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class GroqProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'Groq';
        this.defaultBaseUrl = 'https://api.groq.com/openai/v1';
        this.baseUrl = config.baseUrl || this.defaultBaseUrl;
    }

    /**
     * Generate response using Groq API (OpenAI Compatible)
     */
    async generateResponse(prompt, options = {}) {
        const {
            model = 'llama-3.3-70b-versatile', // Default to available model
            temperature = 0.7,
            max_tokens,
            top_p,
            stream = false
        } = options;

        const url = `${this.baseUrl}/chat/completions`;

        // Handle both simple string prompt and array of messages
        let messages = [];
        if (typeof prompt === 'string') {
            messages = [{ role: 'user', content: prompt }];
        } else if (Array.isArray(prompt)) {
            messages = prompt;
        } else {
            // Check if it has system instruction inside options or context
            messages = [{ role: 'user', content: JSON.stringify(prompt) }];
        }

        // Sanitize messages to ensure only valid fields are sent to Groq
        const sanitizedMessages = messages.map(m => ({
            role: m.role,
            content: m.content,
            name: m.name // generic allowed field
        }));

        const requestBody = {
            model,
            messages: sanitizedMessages,
            temperature,
            max_tokens: max_tokens || 1024,
            top_p: top_p || 1,
            stream
        };

        try {
            console.log('📡 [GROQ-DEBUG] Sending request to:', url);
            console.log('📡 [GROQ-DEBUG] Payload Preview:', JSON.stringify({
                model,
                messageCount: sanitizedMessages.length,
                firstMessage: sanitizedMessages[0] ? { role: sanitizedMessages[0].role, contentPreview: sanitizedMessages[0].content?.substring(0, 50) } : 'None'
            }));

            const response = await axios.post(url, requestBody, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ [GROQ-DEBUG] Response received successfully');

            const choice = response.data.choices[0];
            const message = choice.message;
            const content = message.content || '';

            // Calculate usage and cost
            const inputTokens = response.data.usage?.prompt_tokens || 0;
            const outputTokens = response.data.usage?.completion_tokens || 0;
            const cost = this.estimateCost(model, inputTokens, outputTokens);

            return {
                // Google format compatibility
                text: () => content,
                usageMetadata: {
                    totalTokenCount: response.data.usage?.total_tokens || 0,
                    promptTokenCount: inputTokens,
                    candidatesTokenCount: outputTokens
                },
                candidates: [{
                    content: {
                        parts: [{ text: content }]
                    },
                    finishReason: choice.finish_reason === 'stop' ? 'STOP' : 'OTHER'
                }],

                // Original format
                success: true,
                content: content,
                usage: response.data.usage,
                model: response.data.model,
                provider: 'GROQ',
                cost: cost
            };

        } catch (error) {
            console.error('❌ [GROQ-DEBUG] Error:', error.message);

            const errorObj = new Error(`Groq Provider Error: ${error.message}`);
            errorObj.provider = 'GROQ';

            if (error.response) {
                errorObj.status = error.response.status;
                errorObj.details = error.response.data;
                console.error('❌ [GROQ-DEBUG] Details:', JSON.stringify(error.response.data, null, 2));
            }

            throw errorObj;
        }
    }

    /**
     * Estimate cost based on Groq pricing (as of early 2024)
     * These are approximate and might change.
     */
    estimateCost(model, inputTokens, outputTokens) {
        let pricing = {
            'llama-3.1-8b-instant': { input: 0.05, output: 0.08 }, // Per 1M tokens (Approx)
            'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
            'llama3-8b-8192': { input: 0.05, output: 0.08 }, // Legacy
            'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
            'gemma2-9b-it': { input: 0.20, output: 0.20 }
        };

        // Default lowest tier if unknown
        const rate = pricing[model] || pricing['llama-3.1-8b-instant'];

        const inputCost = (inputTokens / 1_000_000) * rate.input;
        const outputCost = (outputTokens / 1_000_000) * rate.output;
        const total = inputCost + outputCost;

        return {
            formatted: `$${total.toFixed(7)}`,
            value: total
        };
    }

    /**
     * Test connection to Groq
     */
    async testConnection() {
        try {
            // Groq supports /v1/models to list models
            const url = `${this.baseUrl}/models`;
            await axios.get(url, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            return true;
        } catch (error) {
            console.error('Groq connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Get available models from Groq
     */
    async getAvailableModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            // Filter only active models if needed, for now return all IDs
            return response.data.data.map(m => m.id);
        } catch (error) {
            console.warn('Failed to fetch Groq models:', error.message);
            return [];
        }
    }
}

module.exports = GroqProvider;
