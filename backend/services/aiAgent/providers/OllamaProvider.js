const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class OllamaProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'Ollama';
        this.defaultBaseUrl = 'https://ollama.maxp.online';
        // Allow overriding base URL from config or use default
        this.baseUrl = config.baseUrl || this.defaultBaseUrl;
    }

    /**
     * Generate response using Ollama API
     */
    async generateResponse(prompt, options = {}) {
        const {
            model = 'llama3', // Default model, can be overridden
            temperature = 0.7,
            topP,
            max_tokens,
            stream = false
        } = options;

        const url = `${this.baseUrl}/api/chat`;

        // Parse prompt to messages
        const messages = [{
            role: 'user',
            content: prompt
        }];

        const requestBody = {
            model,
            messages,
            stream: false, // Force non-streaming for now
            options: {
                temperature,
                top_p: topP,
                num_predict: max_tokens // Ollama uses num_predict for max tokens
            }
        };

        try {
            console.log('📡 [OLLAMA-DEBUG] Sending request to:', url);
            console.log('📡 [OLLAMA-DEBUG] Model:', model);

            const response = await axios.post(url, requestBody, {
                timeout: 180000, // 3 minutes timeout for cold verification
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ [OLLAMA-DEBUG] Response received successfully');

            const message = response.data.message;
            const content = message.content;

            // Calculate usage if available (Ollama provides eval_count)
            const inputTokens = response.data.prompt_eval_count || 0;
            const outputTokens = response.data.eval_count || 0;

            return {
                // Google format compatibility
                text: () => content,
                usageMetadata: {
                    totalTokenCount: inputTokens + outputTokens,
                    promptTokenCount: inputTokens,
                    candidatesTokenCount: outputTokens
                },
                candidates: [{
                    content: {
                        parts: [{ text: content }]
                    },
                    finishReason: response.data.done ? 'STOP' : 'OTHER'
                }],

                // Original format
                success: true,
                content: content,
                model: response.data.model,
                provider: 'OLLAMA',
                cost: { formatted: '$0.00' } // Local is free!
            };

        } catch (error) {
            console.error('❌ [OLLAMA-DEBUG] Error:', error.message);

            const errorObj = new Error(`Ollama Provider Error: ${error.message}`);
            errorObj.provider = 'OLLAMA';

            if (error.code === 'ECONNREFUSED') {
                errorObj.message += ` - Is Ollama running at ${this.baseUrl}?`;
                errorObj.retryable = true;
            }

            throw errorObj;
        }
    }

    /**
     * Test connection to Ollama server
     */
    async testConnection() {
        try {
            // /api/tags lists available models, fast way to check connectivity
            const url = `${this.baseUrl}/api/tags`;
            await axios.get(url);
            return true;
        } catch (error) {
            console.error('Ollama connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Get available models from Ollama
     */
    async getAvailableModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`);
            return response.data.models.map(m => m.name);
        } catch (error) {
            console.warn('Failed to fetch Ollama models:', error.message);
            return [];
        }
    }
}

module.exports = OllamaProvider;
