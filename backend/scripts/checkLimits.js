const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLimits() {
    try {
        const companyId = "cmem8ayyr004cufakqkcsyn97";

        console.log(`🔍 Checking limits for company ID: ${companyId}`);

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                users: {
                    select: { id: true, email: true, role: true, isActive: true }
                }
            }
        });

        if (!company) {
            console.log('❌ Company not found');
            return;
        }

        console.log(`📊 Company: ${company.name}`);
        console.log(`   Plan: ${company.plan}`);
        console.log(`\n👥 Users Count: ${company.users.length}`);
        console.log('   Users List:');
        company.users.forEach(u => {
            console.log(`   - [${u.role}] ${u.email} (${u.isActive ? 'Active' : 'Inactive'})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLimits();
