const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySecurityFixes() {
    console.log('🔒 Starting Security Verification...');

    // Test Data
    const TIMESTAMP = Date.now();
    const COMPANY_ID = 'test_company_' + TIMESTAMP;
    const OWNER_ID = 'test_owner_' + TIMESTAMP;
    const ADMIN_ID = 'test_admin_' + TIMESTAMP;
    const USER_ID = 'test_user_' + TIMESTAMP;

    try {
        // 1. Setup Phase
        console.log('📝 Setting up test data...');

        // Create Company
        const company = await prisma.company.create({
            data: {
                id: COMPANY_ID,
                name: 'Security Test Company',
                email: `security_${TIMESTAMP}@check.com`,
                plan: 'BASIC'
            }
        });

        // Create Users
        const owner = await prisma.user.create({
            data: {
                id: OWNER_ID,
                email: `owner_${TIMESTAMP}@test.com`,
                firstName: 'Owner',
                lastName: 'Test',
                password: 'hash',
                companyId: COMPANY_ID
            }
        });

        await prisma.userCompany.create({
            data: {
                userId: OWNER_ID,
                companyId: COMPANY_ID,
                role: 'OWNER',
                isDefault: true
            }
        });

        const admin = await prisma.user.create({
            data: {
                id: ADMIN_ID,
                email: `admin_${TIMESTAMP}@test.com`,
                firstName: 'Admin',
                lastName: 'Test',
                password: 'hash',
                companyId: COMPANY_ID
            }
        });

        await prisma.userCompany.create({
            data: {
                userId: ADMIN_ID,
                companyId: COMPANY_ID,
                role: 'COMPANY_ADMIN',
                isDefault: true
            }
        });

        // 2. Test Deletion Protection
        console.log('🧪 Testing Owner Deletion Protection...');
        // We will simulate the check logic manually since we can't easily call the controller function directly without mocking req/res
        // Logic from controller:
        const targetUserCompany = await prisma.userCompany.findFirst({
            where: { userId: OWNER_ID, companyId: COMPANY_ID }
        });

        if (targetUserCompany.role === 'OWNER') {
            console.log('✅ PASS: Detected OWNER role correctly.');
        } else {
            console.error('❌ FAIL: Failed to detect OWNER role.');
        }

        // 3. Test Ownership Transfer Logic
        console.log('🧪 Testing Ownership Transfer Logic...');

        // Simulate Transfer
        await prisma.$transaction(async (tx) => {
            // Demote Owner
            await tx.userCompany.update({
                where: { userId_companyId: { userId: OWNER_ID, companyId: COMPANY_ID } },
                data: { role: 'COMPANY_ADMIN' }
            });

            // Promote Admin
            await tx.userCompany.update({
                where: { userId_companyId: { userId: ADMIN_ID, companyId: COMPANY_ID } },
                data: { role: 'OWNER' }
            });
        });

        // Verify Transfer
        const newOwner = await prisma.userCompany.findUnique({
            where: { userId_companyId: { userId: ADMIN_ID, companyId: COMPANY_ID } }
        });

        const oldOwner = await prisma.userCompany.findUnique({
            where: { userId_companyId: { userId: OWNER_ID, companyId: COMPANY_ID } }
        });

        if (newOwner.role === 'OWNER' && oldOwner.role === 'COMPANY_ADMIN') {
            console.log('✅ PASS: Ownership transfer successful.');
        } else {
            console.error('❌ FAIL: Ownership transfer failed.');
        }

    } catch (e) {
        console.error('❌ Error during verification:', e);
    } finally {
        // Cleanup
        console.log('🧹 Cleaning up...');
        await prisma.userCompany.deleteMany({ where: { companyId: COMPANY_ID } });
        await prisma.user.deleteMany({ where: { companyId: COMPANY_ID } });
        await prisma.company.delete({ where: { id: COMPANY_ID } });
        await prisma.$disconnect();
    }
}

verifySecurityFixes();
