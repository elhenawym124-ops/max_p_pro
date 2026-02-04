const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to Database successfully!');
        const count = await prisma.company.count();
        console.log(`📊 Found ${count} companies.`);
    } catch (e) {
        console.error('❌ DB Connection Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
