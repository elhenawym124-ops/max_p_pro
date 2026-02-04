const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const planLimitsService = require('../services/planLimitsService');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const getCurrentCompany = async (req, res) => {
    try {
        console.log('📋 [GET-CURRENT-COMPANY] Request received');
        console.log('📋 [GET-CURRENT-COMPANY] req.user:', req.user);

        // Get company from authenticated user (respecting Super Admin context if set)
        const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

        if (!companyId) {
            console.log('❌ [GET-CURRENT-COMPANY] No companyId found in context');
            return res.status(403).json({
                success: false,
                error: 'Company context not found'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            console.log('❌ [GET-CURRENT-COMPANY] Company not found:', companyId);
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }

        console.log('✅ [GET-CURRENT-COMPANY] Company found:', company.name);

        // Parse settings
        let settings = {};
        try {
            settings = company.settings ? JSON.parse(company.settings) : {};
        } catch (error) {
            settings = {};
        }

        // Default settings
        const defaultSettings = {
            currency: 'EGP',
            currencySymbol: 'جنيه',
            language: 'ar',
            timezone: company.timezone || 'Africa/Cairo',
            dateFormat: 'DD/MM/YYYY',
            numberFormat: 'ar-EG'
        };

        const finalSettings = { ...defaultSettings, ...settings };

        res.json({
            success: true,
            data: {
                id: company.id,
                name: company.name,
                email: company.email,
                phone: company.phone,
                address: company.address,
                timezone: company.timezone,
                settings: finalSettings,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching current company:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch company data'
        });
    }
};

const REMOVEDDangerousFallbackEndpoint = async (req, res) => {
    // رفض الطلب - لا يوجد fallback
    console.error(`❌ [SECURITY] Attempted access to dangerous fallback endpoint: /api/v1/companies/1`);

    return res.status(410).json({
        success: false,
        error: 'This endpoint has been removed for security reasons',
        code: 'ENDPOINT_REMOVED',
        message: 'Please use proper company identification'
    });
};

const companyUsageEndpoint = async (req, res) => {
    try {
        const companyId = req.params.id;

        // Get actual product count from database
        let actualProductCount = 6;
        try {
            actualProductCount = await getSharedPrismaClient().product.count({
                where: { isActive: true }
            });
        } catch (error) {
            //console.log('Could not fetch product count, using default');
        }

        // Ensure all values are numbers and safe
        const safeProductCount = Number(actualProductCount) || 0;
        const productPercentage = Number(((safeProductCount / 1000) * 100).toFixed(1)) || 0;
        const storageUsage = 1.2;
        const storageLimit = 10;
        const storagePercentage = Number(((storageUsage / storageLimit) * 100).toFixed(1)) || 0;
        const apiUsage = 150;
        const apiLimit = 10000;
        const apiPercentage = Number(((apiUsage / apiLimit) * 100).toFixed(1)) || 0;

        // Create data structure that exactly matches frontend UsageStat interface
        const usageData = {
            // Products usage stat
            products: {
                usage: safeProductCount,           // number - what frontend expects
                limit: 1000,                      // number
                percentage: productPercentage,     // number
                unlimited: false,                 // boolean
                warning: productPercentage > 80,  // boolean
                exceeded: productPercentage > 100 // boolean
            },

            // Orders usage stat
            orders: {
                usage: 0,                         // number
                limit: 5000,                     // number
                percentage: 0.0,                 // number
                unlimited: false,                // boolean
                warning: false,                  // boolean
                exceeded: false                  // boolean
            },

            // Storage usage stat
            storage: {
                usage: storageUsage,             // number (in GB)
                limit: storageLimit,             // number (in GB)
                percentage: storagePercentage,   // number
                unlimited: false,                // boolean
                warning: storagePercentage > 80, // boolean
                exceeded: storagePercentage > 100 // boolean
            },

            // API calls usage stat
            apiCalls: {
                usage: apiUsage,                 // number
                limit: apiLimit,                 // number
                percentage: apiPercentage,       // number
                unlimited: false,                // boolean
                warning: apiPercentage > 80,     // boolean
                exceeded: apiPercentage > 100    // boolean
            }
        };

        res.json({
            success: true,
            data: usageData
        });

    } catch (error) {
        console.error('Error fetching company usage:', error);

        // Return ultra-safe fallback data with same structure
        res.json({
            success: true,
            data: {
                products: { usage: 0, limit: 1000, percentage: 0.0, unlimited: false, warning: false, exceeded: false },
                orders: { usage: 0, limit: 5000, percentage: 0.0, unlimited: false, warning: false, exceeded: false },
                storage: { usage: 0, limit: 10, percentage: 0.0, unlimited: false, warning: false, exceeded: false },
                apiCalls: { usage: 0, limit: 10000, percentage: 0.0, unlimited: false, warning: false, exceeded: false }
            }
        });
    }
};

const mockEndpoint = async (req, res) => {
    try {
        // Get real product count
        let productCount = 6;
        try {
            productCount = await getSharedPrismaClient().product.count({ where: { isActive: true } });
        } catch (error) {
            //console.log('Using default product count');
        }

        // Create data structure that exactly matches what frontend expects
        const mockData = {
            success: true,
            data: {
                currentPlan: 'basic',
                planLimits: {
                    products: 1000,
                    orders: 5000,
                    storage: '10GB',
                    apiCalls: 10000
                },
                currentUsage: {
                    products: productCount,
                    orders: 0,
                    storage: '1.2GB',
                    apiCalls: 150
                },
                usagePercentage: {
                    products: Number(((productCount / 1000) * 100).toFixed(1)),
                    orders: 0.0,
                    storage: 12.0,
                    apiCalls: 1.5
                },
                // Add the exact structure frontend expects for the map function
                usageMetrics: [
                    {
                        name: 'المنتجات',
                        current: productCount,
                        limit: 1000,
                        percentage: Number(((productCount / 1000) * 100).toFixed(1)),
                        unit: 'منتج',
                        color: '#3B82F6',
                        icon: '📦'
                    },
                    {
                        name: 'الطلبات',
                        current: 0,
                        limit: 5000,
                        percentage: 0.0,
                        unit: 'طلب',
                        color: '#10B981',
                        icon: '🛒'
                    },
                    {
                        name: 'التخزين',
                        current: 1.2,
                        limit: 10,
                        percentage: 12.0,
                        unit: 'جيجا',
                        color: '#F59E0B',
                        icon: '💾'
                    },
                    {
                        name: 'استدعاءات API',
                        current: 150,
                        limit: 10000,
                        percentage: 1.5,
                        unit: 'استدعاء',
                        color: '#8B5CF6',
                        icon: '🔗'
                    }
                ]
            }
        };

        res.json(mockData);

    } catch (error) {
        console.error('Error in usage mock:', error);

        // Return safe fallback
        res.json({
            success: true,
            data: {
                currentPlan: 'basic',
                planLimits: { products: 1000, orders: 5000, storage: '10GB', apiCalls: 10000 },
                currentUsage: { products: 0, orders: 0, storage: '0GB', apiCalls: 0 },
                usagePercentage: { products: 0.0, orders: 0.0, storage: 0.0, apiCalls: 0.0 },
                usageMetrics: [
                    { name: 'المنتجات', current: 0, limit: 1000, percentage: 0.0, unit: 'منتج', color: '#3B82F6', icon: '📦' },
                    { name: 'الطلبات', current: 0, limit: 5000, percentage: 0.0, unit: 'طلب', color: '#10B981', icon: '🛒' },
                    { name: 'التخزين', current: 0, limit: 10, percentage: 0.0, unit: 'جيجا', color: '#F59E0B', icon: '💾' },
                    { name: 'استدعاءات API', current: 0, limit: 10000, percentage: 0.0, unit: 'استدعاء', color: '#8B5CF6', icon: '🔗' }
                ]
            }
        });
    }
};

const safeUsageEndpoint = async (req, res) => {
    try {
        // Get actual counts from database
        let productCount = 0;
        let orderCount = 0;

        try {
            productCount = await getSharedPrismaClient().product.count({ where: { isActive: true } });
            // orderCount = await getSharedPrismaClient().order.count(); // Uncomment when order model exists
        } catch (error) {
            //console.log('Could not fetch counts, using defaults');
        }

        // Safe usage data with guaranteed numeric values
        const safeUsageData = {
            currentPlan: 'basic',
            planName: 'الخطة الأساسية',
            planLimits: {
                products: 1000,
                orders: 5000,
                storage: 10, // GB as number
                apiCalls: 10000
            },
            currentUsage: {
                products: Number(productCount) || 0,
                orders: Number(orderCount) || 0,
                storage: 1.2, // GB as number
                apiCalls: 150
            },
            usagePercentage: {
                products: Number(((Number(productCount) || 0) / 1000 * 100).toFixed(1)) || 0,
                orders: Number(((Number(orderCount) || 0) / 5000 * 100).toFixed(1)) || 0,
                storage: 12.0,
                apiCalls: 1.5
            },
            // Detailed metrics for charts/tables
            detailedMetrics: [
                {
                    id: 'products',
                    name: 'المنتجات',
                    nameEn: 'Products',
                    current: Number(productCount) || 0,
                    limit: 1000,
                    percentage: Number(((Number(productCount) || 0) / 1000 * 100).toFixed(1)) || 0,
                    unit: 'منتج',
                    unitEn: 'products',
                    color: '#3B82F6',
                    icon: '📦'
                },
                {
                    id: 'orders',
                    name: 'الطلبات',
                    nameEn: 'Orders',
                    current: Number(orderCount) || 0,
                    limit: 5000,
                    percentage: Number(((Number(orderCount) || 0) / 5000 * 100).toFixed(1)) || 0,
                    unit: 'طلب',
                    unitEn: 'orders',
                    color: '#10B981',
                    icon: '🛒'
                },
                {
                    id: 'storage',
                    name: 'التخزين',
                    nameEn: 'Storage',
                    current: 1.2,
                    limit: 10,
                    percentage: 12.0,
                    unit: 'جيجا',
                    unitEn: 'GB',
                    color: '#F59E0B',
                    icon: '💾'
                },
                {
                    id: 'apiCalls',
                    name: 'استدعاءات API',
                    nameEn: 'API Calls',
                    current: 150,
                    limit: 10000,
                    percentage: 1.5,
                    unit: 'استدعاء',
                    unitEn: 'calls',
                    color: '#8B5CF6',
                    icon: '🔗'
                }
            ]
        };

        res.json({
            success: true,
            data: safeUsageData
        });

    } catch (error) {
        console.error('Error fetching safe usage data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch usage data'
        });
    }
};

const companyPlansEndpoint = async (req, res) => {
    try {
        const plans = [
            {
                id: 'basic',
                name: 'الخطة الأساسية',
                price: 0,
                currency: 'EGP',
                features: [
                    'حتى 1000 منتج',
                    'حتى 5000 طلب شهرياً',
                    '10 جيجا تخزين',
                    'دعم فني أساسي'
                ],
                limits: {
                    products: 1000,
                    orders: 5000,
                    storage: '10GB',
                    apiCalls: 10000
                }
            },
            {
                id: 'pro',
                name: 'الخطة الاحترافية',
                price: 299,
                currency: 'EGP',
                features: [
                    'منتجات غير محدودة',
                    'طلبات غير محدودة',
                    '100 جيجا تخزين',
                    'دعم فني متقدم',
                    'تقارير مفصلة'
                ],
                limits: {
                    products: -1, // unlimited
                    orders: -1,
                    storage: '100GB',
                    apiCalls: 100000
                }
            }
        ];

        res.json({
            success: true,
            data: plans
        });

    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch plans'
        });
    }
};

