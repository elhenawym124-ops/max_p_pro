require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE DIAGNOSTIC ---');
    console.log('ENV DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');

    try {
        const userCount = await prisma.user.count();
        console.log('Total Users:', userCount);

        const members = await prisma.devTeamMember.findMany({
            include: {
                user: {
                    select: { email: true, firstName: true, lastName: true }
                }
            }
        });

        console.log('\n--- Dev Team Members ---');
        members.forEach(m => {
            console.log(`- ID: ${m.id}, User: ${m.user?.email || 'N/A'}, Name: ${m.user?.firstName} ${m.user?.lastName}`);
        });

        // Check for "Mahmoud" specifically
        const mahmoud = await prisma.user.findFirst({
            where: {
                OR: [
                    { firstName: { contains: 'Mahmoud' } },
                    { lastName: { contains: 'saeed' } }
                ]
            },
            include: {
                devTeamMember: true
            }
        });

        if (mahmoud) {
            console.log('\n--- Specific User: Mahmoud Saeed ---');
            console.log('User ID:', mahmoud.id);
            console.log('Email:', mahmoud.email);
            console.log('Has DevTeamMember Record:', mahmoud.devTeamMember ? 'YES (ID: ' + mahmoud.devTeamMember.id + ')' : 'NO');
        } else {
            console.log('\nMahmoud Saeed not found in User table.');
        }

    } catch (error) {
        console.error('Database Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
