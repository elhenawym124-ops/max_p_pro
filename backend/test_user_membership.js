const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserMembership() {
    try {
        const userId = 'cmiug0rm70vbdjuewr9cuiy82';
        const companyId = 'cmjpl47ym0dzwjupybv59lisu';
        const userEmail = 'mokhtar@mokhtar.com';

        console.log('🔍 Checking user membership...\n');

        // Check UserCompany table
        const userCompany = await prisma.userCompany.findFirst({
            where: {
                userId: userId,
                companyId: companyId
            },
            include: {
                user: true,
                company: true
            }
        });

        console.log('📋 UserCompany record:', userCompany ? {
            id: userCompany.id,
            userId: userCompany.userId,
            companyId: userCompany.companyId,
            role: userCompany.role,
            isActive: userCompany.isActive,
            userEmail: userCompany.user.email,
            companyName: userCompany.company.name
        } : 'NOT FOUND');

        // Check all memberships for this user
        const allMemberships = await prisma.userCompany.findMany({
            where: {
                userId: userId
            },
            include: {
                company: true
            }
        });

        console.log(`\n📊 Total memberships for ${userEmail}: ${allMemberships.length}`);
        allMemberships.forEach((membership, index) => {
            console.log(`   ${index + 1}. ${membership.company.name} (${membership.role})`);
        });

        // Check user's global role
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        console.log(`\n👤 User global role: ${user?.role || 'NOT FOUND'}`);

        if (userCompany) {
            console.log('\n❌ User is STILL a member of SM company!');
            console.log('   The deletion did NOT work.');
        } else {
            console.log('\n✅ User is NOT a member of SM company.');
            console.log('   The deletion worked successfully.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserMembership();
