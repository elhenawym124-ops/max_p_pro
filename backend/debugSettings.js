const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.devSystemSettings.findUnique({
        where: { id: 'default' }
    });
    if (settings && settings.permissions) {
        console.log(JSON.stringify(JSON.parse(settings.permissions), null, 2));
    } else {
        console.log('No permissions found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
