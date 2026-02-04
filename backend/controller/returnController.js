const { getSharedPrismaClient } = require('../services/sharedDatabase');
// ✅ FIX: Use lazy-loading pattern - don't call getSharedPrismaClient at module load time
const getPrisma = () => getSharedPrismaClient();
const { calculateCustomerScore } = require('../services/customerRatingService');
const returnAIService = require('../services/returnAIService');
const cashbackService = require('../services/cashbackService');

// Return Reason Categories
exports.getCategories = async (req, res) => {
    try {
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;
        const categories = await getPrisma().returnReasonCategory.findMany({
            where: { companyId: effectiveCompanyId },
            include: { reasons: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, defaultRole } = req.body;
        const category = await getPrisma().returnReasonCategory.create({
            data: {
                name,
                defaultRole,
                companyId: req.user.effectiveCompanyId || req.user.companyId
            }
        });
        res.json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create category' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, defaultRole, isActive } = req.body;
        const category = await getPrisma().returnReasonCategory.update({
            where: { id },
            data: { name, defaultRole, isActive }
        });
        res.json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

// Return Reasons
exports.getReturnReasons = async (req, res) => {
    try {
        const reasons = await getPrisma().returnReason.findMany({
            where: {
                companyId: req.user.effectiveCompanyId || req.user.companyId,
                isActive: true
            },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reasons);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch return reasons' });
    }
};

exports.createReturnReason = async (req, res) => {
    try {
        const { reason, description, categoryId } = req.body;
        const newReason = await getPrisma().returnReason.create({
            data: {
                reason,
                description,
                categoryId,
                companyId: req.user.effectiveCompanyId || req.user.companyId
            }
        });
        res.json(newReason);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create return reason' });
    }
};

exports.updateReturnReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, description, categoryId, isActive } = req.body;
        const updated = await getPrisma().returnReason.update({
            where: { id },
            data: { reason, description, categoryId, isActive }
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update return reason' });
    }
};

exports.deleteReturnReason = async (req, res) => {
    try {
        const { id } = req.params;

        // Security check
        const reason = await getPrisma().returnReason.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });

        if (!reason) {
            return res.status(404).json({ error: 'Return reason not found' });
        }

        await getPrisma().returnReason.update({
            where: { id },
            data: { isActive: false }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete return reason' });
    }
};

// Return Requests
exports.getReturnRequests = async (req, res) => {
    try {
        const { status, orderId, customerId } = req.query;
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;
        const where = { companyId: effectiveCompanyId };

        if (status) where.status = status;
        if (orderId) where.orderId = orderId;
        if (customerId) where.customerId = customerId;

        const requests = await getPrisma().returnRequest.findMany({
            where,
            include: {
                customer: {
                    select: { firstName: true, lastName: true, email: true, phone: true, customerRating: true, successScore: true }
                },
                order: {
                    select: { orderNumber: true, total: true, currency: true }
                },
                reason: {
                    include: {
                        category: true
                    }
                },
                assignedUser: {
                    select: { firstName: true, lastName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch return requests' });
    }
};

exports.createReturnRequest = async (req, res) => {
    try {
        const { orderId, orderNumber, orderItemId, customerId, reasonId, customerNotes, adminNotes, assignedTo, responsibleParty } = req.body;

        // Find order by orderNumber or orderId
        let order = null;
        if (orderNumber) {
            order = await getPrisma().order.findFirst({
                where: {
                    OR: [
                        { orderNumber: orderNumber },
                        { id: orderNumber }
                    ],
                    companyId: req.user.effectiveCompanyId || req.user.companyId
                }
            });
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
        }

        const finalOrderId = order?.id || orderId;
        const finalCustomerId = order?.customerId || customerId;

        if (!finalOrderId) {
            return res.status(400).json({ error: 'Order ID or Order Number is required' });
        }

        // If responsibleParty isn't provided, try to get it from reason's category
        let finalResponsibleParty = responsibleParty;
        if (!finalResponsibleParty && reasonId) {
            const reason = await getPrisma().returnReason.findUnique({
                where: { id: reasonId },
                include: { category: true }
            });
            if (reason?.category?.defaultRole) {
                finalResponsibleParty = reason.category.defaultRole;
            }
        }

        const request = await getPrisma().returnRequest.create({
            data: {
                orderId: finalOrderId,
                orderItemId,
                customerId: finalCustomerId,
                reasonId,
                customerNotes,
                adminNotes,
                assignedTo,
                responsibleParty: finalResponsibleParty || 'OTHER',
                companyId: req.user.effectiveCompanyId || req.user.companyId,
                status: 'PENDING'
            }
        });

        // Log creation
        await logReturnActivity(getPrisma(), request.id, req.user?.id, 'CREATED', 'Return request created');

        res.json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create return request' });
    }
};

exports.updateReturnRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes, customerNotes, reasonId, refundAmount, assignedTo, responsibleParty, isReviewed, rejectionReason } = req.body;

        // Security & Null Check
        const oldRequest = await getPrisma().returnRequest.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });

        if (!oldRequest) {
            return res.status(404).json({ error: 'Return request not found' });
        }

        const data = {
            status,
            adminNotes,
            customerNotes,
            reasonId,
            refundAmount,
            assignedTo,
            responsibleParty,
            isReviewed,
            rejectionReason
        };

        if (isReviewed && !oldRequest.isReviewed) {
            data.reviewedAt = new Date();
            data.reviewedBy = req.user.id;
        }

        const updatedRequest = await getPrisma().returnRequest.update({
            where: { id },
            data
        });

        // Log status changes and notes
        if (status && oldRequest.status !== status) {
            await logReturnActivity(getPrisma(), id, req.user.id, 'STATUS_CHANGE', { from: oldRequest.status, to: status });
        }
        if (adminNotes && adminNotes !== oldRequest.adminNotes) {
            await logReturnActivity(getPrisma(), id, req.user.id, 'NOTE_ADDED', 'Admin note updated');
        }

        // If status changed to APPROVED/REJECTED as part of review
        if (isReviewed && !oldRequest.isReviewed) {
            await logReturnActivity(getPrisma(), id, req.user.id, 'REVIEWED', { status });
        }

        // If status changed to COMPLETED/APPROVED, recalculate customer score
        // We will move this logic to a more specific service later if needed
        if (status !== oldRequest.status && (status === 'COMPLETED' || status === 'APPROVED')) {
            await calculateCustomerScore(updatedRequest.customerId, req.user.companyId);
        }

        if (status && status !== oldRequest.status && (status === 'COMPLETED' || status === 'APPROVED')) {
            try {
                await cashbackService.reverseCashbackForReturn({
                    returnRequestId: updatedRequest.id,
                    companyId: req.user.effectiveCompanyId || req.user.companyId,
                    changedBy: req.user.id
                });
            } catch (e) {
                console.error('❌ [CASHBACK] Failed to reverse cashback for return:', {
                    returnRequestId: updatedRequest.id,
                    companyId: req.user.effectiveCompanyId || req.user.companyId,
                    error: e?.message
                });
            }
        }

        res.json(updatedRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update return request' });
    }
};

exports.analyzeReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const returnRequest = await getPrisma().returnRequest.findUnique({
            where: { id },
            include: {
                reason: true,
                order: { include: { orderItems: true } },
                customer: { include: { _count: { select: { orders: true } } } }
            }
        });

        if (!returnRequest) {
            return res.status(404).json({ error: 'Return request not found' });
        }

        if (returnRequest.companyId !== companyId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const analysis = await returnAIService.analyzeReturnRequest(returnRequest, returnRequest.customer, returnRequest.order, companyId);
        res.json({ success: true, data: analysis });

    } catch (error) {
        console.error('Error analyzing return:', error);
        res.status(500).json({ error: 'Failed to analyze return' });
    }
};

exports.createPublicReturnRequest = async (req, res) => {
    try {
        const { orderNumber, emailOrPhone, reasonId, customerNotes } = req.body;

        const order = await getPrisma().order.findUnique({
            where: { orderNumber },
            include: { customer: true }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const customer = order.customer;
        // Verify email or phone matches
        const matches = (customer.email && customer.email === emailOrPhone) ||
            (customer.phone && customer.phone === emailOrPhone);

        if (!matches) {
            return res.status(403).json({ error: 'Verification failed' });
        }

        const request = await getPrisma().returnRequest.create({
            data: {
                orderId: order.id,
                customerId: customer.id,
                companyId: order.companyId,
                reasonId,
                customerNotes,
                status: 'PENDING'
            }
        });

        res.json({ success: true, request });
    } catch (error) {
        console.error('Public return error:', error);
        res.status(500).json({ error: 'Failed to create request' });
    }
};

/* --- New Features Implementation --- */

// Helper to log activity
async function logReturnActivity(prismaClient, returnRequestId, userId, action, details) {
    try {
        await prismaClient.returnActivityLog.create({
            data: {
                returnRequestId,
                userId,
                action, // e.g., 'STATUS_CHANGE', 'NOTE_ADDED', 'CALL_LOGGED'
                details: typeof details === 'object' ? JSON.stringify(details) : details
            }
        });
    } catch (e) {
        console.error('Failed to log return activity:', e);
    }
}

// 1. Return Settings
exports.getReturnSettings = async (req, res) => {
    try {
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        let settings = await getPrisma().returnSettings.findUnique({
            where: { companyId }
        });

        if (!settings) {
            settings = await getPrisma().returnSettings.create({
                data: { companyId }
            });
        }
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch return settings' });
    }
};

exports.updateReturnSettings = async (req, res) => {
    try {
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        const data = req.body; // expected: { excellentThreshold: 90, ... }

        const settings = await getPrisma().returnSettings.upsert({
            where: { companyId },
            update: data,
            create: { ...data, companyId }
        });
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// 2. Contact History
exports.addContactAttempt = async (req, res) => {
    try {
        const { id } = req.params; // returnRequestId
        const { method, result, notes } = req.body;
        const userId = req.user.id;

        // Verify request exists and belongs to company
        const request = await getPrisma().returnRequest.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });
        if (!request) return res.status(404).json({ error: 'Return request not found' });

        const attempt = await getPrisma().returnContactAttempt.create({
            data: {
                returnRequestId: id,
                userId,
                method,
                result,
                notes
            }
        });

        // Log this action in the general Audit Log as well
        await logReturnActivity(getPrisma(), id, userId, 'CONTACT_ATTEMPT', { method, result });

        res.json(attempt);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to log contact attempt' });
    }
};

exports.getContactHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // Security check
        const request = await getPrisma().returnRequest.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });
        if (!request) return res.status(404).json({ error: 'Return request not found' });

        const history = await getPrisma().returnContactAttempt.findMany({
            where: { returnRequestId: id },
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch contact history' });
    }
};

// 3. Activity Log
exports.getActivityLog = async (req, res) => {
    try {
        const { id } = req.params;

        // Security check
        const request = await getPrisma().returnRequest.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });
        if (!request) return res.status(404).json({ error: 'Return request not found' });

        const logs = await getPrisma().returnActivityLog.findMany({
            where: { returnRequestId: id },
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
};
