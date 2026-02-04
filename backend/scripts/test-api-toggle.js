
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const USER_ID = "cmiug0rm70vbdjuewr9cuiy82"; // Mokhtar ID
const COMPANY_ID = "cmem8ayyr004cufakqkcsyn97"; // Company ID

// Generate Token
const token = jwt.sign({ id: USER_ID, role: 'COMPANY_ADMIN', companyId: COMPANY_ID }, SECRET, { expiresIn: '1h' });

async function run() {
    try {
        console.log('🚀 [TEST] Sending Toggle Request (Enable AI)...');
        const url = `https://maxp-ai.pro/api/v1/settings/ai?companyId=${COMPANY_ID}`;

        // Simulate the data sent by frontend
        const body = {
            autoReplyEnabled: true,
            replyMode: 'all',
            qualityEvaluationEnabled: true,
            multimodalEnabled: true,
            ragEnabled: true
        };

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        console.log('✅ [TEST] Response Status:', res.status);
        const data = await res.json();
        console.log('📦 [TEST] Response Data:', JSON.stringify(data, null, 2)); // Pretty print

    } catch (error) {
        console.error('❌ [TEST] Error:', error.message);
        if (error.cause) console.error('   Cause:', error.cause);
    }
}

run();
