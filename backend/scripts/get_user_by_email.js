const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const email = 'mokhta100r@mokhtar.com';
    console.log(`🔍 Searching for user: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                company: {
                    include: {
                        hrSettings: true
                    }
                }
            }
        });

        if (!user) {
            console.log('❌ User not found.');
            return;
        }

        console.log('✅ User Found:');
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Company ID: ${user.companyId}`);
        console.log(`   - Company Name: ${user.company?.name}`);

        console.log('\n⚙️ HR Settings:');
        if (user.company?.hrSettings) {
            console.log(JSON.stringify(user.company.hrSettings, null, 2));
        } else {
            console.log('   ⚠️ HR Settings missing for this company.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
