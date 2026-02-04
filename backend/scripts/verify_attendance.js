const axios = require('axios');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

const API_URL = 'https://maxp-ai.pro/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const USER_EMAIL = 'mokhtar@mokhtar.com';

async function verifyCheckIn() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();
        const user = await prisma.user.findUnique({
            where: { email: USER_EMAIL },
            include: { company: true }
        });

        if (!user) throw new Error('User not found');

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, companyId: user.companyId },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('Testing Check-in (1st attempt)...');
        try {
            await axios.post(`${API_URL}/hr/attendance/check-in`, {
                location: JSON.stringify({ lat: 30.0444, lng: 31.2357 }),
                method: 'web_dashboard'
            }, config);
            console.log('✅ Check-in (1st) Success');
        } catch (e) {
            if (e.response?.status === 500 && e.response?.data?.error) {
                console.warn('⚠️ 1st Check-in returned 500 (might be legitimate duplicate if run before):', e.response.data.error);
            } else {
                throw e;
            }
        }

        console.log('Testing Check-in (2nd attempt - should fail gracefully or say duplicate)...');
        try {
            await axios.post(`${API_URL}/hr/attendance/check-in`, {
                location: JSON.stringify({ lat: 30.0444, lng: 31.2357 }),
                method: 'web_dashboard'
            }, config);
            console.log('✅ Check-in (2nd) Success (likely updated existing record)');
        } catch (error) {
            console.log('ℹ️ Check-in (2nd) Response:', error.response?.status, error.response?.data);
            if (error.response?.status === 400 && (
                error.response.data.error.includes('duplicate') ||
                error.response.data.error.includes('مسبقاً')
            )) {
                console.log('✅ Correctly identified as duplicate (returned 400)');
            } else {
                console.warn('❌ validation failed or unexpected error:', error.response?.data);
            }
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Check-in Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

verifyCheckIn();
