const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function testReportsEndpoints() {
    console.log('🔍 Testing Reports Endpoints...\n');
    
    try {
        const prisma = getSharedPrismaClient();
        
        // Find SUPER_ADMIN user
        const superAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
            include: { company: true }
        });
        
        if (!superAdmin) {
            console.log('❌ No SUPER_ADMIN user found');
            return;
        }
        
        console.log('✅ User Details:');
        console.log(`📧 Email: ${superAdmin.email}`);
        console.log(`🏢 Company: ${superAdmin.company?.name}`);
        console.log(`🏢 CompanyId: ${superAdmin.companyId}`);
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: superAdmin.id,
                email: superAdmin.email,
                role: superAdmin.role,
                companyId: superAdmin.companyId,
                firstName: superAdmin.firstName,
                lastName: superAdmin.lastName
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );
        
        console.log('\n🔐 Token generated successfully');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const endpoints = [
            {
                name: 'Reports Customers',
                url: 'http://127.0.0.1:3010/api/v1/reports/customers?startDate=2025-12-26T11:28:01.825Z&endDate=2026-01-25T11:28:01.825Z'
            },
            {
                name: 'Reports Sales',
                url: 'http://127.0.0.1:3010/api/v1/reports/sales?startDate=2025-12-26T11:28:01.825Z&endDate=2026-01-25T11:28:01.825Z'
            },
            {
                name: 'Reports Products',
                url: 'http://127.0.0.1:3010/api/v1/reports/products?startDate=2025-12-26T11:28:01.825Z&endDate=2026-01-25T11:28:01.825Z'
            },
            {
                name: 'Reports Performance',
                url: 'http://127.0.0.1:3010/api/v1/reports/performance?startDate=2025-12-26T11:28:01.825Z&endDate=2026-01-25T11:28:01.825Z'
            }
        ];
        
        for (const endpoint of endpoints) {
            console.log(`\n📡 Testing: ${endpoint.name}`);
            console.log(`🔗 URL: ${endpoint.url}`);
            
            try {
                const response = await axios.get(endpoint.url, { headers });
                console.log(`✅ Success (${response.status}):`);
                console.log(JSON.stringify(response.data).substring(0, 200) + '...');
            } catch (error) {
                console.log(`❌ Error (${error.response?.status}):`);
                if (error.response?.data) {
                    console.log(JSON.stringify(error.response.data, null, 2));
                } else {
                    console.log(error.message);
                }
            }
        }
        
        // Also test with a simpler date range
        console.log('\n🔍 Testing with simpler date range...');
        const simpleUrl = 'http://127.0.0.1:3010/api/v1/reports/customers?startDate=2025-01-01&endDate=2025-01-31';
        
        try {
            const response = await axios.get(simpleUrl, { headers });
            console.log(`✅ Simple date range Success (${response.status}):`);
            console.log(JSON.stringify(response.data).substring(0, 200) + '...');
        } catch (error) {
            console.log(`❌ Simple date range Error (${error.response?.status}):`);
            if (error.response?.data) {
                console.log(JSON.stringify(error.response.data, null, 2));
            } else {
                console.log(error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testReportsEndpoints().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
