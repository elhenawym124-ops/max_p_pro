const { PrismaClient } = require('./prisma/generated/verify_client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log("Checking for TelegramScheduledMessage model...");
        // In Prisma 6, models are properties of the client instance.
        // They are camelCase by default: telegramScheduledMessage
        if (prisma.telegramScheduledMessage) {
            console.log("✅ TelegramScheduledMessage model found.");
        } else {
            console.error("❌ TelegramScheduledMessage model NOT found on prisma client.");
            console.log("Available models:", Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
        }

        console.log("Checking for DevSystemSettings key default...");
        if (prisma.devSystemSettings) {
            console.log("✅ DevSystemSettings model found.");
        }

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

check();
