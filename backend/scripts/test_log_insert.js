const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function testInsert() {
    const prisma = getSharedPrismaClient();
    try {
        console.log('🧪 Testing AiInteraction insertion...');

        // 1. Get a valid Company and Customer
        const company = await prisma.company.findFirst();
        if (!company) throw new Error('No company found');
        console.log('✅ Found Company:', company.id);

        const customer = await prisma.customer.findFirst({ where: { companyId: company.id } });
        if (!customer) throw new Error('No customer found');
        console.log('✅ Found Customer:', customer.id);

        // 2. Attempt Insert
        const log = await prisma.aiInteraction.create({
            data: {
                companyId: company.id,
                customerId: customer.id,
                modelUsed: 'test-model',
                keyId: 'test-key-id',
                keyName: 'test-key-name',
                userMessage: 'Test message from script',
                aiResponse: 'Test response from script',
                tokensUsed: 10,
                responseTime: 100,
                metadata: JSON.stringify({ source: 'manual_test' })
            }
        });

        console.log('✅ Insert Successful:', log.id);

    } catch (error) {
        console.error('❌ Insert Failed:', error);
    } finally {
        process.exit();
    }
}

testInsert();
