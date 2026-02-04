/**
 * Owner Controller
 * Handles multi-company dashboard and management for OWNER role
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Get all companies where the current user is OWNER
 */
const getOwnerCompanies = async (req, res) => {
    try {
        const userId = req.user.id;
        const prisma = getSharedPrismaClient();

        // Find all companies where user has OWNER role
        const userCompanies = await prisma.userCompany.findMany({
            where: {
                userId: userId,
                role: 'OWNER',
                isActive: true
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        email: true,
                        phone: true,
                        plan: true,
                        isActive: true,
                        createdAt: true
                    }
                }
            }
        });

        const companies = userCompanies.map(uc => ({
            ...uc.company,
            role: uc.role,
            joinedAt: uc.joinedAt,
            isDefault: uc.isDefault
        }));

        res.json({
            success: true,
            message: 'تم جلب الشركات بنجاح',
            data: {
                totalCompanies: companies.length,
                companies
            }
        });
    } catch (error) {
        console.error('❌ [OWNER] Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الشركات',
            error: error.message
        });
    }
};

/**
 * Get unified dashboard statistics across all owner's companies
 */
const getOwnerDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const prisma = getSharedPrismaClient();

        // Get all companies where user is OWNER
        const userCompanies = await prisma.userCompany.findMany({
            where: {
                userId: userId,
                role: 'OWNER',
                isActive: true
            },
            select: { companyId: true }
        });

        const companyIds = userCompanies.map(uc => uc.companyId);

        if (companyIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalCompanies: 0,
                    overview: null,
                    byCompany: []
                }
            });
        }

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Aggregate data for each company
        const companiesData = await Promise.all(companyIds.map(async (companyId) => {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { id: true, name: true, logo: true, plan: true }
            });

            // Count users in company (safe query)
            let totalUsers = 0;
            try {
                totalUsers = await prisma.user.count({
                    where: { companyId, isActive: true }
                });
            } catch (e) {
                console.warn(`[OWNER] Could not count users for company ${companyId}:`, e.message);
            }

            // Count today's orders (safe query)
            let todayOrders = 0;
            let todayRevenue = 0;
            try {
                todayOrders = await prisma.order.count({
                    where: {
                        companyId,
                        createdAt: { gte: today, lt: tomorrow }
                    }
                });

                const revenueResult = await prisma.order.aggregate({
                    where: {
                        companyId,
                        createdAt: { gte: today, lt: tomorrow }
                    },
                    _sum: { total: true }
                });
                todayRevenue = revenueResult._sum.total || 0;
            } catch (e) {
                console.warn(`[OWNER] Could not fetch orders for company ${companyId}:`, e.message);
            }

            // Count unread conversations (safe query - field may not exist)
            let unreadConversations = 0;
            try {
                // Try to count conversations with unread messages
                unreadConversations = await prisma.conversation.count({
                    where: {
                        companyId,
                        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours as proxy
                    }
                });
            } catch (e) {
                console.warn(`[OWNER] Could not count conversations for company ${companyId}:`, e.message);
            }

            // Count low stock products (safe query - field may be named differently)
            let lowStockProducts = 0;
            try {
                lowStockProducts = await prisma.product.count({
                    where: {
                        companyId,
                        stock: { lte: 5 },
                        isActive: true
                    }
                });
            } catch (e) {
                // Try alternative field name
                try {
                    lowStockProducts = await prisma.product.count({
                        where: {
                            companyId,
                            quantity: { lte: 5 },
                            isActive: true
                        }
                    });
                } catch (e2) {
                    console.warn(`[OWNER] Could not count low stock products for company ${companyId}:`, e.message);
                }
            }

            // Today's attendance (if HR module exists)
            let attendanceStats = { present: 0, absent: 0, late: 0 };
            try {
                const attendance = await prisma.attendance.findMany({
                    where: {
                        companyId,
                        date: { gte: today, lt: tomorrow }
                    }
                });
                attendanceStats = {
                    present: attendance.filter(a => a.status === 'PRESENT').length,
                    late: attendance.filter(a => a.status === 'LATE').length,
                    absent: Math.max(0, totalUsers - attendance.length)
                };
            } catch (e) {
                // HR module might not exist
            }

            return {
                company: company,
                stats: {
                    totalUsers,
                    todayOrders,
                    todayRevenue,
                    unreadConversations,
                    lowStockProducts,
                    attendance: attendanceStats
                }
            };
        }));

        // Calculate totals
        const overview = {
            totalCompanies: companyIds.length,
            totalUsers: companiesData.reduce((sum, c) => sum + c.stats.totalUsers, 0),
            totalTodayOrders: companiesData.reduce((sum, c) => sum + c.stats.todayOrders, 0),
            totalTodayRevenue: companiesData.reduce((sum, c) => sum + Number(c.stats.todayRevenue), 0),
            totalUnreadConversations: companiesData.reduce((sum, c) => sum + c.stats.unreadConversations, 0),
            totalLowStockProducts: companiesData.reduce((sum, c) => sum + c.stats.lowStockProducts, 0)
        };

        res.json({
            success: true,
            message: 'تم جلب الإحصائيات بنجاح',
            data: {
                overview,
                byCompany: companiesData
            }
        });
    } catch (error) {
        console.error('❌ [OWNER] Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الإحصائيات',
            error: error.message
        });
    }
};

