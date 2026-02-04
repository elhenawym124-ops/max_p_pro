const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

const USER_EMAIL = 'mokhtar@mokhtar.com';

async function createEmployee() {
    try {
        console.log('🔄 Initializing database connection...');
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log(`🔍 Finding user: ${USER_EMAIL}...`);
        const user = await prisma.user.findUnique({
            where: { email: USER_EMAIL },
            include: {
                company: true
            }
        });

        if (!user) {
            console.error('❌ User not found!');
            process.exit(1);
        }
        console.log('✅ User found:', user.email);

        // Check if employee exists
        const existingEmployee = await prisma.employee.findFirst({
            where: { userId: user.id }
        });

        if (existingEmployee) {
            console.log('✅ Employee record already exists for this user.');
            console.log('Employee ID:', existingEmployee.id);
            process.exit(0);
        }

        console.log('⚠️ Employee record missing. Creating one now...');

        // Create Employee Record
        const employee = await prisma.employee.create({
            data: {
                companyId: user.companyId,
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                employeeNumber: 'EMP-ADMIN-' + Date.now().toString().slice(-4),
                hireDate: new Date(),
                status: 'ACTIVE',
                contractType: 'FULL_TIME',
                departmentId: null, // Basic record
                positionId: null,    // Basic record
                baseSalary: 5000     // Default salary for testing payroll
            }
        });

        console.log('✅ Employee record created successfully!');
        console.log('Employee ID:', employee.id);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating employee:', error);
        process.exit(1);
    }
}

createEmployee();
