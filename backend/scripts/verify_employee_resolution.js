
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const employeeService = require('../services/hr/employeeService');

async function verify() {
    try {
        const email = 'mokhtar@mokhtar.com'; // The test user
        console.log(`🔍 Finding user with email: ${email}`);

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.error('❌ User not found!');
            return;
        }

        console.log(`✅ User found: ${user.id} (Company: ${user.companyId})`);

        console.log('🔍 resolving employee by userId...');
        const employee = await employeeService.getEmployeeByUserId(user.companyId, user.id);

        if (!employee) {
            console.error('❌ Employee resolution FAILED. No employee record found for this user.');
            // Attempt to find ANY employee to see if companyId is an issue
            const anyEmp = await prisma.employee.findFirst({ where: { companyId: user.companyId } });
            console.log('ℹ️ First employee in company:', anyEmp ? anyEmp.id : 'None');
        } else {
            console.log(`✅ Employee resolved successfully!`);
            console.log(`   ID: ${employee.id}`);
            console.log(`   Name: ${employee.firstName} ${employee.lastName}`);
            console.log(`   Linked User: ${employee.userId}`);

            console.log('🔍 specific lookup by ID (mimicking leaveService)...');
            const reFetch = await prisma.employee.findUnique({
                where: { id: employee.id }
            });

            if (reFetch) {
                console.log('✅ Employee re-fetched successfully by ID.');
            } else {
                console.error('❌ FATAL: Employee resolved but cannot be re-fetched by ID!');
            }
        }

    } catch (error) {
        console.error('❌ Error in verification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
