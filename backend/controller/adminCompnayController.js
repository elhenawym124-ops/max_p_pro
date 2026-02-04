const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const getAllCompanies = async (req, res) => {
    try {
        const companies = await getSharedPrismaClient().company.findMany({
            include: {
                aiSettings: true,
                _count: {
                    select: {
                        User: true,
                        customers: true,
                        facebookPages: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            message: 'تم جلب الشركات بنجاح',
            data: { companies }
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
        const { companyId } = req.params;

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        isActive: true,
                        lastLoginAt: true,
                        createdAt: true
                    }
                },
                _count: {
                    select: {
                        User: true,
                        customers: true,
                        products: true,
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

        res.json({
            success: true,
            message: 'تم جلب بيانات الشركة بنجاح',
            data: { company }
        });

    } catch (error) {
        console.error('❌ Error fetching company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب بيانات الشركة',
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
            plan = 'BASIC',
            currency = 'EGP',
            adminFirstName,
            adminLastName,
            adminEmail,
            adminPassword
        } = req.body;

        // Validation
        if (!name || !email || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
            return res.status(400).json({
                success: false,
                message: 'جميع الحقول المطلوبة يجب ملؤها'
            });
        }

        // Check if company email already exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { email }
        });

        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'شركة بهذا البريد الإلكتروني موجودة بالفعل'
            });
        }

        // Check if admin email already exists
        const existingUser = await getSharedPrismaClient().user.findUnique({
            where: { email: adminEmail }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'مستخدم بهذا البريد الإلكتروني موجود بالفعل'
            });
        }

        // Create company
        const company = await getSharedPrismaClient().company.create({
            data: {
                name,
                email,
                phone,
                website,
                plan,
                currency,
                isActive: true,
                useCentralKeys: true, // ✅ تفعيل المفاتيح المركزية افتراضياً
                sidebarLayout: 'three-tier' // ✅ الوضع الحديث كافتراضي
            }
        });

        // Hash admin password
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Create admin user
        const adminUser = await getSharedPrismaClient().user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                firstName: adminFirstName,
                lastName: adminLastName,
                role: 'COMPANY_ADMIN',
                companyId: company.id,
                isActive: true,
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            }
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الشركة بنجاح',
            data: {
                company,
                adminUser: {
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName
                }
            }
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
        const { companyId } = req.params;
        const {
            name,
            email,
            phone,
            website,
            plan,
            currency,
            isActive
        } = req.body;

        console.log(req.body);
        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if email is being changed and already exists
        if (email && email !== existingCompany.email) {
            const emailExists = await getSharedPrismaClient().company.findUnique({
                where: { email }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'شركة بهذا البريد الإلكتروني موجودة بالفعل'
                });
            }
        }

        // Update company
        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(website !== undefined && { website }),
                ...(plan !== undefined && { plan }),
                ...(currency !== undefined && { currency }),
                ...(isActive !== undefined && { isActive })
            }
        });

        res.json({
            success: true,
            message: 'تم تحديث الشركة بنجاح',
            data: { company: updatedCompany }
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
        const { companyId } = req.params;

        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if company has any related data that might prevent deletion
        const companyData = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            include: {
                _count: {
                    select: {
                        User: true,
                        customers: true,
                        facebookPages: true,
                        products: true,
                        conversations: true
                    }
                }
            }
        });

        console.log(`Company data for deletion:`, companyData);

        // Delete company (cascade will handle related records)
        await getSharedPrismaClient().company.delete({
            where: { id: companyId }
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

const getCompanyFacebookPages = async (req, res) => {
    try {
        const { companyId } = req.params;
        console.log(`Fetching Facebook pages for company ID: ${companyId}`);

        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            console.log(`Company not found for ID: ${companyId}`);
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        console.log(`Company found: ${existingCompany.name}`);

        // Get Facebook pages for this company
        const facebookPages = await getSharedPrismaClient().facebookPage.findMany({
            where: { companyId: companyId },
            select: {
                id: true,
                pageId: true,
                pageName: true,
                status: true,
                connectedAt: true,
                disconnectedAt: true, // Added this field which exists in the model
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                connectedAt: 'desc'
            }
        });

        console.log(`Found ${facebookPages.length} Facebook pages for company ${companyId}`);
        res.json({
            success: true,
            message: 'تم جلب صفحات الفيسبوك بنجاح',
            data: facebookPages
        });

    } catch (error) {
        console.error('❌ Error fetching Facebook pages:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب صفحات الفيسبوك',
            error: error.message
        });
    }
};

const loginAsCompanyAdmin = async (req, res) => {
    try {
        const { companyId } = req.params;

        console.log('🚀 [LOGIN_AS_ADMIN] Start for companyId:', companyId);
        console.log('👤 [LOGIN_AS_ADMIN] Requesting User:', req.user);

        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            console.log('❌ [LOGIN_AS_ADMIN] Company not found');
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }
        console.log('✅ [LOGIN_AS_ADMIN] Company found:', existingCompany.name);

        // Find the company admin user
        const adminUser = await getSharedPrismaClient().user.findFirst({
            where: {
                companyId: companyId,
                role: 'COMPANY_ADMIN',
                isActive: true
            }
        });

        if (!adminUser) {
            console.log('❌ [LOGIN_AS_ADMIN] Admin user not found');
            return res.status(404).json({
                success: false,
                message: 'لم يتم العثور على مدير للشركة'
            });
        }
        console.log('✅ [LOGIN_AS_ADMIN] Admin user found:', adminUser.email);

        // Generate JWT token for the admin user
        const token = jwt.sign(
            {
                userId: adminUser.id,
                email: adminUser.email,
                role: adminUser.role,
                companyId: adminUser.companyId
            },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
            { expiresIn: '24h' }
        );
        console.log('✅ [LOGIN_AS_ADMIN] Token generated');

        // ✅ Log the impersonation event
        console.log('📝 [LOGIN_AS_ADMIN] Creating ActivityLog...');
        try {
            await getSharedPrismaClient().activityLog.create({
                data: {
                    userId: req.user.id, // Super Admin ID
                    companyId: existingCompany.id,
                    action: 'IMPERSONATE',
                    category: 'AUTH',
                    description: `Super Admin (${req.user.email}) logged in as Company Admin (${adminUser.email}) for company: ${existingCompany.name}`,
                    isSuccess: true,
                    severity: 'HIGH',
                    metadata: JSON.stringify({
                        targetAdminId: adminUser.id,
                        targetCompanyId: existingCompany.id,
                        superAdminEmail: req.user.email,
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.headers['user-agent']
                    })
                }
            });
            console.log('✅ [LOGIN_AS_ADMIN] ActivityLog created');
        } catch (logError) {
            console.error('⚠️ [LOGIN_AS_ADMIN] Failed to create ActivityLog:', logError);
            // Don't fail the request if logging fails, just continue
        }

        res.json({
            success: true,
            message: 'تم تسجيل الدخول كمدير الشركة بنجاح',
            data: {
                token,
                user: {
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    role: adminUser.role,
                    companyId: adminUser.companyId
                }
            }
        });

    } catch (error) {
        console.error('❌ Error logging in as company admin:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تسجيل الدخول كمدير الشركة',
            error: error.message
        });
    }
};

