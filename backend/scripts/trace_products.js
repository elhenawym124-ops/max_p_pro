const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function traceIncorrectProducts() {
    console.log('🔍 Searching for products: "UGG", "Half Fro", "96/11"...');

    const products = await prisma.product.findMany({
        where: {
            OR: [
                { name: { contains: 'UGG' } },
                { name: { contains: 'فرو' } },
                { name: { contains: '96/11' } }
            ]
        },
        include: {
            company: {
                select: { id: true, name: true, email: true }
            }
        }
    });

    if (products.length === 0) {
        console.log('❌ No matching products found in database!');
    } else {
        console.log(`✅ Found ${products.length} matching products:`);
        products.forEach(p => {
            console.log(`- [${p.id}] ${p.name} | Company: ${p.company?.name || 'CENTRAL'} (${p.company?.id}) | Email: ${p.company?.email}`);
        });
    }

    await prisma.$disconnect();
}

traceIncorrectProducts().catch(console.error);
