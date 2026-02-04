/**
 * Test ALL Google keys to see their quota status
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAllGoogleKeys() {
    console.log('🧪 Testing ALL Google keys...\n');

    const keys = await prisma.aIKey.findMany({
        where: { isActive: true, provider: 'GOOGLE' }
    });

    console.log(`📊 Found ${keys.length} Google keys\n`);

    for (const key of keys) {
        process.stdout.write(`Testing: ${key.name.padEnd(30)} `);

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Hi' }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    })
                }
            );

            if (response.ok) {
                console.log('✅ WORKS!');
            } else if (response.status === 429) {
                console.log('❌ 429 - Quota Exceeded');
            } else if (response.status === 403) {
                console.log('🚫 403 - Invalid/Leaked');
            } else {
                console.log(`⚠️ ${response.status}`);
            }
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }

        // Small delay
        await new Promise(r => setTimeout(r, 1000));
    }

    await prisma.$disconnect();
}

testAllGoogleKeys();
