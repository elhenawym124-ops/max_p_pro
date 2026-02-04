const { PrismaClient } = require('@prisma/client');
const AttendanceService = require('../services/hr/attendanceService'); // Path might need adjustment depending on where script runs from
const path = require('path');

// Initialize standalone prisma
const prisma = new PrismaClient();

// Initialize Service (we need to mock/ensure it gets the prisma client)
// The service usually gets prisma from sharedDatabase, but for script we might need to handle it.
// Actually, `attendanceService` imports getSharedPrismaClient.
// We can set up the shared client or just instantiate the service if it handles it.
// Let's rely on the service's internal mechanism but ensure DB is connected.

async function run() {
    console.log('🚀 Starting Real-Time Late Attendance Verification...');
    const companyId = 'cmkrcn0ql000auftk310skhv9'; // Default test company
    const service = AttendanceService; // It's already instantiated

    try {
        // 1. Create a Fresh User
        const uniqueSuffix = Date.now().toString().slice(-4);
        const email = `late_test_${uniqueSuffix}@test.com`;
        const user = await prisma.user.create({
            data: {
                email,
                firstName: `Late`,
                lastName: `Tester ${uniqueSuffix}`,
                password: 'password123',
                companyId,
                role: 'AGENT',
                baseSalary: 5000,
                lateDeductionRate: 1.5 // 1.5 EGP per minute penalty
            }
        });
        console.log(`👤 Created User: ${user.name} (${user.id})`);

        // 2. Create a Shift that started roughly 2 hours ago
        // Current time is roughly 03:30 AM. Let's make shift start at 01:00 AM.
        const shiftStart = '01:00';
        const shiftEnd = '09:00';

        const shift = await prisma.shift.create({
            data: {
                companyId,
                name: `Dawn Shift ${uniqueSuffix}`,
                startTime: shiftStart,
                endTime: shiftEnd,
                breakDuration: 30
            }
        });
        console.log(`🕒 Created Shift: ${shiftStart} - ${shiftEnd} (${shift.id})`);

        // 3. Assign Shift for Today
        // Need to ensure "Today" matches what the Service thinks is Today (Egypt Time)
        // Since we fixed the service to use Company Timezone (Cairo), 
        // We generally need to store it as UTC midnight for that day.
        // Let's use the dateUtils helper if available, or just construct it manually carefully.

        // Manual UTC Midnight construction for "Today"
        const now = new Date(); // Local system time (Egypt +2) 
        // e.g. 2026-01-27 03:30:00+0200

        const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        console.log(`📅 Assigning Shift for UTC Date: ${utcDate.toISOString()}`);

        await prisma.shiftAssignment.create({
            data: {
                companyId,
                userId: user.id,
                shiftId: shift.id,
                date: utcDate
            }
        });
        console.log('✅ Shift Assigned.');

        // 4. Perform Check-In NOW
        console.log('🏃 Attempting Check-In NOW (Real-time)...');

        // Mock location data
        const locationData = {
            latitude: 30.0444,
            longitude: 31.2357 // Cairo
        };

        // We need to bypass Geofence if enabled, or ensure settings allow it.
        // Let's disable Geofencing for this test to be safe, or just provide valid location.
        // Ideally we check-in.

        const result = await service.checkIn(companyId, user.id, {
            location: JSON.stringify(locationData),
            method: 'script_test'
        });

        console.log('\n📊 Check-In Result:');
        console.log(`   - Status: ${result.status}`);
        console.log(`   - Check-In Time: ${result.checkIn.toISOString()}`);
        console.log(`   - Late Minutes: ${result.lateMinutes}`);

        if (result.status === 'LATE' && result.deduction) {
            console.log('\n✅ VERIFICATION SUCCESS: Deduction created!');
            console.log(`   - Amount: ${result.deduction.amount}`);
        } else if (result.status === 'LATE') {
            // fallback check
            console.log('\n⚠️  LATE Detected but Deduction object missing in response (check logs above)');
        }

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
