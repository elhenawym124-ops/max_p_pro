const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAttendanceRecords() {
  try {
    const companyId = 'cmgj92byv003djutl34dkh6ab'; // Mimi Store
    const userId = 'cmiug0rm70vbdjuewr9cuiy82'; // mokhtar@mokhtar.com
    
    console.log('🔍 Checking user and company...');
    
    // التحقق من المستخدم
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    
    // التحقق من الشركة
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true }
    });
    
    if (!company) {
      console.error('❌ Company not found');
      return;
    }
    
    console.log('✅ Company found:', company.name);
    
    // حذف السجلات القديمة للشهر الحالي
    const startOfMonth = new Date('2026-01-01T00:00:00.000Z');
    const endOfMonth = new Date('2026-01-31T23:59:59.999Z');
    
    console.log('🗑️ Deleting old attendance records for January 2026...');
    const deleted = await prisma.attendance.deleteMany({
      where: {
        companyId,
        userId,
        checkIn: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    
    console.log(`✅ Deleted ${deleted.count} old records`);
    
    // إنشاء سجلات حضور وانصراف لكل يوم عمل في يناير 2026
    const attendanceRecords = [];
    
    // يناير 2026 يبدأ يوم الخميس
    // سنضيف سجلات من 1 يناير إلى 26 يناير (اليوم الحالي)
    for (let day = 1; day <= 26; day++) {
      const date = new Date(2026, 0, day); // 0 = يناير
      const dayOfWeek = date.getDay(); // 0 = الأحد, 6 = السبت
      
      // تخطي الجمعة (5) والسبت (6)
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        continue;
      }
      
      // وقت الحضور: 9:00 صباحاً (مع تنويع بسيط)
      const checkInHour = 9;
      const checkInMinute = Math.floor(Math.random() * 15); // 0-14 دقيقة
      const checkIn = new Date(2026, 0, day, checkInHour, checkInMinute, 0);
      
      // وقت الانصراف: 5:00 مساءً (مع تنويع بسيط)
      const checkOutHour = 17;
      const checkOutMinute = Math.floor(Math.random() * 30); // 0-29 دقيقة
      const checkOut = new Date(2026, 0, day, checkOutHour, checkOutMinute, 0);
      
      // حساب ساعات العمل
      const workMinutes = Math.floor((checkOut - checkIn) / (1000 * 60));
      const workHours = (workMinutes / 60).toFixed(2);
      
      attendanceRecords.push({
        id: `att_${companyId}_${userId}_${day}`,
        companyId,
        userId,
        checkIn,
        checkOut,
        date: new Date(2026, 0, day),
        status: 'PRESENT',
        workHours: parseFloat(workHours),
        overtimeHours: checkOutMinute > 0 ? parseFloat((checkOutMinute / 60).toFixed(2)) : 0,
        lateMinutes: checkInMinute > 10 ? checkInMinute - 10 : 0, // متأخر إذا جاء بعد 9:10
        earlyLeaveMinutes: 0,
        notes: `Auto-generated attendance for ${date.toLocaleDateString('ar-EG')}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`📝 Creating ${attendanceRecords.length} attendance records...`);
    
    // إضافة السجلات باستخدام createMany
    const result = await prisma.attendance.createMany({
      data: attendanceRecords,
      skipDuplicates: true
    });
    
    console.log(`\n🎉 Successfully added ${result.count} attendance records!`);
    console.log(`📊 Total work hours: ${attendanceRecords.reduce((sum, r) => sum + r.workHours, 0).toFixed(2)} hours`);
    
    // عرض تفاصيل السجلات
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
