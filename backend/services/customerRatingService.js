// Use shared database connection
const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = new PrismaClient(); // ❌ Removed


const calculateCustomerScore = async (customerId, companyId) => {
    try {
        const prisma = getSharedPrismaClient();

        // 1. Fetch all orders for this customer in final states
        const orders = await prisma.order.findMany({
            where: {
                customerId,
                companyId,
                status: {
                    in: ['DELIVERED', 'COMPLETED', 'RETURNED', 'CANCELLED']
                }
            },
            include: {
                returnRequests: {
                    where: { isReviewed: true }
                }
            }
        });

        // 2. Count Total Delivered (Numerator)
        // Orders that are DELIVERED/COMPLETED and DO NOT have a customer-fault return
        const deliveredOrders = orders.filter(o => {
            const isDelivered = ['DELIVERED', 'COMPLETED'].includes(o.status);
            const hasCustomerFaultReturn = o.returnRequests.some(r => r.responsibleParty === 'CUSTOMER');
            return isDelivered && !hasCustomerFaultReturn;
        });
        const totalDelivered = deliveredOrders.length;

        // 3. Count Customer-Fault Returns/Refusals (Failures)
        // This includes orders with status RETURNED/CANCELLED if they have a customer-fault return request
        // OR if the entire order was refused by customer (handled by ReturnRole.CUSTOMER)
        const customerFaultReturns = orders.filter(o => {
            return o.returnRequests.some(r => r.responsibleParty === 'CUSTOMER');
        });
        const totalCustomerFaults = customerFaultReturns.length;

        // 4. Calculate Delivery Rate
        // Total Attempts = Delivered + Customer-Faults
        const totalAttempts = totalDelivered + totalCustomerFaults;

        let deliveryRate = 0;
        if (totalAttempts > 0) {
            deliveryRate = (totalDelivered / totalAttempts) * 100;
        }

        // 5. Determine Rating
        let rating = 'UNKNOWN';
        if (totalAttempts > 0) {
            if (deliveryRate >= 90) rating = 'EXCELLENT';
            else if (deliveryRate >= 70) rating = 'GOOD';
            else if (deliveryRate >= 50) rating = 'AVERAGE';
            else rating = 'BAD';
        }

        // 6. Update Customer Modal
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                deliveryRate: deliveryRate,
                totalDelivered: totalDelivered,
                totalOrdersCount: totalAttempts,
                customerRating: rating,
                successScore: deliveryRate // Keep successScore in sync for legacy compatibility
            }
        });

        return { deliveryRate, totalDelivered, totalAttempts, rating };

    } catch (error) {
        console.error('Error calculating customer score:', error);
        throw error;
    }
};

module.exports = {
    calculateCustomerScore
};
