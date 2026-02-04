const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
            orderNumber: true,
            wooCommerceId: true,
            companyId: true
        }
    });
    console.log(JSON.stringify(orders, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
