
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkStatus() {
    const prisma = new PrismaClient();
    try {
        const user = await prisma.user.findUnique({ where: { email: 'ali@ali.com' } });
        if (!user) { console.log('USER_NOT_FOUND'); return; }

        const settings = await prisma.aiSettings.findUnique({ where: { companyId: user.companyId } });

        if (!settings) {
            console.log('NO_SETTINGS_FOUND');
        } else {
            console.log(`STATUS:${settings.autoReplyEnabled ? 'ACTIVE' : 'DISABLED'}`);
            console.log(`REPLY_MODE:${settings.replyMode}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkStatus();
