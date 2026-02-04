
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMokhtar() {
    try {
        const email = 'mokhtar@mokhtar.com';
        console.log(`🔍 Checking for user: ${email}`);

        // 1. Get User & Company
        const user = await prisma.user.findUnique({
            where: { email },
            include: { company: true }
        });

        if (!user) {
            console.log('❌ User mokhtar@mokhtar.com not found in DB.');
            return;
        }

        console.log(`✅ User Found: ${user.name} (Role: ${user.role})`);
        console.log(`🏢 Company: ${user.company?.name || 'None'} (ID: ${user.companyId})`);

        if (!user.companyId) return;

        // 2. Get AI Settings
        const settings = await prisma.aiSettings.findUnique({
            where: { companyId: user.companyId }
        });

        console.log('--------------------------------------------------');
        if (!settings) {
            console.log('⚠️ No AI Settings found for this company.');
            console.log('   (Default state is DISABLED)');
        } else {
            console.log(`🤖 AI STATUS: ${settings.autoReplyEnabled ? 'ACTIVE ✅' : 'DISABLED ❌'}`);
            console.log(`   Reply Mode: ${settings.replyMode}`);
            console.log(`   Last Updated: ${settings.updatedAt}`);
        }
        console.log('--------------------------------------------------');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkMokhtar();