const getCompanyInfoEndpoint = async (req, res) => {
    try {
        const companyId = req.params.id;

        // التحقق من الصلاحية
        const userCompanyId = req.user?.effectiveCompanyId || req.user?.companyId;
        const userRole = req.user?.role;

        if (!userCompanyId && userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول'
            });
        }

        // السماح للـ super admin بالوصول لجميع الشركات
        if (userRole !== 'SUPER_ADMIN' && companyId !== userCompanyId) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول لهذه الشركة'
            });
        }

        // Get company from database
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }

        // Parse settings
        let settings = {};
        try {
            settings = company.settings ? JSON.parse(company.settings) : {};
        } catch (error) {
            settings = {};
        }

        // Default settings with currency
        const defaultSettings = {
            currency: 'EGP',
            currencySymbol: 'ج.م',
            language: 'ar',
            timezone: company.timezone || 'Africa/Cairo',
            dateFormat: 'DD/MM/YYYY',
            numberFormat: 'ar-EG'
        };

        const finalSettings = { ...defaultSettings, ...settings };

        res.json({
            success: true,
            data: {
                id: company.id,
                name: company.name,
                email: company.email,
                phone: company.phone,
                address: company.address,
                timezone: company.timezone,
                settings: finalSettings,
                currency: finalSettings.currency, // Add currency at root level for compatibility
                createdAt: company.createdAt,
                updatedAt: company.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch company data'
        });
    }
};

const updateCompanyCurrency = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { currency } = req.body;

        //console.log(`💰 Updating currency for company ${companyId} to ${currency}`);

        // Validate currency code
        const validCurrencies = ['EGP', 'USD', 'EUR', 'SAR', 'AED'];
        if (!validCurrencies.includes(currency)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid currency code'
            });
        }

        // Get current company
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }

        // Parse current settings
        let settings = {};
        try {
            settings = company.settings ? JSON.parse(company.settings) : {};
        } catch (error) {
            settings = {};
        }

        // Update currency in settings
        settings.currency = currency;

        // Update company in database
        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: {
                settings: JSON.stringify(settings)
            }
        });

        //console.log(`✅ Currency updated successfully for company ${companyId}`);

        res.json({
            success: true,
            message: 'Currency updated successfully',
            data: {
                companyId: companyId,
                currency: currency
            }
        });

    } catch (error) {
        console.error('❌ Error updating currency:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update currency'
        });
    }
};

const getAllCompanies = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 25,
            search = '',
            plan = '',
            isActive = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // بناء شروط البحث
        const where = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (plan) where.plan = plan;
        if (isActive !== '') where.isActive = isActive === 'true';

        // حساب التصفح
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(parseInt(limit), 100);
        const skip = (pageNum - 1) * limitNum;

        // ترتيب النتائج
        const orderBy = {};
        if (sortBy === 'name') {
            orderBy.name = sortOrder;
        } else if (sortBy === 'plan') {
            orderBy.plan = sortOrder;
        } else if (sortBy === 'createdAt') {
            orderBy.createdAt = sortOrder;
        } else {
            orderBy.createdAt = 'desc';
        }

        // جلب الشركات مع التصفح
        const [companies, totalCount] = await Promise.all([
            getSharedPrismaClient().company.findMany({
                where,
                orderBy,
                skip,
                take: limitNum,
                include: {
                    _count: {
                        select: {
                            User: true,
                            customers: true,
                            products: true,
                            orders: true,
                            conversations: true
                        }
                    }
                }
            }),
            getSharedPrismaClient().company.count({ where })
        ]);

        // حساب معلومات التصفح
        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNext = pageNum < totalPages;
        const hasPrev = pageNum > 1;

        res.json({
            success: true,
            message: 'تم جلب الشركات بنجاح',
            data: {
                companies,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    totalPages,
                    hasNext,
                    hasPrev
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الشركات',
            error: error.message
        });
    }
};

const getCompanyDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // التحقق من الصلاحية - المستخدم يمكنه فقط الوصول لشركته أو إذا كان super admin
        const userCompanyId = req.user?.effectiveCompanyId || req.user?.companyId;
        const userRole = req.user?.role;

        if (!userCompanyId && userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        // السماح للـ super admin بالوصول لجميع الشركات
        if (userRole !== 'SUPER_ADMIN' && id !== userCompanyId) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول لهذه الشركة'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        isActive: true,
                        createdAt: true
                    }
                },
                aiSettings: {
                    select: {
                        useModernAgent: true
                    }
                },
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        products: true,
                        orders: true,
                        conversations: true,
                    }
                }
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        res.json({
            success: true,
            message: 'تم جلب تفاصيل الشركة بنجاح',
            data: company
        });

    } catch (error) {
        console.error('❌ Error fetching company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب تفاصيل الشركة',
            error: error.message
        });
    }
};

const createNewCompany = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            website,
            address,
            plan = 'BASIC',
            currency = 'EGP',
            isActive = true
        } = req.body;

        // Validation
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'اسم الشركة والبريد الإلكتروني مطلوبان'
            });
        }

        // Check if email already exists
        const existingCompany = await getSharedPrismaClient().company.findFirst({
            where: { email }
        });

        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مستخدم بالفعل'
            });
        }

        // Create new company
        const newCompany = await getSharedPrismaClient().company.create({
            data: {
                name,
                email,
                phone: phone || null,
                website: website || null,
                address: address || null,
                plan,
                currency,
                isActive,
                useCentralKeys: true, // ✅ تفعيل المفاتيح المركزية افتراضياً
                sidebarLayout: 'three-tier', // ✅ الوضع الحديث كافتراضي
                settings: JSON.stringify({
                    lastSystemChange: new Date().toISOString(),
                    systemChangeBy: 'admin'
                })
            },
            include: {
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        products: true,
                        orders: true,
                        conversations: true
                    }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الشركة بنجاح',
            data: newCompany
        });

    } catch (error) {
        console.error('❌ Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء الشركة',
            error: error.message
        });
    }
};

const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            phone,
            website,
            address,
            plan,
            currency,
            isActive,
            useModernAgent,
            sidebarLayout,
            customDomain,
            timezone
        } = req.body;

        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if email is being changed and already exists
        if (email && email !== existingCompany.email) {
            const emailExists = await getSharedPrismaClient().company.findFirst({
                where: {
                    email,
                    id: { not: id }
                }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'البريد الإلكتروني مستخدم بالفعل'
                });
            }
        }

        // Check if customDomain is being changed and already exists
        if (customDomain !== undefined && customDomain !== existingCompany.customDomain) {
            if (customDomain) {
                // Validate domain format (basic validation)
                const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
                if (!domainRegex.test(customDomain)) {
                    return res.status(400).json({
                        success: false,
                        message: 'صيغة الدومين غير صحيحة. يجب أن يكون مثل: example.com'
                    });
                }

                // Check if domain already exists
                const domainExists = await getSharedPrismaClient().company.findFirst({
                    where: {
                        customDomain,
                        id: { not: id }
                    }
                });

                if (domainExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'هذا الدومين مستخدم بالفعل من قبل شركة أخرى'
                    });
                }
            }
        }

        // Update company
        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone !== undefined && { phone }),
                ...(website !== undefined && { website }),
                ...(address !== undefined && { address }),
                ...(plan && { plan }),
                ...(currency && { currency }),
                ...(isActive !== undefined && { isActive }),
                ...(useModernAgent !== undefined && {
                    aiSettings: {
                        upsert: {
                            create: { useModernAgent },
                            update: { useModernAgent }
                        }
                    }
                }),
                ...(sidebarLayout && { sidebarLayout }),
                ...(customDomain !== undefined && { customDomain: customDomain || null }),
                ...(timezone && { timezone })
            },
            include: {
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        products: true,
                        orders: true,
                        conversations: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: 'تم تحديث الشركة بنجاح',
            data: updatedCompany
        });

    } catch (error) {
        console.error('❌ Error updating company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الشركة',
            error: error.message
        });
    }
};

