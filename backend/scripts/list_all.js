
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function listAll() {
    const prisma = getSharedPrismaClient();
    const all = await prisma.company.findMany({
        select: { id: true, email: true, name: true }
    });
    console.log('All Companies:');
    all.forEach(c => console.log(`${c.id}: ${c.email} (${c.name})`));

}

listAll();
