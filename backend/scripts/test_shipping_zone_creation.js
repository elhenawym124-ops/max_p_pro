
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'test-company-id'; // using a fake ID, might fail on FK constraint if checking, usually fine for test or need real ID

    // We need a real company ID for FK
    const company = await prisma.company.findFirst();
    if (!company) {
        console.log('No company found to test with.');
        return;
    }

    console.log('Testing with company:', company.id);

    try {
        const zone = await prisma.shippingZone.create({
            data: {
                name: 'Test Zone ' + Date.now(),
                governorates: '["Cairo"]', // JSON string
                price: 50.0,
                deliveryTime: '2-3 days',
                companyId: company.id,
                // updatedAt is OMITTED, should be handled by @updatedAt
            }
        });
        console.log('✅ Successfully created ShippingZone:', zone.id);
        console.log('updatedAt:', zone.updatedAt);

        // Clean up
        await prisma.shippingZone.delete({ where: { id: zone.id } });
        console.log('✅ Cleaned up test zone.');

    } catch (e) {
        console.error('❌ Error creating ShippingZone:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