const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        products: true,
                        orders: true,
                        conversations: true
                    }
                }
            }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if company has data
        const hasData = existingCompany._count.users > 0 ||
            existingCompany._count.customers > 0 ||
            existingCompany._count.products > 0 ||
            existingCompany._count.orders > 0 ||
            existingCompany._count.conversations > 0;

        if (hasData) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف الشركة لأنها تحتوي على بيانات. يمكنك إلغاء تفعيلها بدلاً من ذلك.'
            });
        }

        // Delete company
        await getSharedPrismaClient().company.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'تم حذف الشركة بنجاح'
        });

    } catch (error) {
        console.error('❌ Error deleting company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف الشركة',
            error: error.message
        });
    }
};

// ==================== COMPANY USERS MANAGEMENT ====================

const getCompanyUsers = async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            page = 1,
            limit = 25,
            search = '',
            role = '',
            isActive = '',
            employeeStatus = '', // ✅ Add Employee Status filter
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        console.log(`👥 [GET-USERS] Fetching users for company: ${companyId}`);
        console.log(`📊 [GET-USERS] Filters - search: "${search}", role: "${role}", isActive: "${isActive}", employeeStatus: "${employeeStatus}"`);

        // حساب التصفح
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(parseInt(limit), 100);
        const skip = (pageNum - 1) * limitNum;

        // Get users from UserCompany table (multi-company support)
        const userCompanyWhere = {
            companyId: companyId
        };

        // Add role filter if specified
        if (role) {
            userCompanyWhere.role = role;
        }

        // Add isActive filter if specified
        if (isActive !== '') {
            userCompanyWhere.isActive = isActive === 'true';
        }

        // Build user search filter
        const userSearchWhere = {};
        if (search) {
            userSearchWhere.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } }
            ];
        }

        // Note: Employee Status filter will be applied after fetching data
        // to handle the NO_EMPLOYEE case properly with include

        // ✅ FIX: Fetch users through UserCompany relationship with Employee data
        const [userCompanies, totalCount] = await Promise.all([
            getSharedPrismaClient().userCompany.findMany({
                where: {
                    ...userCompanyWhere,
                    user: userSearchWhere
                },
                skip,
                take: limitNum,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            avatar: true,
                            isEmailVerified: true,
                            lastLoginAt: true,
                            createdAt: true,
                            updatedAt: true,
                            // ✅ Include Employee fields directly from User
                            employeeNumber: true,
                            contractType: true,
                            hireDate: true,
                            baseSalary: true,
                            departmentId: true,
                            positionId: true,
                            departmentRelation: {
                                select: {
                                    id: true,
                                    name: true,
                                    color: true
                                }
                            },
                            positionRelation: {
                                select: {
                                    id: true,
                                    title: true,
                                    level: true
                                }
                            }
                        }
                    }
                },
                orderBy: sortBy === 'createdAt' ? { createdAt: sortOrder } :
                    sortBy === 'role' ? { role: sortOrder } :
                        { user: { [sortBy]: sortOrder } }
            }),
            getSharedPrismaClient().userCompany.count({
                where: {
                    ...userCompanyWhere,
                    user: userSearchWhere
                }
            })
        ]);

        // ✅ Filter by employee status and transform data
        let filteredUserCompanies = userCompanies;
        let actualTotalCount = totalCount;

        // Apply employee status filter in memory (after fetching with include)
        if (employeeStatus) {
            if (employeeStatus === 'NO_EMPLOYEE') {
                // Filter for users without Employee data (no employeeNumber)
                filteredUserCompanies = userCompanies.filter(uc => !uc.user.employeeNumber);
                // Recalculate total count for NO_EMPLOYEE case
                const countQuery = {
                    ...userCompanyWhere,
                    user: {
                        ...userSearchWhere,
                        employeeNumber: null
                    }
                };
                actualTotalCount = await getSharedPrismaClient().userCompany.count({ where: countQuery });
            } else {
                // Filter for users with Employee data and specific contractType
                // Note: status is not in User model, so we filter by contractType or isActive
                filteredUserCompanies = userCompanies.filter(uc => {
                    if (!uc.user.employeeNumber) return false;
                    if (employeeStatus === 'ACTIVE') {
                        return uc.user.isActive === true;
                    } else if (employeeStatus === 'INACTIVE') {
                        return uc.user.isActive === false;
                    } else if (employeeStatus && uc.user.contractType) {
                        return uc.user.contractType === employeeStatus;
                    }
                    return true;
                });
                // Recalculate total count
                const countQuery = {
                    ...userCompanyWhere,
                    user: {
                        ...userSearchWhere,
                        employeeNumber: { not: null },
                        ...(employeeStatus === 'ACTIVE' ? { isActive: true } :
                            employeeStatus === 'INACTIVE' ? { isActive: false } :
                                employeeStatus ? { contractType: employeeStatus } : {})
                    }
                };
                try {
                    actualTotalCount = await getSharedPrismaClient().userCompany.count({ where: countQuery });
                } catch (countError) {
                    console.warn('⚠️ [GET-USERS] Error counting with employee filter, using filtered count:', countError.message);
                    actualTotalCount = filteredUserCompanies.length;
                }
            }
        }

        console.log(`✅ [GET-USERS] Found ${filteredUserCompanies.length} users (total: ${actualTotalCount})`);

        // ✅ FIX: Transform the data to include Employee (HR) information
        const users = filteredUserCompanies.map(uc => ({
            id: uc.user.id,
            firstName: uc.user.firstName,
            lastName: uc.user.lastName,
            email: uc.user.email,
            phone: uc.user.phone,
            avatar: uc.user.avatar,
            role: uc.role, // Role from UserCompany table
            isActive: uc.isActive, // isActive from UserCompany table
            isEmailVerified: uc.user.isEmailVerified,
            lastLoginAt: uc.user.lastLoginAt,
            createdAt: uc.user.createdAt,
            updatedAt: uc.user.updatedAt,
            // ✅ Include Employee (HR) data from User fields
            employee: uc.user.employeeNumber ? {
                id: uc.user.id, // Use user.id as employee id
                employeeNumber: uc.user.employeeNumber,
                status: uc.user.isActive ? 'ACTIVE' : 'INACTIVE', // Map isActive to status
                contractType: uc.user.contractType,
                hireDate: uc.user.hireDate,
                department: uc.user.departmentRelation,
                position: uc.user.positionRelation
            } : null
        }));

        // حساب معلومات التصفح (استخدام actualTotalCount بعد الفلترة)
        const totalPages = Math.ceil(actualTotalCount / limitNum);
        const hasNext = pageNum < totalPages;
        const hasPrev = pageNum > 1;

        res.json({
            success: true,
            message: 'تم جلب المستخدمين بنجاح',
            data: {
                users,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: actualTotalCount,
                    totalPages,
                    hasNext,
                    hasPrev
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching company users:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب المستخدمين',
            error: error.message
        });
    }
};

const getSingleUser = async (req, res) => {
    console.log(`🔍 [GET-SINGLE-USER] ========== REQUEST RECEIVED ==========`);
    console.log(`🔍 [GET-SINGLE-USER] Full URL: ${req.originalUrl}`);
    console.log(`🔍 [GET-SINGLE-USER] Method: ${req.method}`);
    console.log(`🔍 [GET-SINGLE-USER] Params:`, req.params);
    console.log(`🔍 [GET-SINGLE-USER] User from token:`, req.user ? { id: req.user.id, email: req.user.email, companyId: req.user.companyId } : 'No user');

    try {
        const { companyId, userId } = req.params;

        console.log(`👤 [GET-USER] Fetching user ${userId} for company: ${companyId}`);

        // ✅ FIX: Get user from UserCompany table with Employee data
        const userCompany = await getSharedPrismaClient().userCompany.findFirst({
            where: {
                companyId: companyId,
                userId: userId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        isEmailVerified: true,
                        lastLoginAt: true,
                        createdAt: true,
                        updatedAt: true,
                        // ✅ Include Employee fields directly from User
                        employeeNumber: true,
                        contractType: true,
                        hireDate: true,
                        baseSalary: true,
                        departmentId: true,
                        positionId: true,
                        departmentRelation: {
                            select: {
                                id: true,
                                name: true,
                                color: true
                            }
                        },
                        positionRelation: {
                            select: {
                                id: true,
                                title: true,
                                level: true
                            }
                        }
                    }
                }
            }
        });

        if (!userCompany) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود في هذه الشركة'
            });
        }

        console.log(`✅ [GET-USER] User found: ${userCompany.user.email}`);

        // ✅ FIX: Transform the data to include Employee (HR) information
        const user = {
            id: userCompany.user.id,
            firstName: userCompany.user.firstName,
            lastName: userCompany.user.lastName,
            email: userCompany.user.email,
            phone: userCompany.user.phone,
            avatar: userCompany.user.avatar,
            role: userCompany.role,
            isActive: userCompany.isActive,
            isEmailVerified: userCompany.user.isEmailVerified,
            lastLoginAt: userCompany.user.lastLoginAt,
            createdAt: userCompany.user.createdAt,
            updatedAt: userCompany.user.updatedAt,
            // ✅ Include Employee (HR) data from User fields
            employee: userCompany.user.employeeNumber ? {
                id: userCompany.user.id, // Use user.id as employee id
                employeeNumber: userCompany.user.employeeNumber,
                status: userCompany.user.isActive ? 'ACTIVE' : 'INACTIVE', // Map isActive to status
                contractType: userCompany.user.contractType,
                hireDate: userCompany.user.hireDate,
                department: userCompany.user.departmentRelation,
                position: userCompany.user.positionRelation
            } : null
        };

        res.json({
            success: true,
            message: 'تم جلب المستخدم بنجاح',
            data: user
        });

    } catch (error) {
        console.error('❌ Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب المستخدم',
            error: error.message
        });
    }
};


const createnewUserForCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            firstName,
            lastName,
            email,
            password,
            phone,
            role = 'AGENT',
            isActive = true
        } = req.body;

        console.log(`👤 [CREATE-USER] Request to create user for company: ${companyId}`);
        console.log(`📧 [CREATE-USER] Email: ${email}, Role: ${role}`);
        console.log(`🔐 [CREATE-USER] Requester: ${req.user?.email}, Role: ${req.user?.role}`);

        // Validation
        if (!firstName || !lastName || !email || !password) {
            console.log(`❌ [CREATE-USER] Validation failed - missing required fields`);
            return res.status(400).json({
                success: false,
                message: 'الاسم الأول والأخير والبريد الإلكتروني وكلمة المرور مطلوبة'
            });
        }

        // Check user limit before creating
        const limitCheck = await planLimitsService.checkLimits(companyId, 'users', 1);
        if (!limitCheck.allowed) {
            console.log(`❌ [CREATE-USER] User limit exceeded for company: ${companyId}`);
            return res.status(400).json({
                success: false,
                message: 'تم تجاوز حد المستخدمين المسموح به في خطتك الحالية',
                error: 'LIMIT_EXCEEDED',
                details: {
                    current: limitCheck.current,
                    limit: limitCheck.limit,
                    plan: (await planLimitsService.getCurrentUsage(companyId)).plan
                },
                upgradeSuggestions: planLimitsService.getUpgradeSuggestions(
                    (await planLimitsService.getCurrentUsage(companyId)).plan
                )
            });
        }

        // Check if company exists
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if email already exists
        const existingUser = await getSharedPrismaClient().user.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            // المستخدم موجود - نتحقق هل هو موجود في هذه الشركة
            console.log(`📧 [CREATE-USER] User exists with email: ${email}, checking company membership...`);

            // Check if user is already in this company (via main companyId or UserCompany)
            const isInCompanyDirectly = existingUser.companyId === companyId;

            const existingMembership = await getSharedPrismaClient().userCompany.findUnique({
                where: {
                    userId_companyId: {
                        userId: existingUser.id,
                        companyId: companyId
                    }
                }
            });

            if (isInCompanyDirectly || existingMembership) {
                // المستخدم موجود بالفعل في هذه الشركة
                console.log(`❌ [CREATE-USER] User already exists in this company`);
                return res.status(400).json({
                    success: false,
                    message: 'هذا المستخدم موجود بالفعل في هذه الشركة'
                });
            }

            // إضافة المستخدم الموجود إلى هذه الشركة
            console.log(`✅ [CREATE-USER] Adding existing user to company via UserCompany...`);

            await getSharedPrismaClient().userCompany.create({
                data: {
                    userId: existingUser.id,
                    companyId: companyId,
                    role: role,
                    isActive: isActive,
                    isDefault: false
                }
            });

            console.log(`✅ [CREATE-USER] Existing user ${existingUser.email} added to company ${companyId}`);

            return res.status(201).json({
                success: true,
                message: 'تم إضافة المستخدم الموجود إلى الشركة بنجاح',
                data: {
                    id: existingUser.id,
                    firstName: existingUser.firstName,
                    lastName: existingUser.lastName,
                    email: existingUser.email,
                    phone: existingUser.phone,
                    role: role,
                    isActive: isActive,
                    isExistingUser: true, // علامة أنه مستخدم موجود تم إضافته
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        const prisma = getSharedPrismaClient();

        // ✅ Use User table only - Employee fields stored in User table
        const result = await prisma.$transaction(async (tx) => {
            // Get employee count for employeeNumber
            const employeeCount = await tx.user.count({
                where: { companyId: companyId, employeeNumber: { not: null } }
            });
            const employeeNumber = `EMP${String(employeeCount + 1).padStart(5, '0')}`;

            // Extract Employee fields from request body
            const {
                departmentId,
                positionId,
                hireDate,
                contractType,
                baseSalary
            } = req.body;

            // 1. Create User with Employee fields
            const newUser = await tx.user.create({
                data: {
                    firstName,
                    lastName,
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    phone: phone || null,
                    role,
                    isActive,
                    companyId,
                    // Employee fields
                    employeeNumber: employeeNumber,
                    departmentId: departmentId || null,
                    positionId: positionId || null,
                    hireDate: hireDate ? new Date(hireDate) : new Date(),
                    contractType: contractType || 'FULL_TIME',
                    baseSalary: baseSalary ? parseFloat(baseSalary) : null
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isEmailVerified: true,
                    lastLoginAt: true,
                    employeeNumber: true,
                    departmentId: true,
                    positionId: true,
                    hireDate: true,
                    contractType: true,
                    baseSalary: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            // 2. Create UserCompany record
            await tx.userCompany.create({
                data: {
                    userId: newUser.id,
                    companyId: companyId,
                    role: role,
                    isActive: isActive,
                    isDefault: true
                }
            });

            console.log(`✅ [CREATE-USER] User created with Employee fields: ${newUser.email}, Employee Number: ${employeeNumber}`);

            return { user: newUser };
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المستخدم بنجاح',
            data: result.user
        });

    } catch (error) {
        console.error('❌ Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء المستخدم',
            error: error.message
        });
    }
}

const updateUser = async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const {
            firstName,
            lastName,
            email,
            phone,
            role,
            isActive
        } = req.body;

        // ✅ FIX: Check if user exists in company via UserCompany table
        const userCompany = await getSharedPrismaClient().userCompany.findFirst({
            where: {
                userId: userId,
                companyId: companyId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true
                    }
                }
            }
        });

        if (!userCompany) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود في هذه الشركة'
            });
        }

        // Check if email is being changed and already exists
        if (email && email.toLowerCase() !== userCompany.user.email) {
            const emailExists = await getSharedPrismaClient().user.findFirst({
                where: {
                    email: email.toLowerCase(),
                    id: { not: userId }
                }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'البريد الإلكتروني مستخدم بالفعل'
                });
            }
        }

        // ✅ FIX: Update user and UserCompany record
        const updatedUser = await getSharedPrismaClient().user.update({
            where: { id: userId },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(email && { email: email.toLowerCase() }),
                ...(phone !== undefined && { phone })
                // Note: role and isActive are in UserCompany table, not User table
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
                role: true,
                isActive: true,
                isEmailVerified: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                // ✅ Include Employee fields directly from User
                employeeNumber: true,
                contractType: true,
                hireDate: true,
                baseSalary: true,
                departmentId: true,
                positionId: true,
                departmentRelation: {
                    select: {
                        id: true,
                        name: true,
                        color: true
                    }
                },
                positionRelation: {
                    select: {
                        id: true,
                        title: true,
                        level: true
                    }
                }
            }
        });

        // ✅ FIX: Update UserCompany record (role and isActive are stored here)
        if (role !== undefined || isActive !== undefined) {
            try {
                await getSharedPrismaClient().userCompany.updateMany({
                    where: {
                        userId: userId,
                        companyId: companyId
                    },
                    data: {
                        ...(role && { role }),
                        ...(isActive !== undefined && { isActive })
                    }
                });
                console.log(`✅ [UPDATE-USER] UserCompany record updated for user: ${updatedUser.email}`);
            } catch (ucError) {
                console.warn(`⚠️ [UPDATE-USER] Failed to update UserCompany record:`, ucError.message);
            }
        }

        // ✅ FIX: Update User with employee data (HR Integration)
        // User data is already updated above, just ensure employee fields are synced
        if (updatedUser.employeeNumber || firstName || lastName || email || phone) {
            try {
                const updateData = {};
                if (firstName) updateData.firstName = firstName;
                if (lastName) updateData.lastName = lastName;
                if (email) updateData.email = email.toLowerCase();
                if (phone !== undefined) updateData.phone = phone;

                // Update user directly (employee data is in user table)
                await getSharedPrismaClient().user.update({
                    where: { id: userId },
                    data: updateData
                });
                console.log(`✅ [UPDATE-USER] Employee record updated for user: ${updatedUser.email}`);
            } catch (empError) {
                console.warn(`⚠️ [UPDATE-USER] Failed to update Employee record:`, empError.message);
                // Don't fail the request if Employee update fails
            }
        }

        // ✅ FIX: Re-fetch user with updated UserCompany and Employee data
        const userCompanyAfterUpdate = await getSharedPrismaClient().userCompany.findFirst({
            where: {
                userId: userId,
                companyId: companyId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        isEmailVerified: true,
                        lastLoginAt: true,
                        createdAt: true,
                        updatedAt: true,
                        // ✅ Include Employee fields directly from User
                        employeeNumber: true,
                        contractType: true,
                        hireDate: true,
                        baseSalary: true,
                        departmentId: true,
                        positionId: true,
                        departmentRelation: {
                            select: {
                                id: true,
                                name: true,
                                color: true
                            }
                        },
                        positionRelation: {
                            select: {
                                id: true,
                                title: true,
                                level: true
                            }
                        }
                    }
                }
            }
        });

        const finalUser = {
            id: userCompanyAfterUpdate.user.id,
            firstName: userCompanyAfterUpdate.user.firstName,
            lastName: userCompanyAfterUpdate.user.lastName,
            email: userCompanyAfterUpdate.user.email,
            phone: userCompanyAfterUpdate.user.phone,
            avatar: userCompanyAfterUpdate.user.avatar,
            role: userCompanyAfterUpdate.role, // From UserCompany
            isActive: userCompanyAfterUpdate.isActive, // From UserCompany
            isEmailVerified: userCompanyAfterUpdate.user.isEmailVerified,
            lastLoginAt: userCompanyAfterUpdate.user.lastLoginAt,
            createdAt: userCompanyAfterUpdate.user.createdAt,
            updatedAt: userCompanyAfterUpdate.user.updatedAt,
            employee: userCompanyAfterUpdate.user.employeeNumber ? {
                id: userCompanyAfterUpdate.user.id, // Use user.id as employee id
                employeeNumber: userCompanyAfterUpdate.user.employeeNumber,
                status: userCompanyAfterUpdate.user.isActive ? 'ACTIVE' : 'INACTIVE', // Map isActive to status
                contractType: userCompanyAfterUpdate.user.contractType,
                hireDate: userCompanyAfterUpdate.user.hireDate,
                department: userCompanyAfterUpdate.user.departmentRelation,
                position: userCompanyAfterUpdate.user.positionRelation
            } : null
        };

        res.json({
            success: true,
            message: 'تم تحديث المستخدم بنجاح',
            data: finalUser
        });

    } catch (error) {
        console.error('❌ Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث المستخدم',
            error: error.message
        });
    }
};