/**
 * Get all users across all owner's companies
 */
const getOwnerUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const prisma = getSharedPrismaClient();

        // Get all companies where user is OWNER
        const userCompanies = await prisma.userCompany.findMany({
            where: {
                userId: userId,
                role: 'OWNER',
                isActive: true
            },
            select: { companyId: true }
        });

        const companyIds = userCompanies.map(uc => uc.companyId);

        // Get all users in these companies
        const allUserCompanies = await prisma.userCompany.findMany({
            where: {
                companyId: { in: companyIds }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                        lastLoginAt: true
                    }
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        logo: true
                    }
                }
            }
        });

        // Group by user
        const usersMap = new Map();
        allUserCompanies.forEach(uc => {
            const userId = uc.user.id;
            if (!usersMap.has(userId)) {
                usersMap.set(userId, {
                    ...uc.user,
                    companies: []
                });
            }
            usersMap.get(userId).companies.push({
                company: uc.company,
                role: uc.role,
                isActive: uc.isActive
            });
        });

        const users = Array.from(usersMap.values());

        res.json({
            success: true,
            message: 'تم جلب المستخدمين بنجاح',
            data: {
                totalUsers: users.length,
                users
            }
        });
    } catch (error) {
        console.error('❌ [OWNER] Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب المستخدمين',
            error: error.message
        });
    }
};

/**
 * Get unified sales report across all owner's companies
 */
const getOwnerSalesReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;
        const prisma = getSharedPrismaClient();

        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();
        if (Number.isNaN(start.getTime())) {
            const fallback = new Date();
            fallback.setDate(fallback.getDate() - 30);
            start.setTime(fallback.getTime());
        }
        if (Number.isNaN(end.getTime())) {
            end.setTime(new Date().getTime());
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const normalizeStatus = (value) => (value || '').toString().trim().toUpperCase();
        const isCompletedStatus = (value) => {
            const s = normalizeStatus(value);
            return s === 'DELIVERED' || s === 'COMPLETED';
        };
        const isCancelledStatus = (value) => {
            const s = normalizeStatus(value);
            return s === 'CANCELLED' || s === 'CANCELED';
        };

        // Get all companies where user is OWNER
        const userCompanies = await prisma.userCompany.findMany({
            where: {
                userId: userId,
                role: 'OWNER',
                isActive: true
            },
            select: { companyId: true }
        });

        const companyIds = userCompanies.map(uc => uc.companyId);

        if (companyIds.length === 0) {
            return res.json({
                success: true,
                message: 'تم جلب تقرير المبيعات بنجاح',
                data: {
                    dateRange: { start, end },
                    overview: {
                        totalCompanies: 0,
                        totalOrders: 0,
                        totalRevenue: 0,
                        totalCompleted: 0,
                        totalCancelled: 0
                    },
                    byCompany: []
                }
            });
        }

        // Get sales data for each company
        const companiesData = await Promise.all(companyIds.map(async (companyId) => {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { id: true, name: true, logo: true }
            });

            const [orders, guestOrders] = await Promise.all([
                prisma.order.findMany({
                    where: {
                        companyId,
                        createdAt: { gte: start, lte: end }
                    },
                    select: {
                        id: true,
                        total: true,
                        status: true,
                        createdAt: true
                    }
                }),
                prisma.guestOrder.findMany({
                    where: {
                        companyId,
                        createdAt: { gte: start, lte: end }
                    },
                    select: {
                        id: true,
                        total: true,
                        finalTotal: true,
                        status: true,
                        createdAt: true
                    }
                })
            ]);

            const totalOrders = orders.length + guestOrders.length;
            const totalRevenue =
                orders.reduce((sum, o) => sum + Number(o.total || 0), 0) +
                guestOrders.reduce((sum, o) => sum + Number(o.finalTotal ?? o.total ?? 0), 0);
            const completedOrders =
                orders.filter(o => isCompletedStatus(o.status)).length +
                guestOrders.filter(o => isCompletedStatus(o.status)).length;
            const cancelledOrders =
                orders.filter(o => isCancelledStatus(o.status)).length +
                guestOrders.filter(o => isCancelledStatus(o.status)).length;

            return {
                company,
                stats: {
                    totalOrders,
                    totalRevenue,
                    completedOrders,
                    cancelledOrders,
                    completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
                }
            };
        }));

        // Calculate totals
        const overview = {
            totalCompanies: companyIds.length,
            totalOrders: companiesData.reduce((sum, c) => sum + c.stats.totalOrders, 0),
            totalRevenue: companiesData.reduce((sum, c) => sum + c.stats.totalRevenue, 0),
            totalCompleted: companiesData.reduce((sum, c) => sum + c.stats.completedOrders, 0),
            totalCancelled: companiesData.reduce((sum, c) => sum + c.stats.cancelledOrders, 0)
        };

        res.json({
            success: true,
            message: 'تم جلب تقرير المبيعات بنجاح',
            data: {
                dateRange: { start, end },
                overview,
                byCompany: companiesData
            }
        });
    } catch (error) {
        console.error('❌ [OWNER] Error fetching sales report:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب تقرير المبيعات',
            error: error.message
        });
    }
};

