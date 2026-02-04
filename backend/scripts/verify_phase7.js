
const axios = require('axios');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const API_URL = 'https://maxp-ai.pro/api/v1';
let authToken = '';

async function loginSuperAdmin() {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'testadmin@example.com',
            password: 'testpass123'
        });
        authToken = response.data.token;
        console.log('✅ Logged in as Super Admin');
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function verifySettingsFlow() {
    try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Get Initial Settings
        console.log('\n🔍 Fetching Initial Settings...');
        const res1 = await axios.get(`${API_URL}/rag-admin/settings`, { headers });
        const initialSettings = res1.data.data;
        console.log('Current Settings:', JSON.stringify(initialSettings, null, 2));

        // 2. Update Settings (Change Token Budget & Cache TTL)
        console.log('\n📝 Updating Settings...');
        const newSettings = {
            limits: {
                dailyTokens: { maxTokens: 999999 }
            },
            cache: {
                ttl: { search: 600000 } // Change to 10 minutes
            }
        };

        await axios.post(`${API_URL}/rag-admin/settings/update`, newSettings, { headers });
        console.log('✅ Settings update request sent');

        // 3. Verify Persistence
        console.log('\n🔍 Verifying Persistence...');
        const res2 = await axios.get(`${API_URL}/rag-admin/settings`, { headers });
        const updatedSettings = res2.data.data;

        // Check Limits
        if (updatedSettings.limits.dailyTokens.maxTokens === 999999) {
            console.log('✅ Token Limit Updated Successfully');
        } else {
            console.error('❌ Token Limit Update Failed');
        }

        // Check Cache
        if (updatedSettings.cache.ttl.search === 600000) {
            console.log('✅ Cache TTL Updated Successfully');
        } else {
            console.error('❌ Cache TTL Update Failed');
        }

        // 4. Restore Defaults (Optional, but good practice)
        console.log('\nRestoring Defaults...');
        await axios.post(`${API_URL}/rag-admin/settings/update`, {
            limits: { dailyTokens: { maxTokens: 100000 } },
            cache: { ttl: { search: 300000 } }
        }, { headers });
        console.log('✅ Defaults Restored');

    } catch (error) {
        console.error('❌ Verification failed:', error.response?.data || error.message);
    }
}

async function run() {
    await loginSuperAdmin();
    await verifySettingsFlow();
}

run();