const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const {
            firstName,
            lastName,
            phone,
            avatar,
            timezone
        } = req.body;

        console.log(`👤 [UPDATE-PROFILE] User ${userId} updating profile`);

        // Check if user exists
        const existingUser = await getSharedPrismaClient().user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // Update user profile
        const updatedUser = await getSharedPrismaClient().user.update({
            where: { id: userId },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(phone !== undefined && { phone }),
                ...(avatar !== undefined && { avatar }),
                ...(timezone !== undefined && { timezone })
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
                timezone: true,
                role: true,
                isActive: true,
                isEmailVerified: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true
            }
        });

        console.log(`✅ [UPDATE-PROFILE] Profile updated successfully for user ${userId}`);

        res.json({
            success: true,
            message: 'تم تحديث الملف الشخصي بنجاح',
            data: updatedUser
        });

    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الملف الشخصي',
            error: error.message
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        // Handle both :companyId and :id parameter names from different routes
        const companyId = req.params.companyId || req.params.id;
        const userId = req.params.userId;
        console.log(`🗑️ [DELETE-USER] Attempting to delete user ${userId} from company ${companyId}`);

        // Check if user exists and belongs to company
        const existingUser = await getSharedPrismaClient().userCompany.findFirst({
            where: {
                userId: userId,
                companyId: companyId
            },
            include: {
                user: true
            }
        });

        if (!existingUser) {
            console.log(`❌ [DELETE-USER] User not found in company`);
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        console.log(`✅ [DELETE-USER] User found. Role in company: ${existingUser.role}, Global Role: ${existingUser.user.role}`);
        console.log(`📋 [DELETE-USER] Full user data:`, JSON.stringify({
            userCompanyRole: existingUser.role,
            globalRole: existingUser.user.role,
            userId: existingUser.userId,
            companyId: existingUser.companyId,
            userEmail: existingUser.user.email
        }, null, 2));

        // Check if user has other company memberships or is a SUPER_ADMIN first
        console.log(`🔍 [DELETE-USER] Checking for other memberships...`);
        const otherMemberships = await getSharedPrismaClient().userCompany.count({
            where: {
                userId: userId,
                companyId: { not: companyId }
            }
        });

        const isSuperAdmin = existingUser.user.role === 'SUPER_ADMIN';
        console.log(`📊 [DELETE-USER] Other memberships: ${otherMemberships}, Is Super Admin: ${isSuperAdmin}`);
        console.log(`🔍 [DELETE-USER] Checking conditions:`);
        console.log(`   - existingUser.role === 'OWNER': ${existingUser.role === 'OWNER'}`);
        console.log(`   - existingUser.user.role === 'OWNER': ${existingUser.user.role === 'OWNER'}`);
        console.log(`   - existingUser.user.role === 'SUPER_ADMIN': ${existingUser.user.role === 'SUPER_ADMIN'}`);
        console.log(`   - isSuperAdmin: ${isSuperAdmin}`);

        // 🛡️ SECURITY FIX: Prevent deleting the OWNER account UNLESS they are a SUPER_ADMIN or have other memberships
        if (existingUser.role === 'OWNER' && !isSuperAdmin && otherMemberships === 0) {
            console.log(`❌ [DELETE-USER] Cannot delete OWNER with no other memberships`);
            return res.status(403).json({
                success: false,
                message: 'لا يمكن حذف مالك الشركة. يجب نقل الملكية أولاً.',
                code: 'OWNER_DELETION_FORBIDDEN'
            });
        }

        // Also check the user's global role (but allow if SUPER_ADMIN or has other memberships)
        if (existingUser.user.role === 'OWNER' && !isSuperAdmin && otherMemberships === 0) {
            console.log(`❌ [DELETE-USER] Cannot delete global OWNER with no other memberships`);
            return res.status(403).json({
                success: false,
                message: 'لا يمكن حذف حساب المالك الرئيسي.',
                code: 'OWNER_DELETION_FORBIDDEN'
            });
        }

        // If user is OWNER but has other memberships or is SUPER_ADMIN, allow deletion
        if ((existingUser.role === 'OWNER' || existingUser.user.role === 'OWNER') && (isSuperAdmin || otherMemberships > 0)) {
            console.log(`✅ [DELETE-USER] User is OWNER but has other memberships (${otherMemberships}) or is SUPER_ADMIN, allowing deletion`);
        }

        // Check if user is the only COMPANY_ADMIN (but allow deletion if they're a SUPER_ADMIN or have other memberships)
        if (existingUser.role === 'COMPANY_ADMIN' && !isSuperAdmin && otherMemberships === 0) {
            console.log(`🔍 [DELETE-USER] Checking if user is the last admin...`);
            const adminCount = await getSharedPrismaClient().userCompany.count({
                where: {
                    companyId: companyId,
                    role: 'COMPANY_ADMIN',
                    isActive: true
                }
            });
            console.log(`📊 [DELETE-USER] Admin count: ${adminCount}`);

            if (adminCount <= 1) {
                console.log(`❌ [DELETE-USER] Cannot delete last admin (not a super admin and no other memberships)`);
                return res.status(400).json({
                    success: false,
                    message: 'لا يمكن حذف آخر مدير للشركة'
                });
            }
        } else if (existingUser.role === 'COMPANY_ADMIN' && (isSuperAdmin || otherMemberships > 0)) {
            console.log(`✅ [DELETE-USER] User is COMPANY_ADMIN but is SUPER_ADMIN or has other memberships (${otherMemberships}), allowing deletion even if last admin`);
        }

        // If user has other memberships or is a super admin, only delete the UserCompany relationship
        // Otherwise, delete the entire user account
        if (otherMemberships > 0 || isSuperAdmin) {
            console.log(`🔄 [DELETE-USER] Removing user from company only (keeping user account)`);
            // Only remove from this company
            const deleteResult = await getSharedPrismaClient().userCompany.deleteMany({
                where: {
                    userId: userId,
                    companyId: companyId
                }
            });
            console.log(`✅ [DELETE-USER] Deleted ${deleteResult.count} UserCompany record(s)`);

            // Invalidate all tokens for this user to force re-login with updated company list
            try {
                await getSharedPrismaClient().user.update({
                    where: { id: userId },
                    data: {
                        updatedAt: new Date() // This will help identify stale tokens
                    }
                });
                console.log(`🔄 [DELETE-USER] User updated to invalidate old tokens`);
            } catch (err) {
                console.log(`⚠️ [DELETE-USER] Could not update user timestamp: ${err.message}`);
            }
        } else {
            console.log(`🗑️ [DELETE-USER] Deleting entire user account`);
            // Delete the entire user account (no other memberships)
            await getSharedPrismaClient().user.delete({
                where: { id: userId }
            });
            console.log(`✅ [DELETE-USER] User account deleted`);
        }

        console.log(`✅ [DELETE-USER] Operation completed successfully`);
        res.json({
            success: true,
            message: 'تم حذف المستخدم بنجاح. يجب على المستخدم تسجيل الدخول مرة أخرى.'
        });

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف المستخدم',
            error: error.message
        });
    }
}

// ==================== ROLES & PERMISSIONS MANAGEMENT ====================

const createCustomRole = async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            name,
            description,
            permissions,
            isActive = true
        } = req.body;

        // Validation
        if (!name || !description || !permissions || !Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                message: 'اسم الدور والوصف والصلاحيات مطلوبة'
            });
        }

        // Check if company exists
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // For now, we'll store custom roles in company settings
        // In a real app, you'd create a separate roles table
        const currentSettings = company.settings ? JSON.parse(company.settings) : {};
        const customRoles = currentSettings.customRoles || {};

        // Generate role key
        const roleKey = `CUSTOM_${name.toUpperCase().replace(/\s+/g, '_')}`;

        // Check if role already exists
        if (customRoles[roleKey]) {
            return res.status(400).json({
                success: false,
                message: 'دور بهذا الاسم موجود بالفعل'
            });
        }

        // Add new role
        customRoles[roleKey] = {
            name,
            description,
            permissions,
            isActive,
            isCustom: true,
            createdAt: new Date().toISOString()
        };

        // Update company settings
        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: {
                settings: JSON.stringify({
                    ...currentSettings,
                    customRoles
                })
            }
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الدور بنجاح',
            data: {
                key: roleKey,
                ...customRoles[roleKey]
            }
        });

    } catch (error) {
        console.error('❌ Error creating role:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء الدور',
            error: error.message
        });
    }
};

const getCompanyRoles = async (req, res) => {
    try {
        const { companyId } = req.params;

        // Get company
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Built-in roles
        const builtInRoles = {
            OWNER: {
                name: 'مالك الشركة',
                description: 'صلاحيات كاملة وغير محدودة',
                permissions: [
                    'إدارة المستخدمين',
                    'إدارة الأدوار',
                    'إدارة المنتجات',
                    'مشاهدة المنتجات',
                    'إدارة العملاء',
                    'مشاهدة العملاء',
                    'إدارة الطلبات',
                    'مشاهدة الطلبات',
                    'مشاهدة التقارير',
                    'إدارة التقارير',
                    'إدارة الإعدادات',
                    'إدارة التكاملات',
                    'إدارة المحادثات',
                    'مشاهدة المحادثات',
                    'إدارة الخطة والاشتراك'
                ],
                isBuiltIn: true,
                isActive: true
            },
            COMPANY_ADMIN: {
                name: 'مدير الشركة',
                description: 'صلاحيات كاملة لإدارة الشركة والمستخدمين',
                permissions: [
                    'إدارة المستخدمين',
                    'إدارة الأدوار',
                    'إدارة المنتجات',
                    'إدارة العملاء',
                    'إدارة الطلبات',
                    'مشاهدة التقارير',
                    'إدارة الإعدادات',
                    'إدارة التكاملات'
                ],
                isBuiltIn: true,
                isActive: true
            },
            MANAGER: {
                name: 'مدير',
                description: 'صلاحيات إدارية محدودة',
                permissions: [
                    'إدارة المنتجات',
                    'إدارة العملاء',
                    'إدارة الطلبات',
                    'مشاهدة التقارير'
                ],
                isBuiltIn: true,
                isActive: true
            },
            AGENT: {
                name: 'موظف',
                description: 'صلاحيات أساسية للعمل اليومي',
                permissions: [
                    'إدارة العملاء',
                    'إدارة الطلبات',
                    'مشاهدة المنتجات'
                ],
                isBuiltIn: true,
                isActive: true
            }
        };

        // Get custom roles
        const settings = company.settings ? JSON.parse(company.settings) : {};
        const customRoles = settings.customRoles || {};

        // Combine roles
        const allRoles = { ...builtInRoles, ...customRoles };

        res.json({
            success: true,
            message: 'تم جلب الأدوار بنجاح',
            data: allRoles
        });

    } catch (error) {
        console.error('❌ Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الأدوار',
            error: error.message
        });
    }
};

