/**
 * Verify Image Generation (Direct Mode)
 * 
 * This script bypasses the Queue/Redis and calls the generation logic directly.
 * It is used to verify that:
 * 1. The Google Gemini/Imagen connection is working.
 * 2. Images are actually being generated and saved.
 * 3. Database records are updated correctly.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const imageStudioService = require('../services/imageStudioService');

async function main() {
    console.log('🚀 Starting DIRECT Image Generation Test...');

    // Setup Context
    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('❌ No company found.');
        return;
    }
    const user = await prisma.user.findFirst({ where: { companyId: company.id } });

    console.log(`👤 Using Context - Company: ${company.id}`);

    // 1. Create a "Queued" record manually (simulating the service's first step)
    // We do this to have a valid historyId to pass to executeGeneration
    const prompt = "A cute futuristic robot cat sitting on a neon rooftop, cyberpunk style, 4k";

    console.log(`📝 Prompt: ${prompt}`);

    const historyRecord = await prisma.imageStudioHistory.create({
        data: {
            companyId: company.id,
            userId: user ? user.id : 'test-user',
            prompt: prompt,
            modelType: 'basic',
            modelName: 'gemini-pro-vision', // simplified default
            status: 'queued',
            metadata: JSON.stringify({
                originalPrompt: prompt,
                testMode: 'direct_verification'
            })
        }
    });

    console.log(`✅ Created Placeholder Record: ${historyRecord.id}`);

    try {
        // 2. Call executeGeneration directly
        console.log('🎨 Calling executeGeneration (Directly)...');
        console.log('⏳ This might take 10-20 seconds...');

        const result = await imageStudioService.executeGeneration({
            prompt,
            modelType: 'basic',
            useMagicPrompt: true, // Let's test magic prompt too
            aspectRatio: '1:1',
            companyId: company.id,
            userId: user ? user.id : 'test-user',
            historyId: historyRecord.id
        });

        console.log('\n🎉 Generation Success!');
        console.log('--------------------------------------------------');
        console.log('🖼️  Image URL:', result.imageUrl);
        console.log('⏱️  Duration:', result.duration, 'ms');
        console.log('✨ Magic Used:', result.wasMagicUsed);
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('\n❌ Generation Failed:', error.message);
        if (error.response) {
            console.error('   API Error Details:', JSON.stringify(error.response, null, 2));
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
