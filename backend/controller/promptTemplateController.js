const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const PromptService = require('../services/aiAgent/promptService');
const PromptValidator = require('../services/aiAgent/PromptValidator');

/**
 * Prompt Template Controller
 * Manages CRUD operations for handling dynamic AI prompts
 */

// Get all templates for a company
exports.getTemplates = async (req, res) => {
    try {
        const { companyId } = req.user;

        const templates = await safeQuery(async () => {
            return await getSharedPrismaClient().promptTemplate.findMany({
                where: { companyId },
                orderBy: { category: 'asc' }
            });
        });

        // If no templates found, we might want to return defaults or empty list
        // The UI can handle showing "defaults" if DB is empty, or we can seed them.
        // For now, return what's in DB.

        // Optional: Merge with defaults if not present in DB
        // This allows the UI to show "Default (Unmodified)" status
        const defaultKeys = [
            'shipping_response', 'no_shipping_found',
            'post_product_info', 'order_confirmation',
            'no_products_found',
            // New Migration Keys
            'fallback_general', 'fallback_product_inquiry',
            'fallback_price_inquiry', 'fallback_shipping_inquiry',
            'fallback_order_inquiry', 'fallback_greeting',
            'system_personality', 'system_instructions_rag',
            'system_instructions_no_rag'
        ];

        const allTemplates = [...templates];

        // Check which defaults are missing from DB
        // This part is vital for UI to show defaults
        for (const key of defaultKeys) {
            if (!templates.find(t => t.key === key)) {
                allTemplates.push({
                    key,
                    content: PromptService.getDefaultTemplate(key),
                    category: 'system_default',
                    isActive: true,
                    isDefault: true // Marker for UI
                });
            }
        }

        res.json({ success: true, data: allTemplates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch templates' });
    }
};

// Get a specific template
exports.getTemplateByKey = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { key } = req.params;

        let template = await safeQuery(async () => {
            return await getSharedPrismaClient().promptTemplate.findUnique({
                where: {
                    companyId_key: { companyId, key }
                }
            });
        });

        if (!template) {
            // Return default if not customized yet
            const defaultContent = PromptService.getDefaultTemplate(key);
            if (defaultContent) {
                template = {
                    key,
                    content: defaultContent,
                    isDefault: true
                };
            } else {
                return res.status(404).json({ success: false, error: 'Template not found' });
            }
        }

        res.json({ success: true, data: template });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch template' });
    }
};

// Create or Update a template
exports.upsertTemplate = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { key, content, description, category, variables, isActive } = req.body;

        if (!key || !content) {
            return res.status(400).json({ success: false, error: 'Key and Content are required' });
        }

        // ✅ Validation Layer (Phase 5)
        const validation = PromptValidator.validate(key, content);
        if (!validation.isValid) {
            console.warn(`⚠️ [TEMPLATE-VALIDATION] Failed for ${key}: ${validation.error}`);
            return res.status(400).json({
                success: false,
                error: `Invalid Template: ${validation.error}`,
                details: validation
            });
        }

        const template = await safeQuery(async () => {
            return await getSharedPrismaClient().promptTemplate.upsert({
                where: {
                    companyId_key: { companyId, key }
                },
                update: {
                    content,
                    description,
                    category,
                    variables,
                    isActive
                },
                create: {
                    companyId,
                    key,
                    content,
                    description,
                    category,
                    variables,
                    isActive: isActive !== undefined ? isActive : true
                }
            });
        });

        // Clear cache in PromptService
        PromptService.clearCache(companyId);

        res.json({ success: true, data: template });
    } catch (error) {
        console.error('Error saving template:', error);
        res.status(500).json({ success: false, error: 'Failed to save template' });
    }
};

// Delete/Reset a template (Revert to default)
exports.deleteTemplate = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { key } = req.params;

        await safeQuery(async () => {
            await getSharedPrismaClient().promptTemplate.delete({
                where: {
                    companyId_key: { companyId, key }
                }
            });
        });

        // Clear cache
        PromptService.clearCache(companyId);

        res.json({ success: true, message: 'Template reset to default' });
    } catch (error) {
        console.error('Error resetting template:', error);
        res.status(500).json({ success: false, error: 'Failed to reset template' });
    }
};

// Generate Preview
exports.previewTemplate = async (req, res) => {
    try {
        const { content, variables } = req.body;
        const preview = PromptService.injectVariables(content, variables || {});
        res.json({ success: true, data: preview });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Preview failed' });
    }
};