const updateCustomRole = async (req, res) => {
    try {
        const { companyId, roleKey } = req.params;
        const { name, description, permissions, isActive } = req.body;

        // Check if it's a built-in role
        if (['COMPANY_ADMIN', 'MANAGER', 'AGENT'].includes(roleKey)) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن تعديل الأدوار الأساسية'
            });
        }

        // Get company
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = company.settings ? JSON.parse(company.settings) : {};
        const customRoles = settings.customRoles || {};

        if (!customRoles[roleKey]) {
            return res.status(404).json({
                success: false,
                message: 'الدور غير موجود'
            });
        }

        // Update role
        customRoles[roleKey] = {
            ...customRoles[roleKey],
            ...(name && { name }),
            ...(description && { description }),
            ...(permissions && { permissions }),
            ...(isActive !== undefined && { isActive }),
            updatedAt: new Date().toISOString()
        };

        // Update company settings
        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: {
                settings: JSON.stringify({
                    ...settings,
                    customRoles
                })
            }
        });

        res.json({
            success: true,
            message: 'تم تحديث الدور بنجاح',
            data: {
                key: roleKey,
                ...customRoles[roleKey]
            }
        });

    } catch (error) {
        console.error('❌ Error updating role:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الدور',
            error: error.message
        });
    }
}

const deleteCustomRole = async (req, res) => {
    try {
        const { companyId, roleKey } = req.params;
        const { name, description, permissions, isActive } = req.body;

        // Check if it's a built-in role
        if (['COMPANY_ADMIN', 'MANAGER', 'AGENT'].includes(roleKey)) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن تعديل الأدوار الأساسية'
            });
        }

        // Get company
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = company.settings ? JSON.parse(company.settings) : {};
        const customRoles = settings.customRoles || {};

        if (!customRoles[roleKey]) {
            return res.status(404).json({
                success: false,
                message: 'الدور غير موجود'
            });
        }

        // Update role
        customRoles[roleKey] = {
            ...customRoles[roleKey],
            ...(name && { name }),
            ...(description && { description }),
            ...(permissions && { permissions }),
            ...(isActive !== undefined && { isActive }),
            updatedAt: new Date().toISOString()
        };

        // Update company settings
        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: {
                settings: JSON.stringify({
                    ...settings,
                    customRoles
                })
            }
        });

        res.json({
            success: true,
            message: 'تم تحديث الدور بنجاح',
            data: {
                key: roleKey,
                ...customRoles[roleKey]
            }
        });

    } catch (error) {
        console.error('❌ Error updating role:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الدور',
            error: error.message
        });
    }
}


