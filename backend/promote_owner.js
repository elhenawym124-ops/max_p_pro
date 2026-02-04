
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promoteOwner() {
    const userId = 'cmiug0rm70vbdjuewr9cuiy82'; // mokhtar (Actual ID)
    const companyId = 'cmem8ayyr004cufakqkcsyn97'; // Marketing Company (Actual ID)

    try {
        // 1. Update UserCompany role
        const update = await prisma.userCompany.update({
            where: {
                userId_companyId: {
                    userId: userId,
                    companyId: companyId
                }
            },
            data: {
                role: 'OWNER'
            }
        });
        console.log('✅ Updated UserCompany role to OWNER:', update);

        // 2. Also update the main user role if this is their current active company context (optional but good for consistency)
        // We don't always change the global user role, but usually 'OWNER' is a company-level permission.
        // However, in our system, 'role' on User model is often used as the 'current context role'.
        // Let's check if the user has a companyId set to this company.

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.companyId === companyId) {
            await prisma.user.update({
                where: { id: userId },
                data: { role: 'OWNER' }
            });
            console.log('✅ Updated User global role to OWNER (since they are in this company context)');
        }

    } catch (e) {
        console.error('❌ Error updating role:', e);
    } finally {
        await prisma.$disconnect();
    }
}

promoteOwner();
