const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { createWooClient } = require('../services/wooCommerceClientService');
const { exportSingleOrder } = require('../services/wooCommerceExportService');

/**
 * جلب الطلبات المحلية للتصدير
 * GET /api/v1/woocommerce/orders/local
 */
const getLocalOrdersForExport = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

        const orders = await getSharedPrismaClient().order.findMany({
            where: {
                companyId,
                syncedToWoo: false,
                syncedFromWoo: false // Don't re-export orders that came FROM WooCommerce
            },
            include: {
                customer: true,
                orderItems: true
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json({ success: true, data: { orders } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات', error: error.message });
    }
};

/**
 * تصدير الطلبات المحددة إلى WooCommerce
 * POST /api/v1/woocommerce/orders/export
 */
const exportOrdersToWooCommerce = async (req, res) => {
    let syncLog = null;
    const prisma = getSharedPrismaClient();

    try {
        const companyId = req.user?.companyId;
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: 'قائمة الطلبات مطلوبة' });
        }

        const settings = await prisma.wooCommerceSettings.findUnique({
            where: { companyId }
        });

        if (!settings) return res.status(400).json({ success: false, message: 'الإعدادات غير موجودة' });

        const wooClient = await createWooClient(settings);

        // Initial log creation
        syncLog = await prisma.wooCommerceSyncLog.create({
            data: {
                companyId,
                syncType: 'export_orders',
                syncDirection: 'to_woo',
                status: 'in_progress',
                totalItems: orderIds.length,
                triggeredBy: 'user'
            }
        });

        const results = { success: [], failed: [] };
        const orders = await prisma.order.findMany({
            where: { id: { in: orderIds }, companyId },
            include: {
                orderItems: { include: { product: true, variant: true } },
                customer: true
            }
        });

        for (const order of orders) {
            try {
                const exportResult = await exportSingleOrder(wooClient, order);

                // Update local status record
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        wooCommerceId: String(exportResult.wooOrder.id),
                        wooCommerceOrderKey: exportResult.wooOrder.order_key,
                        wooCommerceStatus: exportResult.wooOrder.status,
                        wooCommerceUrl: `${settings.storeUrl}/wp-admin/post.php?post=${exportResult.wooOrder.id}&action=edit`,
                        syncedToWoo: true,
                        lastSyncAt: new Date()
                    }
                });

                results.success.push({ orderId: order.id, wooCommerceId: exportResult.wooOrder.id, action: exportResult.status });
            } catch (error) {
                results.failed.push({
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    reason: error.message,
                    details: error.response?.data
                });
            }
        }

        // Finalize log
        const duration = Math.floor((Date.now() - syncLog.startedAt.getTime()) / 1000);
        const finalStatus = results.failed.length === 0 ? 'success' : (results.success.length > 0 ? 'partial' : 'failed');

        await prisma.wooCommerceSyncLog.update({
            where: { id: syncLog.id },
            data: {
                status: finalStatus,
                successCount: results.success.length,
                failedCount: results.failed.length,
                completedAt: new Date(),
                duration,
                errorMessage: results.failed.length > 0 ? `${results.failed.length} orders failed` : null
            }
        });

        res.json({
            success: true,
            message: 'اكتملت عملية التصدير',
            data: { exported: results.success.length, failed: results.failed.length, details: results }
        });

    } catch (error) {
        if (syncLog) {
            await prisma.wooCommerceSyncLog.update({
                where: { id: syncLog.id },
                data: { status: 'failed', errorMessage: error.message, completedAt: new Date() }
            });
        }
        res.status(500).json({ success: false, message: 'خطأ في عملية التصدير', error: error.message });
    }
};

module.exports = {
    getLocalOrdersForExport,
    exportOrdersToWooCommerce
};
