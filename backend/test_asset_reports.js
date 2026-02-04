const axios = require('axios');

const BASE_URL = 'https://maxp-ai.pro/api/v1';

async function testAssetReports() {
    try {
        // Login first
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'shrouk0@gmail.com',
            password: '123456'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful\n');

        const headers = { Authorization: `Bearer ${token}` };

        // Test 1: All Assets Report
        console.log('📊 Test 1: All Assets Report');
        const allAssets = await axios.get(`${BASE_URL}/hr/asset-reports/all-assets`, { headers });
        console.log(`✅ Total Assets: ${allAssets.data.data.summary.total}`);
        console.log(`   Total Value: ${allAssets.data.data.summary.totalValue} EGP`);
        console.log(`   Current Value: ${allAssets.data.data.summary.currentValue} EGP\n`);

        // Test 2: Employee Custody Report
        console.log('📊 Test 2: Employee Custody Report');
        const custody = await axios.get(`${BASE_URL}/hr/asset-reports/employee-custody`, { headers });
        console.log(`✅ Employees with Assets: ${custody.data.data.summary.totalEmployees}`);
        console.log(`   Total Assigned Assets: ${custody.data.data.summary.totalAssets}`);
        console.log(`   Total Value: ${custody.data.data.summary.totalValue} EGP\n`);

        // Test 3: Available Assets Report
        console.log('📊 Test 3: Available Assets Report');
        const available = await axios.get(`${BASE_URL}/hr/asset-reports/available`, { headers });
        console.log(`✅ Available Assets: ${available.data.data.summary.total}`);
        console.log(`   Total Value: ${available.data.data.summary.totalValue} EGP\n`);

        // Test 4: Maintenance Assets Report
        console.log('📊 Test 4: Maintenance Assets Report');
        const maintenance = await axios.get(`${BASE_URL}/hr/asset-reports/maintenance`, { headers });
        console.log(`✅ Assets in Maintenance: ${maintenance.data.data.summary.total}`);
        console.log(`   Total Estimated Cost: ${maintenance.data.data.summary.totalEstimatedCost} EGP\n`);

        // Test 5: Lost/Damaged Assets Report
        console.log('📊 Test 5: Lost/Damaged Assets Report');
        const lostDamaged = await axios.get(`${BASE_URL}/hr/asset-reports/lost-damaged`, { headers });
        console.log(`✅ Total Lost/Damaged: ${lostDamaged.data.data.summary.total}`);
        console.log(`   Lost: ${lostDamaged.data.data.summary.lost}`);
        console.log(`   Damaged: ${lostDamaged.data.data.summary.damaged}`);
        console.log(`   Lost Value: ${lostDamaged.data.data.summary.totalLostValue} EGP`);
        console.log(`   Damaged Value: ${lostDamaged.data.data.summary.totalDamagedValue} EGP\n`);

        // Test 6: Total Value Report
        console.log('📊 Test 6: Total Value Report');
        const totalValue = await axios.get(`${BASE_URL}/hr/asset-reports/total-value`, { headers });
        console.log(`✅ Total Assets: ${totalValue.data.data.summary.totalAssets}`);
        console.log(`   Purchase Value: ${totalValue.data.data.summary.totalPurchaseValue} EGP`);
        console.log(`   Current Value: ${totalValue.data.data.summary.totalCurrentValue} EGP`);
        console.log(`   Depreciation: ${totalValue.data.data.summary.totalDepreciation} EGP (${totalValue.data.data.summary.depreciationPercentage}%)\n`);

        // Test Excel Export
        console.log('📥 Test 7: Excel Export (All Assets)');
        const excelResponse = await axios.get(`${BASE_URL}/hr/asset-reports/all-assets?format=excel`, {
            headers,
            responseType: 'arraybuffer'
        });
        console.log(`✅ Excel file generated: ${excelResponse.data.byteLength} bytes\n`);

        console.log('🎉 All tests passed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testAssetReports();
