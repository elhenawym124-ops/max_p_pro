const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function debugAiLogs() {
    console.log('Starting debug of AI logs...');

    try {
        const page = 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        console.log('Executing executeWithRetry wrapper...');

        // Test Query with 'companies' instead of 'company'
        const logs = await executeWithRetry(async () => {
            const prisma = getSharedPrismaClient();
            if (!prisma) throw new Error("Failed to get prisma client");

            // Try checking if model exists
            if (!prisma.aiInteraction) {
                throw new Error("prisma.aiInteraction is undefined! The model might not exist on the client.");
            }

            return await prisma.aiInteraction.findMany({
                orderBy: { createdAt: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit),
                include: {
                    companies: { // Hypothesis: relation is named 'companies'
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            });
        });

        console.log('✅ Query successful with "companies" relation!');
        console.log('Logs found:', logs.length);
        if (logs.length > 0) {
            console.log('Sample log company:', logs[0].companies);
        }

    } catch (error) {
        console.error('❌ Query Failed!');
        console.error('Error message:', error.message);
        // console.error('Stack:', error.stack);

        // If 'companies' fails, we might try other names or just report it.
        if (error.message.includes("Unknown field `companies`")) {
            console.log("⚠️ 'companies' relation also failed. Checking available fields via error message...");
        }
    } finally {
        process.exit();
    }
}

debugAiLogs();
