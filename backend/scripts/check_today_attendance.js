const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const { getStartOfDayInEgypt, getNowInEgypt } = require('../utils/dateUtils');

async function main() {
    const companyId = 'cmjpl47ym0dzwjupybv59lisu'; // SM
    try {
        await initializeSharedDatabase();

        const today = getStartOfDayInEgypt();
        console.log('Today (Egypt Start of Day):', today.toISOString());
        console.log('Now (Egypt):', getNowInEgypt().toISOString());

        const records = await getSharedPrismaClient().attendance.findMany({
            where: { companyId },
            include: {
                user: { select: { email: true, firstName: true } }
            },
            orderBy: { date: 'desc' },
            take: 20
        });

        console.log(`Found ${records.length} recent records:`);
        records.forEach(r => {
            console.log(`User: ${r.user.email} (${r.userId})`);
            console.log(`  Date: ${r.date.toISOString()}`);
            console.log(`  CheckIn: ${r.checkIn ? r.checkIn.toISOString() : 'null'}`);
            console.log(`  CheckOut: ${r.checkOut ? r.checkOut.toISOString() : 'null'}`);
            const matchesToday = r.date.getTime() === today.getTime();
            console.log(`  Matches Today? ${matchesToday}`);
        });

    } catch (error) {
        console.error(error);
    }
}

main();
