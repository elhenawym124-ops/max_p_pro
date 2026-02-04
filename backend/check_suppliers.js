
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const companyId = '71ab1ca7-271d-4e3a-b77c-72a51ddff454';

async function checkSuppliers() {
    try {
        console.log(`Checking suppliers for company: ${companyId}`);

        const suppliers = await prisma.supplier.findMany({
            where: {
                companyId: companyId
            }
        });

        console.log(`Found ${suppliers.length} suppliers.`);
        suppliers.forEach(s => {
            console.log(`- ${s.name} (Mobile: ${s.mobile}, Address: ${s.address})`);
        });

        if (suppliers.length === 0) {
            console.log('Creating a test supplier...');
            await prisma.supplier.create({
                data: {
                    companyId,
                    name: 'Test Supplier',
                    mobile: '01000000000',
                    address: '123 Test St',
                    createdBy: 'system' // assuming simple string based on schema
                }
            });
            console.log('Test supplier created.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSuppliers();
