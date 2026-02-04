/**
 * Base AI Provider Class
 * Provides a common interface for different AI providers
 */
class BaseProvider {
    /**
     * @param {Object} config - Provider configuration (apiKey, baseUrl, etc.)
     */
    constructor(config = {}) {
        this.name = 'Base';
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl;
        this.isActive = config.isActive !== undefined ? config.isActive : true;
        this.models = config.models || [];
    }

    /**
     * Generate text response from a prompt
     * @param {string} prompt - The prompt to send to the AI
     * @param {Object} options - Additional options (model, temperature, etc.)
     * @returns {Promise<Object>} - Response containing text and other metadata
     */
    async generateResponse(prompt, options = {}) {
        throw new Error('generateResponse must be implemented by child classes');
    }

    /**
     * Test the connection to the provider
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        throw new Error('testConnection must be implemented by child classes');
    }

    /**
     * Get available models for this provider
     * @returns {Array<string>}
     */
    getAvailableModels() {
        return this.models.map(m => m.modelName);
    }
}

module.exports = BaseProvider;
