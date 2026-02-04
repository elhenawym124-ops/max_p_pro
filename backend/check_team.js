const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeamMembers() {
    try {
        const teamMembers = await prisma.devTeamMember.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        console.log('Found team members:', teamMembers.length);
        console.log(JSON.stringify(teamMembers, null, 2));

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkTeamMembers();
