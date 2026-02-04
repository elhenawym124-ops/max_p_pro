const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const orders = await prisma.order.findMany({
        where: {
            orderNumber: { in: ['WOO-26029', 'WOO-26028', 'WOO-26027'] }
        },
        select: {
            id: true,
            orderNumber: true,
            companyId: true,
            createdAt: true
        }
    });
    console.log('Orders found:', JSON.stringify(orders, null, 2));
    process.exit(0);
}

check();
