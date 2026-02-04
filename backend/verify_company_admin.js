const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function check() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    const companyId = 'cmjpl47ym0dzwjupybv59lisu';

    console.log(`Checking company: ${companyId}`);
    const company = await prisma.company.findUnique({ where: { id: companyId } });

    if (!company) {
        console.log('❌ Company NOT found');
    } else {
        console.log('✅ Company FOUND:', company.name);

        // Check for admin
        const admin = await prisma.user.findFirst({
            where: {
                companyId: companyId,
                role: 'COMPANY_ADMIN',
                isActive: true
            }
        });

        if (!admin) {
            console.log('❌ Company Admin NOT found (active=true, role=COMPANY_ADMIN)');
            // Try without active check
            const inactiveAdmin = await prisma.user.findFirst({
                where: {
                    companyId: companyId,
                    role: 'COMPANY_ADMIN'
                }
            });
            if (inactiveAdmin) {
                console.log('⚠️ Found Inactive Company Admin:', inactiveAdmin.email);
            } else {
                console.log('❌ No Company Admin found at all.');
            }

        } else {
            console.log('✅ Company Admin FOUND:', admin.email);
        }
    }

    process.exit(0);
}

check().catch(console.error);
