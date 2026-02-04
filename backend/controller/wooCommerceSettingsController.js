const { getSharedPrismaClient } = require('../services/sharedDatabase');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { createWooClient } = require('../services/wooCommerceClientService');
const { getWooCommerceAutoSyncScheduler } = require('../services/wooCommerceAutoSyncScheduler');

/**
 * جلب إعدادات WooCommerce
 * GET /api/v1/woocommerce/settings
 */
const getWooCommerceSettings = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

        const settings = await getSharedPrismaClient().wooCommerceSettings.findUnique({
            where: { companyId }
        });

        if (!settings) {
            return res.json({ success: true, data: null, message: 'لا توجد إعدادات محفوظة' });
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
        const backendUrl = process.env.BACKEND_URL || `${protocol}://${host}`;

        res.json({
            success: true,
            data: {
                id: settings.id,
                storeUrl: settings.storeUrl,
                hasCredentials: !!(settings.consumerKey && settings.consumerSecret),
                syncEnabled: settings.syncEnabled,
                syncDirection: settings.syncDirection,
                syncInterval: settings.syncInterval,
                webhookEnabled: settings.webhookEnabled,
                statusMapping: settings.statusMapping ? JSON.parse(settings.statusMapping) : {},
                lastSyncAt: settings.lastSyncAt,
                lastSyncStatus: settings.lastSyncStatus,
                webhookUrl: `${backendUrl}/api/v1/woocommerce/webhook/${companyId}`
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب الإعدادات', error: error.message });
    }
};

/**
 * حفظ إعدادات WooCommerce
 * POST /api/v1/woocommerce/settings
 */
const saveWooCommerceSettings = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

        const {
            storeUrl, consumerKey, consumerSecret, syncEnabled,
            syncDirection, syncInterval, autoImport, autoExport,
            webhookEnabled, statusMapping
        } = req.body;

        const existingSettings = await getSharedPrismaClient().wooCommerceSettings.findUnique({
            where: { companyId }
        });

        const finalConsumerKey = consumerKey || existingSettings?.consumerKey;
        const finalConsumerSecret = consumerSecret || existingSettings?.consumerSecret;

        if (!storeUrl || !finalConsumerKey || !finalConsumerSecret) {
            return res.status(400).json({ success: false, message: 'بيانات الاتصال ناقصة' });
        }

        // Test Connection
        try {
            const testClient = await createWooClient({
                storeUrl,
                consumerKey: finalConsumerKey,
                consumerSecret: finalConsumerSecret
            });
            await testClient.get('orders', { params: { per_page: 1 } });
        } catch (error) {
            return res.status(400).json({ success: false, message: 'فشل الاتصال بـ WooCommerce', error: error.message });
        }

        const webhookSecret = crypto.randomBytes(32).toString('hex');
        const isSyncEnabled = syncEnabled || autoImport || autoExport;

        let effectiveSyncDirection = syncDirection || 'both';
        if (autoImport && !autoExport) effectiveSyncDirection = 'import_only';
        else if (!autoImport && autoExport) effectiveSyncDirection = 'export_only';
        else if (autoImport && autoExport) effectiveSyncDirection = 'both';

        const settings = await getSharedPrismaClient().wooCommerceSettings.upsert({
            where: { companyId },
            update: {
                storeUrl: storeUrl.replace(/\/$/, ''),
                consumerKey: finalConsumerKey,
                consumerSecret: finalConsumerSecret,
                syncEnabled: isSyncEnabled,
                syncDirection: effectiveSyncDirection,
                syncInterval: syncInterval || 15,
                webhookEnabled: webhookEnabled || false,
                webhookSecret,
                statusMapping: statusMapping ? JSON.stringify(statusMapping) : null,
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                id: uuidv4(),
                companyId,
                storeUrl: storeUrl.replace(/\/$/, ''),
                consumerKey: finalConsumerKey,
                consumerSecret: finalConsumerSecret,
                syncEnabled: isSyncEnabled,
                syncDirection: effectiveSyncDirection,
                syncInterval: syncInterval || 15,
                webhookEnabled: webhookEnabled || false,
                webhookSecret,
                statusMapping: statusMapping ? JSON.stringify(statusMapping) : null,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في حفظ الإعدادات', error: error.message });
    }
};

/**
 * جلب سجل المزامنة
 * GET /api/v1/woocommerce/sync-logs
 */
const getSyncLogs = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

        const logs = await getSharedPrismaClient().wooCommerceSyncLog.findMany({
            where: { companyId },
            orderBy: { startedAt: 'desc' },
            take: 50
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب السجلات', error: error.message });
    }
};

/**
 * تشغيل المزامنة يدوياً
 * POST /api/v1/woocommerce/auto-sync
 */
const triggerAutoSync = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

        const scheduler = getWooCommerceAutoSyncScheduler();
        const result = await scheduler.syncCompany(companyId);

        res.json({
            success: result.success,
            message: result.success ? 'تمت المزامنة بنجاح' : 'فشلت المزامنة',
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في المزامنة', error: error.message });
    }
};

/**
 * جلب حالات الطلب من WooCommerce (Deep Scan)
 * GET /api/v1/woocommerce/orders/statuses
 */
const getWooCommerceStatuses = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

        const settings = await getSharedPrismaClient().wooCommerceSettings.findUnique({
            where: { companyId }
        });

        if (!settings) return res.status(400).json({ success: false, message: 'الإعدادات غير موجودة' });

        const wooClient = await createWooClient(settings);

        // Deep scan for statuses (from multiple sources as per original logic)
        // 1. Standard API response (might not have all)
        // 2. Fetching recent orders to see actual statuses used

        const statuses = new Map();

        // Add standard WooCommerce statuses as baseline
        const standardStatuses = [
            { id: 'pending', name: 'قيد الانتظار (Pending)' },
            { id: 'processing', name: 'قيد التنفيذ (Processing)' },
            { id: 'on-hold', name: 'معلق (On-hold)' },
            { id: 'completed', name: 'مكتمل (Completed)' },
            { id: 'cancelled', name: 'ملغي (Cancelled)' },
            { id: 'refunded', name: 'مسترجع (Refunded)' },
            { id: 'failed', name: 'فشل (Failed)' },
            { id: 'trash', name: 'سلة المهملات (Trash)' }
        ];

        standardStatuses.forEach(s => statuses.set(s.id, s));

        // Deep scan for custom statuses
        try {
            // 1. Try reports endpoint (most efficient for all statuses)
            const reportsResponse = await wooClient.get('/reports/orders/totals');
            if (Array.isArray(reportsResponse.data)) {
                reportsResponse.data.forEach(item => {
                    if (item.slug && !statuses.has(item.slug)) {
                        statuses.set(item.slug, {
                            id: item.slug,
                            name: item.name || item.slug,
                            isCustom: true
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('Scan via reports failed, falling back to recent orders', e.message);

            // 2. Fallback: Scan recent orders (increase limit to 100 for better coverage)
            try {
                const recentOrders = await wooClient.get('/orders', { params: { per_page: 100 } });
                recentOrders.data.forEach(order => {
                    if (order.status && !statuses.has(order.status)) {
                        statuses.set(order.status, {
                            id: order.status,
                            name: order.status,
                            isCustom: true
                        });
                    }
                });
            } catch (innerE) {
                console.error('Deep scan fell back to orders and still failed', innerE.message);
            }
        }

        res.json({
            success: true,
            data: Array.from(statuses.values()).map(s => ({
                slug: s.id,
                name: s.name,
                isCustom: s.isCustom || false
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب الحالات', error: error.message });
    }
};

module.exports = {
    getWooCommerceSettings,
    saveWooCommerceSettings,
    getSyncLogs,
    triggerAutoSync,
    getWooCommerceStatuses
};
