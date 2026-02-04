// Check OWNER role in database
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function checkOwnerRole() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    console.log('\n=== Checking Owner Role in Database ===\n');

    // 1. Check mokhtar@mokhtar.com user
    const user = await prisma.user.findUnique({
        where: { email: 'mokhtar@mokhtar.com' },
        include: {
            userCompanies: {
                include: { company: { select: { id: true, name: true } } }
            }
        }
    });

    if (!user) {
        console.log('❌ User mokhtar@mokhtar.com not found');
        return;
    }

    console.log('📋 User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  User.role:', user.role);
    console.log('  Active:', user.isActive);
    console.log('\n📋 UserCompany relations:');

    for (const uc of user.userCompanies) {
        console.log(`  - Company: ${uc.company.name} (${uc.company.id})`);
        console.log(`    UserCompany.role: ${uc.role}`);
        console.log(`    isDefault: ${uc.isDefault}`);
        console.log(`    isActive: ${uc.isActive}`);
    }

    // 2. Check UserRole enum values in database
    console.log('\n📋 All distinct UserCompany roles in database:');
    const roles = await prisma.$queryRaw`SELECT DISTINCT role FROM user_companies`;
    console.log(roles);

    // 3. Check all users with OWNER role
    console.log('\n📋 Users with OWNER role in UserCompany:');
    const owners = await prisma.userCompany.findMany({
        where: { role: 'OWNER' },
        include: {
            user: { select: { id: true, email: true, role: true } },
            company: { select: { id: true, name: true } }
        }
    });

    for (const owner of owners) {
        console.log(`  - ${owner.user.email} (User.role: ${owner.user.role})`);
        console.log(`    Company: ${owner.company.name}`);
        console.log(`    UserCompany.role: ${owner.role}`);
    }

    console.log('\n=== Done ===\n');
    process.exit(0);
}

checkOwnerRole().catch((e) => {
    console.error(e);
    process.exit(1);
});
