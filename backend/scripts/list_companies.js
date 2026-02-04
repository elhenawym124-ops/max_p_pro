const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCompanies() {
    console.log('📋 Listing all companies...');
    const companies = await prisma.company.findMany({
        select: { id: true, name: true, email: true },
        take: 50
    });

    console.table(companies);
    await prisma.$disconnect();
}

listCompanies().catch(console.error);
