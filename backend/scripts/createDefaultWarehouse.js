const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function createDefaultWarehouse() {
  try {
    const prisma = getSharedPrismaClient();
    
    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });

    console.log(`Found ${companies.length} companies`);

    for (const company of companies) {
      // Check if company already has a warehouse
      const existingWarehouse = await prisma.warehouse.findFirst({
        where: { companyId: company.id }
      });

      if (!existingWarehouse) {
        // Create default warehouse
        const warehouse = await prisma.warehouse.create({
          data: {
            name: 'المستودع الرئيسي',
            location: 'الموقع الرئيسي',
            type: 'main',
            isActive: true,
            companyId: company.id,
            updatedAt: new Date()
          }
        });

        console.log(`✅ Created default warehouse for company: ${company.name} (ID: ${warehouse.id})`);
      } else {
        console.log(`ℹ️  Company ${company.name} already has a warehouse`);
      }
    }

    console.log('✅ Default warehouse creation completed');
  } catch (error) {
    console.error('❌ Error creating default warehouse:', error);
  }
}

createDefaultWarehouse();
