const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function searchOrders() {
    try {
        const prisma = getSharedPrismaClient();
        const orders = await prisma.order.findMany({
            where: {
                orderNumber: { contains: '2730' }
            },
            select: {
                id: true,
                orderNumber: true,
                customerName: true,
                total: true,
                createdAt: true
            }
        });
        console.log('SEARCH RESULTS:', JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('ERROR:', error);
    }
}

searchOrders();
