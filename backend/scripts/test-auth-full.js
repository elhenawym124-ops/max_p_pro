const axios = require('axios');

const API_URL = 'http://127.0.0.1:3010/api/v1/auth';

async function testAuthFlow() {
    try {
        console.log('🔐 Starting Full Authentication Flow Test...');

        const rand = Math.floor(Math.random() * 10000);
        const user = {
            firstName: 'Test',
            lastName: `User${rand}`,
            email: `test.auth.${rand}@example.com`,
            password: 'Password123!',
            companyName: `Test Company ${rand}`,
            phone: `0100000${rand}`
        };

        // 1. REGISTER
        console.log(`\n1. Testing Registration for ${user.email}...`);
        const regResponse = await axios.post(`${API_URL}/register`, user);

        console.log(`   Status: ${regResponse.status} ${regResponse.statusText}`);
        if (regResponse.data.success) {
            console.log('   ✅ Registration Successful');
        } else {
            console.error('   ❌ Registration Failed:', regResponse.data);
            process.exit(1);
        }

        // 2. LOGIN
        console.log(`\n2. Testing Login for ${user.email}...`);
        // Add artificial delay to ensure DB propagation
        await new Promise(resolve => setTimeout(resolve, 1000));

        const loginResponse = await axios.post(`${API_URL}/login`, {
            email: user.email,
            password: user.password
        });

        console.log(`   Status: ${loginResponse.status} ${loginResponse.statusText}`);

        const responseBody = loginResponse.data;
        if (responseBody.success && responseBody.data && responseBody.data.token) {
            console.log('   ✅ Login Successful');
            console.log(`   🔑 Token received: ${responseBody.data.token.substring(0, 20)}...`);

            // Verify user data structure
            const userData = responseBody.data.user;
            if (userData && userData.email === user.email) {
                console.log('   ✅ User data verified');
            } else {
                console.error('   ❌ User data mismatch:', userData ? userData.email : 'No user data');
            }

        } else {
            console.error('   ❌ Login Failed or Structure Mismatch:', responseBody);
            process.exit(1);
        }

        console.log('\n✨ Full Auth Flow Verified Successfully!');

    } catch (error) {
        if (error.response) {
            console.error('\n❌ API Error:', error.response.status);
            console.error('   Message:', error.response.data.message);
            if (error.response.data.errors) {
                console.error('   Validation Errors:', JSON.stringify(error.response.data.errors, null, 2));
            }
            if (error.response.data.error) {
                console.error('   Details:', error.response.data.error);
            }
        } else {
            console.error('\n❌ Network/Script Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('Full Error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        }
        process.exit(1);
    }
}

testAuthFlow();
