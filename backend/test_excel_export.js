const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://maxp-ai.pro/api/v1';

async function testExcelExport() {
    try {
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'shrouk0@gmail.com',
            password: '123456'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful\n');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('📥 Testing Excel Export for All Assets Report...');
        const response = await axios.get(`${BASE_URL}/hr/asset-reports/all-assets?format=excel`, {
            headers,
            responseType: 'arraybuffer'
        });

        if (response.data.byteLength > 0) {
            const filename = `test_export_${Date.now()}.xlsx`;
            fs.writeFileSync(filename, response.data);
            console.log(`✅ Excel file generated successfully: ${filename}`);
            console.log(`   File size: ${response.data.byteLength} bytes`);
            
            // Clean up
            fs.unlinkSync(filename);
            console.log('✅ Test file cleaned up');
        } else {
            console.log('❌ Excel file is empty');
        }

        console.log('\n🎉 Excel export test completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testExcelExport();
