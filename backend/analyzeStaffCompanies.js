const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Get the system company ID (the one the super admin belongs to)
    const superAdmin = await prisma.user.findUnique({
        where: { email: 'superadmin@system.com' },
        select: { companyId: true, id: true }
    });

    if (!superAdmin || !superAdmin.companyId) {
        console.log('❌ Could not find super admin or system company');
        return;
    }

    const systemCompanyId = superAdmin.companyId;
    console.log('🏢 System Company ID:', systemCompanyId);

    // Get all DevTeam members
    const devTeamMembers = await prisma.devTeamMember.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    companyId: true,
                    firstName: true,
                    lastName: true
                }
            }
        }
    });

    console.log('\n📊 Analysis of Staff Members:\n');
    console.log('='.repeat(80));

    let correctCount = 0;
    let incorrectCount = 0;
    const usersToFix = [];

    for (const member of devTeamMembers) {
        const user = member.user;
        const isCorrect = user.companyId === systemCompanyId;

        if (isCorrect) {
            correctCount++;
            console.log(`✅ ${user.email} | ${user.role} | Primary: System Company ✓`);
        } else {
            incorrectCount++;
            console.log(`❌ ${user.email} | ${user.role} | Primary: ${user.companyId} (WRONG!)`);
            usersToFix.push(user);
        }
    }

    console.log('='.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Correct: ${correctCount}`);
    console.log(`   ❌ Incorrect: ${incorrectCount}`);

    if (usersToFix.length > 0) {
        console.log(`\n🔧 Users that need to be fixed:`);
        usersToFix.forEach(u => {
            console.log(`   - ${u.email} (${u.firstName} ${u.lastName})`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
