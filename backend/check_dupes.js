const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const orders = await prisma.order.findMany({
        where: {
            OR: [
                { orderNumber: '26029' },
                { orderNumber: 'WOO-26029' },
                { wooCommerceId: '26029' }
            ]
        },
        select: {
            id: true,
            orderNumber: true,
            companyId: true,
            wooCommerceId: true
        }
    });
    console.log('Orders found:', JSON.stringify(orders, null, 2));
    process.exit(0);
}

check();
