
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserRole() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'superadmin@system.com' }
        });

        if (user) {
            console.log(`User found: ${user.firstName} ${user.lastName}`);
            console.log(`Role: ${user.role}`);
        } else {
            console.log('User not found.');
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserRole();