/**
 * Get unified attendance report across all owner's companies
 */
const getOwnerAttendanceReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;
        const prisma = getSharedPrismaClient();

        // Default to current month if dates not provided
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
        const end = endDate ? new Date(endDate) : new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Get all companies where user is OWNER
        const userCompanies = await prisma.userCompany.findMany({
            where: {
                userId: userId,
                role: 'OWNER',
                isActive: true
            },
            select: { companyId: true }
        });

        const companyIds = userCompanies.map(uc => uc.companyId);

        // 1. Get all employees in these companies with their details
        const employees = await prisma.userCompany.findMany({
            where: {
                companyId: { in: companyIds },
                isActive: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true
                    }
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        logo: true
                    }
                }
            }
        });

        // 2. Get all attendance records for these companies in range
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                companyId: { in: companyIds },
                date: { gte: start, lte: end }
            }
        });

        // 3. Group employees by user (handling same user in multiple companies if needed, 
        // though usually attendance is per company-user pair)
        // We'll group by userId and companyId to keep it distinct
        const employeeStats = employees.map(emp => {
            const userAttendance = attendanceRecords.filter(a =>
                a.userId === emp.userId && a.companyId === emp.companyId
            );

            return {
                user: emp.user,
                company: emp.company,
                stats: {
                    present: userAttendance.filter(a => a.status === 'PRESENT').length,
                    late: userAttendance.filter(a => a.status === 'LATE').length,
                    absent: userAttendance.filter(a => a.status === 'ABSENT').length,
                    onLeave: userAttendance.filter(a => a.status === 'ON_LEAVE').length,
                    totalRecords: userAttendance.length
                }
            };
        });

        // 4. Calculate overall overview
        const overview = {
            totalCompanies: companyIds.length,
            totalEmployees: employees.length,
            totalPresent: attendanceRecords.filter(a => a.status === 'PRESENT').length,
            totalLate: attendanceRecords.filter(a => a.status === 'LATE').length,
            totalAbsent: attendanceRecords.filter(a => a.status === 'ABSENT').length,
            totalOnLeave: attendanceRecords.filter(a => a.status === 'ON_LEAVE').length
        };

        res.json({
            success: true,
            message: 'تم جلب تقرير الحضور بنجاح',
            data: {
                dateRange: { start, end },
                overview,
                byEmployee: employeeStats
            }
        });
    } catch (error) {
        console.error('❌ [OWNER] Error fetching attendance report:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب تقرير الحضور',
            error: error.message
        });
    }
};

/**
 * Get today's attendance report - only employees who checked in
 * تقرير حضور اليوم - الموظفين اللي بصموا فقط
 */
const getOwnerTodayAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const prisma = getSharedPrismaClient();
        const { startDate, endDate } = req.query;

        // Get date range - default to today
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else {
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(end.getDate() + 1);
        }

        // Get all companies where user is OWNER
        const userCompanies = await prisma.userCompany.findMany({
            where: {
                userId: userId,
                role: 'OWNER',
                isActive: true
            },
            select: { companyId: true }
        });

        const companyIds = userCompanies.map(uc => uc.companyId);

        if (companyIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    date: start.toISOString().split('T')[0],
                    totalPresent: 0,
                    totalLate: 0,
                    records: []
                }
            });
        }

        // Fetch attendance records for the range - only employees who checked in
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                companyId: { in: companyIds },
                date: { gte: start, lte: end },
                checkIn: { not: null }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true,
                        employeeNumber: true
                    }
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        logo: true
                    }
                }
            },
            orderBy: [
                { checkIn: 'asc' }
            ]
        });

        // Calculate summary
        const totalPresent = attendanceRecords.length;
        const totalLate = attendanceRecords.filter(a => a.status === 'LATE').length;

        // Format records for response
        const records = attendanceRecords.map(record => {
            // Safe conversion for Prisma Decimal
            const getHours = (val) => {
                if (!val) return null;
                if (typeof val.toNumber === 'function') return val.toNumber();
                if (typeof val === 'object') return parseFloat(val.toString()) || null;
                return parseFloat(val) || null;
            };

            return {
                id: record.id,
                employee: {
                    id: record.user?.id || 'unknown',
                    firstName: record.user?.firstName || 'موظف',
                    lastName: record.user?.lastName || 'غير معروف',
                    email: record.user?.email || '',
                    avatar: record.user?.avatar || null,
                    employeeNumber: record.user?.employeeNumber || null
                },
                company: {
                    id: record.company?.id || 'unknown',
                    name: record.company?.name || 'شركة غير معروفة',
                    logo: record.company?.logo || null
                },
                checkIn: record.checkIn,
                checkOut: record.checkOut,
                workHours: getHours(record.workHours),
                lateMinutes: parseInt(record.lateMinutes) || 0,
                status: record.status
            };
        });

        res.json({
            success: true,
            message: 'تم جلب تقارير الحضور بنجاح',
            data: {
                date: start.toISOString().split('T')[0],
                totalPresent: records.length,
                totalLate: records.filter(r => r.status === 'LATE').length,
                records
            }
        });
    } catch (error) {
        console.error('❌ [OWNER] Error fetching employee attendance:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب تقرير حضور الموظفين',
            error: error.message
        });
    }
}

/**
 * Create a new company and automatically assign current user as OWNER
 * إنشاء شركة جديدة وربط المستخدم الحالي كمالك تلقائياً
 */
const createOwnerCompany = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            email,
            phone,
            website,
            address,
            plan = 'BASIC',
            currency = 'EGP',
            timezone = 'Africa/Cairo'
        } = req.body;

        const prisma = getSharedPrismaClient();

        // Validation
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'اسم الشركة والبريد الإلكتروني مطلوبان'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني غير صحيح'
            });
        }

        // Check if email already exists
        const existingCompany = await prisma.company.findFirst({
            where: { email }
        });

        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مستخدم بالفعل'
            });
        }

        // Create company and link user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create new company
            const newCompany = await tx.company.create({
                data: {
                    name,
                    email,
                    phone: phone || null,
                    website: website || null,
                    address: address || null,
                    plan,
                    currency,
                    timezone,
                    isActive: true,
                    useCentralKeys: true,
                    sidebarLayout: 'three-tier',
                    settings: JSON.stringify({
                        lastSystemChange: new Date().toISOString(),
                        systemChangeBy: userId,
                        createdBy: userId
                    })
                }
            });

            // 2. Create UserCompany record - link user as OWNER
            await tx.userCompany.create({
                data: {
                    userId: userId,
                    companyId: newCompany.id,
                    role: 'OWNER',
                    isActive: true,
                    isDefault: false,
                    joinedAt: new Date()
                }
            });

            return newCompany;
        });

        console.log(`✅ [OWNER] Company created successfully: ${result.name} (${result.id})`);
        console.log(`✅ [OWNER] User ${userId} assigned as OWNER`);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الشركة بنجاح',
            data: {
                id: result.id,
                name: result.name,
                email: result.email,
                phone: result.phone,
                website: result.website,
                address: result.address,
                plan: result.plan,
                currency: result.currency,
                timezone: result.timezone,
                logo: result.logo,
                isActive: result.isActive,
                createdAt: result.createdAt
            }
        });

    } catch (error) {
        console.error('❌ [OWNER] Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء الشركة',
            error: error.message
        });
    }
};

