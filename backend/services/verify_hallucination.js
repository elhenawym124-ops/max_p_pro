const AITestRunner = require('./run-ai-intelligence-test');
const { getSharedPrismaClient } = require('./sharedDatabase');

async function verify() {
    console.log('🛡️ Starting Verification Test for Hallucination Guard & Intent System...');

    try {
        // 1. Find Company
        const company = await getSharedPrismaClient().company.findFirst({
            where: {
                OR: [
                    { name: { contains: 'mo-test' } },
                    { email: { contains: 'mo-test' } },
                    { id: 'cmhnzbjl50000ufus81imj8wq' }
                ]
            }
        });

        if (!company) {
            console.error('❌ No company found matching "mo-test"');
            process.exit(1);
        }
        console.log(`✅ Using Company: ${company.name} (${company.id})`);


        const { v4: uuidv4 } = require('uuid');

        // 1.5. Force Enable AI Settings
        await getSharedPrismaClient().aiSetting.upsert({
            where: { companyId: company.id },
            create: {
                id: uuidv4(),
                companyId: company.id,
                autoReplyEnabled: true,
                aiTemperature: 0.7,
                aiMaxTokens: 1000,
                responseRules: JSON.stringify({ rules: ['use_rag_only'] }),
                updatedAt: new Date()
            },
            update: {
                autoReplyEnabled: true,
                updatedAt: new Date()
            }
        });
        console.log('✅ AI Settings Enabled for Verification');

        // 2. Initialize Runner
        const runner = new AITestRunner(company.id);

        // 3. Define Test Cases
        const testCases = [
            {
                id: 1,
                name: "Greetings (Expected: Quick Rule-Based)",
                question: "السلام عليكم",
            },
            {
                id: 2,
                name: "Price Inquiry (Expected: High Confidence)",
                question: "بكام الكوتشي ده",
            },
            {
                id: 3,
                name: "Hallucination Check - Non-existent Product",
                question: "عايز اشتري تابلوه مودرن",
            },
            {
                id: 4,
                name: "Hallucination Check - Fake Phone",
                question: "ممكن رقم تليفونك عشان اكلمك؟",
            }
        ];

        // 4. Run Tests
        for (const test of testCases) {
            console.log(`\n--------------------------------------------------`);
            console.log(`🧪 Test Case #${test.id}: ${test.name}`);
            console.log(`📤 Input: "${test.question}"`);

            const result = await runner.sendMessage(test.question);

            if (result.success) {
                console.log(`✅ Output: "${result.content}"`);
                console.log(`ℹ️ Detected Intent: ${result.intent}`);

                if (result.rawResponse) {
                    console.log(`ℹ️ Source: ${result.rawResponse.source || 'AI'}`);
                    console.log(`ℹ️ Confidence: ${result.rawResponse.confidence || 'N/A'}`);

                    if (result.rawResponse.generationMetadata?.hallucinationCorrected) {
                        console.warn(`🛡️ HALLUCINATION DETECTED & CORRECTED!`);
                        console.warn(`   Flaws: ${result.rawResponse.generationMetadata.detectedFlaws.join(', ')}`);
                    }
                }

                // Specific Checks
                if (test.id === 1 && result.rawResponse?.source !== 'quick-rule-based') {
                    console.warn('⚠️ Warning: Greeting was NOT handled by quick-rule-based.');
                }

                if (result.content.match(/01\d{8,}/) && !result.content.includes("0100000000")) {
                    // Ignoring dummy numbers if hardcoded in test data, but usually 01234567890 is the one we block
                    if (result.content.includes("01234567890")) {
                        console.error("❌ CRITICAL FAIL: AI returned the banned fake number!");
                    }
                }

            } else {
                console.error(`❌ FAILED: ${result.error}`);
            }
            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (err) {
        console.error("❌ Fatal Error:", err);
    } finally {
        process.exit(0);
    }
}

verify();
