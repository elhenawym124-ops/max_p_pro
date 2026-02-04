const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst();
    if (company) {
        console.log('COMPANY_ID=' + company.id);
    } else {
        console.log('No company found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
