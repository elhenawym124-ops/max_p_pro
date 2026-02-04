// Use the generated Prisma Client from the correct path
const { PrismaClient } = require('./prisma/generated/generated/mysql');

async function checkPrismaModels() {
    console.log('🔍 Checking Prisma Models...\n');
    
    const prisma = new PrismaClient();
    
    try {
        // Get all model names
        const modelNames = Object.keys(prisma).filter(key => {
            return !key.startsWith('_') && 
                   !key.startsWith('$') && 
                   typeof prisma[key] === 'object';
        });
        
        console.log('📋 Total Models:', modelNames.length);
        
        // Filter telegram models
        const telegramModels = modelNames.filter(m => 
            m.toLowerCase().includes('telegram')
        );
        
        console.log('\n🔷 Telegram Models Found:', telegramModels.length);
        telegramModels.forEach(m => console.log(`  - ${m}`));
        
        // Check if new models exist
        const expectedModels = [
            'telegramAutoReplyRule',
            'telegramBulkMessage',
            'telegramBulkMessageLog',
            'telegramScheduledMessage',
            'telegramContact',
            'telegramGroup',
            'telegramForwardRule',
            'telegramUserActivity',
            'telegramAutoReplyUsage',
            'telegramBotMetric'
        ];
        
        console.log('\n✅ Expected New Models:');
        for (const model of expectedModels) {
            const exists = telegramModels.includes(model);
            console.log(`  ${exists ? '✅' : '❌'} ${model}`);
        }
        
        // Test a query on each new model
        console.log('\n🧪 Testing Model Queries:');
        for (const model of expectedModels) {
            if (prisma[model]) {
                try {
                    const count = await prisma[model].count();
                    console.log(`  ✅ ${model}: ${count} records`);
                } catch (error) {
                    console.log(`  ❌ ${model}: Error - ${error.message}`);
                }
            } else {
                console.log(`  ❌ ${model}: Model not found in Prisma Client`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPrismaModels();
