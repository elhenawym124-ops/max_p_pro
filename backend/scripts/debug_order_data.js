
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugLatestOrder() {
    try {
        // Get the latest order
        const order = await prisma.order.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                orderItems: {
                    include: {
                        product: true,
                        variant: true
                    }
                }
            }
        });

        if (!order) {
            console.log('No orders found.');
            return;
        }

        console.log(`\n🔍 Debugging Order ID: ${order.id}`);
        console.log(`   Order Number: ${order.orderNumber}`);

        console.log('\n📦 Order Items:');
        order.orderItems.forEach((item, index) => {
            console.log(`\n   Item #${index + 1}:`);
            console.log(`   - ID: ${item.id}`);
            console.log(`   - Name (DB): ${item.productName}`);
            console.log(`   - Color (DB): ${item.productColor}`);
            console.log(`   - Size (DB): ${item.productSize}`);
            console.log(`   - Metadata (DB): ${item.metadata}`);
            console.log(`   - Variant (Relation):`, item.variant ? JSON.stringify(item.variant, null, 2) : 'None');
            console.log(`   - Product (Relation):`, item.product ? item.product.name : 'None');
        });

    } catch (error) {
        console.error('Error debugging order:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugLatestOrder();
