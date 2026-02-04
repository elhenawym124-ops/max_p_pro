
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

async function run() {
    const id = 'cmem8ayyr004cufakqkcsyn97';
    console.log(`Checking Company: ${id}`);

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) { console.log('@@NAME:MISSING'); }
    else { console.log(`@@NAME:${company.name}`); }

    const s = await prisma.aiSettings.findUnique({ where: { companyId: id } });
    console.log(`@@DIRECT_STATUS:${s ? s.autoReplyEnabled : 'MISSING'}`);

    await prisma.$disconnect();
}
run();
