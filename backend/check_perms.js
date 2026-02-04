const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                role: true,
                isActive: true,
                companyId: true
            }
        });
        console.log('--- USER ROLES ---');
        console.table(users);

        const settings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });
        console.log('--- DEV SYSTEM SETTINGS PERMISSIONS ---');
        console.log(JSON.stringify(JSON.parse(settings.permissions), null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRoles();
