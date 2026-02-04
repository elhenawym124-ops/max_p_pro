const { getSharedPrismaClient } = require('./services/sharedDatabase');
const EmployeeService = require('./services/hr/employeeService');

async function verify() {
    const prisma = getSharedPrismaClient();
    const employeeService = require('./services/hr/employeeService');

    console.log('🚀 Starting Verification...');

    try {
        // 1. Create two test companies if not exists
        const compA = await prisma.company.upsert({
            where: { email: 'compA@test.com' },
            update: {},
            create: { name: 'Company A', email: 'compA@test.com', slug: 'compa' }
        });

        const compB = await prisma.company.upsert({
            where: { email: 'compB@test.com' },
            update: {},
            create: { name: 'Company B', email: 'compB@test.com', slug: 'compb' }
        });

        console.log(`✅ Companies Ready: ${compA.id}, ${compB.id}`);

        const testEmail = `test_user_multi_${Date.now()}@test.com`;

        // 2. Add employee to Company A
        console.log(`📝 Adding employee to Company A: ${testEmail}`);
        const empA = await employeeService.createEmployee(compA.id, {
            firstName: 'Multi',
            lastName: 'User',
            email: testEmail,
            employeeNumber: 'EMP-A-001'
        });
        console.log(`✅ Added to Company A. User ID: ${empA.id}`);

        // 3. Add same employee to Company B
        console.log(`📝 Adding same employee to Company B...`);
        const empB = await employeeService.createEmployee(compB.id, {
            firstName: 'Multi',
            lastName: 'User',
            email: testEmail,
            employeeNumber: 'EMP-B-001'
        });
        console.log(`✅ Added to Company B. User ID: ${empB.id}`);

        // 4. Verify UserCompany records
        const memberships = await prisma.userCompany.findMany({
            where: { userId: empA.id }
        });
        console.log(`📊 Total memberships for user: ${memberships.length}`);

        if (memberships.length >= 2) {
            console.log('🎉 SUCCESS: User belongs to both companies!');
        } else {
            console.error('❌ FAILURE: User does not have multiple memberships.');
        }

        // Cleanup (optional)
        // await prisma.user.delete({ where: { id: empA.id } });

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        process.exit();
    }
}

verify();
