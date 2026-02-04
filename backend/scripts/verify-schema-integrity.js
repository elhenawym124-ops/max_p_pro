const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySchemaIntegrity() {
    console.log('🔍 Starting comprehensive Prisma schema verification...');

    // Get all properties of the prisma client instance
    // We filter out internal properties (starting with _ or $) and non-model properties
    const models = Object.keys(prisma).filter(key => {
        return !key.startsWith('_') &&
            !key.startsWith('$') &&
            typeof prisma[key] === 'object' &&
            prisma[key] !== null &&
            typeof prisma[key].count === 'function';
    });

    console.log(`📋 Found ${models.length} models to verify.`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const model of models) {
        try {
            // Try to count records - this is a lightweight query that verifies
            // the model key exists and maps to a valid table
            await prisma[model].count({ take: 1 });
            process.stdout.write(`✅ ${model} `);
            passed++;
        } catch (error) {
            process.stdout.write(`❌ ${model}\n`);
            console.error(`   Error: ${error.message.split('\n')[0]}`);
            failed++;
            failures.push({ model, error: error.message });
        }
    }

    console.log('\n\n--- Verification Summary ---');
    console.log(`Total Models: ${models.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n🚨 Failures Details:');
        failures.forEach(f => {
            console.log(`\n[${f.model}]`);
            console.log(f.error);
        });
        process.exit(1);
    } else {
        console.log('\n✨ All models are accessible and correctly mapped to the database!');
        process.exit(0);
    }
}

verifySchemaIntegrity()
    .catch(e => {
        console.error('Fatal script error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
