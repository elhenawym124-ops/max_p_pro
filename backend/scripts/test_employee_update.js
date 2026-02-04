const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const employeeService = require('../services/hr/employeeService');

async function run() {
    const email = 'mokhta100r@mokhtar.com';
    console.log(`🔍 Testing update for: ${email}`);

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) { console.log('❌ User not found'); return; }

        console.log('📝 Updating with departmentId: "" (empty string)...');
        // Simulate the payload from frontend
        const payload = {
            departmentId: "", // Empty string
            positionId: "",   // Empty string
            firstName: "UpdatedName"
        };

        const result = await employeeService.updateEmployee(user.companyId, user.id, payload);
        console.log('✅ Update Successful!');
        console.log('   - DepartmentId:', result.departmentId);
        console.log('   - PositionId:', result.positionId);

    } catch (error) {
        console.error('❌ Update Failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
