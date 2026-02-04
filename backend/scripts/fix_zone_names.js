const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    console.log('🔧 Updating Shipping Zone Names...');

    // Get all zones
    const zones = await prisma.shippingZone.findMany({
        where: {
            name: ''
        }
    });

    console.log(`Found ${zones.length} zones with empty names`);

    for (const zone of zones) {
        // Parse governorates to create a meaningful name
        let govs = [];
        try {
            govs = JSON.parse(zone.governorates);
        } catch (e) {
            console.log(`⚠️ Could not parse governorates for zone ${zone.id}`);
            continue;
        }

        // Create name from first governorate or price
        let newName = '';
        if (govs.length > 0) {
            // Use first governorate as base name
            const firstGov = govs[0];
            if (govs.length === 1) {
                newName = `منطقة ${firstGov}`;
            } else if (govs.length === 2) {
                newName = `${govs[0]} و ${govs[1]}`;
            } else {
                newName = `${firstGov} و ${govs.length - 1} محافظات أخرى`;
            }
        } else {
            newName = `منطقة شحن - ${zone.price} ج.م`;
        }

        await prisma.shippingZone.update({
            where: { id: zone.id },
            data: { name: newName }
        });

        console.log(`✅ Updated zone ${zone.id}: "${newName}"`);
    }

    console.log('\n🎉 Done!');
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
