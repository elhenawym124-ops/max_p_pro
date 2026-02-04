const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findUnique({
        where: { email: 'demo@example.com' },
    });
    console.log('Company:', company);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