const bulkUpdateAIEngine = async (req, res) => {
    try {
        const { useModernAgent } = req.body;

        // Handle explicit boolean check
        if (typeof useModernAgent !== 'boolean') {
            return res.status(400).json({ success: false, message: 'useModernAgent must be a boolean' });
        }

        console.log('🔍 [BULK-DEBUG] Request Body:', req.body);
        console.log('🔄 [BULK-DEBUG] UseModernAgent:', useModernAgent, 'Type:', typeof useModernAgent);

        const prisma = getSharedPrismaClient();

        // Update all AI Settings
        const result = await prisma.aiSettings.updateMany({
            data: { useModernAgent: useModernAgent }
        });

        console.log('✅ [BULK-DEBUG] Update Result:', result);

        res.json({
            success: true,
            message: `تم تحديث نظام الذكاء الاصطناعي لجميع الشركات (${result.count} شركة)`,
            updatedCount: result.count
        });

    } catch (error) {
        console.error('❌ Error in bulk update:', error);
        res.status(500).json({ success: false, message: 'Failed to bulk update', error: error.message });
    }
};

const getStatistics = async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();

        const [
            totalCompanies,
            activeCompanies,
            totalUsers,
            totalCustomers,
            totalConversations,
            totalMessages,
            companiesByPlan
        ] = await Promise.all([
            prisma.company.count(),
            prisma.company.count({ where: { isActive: true } }),
            prisma.user.count(),
            prisma.customer.count(),
            prisma.conversation.count(),
            prisma.message.count(),
            prisma.company.groupBy({
                by: ['plan'],
                _count: { plan: true }
            })
        ]);

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            newCompaniesLast30Days,
            newUsersLast30Days,
            newCustomersLast30Days
        ] = await Promise.all([
            prisma.company.count({
                where: { createdAt: { gte: thirtyDaysAgo } }
            }),
            prisma.user.count({
                where: { createdAt: { gte: thirtyDaysAgo } }
            }),
            prisma.customer.count({
                where: { createdAt: { gte: thirtyDaysAgo } }
            })
        ]);

        res.json({
            success: true,
            message: 'تم جلب إحصائيات النظام بنجاح',
            data: {
                overview: {
                    totalCompanies,
                    activeCompanies,
                    inactiveCompanies: totalCompanies - activeCompanies,
                    totalUsers,
                    totalCustomers,
                    totalConversations,
                    totalMessages
                },
                planDistribution: companiesByPlan.reduce((acc, item) => {
                    acc[item.plan] = item._count.plan;
                    return acc;
                }, {}),
                recentActivity: {
                    newCompaniesLast30Days,
                    newUsersLast30Days,
                    newCustomersLast30Days
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الإحصائيات',
            error: error.message
        });
    }
};

