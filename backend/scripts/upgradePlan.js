const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function upgradePlan() {
    try {
        const companyId = "cmem8ayyr004cufakqkcsyn97";

        console.log(`🚀 Upgrading plan for company ID: ${companyId}`);

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                plan: 'ENTERPRISE'
            }
        });

        console.log(`✅ Plan upgraded successfully to: ${updatedCompany.plan}`);

    } catch (error) {
        console.error('❌ Error updating plan:', error);
    } finally {
        await prisma.$disconnect();
    }
}

upgradePlan();
