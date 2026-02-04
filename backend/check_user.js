const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function check() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    const email = 'mokhtar@mokhtar.com';

    console.log(`\n🔍 Checking user with email: ${email}\n`);
    
    const user = await prisma.user.findUnique({ 
        where: { email },
        include: {
            company: true,
            userCompanies: {
                include: {
                    company: true
                }
            },
            devTeamMember: true
        }
    });

    if (user) {
        console.log('✅ User FOUND:\n');
        console.log('📧 Email:', user.email);
        console.log('👤 Name:', user.firstName, user.lastName);
        console.log('🎭 Role:', user.role);
        console.log('✅ Active:', user.isActive);
        console.log('🏢 Primary Company ID:', user.companyId);
        
        if (user.company) {
            console.log('🏢 Primary Company Name:', user.company.name);
        }
        
        console.log('\n📋 Companies (via UserCompany):');
        if (user.userCompanies && user.userCompanies.length > 0) {
            user.userCompanies.forEach((uc, index) => {
                console.log(`  ${index + 1}. ${uc.company.name} (ID: ${uc.companyId}) - Role: ${uc.role || 'N/A'}`);
            });
        } else {
            console.log('  No companies found in UserCompany table');
        }
        
        if (user.devTeamMember) {
            console.log('\n👨‍💻 DevTeamMember:', 'YES');
        }
        
        console.log('\n📝 Full User Object:');
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log('❌ User NOT found');
    }

    process.exit(0);
}

check().catch(console.error);