const bulkDeleteCompanies = async (req, res) => {
    try {
        const { companyIds } = req.body;

        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب تحديد شركات للحذف'
            });
        }

        console.log(`🗑️ [BULK DELETE] Deleting ${companyIds.length} companies...`);

        // Use transaction or deleteMany
        // Note: Prisma cascade delete should be configured in schema, otherwise we might fail if relations exist without cascade.
        // Assuming database handles cascade or schema is set up correctly.

        const result = await getSharedPrismaClient().company.deleteMany({
            where: {
                id: {
                    in: companyIds
                }
            }
        });

        console.log(`✅ [BULK DELETE] Deleted ${result.count} companies`);

        res.json({
            success: true,
            message: `تم حذف ${result.count} شركة بنجاح`,
            data: { count: result.count }
        });

    } catch (error) {
        console.error('❌ Error in bulk delete:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف الشركات المحددة',
            error: error.message
        });
    }
};

const bulkUpdateCompanyStatus = async (req, res) => {
    try {
        const { companyIds, isActive } = req.body;

        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب تحديد شركات للتحديث'
            });
        }

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'حالة النشاط غير صحيحة'
            });
        }

        console.log(`🔄 [BULK STATUS] Updating ${companyIds.length} companies to isActive=${isActive}...`);

        const result = await getSharedPrismaClient().company.updateMany({
            where: {
                id: {
                    in: companyIds
                }
            },
            data: {
                isActive: isActive
            }
        });

        console.log(`✅ [BULK STATUS] Updated ${result.count} companies`);

        res.json({
            success: true,
            message: `تم تحديث حالة ${result.count} شركة بنجاح`,
            data: { count: result.count }
        });

    } catch (error) {
        console.error('❌ Error in bulk status update:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث حالة الشركات',
            error: error.message
        });
    }
};



