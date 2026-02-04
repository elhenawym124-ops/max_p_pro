const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function testGeminiImageGen() {
    try {
        const keyRecord = await prisma.aIKey.findFirst({
            where: { provider: 'GOOGLE', isActive: true },
            orderBy: { priority: 'desc' }
        });

        if (!keyRecord) {
            console.error('No active Google key found');
            return;
        }

        const genAI = new GoogleGenerativeAI(keyRecord.apiKey);

        // START TEST 1: gemini-2.0-flash-exp
        console.log('------------------------------------------------');
        console.log('🧪 TEST 1: gemini-2.0-flash-exp');
        try {
            const model1 = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            console.log(`Sending prompt to gemini-2.0-flash-exp...`);
            const result1 = await model1.generateContent("Generate an image of a red apple");
            const response1 = result1.response;
            console.log('✅ Response received for 2.0-flash-exp');
            // Check for images
            if (response1.candidates && response1.candidates[0].content.parts.some(p => p.inlineData)) {
                console.log('🎉 IMAGE FOUND in 2.0-flash-exp response!');
            } else {
                console.log('⚠️ No image data found in 2.0-flash-exp response. (Maybe text only?)');
                console.log('Text content:', response1.text());
            }
        } catch (e) {
            console.error('❌ TEST 1 Failed:', e.message);
        }

        // START TEST 2: gemini-2.5-flash-preview-06-05
        console.log('\n------------------------------------------------');
        console.log('🧪 TEST 2: gemini-2.5-flash-preview-06-05');
        try {
            const model2 = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-06-05' });
            console.log(`Sending prompt to gemini-2.5-flash-preview-06-05...`);
            const result2 = await model2.generateContent("Generate an image of a green apple");
            const response2 = result2.response;
            console.log('✅ Response received for 2.5-preview');
            if (response2.candidates && response2.candidates[0].content.parts.some(p => p.inlineData)) {
                console.log('🎉 IMAGE FOUND in 2.5-preview response!');
            } else {
                console.log('⚠️ No image data found. Text:', response2.text());
            }
        } catch (e) {
            console.error('❌ TEST 2 Failed:', e.message);
        }

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testGeminiImageGen();
