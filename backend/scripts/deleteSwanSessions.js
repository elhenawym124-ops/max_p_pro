const { PrismaClient } = require('../generated/mysql');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.whatsAppSession.deleteMany({
            where: {
                companyId: 'cml6qyllp003muw5010jiw3fg'
            }
        });
        console.log(`Successfully deleted ${result.count} WhatsApp sessions for company "swan".`);
    } catch (error) {
        console.error('Error deleting sessions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
