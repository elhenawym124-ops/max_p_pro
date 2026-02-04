const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseProvider = require('./BaseProvider');

class GoogleProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'Google';
        this.genAI = new GoogleGenerativeAI(this.apiKey);
    }

    /**
     * @override
     */
    async generateResponse(prompt, options = {}) {
        const {
            model = 'gemini-1.5-flash',
            temperature = 0.7,
            maxOutputTokens = 2048
        } = options;

        const generativeModel = this.genAI.getGenerativeModel({ model });

        const generationConfig = {
            temperature,
            maxOutputTokens,
        };

        const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });

        const response = await result.response;
        const text = response.text();

        return {
            success: true,
            content: text,
            text: text, // For compatibility with responseGenerator
            candidates: response.candidates,
            usageMetadata: response.usageMetadata,
            promptFeedback: response.promptFeedback,
            model: model,
            provider: 'GOOGLE'
        };
    }

    /**
     * @override
     */
    async testConnection() {
        try {
            const result = await this.generateResponse('ping', { maxOutputTokens: 1 });
            return result.success;
        } catch (error) {
            return false;
        }
    }
}

module.exports = GoogleProvider;
