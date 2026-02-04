const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTestProducts() {
    const companyId = 'cmem8ayyr004cufakqkcsyn97';
    // Define the date range for Dec 6th, 2025
    const startDate = new Date('2025-12-06T00:00:00.000Z');
    const endDate = new Date('2025-12-06T23:59:59.999Z');

    console.log(`🗑️ Starting deletion of test products for company: ${companyId}`);
    console.log(`📅 Target Date Range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // 1. Verify count before deletion
    const productsToDelete = await prisma.product.findMany({
        where: {
            companyId: companyId,
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        },
        select: { id: true, name: true }
    });

    console.log(`⚠️ Found ${productsToDelete.length} products to delete:`);
    productsToDelete.forEach(p => console.log(`- ${p.name} (${p.id})`));

    if (productsToDelete.length === 0) {
        console.log('✅ No matching products found to delete.');
        return;
    }

    // 2. Execute deletion
    const deleteResult = await prisma.product.deleteMany({
        where: {
            companyId: companyId,
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    console.log(`\n✅ Successfully deleted ${deleteResult.count} products.`);

    // 3. Verify clean state
    const remainingCount = await prisma.product.count({
        where: { companyId: companyId }
    });
    console.log(`📦 Remaining products for this company: ${remainingCount}`);

    await prisma.$disconnect();
}

deleteTestProducts().catch(console.error);
