const GoogleProvider = require('./GoogleProvider');
const DeepSeekProvider = require('./DeepSeekProvider');
const OllamaProvider = require('./OllamaProvider');
const GroqProvider = require('./GroqProvider');
const { getSharedPrismaClient } = require('../../sharedDatabase');

class AIProviderFactory {
    constructor() {
        this.providers = new Map(); // Cache instances per key
    }

    /**
     * Get the active provider based on GlobalAIConfig
     */
    async getActiveProvider() {
        const prisma = getSharedPrismaClient();

        // 1. Get Global Config
        const globalConfig = await prisma.globalAIConfig.findFirst({
            where: { isActive: true }
        });

        const providerType = globalConfig?.defaultProvider || 'GOOGLE';

        // 2. Find active keys for this provider
        const keys = await prisma.aIKey.findMany({
            where: {
                provider: providerType,
                isActive: true,
                companyId: null // System-wide keys
            },
            include: {
                models: true
            }
        });

        if (keys.length === 0) {
            console.warn(`No active system keys found for provider: ${providerType}. Falling back to GOOGLE.`);
            // If no keys for selected provider, try to find Google keys as fallback
            if (providerType !== 'GOOGLE') {
                const googleKeys = await prisma.aIKey.findMany({
                    where: { provider: 'GOOGLE', isActive: true, companyId: null }
                });
                if (googleKeys.length > 0) return this.getProvider('GOOGLE', googleKeys[0].apiKey, googleKeys[0].baseUrl, googleKeys[0].id);
            }
            throw new Error(`No available AI keys for provider: ${providerType}`);
        }

        // Use the first available key for now (rotation can be added here)
        // Use the first available key for now (rotation can be added here)
        const key = keys[0];
        console.log(`🏭 [AI-FACTORY] Selected Key: ${key.provider} (${key.name})`);
        console.log(`🏭 [AI-FACTORY] Base URL from DB: ${key.baseUrl}`);

        return this.getProvider(providerType, key.apiKey, key.baseUrl, key.id);
    }

    /**
     * Get or create a provider instance
     */
    getProvider(type, apiKey, baseUrl = null, id = 'default') {
        // ❌ Disable Caching: Config might change (e.g. BaseURL) and we need fresh instances
        // const cacheKey = `${type}_${id || apiKey}`;
        // if (this.providers.has(cacheKey)) {
        //     return this.providers.get(cacheKey);
        // }

        let provider;
        const keyConfig = { id, apiKey, baseUrl, provider: type };

        switch (type) {
            case 'GOOGLE':
                provider = new GoogleProvider(keyConfig);
                break;
            case 'DEEPSEEK':
                provider = new DeepSeekProvider(keyConfig);
                break;
            case 'HUGGINGFACE':
                const HuggingFaceProvider = require('./HuggingFaceProvider');
                provider = new HuggingFaceProvider(keyConfig);
                break;
            case 'OLLAMA':
                provider = new OllamaProvider(keyConfig);
                break;
            case 'GROQ':
                const GroqProvider = require('./GroqProvider');
                provider = new GroqProvider(keyConfig);
                break;
            default:
                throw new Error(`Unsupported AI provider type: ${type}`);
        }

        // this.providers.set(cacheKey, provider);
        return provider;
    }
}

// Singleton instance
const factory = new AIProviderFactory();
module.exports = factory;
