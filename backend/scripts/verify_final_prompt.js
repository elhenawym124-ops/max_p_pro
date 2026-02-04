const ResponseGenerator = require('../services/aiAgent/responseGenerator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyFinalPrompt() {
    console.log('🔍 Starting Final Prompt Structure Verification...');

    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            console.error('❌ No company found to test with.');
            return;
        }

        const rg = new ResponseGenerator({
            getSettings: async () => ({}),
            getCompanyPrompts: async () => ({
                personalityPrompt: 'أنت مساعد ذكي محترف.',
                responseRules: JSON.stringify({
                    responseLength: 'short',
                    speakingStyle: 'friendly',
                    dialect: 'egyptian',
                    rules: ['always_mention_prices', 'ask_for_governorate']
                })
            }),
            getTimeAgo: () => 'منذ قليل'
        });

        const prompt = await rg.buildAdvancedPrompt(
            'بكام التيشرت؟',
            { companyId: company.id, name: 'Ahmed' },
            {}, // companyPrompts (mocked in constructor for this simple test)
            [{ type: 'product', name: 'تيشرت قطن', price: 200, content: 'تيشرت قطن عالي الجودة بسعر 200 جنيه' }],
            [], // conversationMemory
            false, // hasImages
            {}, // smartResponseInfo
            { platform: 'test-chat' } // messageData
        );

        console.log('\n--- FINAL PROMPT START ---');
        console.log(prompt);
        console.log('--- FINAL PROMPT END ---\n');

        // Verification Checks
        const checks = [
            { name: 'Contains <response_guidelines>', test: prompt.includes('<response_guidelines>') },
            { name: 'Contains <length_constraint>', test: prompt.includes('<length_constraint') },
            { name: 'NO redundant "تعليمات الرد"', test: !prompt.includes('تعليمات الرد:') },
            { name: 'Contains Product Data', test: prompt.includes('200 جنيه') },
            { name: 'Contains Persona', test: prompt.includes('<persona_framework>') }
        ];

        console.log('📊 Verification Results:');
        let allPassed = true;
        checks.forEach(c => {
            console.log(`${c.test ? '✅' : '❌'} ${c.name}`);
            if (!c.test) allPassed = false;
        });

        if (allPassed) {
            console.log('\n✨ PROMPT CONSOLIDATION VERIFIED SUCCESSFULLY!');
        } else {
            console.error('\n⚠️ SOME VERIFICATION CHECKS FAILED!');
        }

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyFinalPrompt();
