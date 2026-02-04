const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Apply authentication middleware to all routes in this router
router.use(authenticateToken);

// GET /api/v1/order-settings - Get order numbering settings
router.get('/', async (req, res) => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company ID is missing from token'
            });
        }

        const prisma = getSharedPrismaClient();

        let settings = await prisma.orderInvoiceSettings.findUnique({
            where: { companyId }
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await prisma.orderInvoiceSettings.create({
                data: {
                    companyId,
                    enableSequentialOrders: false,
                    orderPrefix: 'ORD',
                    nextOrderNumber: 1,
                    orderNumberFormat: 'PREFIX-XXXXXX'
                }
            });
        }

        res.json({
            success: true,
            data: {
                enableSequentialOrders: settings.enableSequentialOrders,
                orderPrefix: settings.orderPrefix,
                nextOrderNumber: settings.nextOrderNumber,
                orderNumberFormat: settings.orderNumberFormat
            }
        });
    } catch (error) {
        console.error('Error fetching order settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order settings',
            error: error.message
        });
    }
});

// PUT /api/v1/order-settings - Update order numbering settings
router.put('/', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { enableSequentialOrders, orderPrefix, nextOrderNumber, orderNumberFormat } = req.body;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company ID is missing from token'
            });
        }

        const prisma = getSharedPrismaClient();

        // Validate inputs
        if (orderPrefix && orderPrefix.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Order prefix must be 10 characters or less'
            });
        }

        if (nextOrderNumber && nextOrderNumber < 1) {
            return res.status(400).json({
                success: false,
                message: 'Next order number must be at least 1'
            });
        }

        // Prepare update data
        const updateData = {};
        if (enableSequentialOrders !== undefined) updateData.enableSequentialOrders = enableSequentialOrders;
        if (orderPrefix) updateData.orderPrefix = orderPrefix;
        if (nextOrderNumber) updateData.nextOrderNumber = nextOrderNumber;
        if (orderNumberFormat) updateData.orderNumberFormat = orderNumberFormat;

        // Update or create settings
        const settings = await prisma.orderInvoiceSettings.upsert({
            where: { companyId },
            update: updateData,
            create: {
                companyId,
                enableSequentialOrders: enableSequentialOrders || false,
                orderPrefix: orderPrefix || 'ORD',
                nextOrderNumber: nextOrderNumber || 1,
                orderNumberFormat: orderNumberFormat || 'PREFIX-XXXXXX'
            }
        });

        // If user wants to apply to past orders, perform bulk update
        if (req.body.applyToPastOrders) {
            const orders = await prisma.order.findMany({
                where: { companyId },
                orderBy: { createdAt: 'asc' }
            });

            if (orders.length > 0) {
                // If sequential is enabled, re-number them all starting from 1
                if (settings.enableSequentialOrders) {
                    let counter = 1;
                    for (const order of orders) {
                        const paddedNumber = counter.toString();
                        const newNumber = `${settings.orderPrefix}-${paddedNumber}`;

                        // We use updateMany with id to avoid individual transaction overhead if possible,
                        // but since we need unique numbers, a loop or a more complex query is needed.
                        // For safety and uniqueness, we update them one by one.
                        await prisma.order.update({
                            where: { id: order.id },
                            data: { orderNumber: newNumber }
                        });
                        counter++;
                    }

                    // Update the next order number in settings to reflect the new state
                    await prisma.orderInvoiceSettings.update({
                        where: { companyId },
                        data: { nextOrderNumber: counter }
                    });

                    settings.nextOrderNumber = counter;
                } else {
                    // If not sequential, just update the prefix part of existing numbers
                    for (const order of orders) {
                        const parts = order.orderNumber.split('-');
                        if (parts.length > 1) {
                            parts[0] = settings.orderPrefix;
                            const newNumber = parts.join('-');
                            await prisma.order.update({
                                where: { id: order.id },
                                data: { orderNumber: newNumber }
                            });
                        }
                    }
                }
            }
        }

        res.json({
            success: true,
            message: req.body.applyToPastOrders
                ? 'Order settings updated and all existing orders re-numbered successfully'
                : 'Order settings updated successfully (applied to future orders only)',
            data: {
                enableSequentialOrders: settings.enableSequentialOrders,
                orderPrefix: settings.orderPrefix,
                nextOrderNumber: settings.nextOrderNumber,
                orderNumberFormat: settings.orderNumberFormat
            }
        });
    } catch (error) {
        console.error('Error updating order settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order settings',
            error: error.message
        });
    }
});

// POST /api/v1/order-settings/reset-counter - Reset order counter
router.post('/reset-counter', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { newStartNumber } = req.body;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company ID is missing from token'
            });
        }

        if (!newStartNumber || newStartNumber < 1) {
            return res.status(400).json({
                success: false,
                message: 'New start number must be at least 1'
            });
        }

        const prisma = getSharedPrismaClient();

        const settings = await prisma.orderInvoiceSettings.update({
            where: { companyId },
            data: { nextOrderNumber: newStartNumber }
        });

        res.json({
            success: true,
            message: `Order counter reset to ${newStartNumber}`,
            data: {
                nextOrderNumber: settings.nextOrderNumber
            }
        });
    } catch (error) {
        console.error('Error resetting order counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset order counter',
            error: error.message
        });
    }
});

module.exports = router;
