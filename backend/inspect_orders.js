const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectOrders() {
    try {
        console.log('--- Regular Orders ---');
        const regularOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                orderNumber: true,
                sourceType: true,
                extractionMethod: true,
                customerName: true,
                createdAt: true
            }
        });
        console.table(regularOrders);

        console.log('\n--- Guest Orders ---');
        const guestOrders = await prisma.guestOrder.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                orderNumber: true,
                guestName: true,
                createdAt: true
            }
        });
        console.table(guestOrders);

    } catch (error) {
        console.error('Error inspecting orders:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectOrders();
