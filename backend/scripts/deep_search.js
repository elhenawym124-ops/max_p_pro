const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepSearch() {
    const wrongCompanyId = 'cmem8ayyr004cufakqkcsyn97';
    console.log(`📦 Listing all products for "شركة التسويق" (${wrongCompanyId}):`);

    const wrongProducts = await prisma.product.findMany({
        where: { companyId: wrongCompanyId },
        select: { name: true, price: true }
    });
    wrongProducts.forEach(p => console.log(`- ${p.name} (${p.price})`));

    console.log('\n🔍 Searching for "Marketing", "Mokhtar", or "0165676135" in companies...');
    const targetCompanies = await prisma.company.findMany({
        where: {
            OR: [
                { name: { contains: 'Mokhtar' } },
                { name: { contains: 'مختار' } },
                { name: { contains: 'Marketing' } },
                { name: { contains: 'تسويق' } },
                { phone: { contains: '0165676135' } }
            ]
        }
    });

    if (targetCompanies.length === 0) {
        console.log('❌ No company found matching the user details.');
    } else {
        console.log(`✅ Found ${targetCompanies.length} companies:`);
        targetCompanies.forEach(c => {
            console.log(`- [${c.id}] ${c.name} | Email: ${c.email} | Phone: ${c.phone}`);
        });
    }

    await prisma.$disconnect();
}

deepSearch().catch(console.error);
