const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const planLimitsService = require('../services/planLimitsService');
const { encrypt, decrypt } = require('../utils/encryption');
const { randomUUID } = require('crypto');

const safeJsonParse = (value) => {
    if (!value) return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
        return {};
    }
};

const getCompanyIdFromRequest = (req) => req?.user?.effectiveCompanyId || req?.user?.companyId;

const sanitizeLinkForResponse = (link) => {
    if (!link || typeof link !== 'object') return null;
    const { passwordEncrypted, ...rest } = link;
    return {
        ...rest,
        hasPassword: Boolean(passwordEncrypted)
    };
};

const companyDashboardOverview = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Get company info
        console.log(`🔍 [DASHBOARD] Fetching dashboard for companyId: ${companyId}`);
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
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

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Get plan limits
        const planLimits = {
            BASIC: {
                users: 5,
                customers: 1000,
                conversations: 5000,
                storage: 1024 // MB
            },
            PRO: {
                users: 25,
                customers: 10000,
                conversations: 25000,
                storage: 5120 // MB
            },
            ENTERPRISE: {
                users: -1, // unlimited
                customers: -1,
                conversations: -1,
                storage: -1
            }
        };

        const currentLimits = planLimits[company.plan] || planLimits.BASIC;

        // Map User to users for frontend compatibility
        const userCount = company._count.users || 0;

        // Calculate usage percentages
        const usage = {
            users: {
                current: userCount,
                limit: currentLimits.users,
                percentage: currentLimits.users === -1 ? 0 : Math.round((userCount / currentLimits.users) * 100)
            },
            customers: {
                current: company._count.customers,
                limit: currentLimits.customers,
                percentage: currentLimits.customers === -1 ? 0 : Math.round((company._count.customers / currentLimits.customers) * 100)
            },
            conversations: {
                current: company._count.conversations,
                limit: currentLimits.conversations,
                percentage: currentLimits.conversations === -1 ? 0 : Math.round((company._count.conversations / currentLimits.conversations) * 100)
            }
        };

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentStats = await Promise.all([
            getSharedPrismaClient().user.count({
                where: {
                    companyId,
                    createdAt: { gte: sevenDaysAgo }
                }
            }),
            getSharedPrismaClient().customer.count({
                where: {
                    companyId,
                    createdAt: { gte: sevenDaysAgo }
                }
            }),
            getSharedPrismaClient().conversation.count({
                where: {
                    companyId,
                    createdAt: { gte: sevenDaysAgo }
                }
            })
        ]);

        const dashboardData = {
            company: {
                id: company.id,
                name: company.name,
                plan: company.plan,
                currency: company.currency,
                isActive: company.isActive
            },
            counts: {
                users: userCount,
                customers: company._count.customers,
                products: company._count.products,
                orders: company._count.orders,
                conversations: company._count.conversations
            },
            usage,
            limits: currentLimits,
            recentActivity: {
                newUsers: recentStats[0],
                newCustomers: recentStats[1],
                newConversations: recentStats[2]
            }
        };

        res.json({
            success: true,
            message: 'تم جلب بيانات لوحة التحكم بنجاح',
            data: dashboardData
        });

    } catch (error) {
        console.error('❌ Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب بيانات لوحة التحكم',
            error: error.message
        });
    }
};

const companySettings = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                website: true,
                address: true,
                plan: true,
                currency: true,
                timezone: true,
                isActive: true,
                settings: true,
                useCentralKeys: true,
                createdAt: true
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Parse settings
        const settings = company.settings ? JSON.parse(company.settings) : {};

        res.json({
            success: true,
            message: 'تم جلب إعدادات الشركة بنجاح',
            data: {
                ...company,
                settings
            }
        });

    } catch (error) {
        console.error('❌ Error fetching company settings:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب إعدادات الشركة',
            error: error.message
        });
    }
};

