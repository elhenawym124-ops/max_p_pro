const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function testCompaniesCurrent() {
    console.log('🔍 Testing /companies/current endpoint...\n');
    
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
        console.log(`🆔 ID: ${superAdmin.id}`);
        console.log(`🏢 CompanyId: ${superAdmin.companyId}`);
        console.log(`🏢 Company: ${superAdmin.company?.name}`);
        
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
        
        // Test the endpoint
        const url = 'http://127.0.0.1:3010/api/v1/companies/current';
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log(`\n📡 Testing: ${url}`);
        
        try {
            const response = await axios.get(url, { headers });
            console.log(`✅ Success (${response.status}):`);
            console.log(JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log(`❌ Error (${error.response?.status}):`);
            if (error.response?.data) {
                console.log(JSON.stringify(error.response.data, null, 2));
            } else {
                console.log(error.message);
            }
        }
        
        // Also test with a different user (non-super-admin)
        console.log('\n🔍 Testing with regular company user...');
        
        const regularUser = await prisma.user.findFirst({
            where: { 
                isActive: true,
                role: { not: 'SUPER_ADMIN' },
                companyId: { not: null }
            },
            include: { company: true }
        });
        
        if (regularUser) {
            console.log(`✅ Found regular user: ${regularUser.email} (${regularUser.role})`);
            
            const regularToken = jwt.sign(
                { 
                    userId: regularUser.id,
                    email: regularUser.email,
                    role: regularUser.role,
                    companyId: regularUser.companyId,
                    firstName: regularUser.firstName,
                    lastName: regularUser.lastName
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );
            
            const regularHeaders = {
                'Authorization': `Bearer ${regularToken}`,
                'Content-Type': 'application/json'
            };
            
            try {
                const regularResponse = await axios.get(url, { headers: regularHeaders });
                console.log(`✅ Regular User Success (${regularResponse.status}):`);
                console.log(JSON.stringify(regularResponse.data, null, 2));
            } catch (error) {
                console.log(`❌ Regular User Error (${error.response?.status}):`);
                if (error.response?.data) {
                    console.log(JSON.stringify(error.response.data, null, 2));
                } else {
                    console.log(error.message);
                }
            }
        } else {
            console.log('❌ No regular user found for testing');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCompaniesCurrent().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
