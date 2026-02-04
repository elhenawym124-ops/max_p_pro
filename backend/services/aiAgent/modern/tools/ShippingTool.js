const BaseTool = require('./BaseTool');

/**
 * Shipping Tool - Retrieves shipping information for products
 */
class ShippingTool extends BaseTool {
    constructor(shippingService) {
        super();
        this.shippingService = shippingService;
    }

    get name() {
        return 'get_shipping_info';
    }

    get description() {
        return 'Get shipping cost and delivery time for a specific product or location. Use this when customer asks about shipping, delivery, or freight costs.';
    }

    get parameters() {
        return {
            type: 'object',
            properties: {
                productId: {
                    type: 'string',
                    description: 'Product ID to check shipping for (optional)'
                },
                location: {
                    type: 'string',
                    description: 'Delivery location/city (optional)'
                }
            },
            required: []
        };
    }

    async execute(args, context) {
        try {
            console.log(`🚚 [ShippingTool] Executing with:`, args);

            const { productId, location } = args;
            const { companyId } = context;

            // Call actual shipping service
            let shippingInfo;

            if (productId) {
                shippingInfo = await this.shippingService.getShippingForProduct(
                    companyId,
                    productId,
                    location
                );
            } else {
                shippingInfo = await this.shippingService.getDefaultShippingInfo(
                    companyId,
                    location
                );
            }

            return {
                success: true,
                data: shippingInfo,
                message: 'Shipping information retrieved successfully'
            };
        } catch (error) {
            console.error('❌ [ShippingTool] Error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to retrieve shipping information'
            };
        }
    }
}

module.exports = ShippingTool;
