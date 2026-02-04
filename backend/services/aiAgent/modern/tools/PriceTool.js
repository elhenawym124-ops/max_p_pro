const BaseTool = require('./BaseTool');

/**
 * Price Tool - Retrieves product prices and pricing information
 */
class PriceTool extends BaseTool {
    constructor(prismaClient) {
        super();
        this.prisma = prismaClient;
    }

    get name() {
        return 'get_product_price';
    }

    get description() {
        return 'Get price information for specific products. Use this when customer asks about product prices, costs, or wants to know how much something costs.';
    }

    get parameters() {
        return {
            type: 'object',
            properties: {
                productName: {
                    type: 'string',
                    description: 'Product name or search query'
                },
                productId: {
                    type: 'string',
                    description: 'Exact product ID if known'
                }
            },
            required: []
        };
    }

    async execute(args, context) {
        try {
            console.log(`💰 [PriceTool] Executing with:`, args);

            const { productName, productId } = args;
            const { companyId } = context;

            let products = [];

            if (productId) {
                // Search by exact ID
                const product = await this.prisma.product.findFirst({
                    where: {
                        id: productId,
                        companyId,
                        isActive: true
                    },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        salePrice: true,
                        currency: true,
                        stock: true
                    }
                });

                if (product) {
                    products = [product];
                }
            } else if (productName) {
                // Search by name
                products = await this.prisma.product.findMany({
                    where: {
                        companyId,
                        isActive: true,
                        name: {
                            contains: productName,
                            mode: 'insensitive'
                        }
                    },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        salePrice: true,
                        currency: true,
                        stock: true
                    },
                    take: 5
                });
            }

            if (products.length === 0) {
                return {
                    success: false,
                    message: 'No products found matching the search criteria',
                    data: []
                };
            }

            return {
                success: true,
                data: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.salePrice || p.price,
                    originalPrice: p.price,
                    onSale: !!p.salePrice,
                    currency: p.currency || 'EGP',
                    inStock: (p.stock || 0) > 0,
                    stock: p.stock
                })),
                message: `Found ${products.length} product(s)`
            };
        } catch (error) {
            console.error('❌ [PriceTool] Error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to retrieve price information',
                data: []
            };
        }
    }
}

module.exports = PriceTool;
