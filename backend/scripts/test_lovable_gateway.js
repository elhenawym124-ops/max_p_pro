const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLovableGateway() {
    const url = "https://ai.gateway.lovable.dev/v1/chat/completions";

    // Try with one of the available Google keys
    const keyRecord = await prisma.aIKey.findFirst({
        where: { provider: 'GOOGLE', isActive: true },
        orderBy: { priority: 'desc' }
    });

    if (!keyRecord) {
        console.log("No key found.");
        return;
    }

    const googleKey = keyRecord.apiKey; // This works for Google, but likely not Lovable

    console.log(`📡 Testing Lovable Gateway: ${url}`);
    console.log(`🔑 Using Google Key: ${googleKey.slice(0, 5)}...`);

    try {
        const response = await axios.post(url, {
            model: "google/gemini-2.5-flash-image-preview",
            messages: [{ role: "user", content: "Generate an image of a cat" }],
            modalities: ["image", "text"]
        }, {
            headers: {
                Authorization: `Bearer ${googleKey}`,
                "Content-Type": "application/json"
            }
        });

        console.log("✅ Lovable Gateway Response:", response.status);
        console.log(response.data);

    } catch (error) {
        if (error.response) {
            console.error(`❌ Request Failed: ${error.response.status} ${error.response.statusText}`);
            console.error("Response Data:", error.response.data);
        } else {
            console.error("❌ Network/Error:", error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testLovableGateway();
