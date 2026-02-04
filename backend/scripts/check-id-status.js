
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
    const companyId = 'cmem8ayyr004cufakqkcsyn97';
    console.log(`🔍 Checking status for Company ID: ${companyId}`);

    try {
        const settings = await prisma.aiSettings.findUnique({
            where: { companyId }
        });

        if (!settings) {
            console.log('❌ No settings found for this company.');
            return;
        }

        console.log('--------------------------------');
        console.log(`ENABLED:      ${settings.autoReplyEnabled}`);
        console.log(`REPLY MODE:   ${settings.replyMode}`);
        console.log(`UPDATED AT:   ${settings.updatedAt}`);
        console.log('--------------------------------');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStatus();
