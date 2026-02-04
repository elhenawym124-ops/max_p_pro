const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'https://maxp-ai.pro/api/v1';
const JWT_SECRET = process.env.JWT_SECRET;

async function verifyMyToday() {
    try {
        console.log('Finding user from DB...');
        const user = await prisma.user.findFirst({
            where: { email: 'mokhtar@mokhtar.com' }
        });

        if (!user) {
            console.error('User not found');
            return;
        }
        console.log('User found, generating token...');

        // DEBUG: Dump all attendance
        const allAttendance = await prisma.attendance.findMany({
            where: { employeeId: user.employee?.id }, // Need employee relation?
            // Wait, user -> valid employee?
        });
        // Need to find employeeId first. User model has relation? 
        // user.employee is relation? userId on Employee?
        // Let's check schema.
        const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
        if (employee) {
            const records = await prisma.attendance.findMany({ where: { employeeId: employee.id } });
            console.log('DEBUG: All DB Records:', records);
        } else {
            console.log('DEBUG: No employee found for user');
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('Token generated. Sending request to: ' + `${API_URL}/hr/attendance/my-today`);
        try {
            const result = await axios.get(`${API_URL}/hr/attendance/my-today`, config);
            console.log('Response:', JSON.stringify(result.data, null, 2));
        } catch (reqError) {
            console.error('Request Error Object:', reqError.message);
            if (reqError.response) {
                console.error('Response Status:', reqError.response.status);
                console.error('Response Data:', JSON.stringify(reqError.response.data, null, 2));
            }
        }

    } catch (error) {
        console.error('❌ Request Failed:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyMyToday();
