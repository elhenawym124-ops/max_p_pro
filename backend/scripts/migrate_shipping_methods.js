const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    console.log('🚀 Starting Shipping Migration...');

    // 1. Fetch all existing zones
    const zones = await prisma.shippingZone.findMany({
        include: { shippingMethods: true }
    });

    console.log(`📊 Found ${zones.length} zones.`);

    let createdMethods = 0;

    for (const zone of zones) {
        // Check if zone already has methods (to avoid double migration)
        if (zone.shippingMethods.length > 0) {
            console.log(`⏩ Zone "${zone.name}" (${zone.id}) already has methods. Skipping.`);
            continue;
        }

        // Determine legacy price and type
        const legacyPrice = parseFloat(zone.price || 0);
        const legacyType = zone.pricingType || 'flat'; // 'flat', 'tiered'

        // Create a default "Standard Delivery" method for this zone
        // If it was tiered, we might need to handle it, but for now we migrate flat price.
        // Ideally, we store the legacy configuration in 'settings'.

        const settings = {
            cost: legacyPrice,
            taxable: false,
            tiers: zone.pricingTiers ? JSON.parse(zone.pricingTiers || '[]') : []
        };

        const methodType = legacyType === 'flat' ? 'flat_rate' : 'weight_based'; // Mapping legacy types

        await prisma.shippingMethod.create({
            data: {
                zoneId: zone.id,
                title: 'توصيل قياسي (شحن عادي)', // Standard Delivery
                type: methodType,
                isEnabled: true,
                settings: JSON.stringify(settings),
                sortOrder: 1
            }
        });

        createdMethods++;
        console.log(`✅ Migrated Zone "${zone.name}" -> Created Method (${legacyPrice} EGP)`);
    }

    console.log(`\n🎉 Migration Complete. Created ${createdMethods} new Shipping Methods.`);
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
