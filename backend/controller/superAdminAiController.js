const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const aiAgentService = require('../services/aiAgentService');

function getPrisma() {
    return getSharedPrismaClient();
}

/**
 * Get Global AI configuration
 */
exports.getGlobalAIConfig = async (req, res) => {
    try {
        const prisma = getPrisma();

        let config = await safeQuery(async () => {
            return await prisma.globalAiConfig.findFirst();
        });

        // Create default if not exists
        if (!config) {
            config = await safeQuery(async () => {
                return await prisma.globalAiConfig.create({
                    data: {
                        defaultProvider: 'GOOGLE',
                        isActive: true,
                        enableFailover: true
                    }
                });
            });
        }

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error fetching Global AI Config:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Update Global AI configuration
 */
exports.updateGlobalAIConfig = async (req, res) => {
    const { defaultProvider, isActive, enableFailover } = req.body;
    try {
        const prisma = getPrisma();
        let config = await safeQuery(async () => {
            return await prisma.globalAiConfig.findFirst();
        });

        if (config) {
            config = await safeQuery(async () => {
                return await prisma.globalAiConfig.update({
                    where: { id: config.id },
                    data: {
                        defaultProvider: defaultProvider || config.defaultProvider,
                        isActive: isActive !== undefined ? isActive : config.isActive,
                        enableFailover: enableFailover !== undefined ? enableFailover : config.enableFailover
                    }
                });
            });
        } else {
            config = await safeQuery(async () => {
                return await prisma.globalAiConfig.create({
                    data: {
                        defaultProvider: defaultProvider || 'GOOGLE',
                        isActive: isActive !== undefined ? isActive : true,
                        enableFailover: enableFailover !== undefined ? enableFailover : true
                    }
                });
            });
        }

        // ✅ FIX: Invalidate ModelManager caches to apply changes immediately
        console.log('🔄 [SUPER-ADMIN] Global config updated. Clearing ModelManager caches...');
        aiAgentService.getModelManager().clearAllCaches();

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error updating Global AI Config:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Get all AI Keys
 */
exports.getAllAIKeys = async (req, res) => {
    try {
        const prisma = getPrisma();
        const keys = await safeQuery(async () => {
            return await prisma.aiKey.findMany({
                include: { ai_model_configs: true },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        });
        res.json({ success: true, data: keys });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching AI Keys:', error);
        if (error.stack) console.error(error.stack);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Add New AI Key
 */
exports.addNewAIKey = async (req, res) => {
    const { name, provider, apiKey, baseUrl, keyType, modelName } = req.body;
    try {
        const prisma = getPrisma();

        let modelsCreate = undefined;
        if (modelName) {
            modelsCreate = {
                create: [{
                    modelName: modelName,
                    priority: 1,
                    isEnabled: true
                }]
            };
        }

        const newKey = await prisma.aiKey.create({
            data: {
                name,
                provider,
                apiKey,
                baseUrl,
                keyType: keyType || 'CENTRAL',
                isActive: true,
                usage: JSON.stringify({ used: 0, limit: 1000000 }), // Default usage JSON
                updatedAt: new Date(),
                ai_model_configs: modelsCreate
            },
            include: { ai_model_configs: true }
        });

        // ✅ FIX: Invalidate ModelManager caches to include new key immediately
        console.log('🔄 [SUPER-ADMIN] New key added. Clearing ModelManager caches...');
        aiAgentService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, data: newKey });
    } catch (error) {
        console.error('Error adding AI Key:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'API Key already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Delete AI Key
 */
exports.deleteAIKey = async (req, res) => {
    const { id } = req.params;
    try {
        const prisma = getPrisma();
        await prisma.aiKey.delete({
            where: { id }
        });

        // ✅ FIX: Invalidate ModelManager caches to remove key immediately
        console.log('🔄 [SUPER-ADMIN] Key deleted. Clearing ModelManager caches...');
        aiAgentService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: 'Key deleted successfully' });
    } catch (error) {
        console.error('Error deleting AI Key:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Set Active Model for a Key
 * Sets the selected model to Priority 1 and others to Priority 5
 */
exports.updateKeyActiveModel = async (req, res) => {
    const { id } = req.params; // Key ID
    const { modelName } = req.body;

    if (!modelName) {
        return res.status(400).json({ success: false, message: 'Model Name is required' });
    }

    try {
        const prisma = getPrisma();

        // Transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // 1. Demote all models for this key to Priority 5
            await tx.aiModelConfig.updateMany({
                where: { keyId: id },
                data: { priority: 5 }
            });

            // 2. Check if model exists
            const existingModel = await tx.aiModelConfig.findUnique({
                where: {
                    keyId_modelName: {
                        keyId: id,
                        modelName: modelName
                    }
                }
            });

            if (existingModel) {
                // 3. Promote selected model to Priority 1 and Enable it
                await tx.aiModelConfig.update({
                    where: { id: existingModel.id },
                    data: { priority: 1, isEnabled: true }
                });
            } else {
                // 4. If not exists (rare, but possible if manually typed), create it
                await tx.aiModelConfig.create({
                    data: {
                        keyId: id,
                        modelName: modelName,
                        priority: 1,
                        isEnabled: true
                    }
                });
            }
        });

        // ✅ FIX: Invalidate ModelManager caches
        console.log(`🔄 [SUPER-ADMIN] Active model updated for key ${id}. Clearing ModelManager caches...`);
        aiAgentService.getModelManager().clearAllCaches();

        res.json({ success: true, message: 'Active model updated successfully' });

    } catch (error) {
        console.error('Error updating Key Active Model:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Update Key Active Status
 */
exports.updateKeyActiveStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }

    try {
        const prisma = getPrisma();
        await prisma.aiKey.update({
            where: { id },
            data: { isActive }
        });

        // ✅ FIX: Invalidate ModelManager caches
        console.log(`🔄 [SUPER-ADMIN] Key ${id} active status updated to ${isActive}. Clearing ModelManager caches...`);
        aiAgentService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: 'Key status updated successfully' });
    } catch (error) {
        console.error('Error updating Key Active Status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Bulk Delete AI Keys
 */
exports.bulkDeleteAIKeys = async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    try {
        const prisma = getPrisma();
        const result = await prisma.aiKey.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        });

        // ✅ FIX: Invalidate ModelManager caches
        console.log(`🔄 [SUPER-ADMIN] ${result.count} keys deleted. Clearing ModelManager caches...`);
        aiAgentService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: `${result.count} key(s) deleted successfully`, count: result.count });
    } catch (error) {
        console.error('Error bulk deleting AI Keys:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Bulk Update AI Keys Active Status
 */
exports.bulkUpdateKeysActiveStatus = async (req, res) => {
    const { ids, isActive } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }

    try {
        const prisma = getPrisma();
        const result = await prisma.aiKey.updateMany({
            where: {
                id: {
                    in: ids
                }
            },
            data: { isActive }
        });

        // ✅ FIX: Invalidate ModelManager caches
        console.log(`🔄 [SUPER-ADMIN] ${result.count} keys status updated to ${isActive}. Clearing ModelManager caches...`);
        aiAgentService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: `${result.count} key(s) status updated successfully`, count: result.count });
    } catch (error) {
        console.error('Error bulk updating AI Keys status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Proxy to get models from Ollama
 */
exports.getOllamaModels = async (req, res) => {
    const { baseUrl } = req.query;

    if (!baseUrl) {
        return res.status(400).json({ success: false, message: 'Base URL is required' });
    }

    try {
        const axios = require('axios');

        // Smart URL handling
        let targetUrl = baseUrl.trim();
        // Remove trailing slash
        targetUrl = targetUrl.replace(/\/$/, '');

        // If user pasted full API URL, use it directly
        if (targetUrl.endsWith('/api/tags')) {
            // Already correct
        } else {
            // Append endpoint
            targetUrl = `${targetUrl}/api/tags`;
        }

        console.log(`📡 [PROXY] Fetching Ollama models from: ${targetUrl}`);
        const response = await axios.get(targetUrl, { timeout: 5000 });

        const models = response.data.models?.map(m => m.name) || [];
        res.json({ success: true, models });

    } catch (error) {
        console.error('❌ [PROXY] Failed to fetch Ollama models:', error.message);
        res.status(502).json({
            success: false,
            message: `Failed to connect to Ollama: ${error.message}`
        });
    }
};
