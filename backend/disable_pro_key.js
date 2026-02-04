const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function disableProKey() {
    try {
        const key = await prisma.aIKey.findFirst({
            where: { name: { contains: 'pro' } }
        });

        if (key) {
            await prisma.aIKey.update({
                where: { id: key.id },
                data: { isActive: false }
            });
            console.log('✅ Disabled:', key.name, key.id);
        } else {
            console.log('Key not found');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

disableProKey();
