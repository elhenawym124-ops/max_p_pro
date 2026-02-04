const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAttendanceRecords() {
  try {
    const companyId = 'cmkvo8czx0000vbe859dddrd1'; // f22
    
    console.log('🔍 Finding user shrouk0@gmail.com...');
    
    const user = await prisma.user.findFirst({
      where: { 
        email: 'shrouk0@gmail.com',
        companyId
      },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email, `(${user.firstName} ${user.lastName})`);
    
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true }
    });
    
    console.log('✅ Company found:', company.name);
    
    // حذف السجلات القديمة للشهر الحالي
    const startOfMonth = new Date('2026-01-01T00:00:00.000Z');
    const endOfMonth = new Date('2026-01-31T23:59:59.999Z');
    
    console.log('🗑️ Deleting old attendance records for January 2026...');
    const deleted = await prisma.attendance.deleteMany({
      where: {
        companyId,
        userId: user.id,
        checkIn: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    
    console.log(`✅ Deleted ${deleted.count} old records`);
    
    // إنشاء سجلات حضور وانصراف لكل يوم عمل في يناير 2026
    const attendanceRecords = [];
    
    for (let day = 1; day <= 26; day++) {
      const date = new Date(2026, 0, day);
      const dayOfWeek = date.getDay();
      
      // تخطي الجمعة (5) والسبت (6)
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        continue;
      }
      
      // وقت الحضور: 9:00 صباحاً (مع تنويع بسيط)
      const checkInHour = 9;
      const checkInMinute = Math.floor(Math.random() * 15);
      const checkIn = new Date(2026, 0, day, checkInHour, checkInMinute, 0);
      
      // وقت الانصراف: 5:00 مساءً (مع تنويع بسيط)
      const checkOutHour = 17;
      const checkOutMinute = Math.floor(Math.random() * 30);
      const checkOut = new Date(2026, 0, day, checkOutHour, checkOutMinute, 0);
      
      // حساب ساعات العمل
      const workMinutes = Math.floor((checkOut - checkIn) / (1000 * 60));
      const workHours = (workMinutes / 60).toFixed(2);
      
      attendanceRecords.push({
        id: `att_${companyId}_${user.id}_${day}`,
        companyId,
        userId: user.id,
        checkIn,
        checkOut,
        date: new Date(2026, 0, day),
        status: 'PRESENT',
        workHours: parseFloat(workHours),
        overtimeHours: checkOutMinute > 0 ? parseFloat((checkOutMinute / 60).toFixed(2)) : 0,
        lateMinutes: checkInMinute > 10 ? checkInMinute - 10 : 0,
        earlyLeaveMinutes: 0,
        notes: `Auto-generated attendance for ${date.toLocaleDateString('ar-EG')}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`📝 Creating ${attendanceRecords.length} attendance records...`);
    
    const result = await prisma.attendance.createMany({
      data: attendanceRecords,
      skipDuplicates: true
    });
    
    console.log(`\n🎉 Successfully added ${result.count} attendance records!`);
    console.log(`📊 Total work hours: ${attendanceRecords.reduce((sum, r) => sum + r.workHours, 0).toFixed(2)} hours`);
    
    console.log('\n📋 Records summary:');
    for (const record of attendanceRecords) {
      console.log(`  ✅ ${record.date.toLocaleDateString('ar-EG')} - ${record.workHours} hours`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAttendanceRecords();
