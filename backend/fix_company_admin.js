const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

async function fix() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    const companyId = 'cmjpl47ym0dzwjupybv59lisu';
    const newEmail = 'admin.sm@demo.com';
    const password = 'password123';

    console.log(`Fixing company admin for: ${companyId}`);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingUser) {
        console.log('⚠️ User already exists, updating role and company...');
        await prisma.user.update({
            where: { email: newEmail },
            data: {
                role: 'COMPANY_ADMIN',
                companyId: companyId,
                isActive: true
            }
        });
    } else {
        console.log('Creating new admin user...');
        await prisma.user.create({
            data: {
                email: newEmail,
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'SM',
                role: 'COMPANY_ADMIN',
                companyId: companyId,
                isActive: true,
                isEmailVerified: true
            }
        });
    }

    console.log(`✅ Company Admin set to: ${newEmail}`);
    console.log(`✅ Password: ${password}`);

    process.exit(0);
}

fix().catch(console.error);
