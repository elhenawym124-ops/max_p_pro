const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function testAuth() {
    console.log('🔍 Testing Authentication Issues...\n');
    
    try {
        // Test 1: Check if we can connect to database
        console.log('1. Testing database connection...');
        const prisma = getSharedPrismaClient();
        
        // Find a super admin user
        const superAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
            include: { company: true }
        });
        
        if (!superAdmin) {
            console.log('❌ No SUPER_ADMIN user found');
            
            // Find any active user
            const anyUser = await prisma.user.findFirst({
                where: { isActive: true },
                include: { company: true }
            });
            
            if (anyUser) {
                console.log(`✅ Found active user: ${anyUser.email}, Role: ${anyUser.role}`);
                return await testWithUser(anyUser);
            } else {
                console.log('❌ No active users found in database');
                return;
            }
        } else {
            console.log(`✅ Found SUPER_ADMIN: ${superAdmin.email}`);
            return await testWithUser(superAdmin);
        }
        
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    }
}

async function testWithUser(user) {
    console.log('\n2. Generating JWT token...');
    
    // Generate JWT token
    const token = jwt.sign(
        { 
            userId: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            firstName: user.firstName,
            lastName: user.lastName
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
    );
    
    console.log(`✅ Token generated for ${user.email} (${user.role})`);
    console.log(`📍 Company ID: ${user.companyId}`);
    
    // Test endpoints
    await testEndpoints(token, user);
}

async function testEndpoints(token, user) {
    const baseUrl = 'http://127.0.0.1:3010/api/v1';
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    console.log('\n3. Testing API Endpoints:');
    
    const endpoints = [
        {
            name: 'Super Admin Active Timer',
            url: `${baseUrl}/super-admin/dev/timer/active`,
            expectedRole: 'SUPER_ADMIN'
        },
        {
            name: 'Companies Current',
            url: `${baseUrl}/companies/current`,
            expectedRole: 'ANY'
        },
        {
            name: 'Reports Customers',
            url: `${baseUrl}/reports/customers?startDate=2025-12-26T11:28:01.825Z&endDate=2026-01-25T11:28:01.825Z`,
            expectedRole: 'ANY'
        },
        {
            name: 'Reports Sales',
            url: `${baseUrl}/reports/sales?startDate=2025-12-26T11:28:01.825Z&endDate=2026-01-25T11:28:01.825Z`,
            expectedRole: 'ANY'
        }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n📡 Testing: ${endpoint.name}`);
            console.log(`🔗 URL: ${endpoint.url}`);
            
            const response = await axios.get(endpoint.url, { headers });
            
            console.log(`📊 Status: ${response.status}`);
            
            if (response.status === 200) {
                const data = response.data;
                console.log(`✅ Success: ${JSON.stringify(data).substring(0, 100)}...`);
            } else {
                const errorText = JSON.stringify(response.data);
                console.log(`❌ Error: ${errorText}`);
                
                // Analyze error
                if (response.status === 403) {
                    console.log(`🔍 403 Analysis: User role ${user.role} may not have permission for this endpoint`);
                } else if (response.status === 401) {
                    console.log(`🔍 401 Analysis: Token authentication failed`);
                } else if (response.status === 500) {
                    console.log(`🔍 500 Analysis: Server error - check backend logs`);
                }
            }
        } catch (error) {
            console.log(`❌ Network Error: ${error.message}`);
        }
    }
}

// Run the test
testAuth().then(() => {
    console.log('\n🏁 Auth testing completed!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
