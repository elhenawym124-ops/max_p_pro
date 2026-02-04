const { HfInference } = require('@huggingface/inference');
const BaseProvider = require('./BaseProvider');

class HuggingFaceProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'HuggingFace';
        this.hf = new HfInference(this.apiKey);
    }

    /**
     * @override
     */
    async generateResponse(prompt, options = {}) {
        const {
            model = 'meta-llama/Meta-Llama-3-8B-Instruct',
            temperature = 0.7,
            maxOutputTokens = 1000,
            topP = 0.9
        } = options;

        // Using chatCompletion for better Instruct model support
        const result = await this.hf.chatCompletion({
            model: model,
            messages: [
                { role: "user", content: prompt }
            ],
            max_tokens: maxOutputTokens,
            temperature: temperature,
            top_p: topP
        });

        const text = result.choices[0].message.content;

        return {
            success: true,
            content: text,
            text: text,
            usageMetadata: {
                totalTokenCount: result.usage?.total_tokens || 0
            },
            model: model,
            provider: 'HUGGINGFACE'
        };
    }

    /**
     * @override
     */
    async testConnection() {
        try {
            const result = await this.generateResponse('ping', {
                model: 'meta-llama/Meta-Llama-3-8B-Instruct',
                maxOutputTokens: 10
            });
            return result.success;
        } catch (error) {
            return false;
        }
    }
}

module.exports = HuggingFaceProvider;
