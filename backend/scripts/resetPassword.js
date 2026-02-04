const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
    try {
        const email = 'shroukmagdi444@gmail.com';
        const newPassword = '123456';

        console.log(`🔄 Resetting password for ${email} to "${newPassword}"...`);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword
            }
        });

        console.log('✅ Password reset successfully!');
        console.log('  - User ID:', user.id);
        console.log('  - Email:', user.email);
        console.log('  - New Hash:', user.password.substring(0, 30) + '...');

    } catch (error) {
        console.error('❌ Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
