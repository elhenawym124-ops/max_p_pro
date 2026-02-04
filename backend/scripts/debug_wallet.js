const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function debugWallet() {
    console.log('Starting debug of wallet pending receipts...');

    try {
        const page = 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        console.log('Executing executeWithRetry wrapper...');

        // Test Pending Receipts Query with CORRECT Schema
        const [receipts, total] = await executeWithRetry(async () => {
            const prisma = getSharedPrismaClient();
            if (!prisma) throw new Error("Failed to get prisma client");

            return await Promise.all([
                prisma.paymentReceipt.findMany({
                    where: { status: 'PENDING' },
                    include: {
                        invoices: { // FIXED: Plural relation
                            include: {
                                company: {
                                    select: {
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        },
                        wallet_numbers: true // FIXED: Plural/Snake_case relation
                    },
                    orderBy: { submittedAt: 'desc' },
                    skip: parseInt(skip),
                    take: parseInt(limit)
                }),
                prisma.paymentReceipt.count({
                    where: { status: 'PENDING' }
                })
            ]);
        });

        console.log('✅ Query successful!');
        console.log('Total:', total);
        console.log('Receipts found:', receipts.length);

        if (receipts.length > 0) {
            console.log('First receipt invoice:', receipts[0].invoices);
            console.log('First receipt wallet:', receipts[0].wallet_numbers);
        }

    } catch (error) {
        console.error('❌ Query Failed!');
        console.error('Error message:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.meta) console.error('Error meta:', error.meta);
        console.error('Stack:', error.stack);
    } finally {
        process.exit();
    }
}

debugWallet();