// ==================== USER INVITATIONS ROUTES ====================
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendUserInvitation = async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            email,
            firstName,
            lastName,
            role = 'AGENT'
        } = req.body;

        // Validation
        if (!email || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني والاسم الأول والأخير مطلوبة'
            });
        }

        // Check if user already exists
        const existingUser = await getSharedPrismaClient().user.findUnique({
            where: { email },
            include: {
                userCompanies: {
                    select: {
                        companyId: true,
                        company: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        // If user exists, check if they're already in this company
        if (existingUser) {
            const isInCurrentCompany = existingUser.userCompanies.some(
                uc => uc.companyId === companyId
            );

            if (isInCurrentCompany) {
                return res.status(400).json({
                    success: false,
                    message: 'هذا المستخدم موجود بالفعل في شركتك',
                    code: 'USER_ALREADY_IN_COMPANY'
                });
            }

            // User exists but in another company - allow cross-company invitation
            console.log(`👥 [CROSS-COMPANY-INVITE] User ${email} exists in ${existingUser.userCompanies.length} other company(ies)`);
        }

        // Check if invitation already exists
        const existingInvitation = await getSharedPrismaClient().userInvitation.findFirst({
            where: {
                email,
                companyId,
                status: 'PENDING'
            }
        });

        if (existingInvitation) {
            return res.status(400).json({
                success: false,
                message: 'دعوة معلقة لهذا البريد الإلكتروني موجودة بالفعل'
            });
        }

        // Check user limit before creating invitation
        const limitCheck = await planLimitsService.checkLimits(companyId, 'users', 1);
        if (!limitCheck.allowed) {
            return res.status(400).json({
                success: false,
                message: 'تم تجاوز حد المستخدمين المسموح به في خطتك الحالية',
                error: 'LIMIT_EXCEEDED',
                details: {
                    current: limitCheck.current,
                    limit: limitCheck.limit,
                    plan: (await planLimitsService.getCurrentUsage(companyId)).plan
                }
            });
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        // Create invitation (works for both new users and existing users from other companies)
        const invitation = await getSharedPrismaClient().userInvitation.create({
            data: {
                email,
                firstName: existingUser ? existingUser.firstName : firstName,
                lastName: existingUser ? existingUser.lastName : lastName,
                role,
                token,
                invitedBy: req.user.userId,
                companyId,
                expiresAt
            },
            include: {
                inviter: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                company: {
                    select: {
                        name: true
                    }
                }
            }
        });

        // 🔔 Create in-app notification if user exists (cross-company invitation)
        // Create notification for EACH company the user belongs to, so they see it regardless of which company they're logged into
        if (existingUser && existingUser.userCompanies.length > 0) {
            try {
                console.log(`🔔 [NOTIFICATION] Creating notifications for user ${existingUser.email} (ID: ${existingUser.id})`);
                console.log(`🔔 [NOTIFICATION] User belongs to ${existingUser.userCompanies.length} company(ies):`, existingUser.userCompanies.map(uc => `${uc.company.name} (${uc.companyId})`));

                // Create notification for each company the user is part of
                const notificationPromises = existingUser.userCompanies.map(async (uc) => {
                    console.log(`🔔 [NOTIFICATION] Creating notification for company: ${uc.company.name} (${uc.companyId})`);
                    const notification = await getSharedPrismaClient().notification.create({
                        data: {
                            userId: existingUser.id,
                            companyId: uc.companyId, // User's current company, not the inviting company
                            title: `🎉 دعوة للانضمام إلى ${invitation.company.name}`,
                            message: `${invitation.inviter.firstName} ${invitation.inviter.lastName} يدعوك للانضمام إلى ${invitation.company.name} كـ ${role === 'AGENT' ? 'موظف' : role === 'MANAGER' ? 'مدير' : 'مسؤول'}`,
                            type: 'invitation',
                            isRead: false,
                            data: JSON.stringify({
                                invitationId: invitation.id,
                                token: token,
                                companyName: invitation.company.name,
                                inviterName: `${invitation.inviter.firstName} ${invitation.inviter.lastName}`,
                                role: role,
                                expiresAt: expiresAt.toISOString(),
                                invitationLink: `${process.env.FRONTEND_URL || 'https://www.maxp-ai.pro'}/auth/accept-invitation?token=${token}`
                            }),
                            updatedAt: new Date()
                        }
                    });
                    console.log(`✅ [NOTIFICATION] Created notification ID: ${notification.id} for company ${uc.companyId}`);
                    return notification;
                });

                const createdNotifications = await Promise.all(notificationPromises);
                console.log(`🔔 [NOTIFICATION] Successfully created ${createdNotifications.length} in-app notification(s) for user ${existingUser.email}`);
            } catch (notifError) {
                console.error('⚠️ [NOTIFICATION] Failed to create in-app notification:', notifError);
                console.error('⚠️ [NOTIFICATION] Error stack:', notifError.stack);
                // Don't fail the invitation if notification creation fails
            }
        } else {
            console.log(`ℹ️ [NOTIFICATION] No notifications created - user ${existingUser ? 'has no companies' : 'does not exist'}`);
        }

        // Generate invitation link
        const invitationLink = `${process.env.FRONTEND_URL || 'https://www.maxp-ai.pro'}/auth/accept-invitation?token=${token}`;

        // Send email if SMTP is configured
        let emailSent = false;
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                await emailTransporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: email,
                    subject: `🎉 دعوة للانضمام إلى ${invitation.company.name}`,
                    html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 دعوة خاصة</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin-top: 0; font-size: 24px;">مرحباً ${firstName} ${lastName}،</h2>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                تم دعوتك للانضمام إلى <strong style="color: #667eea;">${invitation.company.name}</strong> من قبل 
                                <strong>${invitation.inviter.firstName} ${invitation.inviter.lastName}</strong>.
                            </p>
                            
                            <div style="background-color: #f8f9fa; border-right: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #555;">
                                    <strong style="color: #333;">دورك في النظام:</strong> 
                                    <span style="color: #667eea; font-weight: bold;">${role === 'AGENT' ? 'موظف' : role === 'MANAGER' ? 'مدير' : 'مسؤول'}</span>
                                </p>
                            </div>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                للقبول والانضمام إلى الفريق، انقر على الزر أدناه:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${invitationLink}" 
                                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                  color: white; 
                                                  padding: 15px 40px; 
                                                  text-decoration: none; 
                                                  border-radius: 50px; 
                                                  display: inline-block; 
                                                  font-weight: bold; 
                                                  font-size: 16px;
                                                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                            ✅ قبول الدعوة والانضمام
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                أو انسخ الرابط التالي والصقه في المتصفح:
                            </p>
                            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #667eea;">
                                ${invitationLink}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 10px 10px;">
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                ⏰ هذه الدعوة صالحة لمدة <strong>7 أيام</strong> من تاريخ الإرسال
                            </p>
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                🔒 إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني بأمان
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} ${invitation.company.name}. جميع الحقوق محفوظة.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
          `
                });
                emailSent = true;
            } catch (emailError) {
                console.error('❌ Error sending invitation email:', emailError);
            }
        }

        res.status(201).json({
            success: true,
            message: existingUser
                ? `تم إرسال دعوة للمستخدم الموجود ${existingUser.firstName} ${existingUser.lastName} للانضمام إلى شركتك`
                : 'تم إرسال الدعوة بنجاح',
            data: {
                invitation: {
                    id: invitation.id,
                    email: invitation.email,
                    firstName: invitation.firstName,
                    lastName: invitation.lastName,
                    role: invitation.role,
                    status: invitation.status,
                    expiresAt: invitation.expiresAt,
                    createdAt: invitation.createdAt
                },
                invitationLink,
                emailSent,
                isExistingUser: !!existingUser,
                existingUserCompanies: existingUser ? existingUser.userCompanies.map(uc => uc.company.name) : []
            }
        });

    } catch (error) {
        console.error('❌ Error creating invitation:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء الدعوة',
            error: error.message
        });
    }
}

const getCompanyInvitations = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        const skip = (page - 1) * limit;
        const where = { companyId };

        if (status) {
            where.status = status;
        }

        const [invitations, totalCount] = await Promise.all([
            getSharedPrismaClient().userInvitation.findMany({
                where,
                include: {
                    inviter: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit)
            }),
            getSharedPrismaClient().userInvitation.count({ where })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            message: 'تم جلب الدعوات بنجاح',
            data: {
                invitations,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalCount,
                    totalPages
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching invitations:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الدعوات',
            error: error.message
        });
    }
}

const cancelInvitation = async (req, res) => {
    try {
        const { companyId, invitationId } = req.params;

        const invitation = await getSharedPrismaClient().userInvitation.findFirst({
            where: {
                id: invitationId,
                companyId
            }
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'الدعوة غير موجودة'
            });
        }

        // Allow canceling any invitation (even expired ones for cleanup)
        // Just delete the invitation instead of updating status
        await getSharedPrismaClient().userInvitation.delete({
            where: { id: invitationId }
        });

        res.json({
            success: true,
            message: 'تم إلغاء الدعوة بنجاح'
        });

    } catch (error) {
        console.error('❌ Error cancelling invitation:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إلغاء الدعوة',
            error: error.message
        });
    }
}

const resendInvitation = async (req, res) => {
    try {
        const { companyId, invitationId } = req.params;

        const invitation = await getSharedPrismaClient().userInvitation.findFirst({
            where: {
                id: invitationId,
                companyId
            },
            include: {
                inviter: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                },
                company: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'الدعوة غير موجودة'
            });
        }

        if (invitation.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن إعادة إرسال دعوة غير معلقة'
            });
        }

        // Generate new token and extend expiry
        const newToken = crypto.randomBytes(32).toString('hex');
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        await getSharedPrismaClient().userInvitation.update({
            where: { id: invitationId },
            data: {
                token: newToken,
                expiresAt: newExpiresAt
            }
        });

        // Generate new invitation link
        const invitationLink = `${process.env.FRONTEND_URL || 'https://www.maxp-ai.pro'}/auth/accept-invitation?token=${newToken}`;

        // Send email if SMTP is configured
        let emailSent = false;
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                await emailTransporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: invitation.email,
                    subject: `🔄 إعادة إرسال: دعوة للانضمام إلى ${invitation.company.name}`,
                    html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔄 تذكير بالدعوة</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin-top: 0; font-size: 24px;">مرحباً ${invitation.firstName} ${invitation.lastName}،</h2>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                هذا تذكير بدعوتك للانضمام إلى <strong style="color: #667eea;">${invitation.company.name}</strong>.
                            </p>
                            
                            <div style="background-color: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #856404;">
                                    ⚠️ <strong>تم تجديد رابط الدعوة</strong> - الرابط السابق لم يعد صالحاً
                                </p>
                            </div>
                            
                            <div style="background-color: #f8f9fa; border-right: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #555;">
                                    <strong style="color: #333;">دورك في النظام:</strong> 
                                    <span style="color: #667eea; font-weight: bold;">${invitation.role === 'AGENT' ? 'موظف' : invitation.role === 'MANAGER' ? 'مدير' : 'مسؤول'}</span>
                                </p>
                            </div>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                للقبول والانضمام إلى الفريق، انقر على الزر أدناه:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${invitationLink}" 
                                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                  color: white; 
                                                  padding: 15px 40px; 
                                                  text-decoration: none; 
                                                  border-radius: 50px; 
                                                  display: inline-block; 
                                                  font-weight: bold; 
                                                  font-size: 16px;
                                                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                            ✅ قبول الدعوة والانضمام
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                أو انسخ الرابط التالي والصقه في المتصفح:
                            </p>
                            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #667eea;">
                                ${invitationLink}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 10px 10px;">
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                ⏰ هذه الدعوة الجديدة صالحة لمدة <strong>7 أيام</strong> من تاريخ الإرسال
                            </p>
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                🔒 إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني بأمان
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} ${invitation.company.name}. جميع الحقوق محفوظة.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
          `
                });
                emailSent = true;
            } catch (emailError) {
                console.error('❌ Error sending invitation email:', emailError);
            }
        }

        res.json({
            success: true,
            message: emailSent ? 'تم إعادة إرسال الدعوة بنجاح' : 'تم تحديث الدعوة بنجاح (لم يتم إرسال البريد الإلكتروني)',
            data: {
                invitationLink,
                emailSent
            }
        });

    } catch (error) {
        console.error('❌ Error resending invitation:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إعادة إرسال الدعوة',
            error: error.message
        });
    }
}


const FrontendSpecificSafeEndpoint = async (req, res) => {
    try {
        // Get real data
        let productCount = 6;
        try {
            productCount = await getSharedPrismaClient().product.count({ where: { isActive: true } });
        } catch (error) {
            //console.log('Using default count');
        }

        // Create the exact structure that frontend expects
        const frontendSafeData = {
            success: true,
            data: {
                currentPlan: 'basic',
                planName: 'الخطة الأساسية',
                planLimits: {
                    products: Number(1000),
                    orders: Number(5000),
                    storage: '10GB',
                    apiCalls: Number(10000)
                },
                currentUsage: {
                    products: Number(productCount) || Number(0),
                    orders: Number(0),
                    storage: '1.2GB',
                    apiCalls: Number(150)
                },
                usagePercentage: {
                    products: Number(((Number(productCount) || 0) / 1000 * 100).toFixed(1)) || Number(0),
                    orders: Number(0),
                    storage: Number(12),
                    apiCalls: Number(1.5)
                },
                // This is what the frontend maps over
                usageData: [
                    {
                        name: 'المنتجات',
                        current: Number(productCount) || Number(0),
                        limit: Number(1000),
                        percentage: Number(((Number(productCount) || 0) / 1000 * 100).toFixed(1)) || Number(0),
                        unit: 'منتج',
                        color: '#3B82F6',
                        icon: '📦'
                    },
                    {
                        name: 'الطلبات',
                        current: Number(0),
                        limit: Number(5000),
                        percentage: Number(0),
                        unit: 'طلب',
                        color: '#10B981',
                        icon: '🛒'
                    },
                    {
                        name: 'التخزين',
                        current: Number(1.2),
                        limit: Number(10),
                        percentage: Number(12),
                        unit: 'جيجا',
                        color: '#F59E0B',
                        icon: '💾'
                    },
                    {
                        name: 'استدعاءات API',
                        current: Number(150),
                        limit: Number(10000),
                        percentage: Number(1.5),
                        unit: 'استدعاء',
                        color: '#8B5CF6',
                        icon: '🔗'
                    }
                ]
            }
        };

        res.json(frontendSafeData);

    } catch (error) {
        console.error('Frontend safe endpoint error:', error);

        // Ultra-safe fallback
        res.json({
            success: true,
            data: {
                currentPlan: 'basic',
                planName: 'الخطة الأساسية',
                planLimits: { products: 1000, orders: 5000, storage: '10GB', apiCalls: 10000 },
                currentUsage: { products: 0, orders: 0, storage: '0GB', apiCalls: 0 },
                usagePercentage: { products: 0, orders: 0, storage: 0, apiCalls: 0 },
                usageData: [
                    { name: 'المنتجات', current: 0, limit: 1000, percentage: 0, unit: 'منتج', color: '#3B82F6', icon: '📦' },
                    { name: 'الطلبات', current: 0, limit: 5000, percentage: 0, unit: 'طلب', color: '#10B981', icon: '🛒' },
                    { name: 'التخزين', current: 0, limit: 10, percentage: 0, unit: 'جيجا', color: '#F59E0B', icon: '💾' },
                    { name: 'استدعاءات API', current: 0, limit: 10000, percentage: 0, unit: 'استدعاء', color: '#8B5CF6', icon: '🔗' }
                ]
            }
        });
    }
}

/**
 * 🔗 Update Company Slug (for subdomain)
 */
