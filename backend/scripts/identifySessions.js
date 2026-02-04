const { PrismaClient } = require('../generated/mysql');
const prisma = new PrismaClient();

async function main() {
    try {
        const sessions = await prisma.whatsAppSession.findMany({
            include: {
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (sessions.length === 0) {
            console.log('No WhatsApp sessions found.');
        } else {
            sessions.forEach(s => {
                console.log(`Session ID: ${s.id}`);
                console.log(`Phone Number: ${s.phoneNumber || 'N/A'}`);
                console.log(`Status: ${s.status}`);
                console.log(`Company: ${s.company ? s.company.name : 'Unknown'} (ID: ${s.companyId})`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
