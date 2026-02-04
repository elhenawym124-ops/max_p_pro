const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findUnique({
        where: { email: 'demo@example.com' },
    });

    if (!company) {
        console.error('Demo company not found!');
        return;
    }

    const hashedPassword = await bcrypt.hash('123456', 12);

    const user = await prisma.user.upsert({
        where: { email: 'mokhtar@mokhtar.com' },
        update: {
            password: hashedPassword,
            role: 'SUPER_ADMIN', // Giving super admin just in case
            companyId: company.id,
            isActive: true,
        },
        create: {
            email: 'mokhtar@mokhtar.com',
            password: hashedPassword,
            firstName: 'Mokhtar',
            lastName: 'User',
            role: 'SUPER_ADMIN',
            isActive: true,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            companyId: company.id,
        },
    });

    console.log('✅ User created:', user.email);
    console.log('🔑 Password: 123456');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