/**
 * Get detailed orders for a specific company
 */
const getCompanyOrdersDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { companyId } = req.params;
        const { startDate, endDate, status, page = 1, limit = 20 } = req.query;
        const prisma = getSharedPrismaClient();

        // Verify user has access to this company
        const userCompany = await prisma.userCompany.findFirst({
            where: {
                userId: userId,
                companyId: companyId,
                role: 'OWNER',
                isActive: true
            }
        });

        // Also allow SUPER_ADMIN
        if (!userCompany && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية الوصول لهذه الشركة'
            });
        }

        // Get company info
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                logo: true
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Build date filter
        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate);
            dateFilter.gte.setHours(0, 0, 0, 0);
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate);
            dateFilter.lte.setHours(23, 59, 59, 999);
        }

        // Build where clause for GuestOrder (main orders table)
        const whereClause = {
            companyId: companyId,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            ...(status && status !== 'all' && { status: status.toLowerCase() })
        };

        // Get total count for pagination from GuestOrder
        const totalOrders = await prisma.guestOrder.count({ where: whereClause });

        // Get orders from GuestOrder table
        const orders = await prisma.guestOrder.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            select: {
                id: true,
                orderNumber: true,
                status: true,
                total: true,
                finalTotal: true,
                shippingCost: true,
                discountAmount: true,
                createdAt: true,
                guestName: true,
                guestPhone: true,
                guestEmail: true,
                shippingAddress: true,
                items: true,
                paymentMethod: true
            }
        });

        // Format orders - parse items from JSON string
        const formattedOrders = orders.map(order => {
            let parsedItems = [];
            try {
                parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
            } catch (e) {
                parsedItems = [];
            }

            return {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                total: Number(order.finalTotal || order.total || 0),
                subtotal: Number(order.total || 0),
                shippingCost: Number(order.shippingCost || 0),
                discount: Number(order.discountAmount || 0),
                createdAt: order.createdAt,
                paymentMethod: order.paymentMethod,
                customer: {
                    name: order.guestName || 'غير محدد',
                    phone: order.guestPhone || '',
                    email: order.guestEmail || '',
                    address: order.shippingAddress || ''
                },
                itemsCount: parsedItems.length,
                items: parsedItems.map((item, idx) => ({
                    id: `${order.id}-${idx}`,
                    productName: item.name || item.productName || 'منتج',
                    productImage: item.image || item.productImage || null,
                    quantity: item.quantity || 1,
                    price: Number(item.price || 0),
                    total: Number((item.price || 0) * (item.quantity || 1)),
                    sku: item.sku || null
                }))
            };
        });

        // Get stats from GuestOrder
        const stats = await prisma.guestOrder.groupBy({
            by: ['status'],
            where: {
                companyId: companyId,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            },
            _count: { id: true },
            _sum: { finalTotal: true }
        });

        const statsMap = {
            totalOrders: 0,
            totalRevenue: 0,
            completedOrders: 0,
            pendingOrders: 0,
            cancelledOrders: 0
        };

        stats.forEach(s => {
            statsMap.totalOrders += s._count.id;
            statsMap.totalRevenue += Number(s._sum.finalTotal || 0);
            const statusLower = (s.status || '').toLowerCase();
            if (statusLower === 'delivered' || statusLower === 'completed') {
                statsMap.completedOrders += s._count.id;
            } else if (statusLower === 'pending' || statusLower === 'confirmed' || statusLower === 'processing') {
                statsMap.pendingOrders += s._count.id;
            } else if (statusLower === 'cancelled' || statusLower === 'canceled') {
                statsMap.cancelledOrders += s._count.id;
            }
        });

        res.json({
            success: true,
            data: {
                company,
                orders: formattedOrders,
                stats: statsMap,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalOrders,
                    totalPages: Math.ceil(totalOrders / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('❌ [OWNER] Error fetching company orders:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الطلبات',
            error: error.message
        });
    }
};

module.exports = {
    getOwnerCompanies,
    getOwnerDashboard,
    getOwnerUsers,
    getOwnerSalesReport,
    getOwnerAttendanceReport,
    getOwnerTodayAttendance,
    createOwnerCompany,
    getCompanyOrdersDetails
};
