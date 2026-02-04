const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            companyId: true,
            devTeamMember: true,
            userCompanies: {
                select: {
                    companyId: true,
                    role: true
                }
            }
        }
    });

    const systemSettings = await prisma.devSystemSettings.findUnique({
        where: { id: 'default' }
    });

    console.log('--- SYSTEM SETTINGS ---');
    console.log(systemSettings ? 'Settings found' : 'Settings not found');

    console.log('\n--- USERS LIST ---');
    users.forEach(u => {
        console.log(`User: ${u.email} | Role: ${u.role} | Primary Company: ${u.companyId} | DevTeam: ${u.devTeamMember ? 'YES' : 'NO'}`);
        if (u.userCompanies.length > 0) {
            console.log(`  Linked Companies: ${u.userCompanies.map(uc => `${uc.companyId}(${uc.role})`).join(', ')}`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
