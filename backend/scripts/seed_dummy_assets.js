const { PrismaClient } = require('../prisma/generated/mysql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding dummy asset data...');

    try {
        // 1. Get Company
        const company = await prisma.company.findFirst();
        if (!company) {
            console.error('No company found! Please create a company first.');
            return;
        }
        console.log(`Using Company: ${company.name} (${company.id})`);

        // 2. Get User
        const user = await prisma.user.findFirst({
            where: { companyId: company.id }
        });
        if (!user) {
            console.error('No user found in this company!');
            return;
        }
        console.log(`Using User: ${user.firstName} ${user.lastName} (${user.id})`);

        // 3. Get/Create Category
        let category = await prisma.assetCategory.findFirst({
            where: { companyId: company.id }
        });

        if (!category) {
            category = await prisma.assetCategory.create({
                data: {
                    companyId: company.id,
                    name: 'Electronics',
                    description: 'Dummy Category'
                }
            });
            console.log('Created Category: Electronics');
        }

        // 4. Create Asset
        const assetCode = `DUMMY-${Date.now()}`;
        const asset = await prisma.asset.create({
            data: {
                companyId: company.id,
                categoryId: category.id,
                name: 'MacBook Pro M3 (Test)',
                code: assetCode,
                serialNumber: `SN${Date.now()}`,
                status: 'IN_USE', // Will be assigned
                condition: 'NEW',
                assignedToId: user.id
            }
        });
        console.log(`Created Asset: ${asset.name} (${asset.id})`);

        // 5. Create Assignment (Active)
        await prisma.assetAssignment.create({
            data: {
                assetId: asset.id,
                userId: user.id,
                assignedBy: user.id, // Assigned by self for test
                assignedAt: new Date(),
                expectedReturnAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                conditionOnAssign: 'NEW',
                notes: 'Test assignment'
            }
        });
        console.log('Created Active Assignment.');

        // 6. Create History Record
        await prisma.assetCustodyHistory.create({
            data: {
                assetId: asset.id,
                userId: user.id,
                assignedBy: user.id,
                action: 'ASSIGNED',
                assignedAt: new Date(),
                expectedReturnAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                notes: 'Test assignment history'
            }
        });
        console.log('Created History Record.');

        console.log('Done! Refresh the page.');

    } catch (e) {
        console.error('Error seeding:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
