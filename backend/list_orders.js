const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function listRecentOrders() {
    try {
        const prisma = getSharedPrismaClient();
        const orders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderNumber: true,
                customerName: true,
                total: true,
                createdAt: true
            }
        });
        console.log('RECENT ORDERS:', JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('ERROR:', error);
    }
}

listRecentOrders();
