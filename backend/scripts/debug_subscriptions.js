const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function debugSubscriptions() {
    console.log('Starting debug of subscriptions query...');

    try {
        const where = {};
        const skip = 0;
        const take = 10;
        const sortBy = 'createdAt';
        const sortOrder = 'desc';

        console.log('Executing executeWithRetry wrapper...');

        // 1. Test Main Query
        const [subscriptions, total] = await executeWithRetry(async () => {
            const prisma = getSharedPrismaClient();
            if (!prisma) throw new Error("Failed to get prisma client");

            return await Promise.all([
                prisma.subscription.findMany({
                    where,
                    include: {
                        companies: { // Corrected relation name
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                currency: true,
                                isActive: true
                            }
                        },
                        invoices: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                status: true,
                                totalAmount: true,
                                dueDate: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 3
                        },
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                status: true,
                                paidAt: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 3
                        }
                    },
                    skip,
                    take,
                    orderBy: {
                        [sortBy]: sortOrder
                    }
                }),
                prisma.subscription.count({ where })
            ]);
        });

        console.log('✅ Main Query successful!');
        console.log('Total:', total);
        console.log('Subscriptions found:', subscriptions.length);

        // 2. Test Stats Query (groupBy)
        console.log('Testing stats query (groupBy)...');
        const stats = await executeWithRetry(async () => {
            return await getSharedPrismaClient().subscription.groupBy({
                by: ['status'],
                _count: {
                    id: true
                }
            });
        });
        console.log('✅ Stats query successful:', stats);

        // 3. Test Revenue Query (aggregate)
        console.log('Testing revenue query (aggregate)...');
        const revenueStats = await executeWithRetry(async () => {
            return await getSharedPrismaClient().subscription.aggregate({
                where: { status: 'ACTIVE' },
                _sum: {
                    price: true
                }
            });
        });
        console.log('✅ Revenue query successful:', revenueStats);

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

debugSubscriptions();