const updateCompanySettings = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const {
            name,
            email,
            phone,
            website,
            address,
            settings,
            timezone
        } = req.body;

        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone !== undefined && { phone }),
                ...(website !== undefined && { website }),
                ...(address !== undefined && { address }),
                ...(settings && { settings: JSON.stringify(settings) }),
                ...(req.body.useCentralKeys !== undefined && { useCentralKeys: req.body.useCentralKeys }),
                ...(timezone && { timezone })
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                website: true,
                address: true,
                plan: true,
                currency: true,
                timezone: true,
                isActive: true,
                settings: true,
                updatedAt: true
            }
        });

        res.json({
            success: true,
            message: 'تم تحديث إعدادات الشركة بنجاح',
            data: {
                ...updatedCompany,
                settings: updatedCompany.settings ? JSON.parse(updatedCompany.settings) : {}
            }
        });

    } catch (error) {
        console.error('❌ Error updating company settings:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث إعدادات الشركة',
            error: error.message
        });
    }
};

// ==================== PLAN LIMITS ROUTES ====================

const checkPlanLimits = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Get current usage
        const usage = await planLimitsService.getCurrentUsage(companyId);
        const limits = planLimitsService.getPlanLimits(usage.plan);

        // Calculate usage percentages
        const usageData = {};
        for (const [type, currentCount] of Object.entries(usage)) {
            if (type === 'plan') continue;

            const limit = limits[type];
            usageData[type] = {
                current: currentCount,
                limit,
                percentage: limit === -1 ? 0 : Math.round((currentCount / limit) * 100),
                remaining: limit === -1 ? -1 : Math.max(0, limit - currentCount)
            };
        }

        // Get warnings
        const warnings = await planLimitsService.getUsageWarnings(companyId);

        // Get upgrade suggestions
        const upgradeSuggestions = planLimitsService.getUpgradeSuggestions(usage.plan);

        res.json({
            success: true,
            message: 'تم جلب حدود الخطة بنجاح',
            data: {
                plan: usage.plan,
                limits,
                usage: usageData,
                warnings,
                upgradeSuggestions
            }
        });

    } catch (error) {
        console.error('❌ Error fetching plan limits:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب حدود الخطة',
            error: error.message
        });
    }
}

const getCompanyLinks = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];

        res.json({
            success: true,
            message: 'تم جلب الروابط بنجاح',
            data: links.map(sanitizeLinkForResponse).filter(Boolean)
        });
    } catch (error) {
        console.error('❌ Error fetching company links:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب روابط الشركة',
            error: error.message
        });
    }
};

const createCompanyLink = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        const { name, url, username, password, openMode } = req.body || {};

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        if (!name || !url) {
            return res.status(400).json({
                success: false,
                message: 'اسم اللينك و URL مطلوبين'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];

        const now = new Date().toISOString();
        const id = typeof randomUUID === 'function' ? randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const link = {
            id,
            name: String(name),
            url: String(url),
            username: username ? String(username) : '',
            passwordEncrypted: password ? encrypt(String(password)) : null,
            openMode: openMode ? String(openMode) : 'new_tab',
            createdAt: now,
            updatedAt: now
        };

        settings.companyLinks = [...links, link];

        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { settings: JSON.stringify(settings) }
        });

        res.json({
            success: true,
            message: 'تم إضافة الرابط بنجاح',
            data: sanitizeLinkForResponse(link)
        });
    } catch (error) {
        console.error('❌ Error creating company link:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إضافة الرابط',
            error: error.message
        });
    }
};

const updateCompanyLink = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        const { linkId } = req.params;
        const { name, url, username, password, openMode } = req.body || {};

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        if (!linkId) {
            return res.status(400).json({
                success: false,
                message: 'linkId مطلوب'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];
        const idx = links.findIndex((l) => l && String(l.id) === String(linkId));

        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: 'الرابط غير موجود'
            });
        }

        const existing = links[idx];
        const now = new Date().toISOString();

        const next = {
            ...existing,
            ...(name !== undefined ? { name: String(name) } : {}),
            ...(url !== undefined ? { url: String(url) } : {}),
            ...(username !== undefined ? { username: String(username || '') } : {}),
            ...(openMode !== undefined ? { openMode: String(openMode || 'new_tab') } : {}),
            ...(password !== undefined
                ? { passwordEncrypted: password ? encrypt(String(password)) : null }
                : {}),
            updatedAt: now
        };

        const updatedLinks = [...links];
        updatedLinks[idx] = next;
        settings.companyLinks = updatedLinks;

        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { settings: JSON.stringify(settings) }
        });

        res.json({
            success: true,
            message: 'تم تحديث الرابط بنجاح',
            data: sanitizeLinkForResponse(next)
        });
    } catch (error) {
        console.error('❌ Error updating company link:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الرابط',
            error: error.message
        });
    }
};

