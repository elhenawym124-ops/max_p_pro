
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const companyId = '71ab1ca7-271d-4e3a-b77c-72a51ddff454';

async function checkEmployees() {
    try {
        console.log(`Checking employees for company: ${companyId}`);

        const users = await prisma.user.findMany({
            where: {
                companyId: companyId
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeNumber: true,
                role: true
            }
        });

        console.log(`Found ${users.length} users in company.`);

        let empCount = 1;

        // Loop through all users
        for (const user of users) {
            console.log(`Processing user: ${user.firstName} ${user.lastName} (${user.email})`);

            // 1. Ensure UserCompany exists
            try {
                const userId = user.id;
                // Check if already exists to avoid unnecessary writes if possible, but upsert is safe
                await prisma.userCompany.upsert({
                    where: {
                        userId_companyId: {
                            userId: userId,
                            companyId: companyId
                        }
                    },
                    create: {
                        userId: userId,
                        companyId: companyId,
                        role: user.role || 'AGENT',
                        isActive: true,
                        isDefault: true
                    },
                    update: {
                        isActive: true
                    }
                });
                console.log('  - UserCompany ensured.');
            } catch (e) {
                console.error('  - Error upserting UserCompany:', e.message);
            }

            // 2. Update User with Employee Number if missing
            if (!user.employeeNumber) {
                const empNum = `EMP${String(empCount).padStart(5, '0')}`;
                console.log(`  - Setting employee number to ${empNum}...`);
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        employeeNumber: empNum,
                        hireDate: new Date(),
                        contractType: 'FULL_TIME',
                        departmentId: null,
                        positionId: null
                    }
                });
                empCount++;
            } else {
                console.log(`  - Already has employee number: ${user.employeeNumber}`);
                // Parse existing number to increment counter safely
                const match = user.employeeNumber.match(/EMP(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num >= empCount) empCount = num + 1;
                }
            }
        }
        console.log('All users processed.');

        // 3. Create a dummy employee for testing if only 1 user exists
        if (users.length === 1) {
            console.log('Only 1 user found. Creating a test employee...');
            const testEmail = `test_employee_${Date.now()}@example.com`;
            const testEmpNum = `EMP${String(empCount).padStart(5, '0')}`;

            const newUser = await prisma.user.create({
                data: {
                    email: testEmail,
                    password: '$2a$12$GwF.7jS9.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', // dummy hash
                    firstName: 'Test',
                    lastName: 'Employee',
                    companyId: companyId,
                    employeeNumber: testEmpNum,
                    isActive: true,
                    role: 'AGENT'
                }
            });

            await prisma.userCompany.create({
                data: {
                    userId: newUser.id,
                    companyId: companyId,
                    role: 'AGENT',
                    isActive: true,
                    isDefault: true
                }
            });
            console.log(`Created test employee: ${testEmail} (${testEmpNum})`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkEmployees();
