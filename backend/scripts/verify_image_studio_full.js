/**
 * Verify Image Studio Full Workflow
 * 
 * This script verifies the entire flow of Image Studio:
 * 1. Mocking the Queue (or connecting to real Redis if available).
 * 2. Creating a Generation Request via Service.
 * 3. Verifying the 'queued' status.
 * 4. Manually or Automatically processing the job.
 * 5. Verifying the final result in the database.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const imageStudioService = require('../services/imageStudioService');
const { Queue, Worker } = require('bullmq');
// const imageGenerationWorker = require('../workers/imageGenerationWorker'); // We might import this to ensure it listens

async function main() {
    console.log('🚀 Starting Image Studio Verification...');

    // Setup Test Data
    const companyId = 'test-company-123'; // Replace with a valid ID if needed, or rely on mock
    const userId = 'test-user-456';
    const prompt = 'A futuristic city with flying cars, highly detailed, 8k resolution';

    // Create a dummy company/user context if needed by foreign key constraints
    // For now assuming existing IDs or lax constraints for test if using a test DB.
    // Actually, we should probably pick an existing company from the DB to avoid FK errors.
    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('❌ No company found in DB. Cannot test.');
        return;
    }
    const user = await prisma.user.findFirst({ where: { companyId: company.id } });
    if (!user) {
        console.error('❌ No user found in DB. Cannot test.');
        return;
    }

    console.log(`👤 Using Company: ${company.id}, User: ${user.id}`);

    try {
        // 1. Generate Image (Request)
        console.log('\n1️⃣  Sending Generation Request...');
        const result = await imageStudioService.generateImage({
            prompt,
            modelType: 'basic',
            useMagicPrompt: true, // Test Magic Prompt Logic too
            aspectRatio: '16:9',  // Test Aspect Ratio
            companyId: company.id,
            userId: user.id
        });

        console.log('📥 Service Response:', result);

        if (result.status !== 'queued' || !result.historyId) {
            throw new Error(`Expected status 'queued' and a historyId. Got: ${JSON.stringify(result)}`);
        }

        console.log('✅ Request Queued Successfully.');
        const historyId = result.historyId;

        // 2. Poll Database for Completion
        // Since the worker should be running (if we loaded it via 'require' in the main app, checking here might be tricky if this is a standalone script).
        // If Redis is running, we can start the worker HERE in this script to process the job.

        console.log('\n2️⃣  Starting Worker to Process Job...');

        // Import worker to start processing
        require('../workers/imageGenerationWorker');

        console.log('⏳ Waiting for job completion (max 60s)...');

        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            const record = await prisma.imageStudioHistory.findUnique({
                where: { id: historyId }
            });

            console.log(`   [Attempt ${attempts + 1}] Status: ${record.status}`);

            if (record.status === 'completed') {
                console.log('\n✅ Job Completed Successfully!');
                console.log('   Image URL:', record.imageUrl);
                console.log('   Metadata:', record.metadata);

                // Verify Metadata
                const meta = JSON.parse(record.metadata);
                if (meta.aspectRatio !== '16:9') console.warn('⚠️ Warning: Aspect Ratio mismatch in metadata');
                if (!meta.wasMagicUsed) console.warn('⚠️ Warning: Magic Prompt not used despite flag');

                break;
            } else if (record.status === 'failed') {
                throw new Error(`❌ Job Failed: ${record.errorMessage}`);
            }

            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        if (attempts >= maxAttempts) {
            throw new Error('❌ Verification Timed Out.');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
        // We might need to close the worker/queue connections to exit clean
        process.exit(0);
    }
}

main();
