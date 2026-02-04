const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCompanyProducts() {
    console.log('🔍 Searching for company "mokhtar@mokhtar.com"...');

    // 1. Find the company
    const company = await prisma.company.findFirst({
        where: {
            OR: [
                { email: 'mokhtar@mokhtar.com' },
                { name: { contains: 'مختار' } }
            ]
        }
    });

    if (!company) {
        console.log('❌ Company not found!');
        await prisma.$disconnect();
        return;
    }

    console.log(`✅ Found Company: ${company.name} (ID: ${company.id})`);

    // 2. Find products for this company
    const products = await prisma.product.findMany({
        where: { companyId: company.id },
        select: {
            id: true,
            name: true,
            price: true,
            images: true
        },
        take: 10
    });

    console.log(`\n📦 Products found for this company (${products.length}):`);
    products.forEach(p => {
        console.log(`- [${p.id}] ${p.name} | Price: ${p.price} | Images: ${p.images ? (Array.isArray(p.images) ? p.images.length : 'Yes') : 'No'}`);
        if (p.images && Array.isArray(p.images)) {
            console.log(`  URLs: ${p.images.slice(0, 2).join(', ')}`);
        }
    });

    // 3. Find Global/Central products that might be leaking
    const centralProducts = await prisma.product.findMany({
        where: { companyId: null },
        take: 5
    });

    console.log(`\n🌐 Central/System Products (${centralProducts.length}):`);
    centralProducts.forEach(p => {
        console.log(`- ${p.name}`);
    });

    await prisma.$disconnect();
}

findCompanyProducts().catch(console.error);
