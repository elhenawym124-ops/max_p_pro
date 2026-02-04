const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const user = await prisma.user.findFirst({
            where: {
                firstName: 'UpdatedName',
                lastName: 'cvbcb'
            },
            include: { company: true }
        });

        if (user) {
            console.log('✅ User Found:', JSON.stringify(user, null, 2));
        } else {
            console.log('❌ User not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
