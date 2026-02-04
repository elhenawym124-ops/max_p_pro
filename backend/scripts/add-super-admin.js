
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');

const prisma = getSharedPrismaClient();

async function addSuperAdmin() {
    const args = process.argv.slice(2);
    const getArg = (name, defaultValue) => {
        const arg = args.find(a => a.startsWith(`--${name}=`));
        return arg ? arg.split('=')[1] : defaultValue;
    };

    const email = getArg('email', 'admin2@mokhtarelhenawy.com');
    const password = getArg('password', 'SuperAdmin@2026!');
    const firstName = getArg('firstName', 'Super');
    const lastName = getArg('lastName', 'Admin');

    try {
        console.log(`🚀 [ADD-SUPER-ADMIN] Creating additional super admin: ${email}`);

        const hashedPassword = await bcrypt.hash(password, 12);

        const superAdmin = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                firstName,
                lastName,
                role: 'SUPER_ADMIN',
                isActive: true,
                isEmailVerified: true,
                companyId: null
            }
        });

        console.log('\n✅ [ADD-SUPER-ADMIN] Super admin created successfully!');
        console.log('📋 User Details:');
        console.log('   Email:', superAdmin.email);
        console.log('   Password:', password);
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');

    } catch (error) {
        console.error('\n❌ [ADD-SUPER-ADMIN] Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

addSuperAdmin();
