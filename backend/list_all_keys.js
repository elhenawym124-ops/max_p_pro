const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const keys = await prisma.aIKey.findMany({
        where: { provider: 'OLLAMA' }
    });
    console.log('OLLAMA Keys:', JSON.stringify(keys, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
