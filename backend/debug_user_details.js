const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function debugUserDetails() {
    console.log('🔍 Debugging User Details...\n');
    
    try {
        const prisma = getSharedPrismaClient();
        
        // Find SUPER_ADMIN user
        const superAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
            include: { 
                company: true
            }
        });
        
        if (superAdmin) {
            console.log('✅ SUPER_ADMIN User Found:');
            console.log(`📧 Email: ${superAdmin.email}`);
            console.log(`🆔 ID: ${superAdmin.id}`);
            console.log(`👤 Role: ${superAdmin.role}`);
            console.log(`🏢 CompanyId: ${superAdmin.companyId}`);
            console.log(`🏢 Company: ${superAdmin.company ? superAdmin.company.name : 'None'}`);
            console.log(`✅ isActive: ${superAdmin.isActive}`);
            
            // Check all companies
            const allCompanies = await prisma.company.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            });
            
            console.log(`\n📋 All Companies in Database (${allCompanies.length}):`);
            allCompanies.forEach(company => {
                console.log(`  - ${company.name} (${company.id})`);
            });
            
        } else {
            console.log('❌ No SUPER_ADMIN user found');
            
            // Find any active users
            const users = await prisma.user.findMany({
                where: { isActive: true },
                include: { company: true },
                take: 5
            });
            
            console.log(`\n📋 Active Users (${users.length}):`);
            users.forEach(user => {
                console.log(`  - ${user.email} (${user.role}) - Company: ${user.company?.name || 'None'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugUserDetails().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});
