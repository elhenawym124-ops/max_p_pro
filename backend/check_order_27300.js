const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
    try {
        const order = await prisma.order.findFirst({
            where: { orderNumber: '27300' },
            select: {
                id: true,
                orderNumber: true,
                sourceType: true,
                extractionMethod: true,
                governorate: true,
                shipping: true,
                total: true,
                createdAt: true
            }
        });
        console.log('ORDER DATA:', JSON.stringify(order, null, 2));
    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkOrder();