const forceTransferOwnership = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { newOwnerEmail, targetUserId } = req.body;

        if (!newOwnerEmail && !targetUserId) {
            return res.status(400).json({ success: false, message: 'مطلوب البريد الإلكتروني أو معرف المالك الجديد' });
        }

        const prisma = getSharedPrismaClient();

        // 1. Find the company and current owner
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                users: {
                    where: { role: 'OWNER' }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
        }

        // 2. Find the new owner user
        let newOwnerUser;
        if (targetUserId) {
            newOwnerUser = await prisma.user.findUnique({
                where: { id: targetUserId }
            });
        } else {
            newOwnerUser = await prisma.user.findUnique({
                where: { email: newOwnerEmail }
            });
        }

        if (!newOwnerUser) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // Transaction to ensure data integrity
        await prisma.$transaction(async (tx) => {
            // 3. Downgrade current owner(s) to COMPANY_ADMIN
            if (company.users.length > 0) {
                const currentOwnerIds = company.users.map(u => u.id);

                // Update UserCompany records
                await tx.userCompany.updateMany({
                    where: {
                        companyId: companyId,
                        userId: { in: currentOwnerIds }
                    },
                    data: { role: 'COMPANY_ADMIN' }
                });
            }

            // 4. Assign new owner
            // Check if user is already in company
            const userCompany = await tx.userCompany.findUnique({
                where: {
                    userId_companyId: {
                        userId: newOwnerUser.id,
                        companyId: companyId
                    }
                }
            });

            if (userCompany) {
                // Update existing relation
                await tx.userCompany.update({
                    where: {
                        userId_companyId: {
                            userId: newOwnerUser.id,
                            companyId: companyId
                        }
                    },
                    data: { role: 'OWNER' }
                });
            } else {
                // Create new relation
                await tx.userCompany.create({
                    data: {
                        userId: newOwnerUser.id,
                        companyId: companyId,
                        role: 'OWNER',
                        isActive: true
                    }
                });
            }

            // Also update the main user role to OWNER if they are now an owner
            await tx.user.update({
                where: { id: newOwnerUser.id },
                data: { role: 'OWNER' }
            });
        });

        res.json({
            success: true,
            message: `تم نقل الملكية بنجاح إلى ${newOwnerEmail}`
        });

    } catch (error) {
        console.error('❌ Error transferring ownership:', error);
        res.status(500).json({ success: false, message: 'فشل في نقل الملكية', error: error.message });
    }
};

const addEmployeeToCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { firstName, lastName, email, password, role = 'COMPANY_ADMIN' } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
        }

        const prisma = getSharedPrismaClient();

        // Check company exists
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
        }

        // Check if user exists
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            // User exists, check if already in company
            const existingLink = await prisma.userCompany.findUnique({
                where: {
                    userId_companyId: {
                        userId: user.id,
                        companyId: companyId
                    }
                }
            });

            if (existingLink) {
                return res.status(400).json({ success: false, message: 'المستخدم موجود بالفعل في هذه الشركة' });
            }

            // Add to company
            await prisma.userCompany.create({
                data: {
                    userId: user.id,
                    companyId: companyId,
                    role: role,
                    isActive: true
                }
            });

        } else {
            // Create New User
            const hashedPassword = await bcrypt.hash(password, 12);
            user = await prisma.user.create({
                data: {
                    email,
                    firstName,
                    lastName,
                    password: hashedPassword,
                    role: 'COMPANY_ADMIN', // Default system role
                    companyId: companyId, // Set as default company
                    isActive: true,
                    isEmailVerified: true,
                    userCompanies: {
                        create: {
                            companyId: companyId,
                            role: role
                        }
                    }
                }
            });
        }

        res.json({
            success: true,
            message: 'تم إضافة الموظف بنجاح',
            data: { user }
        });

    } catch (error) {
        console.error('❌ Error adding employee:', error);
        res.status(500).json({ success: false, message: 'فشل في إضافة الموظف', error: error.message });
    }
};

module.exports = {
    getAllCompanies,
    getCompanyDetails,
    createNewCompany,
    updateCompany,
    deleteCompany,
    getCompanyFacebookPages,
    loginAsCompanyAdmin,
    bulkUpdateAIEngine,
    getStatistics,
    bulkDeleteCompanies,
    bulkUpdateCompanyStatus,
    forceTransferOwnership,
    addEmployeeToCompany
};
