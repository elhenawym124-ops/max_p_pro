const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SettingsManager = require('../services/aiAgent/settingsManager');

async function verifySettingsManager() {
    console.log('🧪 Starting SettingsManager Prompt Resolution Verification...');

    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            console.error('❌ No company found to test with.');
            return;
        }
        const companyId = company.id;
        console.log(`🏢 Using company: ${company.name} (${companyId})`);

        const sm = new SettingsManager({ cache: new Map() });

        // Ensure we have some base settings in DB for testing
        await prisma.aiSettings.upsert({
            where: { companyId },
            update: { responseRules: JSON.stringify({ responseLength: 'short', customRules: 'Original Rules Personality' }) },
            create: { companyId, responseRules: JSON.stringify({ responseLength: 'short', customRules: 'Original Rules Personality' }) }
        });

        console.log('\n--- Scenario 1: Normal (Should use customRules) ---');
        const normal = await sm.getCompanyPrompts(companyId);
        console.log('Source:', normal.source);
        console.log('Personality (starts with):', normal.personalityPrompt.substring(0, 30));
        console.log('Has Rules:', !!normal.responseRules);

        const normalPassed = normal.source === 'response_rules_custom' && !!normal.responseRules;
        console.log(normalPassed ? '✅ Passed' : '❌ Failed');

        console.log('\n--- Scenario 2: Custom Prompt (Should preserve rules) ---');
        const custom = await sm.getCompanyPrompts(companyId, 'Flash Sale Personality!');
        console.log('Source:', custom.source);
        console.log('Personality:', custom.personalityPrompt);
        console.log('Has Rules:', !!custom.responseRules);

        const customPassed = custom.source === 'custom_message_prompt' && custom.personalityPrompt === 'Flash Sale Personality!' && !!custom.responseRules;
        console.log(customPassed ? '✅ Passed' : '❌ Failed');

        console.log('\n--- Scenario 3: System Override (Should use SystemPrompt if customRules empty) ---');
        // Update DB to clear customRules
        await prisma.aiSettings.update({
            where: { companyId },
            data: { responseRules: JSON.stringify({ responseLength: 'short', customRules: '' }) }
        });

        const sysPrompt = await prisma.systemPrompt.create({
            data: {
                companyId,
                name: 'Test Override',
                content: 'Overridden Personality by System',
                isActive: true
            }
        });

        sm.cache.clear();

        const override = await sm.getCompanyPrompts(companyId);
        console.log('Source:', override.source);
        console.log('Personality:', override.personalityPrompt);
        console.log('Has Rules:', !!override.responseRules);

        const overridePassed = override.source === 'system_prompt_override' && override.personalityPrompt === 'Overridden Personality by System' && !!override.responseRules;
        console.log(overridePassed ? '✅ Passed' : '❌ Failed');

        // Cleanup
        await prisma.systemPrompt.delete({ where: { id: sysPrompt.id } });

        console.log('\n📊 Final Results:');
        if (normalPassed && customPassed && overridePassed) {
            console.log('✨ ALL SCENARIOS VERIFIED SUCCESSFULLY!');
        } else {
            console.error('⚠️ SOME SCENARIOS FAILED!');
        }

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifySettingsManager();
