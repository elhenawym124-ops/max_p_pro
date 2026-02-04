const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');

async function main() {
    const email = 'mokhtar@mokhtar.com';
    console.log(`🔍 Checking user: ${email}`);

    try {
        await initializeSharedDatabase();

        const user = await executeWithRetry(async () => {
            return await getSharedPrismaClient().user.findUnique({
                where: { email: email.toLowerCase() },
                include: {
                    company: true,
                    userCompanies: {
                        include: {
                            company: true
                        }
                    }
                }
            });
        });

        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('✅ User found:');
        console.log(JSON.stringify({
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            companyName: user.company?.name,
            isActive: user.isActive,
            userCompanies: user.userCompanies.map(uc => ({
                companyId: uc.companyId,
                companyName: uc.company?.name,
                role: uc.role,
                isDefault: uc.isDefault,
                isActive: uc.isActive
            }))
        }, null, 2));

    } catch (error) {
        console.error('❌ Error during diagnostics:', error);
    }
}

main();
