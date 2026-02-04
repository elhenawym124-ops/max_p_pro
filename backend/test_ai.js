/**
 * Test AI Response directly
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAI() {
    console.log('🧪 Testing AI with a single key...\n');

    // Get first active Google key
    const key = await prisma.aIKey.findFirst({
        where: {
            isActive: true,
            provider: 'GOOGLE'
        },
        include: {
            models: { where: { isEnabled: true }, take: 1 }
        }
    });

    if (!key) {
        console.log('❌ No active Google key found');
        await prisma.$disconnect();
        return;
    }

    console.log(`🔑 Using key: ${key.name}`);

    const modelName = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key.apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'قل مرحبا' }] }],
                generationConfig: { maxOutputTokens: 50 }
            })
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log('✅ AI Response:', text || 'No text');
        } else {
            const error = await response.text();
            console.log(`❌ Error ${response.status}:`, error.substring(0, 200));
        }
    } catch (e) {
        console.log('❌ Fetch error:', e.message);
    }

    await prisma.$disconnect();
}

testAI();
