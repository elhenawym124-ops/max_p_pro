const { getSharedPrismaClient } = require('../services/sharedDatabase');
const payrollService = require('../services/hr/payrollService');

async function main() {
  const prisma = getSharedPrismaClient();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: 'shrouk' } },
        { firstName: { contains: 'shrouk' } },
        { lastName: { contains: 'shrouk' } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!user) {
    console.log('❌ No Shrouk-like user found');
    return;
  }

  console.log('✅ Using user:', {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    companyId: user.companyId,
    baseSalary: user.baseSalary
  });

  const year = 2026;
  const month = 2;
  const periodStart = new Date(year, month - 1, 1, 0, 0, 0);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  const attendance = await prisma.attendance.findMany({
    where: {
      userId: user.id,
      date: { gte: periodStart, lte: periodEnd }
    },
    orderBy: { date: 'asc' }
  });

  console.log(`\n📅 Attendance records for ${month}/${year}: ${attendance.length}`);
  for (const a of attendance) {
    console.log({
      raw: a.date,
      localKey: payrollService.toLocalDateKey(a.date),
      isoKey: a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date).split('T')[0],
      status: a.status,
      lateMinutes: a.lateMinutes
    });
  }

  const workingDates = payrollService.getWorkingDaysDates(year, month, 1);
  const attendedDates = new Set(
    attendance
      .filter(a => ['PRESENT', 'LATE', 'REMOTE'].includes(a.status))
      .map(a => payrollService.toLocalDateKey(a.date))
  );

  console.log('\n🧾 Working dates up to day 1:', workingDates);
  console.log('🧾 Attended local date keys:', Array.from(attendedDates));
  console.log('✅ Did we count day 1 as attended?', attendedDates.has(workingDates[0]));
}

main().catch(e => console.error('❌ Error:', e.message));
