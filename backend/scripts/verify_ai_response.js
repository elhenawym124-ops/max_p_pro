const { PrismaClient } = require('@prisma/client');

// Access the exported singleton instance directly
const aiAgent = require('../services/aiAgentService');

// Mock dependencies if needed, or rely on actual services
async function verifyAI() {
    console.log('🤖 Verifying AI Response Generation...');

    // We need a dummy companyId. Let's try to find one or use a hardcoded one if known.
    // For now, let's try to find the first company in DB.
    const prisma = new PrismaClient();

    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            console.error('❌ No companies found in database to test with.');
            return;
        }

        console.log(`🏢 Testing with Company ID: ${company.id}`);

        // aiAgent is already an initialized instance from the require
        // const aiAgent = new AiAgentService(); // REMOVED
        // Note: aiAgent doesn't have ensureInitialized method, it's ready to use

        const messageData = {
            content: "السلام عليكم، عايز اعرف اسعار الايفون عندك",
            senderId: "test_verifier_user_123",
            conversationId: "test_verification_conv_" + Date.now(),
            companyId: company.id,
            platform: "test_script",
            timestamp: Date.now()
        };

        console.log('📨 Sending Message:', messageData.content);
        const response = await aiAgent.processCustomerMessage(messageData);

        console.log('\n✅ AI Response Result:');
        console.log(JSON.stringify(response, null, 2));

        if (response && response.success && response.content) {
            console.log('🎉 SUCCESS! AI is working.');
        } else {
            console.error('❌ FAILED! AI did not return a valid response.');
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAI();
