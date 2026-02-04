const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Bulk Search Controller
 * البحث الجماعي عن الطلبات باستخدام أكواد الطلبات أو أرقام التليفونات
 */

const bulkSearchOrders = async (req, res) => {
    try {
        const { searchType, values } = req.body;
        const companyId = req.user?.companyId;

        // Validation
        if (!companyId) {
            return res.status(403).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        if (!searchType || !values || !Array.isArray(values)) {
            return res.status(400).json({
                success: false,
                error: 'searchType and values array are required'
            });
        }

        if (values.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Values array cannot be empty'
            });
        }

        if (values.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 values allowed per search'
            });
        }

        // تنظيف القيم
        const cleanedValues = values
            .map(v => String(v).trim())
            .filter(v => v.length > 0);

        if (cleanedValues.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid values provided after cleaning'
            });
        }

        const prisma = getSharedPrismaClient();
        let orders = [];
        let searchField = '';

        // تحديد نوع البحث
        if (searchType === 'orderNumber') {
            searchField = 'orderNumber';
            orders = await prisma.order.findMany({
                where: {
                    companyId: companyId,
                    orderNumber: {
                        in: cleanedValues
                    }
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    },
                    orderItems: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        } else if (searchType === 'phone') {
            searchField = 'phone';
            // البحث المحسّن: استعلام واحد بدلاً من اثنين
            orders = await prisma.order.findMany({
                where: {
                    companyId: companyId,
                    customer: {
                        phone: {
                            in: cleanedValues
                        }
                    }
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true
                        }
                    },
                    orderItems: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid searchType. Must be "orderNumber" or "phone"'
            });
        }

        // تحديد القيم الموجودة والمفقودة
        let foundValues = [];
        let uniqueMatches = 0;
        
        if (searchType === 'orderNumber') {
            foundValues = orders.map(o => o.orderNumber);
            uniqueMatches = foundValues.length;
        } else if (searchType === 'phone') {
            // استخراج أرقام التليفونات الفريدة من النتائج
            const uniquePhones = [...new Set(orders.map(o => o.customer?.phone).filter(Boolean))];
            foundValues = uniquePhones;
            uniqueMatches = uniquePhones.length;
        }

        const notFoundValues = cleanedValues.filter(v => !foundValues.includes(v));

        // إحصائيات محسّنة
        const stats = {
            total: cleanedValues.length,
            found: uniqueMatches,
            notFound: notFoundValues.length,
            ordersCount: orders.length,
            // إضافة معلومات إضافية للوضوح
            searchType: searchType,
            note: searchType === 'phone' ? 'found = unique phone numbers, ordersCount = total orders' : 'found = unique order numbers'
        };

        res.json({
            success: true,
            data: {
                orders: orders,
                notFoundValues: notFoundValues,
                stats: stats,
                searchType: searchType
            }
        });

    } catch (error) {
        console.error('❌ Error in bulkSearchOrders:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to perform bulk search'
        });
    }
};

module.exports = {
    bulkSearchOrders
};
