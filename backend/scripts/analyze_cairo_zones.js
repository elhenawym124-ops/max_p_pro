const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    console.log('🔍 Analyzing Shipping Zones for Cairo...\n');

    // Get all zones
    const zones = await prisma.shippingZone.findMany({
        include: {
            shippingMethods: true
        }
    });

    console.log(`Total zones: ${zones.length}\n`);

    // Find zones containing Cairo
    const cairoZones = zones.filter(zone => {
        try {
            const govs = JSON.parse(zone.governorates);
            return govs.some(g => g.includes('القاهر'));
        } catch (e) {
            return false;
        }
    });

    console.log(`Zones containing Cairo: ${cairoZones.length}\n`);
    console.log('='.repeat(80));

    cairoZones.forEach((zone, index) => {
        const govs = JSON.parse(zone.governorates);
        console.log(`\n${index + 1}. Zone: "${zone.name}" (ID: ${zone.id})`);
        console.log(`   Company: ${zone.companyId}`);
        console.log(`   Price: ${zone.price} EGP`);
        console.log(`   Active: ${zone.isActive}`);
        console.log(`   Methods: ${zone.shippingMethods.length}`);
        console.log(`   Governorates: ${govs.join(', ')}`);

        if (zone.shippingMethods.length > 0) {
            zone.shippingMethods.forEach(method => {
                const settings = JSON.parse(method.settings || '{}');
                console.log(`     - ${method.title}: ${settings.cost || zone.price} EGP (${method.isEnabled ? 'Enabled' : 'Disabled'})`);
            });
        }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Recommendation: Merge duplicate zones or deactivate old ones\n');

    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
