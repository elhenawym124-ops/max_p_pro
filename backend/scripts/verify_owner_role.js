
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyOwnerRole() {
    try {
        console.log('🔍 Verifying OWNER role in DevSystemSettings...\n');

        const settings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!settings) {
            console.error('❌ No DevSystemSettings found.');
            process.exit(1);
        }

        const permissions = JSON.parse(settings.permissions);

        if (permissions['OWNER']) {
            console.log('✅ OWNER role found!');
            console.log('Permissions:', permissions['OWNER']);

            if (permissions['OWNER'].canCreate === true && permissions['OWNER'].viewScope === 'all') {
                console.log('✅ OWNER permissions appear correct (canCreate: true, viewScope: all).');
            } else {
                console.log('⚠️ OWNER role exists but permissions might be incorrect.');
            }

        } else {
            console.error('❌ OWNER role NOT found in permissions.');
            console.log('Available roles:', Object.keys(permissions));
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verifyOwnerRole();
