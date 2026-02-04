const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    console.log('🧹 Cleaning up duplicate shipping zones per company...\n');

    // Get all companies
    const companies = await prisma.company.findMany({
        include: {
            shippingZones: {
                include: {
                    shippingMethods: true
                }
            }
        }
    });

    console.log(`Found ${companies.length} companies\n`);

    for (const company of companies) {
        console.log(`\n📦 Company: ${company.name || company.id}`);
        console.log(`   Zones: ${company.shippingZones.length}`);

        if (company.shippingZones.length === 0) {
            console.log('   ⏩ No zones, skipping');
            continue;
        }

        // Group zones by governorates (to find duplicates)
        const zonesByGovs = {};

        for (const zone of company.shippingZones) {
            try {
                const govs = JSON.parse(zone.governorates);
                const key = govs.sort().join('|'); // Create unique key

                if (!zonesByGovs[key]) {
                    zonesByGovs[key] = [];
                }
                zonesByGovs[key].push(zone);
            } catch (e) {
                console.log(`   ⚠️ Could not parse zone ${zone.id}`);
            }
        }

        // Find and report duplicates
        let duplicatesFound = 0;
        for (const [key, zones] of Object.entries(zonesByGovs)) {
            if (zones.length > 1) {
                duplicatesFound++;
                console.log(`\n   ⚠️ DUPLICATE: ${zones.length} zones with same governorates:`);
                zones.forEach((z, i) => {
                    console.log(`      ${i + 1}. "${z.name}" - ${z.price} EGP - Methods: ${z.shippingMethods.length} - Active: ${z.isActive}`);
                });

                // Keep the one with methods, or the first active one
                const zoneToKeep = zones.find(z => z.shippingMethods.length > 0 && z.isActive)
                    || zones.find(z => z.isActive)
                    || zones[0];

                const zonesToDeactivate = zones.filter(z => z.id !== zoneToKeep.id);

                console.log(`      ✅ Keeping: "${zoneToKeep.name}"`);
                console.log(`      ❌ Will deactivate: ${zonesToDeactivate.length} zones`);

                // Deactivate duplicates
                for (const zone of zonesToDeactivate) {
                    await prisma.shippingZone.update({
                        where: { id: zone.id },
                        data: { isActive: false }
                    });
                    console.log(`         - Deactivated "${zone.name}"`);
                }
            }
        }

        if (duplicatesFound === 0) {
            console.log('   ✅ No duplicates found');
        } else {
            console.log(`\n   🎉 Cleaned ${duplicatesFound} duplicate groups`);
        }
    }

    console.log('\n\n✅ Cleanup complete!\n');
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