const updateCompanySlug = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { slug } = req.body;

        // Import slug validator
        const { validateSlug, sanitizeSlug } = require('../utils/slugValidator');

        // Sanitize input
        const sanitizedSlug = sanitizeSlug(slug);

        // Validate slug
        const validation = validateSlug(sanitizedSlug);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        // Check if slug already exists for another company
        const existingCompany = await getSharedPrismaClient().company.findFirst({
            where: {
                slug: sanitizedSlug,
                NOT: {
                    id: companyId
                }
            }
        });

        if (existingCompany) {
            return res.status(409).json({
                success: false,
                error: 'هذا الاسم مستخدم بالفعل، يرجى اختيار اسم آخر'
            });
        }

        // Update company slug
        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { slug: sanitizedSlug },
            select: {
                id: true,
                name: true,
                slug: true,
                email: true
            }
        });

        res.json({
            success: true,
            message: 'تم تحديث رابط المتجر بنجاح',
            data: {
                company: updatedCompany,
                url: `https://${sanitizedSlug}.maxp-ai.pro`
            }
        });

    } catch (error) {
        console.error('❌ Error updating company slug:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء تحديث رابط المتجر'
        });
    }
};

/**
 * 📊 Get Users Statistics
 * Returns statistics for all users in a company including conversations and messages count
 */
const getUsersStatistics = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;

        // Validate companyId
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الشركة مطلوب'
            });
        }

        // Parse dates
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                dateFilter.createdAt.gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.createdAt.lte = end;
            }
        }

        // Get all users in the company through UserCompany relationship
        const userCompanies = await getSharedPrismaClient().userCompany.findMany({
            where: {
                companyId: companyId,
                isActive: true // Only active users in this company
            },
            select: {
                role: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        // Transform to users array
        const users = userCompanies.map(uc => ({
            id: uc.user.id,
            firstName: uc.user.firstName,
            lastName: uc.user.lastName,
            email: uc.user.email,
            role: uc.role // Role from UserCompany table
        }));

        // Calculate statistics for each user
        const statistics = await Promise.all(
            users.map(async (user) => {
                // Build where clause for messages
                const messagesWhere = {
                    senderId: user.id,
                    isFromCustomer: false, // Only employee messages
                    conversation: {
                        companyId: companyId
                    },
                    ...dateFilter
                };

                // Count distinct conversations
                const distinctConversations = await getSharedPrismaClient().message.groupBy({
                    by: ['conversationId'],
                    where: messagesWhere
                });

                // Count total messages
                const messagesCount = await getSharedPrismaClient().message.count({
                    where: messagesWhere
                });

                // Count orders created by this user
                const ordersWhere = {
                    companyId: companyId,
                    createdBy: user.id,
                    ...dateFilter
                };

                const ordersCount = await getSharedPrismaClient().order.count({
                    where: ordersWhere
                });

                // Calculate conversion rate (orders / conversations * 100)
                const conversionRate = distinctConversations.length > 0
                    ? ((ordersCount / distinctConversations.length) * 100).toFixed(2)
                    : '0.00';

                return {
                    userId: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    conversationsCount: distinctConversations.length,
                    messagesCount: messagesCount,
                    ordersCount: ordersCount,
                    conversionRate: parseFloat(conversionRate)
                };
            })
        );

        // Sort by conversationsCount descending
        statistics.sort((a, b) => b.conversationsCount - a.conversationsCount);

        res.json({
            success: true,
            message: 'تم جلب إحصائيات المستخدمين بنجاح',
            data: {
                statistics: statistics,
                totalUsers: statistics.length,
                dateRange: {
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching users statistics:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        res.status(500).json({
            success: false,
            message: 'فشل في جلب إحصائيات المستخدمين',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 🔍 Check Slug Availability
 */
const checkSlugAvailability = async (req, res) => {
    try {
        const { slug } = req.query;
        const { companyId } = req.query; // optional

        if (!slug) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال اسم المتجر'
            });
        }

        const { validateSlug, sanitizeSlug } = require('../utils/slugValidator');

        // Sanitize and validate
        const sanitizedSlug = sanitizeSlug(slug);
        const validation = validateSlug(sanitizedSlug);

        if (!validation.valid) {
            return res.json({
                success: true,
                available: false,
                error: validation.error,
                suggestion: sanitizedSlug
            });
        }

        // Check if exists
        const whereCondition = { slug: sanitizedSlug };
        if (companyId) {
            whereCondition.NOT = { id: companyId };
        }

        const existingCompany = await getSharedPrismaClient().company.findFirst({
            where: whereCondition
        });

        res.json({
            success: true,
            available: !existingCompany,
            slug: sanitizedSlug,
            url: `https://${sanitizedSlug}.maxp-ai.pro`
        });

    } catch (error) {
        console.error('❌ Error checking slug availability:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ أثناء التحقق من توفر الاسم'
        });
    }
};

/**
 * 🖼️ Upload Company Logo
 */
const uploadCompanyLogo = async (req, res) => {
    try {
        const { companyId } = req.params;

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'لم يتم رفع أي ملف'
            });
        }

        // Verify company exists
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'الشركة غير موجودة'
            });
        }

        // Build logo URL
        const logoUrl = `/uploads/companies/${req.file.filename}`;

        // Update company with new logo
        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { logo: logoUrl }
        });

        res.json({
            success: true,
            message: 'تم رفع اللوجو بنجاح',
            data: {
                logo: logoUrl,
                fullUrl: `${req.protocol}://${req.get('host')}${logoUrl}`,
                company: {
                    id: updatedCompany.id,
                    name: updatedCompany.name,
                    logo: updatedCompany.logo
                }
            }
        });

    } catch (error) {
        console.error('❌ Error uploading company logo:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في رفع اللوجو',
            message: error.message
        });
    }
};

/**
 * 🚀 Bulk Update AI Engine for All Companies
 * Updates useModernAgent flag for all companies' AI settings
 */
const bulkUpdateAIEngine = async (req, res) => {
    try {
        const { useModernAgent } = req.body;

        if (useModernAgent === undefined) {
            return res.status(400).json({
                success: false,
                message: 'useModernAgent parameter is required'
            });
        }

        console.log(`🔄 [BULK-AI-ENGINE] Updating all companies to: ${useModernAgent ? 'Modern' : 'Legacy'}`);

        // Get all companies
        const companies = await getSharedPrismaClient().company.findMany({
            select: { id: true }
        });

        let updatedCount = 0;

        // Update each company's AI settings
        for (const company of companies) {
            try {
                await getSharedPrismaClient().aiSettings.upsert({
                    where: { companyId: company.id },
                    create: {
                        companyId: company.id,
                        useModernAgent
                    },
                    update: {
                        useModernAgent
                    }
                });
                updatedCount++;
            } catch (err) {
                console.error(`❌ Failed to update company ${company.id}:`, err.message);
            }
        }

        console.log(`✅ [BULK-AI-ENGINE] Updated ${updatedCount}/${companies.length} companies`);

        res.json({
            success: true,
            message: `تم تحديث ${updatedCount} شركة بنجاح`,
            updatedCount,
            totalCompanies: companies.length,
            engine: useModernAgent ? 'Modern (2026)' : 'Legacy (2023)'
        });

    } catch (error) {
        console.error('❌ Error in bulk AI engine update:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث إعدادات الذكاء الاصطناعي',
            error: error.message
        });
    }
};

const transferOwnership = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { targetUserId } = req.body;
        const currentUserId = req.user.id;

        console.log(`🔐 [OWNERSHIP] Transfer request initiated by ${currentUserId} for company ${companyId}`);

        // 1. Validate Target User exists in company
        const targetUserCompany = await getSharedPrismaClient().userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId: targetUserId,
                    companyId: companyId
                }
            }
        });

        if (!targetUserCompany) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود في هذه الشركة' });
        }

        if (targetUserCompany.userId === currentUserId) {
            return res.status(400).json({ success: false, message: 'لا يمكن نقل الملكية لنفسك' });
        }

        // 2. Perform Transfer via Transaction
        await getSharedPrismaClient().$transaction([
            // Downgrade current owner to COMPANY_ADMIN
            getSharedPrismaClient().userCompany.update({
                where: { userId_companyId: { userId: currentUserId, companyId } },
                data: { role: 'COMPANY_ADMIN' }
            }),
            // Upgrade target user to OWNER
            getSharedPrismaClient().userCompany.update({
                where: { userId_companyId: { userId: targetUserId, companyId } },
                data: { role: 'OWNER' }
            }),
            // Log the action
            getSharedPrismaClient().activityLog.create({
                data: {
                    userId: currentUserId,
                    companyId: companyId,
                    category: 'COMPANY',
                    action: 'TRANSFER_OWNERSHIP',
                    description: `Ownership transferred to user ${targetUserId}`,
                    targetType: 'COMPANY',
                    targetId: companyId,
                    severity: 'HIGH',
                    updatedAt: new Date()
                }
            })
        ]);

        console.log(`✅ [OWNERSHIP] Transfer successful to ${targetUserId}`);
        res.json({ success: true, message: 'تم نقل الملكية بنجاح' });

    } catch (error) {
        console.error('❌ Error transferring ownership:', error);
        res.status(500).json({ success: false, message: 'فشل عملية نقل الملكية', error: error.message });
    }
};

module.exports = {
    getCurrentCompany,
    REMOVEDDangerousFallbackEndpoint,
    companyUsageEndpoint,
    mockEndpoint,
    companyPlansEndpoint,
    getCompanyInfoEndpoint,
    safeUsageEndpoint,
    updateCompanyCurrency,
    getAllCompanies,
    createNewCompany,
    updateCompany,
    deleteCompany,
    getCompanyDetails,
    getCompanyUsers,
    getSingleUser,
    createnewUserForCompany,
    updateUser,
    updateMyProfile,
    deleteUser,
    createCustomRole,
    getCompanyRoles,
    updateCustomRole,
    deleteCustomRole,
    sendUserInvitation,
    getCompanyInvitations,
    cancelInvitation,
    resendInvitation,
    FrontendSpecificSafeEndpoint,
    updateCompanySlug,
    checkSlugAvailability,
    getUsersStatistics,
    uploadCompanyLogo,
    bulkUpdateAIEngine,
    transferOwnership
}
