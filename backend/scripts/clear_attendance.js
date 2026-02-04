const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

const USER_EMAIL = 'mokhtar@mokhtar.com';

async function clearAttendance() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log(`Finding user: ${USER_EMAIL}...`);
        const user = await prisma.user.findUnique({
            where: { email: USER_EMAIL },
            include: { employee: true } // Assuming 1:1 relation or need to find employee
        });

        if (!user) throw new Error('User not found');

        // Find employee record if not directly linked (Schema check warranted, but trying generic approach)
        let employeeId = user.employee?.id;
        if (!employeeId) {
            const emp = await prisma.employee.findUnique({ where: { userId: user.id } });
            if (!emp) throw new Error('Employee record not found for user');
            employeeId = emp.id;
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const startOfDay = new Date(today);
        const endOfDay = new Date(today);
        endOfDay.setUTCHours(23, 59, 59, 999);

        console.log(`Deleting attendance for Employee ${employeeId} between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}...`);

        const result = await prisma.attendance.deleteMany({
            where: {
                employeeId: employeeId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        console.log(`✅ Deleted ${result.count} attendance record(s).`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Failed to clear attendance:', error);
        process.exit(1);
    }
}

clearAttendance();
