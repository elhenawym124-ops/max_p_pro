const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.update({
        where: { email: 'mokhta100r@mokhtar.com' },
        data: { baseSalary: 5000 }
    });
    console.log('✅ Updated salary to:', user.baseSalary);
    await prisma.$disconnect();
}

run().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