const deleteCompanyLink = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        const { linkId } = req.params;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        if (!linkId) {
            return res.status(400).json({
                success: false,
                message: 'linkId مطلوب'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];
        const nextLinks = links.filter((l) => l && String(l.id) !== String(linkId));

        if (nextLinks.length === links.length) {
            return res.status(404).json({
                success: false,
                message: 'الرابط غير موجود'
            });
        }

        settings.companyLinks = nextLinks;

        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { settings: JSON.stringify(settings) }
        });

        res.json({
            success: true,
            message: 'تم حذف الرابط بنجاح'
        });
    } catch (error) {
        console.error('❌ Error deleting company link:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف الرابط',
            error: error.message
        });
    }
};

const getCompanyLinkPassword = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        const { linkId } = req.params;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        if (!linkId) {
            return res.status(400).json({
                success: false,
                message: 'linkId مطلوب'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];
        const link = links.find((l) => l && String(l.id) === String(linkId));

        if (!link) {
            return res.status(404).json({
                success: false,
                message: 'الرابط غير موجود'
            });
        }

        const password = link.passwordEncrypted ? decrypt(link.passwordEncrypted) : null;
        res.json({
            success: true,
            message: 'تم جلب كلمة المرور بنجاح',
            data: { password }
        });
    } catch (error) {
        console.error('❌ Error fetching company link password:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب كلمة المرور',
            error: error.message
        });
    }
};

const checkSpecificLimit = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { type, count = 1 } = req.body;

        if (!type) {
            return res.status(400).json({
                success: false,
                message: 'نوع الحد مطلوب'
            });
        }

        const checkResult = await planLimitsService.checkLimits(companyId, type, count);

        res.json({
            success: true,
            message: 'تم فحص الحد بنجاح',
            data: checkResult
        });

    } catch (error) {
        console.error('❌ Error checking limit:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في فحص الحد',
            error: error.message
        });
    }
}

const checkMultipleLimits = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { checks } = req.body;

        if (!checks || typeof checks !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'بيانات الفحص مطلوبة'
            });
        }

        const results = await planLimitsService.checkMultipleLimits(companyId, checks);

        res.json({
            success: true,
            message: 'تم فحص الحدود بنجاح',
            data: results
        });

    } catch (error) {
        console.error('❌ Error checking multiple limits:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في فحص الحدود',
            error: error.message
        });
    }
}

// Update AI Keys setting (useCentralKeys)
const updateAIKeysSetting = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { useCentralKeys } = req.body;

        if (typeof useCentralKeys !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'قيمة useCentralKeys يجب أن تكون true أو false'
            });
        }

        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { useCentralKeys },
            select: {
                id: true,
                name: true,
                useCentralKeys: true
            }
        });

        res.json({
            success: true,
            message: useCentralKeys
                ? 'تم تفعيل استخدام المفاتيح المركزية'
                : 'تم إلغاء تفعيل استخدام المفاتيح المركزية',
            data: {
                companyId: updatedCompany.id,
                companyName: updatedCompany.name,
                useCentralKeys: updatedCompany.useCentralKeys
            }
        });

    } catch (error) {
        console.error('❌ Error updating AI keys setting:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث إعداد المفاتيح',
            error: error.message
        });
    }
}

module.exports = {
    companyDashboardOverview,
    companySettings,
    updateCompanySettings,
    checkPlanLimits,
    checkMultipleLimits,
    checkSpecificLimit,
    updateAIKeysSetting,
    getCompanyLinks,
    createCompanyLink,
    updateCompanyLink,
    deleteCompanyLink,
    getCompanyLinkPassword
}
