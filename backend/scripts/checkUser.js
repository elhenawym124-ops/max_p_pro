const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUser() {
    try {
        const email = 'shroukmagdi444@gmail.com';

        console.log('🔍 Checking user:', email);

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true
                    }
                }
            }
        });

        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('✅ User found:');
        console.log('  - ID:', user.id);
        console.log('  - Email:', user.email);
        console.log('  - Name:', user.firstName, user.lastName);
        console.log('  - Role:', user.role);
        console.log('  - Active:', user.isActive);
        console.log('  - Company:', user.company?.name);
        console.log('  - Company Active:', user.company?.isActive);
        console.log('  - Password Hash (first 30 chars):', user.password?.substring(0, 30) + '...');
        console.log('  - Hash length:', user.password?.length);

        // Test password
        const testPasswords = ['test123', '123456', 'admin123', 'password'];
        console.log('\n🔑 Testing common passwords:');

        for (const pwd of testPasswords) {
            const isValid = await bcrypt.compare(pwd, user.password);
            console.log(`  - "${pwd}": ${isValid ? '✅ MATCH' : '❌ No match'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();
