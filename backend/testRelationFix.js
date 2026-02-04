const { PrismaClient } = require('./generated/mysql');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing Affiliate.findMany with singular relations...');
        const affiliates = await prisma.affiliate.findMany({
            include: {
                user: true,
                company: true
            },
            take: 1
        });
        console.log(`Success! Found ${affiliates.length} affiliates.`);
    } catch (err) {
        console.error('Failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}
test();
