const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.devSystemSettings.findUnique({
        where: { id: 'default' }
    });

    if (settings && settings.permissions) {
        const permissions = JSON.parse(settings.permissions);

        // Roles to remove from system settings
        const tenantRoles = ['OWNER', 'AGENT', 'Agent', 'COMPANY_ADMIN'];
        let changed = false;

        tenantRoles.forEach(role => {
            if (permissions[role]) {
                console.log(`🗑️ Removing role '${role}' from system permissions`);
                delete permissions[role];
                changed = true;
            }
        });

        if (changed) {
            await prisma.devSystemSettings.update({
                where: { id: 'default' },
                data: {
                    permissions: JSON.stringify(permissions)
                }
            });
            console.log('✅ System permissions cleaned successfully');
        } else {
            console.log('✨ No tenant roles found in system permissions');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
