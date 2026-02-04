const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function debugInvoices() {
    console.log('Starting debug of invoices query...');

    try {
        const where = {};
        const skip = 0;
        const take = 10;
        const sortBy = 'createdAt';
        const sortOrder = 'desc';

        console.log('Executing executeWithRetry wrapper...');

        // 1. Test Main Query
        const [invoices, total] = await executeWithRetry(async () => {
            const prisma = getSharedPrismaClient();
            if (!prisma) throw new Error("Failed to get prisma client");

            return await Promise.all([
                prisma.invoice.findMany({
                    where,
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                currency: true
                            }
                        },
                        subscription: {
                            select: {
                                id: true,
                                planType: true,
                                status: true
                            }
                        },
                        invoice_items: true, // Corrected relation name from items to invoice_items
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                status: true,
                                paidAt: true,
                                method: true
                            }
                        }
                    },
                    skip,
                    take,
                    orderBy: {
                        [sortBy]: sortOrder
                    }
                }),
                prisma.invoice.count({ where })
            ]);
        });

        console.log('✅ Main Query successful!');
        console.log('Total:', total);
        console.log('Invoices found:', invoices.length);
        if (invoices.length > 0) {
            console.log('First invoice company:', invoices[0].company);
        }

        // 2. Test Stats Query
        console.log('Testing stats query...');
        const stats = await executeWithRetry(async () => {
            return await getSharedPrismaClient().invoice.groupBy({
                by: ['status'],
                _count: {
                    id: true
                },
                _sum: {
                    totalAmount: true
                }
            });
        });
        console.log('✅ Stats query successful:', stats);

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

debugInvoices();
