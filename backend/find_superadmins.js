
const { PrismaClient } = require('./generated/mysql');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            role: 'SUPER_ADMIN'
        },
        select: {
            email: true,
            firstName: true,
            lastName: true,
            isActive: true
        }
    });
    console.log('Super Admins:', JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
