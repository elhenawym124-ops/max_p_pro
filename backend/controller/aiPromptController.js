const { getSharedPrismaClient } = require('../services/sharedDatabase');
const promptService = require('../services/aiAgent/promptService');

/**
 * Get all available prompt templates
 * Merges system defaults with company overrides
 */
exports.getAllTemplates = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, error: 'Company ID required' });
        }

        // 1. Get List of all defined keys from PromptService defaults
        // We need to inspect `getDefaultTemplate` keys or define them manually since they are inside the method.
        // For now, we'll define the known keys from the code we viewed.
        const knownKeys = [
            'system_personality',
            'shipping_response',
            'no_shipping_found',
            'post_product_info',
            'order_confirmation',
            'no_products_found',
            'rag_empty_strict',
            'fallback_general',
            'fallback_product_inquiry',
            'fallback_price_inquiry',
            'fallback_shipping_inquiry',
            'fallback_order_inquiry',
            'fallback_greeting',
            'system_shipping_alert',
            'system_instructions_rag',
            'system_customer_info'
        ];

        // 2. Fetch custom templates from DB
        const customTemplates = await getSharedPrismaClient().promptTemplate.findMany({
            where: { companyId, isActive: true }
        });

        // 3. Map to final structure
        const templates = knownKeys.map(key => {
            const custom = customTemplates.find(t => t.key === key);
            const defaultContent = promptService.getDefaultTemplate(key);

            return {
                key,
                name: formatKeyName(key), // Helper to make it readable
                content: custom ? custom.content : defaultContent,
                isCustom: !!custom,
                defaultContent: defaultContent,
                updatedAt: custom?.updatedAt || null
            };
        });

        res.json({
            success: true,
            data: templates
        });

    } catch (error) {
        console.error('❌ Error fetching templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Save/Update a template
 */
exports.saveTemplate = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        const { key, content } = req.body;

        if (!key || !content) {
            return res.status(400).json({ success: false, error: 'Key and Content required' });
        }

        await getSharedPrismaClient().promptTemplate.upsert({
            where: {
                companyId_key: {
                    companyId,
                    key
                }
            },
            update: {
                content,
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                id: generateId(),
                companyId,
                key,
                content,
                isActive: true
            }
        });

        res.json({ success: true, message: 'Template saved successfully' });

    } catch (error) {
        console.error('❌ Error saving template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Reset template to default
 */
exports.resetTemplate = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        const { key } = req.body;

        if (!key) {
            return res.status(400).json({ success: false, error: 'Key required' });
        }

        // We "reset" by deleting the custom record or setting isActive=false
        // Deleting is cleaner to revert to file default
        await getSharedPrismaClient().promptTemplate.deleteMany({
            where: {
                companyId,
                key
            }
        });

        res.json({ success: true, message: 'Template reset to default' });

    } catch (error) {
        console.error('❌ Error resetting template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Helper: Format friendly name
function formatKeyName(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace('System ', '')
        .replace('Fallback ', 'Fallback: ');
}

// Helper: Generate ID
function generateId() {
    return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}
