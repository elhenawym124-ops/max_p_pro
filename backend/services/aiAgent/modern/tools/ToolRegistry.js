const ShippingTool = require('./ShippingTool');
const PriceTool = require('./PriceTool');

/**
 * Tool Registry - Manages all available tools for Modern Agent
 */
class ToolRegistry {
    constructor(serviceLocator) {
        this.tools = new Map();
        this.serviceLocator = serviceLocator;
        this._registerTools();
    }

    _registerTools() {
        // Register Shipping Tool
        const shippingTool = new ShippingTool(this.serviceLocator.getShippingService());
        this.tools.set(shippingTool.name, shippingTool);

        // Register Price Tool
        const priceTool = new PriceTool(this.serviceLocator.prisma);
        this.tools.set(priceTool.name, priceTool);

        console.log(`✅ [ToolRegistry] Registered ${this.tools.size} tools:`, Array.from(this.tools.keys()));
    }

    /**
     * Get all tools for AI function calling
     */
    getToolDefinitions() {
        const definitions = [];

        for (const [name, tool] of this.tools.entries()) {
            definitions.push({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            });
        }

        return definitions;
    }

    /**
     * Execute a specific tool by name
     */
    async executeTool(toolName, args, context) {
        const tool = this.tools.get(toolName);

        if (!tool) {
            throw new Error(`Tool '${toolName}' not found`);
        }

        return await tool.execute(args, context);
    }

    /**
     * Check if a tool exists
     */
    hasTool(toolName) {
        return this.tools.has(toolName);
    }
}

module.exports = ToolRegistry;
