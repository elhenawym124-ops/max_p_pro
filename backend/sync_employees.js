/**
 * 🛠️ Sync Users to Employees Script
 * Ensures all users in a specific company have an employeeNumber and are active in HR.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncUsersToEmployees(companyId) {
    if (!companyId) {
        console.error('❌ Please provide a companyId');
        process.exit(1);
    }

    try {
        console.log(`\n🚀 Starting sync for company: ${companyId}\n`);

        // 1. Find all users in this company
        const users = await prisma.user.findMany({
            where: { companyId },
        });

        console.log(`📊 Found ${users.length} users in this company.`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // Create UserCompany record if missing
            await prisma.userCompany.upsert({
                where: {
                    userId_companyId: {
                        userId: user.id,
                        companyId: companyId
                    }
                },
                create: {
                    userId: user.id,
                    companyId: companyId,
                    role: user.role || 'AGENT',
                    isActive: true,
                    isDefault: true
                },
                update: { isActive: true }
            });

            if (!user.employeeNumber) {
                // Generate a new employee number
                const lastEmployee = await prisma.user.findFirst({
                    where: {
                        companyId,
                        employeeNumber: { not: null }
                    },
                    orderBy: { employeeNumber: 'desc' },
                    select: { employeeNumber: true }
                });

                let nextNumber = 1;
                if (lastEmployee?.employeeNumber) {
                    const match = lastEmployee.employeeNumber.match(/EMP(\d+)/);
                    if (match) {
                        nextNumber = parseInt(match[1], 10) + 1;
                    }
                }

                const newEmpNum = `EMP${String(nextNumber).padStart(5, '0')}`;

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        employeeNumber: newEmpNum,
                        hireDate: user.createdAt || new Date(),
                        contractType: 'FULL_TIME',
                        isActive: true
                    }
                });

                console.log(`✅ Linked user ${user.email} -> ${newEmpNum}`);
                updatedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`\n✨ Sync completed!`);
        console.log(`✅ Updated/Linked: ${updatedCount}`);
        console.log(`⏭️ Already linked: ${skippedCount}\n`);

    } catch (error) {
        console.error('❌ Error during sync:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const targetCompanyId = process.argv[2];
syncUsersToEmployees(targetCompanyId);
