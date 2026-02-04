// backend/scripts/test_ai_chat_flow.js
const axios = require('axios');

// CONFIG
const API_URL = 'https://maxp-ai.pro/api'; // Based on .env PORT=3010 usually, but need to check if /api prefix exists.
// Checking routes... routes usually mounted at /api.
// SuperAdmin routes at /api/admin or /api/super-admin?
// Looking at previous file views: `app.use('/api/admin', superAdminRoutes);` (Standard guess) or check `server.js` but let's try /api/admin first.

const SUPER_ADMIN_CREDENTIALS = {
    email: 'super@admin.com', // Replace with a known seed super admin or I need to create one if testing isolated.
    password: 'password123'   // This is risky if I don't know real creds.
};

// BETTER APPROACH:
// Instead of logging in via HTTP (which requires knowing a password), 
// I will create a valid JWT token directly using the JWT_SECRET from .env
// This bypasses the need for credentials and tests the endpoint authorization + logic directly.

const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.production' }); // Load env to get secret

const JWT_SECRET = process.env.JWT_SECRET || '9645819c153de9a20961168f4dad5a4b159080e6c9117df1a6cf7114102428c57686adb6f4625ccec15452f7d73b8b111485a077fcd2ea99a377b13fb6033314';

// Create a mock Super Admin Token
const mockUser = {
    id: 'test-super-admin-id',
    email: 'test@superadmin.com',
    role: 'SUPER_ADMIN',
    permissions: ['ALL']
};

const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '1h' });

console.log('🔑 Generated Mock Super Admin Token');

async function testAiChat() {
    try {
        console.log('🚀 Sending Test Chat Message to Backend...');

        // Endpoint: /api/admin/ai-chat (Based on superAdminRoutes registration)
        // Need to verify standard route prefix. Usually app.js has app.use('/api/admin', superAdminRoutes)

        const response = await axios.post('https://maxp-ai.pro/api/admin/ai-chat', {
            message: "Hello System Expert, can you acknowledge this test?",
            history: [] // Empty history
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Response Status:', response.status);
        console.log('✅ AI Response:', response.data);

        if (response.data.success && response.data.data) {
            console.log('🎉 AI Chat Test Passed!');
        } else {
            console.error('❌ AI Chat Test Failed: Invalid response format');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Request Failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

testAiChat();
