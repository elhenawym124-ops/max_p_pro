
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkStatusByUser() {
    const prisma = new PrismaClient();
    try {
        const email = 'ali@ali.com';
        console.log(`🔍 1. Searching for user: ${email}...`);

        const user = await prisma.user.findUnique({
            where: { email: email },
            include: { company: true }
        });

        if (!user) {
            console.log('❌ User not found.');
            return;
        }

        console.log(`✅ User Found: ${user.name} (Role: ${user.role})`);

        if (!user.companyId) {
            console.log('❌ User has no companyId linked.');
            return;
        }

        const companyId = user.companyId;
        console.log(`🏢 Linked Company: "${user.company?.name}" (ID: ${companyId})`);

        console.log(`\n🔍 2. Fetching AI Settings for Company ID: ${companyId}...`);
        const aiSettings = await prisma.aiSettings.findUnique({
            where: { companyId: companyId }
        });

        if (!aiSettings) {
            console.log('⚠️ No AI Settings found for this company ID.');
            console.log('   (This means the system falls back to default settings, usually DISABLED)');
        } else {
            console.log('🤖 AI Settings from Database:');
            console.log('===================================================');
            console.log(`   ENABLED (autoReplyEnabled):  ${aiSettings.autoReplyEnabled}`);
            console.log(`   Reply Mode:                  ${aiSettings.replyMode}`);
            console.log(`   Updated At:                  ${aiSettings.updatedAt}`);
            console.log(`   Record ID:                   ${aiSettings.id}`);
            console.log('===================================================');

            if (aiSettings.autoReplyEnabled) {
                console.log('\n✅ FINAL VERDICT: AI IS ACTIVE in the database.');
            } else {
                console.log('\n❌ FINAL VERDICT: AI IS DISABLED in the database.');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkStatusByUser();
