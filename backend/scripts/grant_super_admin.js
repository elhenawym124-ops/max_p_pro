
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function grantSuperAdmin() {
    const emails = ['mokhtar@mokhtar.com', 'superadmin@system.com'];

    for (const email of emails) {
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (user) {
                await prisma.user.update({
                    where: { email },
                    data: { role: 'SUPER_ADMIN' }
                });
                console.log(`✅ Upgraded ${email} to SUPER_ADMIN`);
            } else {
                console.log(`⚠️ User ${email} not found`);
            }
        } catch (error) {
            console.error(`❌ Error updating ${email}:`, error);
        }
    }

    await prisma.$disconnect();
}

grantSuperAdmin();
