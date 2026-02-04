const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function checkOrder() {
    try {
        const prisma = getSharedPrismaClient();
        const order = await prisma.order.findFirst({
            where: {
                OR: [
                    { orderNumber: '27300' },
                    { id: '27300' }
                ]
            },
            select: {
                id: true,
                orderNumber: true,
                sourceType: true,
                extractionMethod: true,
                governorate: true,
                shipping: true,
                total: true,
                createdAt: true,
                shippingAddress: true,
                customerAddress: true
            }
        });
        console.log('ORDER DATA:', JSON.stringify(order, null, 2));
    } catch (error) {
        console.error('ERROR:', error);
    }
}

checkOrder();
