
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

async function run() {
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: 'mokhtar@mokhtar.com' },
                    { AND: [{ firstName: { contains: 'mokhtar' } }, { lastName: { contains: 'elhenawy' } }] }
                ]
            },
            include: { company: true }
        });

        if (!user) { console.log('@@RES:USER_404'); return; }
        console.log(`@@RES:FOUND:${user.email}`);
        console.log(`@@RES:COMPANY:${user.companyId}`);

        const s = await prisma.aiSettings.findUnique({ where: { companyId: user.companyId } });
        if (!s) console.log('@@RES:SETTINGS:MISSING');
        else console.log(`@@RES:STATUS:${s.autoReplyEnabled}`);
    } catch (e) { console.log('@@RES:ERR:' + e.message); }
    finally { await prisma.$disconnect(); }
}
run();
