
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
    try {
        const product = await prisma.product.findUnique({
            where: { id: 'cmkk9slz90003ufs0k125dv0k' }
        });
        console.log('Product Slug:', product ? product.slug : 'Product not found');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProduct();
