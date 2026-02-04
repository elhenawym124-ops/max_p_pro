const { getSharedPrismaClient, safeQuery, executeWithRetry } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const devSettingsService = require('../services/devSettingsService');
const devTeamService = require('../services/devTeamService'); // Import new service
const imageCompressionService = require('../services/imageCompressionService');
const { getViewScopeFilter, logPermissionChange, getRoleLevel, normalizeRole } = require('../middleware/superAdminMiddleware');
const activityLogger = require('../services/activityLogger');
const { processImage, isProcessableImage } = require('../utils/imageProcessor');
const fileCleanupService = require('../services/fileCleanupService');
const moment = require('moment-timezone');

// ✅ FIX: Use lazy-loading pattern - don't call getSharedPrismaClient at module load time
const getPrisma = () => getSharedPrismaClient();

/**
 * 🎮 Calculate Level based on XP
 * Formula: Level = floor(sqrt(XP / 100)) + 1
 * This creates a progressive leveling system where higher levels require more XP
 */
const calculateLevel = (xp) => {
    if (xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

/**
 * 🎯 Calculate XP for a task based on leaderboard settings
 * @param {Object} task - Task object with type, priority, estimatedHours, createdAt, and completedAt
 * @param {Object} leaderboardSettings - Settings from DevSystemSettings
 * @returns {number} - Calculated XP
 */
const triggerImageCompression = async (req, res) => {
    try {
        const status = imageCompressionService.getStatus();
        if (status.isRunning) {
            return res.status(400).json({ success: false, message: 'Compression is already running' });
        }

        // Fire and forget - run in background
        imageCompressionService.runCompression().catch(err => {
            console.error('Background compression error:', err);
        });

        res.json({ success: true, message: 'Compression started in background' });
    } catch (error) {
        console.error('Error starting compression:', error);
        res.status(500).json({ success: false, message: 'Failed to start compression' });
    }
};

const getImageCompressionStatus = async (req, res) => {
    try {
        const status = imageCompressionService.getStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get status' });
    }
};

const calculateTaskXP = async (task) => {
    try {
        const settings = await devSettingsService.getSettings();
        const leaderboardSettings = settings.leaderboardSettings || {
            baseXP: 10,
            taskTypeScores: {
                'BUG': 15,
                'FEATURE': 20,
                'ENHANCEMENT': 10,
                'HOTFIX': 25,
                'REFACTOR': 15,
                'SECURITY': 30,
                'DOCUMENTATION': 5,
                'TESTING': 8,
                'PERFORMANCE': 20,
                'MAINTENANCE': 5
            },
            priorityScores: {
                'CRITICAL': 20,
                'URGENT': 20,
                'HIGH': 15,
                'MEDIUM': 5,
                'LOW': 0
            },
            timeBasedScoring: {
                enabled: true,
                earlyCompletionBonus: 20,
                onTimeBonus: 10,
                lateCompletionPenalty: 15,
                maxBonusPercent: 50,
                maxPenaltyPercent: 30
            }
        };

        // Base calculation
        let xp = leaderboardSettings.baseXP || 10;
        xp += (leaderboardSettings.taskTypeScores[task.type] || 5);
        xp += (leaderboardSettings.priorityScores[task.priority] || 0);

        // Time-based scoring
        if (leaderboardSettings.timeBasedScoring?.enabled && task.estimatedHours > 0) {
            const actualHours = calculateActualHours(task);
            const estimatedHours = task.estimatedHours;

            if (actualHours > 0) {
                const timeRatio = actualHours / estimatedHours;
                let timeMultiplier = 0;

                if (timeRatio <= 0.9) {
                    // Early completion (finished in 90% or less of estimated time)
                    const earlyBonus = leaderboardSettings.timeBasedScoring.earlyCompletionBonus || 20;
                    timeMultiplier = Math.min(earlyBonus, leaderboardSettings.timeBasedScoring.maxBonusPercent || 50);
                } else if (timeRatio <= 1.1) {
                    // On time (within 10% of estimate)
                    timeMultiplier = leaderboardSettings.timeBasedScoring.onTimeBonus || 10;
                } else {
                    // Late completion
                    const latePenalty = leaderboardSettings.timeBasedScoring.lateCompletionPenalty || 15;
                    timeMultiplier = -Math.min(latePenalty, leaderboardSettings.timeBasedScoring.maxPenaltyPercent || 30);
                }

                const timeBonus = Math.round((xp * timeMultiplier) / 100);
                xp += timeBonus;

                console.log(`⏱️ [calculateTaskXP] Task ${task.id}: Estimated=${estimatedHours}h, Actual=${actualHours.toFixed(2)}h, Ratio=${timeRatio.toFixed(2)}, Bonus=${timeBonus} XP`);
            }
        }

        // Ensure minimum XP of 1
        return Math.max(1, Math.round(xp));
    } catch (error) {
        console.error('❌ [calculateTaskXP] Error:', error);
        return 10;
    }
};

/**
 * ⏱️ Calculate actual hours spent on a task
 * @param {Object} task - Task object with createdAt and updatedAt
 * @returns {number} - Hours spent
 */
const calculateActualHours = (task) => {
    try {
        // If task has time logs, use them
        if (task.dev_time_logs && task.dev_time_logs.length > 0) {
            const totalMinutes = task.dev_time_logs.reduce((sum, log) => sum + (log.duration || 0), 0);
            return totalMinutes / 60;
        }

        // Otherwise, calculate from creation to completion
        const createdAt = new Date(task.createdAt);
        const completedAt = new Date(task.updatedAt); // updatedAt when status changed to DONE
        const diffMs = completedAt - createdAt;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Cap at reasonable maximum (e.g., 720 hours = 30 days)
        return Math.min(diffHours, 720);
    } catch (error) {
        console.error('❌ [calculateActualHours] Error:', error);
        return 0;
    }
};

/**
 * 🎮 Update Member XP and Level
 */
const updateMemberXP = async (memberId, xpGained) => {
    try {
        // Get current member to calculate new level
        const member = await getPrisma().devTeamMember.findUnique({
            where: { id: memberId },
            select: { xp: true }
        });

        if (!member) {
            console.warn(`⚠️ [updateMemberXP] Member ${memberId} not found`);
            return;
        }

        const newXP = member.xp + xpGained;
        const newLevel = calculateLevel(newXP);

        // Update XP and Level
        await getPrisma().devTeamMember.update({
            where: { id: memberId },
            data: {
                xp: newXP,
                level: newLevel
            }
        });

        console.log(`🎮 [updateMemberXP] Member ${memberId}: +${xpGained} XP (Total: ${newXP}, Level: ${newLevel})`);
    } catch (error) {
        console.error('❌ [updateMemberXP] Error:', error);
        throw error;
    }
};

// Helper removed: Use devTeamService.getOrCreateMember instead

const { getLeaderboard } = require('./gamificationController');

/**
 * Get AI Usage Logs for Super Admin
 * Supports pagination, filtering by company, date range, key name, and model.
 */
const getAiLogs = async (req, res) => {
    try {
        console.log('👑 [SUPER-ADMIN] getAiLogs called with query:', req.query); // Debug Log
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { companyId, startDate, endDate, keyName, modelUsed, search } = req.query;

        const where = {};

        if (companyId) {
            where.companyId = companyId;
        }

        if (keyName) {
            where.keyName = { contains: keyName };
        }

        if (modelUsed) {
            where.modelUsed = { contains: modelUsed };
        }

        // Search in user message or AI response
        if (search) {
            where.OR = [
                { userMessage: { contains: search } },
                { aiResponse: { contains: search } },
                { keyName: { contains: search } }
            ];
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }

        // Get total count for pagination
        const total = await executeWithRetry(async () => {
            return await getPrisma().aiInteraction.count({ where });
        });

        // Get logs with relation to Company
        const logs = await executeWithRetry(async () => {
            return await getPrisma().aiInteraction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    company: {
                        select: { name: true, email: true }
                    }
                }
            });
        });

        // Map 'company' back to 'company' (no change needed now, but keep structure for compatibility)
        const mappedLogs = logs.map(log => ({
            ...log,
            company: log.company,
            companies: undefined
        }));

        res.status(200).json({
            success: true,
            data: mappedLogs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });

    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching AI logs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch AI logs', error: error.message });
    }
};

/**
 * Get AI Key Usage Statistics
 * Returns aggregated usage stats per key
 */
const getKeyUsageStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Logic to aggregate stats if needed in future
        // For now, simpler implementation
        res.status(200).json({ success: true, message: "Not implemented yet" });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

/**
 * Get all Super Admin users (Dashboard Admin Users Only)
 * Supports pagination and filtering
 * ✅ FIX: Only shows HIGH-LEVEL ADMIN ROLES for Super Admin Dashboard
 * This is NOT the same as getDevTeam - this is specifically for dashboard admins
 * Shows only: SUPER_ADMIN, Project Manager, Team Lead, Developer, Tester
 * Does NOT show: Agent, AGENT (these are regular employees, not dashboard admins)
 * Does NOT show: COMPANY_ADMIN (these are company admins, not system admins)
 */
const getSuperAdminUsers = async (req, res) => {
    try {
        console.log('👑 [SUPER-ADMIN-USERS] getSuperAdminUsers called with query:', req.query);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const skip = (page - 1) * limit;
        const { search, isActive } = req.query;

        // ✅ FIX: Define core SYSTEM-LEVEL roles only
        // These are roles that manage the software itself, not the companies
        let adminRoles = ['SUPER_ADMIN', 'Project Manager', 'Team Lead', 'Developer', 'Tester'];

        // Roles that should NEVER appear in the global system user list (these belong to companies)
        const tenantRoles = ['OWNER', 'COMPANY_ADMIN', 'AGENT', 'Agent'];

        // Try to get additional roles from settings, but strictly filter out tenant roles
        try {
            const settings = await devSettingsService.getSettings();
            if (settings.permissions) {
                const dynamicRoles = Object.keys(settings.permissions);
                // Add dynamic roles but exclude anything that looks like a tenant role
                const filteredRoles = dynamicRoles.filter(r =>
                    !tenantRoles.includes(r) && !adminRoles.includes(r)
                );
                adminRoles = [...adminRoles, ...filteredRoles];
            }
        } catch (e) {
            console.warn('⚠️ [SUPER-ADMIN-USERS] Could not load dynamic roles, using defaults');
        }

        console.log('🔑 [SUPER-ADMIN-USERS] Filtered System Admin roles:', adminRoles);

        // ✅ FIX: Base filter conditions for INTERNAL SYSTEM STAFF ONLY
        // We only want to see people who are part of the "mother ship" (system devs/admins)
        // Retrieve current user's companyId to identifying the System/Main Company
        const currentUserCompanyId = req.user?.companyId;

        const roleFilterConditions = [
            // 1. Users with explicitly assigned high-level system roles
            {
                role: {
                    in: adminRoles
                }
            },
            // 2. Any user who has been explicitly added to the Dev Team (Staff)
            {
                devTeamMember: {
                    isNot: null
                }
            }
        ];

        // 3. If we are in the System/Main Company, also show members of this company 
        // (both those who have it as Primary AND those linked via UserCompany)
        // BUT strictly exclude regular Agents who are not in the Dev Team or don't have higher roles
        if (currentUserCompanyId) {
            const systemCompanyCondition = {
                AND: [
                    {
                        OR: [
                            { companyId: currentUserCompanyId },
                            {
                                userCompanies: {
                                    some: {
                                        companyId: currentUserCompanyId
                                    }
                                }
                            }
                        ]
                    },
                    {
                        role: {
                            notIn: tenantRoles
                        }
                    }
                ]
            };
            roleFilterConditions.push(systemCompanyCondition);
        }

        // Build the where clause
        const where = {
            OR: roleFilterConditions
        };

        // Add search filter if provided
        if (search) {
            const searchCondition = {
                OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { email: { contains: search } }
                ]
            };

            // Combine the role filter with search using AND
            where.AND = [
                {
                    OR: roleFilterConditions  // Keep the existing OR conditions
                },
                searchCondition
            ];
            // Remove the OR field from root level when using AND
            delete where.OR;
        }

        // Add active status filter if provided
        if (isActive !== undefined) {
            // If we're using AND (with search), add isActive to the existing AND array
            if (where.AND) {
                where.AND.push({
                    isActive: isActive === 'true'
                });
            } else {
                // Otherwise, add it directly to where
                where.isActive = isActive === 'true';
            }
        }

        // ✅ FIX: Dashboard admin users should see ALL other dashboard admin users regardless of companyId
        // Don't filter by companyId - dashboard admins have system-wide access
        // This is different from getDevTeam which includes all system users

        const [users, total] = await Promise.all([
            getPrisma().user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
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
                    createdAt: true,
                    updatedAt: true,
                    skills: true,
                    department: true,
                    availability: true,
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    },
                    userCompanies: {
                        include: {
                            company: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true
                                }
                            }
                        }
                    }
                }
            }),
            getPrisma().user.count({ where })
        ]);

        console.log('✅ [SUPER-ADMIN-USERS] Found', users.length, 'users out of', total);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching super admin users:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب مستخدمي السوبر أدمن',
            error: error.message
        });
    }
};

/**
 * Create a new Super Admin user
 */
const createSuperAdminUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, isActive = true, role, skills, department, availability } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'الاسم الأول والأخير والبريد الإلكتروني وكلمة المرور مطلوبة'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
            });
        }

        // Check if email already exists
        const existingUser = await getPrisma().user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مستخدم بالفعل'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create super admin user
        const newUser = await getPrisma().user.create({
            data: {
                firstName,
                lastName,
                email: email.toLowerCase(),
                password: hashedPassword,
                phone: phone || null,
                role: role || 'Agent', // 🔐 FIX: Default to lowest role instead of SUPER_ADMIN
                skills: skills || null,
                department: department || null,
                availability: availability || 'available',
                isActive,
                isEmailVerified: true,
                companyId: req.user.companyId || null
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                skills: true,
                department: true,
                availability: true,
                isActive: true,
                isEmailVerified: true,
                createdAt: true
            }
        });

        // 📝 Audit Log: User creation
        await logPermissionChange('USER_CREATED', req.user.id, newUser.id, {
            createdBy: req.user.email,
            newUserEmail: newUser.email,
            assignedRole: newUser.role
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء مستخدم السوبر أدمن بنجاح',
            data: newUser
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error creating super admin user:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء مستخدم السوبر أدمن',
            error: error.message
        });
    }
};

/**
 * Update a Super Admin user - 🔐 WITH AUDIT LOGGING
 */
const updateSuperAdminUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, password, phone, isActive, role, skills, department, availability } = req.body;

        // Check if user exists
        const existingUser = await getPrisma().user.findUnique({
            where: { id }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // 🔐 FIX: Prevent editing users with higher role than yours (except SUPER_ADMIN)
        if (req.user.role !== 'SUPER_ADMIN') {
            const currentUserLevel = getRoleLevel(req.user.role);
            const targetUserLevel = getRoleLevel(existingUser.role);

            if (targetUserLevel >= currentUserLevel) {
                return res.status(403).json({
                    success: false,
                    message: 'لا يمكنك تعديل مستخدم بدور أعلى من أو مساوي لدورك'
                });
            }
        }

        // Check if email is being changed and if it's already taken
        if (email && email.toLowerCase() !== existingUser.email) {
            const emailTaken = await getPrisma().user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (emailTaken) {
                return res.status(400).json({
                    success: false,
                    message: 'البريد الإلكتروني مستخدم بالفعل'
                });
            }
        }

        // Prepare update data & track changes for audit
        const updateData = {};
        const changes = {};

        if (firstName && firstName !== existingUser.firstName) {
            updateData.firstName = firstName;
            changes.firstName = { from: existingUser.firstName, to: firstName };
        }
        if (lastName && lastName !== existingUser.lastName) {
            updateData.lastName = lastName;
            changes.lastName = { from: existingUser.lastName, to: lastName };
        }
        if (email && email.toLowerCase() !== existingUser.email) {
            updateData.email = email.toLowerCase();
            changes.email = { from: existingUser.email, to: email.toLowerCase() };
        }
        if (phone !== undefined && phone !== existingUser.phone) {
            updateData.phone = phone || null;
            changes.phone = { from: existingUser.phone, to: phone || null };
        }
        if (isActive !== undefined && isActive !== existingUser.isActive) {
            updateData.isActive = isActive;
            changes.isActive = { from: existingUser.isActive, to: isActive };
        }
        if (role !== undefined && role !== existingUser.role) {
            updateData.role = role;
            changes.role = { from: existingUser.role, to: role };
        }
        if (skills !== undefined) {
            updateData.skills = skills;
        }
        if (department !== undefined) {
            updateData.department = department;
        }
        if (availability !== undefined) {
            updateData.availability = availability;
        }

        // Hash password if provided
        if (password) {
            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
                });
            }
            updateData.password = await bcrypt.hash(password, 12);
            changes.password = { changed: true };
        }

        // Update user
        const updatedUser = await getPrisma().user.update({
            where: { id },
            data: updateData,
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
                updatedAt: true
            }
        });

        // 📝 Audit Log: User update
        if (Object.keys(changes).length > 0) {
            await logPermissionChange('USER_UPDATED', req.user.id, id, {
                updatedBy: req.user.email,
                targetUserEmail: existingUser.email,
                changes: changes
            });
        }

        res.status(200).json({
            success: true,
            message: 'تم تحديث مستخدم السوبر أدمن بنجاح',
            data: updatedUser
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error updating super admin user:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث مستخدم السوبر أدمن',
            error: error.message
        });
    }
};

/**
 * Delete a Super Admin user
 */
const deleteSuperAdminUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const existingUser = await getPrisma().user.findUnique({
            where: { id }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // 🔐 FIX: Role hierarchy check for deletion
        if (req.user.role !== 'SUPER_ADMIN') {
            const currentUserLevel = getRoleLevel(req.user.role);
            const targetUserLevel = getRoleLevel(existingUser.role);

            if (targetUserLevel >= currentUserLevel) {
                return res.status(403).json({
                    success: false,
                    message: 'لا يمكنك حذف مستخدم بدور أعلى من أو مساوي لدورك'
                });
            }
        }

        // 🔐 Protection for SUPER_ADMIN targets
        if (existingUser.role === 'SUPER_ADMIN') {
            // Only another SUPER_ADMIN can delete a SUPER_ADMIN
            if (req.user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'لا يمكنك حذف مستخدم سوبر أدمن'
                });
            }

            // Prevent deleting the last active super admin
            const superAdminCount = await getPrisma().user.count({
                where: { role: 'SUPER_ADMIN', isActive: true }
            });

            if (superAdminCount <= 1 && existingUser.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'لا يمكن حذف آخر سوبر أدمن نشط في النظام'
                });
            }
        }

        // 🗑️ Delete user completely from database (not just from system company)
        const prisma = getPrisma();

        console.log(`🗑️ [DELETE-USER] Starting COMPLETE deletion process for user: ${id}`);
        console.log(`📧 User email: ${existingUser.email}`);
        console.log(`🎭 User role: ${existingUser.role}`);

        // Delete all related records in order (most dependent first)

        // 1. Task-related records
        await prisma.taskActivity.deleteMany({ where: { userId: id } });
        await prisma.taskAttachment.deleteMany({ where: { userId: id } });
        await prisma.taskChecklistItem.deleteMany({ where: { completedBy: id } });
        await prisma.taskComment.deleteMany({ where: { userId: id } });
        await prisma.taskNotification.deleteMany({ where: { userId: id } });
        await prisma.taskWatcher.deleteMany({ where: { userId: id } });
        console.log(`✅ Deleted task-related records`);

        // 2. Time tracking
        await prisma.timeEntry.deleteMany({ where: { userId: id } });
        console.log(`✅ Deleted time entries`);

        // 3. Support tickets
        await prisma.supportMessage.deleteMany({ where: { senderId: id } });
        await prisma.supportTicket.updateMany({
            where: { assignedUserId: id },
            data: { assignedUserId: null }
        });
        // Note: userId in SupportTicket has onDelete: Cascade, so tickets will be deleted automatically
        console.log(`✅ Updated support tickets`);

        // 4. HR-related records
        await prisma.attendance.deleteMany({ where: { userId: id } });
        await prisma.shiftAssignment.deleteMany({ where: { userId: id } });
        await prisma.hRAuditLog.deleteMany({ where: { actorId: id } });
        console.log(`✅ Deleted HR records`);

        // 5. Rewards & Kudos
        await prisma.rewardRecord.deleteMany({ where: { userId: id } });
        await prisma.rewardEligibilityLog.deleteMany({ where: { userId: id } });
        await prisma.kudos.deleteMany({ where: { OR: [{ fromUserId: id }, { toUserId: id }] } });
        console.log(`✅ Deleted rewards records`);

        // 6. Other relations
        await prisma.activity.deleteMany({ where: { userId: id } });
        await prisma.customerNote.deleteMany({ where: { authorId: id } });
        await prisma.callAttemptLog.deleteMany({ where: { userId: id } });
        await prisma.returnActivityLog.deleteMany({ where: { userId: id } });
        await prisma.returnContactAttempt.deleteMany({ where: { userId: id } });
        await prisma.clearanceChecklist.updateMany({ where: { completedBy: id }, data: { completedBy: null } });
        console.log(`✅ Deleted other user records`);

        // 7. Image & Text galleries
        await prisma.imageGallery.deleteMany({ where: { userId: id } });
        await prisma.imageStudioHistory.deleteMany({ where: { userId: id } });
        await prisma.textGallery.deleteMany({ where: { userId: id } });
        console.log(`✅ Deleted gallery records`);

        // 8. DevTeamMember
        await prisma.devTeamMember.deleteMany({ where: { userId: id } });
        console.log(`✅ Deleted DevTeamMember records`);

        // 9. UserCompany relations
        await prisma.userCompany.deleteMany({ where: { userId: id } });
        console.log(`✅ Deleted UserCompany relations`);

        // 10. ActivityLogs & Notifications
        await prisma.activityLog.deleteMany({ where: { userId: id } });
        await prisma.notification.deleteMany({ where: { userId: id } });
        console.log(`✅ Deleted ActivityLogs & Notifications`);

        // 11. Delete Tasks assigned to or created by user
        await prisma.task.deleteMany({ where: { OR: [{ assignedTo: id }, { createdBy: id }] } });
        console.log(`✅ Deleted tasks`);

        // Delete user
        await prisma.user.delete({
            where: { id }
        });

        // 📝 Audit Log: User deletion
        await logPermissionChange('USER_DELETED', req.user.id, id, {
            deletedBy: req.user.email,
            targetUserEmail: existingUser.email,
            targetUserRole: existingUser.role
        });

        // 📝 Activity Log
        await activityLogger.logActivity({
            userId: req.user.id,
            companyId: req.user.companyId,
            action: 'delete_super_admin_user',
            entityType: 'user',
            entityId: id,
            details: {
                deletedUserEmail: existingUser.email,
                deletedUserRole: existingUser.role
            }
        });

        res.status(200).json({
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error deleting admin user:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف المستخدم',
            error: error.message
        });
    }
};

/**
 * Get Dev Dashboard Data (Tasks & Stats)
 */
const getDevDashboard = async (req, res) => {
    try {
        const userId = req.user.id;

        // Parallelize queries for performance
        // 🎯 Filter: Show only active tasks (exclude DONE status) for cleaner stats
        const activeTasksFilter = { status: { not: 'DONE' } };

        const [
            totalTasks,
            overdueTasks,
            activeProjects,
            teamMembers,
            tasksByStatusRaw,
            tasksByPriorityRaw,
            tasksByTypeRaw,
            recentTasks,
            upcomingReleases,
            myTasks
        ] = await Promise.all([
            safeQuery(() => getPrisma().devTask.count({ where: activeTasksFilter })),
            safeQuery(() => getPrisma().devTask.count({
                where: {
                    dueDate: { lt: new Date() },
                    status: { not: 'DONE' }
                }
            })),
            safeQuery(() => getPrisma().devProject.count({ where: { status: 'ACTIVE' } })),
            safeQuery(() => getPrisma().devTeamMember.count()),
            safeQuery(() => getPrisma().devTask.groupBy({
                by: ['status'],
                where: activeTasksFilter,
                _count: { status: true }
            })),
            safeQuery(() => getPrisma().devTask.groupBy({
                by: ['priority'],
                where: activeTasksFilter,
                _count: { priority: true }
            })),
            safeQuery(() => getPrisma().devTask.groupBy({
                by: ['type'],
                where: activeTasksFilter,
                _count: { type: true }
            })),
            safeQuery(() => getPrisma().devTask.findMany({
                where: activeTasksFilter,
                take: 10,
                orderBy: { updatedAt: 'desc' },
                include: {
                    dev_project: { select: { name: true, color: true } },
                    dev_team_members_dev_tasks_assigneeIdTodev_team_members: {
                        include: {
                            user: { select: { firstName: true, lastName: true, avatar: true } }
                        }
                    }
                }
            })),
            safeQuery(() => getPrisma().devRelease.findMany({
                where: {
                    status: { not: 'RELEASED' }
                },
                take: 5,
                orderBy: { releaseDate: 'asc' },
                include: {
                    dev_project: { select: { name: true } },
                    _count: { select: { dev_tasks: true } }
                }
            })),
            safeQuery(() => getPrisma().devTask.count({
                where: {
                    dev_team_members_dev_tasks_assigneeIdTodev_team_members: { userId: userId },
                    status: { not: 'DONE' }
                }
            }))
        ]);

        // Transform groupBy results to simple objects
        const tasksByStatus = tasksByStatusRaw.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.status }), {});
        const tasksByPriority = tasksByPriorityRaw.reduce((acc, curr) => ({ ...acc, [curr.priority]: curr._count.priority }), {});
        const tasksByType = tasksByTypeRaw.reduce((acc, curr) => ({ ...acc, [curr.type]: curr._count.type }), {});

        // Transform recent tasks
        const formattedRecentTasks = recentTasks.map(task => ({
            id: task.id,
            title: task.title,
            type: task.type,
            status: task.status,
            priority: task.priority,
            assigneeName: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members?.users ? `${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.users.firstName} ${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.users.lastName}` : null,
            assigneeAvatar: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members?.users?.avatar || null,
            projectName: task.dev_project?.name || null,
            projectColor: task.dev_project?.color || null,
            updatedAt: task.updatedAt
        }));

        // Formatted upcoming releases
        const formattedReleases = upcomingReleases.map(release => ({
            id: release.id,
            version: release.version,
            name: release.name,
            status: release.status,
            releaseDate: release.releaseDate,
            projectName: release.dev_project?.name || null,
            tasksCount: release._count.dev_tasks
        }));

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalTasks,
                    myTasks,
                    overdueTasks,
                    activeProjects,
                    teamMembers
                },
                tasksByStatus,
                tasksByPriority,
                tasksByType,
                recentTasks: formattedRecentTasks,
                upcomingReleases: formattedReleases
            }
        });

    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching dev dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dev dashboard data',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get Dev Projects
 */
// Helper to parse tags
const parseTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    try {
        return JSON.parse(tags);
    } catch (e) {
        return tags.includes(',') ? tags.split(',') : [tags];
    }
};

const getDevProjects = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const projects = await safeQuery(() => getPrisma().devProject.findMany({
            skip,
            take: limit,
            orderBy: { updatedAt: 'desc' },
            include: {
                dev_team_members_dev_projects_managerIdTodev_team_members: {
                    include: {
                        users: {
                            select: { firstName: true, lastName: true, email: true, avatar: true }
                        }
                    }
                },
                _count: {
                    select: { dev_tasks: true }
                }
            }
        }));

        const total = await safeQuery(() => getPrisma().devProject.count());

        // Parse tags safely
        const safeProjects = projects.map(p => ({
            ...p,
            tags: parseTags(p.tags)
        }));

        res.status(200).json({
            success: true,
            data: safeProjects,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching dev projects:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch projects',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get Dev Tasks - 🔐 NOW WITH viewScope ENFORCEMENT
 */
const getDevTasks = async (req, res) => {
    console.log(`🚀 [HIT] getDevTasks at ${new Date().toISOString()}`);
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { status, priority, projectId, type, assigneeId, search, excludeStatus, component, releaseId, tags, dateType, dueDateFrom, dueDateTo } = req.query;

        // 🔐 FIX: Apply viewScope filter based on user permissions
        const viewScopeFilter = await getViewScopeFilter(req);
        console.log(`🔒 [getDevTasks] User: ${req.user?.email}, Role: ${req.user?.role}`);
        console.log(`🔒 [getDevTasks] viewScope filter:`, JSON.stringify(viewScopeFilter, null, 2));

        const where = { ...viewScopeFilter };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (projectId) where.projectId = projectId;
        if (type) where.type = type;

        // New Filters
        if (component) where.component = component; // Assuming exact match or add mode: 'insensitive' if using equals
        if (releaseId) where.releaseId = releaseId;

        // Exclude status (for hiding completed tasks) - ONLY IF status is not explicitly requested
        // Fix: Previously this overwrote where.status!
        if (excludeStatus && !status) {
            const excludeStatusUpper = excludeStatus.toUpperCase();
            console.log(`🔍 [getDevTasks] Excluding status: ${excludeStatusUpper}`);
            where.status = { not: excludeStatusUpper };
        }

        // Tags Filter (Simple text containment)
        if (tags) {
            console.log(`🏷️ [getDevTasks] Filtering by tags: ${tags}`);
            // If tags come as comma-separated string "tag1,tag2"
            const tagsList = tags.split(',').map(t => t.trim()).filter(Boolean);
            if (tagsList.length > 0) {
                where.AND = [
                    ...(where.AND || []),
                    ...tagsList.map(tag => ({
                        tags: { contains: tag } // Default to strict contains. Prisma on MySQL is case insensitive by default for strings.
                    }))
                ];
            }
        }

        // Date Range Filter
        if (dueDateFrom || dueDateTo) {
            const dateField = dateType || 'dueDate'; // Default to dueDate if not specified
            console.log(`📅 [getDevTasks] Date Filter: ${dateField} from ${dueDateFrom} to ${dueDateTo}`);
            const dateFilter = {};
            if (dueDateFrom) dateFilter.gte = new Date(dueDateFrom);
            if (dueDateTo) dateFilter.lte = new Date(dueDateTo);

            where[dateField] = dateFilter;
        }

        if (assigneeId) {
            if (assigneeId === 'me') {
                const teamMember = await getPrisma().devTeamMember.findFirst({
                    where: { userId: req.user.id }
                });
                if (teamMember) {
                    where.assigneeId = teamMember.id;
                } else {
                    // If user is not a team member, they should see no tasks when filtered by 'me'
                    where.assigneeId = 'none';
                }
            } else {
                where.assigneeId = assigneeId;
            }
        }

        // Duplicate block removed

        console.log(`🔒 [getDevTasks] Final where clause:`, JSON.stringify(where, null, 2));

        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { title: { contains: search } },
                        { description: { contains: search } }
                    ]
                }
            ];
        }

        // 🔐 DEBUG: Log before query
        const taskCountBefore = await getPrisma().devTask.count();
        console.log(`🔍 [getDevTasks] Total tasks in DB: ${taskCountBefore}`);

        const tasks = await getPrisma().devTask.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                dev_team_members_dev_tasks_assigneeIdTodev_team_members: {
                    include: {
                        users: {
                            select: { firstName: true, lastName: true, avatar: true }
                        }
                    }
                },
                dev_project: {
                    select: { name: true, color: true }
                },
                dev_team_members_dev_tasks_reporterIdTodev_team_members: {
                    include: {
                        users: {
                            select: { firstName: true, lastName: true, avatar: true }
                        }
                    }
                }
            }
        });

        const total = await getPrisma().devTask.count({ where });

        console.log(`🔍 [getDevTasks] Tasks returned: ${tasks.length} out of ${total} (filtered from ${taskCountBefore} total)`);
        if (tasks.length > 0) {
            console.log(`🔍 [getDevTasks] First task assigneeId: ${tasks[0].assigneeId}`);
        }

        const safeTasks = tasks.map(task => ({
            ...task,
            tags: task.tags ? parseTags(task.tags) : [],
            projectName: task.dev_project?.name || null,
            projectColor: task.dev_project?.color || null,
            assigneeName: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members?.users ? `${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.users.firstName} ${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.users.lastName}` : null,
            assigneeAvatar: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members?.users?.avatar || null,
            reporterName: task.dev_team_members_dev_tasks_reporterIdTodev_team_members?.users ? `${task.dev_team_members_dev_tasks_reporterIdTodev_team_members.users.firstName} ${task.dev_team_members_dev_tasks_reporterIdTodev_team_members.users.lastName}` : 'System'
        }));

        res.status(200).json({
            success: true,
            data: safeTasks,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching dev tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tasks',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get Dev Kanban Tasks - 🔐 NOW WITH viewScope ENFORCEMENT
 */
const getDevKanbanTasks = async (req, res) => {
    try {
        const { projectId, assigneeId, type, priority, search } = req.query;

        // 🔐 FIX: Apply viewScope filter based on user permissions
        const viewScopeFilter = await getViewScopeFilter(req);
        console.log(`🔒 [viewScope-Kanban] User ${req.user?.email} has viewScope filter:`, viewScopeFilter);

        const where = { ...viewScopeFilter };
        if (projectId) where.projectId = projectId;
        if (assigneeId) where.assigneeId = assigneeId;
        if (type) where.type = type;
        if (priority) where.priority = priority;
        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { title: { contains: search } },
                        { description: { contains: search } }
                    ]
                }
            ];
        }

        const tasks = await safeQuery(() => getPrisma().devTask.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                dev_team_members_dev_tasks_assigneeIdTodev_team_members: {
                    include: {
                        users: { select: { firstName: true, lastName: true, avatar: true } }
                    }
                },
                dev_project: {
                    select: { name: true, color: true }
                },
                _count: {
                    select: {
                        other_dev_tasks: true, // For subtasks (self-relation)
                        dev_task_checklists: true,
                        devTaskComments: true
                    }
                }
            }
        }));

        const initialData = {
            BACKLOG: [],
            TODO: [],
            IN_PROGRESS: [],
            IN_REVIEW: [],
            TESTING: [],
            DONE: [],
            CANCELLED: []
        };

        const kanbanData = tasks.reduce((acc, task) => {
            const formattedTask = {
                id: task.id,
                title: task.title,
                type: task.type,
                status: task.status,
                priority: task.priority,
                component: task.component,
                order: task.order,
                dueDate: task.dueDate,
                estimatedHours: task.estimatedHours,
                assigneeId: task.assigneeId,
                assigneeName: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members ? `${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.users.firstName} ${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.users.lastName}` : null,
                assigneeAvatar: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members?.users?.avatar || null,
                projectName: task.dev_project?.name || null,
                projectColor: task.dev_project?.color || null,
                tags: parseTags(task.tags),
                commentsCount: task._count.devTaskComments,
                subtasksCount: task._count.other_dev_tasks,
                checklistsCount: task._count.dev_task_checklists
            };

            if (acc[task.status]) {
                acc[task.status].push(formattedTask);
            } else {
                // If status is not one of the standard ones, put it in BACKLOG or handle as needed
                // For now, valid statuses are enforced by Enum, so this else might only hit if new statuses are added
                acc.BACKLOG.push(formattedTask);
            }
            return acc;
        }, initialData);

        res.status(200).json({ success: true, data: kanbanData });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching kanban tasks:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch kanban data' });
    }
};

/**
 * Get Dev Team - 🔧 NOW INCLUDES ALL SYSTEM USERS (even without DevTeamMember)
 */
const getDevTeam = async (req, res) => {
    try {
        // Get system roles from settings
        let systemRoles = ['SUPER_ADMIN', 'Project Manager', 'Team Lead', 'Developer', 'Tester', 'Agent', 'AGENT'];
        try {
            const settings = await devSettingsService.getSettings();
            if (settings.permissions) {
                const dynamicRoles = Object.keys(settings.permissions);
                systemRoles = ['SUPER_ADMIN', ...dynamicRoles];
            }
        } catch (e) {
            console.warn('⚠️ Could not load dynamic roles, using defaults');
        }

        // Get all users with system roles - ONLY system users, not regular customers
        // Use same logic as getSuperAdminUsers to filter correctly
        const currentUserCompanyId = req.user?.companyId;

        const where = {
            OR: [
                { role: 'SUPER_ADMIN' },
                { department: { not: null } },
                // Also include dynamic system roles
                { role: { in: systemRoles.filter(r => r !== 'SUPER_ADMIN') } }
            ],
            isActive: true
        };

        // Only show users in the same company (System Company) - excludes client users
        if (currentUserCompanyId) {
            where.companyId = currentUserCompanyId;
        }

        const allSystemUsers = await getPrisma().user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
                role: true,
                lastLoginAt: true,
                companyId: true,
                department: true
            }
        });

        // Get existing DevTeamMembers with their data
        const existingTeamMembers = await getPrisma().devTeamMember.findMany({
            include: {
                users: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        role: true,
                        lastLoginAt: true
                    }
                },
                dev_tasks_dev_tasks_assigneeIdTodev_team_members: {
                    where: { status: { not: 'DONE' } },
                    select: { id: true, status: true }
                },
                dev_projects_dev_projects_managerIdTodev_team_members: {
                    select: { id: true }
                }
            }
        });

        // Create a map of userId -> DevTeamMember for quick lookup
        const teamMemberMap = new Map();
        existingTeamMembers.forEach(member => {
            teamMemberMap.set(member.userId, member);
        });

        // Format data for frontend - include ALL system users
        const formattedTeam = allSystemUsers.map(user => {
            const teamMember = teamMemberMap.get(user.id);

            // If user has DevTeamMember, use that data
            if (teamMember) {
                let parsedSkills = [];
                try {
                    parsedSkills = teamMember.skills ? JSON.parse(teamMember.skills) : [];
                    if (typeof parsedSkills === 'string') parsedSkills = [parsedSkills];
                } catch (e) {
                    parsedSkills = teamMember.skills ? teamMember.skills.split(',') : [];
                }

                return {
                    id: teamMember.id,
                    userId: teamMember.userId,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'بدون اسم',
                    email: user.email || '',
                    avatar: user.avatar || null,
                    role: teamMember.role || user.role,
                    department: teamMember.department,
                    skills: Array.isArray(parsedSkills) ? parsedSkills : [],
                    availability: teamMember.availability,
                    isActive: teamMember.isActive,
                    specialty: teamMember.specialty,
                    phone: user.phone || null,
                    lastLoginAt: user.lastLoginAt,
                    activeTasks: teamMember.dev_tasks_dev_tasks_assigneeIdTodev_team_members?.length || 0,
                    tasksCount: teamMember.dev_tasks_dev_tasks_assigneeIdTodev_team_members?.length || 0,
                    projectsCount: teamMember.dev_projects_dev_projects_managerIdTodev_team_members?.length || 0,
                    createdAt: teamMember.createdAt,
                    updatedAt: teamMember.updatedAt,
                    hasTeamMemberRecord: true
                };
            } else {
                // User doesn't have DevTeamMember record - create virtual entry
                return {
                    id: `virtual-${user.id}`, // Virtual ID for users without DevTeamMember
                    userId: user.id,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'بدون اسم',
                    email: user.email || '',
                    avatar: user.avatar || null,
                    role: user.role,
                    department: null,
                    skills: [],
                    availability: 'available',
                    isActive: true,
                    specialty: null,
                    phone: user.phone || null,
                    lastLoginAt: user.lastLoginAt,
                    activeTasks: 0,
                    tasksCount: 0,
                    projectsCount: 0,
                    createdAt: null,
                    updatedAt: null,
                    hasTeamMemberRecord: false // Flag to indicate this is a virtual entry
                };
            }
        });

        console.log(`✅ [getDevTeam] Returning ${formattedTeam.length} users (${existingTeamMembers.length} with DevTeamMember, ${formattedTeam.length - existingTeamMembers.length} virtual)`);

        res.status(200).json({
            success: true,
            data: formattedTeam
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching dev team:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch team' });
    }
};

/**
 * Delete Dev Team Member
 */
/**
 * Create Dev Team Member
 */
const createDevTeamMember = async (req, res) => {
    try {
        const { userId, role, department, skills, xp, level } = req.body;

        // Validation
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Check if already exists
        const existingMember = await safeQuery(() => getPrisma().devTeamMember.findUnique({
            where: { userId }
        }));

        if (existingMember) {
            return res.status(400).json({ success: false, message: 'User is already a team member' });
        }

        const newMember = await safeQuery(() => getPrisma().devTeamMember.create({
            data: {
                userId,
                role: role || 'developer',
                department: department || 'Engineering',
                skills: Array.isArray(skills) ? JSON.stringify(skills) : (skills || ''),
                xp: xp || 0,
                level: level || 1,
                isActive: true
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true
                    }
                }
            }
        }));

        res.status(201).json({
            success: true,
            message: 'Team member added successfully',
            data: newMember
        });
    } catch (error) {
        console.error('Error creating team member:', error);
        res.status(500).json({ success: false, message: 'Failed to add team member' });
    }
};

/**
 * Update Dev Team Member
 */
const updateDevTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, department, skills, availability, isActive } = req.body;

        const updatedMember = await safeQuery(() => getPrisma().devTeamMember.update({
            where: { id },
            data: {
                role,
                department,
                skills: Array.isArray(skills) ? JSON.stringify(skills) : skills,
                availability,
                isActive
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true
                    }
                }
            }
        }));

        res.status(200).json({
            success: true,
            message: 'Team member updated successfully',
            data: updatedMember
        });
    } catch (error) {
        console.error('Error updating team member:', error);
        res.status(500).json({ success: false, message: 'Failed to update team member' });
    }
};

/**
 * Delete Dev Team Member
 */
const deleteDevTeamMember = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.id;

        // Check for Time Logs first (financial/audit history preservation)
        const timeLogsCount = await safeQuery(() => getPrisma().devTimeLog.count({
            where: { memberId: id }
        }));

        if (timeLogsCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete member with ${timeLogsCount} time logs. Please deactivate the member instead to preserve history.`
            });
        }

        // Find the current admin's dev member profile
        const currentAdminMember = await safeQuery(() => getPrisma().devTeamMember.findUnique({
            where: { userId: currentUserId }
        }));

        await safeQuery(async () => {
            const prisma = getPrisma();

            // 1. Unassign from tasks (assignee) - Optional
            await prisma.devTask.updateMany({
                where: { assigneeId: id },
                data: { assigneeId: null }
            });

            // 2. Unassign from projects (manager) - Optional
            await prisma.devProject.updateMany({
                where: { managerId: id },
                data: { managerId: null }
            });

            // 3. Reassign reported tasks - Required (reporterId is String!)

            // Determine who to transfer reported tasks to
            let transferToMemberId = null;

            if (currentAdminMember && currentAdminMember.id !== id) {
                // Admin is a team member and NOT the one being deleted -> Assign to Admin
                transferToMemberId = currentAdminMember.id;
            } else {
                // Admin is undefined OR Admin is deleting themselves.
                // We need to find ANOTHER valid team member (e.g. oldest active member)
                const otherMember = await prisma.devTeamMember.findFirst({
                    where: {
                        id: { not: id },
                        isActive: true
                    },
                    orderBy: { createdAt: 'asc' }
                });

                if (otherMember) {
                    transferToMemberId = otherMember.id;
                }
            }

            if (transferToMemberId) {
                // Transfer ownership
                await prisma.devTask.updateMany({
                    where: { reporterId: id },
                    data: { reporterId: transferToMemberId }
                });
            } else {
                // No one to transfer to? 
                // Only block if there ARE reported tasks
                const reportedCount = await prisma.devTask.count({ where: { reporterId: id } });
                if (reportedCount > 0) {
                    throw new Error('Cannot delete member: They have reported tasks, and no other Team Member exists to inherit them. Please create another member first.');
                }
            }

            // 4. Delete Dependencies
            // DevTaskWatcher - Junction table
            await prisma.devTaskWatcher.deleteMany({ where: { memberId: id } });

            // DevTaskComment - Delete comments (or nullify if authorId was optional, but it is required)
            await prisma.devTaskComment.deleteMany({ where: { authorId: id } });

            // DevTaskActivity - memberId is Optional
            await prisma.devTaskActivity.updateMany({
                where: { memberId: id },
                data: { memberId: null }
            });

            // AiChatSession - userId is FK to DevTeamMember
            await prisma.aiChatSession.deleteMany({ where: { userId: id } });

            // DevNotification - If exists
            // Verify model name first, or use try/catch just in case names differ in deployed schema vs local assumptions
            try {
                const notifCount = await prisma.devNotification.count({ where: { memberId: id } });
                if (notifCount > 0) {
                    await prisma.devNotification.deleteMany({ where: { memberId: id } });
                }
            } catch (e) { /* ignore if model not found */ }

            // 5. Finally delete the member
            await prisma.devTeamMember.delete({
                where: { id }
            });
        });

        res.status(200).json({
            success: true,
            message: 'Team member removed successfully'
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error deleting team member:', error);

        // Check for specific Prisma codes
        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete member due to remaining dependencies (likely Time Logs or other constraints). Please deactivate instead.',
                details: error.meta // helpful for debugging
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete team member',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get Dev Releases
 */
const getDevReleases = async (req, res) => {
    try {
        const releases = await safeQuery(() => getPrisma().devRelease.findMany({
            orderBy: { releaseDate: 'desc' },
            include: {
                dev_project: {
                    select: { name: true }
                },
                dev_tasks: {
                    select: { type: true }
                },
                _count: {
                    select: { dev_tasks: true }
                }
            }
        }));

        const safeReleases = releases.map(r => {
            const tasks = r.dev_tasks || [];
            return {
                ...r,
                projectName: r.dev_project?.name || null,
                features: parseTags(r.features),
                changelog: parseTags(r.changelog),
                tasksByType: {
                    features: tasks.filter(t => t.type === 'FEATURE').length,
                    bugs: tasks.filter(t => t.type === 'BUG').length,
                    enhancements: tasks.filter(t => t.type === 'ENHANCEMENT').length
                }
            };
        });

        res.status(200).json({
            success: true,
            data: safeReleases
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching releases:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch releases',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get Dev Project By ID
 */
const getDevProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        const project = await getPrisma().devProject.findUnique({
            where: { id },
            include: {
                dev_team_members_dev_projects_managerIdTodev_team_members: {
                    include: {
                        users: { select: { firstName: true, lastName: true, avatar: true } }
                    }
                },
                dev_tasks: {
                    orderBy: { updatedAt: 'desc' },
                    take: 10,
                    include: {
                        dev_team_members_dev_tasks_assigneeIdTodev_team_members: {
                            include: {
                                users: { select: { firstName: true, lastName: true, avatar: true } }
                            }
                        }
                    }
                },
                dev_release: {
                    orderBy: { releaseDate: 'desc' }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.status(200).json({ success: true, data: project });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching project details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch project' });
    }
};

/**
 * Get Dev Task By ID
 */
const getDevTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user is authenticated
        if (!req.user) {
            console.log('❌ [getDevTaskById] No user in request');
            return res.status(401).json({
                success: false,
                message: 'غير مصرح بالوصول'
            });
        }

        // 🔐 FIX: Check viewScope permission before fetching task
        let viewScopeFilter = {};
        try {
            viewScopeFilter = await getViewScopeFilter(req);
            console.log(`🔒 [getDevTaskById] User: ${req.user?.email}, Role: ${req.user?.role}, viewScope filter:`, JSON.stringify(viewScopeFilter));
        } catch (filterError) {
            console.error('❌ [getDevTaskById] Error getting viewScope filter:', filterError);
            console.error('❌ [getDevTaskById] Filter error stack:', filterError.stack);
            // If error getting filter, deny access for security
            return res.status(403).json({
                success: false,
                message: 'خطأ في التحقق من الصلاحيات'
            });
        }

        // If viewScope filter has empty array (no access), deny immediately
        if (viewScopeFilter.id && viewScopeFilter.id.in && viewScopeFilter.id.in.length === 0) {
            console.log(`🚫 [getDevTaskById] User ${req.user?.email} has no access (no TeamMember)`);
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية الوصول لهذه المهمة'
            });
        }

        // Fetch task first (findUnique requires id only)
        let task;
        try {
            task = await getPrisma().devTask.findUnique({
                where: { id },
                include: {
                    dev_project: { select: { id: true, name: true, color: true } },
                    dev_team_members_dev_tasks_assigneeIdTodev_team_members: {
                        include: {
                            users: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } }
                        }
                    },
                    dev_team_members_dev_tasks_reporterIdTodev_team_members: {
                        include: {
                            users: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } }
                        }
                    },
                    other_dev_tasks: { // subtasks
                        include: {
                            dev_team_members_dev_tasks_assigneeIdTodev_team_members: {
                                include: {
                                    users: { select: { firstName: true, lastName: true, avatar: true } }
                                }
                            }
                        }
                    },
                    devTaskComments: { // comments
                        orderBy: { createdAt: 'desc' },
                        include: {
                            dev_team_member: { // Was author, Schema name is dev_team_member
                                include: {
                                    users: { select: { id: true, firstName: true, lastName: true, avatar: true } }
                                }
                            }
                        }
                    },
                    dev_task_activities: { // activities
                        orderBy: { createdAt: 'desc' },
                        take: 20,
                        include: {
                            dev_team_members: {
                                include: {
                                    users: { select: { firstName: true, lastName: true } }
                                }
                            }
                        }
                    },
                    dev_task_attachments: true, // attachments
                    dev_task_checklists: { // checklists
                        include: {
                            dev_task_checklist_items: { orderBy: { position: 'asc' } } // Was items, Schema is dev_task_checklist_items
                        }
                    },
                    dev_task_watchers: {
                        include: {
                            dev_team_members: {
                                include: { users: { select: { id: true, firstName: true, lastName: true } } }
                            }
                        }
                    },
                    dev_time_logs: { // timeLogs
                        orderBy: { startTime: 'desc' },
                        include: {
                            dev_team_members: {
                                include: {
                                    users: { select: { id: true, firstName: true, lastName: true } }
                                }
                            }
                        }
                    }
                }
            });
        } catch (queryError) {
            console.error('❌ [getDevTaskById] Error fetching task from database:', queryError);
            console.error('❌ [getDevTaskById] Query error stack:', queryError.stack);
            return res.status(500).json({
                success: false,
                message: 'خطأ في جلب المهمة من قاعدة البيانات',
                error: process.env.NODE_ENV === 'development' ? queryError.message : undefined
            });
        }

        if (!task) {
            // 🔐 Check if task exists but user doesn't have access
            try {
                const taskExists = await getPrisma().devTask.findUnique({
                    where: { id },
                    select: { id: true }  // Just check existence
                });
                if (taskExists) {
                    console.log(`🚫 [getDevTaskById] Task exists but user ${req.user?.email} doesn't have access`);
                    return res.status(403).json({
                        success: false,
                        message: 'ليس لديك صلاحية الوصول لهذه المهمة'
                    });
                }
            } catch (e) {
                console.error('⚠️ Error checking task existence:', e);
            }
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // 🔐 Additional check: Verify user has access to this specific task
        try {
            const userRole = normalizeRole(req.user?.role);
            let hasAccess = false;

            if (req.user?.role === 'SUPER_ADMIN') {
                hasAccess = true;
            } else {
                const settings = await devSettingsService.getSettings();
                const rolePermissions = settings.permissions[userRole] || settings.permissions[req.user?.role];
                const viewScope = rolePermissions?.viewScope || 'assigned_only';

                console.log(`🔒 [getDevTaskById] Checking access - viewScope: ${viewScope}, task.assigneeId: ${task.assigneeId}`);

                if (viewScope === 'all') {
                    hasAccess = true;
                } else if (viewScope === 'assigned_only') {
                    // Check if task is assigned to user's team member
                    const teamMember = await getPrisma().devTeamMember.findFirst({
                        where: { userId: req.user?.id }
                    });
                    hasAccess = teamMember && task.assigneeId === teamMember.id;
                    console.log(`🔒 [getDevTaskById] assigned_only check - teamMember: ${teamMember?.id}, task.assigneeId: ${task.assigneeId}, hasAccess: ${hasAccess}`);
                } else if (viewScope === 'project') {
                    // Check if user has tasks in same project
                    const teamMember = await getPrisma().devTeamMember.findFirst({
                        where: { userId: req.user?.id }
                    });
                    if (teamMember) {
                        const userProjectIds = await getPrisma().devTask.findMany({
                            where: { assigneeId: teamMember.id },
                            select: { projectId: true }
                        });
                        // Get unique project IDs
                        const projectIds = [...new Set(userProjectIds.map(t => t.projectId).filter(Boolean))];
                        hasAccess = task.projectId && projectIds.includes(task.projectId);
                        console.log(`🔒 [getDevTaskById] project check - user projects: ${projectIds.join(', ')}, task.projectId: ${task.projectId}, hasAccess: ${hasAccess}`);
                    }
                }
            }

            if (!hasAccess) {
                console.log(`🚫 [getDevTaskById] Access denied for user ${req.user?.email} to task ${id}`);
                return res.status(403).json({
                    success: false,
                    message: 'ليس لديك صلاحية الوصول لهذه المهمة'
                });
            }
        } catch (e) {
            console.error('❌ [getDevTaskById] Error checking task access:', e);
            // If error occurs, deny access for security
            return res.status(403).json({
                success: false,
                message: 'خطأ في التحقق من الصلاحيات'
            });
        }

        // Remap to frontend expected keys with error handling
        try {
            const formattedTask = {
                ...task,
                xpEarned: task.xpEarned || null, // Explicitly include XP earned
                subtasks: task.other_dev_tasks || [],
                comments: (task.dev_task_comments || []).map(c => {
                    try {
                        return {
                            ...c,
                            author: c.dev_team_members || c.author || null // Map dev_team_members to author for frontend compatibility
                        };
                    } catch (e) {
                        console.warn('⚠️ Error mapping comment:', e);
                        return {
                            ...c,
                            author: null
                        };
                    }
                }),
                activities: (task.dev_task_activities || []).map(a => ({
                    ...a,
                    memberName: (a.member && a.member.user) ? `${a.member.user.firstName} ${a.member.user.lastName}` : 'نظام',
                    memberAvatar: a.member?.user?.avatar || null
                })),
                attachments: task.dev_task_attachments || [],
                checklists: (task.dev_task_checklists || []).map(cl => {
                    try {
                        return {
                            ...cl,
                            items: cl.dev_task_checklist_items || [] // Map dev_task_checklist_items to items
                        };
                    } catch (e) {
                        console.warn('⚠️ Error mapping checklist:', e);
                        return { ...cl, items: [] };
                    }
                }),
                timeLogs: task.dev_time_logs || []
            };

            // Parse relatedLinks if stored as JSON
            try {
                if (formattedTask.relatedLinks && typeof formattedTask.relatedLinks === 'string') {
                    try {
                        formattedTask.relatedLinks = JSON.parse(formattedTask.relatedLinks);
                    } catch (e) {
                        // Keep as string if not JSON
                    }
                } else if (!formattedTask.relatedLinks) {
                    formattedTask.relatedLinks = [];
                }
            } catch (e) {
                console.warn('⚠️ Error parsing relatedLinks:', e);
                formattedTask.relatedLinks = [];
            }

            // Parse tags if they are a string
            try {
                if (formattedTask.tags && typeof formattedTask.tags === 'string') {
                    try {
                        formattedTask.tags = JSON.parse(formattedTask.tags);
                    } catch (e) {
                        // If not valid JSON, treat as comma-separated or single value
                        formattedTask.tags = formattedTask.tags.includes(',') ? formattedTask.tags.split(',') : [formattedTask.tags];
                    }
                } else if (!formattedTask.tags) {
                    formattedTask.tags = [];
                }
            } catch (e) {
                console.warn('⚠️ Error parsing tags:', e);
                formattedTask.tags = [];
            }

            // Get current user's member ID
            let currentMember = null;
            try {
                if (req.user && req.user.id) {
                    currentMember = await getPrisma().devTeamMember.findFirst({
                        where: { userId: req.user.id }
                    });
                }
            } catch (e) {
                console.warn('⚠️ Error fetching current member:', e);
            }

            // 🔄 Find Next/Prev Tasks
            try {
                const [prevTask, nextTask] = await Promise.all([
                    getPrisma().devTask.findFirst({
                        where: { createdAt: { lt: task.createdAt } },
                        orderBy: { createdAt: 'desc' },
                        select: { id: true }
                    }),
                    getPrisma().devTask.findFirst({
                        where: { createdAt: { gt: task.createdAt } },
                        orderBy: { createdAt: 'asc' },
                        select: { id: true }
                    })
                ]);
                formattedTask.previousTaskId = prevTask?.id || null;
                formattedTask.nextTaskId = nextTask?.id || null;
            } catch (e) {
                console.warn('⚠️ Error fetching prev/next tasks:', e);
            }

            res.status(200).json({
                success: true,
                data: formattedTask,
                currentMemberId: currentMember?.id || null
            });
        } catch (formatError) {
            console.error('❌ [getDevTaskById] Error formatting task data:', formatError);
            console.error('❌ [getDevTaskById] Format error stack:', formatError.stack);
            res.status(500).json({
                success: false,
                message: 'خطأ في معالجة بيانات المهمة',
                error: process.env.NODE_ENV === 'development' ? formatError.message : undefined
            });
        }
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching task details:', error);
        console.error('❌ [SUPER-ADMIN] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب تفاصيل المهمة',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get Dev Release By ID
 */
const getDevReleaseById = async (req, res) => {
    try {
        const { id } = req.params;

        const release = await getPrisma().devRelease.findUnique({
            where: { id },
            include: {
                project: { select: { id: true, name: true } },
                tasks: {
                    include: {
                        assignee: {
                            include: {
                                user: { select: { firstName: true, lastName: true, avatar: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!release) {
            return res.status(404).json({ success: false, message: 'Release not found' });
        }

        res.status(200).json({ success: true, data: release });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching release details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch release' });
    }
};

/**
 * Add Comment to Dev Task
 */
const addDevTaskComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        // Get Dev Team Member ID
        let member = await executeWithRetry(async () => {
            return await getPrisma().devTeamMember.findFirst({
                where: { userId }
            });
        });

        if (!member) {
            // If user is SUPER_ADMIN but not in dev team, add them automatically
            if (req.user.role === 'SUPER_ADMIN') {
                member = await executeWithRetry(async () => {
                    return await getPrisma().devTeamMember.create({
                        data: {
                            userId,
                            role: 'admin', // Assign admin role in dev team
                            department: 'Management'
                        }
                    });
                });
            } else {
                return res.status(403).json({ success: false, message: 'You are not a dev team member' });
            }
        }

        const comment = await executeWithRetry(async () => {
            return await getPrisma().devTaskComment.create({
                data: {
                    content,
                    taskId: id,
                    authorId: member.id
                },
                include: {
                    dev_team_members: {
                        include: {
                            user: { select: { firstName: true, lastName: true, avatar: true } }
                        }
                    }
                }
            });
        });

        res.status(201).json({ success: true, data: comment });

        // 📝 Log Activity
        try {
            await activityLogger.logCommentAdded(id, member.id);
        } catch (logErr) {
            console.error('⚠️ [addDevTaskComment] Failed to log activity:', logErr);
        }
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error adding comment:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

/**
 * Create Dev Task
 */
const createDevTask = async (req, res) => {
    try {
        const {
            title, description, type, priority, status,
            assigneeId, reporterId, projectId, releaseId, parentId,
            dueDate, startDate, estimatedHours, component,
            tags, gitBranch, companyId, ticketId,
            businessValue, acceptanceCriteria, checklistItems,
            watchers, // Array of memberIds
            relatedLinks
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Title and description are required' });
        }

        // 🔧 Convert assigneeId (userId or virtual ID) to DevTeamMember.id
        let actualAssigneeId = null;
        if (assigneeId) {
            actualAssigneeId = await devTeamService.getOrCreateMember(assigneeId);
            if (!actualAssigneeId) {
                return res.status(400).json({ success: false, message: 'Invalid assignee' });
            }
        }

        // Get reporter DevTeamMember (required field)
        let actualReporterId = reporterId;
        if (!actualReporterId) {
            // Try to find or create DevTeamMember for current user
            actualReporterId = await devTeamService.getOrCreateMember(req.user.id);
            if (!actualReporterId) {
                // If still no reporter, use assignee
                actualReporterId = actualAssigneeId;
            }
        } else {
            // Convert reporterId if it's a userId
            actualReporterId = await devTeamService.getOrCreateMember(actualReporterId);
        }

        if (!actualReporterId) {
            return res.status(400).json({ success: false, message: 'Reporter is required' });
        }

        // Prepare nested write for checklists if items provided
        let checklistData = undefined;
        if (checklistItems && Array.isArray(checklistItems) && checklistItems.length > 0) {
            checklistData = {
                create: {
                    id: require('crypto').randomUUID(),
                    title: 'Initial Checklist',
                    updatedAt: new Date(),
                    dev_task_checklist_items: {
                        create: checklistItems.map((item, index) => ({
                            id: require('crypto').randomUUID(),
                            content: item,
                            position: index,
                            updatedAt: new Date()
                        }))
                    }
                }
            };
        }

        // 🔧 Prepare watchers data (convert userId to DevTeamMember.id)
        let watchersData = undefined;
        if (watchers && Array.isArray(watchers) && watchers.length > 0) {
            const watcherMemberIds = await Promise.all(
                watchers.map(watcherId => devTeamService.getOrCreateMember(watcherId))
            );
            const validWatcherIds = watcherMemberIds.filter(id => id !== null);

            if (validWatcherIds.length > 0) {
                watchersData = {
                    create: validWatcherIds.map(memberId => ({ memberId }))
                };
            }
        }

        const task = await executeWithRetry(async () => {
            return await getPrisma().devTask.create({
                data: {
                    id: require('crypto').randomUUID(),
                    title,
                    description,
                    businessValue: businessValue || null,
                    acceptanceCriteria: acceptanceCriteria || null,
                    type: type || 'FEATURE',
                    priority: priority || 'MEDIUM',
                    status: status || 'BACKLOG',
                    assigneeId: actualAssigneeId,
                    reporterId: actualReporterId,
                    projectId: projectId || null,
                    releaseId: releaseId || null,
                    parentTaskId: parentId || null,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    startDate: startDate ? new Date(startDate) : null,
                    estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
                    actualHours: 0,
                    progress: 0,
                    component: component || null,
                    tags: tags ? JSON.stringify(tags) : '[]',
                    gitBranch: gitBranch || null,
                    companyId: companyId || null,
                    ticketId: ticketId || null,
                    updatedAt: new Date(),
                    dev_task_checklists: checklistData,
                    dev_task_watchers: watchersData,
                    relatedLinks: relatedLinks ? (typeof relatedLinks === 'string' ? relatedLinks : JSON.stringify(relatedLinks)) : null
                }
            });
        });

        res.status(201).json({ success: true, data: task });

        // 📝 Log Activity
        try {
            const memberId = await devTeamService.getOrCreateMember(req.user.id);
            if (memberId) {
                await activityLogger.logTaskCreated(task.id, memberId, task.title);
            }
        } catch (logErr) {
            console.error('⚠️ [createDevTask] Failed to log activity:', logErr);
        }
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error creating task:', error);
        res.status(500).json({ success: false, message: 'Failed to create task' });
    }
};

/**
 * Update Dev Task
 */
const updateDevTask = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, description, type, priority, status,
            assigneeId, projectId, releaseId,
            dueDate, startDate, estimatedHours, component,
            tags, gitBranch, companyId, ticketId,
            businessValue, acceptanceCriteria,
            watchers, // Array of member IDs
            relatedLinks
        } = req.body;

        const updateData = {};

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (businessValue !== undefined) updateData.businessValue = businessValue;
        if (acceptanceCriteria !== undefined) updateData.acceptanceCriteria = acceptanceCriteria;
        if (type !== undefined) updateData.type = type;
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'DONE') updateData.completedDate = new Date();
            else updateData.completedDate = null;
        }
        // 🔧 Convert assigneeId (userId or virtual ID) to DevTeamMember.id
        if (assigneeId !== undefined) {
            if (assigneeId) {
                const actualAssigneeId = await devTeamService.getOrCreateMember(assigneeId);
                updateData.assigneeId = actualAssigneeId || null;
            } else {
                updateData.assigneeId = null;
            }
        }
        if (projectId !== undefined) updateData.projectId = projectId || null;
        if (releaseId !== undefined) updateData.releaseId = releaseId || null;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (estimatedHours !== undefined) updateData.estimatedHours = parseFloat(estimatedHours) || 0;
        if (component !== undefined) updateData.component = component || null;
        if (tags !== undefined) updateData.tags = JSON.stringify(tags);
        if (gitBranch !== undefined) updateData.gitBranch = gitBranch || null;
        if (companyId !== undefined) updateData.companyId = companyId || null;
        if (ticketId !== undefined) updateData.ticketId = ticketId || null;
        if (relatedLinks !== undefined) updateData.relatedLinks = relatedLinks ? (typeof relatedLinks === 'string' ? relatedLinks : JSON.stringify(relatedLinks)) : null;

        // Handle Watchers Update (Delete old, Create new)
        if (watchers !== undefined && Array.isArray(watchers)) {
            await getPrisma().devTaskWatcher.deleteMany({ where: { taskId: id } });
            if (watchers.length > 0) {
                // 🔧 Convert watcher IDs (userId or virtual ID) to DevTeamMember.id
                const watcherMemberIds = await Promise.all(
                    watchers.map(watcherId => devTeamService.getOrCreateMember(watcherId))
                );
                const validWatcherIds = watcherMemberIds.filter(id => id !== null);

                if (validWatcherIds.length > 0) {
                    await getPrisma().devTaskWatcher.createMany({
                        data: validWatcherIds.map(memberId => ({ taskId: id, memberId }))
                    });
                }
            }
        }

        // 🔍 Get current task before update to check status change
        const currentTask = await getPrisma().devTask.findUnique({
            where: { id },
            include: {
                assignee: true,
                dev_time_logs: true
            }
        });

        if (!currentTask) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const task = await getPrisma().devTask.update({
            where: { id },
            data: updateData
        });

        // 🎮 Gamification: Calculate XP if status changed to DONE
        if (status === 'DONE' && currentTask.status !== 'DONE' && currentTask.assigneeId) {
            // Calculate XP based on dynamic leaderboard settings
            const xpGained = await calculateTaskXP(currentTask);

            // Update Member XP and Level
            try {
                await updateMemberXP(currentTask.assigneeId, xpGained);

                // Create Notification
                await getPrisma().devNotification.create({
                    data: {
                        memberId: currentTask.assigneeId,
                        type: 'XP_GAIN',
                        title: '🌟 نقاط خبرة مكتسبة!',
                        message: `أحسنت! لقد حصلت على ${xpGained} نقطة (XP) لإكمالك المهمة "${currentTask.title}".`,
                        isRead: false
                    }
                });
            } catch (xpError) {
                console.error('⚠️ [updateDevTask] Error updating XP:', xpError);
                // Don't fail the request if XP update fails
            }
        }

        // 📝 Log Activity
        try {
            const memberId = await devTeamService.getOrCreateMember(req.user.id);
            if (memberId) {
                const mapToLogFields = {
                    status: { oldValue: currentTask.status, newValue: task.status },
                    priority: { oldValue: currentTask.priority, newValue: task.priority },
                    type: { oldValue: currentTask.type, newValue: task.type },
                    assigneeId: { oldValue: currentTask.assigneeId, newValue: task.assigneeId },
                    projectId: { oldValue: currentTask.projectId, newValue: task.projectId },
                    releaseId: { oldValue: currentTask.releaseId, newValue: task.releaseId },
                    dueDate: { oldValue: currentTask.dueDate?.toISOString(), newValue: task.dueDate?.toISOString() },
                    estimatedHours: { oldValue: currentTask.estimatedHours, newValue: task.estimatedHours }
                };

                await activityLogger.logFieldChanges(id, memberId, mapToLogFields);
            }
        } catch (logErr) {
            console.error('⚠️ [updateDevTask] Failed to log activity:', logErr);
        }

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error updating task:', error);
        res.status(500).json({ success: false, message: 'Failed to update task' });
    }
};

/**
 * Delete Dev Task
 */
const deleteDevTask = async (req, res) => {
    try {
        const { id } = req.params;
        await getPrisma().devTask.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error deleting task:', error);
        res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
};

/**
 * Create Checklist
 */
const createDevTaskChecklist = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { title } = req.body;

        const checklist = await executeWithRetry(async () => {
            return await getPrisma().devTaskChecklist.create({
                data: { taskId, title, position: 0 }
            });
        });

        res.status(201).json({ success: true, data: checklist });

        // 📝 Log Activity
        try {
            const memberId = await devTeamService.getOrCreateMember(req.user.id);
            if (memberId) {
                await activityLogger.logChecklistCreated(taskId, memberId, title);
            }
        } catch (logErr) {
            console.error('⚠️ [createDevTaskChecklist] Failed to log activity:', logErr);
        }
    } catch (error) {
        console.error('❌ Error creating checklist:', error);
        res.status(500).json({ success: false, message: 'Failed to create checklist' });
    }
};

/**
 * Add Checklist Item
 */
const addDevTaskChecklistItem = async (req, res) => {
    try {
        const { checklistId } = req.params;
        const { content } = req.body;
        const item = await executeWithRetry(async () => {
            return await getPrisma().devTaskChecklistItem.create({
                data: { checklistId, content, isCompleted: false, position: 0 }
            });
        });
        res.status(201).json({ success: true, data: item });
    } catch (error) {
        console.error('❌ Error adding checklist item:', error);
        res.status(500).json({ success: false, message: 'Failed to add item' });
    }
};

/**
 * Toggle Checklist Item
 */
const toggleDevTaskChecklistItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { isCompleted } = req.body;

        const item = await executeWithRetry(async () => {
            return await getPrisma().devTaskChecklistItem.update({
                where: { id: itemId },
                data: {
                    isCompleted,
                    completedBy: isCompleted ? req.user.id : null,
                    completedAt: isCompleted ? new Date() : null
                },
                include: { dev_task_checklists: true } // Include to get taskId
            });
        });

        // Auto-calculate progress from all checklists
        const taskId = item.dev_task_checklists.taskId;
        const allItems = await executeWithRetry(async () => {
            return await getPrisma().devTaskChecklistItem.findMany({
                where: { dev_task_checklists: { taskId } }
            });
        });

        if (allItems.length > 0) {
            const completedCount = allItems.filter(i => i.isCompleted).length;
            const progress = Math.round((completedCount / allItems.length) * 100);

            await executeWithRetry(async () => {
                return await getPrisma().devTask.update({
                    where: { id: taskId },
                    data: { progress }
                });
            });
        }

        res.status(200).json({ success: true, data: item });

        // 📝 Log Activity
        try {
            const memberId = await devTeamService.getOrCreateMember(req.user.id);
            if (memberId) {
                await activityLogger.logChecklistItemCompleted(taskId, memberId, item.content, isCompleted);
            }
        } catch (logErr) {
            console.error('⚠️ [toggleDevTaskChecklistItem] Failed to log activity:', logErr);
        }
    } catch (error) {
        console.error('❌ Error toggling item:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle item' });
    }
};

/**
 * Add Time Log
 */
const addDevTaskTimeLog = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { duration, description } = req.body;
        const userId = req.user.id;

        let member = await getPrisma().devTeamMember.findFirst({ where: { userId } });
        if (!member) {
            // Auto-create if super admin
            if (req.user.role === 'SUPER_ADMIN') {
                member = await executeWithRetry(async () => {
                    return await getPrisma().devTeamMember.create({
                        data: { userId, role: 'admin', department: 'Management' }
                    });
                });
            } else {
                return res.status(403).json({ success: false, message: 'Not a dev team member' });
            }
        }

        const log = await executeWithRetry(async () => {
            return await getPrisma().devTimeLog.create({
                data: {
                    taskId,
                    memberId: member.id,
                    startTime: new Date(), // Assuming current time log
                    duration: parseInt(duration) || 0,
                    description: description || '',
                    isBillable: false
                }
            });
        });
        res.status(201).json({ success: true, data: log });
    } catch (error) {
        console.error('❌ Error adding time log:', error);
        res.status(500).json({ success: false, message: 'Failed to add time log' });
    }
};



/**
 * Create Subtask
 */
const createDevTaskSubtask = async (req, res) => {
    try {
        const { taskId } = req.params; // Parent ID
        const { title, description, type, priority, assigneeId } = req.body;
        const userId = req.user.id;

        // 1. Get Parent Task to inherit data (projectId, companyId)
        const parentTask = await executeWithRetry(async () => {
            return await getPrisma().devTask.findUnique({
                where: { id: taskId },
                select: { projectId: true, companyId: true }
            });
        });

        if (!parentTask) {
            return res.status(404).json({ success: false, message: 'Parent task not found' });
        }

        // 2. Get Reporter (and optionally handle assignee)
        let actualReporterId = await devTeamService.getOrCreateMember(userId);

        let actualAssigneeId = null;
        if (assigneeId) {
            actualAssigneeId = await devTeamService.getOrCreateMember(assigneeId);
        }

        // 3. Create Subtask
        const subtask = await executeWithRetry(async () => {
            return await getPrisma().devTask.create({
                data: {
                    id: require('crypto').randomUUID(),
                    title,
                    description: description || '',
                    parentTaskId: taskId,
                    reporterId: actualReporterId,
                    assigneeId: actualAssigneeId,
                    projectId: parentTask.projectId,
                    companyId: parentTask.companyId,
                    status: 'BACKLOG',
                    priority: priority || 'MEDIUM',
                    type: type || 'FEATURE',
                    updatedAt: new Date()
                }
            });
        });

        console.log(`✅ [SUPER-ADMIN] Subtask created: ${subtask.id} for parent ${taskId}`);
        res.status(201).json({ success: true, data: subtask });

        // 📝 Log Activity
        try {
            const memberId = await devTeamService.getOrCreateMember(req.user.id);
            if (memberId) {
                await activityLogger.logSubtaskCreated(taskId, memberId, title);
            }
        } catch (logErr) {
            console.error('⚠️ [createDevTaskSubtask] Failed to log activity:', logErr);
        }
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error creating subtask:', error);
        res.status(500).json({ success: false, message: 'Failed to create subtask', error: error.message });
    }
};

/**
 * Upload Single Attachment
 */
const uploadDevTaskAttachment = async (req, res) => {
    try {
        const { taskId } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const file = req.file;
        let currentFilename = file.filename;
        let currentSize = file.size;
        let currentMimetype = file.mimetype;
        let currentPath = file.path;

        if (isProcessableImage(file.mimetype)) {
            try {
                const processed = await processImage(file.path, path.dirname(file.path));
                currentFilename = processed.filename;
                currentSize = processed.size;
                currentMimetype = 'image/webp';
                currentPath = processed.path;
            } catch (procError) {
                console.error(`❌ [IMAGE-PROC] Error processing dev task image:`, procError.message);
            }
        }

        // Save to DB
        const attachment = await executeWithRetry(async () => {
            return await getPrisma().devTaskAttachment.create({
                data: {
                    taskId,
                    fileName: currentFilename,
                    originalName: file.originalname,
                    fileSize: currentSize,
                    fileType: currentMimetype,
                    filePath: currentPath,
                    uploadedBy: req.user.id
                }
            });
        });

        // Add fileUrl to response
        const attachmentWithUrl = {
            ...attachment,
            fileUrl: `/uploads/dev-tasks/${attachment.fileName}`
        };

        res.status(201).json({ success: true, data: attachmentWithUrl });
    } catch (error) {
        console.error('❌ Error uploading attachment:', error);
        res.status(500).json({ success: false, message: 'Failed to upload attachment' });
    }
};

/**
 * Upload Multiple Attachments
 */
const uploadDevTaskAttachments = async (req, res) => {
    try {
        const { taskId } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        console.log(`📎 [UPLOAD] Uploading ${req.files.length} files for task ${taskId}`);

        // Save all files to DB
        const attachments = await Promise.all(
            req.files.map(async (file) => {
                let currentFilename = file.filename;
                let currentSize = file.size;
                let currentMimetype = file.mimetype;
                let currentPath = file.path;

                if (isProcessableImage(file.mimetype)) {
                    try {
                        const processed = await processImage(file.path, path.dirname(file.path));
                        currentFilename = processed.filename;
                        currentSize = processed.size;
                        currentMimetype = 'image/webp';
                        currentPath = processed.path;
                    } catch (procError) {
                        console.error(`❌ [IMAGE-PROC] Error processing dev task image:`, procError.message);
                    }
                }

                const attachment = await executeWithRetry(async () => {
                    return await getPrisma().devTaskAttachment.create({
                        data: {
                            taskId,
                            fileName: currentFilename,
                            originalName: file.originalname,
                            fileSize: currentSize,
                            fileType: currentMimetype,
                            filePath: currentPath,
                            uploadedBy: req.user.id
                        }
                    });
                });

                return {
                    ...attachment,
                    fileUrl: `/uploads/dev-tasks/${attachment.fileName}`
                };
            })
        );

        // 📝 Log Activities
        try {
            const memberId = await devTeamService.getOrCreateMember(req.user.id);
            if (memberId) {
                for (const attachment of attachments) {
                    await activityLogger.logAttachmentAdded(taskId, memberId, attachment.originalName);
                }
            }
        } catch (logErr) {
            console.error('⚠️ [uploadDevTaskAttachments] Failed to log activity:', logErr);
        }

        console.log(`✅ [UPLOAD] Successfully uploaded ${attachments.length} files`);

        res.status(201).json({
            success: true,
            data: attachments,
            message: `تم رفع ${attachments.length} ملف بنجاح`
        });
    } catch (error) {
        console.error('❌ Error uploading attachments:', error);
        res.status(500).json({ success: false, message: 'Failed to upload attachments' });
    }
};

/**
 * Delete Time Log
 */
const deleteDevTaskTimeLog = async (req, res) => {
    try {
        const { logId } = req.params;

        const log = await getPrisma().devTimeLog.findUnique({ where: { id: logId } });
        if (!log) {
            return res.status(404).json({ success: false, message: 'Time log not found' });
        }

        await getPrisma().devTimeLog.delete({ where: { id: logId } });

        // Recalculate task's actualHours
        const allLogs = await getPrisma().devTimeLog.findMany({
            where: { taskId: log.taskId, isRunning: false }
        });
        const totalMinutes = allLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
        await getPrisma().devTask.update({
            where: { id: log.taskId },
            data: { actualHours: totalMinutes / 60 }
        });

        res.status(200).json({ success: true, message: 'Time log deleted' });
    } catch (error) {
        console.error('❌ Error deleting time log:', error);
        res.status(500).json({ success: false, message: 'Failed to delete time log' });
    }
};

/**
 * Edit Time Log
 */
const editDevTaskTimeLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const { duration, description } = req.body;

        const log = await getPrisma().devTimeLog.update({
            where: { id: logId },
            data: {
                duration: parseInt(duration) || 0,
                description: description || null
            }
        });

        // Recalculate task's actualHours
        const allLogs = await getPrisma().devTimeLog.findMany({
            where: { taskId: log.taskId, isRunning: false }
        });
        const totalMinutes = allLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
        await getPrisma().devTask.update({
            where: { id: log.taskId },
            data: { actualHours: totalMinutes / 60 }
        });

        res.status(200).json({ success: true, data: log });
    } catch (error) {
        console.error('❌ Error editing time log:', error);
        res.status(500).json({ success: false, message: 'Failed to edit time log' });
    }
};

/**
 * Delete Checklist Item
 */
const deleteDevTaskChecklistItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        // Get item with checklist to find taskId before deleting
        const itemToDelete = await executeWithRetry(async () => {
            return await getPrisma().devTaskChecklistItem.findUnique({
                where: { id: itemId },
                include: { dev_task_checklists: true }
            });
        });

        if (!itemToDelete) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        const taskId = itemToDelete.dev_task_checklists.taskId;

        await executeWithRetry(async () => {
            return await getPrisma().devTaskChecklistItem.delete({ where: { id: itemId } });
        });

        // Recalculate progress
        const remainingItems = await executeWithRetry(async () => {
            return await getPrisma().devTaskChecklistItem.findMany({
                where: {
                    dev_task_checklists: { taskId }
                }
            });
        });

        const progress = remainingItems.length > 0
            ? Math.round((remainingItems.filter(i => i.isCompleted).length / remainingItems.length) * 100)
            : 0;

        await executeWithRetry(async () => {
            return await getPrisma().devTask.update({
                where: { id: taskId },
                data: { progress }
            });
        });

        res.status(200).json({ success: true, message: 'Checklist item deleted' });
    } catch (error) {
        console.error('❌ Error deleting checklist item:', error);
        res.status(500).json({ success: false, message: 'Failed to delete checklist item' });
    }
};

/**
 * Delete Attachment
 */
const deleteDevTaskAttachment = async (req, res) => {
    try {
        const { attachmentId } = req.params;
        const fs = require('fs');

        const attachment = await getPrisma().devTaskAttachment.findUnique({ where: { id: attachmentId } });
        if (!attachment) {
            return res.status(404).json({ success: false, message: 'Attachment not found' });
        }

        // Delete file from disk
        if (attachment.filePath && fs.existsSync(attachment.filePath)) {
            fs.unlinkSync(attachment.filePath);
        }

        await getPrisma().devTaskAttachment.delete({ where: { id: attachmentId } });

        // 📝 Log Activity
        try {
            const memberId = await devTeamService.getOrCreateMember(req.user.id);
            if (memberId) {
                await activityLogger.logAttachmentDeleted(attachment.taskId, memberId, attachment.originalName);
            }
        } catch (logErr) {
            console.error('⚠️ [deleteDevTaskAttachment] Failed to log activity:', logErr);
        }

        res.status(200).json({ success: true, message: 'Attachment deleted' });
    } catch (error) {
        console.error('❌ Error deleting attachment:', error);
        res.status(500).json({ success: false, message: 'Failed to delete attachment' });
    }
};

/**
 * Update Task Status
 */
const updateDevTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE', 'BLOCKED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        // 🔐 Apply viewScope filter to check if user can access this task
        const viewScopeFilter = await getViewScopeFilter(req);
        console.log(`🔒 [updateDevTaskStatus] User: ${req.user?.email}, Role: ${req.user?.role}, viewScope filter:`, JSON.stringify(viewScopeFilter));

        // Get current task to check previous status and verify access
        const currentTask = await getPrisma().devTask.findFirst({
            where: {
                id: taskId,
                ...viewScopeFilter // 🔐 Ensure user can only update tasks they have access to
            },
            include: {
                assignee: true,
                dev_time_logs: true
            }
        });

        if (!currentTask) {
            console.warn(`⚠️ [updateDevTaskStatus] Task ${taskId} not found or user ${req.user?.email} doesn't have access`);
            return res.status(404).json({ success: false, message: 'Task not found or access denied' });
        }

        const task = await getPrisma().devTask.update({
            where: { id: taskId },
            data: {
                status,
                completedDate: status === 'DONE' ? new Date() : null
            }
        });

        // 📝 Log Activity
        try {
            const memberId = await devTeamService.getOrCreateMember(req.user.id);
            if (memberId) {
                await activityLogger.logStatusChange(taskId, memberId, currentTask.status, status);
            }
        } catch (logErr) {
            console.error('⚠️ [updateDevTaskStatus] Failed to log activity:', logErr);
        }

        // --- Auto-Create Testing Subtask Logic ---
        if (status === 'DONE' && currentTask.status !== 'DONE' && currentTask.type !== 'TESTING') {
            try {
                const devSettingsService = require('../services/devSettingsService');
                const settings = await devSettingsService.getSettings();

                if (settings.autoTestingSubtask) {
                    console.log(`🤖 [SUPER-ADMIN] Auto-testing enabled. Fetching full details for task ${taskId}...`);

                    // Fetch full task details for cloning (checklists, attachments) in a separate query to be safe
                    let fullTaskDetails = null;
                    try {
                        fullTaskDetails = await getPrisma().devTask.findUnique({
                            where: { id: taskId },
                            include: {
                                dev_task_checklists: { include: { dev_task_checklist_items: true } },
                                dev_task_attachments: true
                            }
                        });
                    } catch (fetchErr) {
                        console.error('❌ Failed to fetch full task details for auto-testing:', fetchErr);
                    }

                    if (fullTaskDetails) {
                        console.log(`🤖 Debug Full Details: Checklists=${fullTaskDetails.dev_task_checklists?.length}, Attachments=${fullTaskDetails.dev_task_attachments?.length}`);
                        console.log(`🤖 Debug Scalar: BV=${fullTaskDetails.businessValue?.substring(0, 20)}..., Tags=${fullTaskDetails.tags}`);
                    } else {
                        console.warn('⚠️ fullTaskDetails is NULL');
                    }

                    // Normalize and Validate Assignee ID
                    let validAssigneeId = undefined;
                    if (settings.autoTestingAssigneeId) {
                        // 🔧 Use helper to resolve potential "virtual-" IDs or regular IDs
                        try {
                            const resolvedId = await devTeamService.getOrCreateMember(settings.autoTestingAssigneeId);
                            if (resolvedId) validAssigneeId = resolvedId;
                        } catch (e) { console.warn('Assignee resolution failed', e); }
                    }

                    // Create Testing Subtask
                    const sourceTask = fullTaskDetails || currentTask; // Prefer full details
                    const newSubtask = await getPrisma().devTask.create({
                        data: {
                            id: require('crypto').randomUUID(),
                            title: `Testing: ${sourceTask.title}`,
                            description: `Auto-generated testing task for: ${sourceTask.title}\n\nOriginal Description:\n${sourceTask.description || ''}`,
                            businessValue: sourceTask.businessValue,
                            acceptanceCriteria: sourceTask.acceptanceCriteria,
                            parentTaskId: taskId,
                            reporterId: sourceTask.reporterId,
                            assigneeId: validAssigneeId,
                            projectId: sourceTask.projectId,
                            companyId: sourceTask.companyId,
                            status: 'TODO',
                            priority: sourceTask.priority,
                            type: 'TESTING',
                            updatedAt: new Date(),
                            tags: sourceTask.tags,
                            labels: sourceTask.labels,
                            relatedLinks: sourceTask.relatedLinks,
                            component: sourceTask.component,
                            ticketId: sourceTask.ticketId
                        }
                    });

                    // --- Clone Checklists ---
                    if (fullTaskDetails?.dev_task_checklists?.length > 0) {
                        for (const checklist of fullTaskDetails.dev_task_checklists) {
                            try {
                                const newChecklistId = require('crypto').randomUUID();
                                await getPrisma().devTaskChecklist.create({
                                    data: {
                                        id: newChecklistId,
                                        taskId: newSubtask.id,
                                        title: checklist.title,
                                        dev_task_checklist_items: {
                                            create: (checklist.dev_task_checklist_items || []).map(item => ({
                                                content: item.content,
                                                isCompleted: false
                                            }))
                                        }
                                    }
                                });
                            } catch (listErr) { console.error('Failed to clone checklist', listErr); }
                        }
                    }

                    // --- Clone Attachments ---
                    if (fullTaskDetails?.dev_task_attachments?.length > 0) {
                        const fs = require('fs');
                        const path = require('path');

                        for (const attachment of fullTaskDetails.dev_task_attachments) {
                            try {
                                // For file system attachments, we should copy the actual file
                                let newFilePath = attachment.filePath;
                                let newFileName = attachment.fileName;

                                // Only try to copy file if it exists locally and isn't just a URL
                                if (attachment.filePath && fs.existsSync(attachment.filePath)) {
                                    const fileExt = path.extname(attachment.filePath);
                                    const newFileBaseName = `copy_${Date.now()}_${require('crypto').randomBytes(4).toString('hex')}${fileExt}`;
                                    const newPath = path.join(path.dirname(attachment.filePath), newFileBaseName);

                                    fs.copyFileSync(attachment.filePath, newPath);
                                    newFilePath = newPath;
                                    newFileName = newFileBaseName; // Update filename relative to upload dir if needed
                                }

                                await getPrisma().devTaskAttachment.create({
                                    data: {
                                        taskId: newSubtask.id,
                                        fileName: newFileName,
                                        originalName: attachment.originalName,
                                        fileSize: attachment.fileSize,
                                        fileType: attachment.fileType,
                                        filePath: newFilePath,
                                        uploadedBy: attachment.uploadedBy
                                    }
                                });
                            } catch (copyErr) {
                                console.error(`⚠️ Failed to copy attachment ${attachment.id} for testing task:`, copyErr);
                                // Continue with other attachments
                            }
                        }
                    }

                    console.log(`🤖 [SUPER-ADMIN] Auto-created testing subtask ${newSubtask.id} (Full Clone) for ${taskId}. Assignee: ${validAssigneeId || 'Unassigned'}`);

                    // 📝 Log Activity for automation
                    try {
                        await activityLogger.logSubtaskCreated(taskId, null, newSubtask.title);
                    } catch (logErr) {
                        console.error('⚠️ [Auto-Testing] Failed to log activity:', logErr);
                    }
                }
            } catch (err) {
                console.error('❌ Error auto-creating testing subtask:', err);
                // Don't fail the request, just log error
            }
        }
        // -----------------------------------------

        // --- Gamification Logic Start ---
        // --- Gamification Logic Start ---
        // CASE 1: Task Completed -> Grant XP
        if (status === 'DONE' && currentTask.status !== 'DONE' && currentTask.assigneeId) {
            // Calculate XP based on dynamic leaderboard settings
            const xpGained = await calculateTaskXP(currentTask);

            // Update Member XP and Level
            await updateMemberXP(currentTask.assigneeId, xpGained);

            // Save XP earned in the task record
            await getPrisma().devTask.update({
                where: { id: taskId },
                data: { xpEarned: xpGained }
            });

            // Create Notification because fun matters
            await getPrisma().devNotification.create({
                data: {
                    memberId: currentTask.assigneeId,
                    type: 'XP_GAIN',
                    title: '🌟 نقاط خبرة مكتسبة!',
                    message: `أحسنت! لقد حصلت على ${xpGained} نقطة (XP) لإكمالك المهمة "${currentTask.title}".`,
                    isRead: false
                }
            });
        }
        // CASE 2: Task Reopened (Was DONE, now NOT DONE) -> Deduct XP (Fix Infinite XP Glitch)
        else if (currentTask.status === 'DONE' && status !== 'DONE' && currentTask.assigneeId) {
            // Calculate XP to deduct using dynamic settings (Must match the gained amount logic)
            const xpLost = await calculateTaskXP(currentTask);

            // Deduct XP (Pass negative value)
            // We pass -xpLost because updateMemberXP adds the value
            console.log(`📉 [updateDevTaskStatus] Deducting ${xpLost} XP from member ${currentTask.assigneeId} for reopening task ${taskId}`);
            await updateMemberXP(currentTask.assigneeId, -xpLost);

            // Clear XP earned from the task record
            await getPrisma().devTask.update({
                where: { id: taskId },
                data: { xpEarned: null }
            });

            // Optional: Create notification about lost XP? Maybe not to annoy them, but good for transparency.
            // Let's silently deduct or add a neutral notification.
            /*
            await getPrisma().devNotification.create({
                data: {
                    memberId: currentTask.assigneeId,
                    type: 'XP_LOSS',
                    title: 'تحديث نقاط الخبرة',
                    message: `تم خصم ${xpLost} نقطة نتيجة إعادة فتح المهمة "${currentTask.title}".`,
                    isRead: false
                }
            });
            */
        }
        // --- Gamification Logic End ---

        res.status(200).json({ success: true, data: task });
    } catch (error) {
        console.error('❌ Error updating task status:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

/**
 * Get Dev Reports
 */
/**
 * Get Unified Dev Dashboard & Reports Data
 */
const getDevUnified = async (req, res) => {
    try {
        const userId = req.user.id;
        const queryPeriod = parseInt(req.query.period);
        const period = isNaN(queryPeriod) ? 30 : queryPeriod;

        // Fetch system settings to get timezone
        const settings = await devSettingsService.getSettings();
        const systemTimezone = settings.timezone || 'Africa/Cairo';

        // Calculate startDate based on timezone
        let startDate;
        if (req.query.period === 'all') {
            startDate = new Date(0); // Epoch
        } else {
            // Use moment-timezone to get the start of the day in the system timezone
            startDate = moment.tz(systemTimezone).subtract(period, 'days').startOf('day').toDate();
        }

        // Parallelize all queries for maximum performance
        const [
            totalTasks,
            overdueTasks,
            activeProjects,
            teamMembers,
            tasksByStatusRaw,
            tasksByPriorityRaw,
            tasksByTypeRaw,
            recentTasks,
            upcomingReleases,
            myTasks,
            allTasks,
            completedTasks,
            projects
        ] = await Promise.all([
            safeQuery(() => getPrisma().devTask.count()).catch(() => 0),
            safeQuery(() => getPrisma().devTask.count({
                where: {
                    dueDate: { lt: new Date() },
                    status: { not: 'DONE' }
                }
            })).catch(() => 0),
            safeQuery(() => getPrisma().devProject.count({ where: { status: 'ACTIVE' } })).catch(() => 0),
            safeQuery(() => getPrisma().devTeamMember.count()).catch(() => 0),
            safeQuery(() => getPrisma().devTask.groupBy({
                by: ['status'],
                _count: { status: true }
            })).catch(() => []),
            safeQuery(() => getPrisma().devTask.groupBy({
                by: ['priority'],
                _count: { priority: true }
            })).catch(() => []),
            safeQuery(() => getPrisma().devTask.groupBy({
                by: ['type'],
                _count: { type: true }
            })).catch(() => []),
            safeQuery(() => getPrisma().devTask.findMany({
                take: 10,
                orderBy: { updatedAt: 'desc' },
                include: {
                    dev_project: { select: { name: true, color: true } },
                    dev_team_members_dev_tasks_assigneeIdTodev_team_members: {
                        include: {
                            user: { select: { firstName: true, lastName: true, avatar: true } }
                        }
                    }
                }
            })).catch(() => []),
            safeQuery(() => getPrisma().devRelease.findMany({
                where: {
                    status: { not: 'RELEASED' }
                },
                take: 5,
                orderBy: { releaseDate: 'asc' },
                include: {
                    dev_project: { select: { name: true } },
                    _count: { select: { dev_tasks: true } }
                }
            })).catch(() => []),
            safeQuery(() => getPrisma().devTask.count({
                where: {
                    dev_team_members_dev_tasks_assigneeIdTodev_team_members: { userId: userId },
                    status: { not: 'DONE' }
                }
            })).catch(() => 0),
            safeQuery(() => getPrisma().devTask.findMany({
                include: {
                    dev_team_members_dev_tasks_assigneeIdTodev_team_members: { include: { user: true } },
                    dev_project: true
                }
            })).catch(() => []),
            safeQuery(() => getPrisma().devTask.findMany({
                where: {
                    status: 'DONE',
                    completedDate: { gte: startDate }
                }
            })).catch(() => []),
            safeQuery(() => getPrisma().devProject.findMany({
                include: { _count: { select: { dev_tasks: true } } }
            })).catch(() => [])
        ]);

        // Transform groupBy results
        const tasksByStatus = (tasksByStatusRaw || []).reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.status }), {});
        const tasksByPriority = (tasksByPriorityRaw || []).reduce((acc, curr) => ({ ...acc, [curr.priority]: curr._count.priority }), {});
        const tasksByType = (tasksByTypeRaw || []).reduce((acc, curr) => ({ ...acc, [curr.type]: curr._count.type }), {});

        // Calculate metrics
        const inProgressTasks = (allTasks || []).filter(t => t.status === 'IN_PROGRESS').length;

        const completionTimes = (completedTasks || []).map(t => {
            if (!t.completedDate || !t.startDate) return 0;
            return (new Date(t.completedDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24);
        });
        const averageCompletionTime = completionTimes.length > 0
            ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
            : 0;

        // Transform recent tasks
        const formattedRecentTasks = (recentTasks || []).map(task => ({
            id: task.id,
            title: task.title,
            type: task.type,
            status: task.status,
            priority: task.priority,
            assigneeName: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members?.user ? `${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.user.firstName} ${task.dev_team_members_dev_tasks_assigneeIdTodev_team_members.user.lastName}` : null,
            assigneeAvatar: task.dev_team_members_dev_tasks_assigneeIdTodev_team_members?.user?.avatar || null,
            projectName: task.dev_project?.name || null,
            projectColor: task.dev_project?.color || null,
            updatedAt: task.updatedAt
        }));

        // Formatted upcoming releases
        const formattedReleases = (upcomingReleases || []).map(release => ({
            id: release.id,
            version: release.version,
            name: release.name,
            status: release.status,
            releaseDate: release.releaseDate,
            projectName: release.dev_project?.name || null,
            tasksCount: release._count?.dev_tasks || 0
        }));

        // Completion Trend
        const completionTrend = [];
        const maxTrendDays = period === 'all' ? 30 : Math.min(period || 1, 30);
        for (let i = 0; i < maxTrendDays; i++) {
            const date = moment().tz(systemTimezone).subtract(i, 'days').format('YYYY-MM-DD');
            completionTrend.push({
                date,
                completed: (completedTasks || []).filter(t => t.completedDate && moment(t.completedDate).tz(systemTimezone).format('YYYY-MM-DD') === date).length,
                created: (allTasks || []).filter(t => t.createdAt && moment(t.createdAt).tz(systemTimezone).format('YYYY-MM-DD') === date).length
            });
        }
        completionTrend.reverse();

        // Team Performance
        const teamMembersData = await safeQuery(() => getPrisma().devTeamMember.findMany({
            include: { user: true }
        }));

        const teamPerformance = (teamMembersData || []).map(member => {
            const memberTasks = (allTasks || []).filter(t => t.assigneeId === member.id);
            const completed = memberTasks.filter(t => t.status === 'DONE').length;
            const inProgress = memberTasks.filter(t => t.status === 'IN_PROGRESS').length;

            // المهام غير المكتملة (TODO, BACKLOG, IN_REVIEW, TESTING, CANCELLED)
            const pending = memberTasks.filter(t =>
                t.status === 'TODO' ||
                t.status === 'BACKLOG' ||
                t.status === 'IN_REVIEW' ||
                t.status === 'TESTING' ||
                t.status === 'CANCELLED'
            ).length;

            // المهام المتأخرة (التي تجاوزت موعد التسليم ولم تكتمل)
            const now = new Date();
            const overdue = memberTasks.filter(t =>
                t.status !== 'DONE' &&
                t.dueDate &&
                new Date(t.dueDate) < now
            ).length;

            // إجمالي المهام
            const totalTasks = memberTasks.length;

            const memberCompletedTasks = completedTasks.filter(t => t.assigneeId === member.id);
            const memberCompletionTimes = memberCompletedTasks.map(t => {
                if (!t.completedDate || !t.startDate) return 0;
                return (new Date(t.completedDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24);
            });
            const avgTime = memberCompletionTimes.length > 0
                ? memberCompletionTimes.reduce((a, b) => a + b, 0) / memberCompletionTimes.length
                : 0;

            const tasksCompletedFiltered = memberCompletedTasks.length;
            const totalRelevantTasks = tasksCompletedFiltered + inProgress + pending + overdue;

            return {
                memberId: member.id,
                memberName: `${member.user.firstName} ${member.user.lastName}`,
                tasksCompleted: tasksCompletedFiltered,
                tasksInProgress: inProgress,
                pendingTasks: pending,
                overdueTasks: overdue,
                totalTasks: totalRelevantTasks,
                averageTime: avgTime,
                completionRate: totalRelevantTasks > 0 ? Math.round((tasksCompletedFiltered / totalRelevantTasks) * 100) : 0
            };
        });

        // Add "Unassigned" category if there are tasks with no assignee
        const unassignedTasks = allTasks.filter(t => !t.assigneeId);
        const unassignedCompleted = (completedTasks || []).filter(t => !t.assigneeId);

        if (unassignedTasks.length > 0 || unassignedCompleted.length > 0) {
            const inProgress = unassignedTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW' || t.status === 'TESTING').length;
            const pending = unassignedTasks.filter(t => t.status === 'TODO' || t.status === 'BACKLOG').length;
            const overdueCount = unassignedTasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < new Date()).length;

            teamPerformance.push({
                memberId: 'unassigned',
                memberName: 'مهام غير محددة المنفذ',
                tasksCompleted: unassignedCompleted.length,
                tasksInProgress: inProgress,
                pendingTasks: pending,
                overdueTasks: overdueCount,
                totalTasks: unassignedTasks.length,
                averageTime: 0,
                completionRate: unassignedTasks.length > 0 ? Math.round((unassignedCompleted.length / unassignedTasks.length) * 100) : 0
            });
        }

        // Project Stats
        const projectStats = await Promise.all((projects || []).map(async (project) => {
            const projectTasks = await safeQuery(() => getPrisma().devTask.findMany({
                where: { projectId: project.id }
            })).catch(() => []);
            const completed = (projectTasks || []).filter(t => t.status === 'DONE').length;
            const total = project._count?.dev_tasks || (projectTasks || []).length;

            return {
                projectId: project.id,
                projectName: project.name,
                tasksCount: total,
                completedTasks: completed,
                progress: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        }));

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalTasks: totalTasks || 0,
                    myTasks: myTasks || 0,
                    completedTasks: (completedTasks || []).length,
                    inProgressTasks: inProgressTasks || 0,
                    overdueTasks: overdueTasks || 0,
                    averageCompletionTime,
                    activeProjects: activeProjects || 0,
                    teamMembers: teamMembers || 0
                },
                tasksByStatus,
                tasksByPriority,
                tasksByType,
                completionTrend,
                recentTasks: formattedRecentTasks,
                upcomingReleases: formattedReleases,
                teamPerformance,
                projectStats
            }
        });

    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching unified data:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unified data',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const getDevReports = async (req, res) => {
    try {
        const queryPeriod = parseInt(req.query.period);
        const period = isNaN(queryPeriod) ? 30 : queryPeriod;

        // Fetch system settings to get timezone
        const settings = await devSettingsService.getSettings();
        const systemTimezone = settings.timezone || 'Africa/Cairo';

        // Calculate startDate based on timezone
        let startDate;
        if (req.query.period === 'all') {
            startDate = new Date(0); // Epoch
        } else {
            // Use moment-timezone to get the start of the day in the system timezone
            startDate = moment.tz(systemTimezone).subtract(period, 'days').startOf('day').toDate();
        }

        const [
            allTasks,
            completedTasks,
            teamMembers,
            projects
        ] = await Promise.all([
            getPrisma().devTask.findMany({
                where: { createdAt: { gte: startDate } },
                include: {
                    dev_team_members_dev_tasks_assigneeIdTodev_team_members: { include: { user: true } },
                    dev_project: true
                }
            }),
            getPrisma().devTask.findMany({
                where: {
                    status: 'DONE',
                    completedDate: { gte: startDate }
                }
            }),
            getPrisma().devTeamMember.findMany({
                include: { user: true }
            }),
            getPrisma().devProject.findMany({
                include: { _count: { select: { dev_tasks: true } } }
            })
        ]);

        const totalTasks = allTasks.length;
        const inProgressTasks = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
        const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length;

        // Calculate average completion time
        const completionTimes = completedTasks.map(t => {
            if (!t.completedDate || !t.startDate) return 0;
            return (new Date(t.completedDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24); // days
        });
        const averageCompletionTime = completionTimes.length > 0
            ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
            : 0;

        // Group by Type
        const tasksByType = allTasks.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
        }, {});

        // Group by Priority
        const tasksByPriority = allTasks.reduce((acc, t) => {
            acc[t.priority] = (acc[t.priority] || 0) + 1;
            return acc;
        }, {});

        // Group by Status
        const tasksByStatus = allTasks.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {});



        // Completion Trend
        const completionTrend = [];
        for (let i = 0; i < Math.max(period, 1); i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            completionTrend.push({
                date: dateStr,
                completed: completedTasks.filter(t => t.completedDate && t.completedDate.toISOString().startsWith(dateStr)).length,
                created: allTasks.filter(t => t.createdAt.toISOString().startsWith(dateStr)).length
            });
        }
        completionTrend.reverse();

        // Team Performance
        const teamPerformance = teamMembers.map(member => {
            const memberTasks = allTasks.filter(t => t.assigneeId === member.id);
            const completed = memberTasks.filter(t => t.status === 'DONE').length;
            const inProgress = memberTasks.filter(t => t.status === 'IN_PROGRESS').length;

            // Calculate member avg completion time
            const memberCompletedTasks = completedTasks.filter(t => t.assigneeId === member.id);
            const memberCompletionTimes = memberCompletedTasks.map(t => {
                if (!t.completedDate || !t.startDate) return 0;
                return (new Date(t.completedDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24);
            });
            const avgTime = memberCompletionTimes.length > 0
                ? memberCompletionTimes.reduce((a, b) => a + b, 0) / memberCompletionTimes.length
                : 0;

            return {
                memberId: member.id,
                memberName: `${member.user.firstName} ${member.user.lastName}`,
                tasksCompleted: completed,
                tasksInProgress: inProgress,
                averageTime: avgTime,
                completionRate: memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0
            };
        });

        // Project Stats
        const projectStats = await Promise.all(projects.map(async (project) => {
            const projectTasks = await getPrisma().devTask.findMany({
                where: { projectId: project.id }
            });
            const completed = projectTasks.filter(t => t.status === 'DONE').length;
            // project.tasks is not loaded, so we rely on projectTasks query or project._count.tasks
            const total = project._count?.dev_tasks || projectTasks.length;

            return {
                projectId: project.id,
                projectName: project.name,
                tasksCount: total,
                completedTasks: completed,
                progress: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        }));

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalTasks,
                    completedTasks: completedTasks.length,
                    inProgressTasks,
                    overdueTasks,
                    averageCompletionTime,
                    teamMembers: teamMembers.length
                },
                tasksByType,
                tasksByPriority,
                tasksByStatus,
                completionTrend,
                teamPerformance,
                projectStats
            }
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching reports:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reports' });
    }
};

/**
 * Get Current User Permissions
 */
const getCurrentUserPermissions = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Get user permissions from settings
        const settings = await devSettingsService.getSettings();
        const userRole = normalizeRole(req.user.role);

        let permissions = {};
        if (req.user.role === 'SUPER_ADMIN') {
            // SUPER_ADMIN has all permissions
            permissions = {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                canChangeStatus: true,
                canArchive: true,
                canViewReports: true,
                canManageProjects: true,
                canExport: true,
                canAccessSettings: true,
                canManageTaskSettings: true,
                canViewAll: true,
                viewScope: 'all'
            };
        } else {
            // Get permissions from settings
            const rolePermissions = settings.permissions[userRole] || settings.permissions[req.user.role] || {};
            permissions = {
                canCreate: rolePermissions.canCreate || false,
                canEdit: rolePermissions.canEdit || false,
                canDelete: rolePermissions.canDelete || false,
                canComment: rolePermissions.canComment !== false, // Default true
                canAssign: rolePermissions.canAssign || false,
                canChangeStatus: rolePermissions.canChangeStatus || false,
                canArchive: rolePermissions.canArchive || false,
                canViewReports: rolePermissions.canViewReports || false,
                canManageProjects: rolePermissions.canManageProjects || false,
                canExport: rolePermissions.canExport || false,
                canAccessSettings: rolePermissions.canAccessSettings || false,
                canManageTaskSettings: rolePermissions.canManageTaskSettings || false,
                canViewAll: rolePermissions.canViewAll || false,
                viewScope: rolePermissions.viewScope || 'assigned_only'
            };
        }

        // Get team member record to get memberId
        const teamMember = await getPrisma().devTeamMember.findFirst({
            where: { userId: req.user.id }
        });

        res.status(200).json({
            success: true,
            data: {
                role: req.user.role,
                permissions: permissions,
                memberId: teamMember ? teamMember.id : null
            }
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
    }
};

/**
 * Duplicate Dev Task with optional new assignee
 */
const duplicateDevTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { newAssigneeId, includeChecklists } = req.body;

        console.log('🔄 [DUPLICATE-TASK] Starting duplication for task:', id);

        // Fetch original task
        const originalTask = await executeWithRetry(async () => {
            return await getPrisma().devTask.findUnique({
                where: { id },
                include: {
                    dev_task_checklists: {
                        include: {
                            dev_task_checklist_items: true
                        }
                    },
                    dev_task_watchers: true
                }
            });
        });

        if (!originalTask) {
            return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
        }

        console.log('✅ [DUPLICATE-TASK] Original task found:', originalTask.title);

        // Determine assignee
        let duplicateAssigneeId = originalTask.assigneeId;
        if (newAssigneeId && newAssigneeId.trim() !== '') {
            duplicateAssigneeId = await devTeamService.getOrCreateMember(newAssigneeId);
            if (!duplicateAssigneeId) {
                duplicateAssigneeId = originalTask.assigneeId;
            }
        }

        // Get reporter
        const reporterId = await devTeamService.getOrCreateMember(req.user.id) || originalTask.reporterId;

        // Create base task data
        const taskData = {
            id: require('crypto').randomUUID(),
            title: `(نسخة) ${originalTask.title}`,
            description: originalTask.description || '',
            businessValue: originalTask.businessValue,
            acceptanceCriteria: originalTask.acceptanceCriteria,
            type: originalTask.type || 'FEATURE',
            priority: originalTask.priority || 'MEDIUM',
            status: 'BACKLOG',
            assigneeId: duplicateAssigneeId,
            reporterId: reporterId,
            projectId: originalTask.projectId,
            releaseId: originalTask.releaseId,
            dueDate: originalTask.dueDate,
            startDate: new Date(),
            estimatedHours: originalTask.estimatedHours || 0,
            actualHours: 0,
            progress: 0,
            component: originalTask.component,
            tags: originalTask.tags || '[]',
            gitBranch: originalTask.gitBranch,
            companyId: originalTask.companyId,
            ticketId: originalTask.ticketId,
            updatedAt: new Date()
        };

        // Add checklists if requested
        if (includeChecklists && originalTask.dev_task_checklists && originalTask.dev_task_checklists.length > 0) {
            taskData.dev_task_checklists = {
                create: originalTask.dev_task_checklists.map(checklist => ({
                    id: require('crypto').randomUUID(),
                    title: checklist.title,
                    updatedAt: new Date(),
                    dev_task_checklist_items: {
                        create: (checklist.dev_task_checklist_items || []).map((item, index) => ({
                            id: require('crypto').randomUUID(),
                            content: item.content,
                            position: index,
                            isCompleted: false,
                            updatedAt: new Date()
                        }))
                    }
                }))
            };
        }

        // Add watchers if exist
        if (originalTask.dev_task_watchers && originalTask.dev_task_watchers.length > 0) {
            taskData.dev_task_watchers = {
                create: originalTask.dev_task_watchers.map(watcher => ({
                    memberId: watcher.memberId
                }))
            };
        }

        // Create duplicated task
        const duplicatedTask = await executeWithRetry(async () => {
            return await getPrisma().devTask.create({
                data: taskData,
                include: {
                    assignee: {
                        include: {
                            user: {
                                select: { firstName: true, lastName: true, avatar: true }
                            }
                        }
                    },
                    project: {
                        select: { name: true, color: true }
                    },
                    reporter: {
                        include: {
                            user: {
                                select: { firstName: true, lastName: true, avatar: true }
                            }
                        }
                    }
                }
            });
        });

        console.log('✅ [DUPLICATE-TASK] Task duplicated successfully:', duplicatedTask.id);

        res.status(201).json({
            success: true,
            data: duplicatedTask,
            message: 'تم تكرار المهمة بنجاح'
        });
    } catch (error) {
        console.error('❌ [DUPLICATE-TASK] Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'فشل في تكرار المهمة: ' + error.message
        });
    }
};

/**
 * Get Dev System Settings
 */
const getDevSettings = async (req, res) => {
    try {
        const settings = await devSettingsService.getSettings();
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

/**
 * Update Dev System Settings
 * 🔐 SECURITY: Restricted sensitive fields (permissions) to SUPER_ADMIN only
 */
const updateDevSettings = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // 🔐 PROT: Only SUPER_ADMIN can modify the permissions object
        if (updateData.permissions && req.user.role !== 'SUPER_ADMIN') {
            console.warn(`🚫 [SECURITY] User ${req.user.email} (${req.user.role}) attempted to modify permissions without SUPER_ADMIN role`);

            // Delete permissions from update data if not authorized
            delete updateData.permissions;

            // If permissions was the ONLY thing being updated, return 403
            if (Object.keys(updateData).length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'لا يمكنك تعديل كائن الصلاحيات - هذه الصلاحية محصورة للسوبر أدمن فقط'
                });
            }
        }

        const settings = await devSettingsService.updateSettings(updateData);

        // 📝 Audit Log: Settings Change
        await logPermissionChange('SETTINGS_UPDATED', req.user.id, 'default', {
            updatedBy: req.user.email,
            fieldsUpdated: Object.keys(updateData),
            hadPermissionsField: !!req.body.permissions
        });

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
};

/**
 * ⏱️ Start Task Timer
 */
/**
 * ⏱️ Start Task Timer
 */
const startDevTaskTimer = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;

        // Verify task exists
        const task = await getPrisma().devTask.findUnique({
            where: { id: taskId },
            include: { project: true }
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
        }

        // Get team member ID
        const memberId = await devTeamService.getOrCreateMember(userId);

        // Check for ANY existing running timer for this user
        const runningTimer = await getPrisma().devTimeLog.findFirst({
            where: {
                memberId: memberId,
                isRunning: true
            },
            include: { dev_tasks: true }
        });

        if (runningTimer) {
            // If it's the same task, return helpful message
            if (runningTimer.taskId === taskId) {
                return res.status(400).json({ success: false, message: 'المؤقت يعمل بالفعل لهذه المهمة' });
            }
            // If different task, block and inform
            return res.status(400).json({
                success: false,
                message: `لديك مؤقت نشط بالفعل في مهمة أخرى: ${runningTimer.dev_tasks?.title}`,
                activeTimeoutId: runningTimer.taskId
            });
        }

        // Create new timer
        const timer = await getPrisma().devTimeLog.create({
            data: {
                taskId,
                memberId: memberId,
                startTime: new Date(),
                description: 'Timer started',
                isRunning: true,
                isPaused: false
            }
        });

        res.json({
            success: true,
            message: 'تم بدء المؤقت',
            data: {
                ...timer,
                taskTitle: task.title,
                projectName: task.project?.name
            }
        });

    } catch (error) {
        console.error('❌ [TIMER] Error starting timer:', error);
        res.status(500).json({ success: false, message: 'فشل بدء المؤقت', error: error.message });
    }
};

/**
 * ⏹️ Stop Task Timer
 */
const stopDevTaskTimer = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;
        const memberId = await devTeamService.getOrCreateMember(userId);

        // Find running timer
        const runningTimer = await getPrisma().devTimeLog.findFirst({
            where: {
                taskId,
                memberId: memberId,
                isRunning: true
            }
        });

        if (!runningTimer) {
            return res.status(404).json({ success: false, message: 'لا يوجد مؤقت نشط لهذه المهمة' });
        }

        const endTime = new Date();
        const startTime = new Date(runningTimer.startTime);
        const diffMs = endTime - startTime;

        // Use Math.ceil to ensure at least 1 minute is logged if ANY time was spent
        const durationMinutes = Math.max(1, Math.ceil(diffMs / (1000 * 60)));

        // Update timer
        const updatedTimer = await getPrisma().devTimeLog.update({
            where: { id: runningTimer.id },
            data: {
                endTime,
                duration: durationMinutes,
                isRunning: false,
                isPaused: false
            }
        });

        res.json({
            success: true,
            message: 'تم إيقاف المؤقت',
            data: updatedTimer
        });

    } catch (error) {
        console.error('❌ [TIMER] Error stopping timer:', error);
        res.status(500).json({ success: false, message: 'فشل إيقاف المؤقت', error: error.message });
    }
};

/**
 * ⏸️ Pause Task Timer
 */
const pauseDevTaskTimer = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;
        const memberId = await devTeamService.getOrCreateMember(userId);

        const runningTimer = await getPrisma().devTimeLog.findFirst({
            where: {
                taskId,
                memberId: memberId,
                isRunning: true,
                isPaused: false
            }
        });

        if (!runningTimer) {
            return res.status(404).json({ success: false, message: 'لا يوجد مؤقت نشط لإيقافه مؤقتاً' });
        }

        // Close current interval
        const endTime = new Date();
        const startTime = new Date(runningTimer.startTime);
        const durationMinutes = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60)));

        const updatedTimer = await getPrisma().devTimeLog.update({
            where: { id: runningTimer.id },
            data: {
                endTime,
                duration: durationMinutes,
                isRunning: false,
                isPaused: true,
                pausedAt: endTime
            }
        });

        res.json({
            success: true,
            message: 'تم إيقاف المؤقت مؤقتاً',
            data: updatedTimer
        });

    } catch (error) {
        console.error('❌ [TIMER] Error pausing timer:', error);
        res.status(500).json({ success: false, message: 'فشل إيقاف المؤقت مؤقتاً', error: error.message });
    }
};

/**
 * ▶️ Resume Task Timer
 */
const resumeDevTaskTimer = async (req, res) => {
    // Re-use start logic
    return startDevTaskTimer(req, res);
};

/**
 * 🔍 Get Active Timer for User
 */
const getActiveTimer = async (req, res) => {
    try {
        const userId = req.user.id;
        const memberId = await devTeamService.getOrCreateMember(userId);

        const activeTimer = await getPrisma().devTimeLog.findFirst({
            where: {
                memberId: memberId,
                isRunning: true
            },
            include: {
                dev_task: {
                    select: {
                        title: true,
                        dev_project: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        if (!activeTimer) {
            return res.json({ success: true, data: null });
        }

        res.json({
            success: true,
            data: {
                taskId: activeTimer.taskId,
                startTime: activeTimer.startTime,
                taskTitle: activeTimer.dev_task?.title,
                projectName: activeTimer.dev_task?.dev_project?.name,
                isPaused: activeTimer.isPaused
            }
        });

    } catch (error) {
        console.error('❌ [TIMER] Error fetching active timer:', error);
        res.status(500).json({ success: false, message: 'فشل جلب المؤقت النشط', error: error.message });
    }
};

/**
 * 📋 Get All Active Timers (for all team members)
 */
const getAllActiveTimers = async (req, res) => {
    try {
        const activeTimers = await getPrisma().devTimeLog.findMany({
            where: {
                isRunning: true
            },
            include: {
                dev_task: {
                    select: {
                        id: true,
                        title: true,
                        priority: true,
                        status: true,
                        dev_project: {
                            select: { name: true }
                        }
                    }
                },
                dev_team_member: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                startTime: 'desc'
            }
        });

        const formattedTimers = activeTimers.map(timer => ({
            id: timer.id,
            taskId: timer.taskId,
            taskTitle: timer.dev_task?.title || 'Unknown Task',
            taskPriority: timer.dev_task?.priority || 'MEDIUM',
            taskStatus: timer.dev_task?.status || 'TODO',
            projectName: timer.dev_task?.dev_project?.name || null,
            memberName: timer.dev_team_member?.user
                ? `${timer.dev_team_member.user.firstName} ${timer.dev_team_member.user.lastName}`
                : 'Unknown',
            memberId: timer.memberId,
            startTime: timer.startTime,
            duration: timer.duration || 0,
            isRunning: timer.isRunning,
            isPaused: timer.isPaused || false,
            elapsedMinutes: Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 60000)
        }));

        res.json({
            success: true,
            data: formattedTimers,
            count: formattedTimers.length
        });

    } catch (error) {
        console.error('❌ [TIMER] Error fetching all active timers:', error);
        res.status(500).json({ success: false, message: 'فشل جلب المؤقتات النشطة', error: error.message });
    }
};


/**
 * 📜 Get Escalation History
 */
// Simple Cache for Image Statistics
let statsCache = {
    data: null,
    lastFetch: 0
};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * 📊 Get Server Disk Usage Statistics
 * Returns total, used, and free space on the server
 */
const getServerDiskUsage = async (req, res) => {
    try {
        const { exec } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        const isWindows = process.platform === 'win32';

        // Helper to get directory size recursively (Memory efficient)
        const getDirSize = (dirPath) => {
            return new Promise((resolve) => {
                if (!fs.existsSync(dirPath)) return resolve(0);

                if (!isWindows) {
                    // Fast way on Linux
                    exec(`du -sb "${dirPath}"`, (error, stdout) => {
                        if (error) return resolve(0);
                        const size = parseInt(stdout.split(/\s+/)[0]);
                        resolve(isNaN(size) ? 0 : size);
                    });
                } else {
                    // Iterative approach for Windows to avoid stack overflow and reduce memory pressure
                    let totalSize = 0;
                    try {
                        const stack = [dirPath];
                        while (stack.length > 0) {
                            const currentDir = stack.pop();
                            const files = fs.readdirSync(currentDir, { withFileTypes: true });

                            for (const file of files) {
                                const filePath = path.join(currentDir, file.name);
                                if (file.isDirectory()) {
                                    stack.push(filePath);
                                } else {
                                    const stats = fs.statSync(filePath);
                                    totalSize += stats.size;
                                }
                            }
                        }
                        resolve(totalSize);
                    } catch (e) {
                        console.error(`Error walking ${dirPath}:`, e);
                        resolve(0);
                    }
                }
            });
        };

        const getStats = () => {
            return new Promise((resolve, reject) => {
                if (isWindows) {
                    exec('wmic logicaldisk where "DeviceID=\'C:\'" get size,freespace', (error, stdout) => {
                        if (error) return reject(error);
                        const lines = stdout.trim().split('\n');
                        if (lines.length < 2) return reject(new Error('Unexpected wmic output'));
                        const parts = lines[1].trim().split(/\s+/).filter(Boolean);
                        const free = parseInt(parts[0]);
                        const size = parseInt(parts[1]);
                        resolve({
                            total: size,
                            free: free,
                            used: size - free,
                            usagePercent: parseFloat(((size - free) / size * 100).toFixed(2))
                        });
                    });
                } else {
                    exec('df -B1 /', (error, stdout) => {
                        if (error) return reject(error);
                        const lines = stdout.trim().split('\n');
                        const targetLine = lines.find(l => l.includes('/') && !l.includes('tmpfs'));
                        if (!targetLine) return reject(new Error('Could not find root partition'));
                        const parts = targetLine.trim().split(/\s+/);
                        const total = parseInt(parts[1]);
                        const used = parseInt(parts[2]);
                        const free = parseInt(parts[3]);
                        resolve({
                            total,
                            used,
                            free,
                            usagePercent: parseFloat((used / total * 100).toFixed(2))
                        });
                    });
                }
            });
        };

        const [stats, imgSize, vidSize, audSize, docSize, hrDocSize] = await Promise.all([
            getStats(),
            getDirSize(path.join(process.cwd(), 'public/uploads/whatsapp/images')),
            getDirSize(path.join(process.cwd(), 'public/uploads/whatsapp/videos')),
            getDirSize(path.join(process.cwd(), 'public/uploads/whatsapp/audio')),
            getDirSize(path.join(process.cwd(), 'public/uploads/whatsapp/documents')),
            getDirSize(path.join(process.cwd(), 'public/uploads/hr/documents'))
        ]);

        const breakdown = {
            images: imgSize,
            videos: vidSize,
            audio: audSize,
            documents: docSize + hrDocSize,
            other: stats.used - (imgSize + vidSize + audSize + docSize + hrDocSize)
        };

        return res.status(200).json({
            success: true,
            data: {
                ...stats,
                breakdown,
                platform: process.platform,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('❌ [SuperAdminController] Error getting disk usage:', error);
        return res.status(500).json({
            success: false,
            message: 'فشل في جلب إحصائيات القرص الصلب',
            error: error.message
        });
    }
};

/**
 * Get Image Usage Statistics for all companies (Optimized)
 */
const getImageStatistics = async (req, res) => {
    try {
        // Return cached data if available and fresh
        const now = Date.now();
        if (statsCache.data && (now - statsCache.lastFetch < CACHE_DURATION)) {
            console.log('⚡ [SUPER-ADMIN] Returning cached image statistics');
            return res.status(200).json({
                success: true,
                data: statsCache.data,
                cached: true
            });
        }

        const prisma = getPrisma();
        const companies = await prisma.company.findMany({
            select: { id: true, name: true }
        });

        const DEFAULT_ESTIMATED_SIZE = 500 * 1024; // 500KB estimate
        const PRODUCT_IMAGE_ESTIMATE = 200 * 1024; // 200KB estimate

        const stats = await Promise.all(companies.map(async (company) => {
            // 1. Image Gallery Stats (Aggregated in DB - High Performance)
            const galleryStats = await prisma.imageGallery.aggregate({
                where: { companyId: company.id },
                _count: { id: true },
                _sum: { fileSize: true }
            });

            // 2. Products Image Stats (Estimated to avoid Disk I/O)
            const products = await prisma.product.findMany({
                where: { companyId: company.id },
                select: { images: true }
            });

            let productImagesCount = 0;
            products.forEach(product => {
                if (product.images) {
                    try {
                        const imagesArr = typeof product.images === 'string'
                            ? JSON.parse(product.images)
                            : product.images;
                        if (Array.isArray(imagesArr)) {
                            productImagesCount += imagesArr.length;
                        }
                    } catch (e) { }
                }
            });
            const productImagesSize = productImagesCount * PRODUCT_IMAGE_ESTIMATE;

            // 3. Chat Messages Images (Estimated to avoid heavy JSON parsing loop)
            const chatImageCount = await prisma.message.count({
                where: {
                    type: 'IMAGE',
                    conversations: { companyId: company.id }
                }
            });
            const chatImagesSize = chatImageCount * DEFAULT_ESTIMATED_SIZE;

            // 4. WhatsApp Messages Images
            const whatsappImageCount = await prisma.whatsAppMessage.count({
                where: {
                    whatsapp_sessions: { companyId: company.id },
                    messageType: 'IMAGE'
                }
            });
            const whatsappImagesSize = whatsappImageCount * DEFAULT_ESTIMATED_SIZE;

            const totalCount = (galleryStats._count.id || 0) + productImagesCount + chatImageCount + whatsappImageCount;
            const totalSize = Number(galleryStats._sum.fileSize || 0) + productImagesSize + chatImagesSize + whatsappImagesSize;

            return {
                companyId: company.id,
                companyName: company.name,
                galleryCount: galleryStats._count.id || 0,
                gallerySize: Number(galleryStats._sum.fileSize || 0),
                productCount: productImagesCount,
                productSize: productImagesSize,
                chatImageCount,
                chatImageSize: chatImagesSize,
                whatsappImageCount,
                whatsappImageSize: whatsappImagesSize,
                totalCount,
                totalSize
            };
        }));

        // Update Cache
        statsCache = {
            data: stats,
            lastFetch: now
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching image statistics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch image statistics', error: error.message });
    }
};

/**
 * Delete Chat Images older than a specific date (Batch Processing to avoid DB overload)
 */
const deleteOldChatImages = async (req, res) => {
    try {
        const { months } = req.body;
        if (months === undefined || isNaN(months)) {
            return res.status(400).json({ success: false, message: 'Invalid months parameter' });
        }

        const dateThreshold = new Date();
        if (parseInt(months) > 0) {
            dateThreshold.setMonth(dateThreshold.getMonth() - parseInt(months));
        } else {
            // If months is 0, delete EVERYTHING (set date to future)
            dateThreshold.setFullYear(dateThreshold.getFullYear() + 10);
        }

        console.log(`🧹 [SUPER-ADMIN] Deleting chat images older than ${dateThreshold.toISOString()}`);

        const prisma = getPrisma();
        const BATCH_SIZE = 1000; // Process 1000 records at a time
        let totalChatDeleted = 0;
        let totalWhatsappDeleted = 0;
        let totalMediaDeleted = 0;

        // Helper function to delete in batches with physical file removal
        const deleteBatch = async (model, whereClause, urlField = null) => {
            let totalDeleted = 0;
            let hasMore = true;

            while (hasMore) {
                // Find records with their URLs
                const records = await model.findMany({
                    where: whereClause,
                    select: { id: true, [urlField || 'id']: true },
                    take: BATCH_SIZE
                });

                if (records.length === 0) {
                    hasMore = false;
                    break;
                }

                // Delete physical files first
                if (urlField) {
                    for (const record of records) {
                        const urlData = record[urlField];
                        if (urlData) {
                            // attachments and images are JSON arrays
                            if (typeof urlData === 'string' && (urlData.startsWith('[') || urlData.startsWith('{'))) {
                                try {
                                    const parsed = JSON.parse(urlData);
                                    const urls = Array.isArray(parsed) ? parsed : [parsed];
                                    for (const item of urls) {
                                        const url = typeof item === 'string' ? item : (item.url || null);
                                        if (url) await fileCleanupService.deletePhysicalFile(url);
                                    }
                                } catch (e) { }
                            } else if (typeof urlData === 'string') {
                                await fileCleanupService.deletePhysicalFile(urlData);
                            }
                        }
                    }
                }

                // Delete this batch from DB
                const batchResult = await model.deleteMany({
                    where: {
                        id: { in: records.map(r => r.id) }
                    }
                });

                totalDeleted += batchResult.count;
                console.log(`🗑️ [BATCH-DELETE] Deleted ${batchResult.count} records (Total: ${totalDeleted})`);

                // Small delay to prevent overwhelming the database
                await new Promise(resolve => setTimeout(resolve, 100));

                // Check if there are more records
                if (records.length < BATCH_SIZE) {
                    hasMore = false;
                }
            }

            return totalDeleted;
        };

        // 1. Delete from Message (Chat) - in batches
        console.log('🔄 [BATCH-DELETE] Starting Message deletion...');
        totalChatDeleted = await deleteBatch(prisma.message, {
            type: 'IMAGE',
            createdAt: { lt: dateThreshold }
        }, 'attachments');

        // 2. Delete from WhatsAppMessage - in batches
        console.log('🔄 [BATCH-DELETE] Starting WhatsAppMessage deletion...');
        totalWhatsappDeleted = await deleteBatch(prisma.whatsAppMessage, {
            messageType: 'IMAGE',
            timestamp: { lt: dateThreshold }
        }, 'mediaUrl');

        // 3. Delete from MediaFile - in batches
        console.log('🔄 [BATCH-DELETE] Starting MediaFile deletion...');
        totalMediaDeleted = await deleteBatch(prisma.mediaFile, {
            createdAt: { lt: dateThreshold }
        }, 'fileUrl');

        console.log(`✅ [BATCH-DELETE] Completed! Chat: ${totalChatDeleted}, WhatsApp: ${totalWhatsappDeleted}, Media: ${totalMediaDeleted}`);

        // ⚡ [CACHE-CLEAR] Clear statistics cache so the user sees results immediately
        statsCache.data = null;
        statsCache.lastFetch = 0;

        res.json({
            success: true,
            message: `Successfully deleted old images in batches`,
            details: {
                chatDeleted: totalChatDeleted,
                whatsappDeleted: totalWhatsappDeleted,
                mediaDeleted: totalMediaDeleted
            }
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error deleting old images:', error);
        res.status(500).json({ success: false, message: 'Failed to delete old images', error: error.message });
    }
};

/**
 * Delete images associated with a specific company (Granular with Batch Processing)
 */
const deleteCompanyImages = async (req, res) => {
    try {
        const { companyId, target } = req.body;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required' });
        }

        console.log(`🧹 [SUPER-ADMIN] Deleting ${target || 'ALL'} images for company: ${companyId}`);

        const prisma = getPrisma();
        const BATCH_SIZE = 1000;
        const details = {
            galleryDeleted: 0,
            productsReset: 0,
            chatDeleted: 0,
            whatsappDeleted: 0
        };

        // Helper function to delete in batches (Modified to support physical deletion)
        const deleteBatch = async (model, whereClause, urlField = null) => {
            let totalDeleted = 0;
            let hasMore = true;

            while (hasMore) {
                const records = await model.findMany({
                    where: whereClause,
                    select: { id: true, [urlField || 'id']: true },
                    take: BATCH_SIZE
                });

                if (records.length === 0) {
                    hasMore = false;
                    break;
                }

                // Physical deletion
                if (urlField) {
                    for (const record of records) {
                        const urlData = record[urlField];
                        if (urlData) {
                            if (typeof urlData === 'string' && (urlData.startsWith('[') || urlData.startsWith('{'))) {
                                try {
                                    const parsed = JSON.parse(urlData);
                                    const urls = Array.isArray(parsed) ? parsed : [parsed];
                                    for (const item of urls) {
                                        const url = typeof item === 'string' ? item : (item.url || null);
                                        if (url) await fileCleanupService.deletePhysicalFile(url);
                                    }
                                } catch (e) { }
                            } else if (typeof urlData === 'string') {
                                await fileCleanupService.deletePhysicalFile(urlData);
                            }
                        }
                    }
                }

                const batchResult = await model.deleteMany({
                    where: {
                        id: { in: records.map(r => r.id) }
                    }
                });

                totalDeleted += batchResult.count;
                console.log(`🗑️ [BATCH-DELETE] Deleted ${batchResult.count} records (Total: ${totalDeleted})`);

                await new Promise(resolve => setTimeout(resolve, 100));

                if (records.length < BATCH_SIZE) {
                    hasMore = false;
                }
            }

            return totalDeleted;
        };

        // 1. Delete from ImageGallery - in batches
        if (!target || target === 'ALL' || target === 'GALLERY') {
            console.log('🔄 [BATCH-DELETE] Starting ImageGallery deletion...');
            details.galleryDeleted = await deleteBatch(prisma.imageGallery, { companyId }, 'fileUrl');
        }

        // 2. Clear product images - in batches (for safety)
        if (!target || target === 'ALL' || target === 'PRODUCTS') {
            console.log('🔄 [BATCH-UPDATE] Clearing product images...');
            let hasMoreProducts = true;
            while (hasMoreProducts) {
                const products = await prisma.product.findMany({
                    where: { companyId },
                    select: { id: true, images: true },
                    take: BATCH_SIZE
                });

                if (products.length === 0) {
                    hasMoreProducts = false;
                    break;
                }

                // Clear physical files for products too
                for (const p of products) {
                    if (p.images) {
                        try {
                            const imagesArr = JSON.parse(p.images);
                            if (Array.isArray(imagesArr)) {
                                for (const img of imagesArr) {
                                    const url = typeof img === 'string' ? img : (img.url || null);
                                    if (url) await fileCleanupService.deletePhysicalFile(url);
                                }
                            }
                        } catch (e) { }
                    }
                }

                const updateResult = await prisma.product.updateMany({
                    where: {
                        id: { in: products.map(p => p.id) }
                    },
                    data: { images: '[]' }
                });

                details.productsReset += updateResult.count;
                console.log(`🔄 [BATCH-UPDATE] Updated ${updateResult.count} products (Total: ${details.productsReset})`);

                await new Promise(resolve => setTimeout(resolve, 100));

                if (products.length < BATCH_SIZE) {
                    hasMoreProducts = false;
                }
            }
        }

        // 3. Delete Session Images (Chat) - in batches
        if (!target || target === 'ALL' || target === 'CHAT') {
            console.log('🔄 [BATCH-DELETE] Starting Message deletion...');
            details.chatDeleted = await deleteBatch(prisma.message, {
                type: 'IMAGE',
                conversations: { companyId }
            }, 'attachments');

            // 4. Delete WhatsApp Images - in batches
            console.log('🔄 [BATCH-DELETE] Starting WhatsAppMessage deletion...');
            details.whatsappDeleted = await deleteBatch(prisma.whatsAppMessage, {
                whatsapp_sessions: { companyId },
                messageType: 'IMAGE'
            }, 'mediaUrl');
        }

        console.log(`✅ [BATCH-DELETE] Completed for company ${companyId}!`, details);

        // ⚡ [CACHE-CLEAR] Clear statistics cache so the user sees results immediately
        statsCache.data = null;
        statsCache.lastFetch = 0;

        res.json({
            success: true,
            message: `Successfully cleaned up ${target || 'selected'} company images using batch processing`,
            details
        });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error deleting company images:', error);
        res.status(500).json({ success: false, message: 'Failed to delete company images', error: error.message });
    }
};

const getEscalationHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const where = {
            action: 'TASK_ESCALATED'
        };

        const [logs, total] = await Promise.all([
            getPrisma().devTaskActivity.findMany({
                where,
                include: {
                    dev_task: { select: { id: true, title: true } },
                    dev_team_member: { // The system user who performed the action
                        include: { user: { select: { firstName: true, lastName: true, avatar: true } } }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            getPrisma().devTaskActivity.count({ where })
        ]);

        // 🚀 Performance Fix: Collect all unique member IDs and fetch them in one query
        const memberIds = new Set();
        logs.forEach(log => {
            if (log.oldValue) memberIds.add(log.oldValue);
            if (log.newValue) memberIds.add(log.newValue);
        });

        // Fetch all members at once
        const members = await getPrisma().devTeamMember.findMany({
            where: { id: { in: Array.from(memberIds) } },
            include: { user: { select: { firstName: true, lastName: true } } }
        });

        // Create a lookup map for O(1) access
        const memberMap = new Map();
        members.forEach(m => {
            memberMap.set(m.id, `${m.user.firstName} ${m.user.lastName}`);
        });

        // Resolve logs with the cached member data
        const resolvedLogs = logs.map(log => ({
            ...log,
            fromUser: log.oldValue ? (memberMap.get(log.oldValue) || 'Unknown') : 'Unknown',
            toUser: log.newValue ? (memberMap.get(log.newValue) || 'Unknown') : 'Unknown'
        }));

        res.status(200).json({
            success: true,
            data: resolvedLogs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error('❌ Error fetching escalation history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
};

/**
 * Scan for orphaned files (disk files not in DB)
 */
const getOrphanedFilesStats = async (req, res) => {
    try {
        console.log('🔍 [SUPER-ADMIN] Scanning for orphaned files...');
        const stats = await fileCleanupService.scanOrphanedFiles();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error scanning orphaned files:', error);
        res.status(500).json({ success: false, message: 'Failed to scan orphaned files', error: error.message });
    }
};

/**
 * Physically delete orphaned files
 */
const performOrphanedCleanup = async (req, res) => {
    try {
        console.log('🧹 [SUPER-ADMIN] Starting orphaned files cleanup...');
        const result = await fileCleanupService.cleanupOrphanedFiles();

        // Clear cache
        statsCache.data = null;
        statsCache.lastFetch = 0;

        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error cleaning up orphaned files:', error);
        res.status(500).json({ success: false, message: 'Failed to clean up orphaned files', error: error.message });
    }
};

module.exports = {
    triggerImageCompression,
    getImageCompressionStatus,
    getAiLogs,
    getKeyUsageStats,
    getImageStatistics,
    deleteOldChatImages,
    deleteCompanyImages,
    getSuperAdminUsers,
    createSuperAdminUser,
    updateSuperAdminUser,
    deleteSuperAdminUser,
    getDevDashboard,
    getDevUnified,
    getCurrentUserPermissions,
    getDevSettings,
    updateDevSettings,
    getDevProjects,
    getDevProjectById,
    getDevTasks,
    getDevKanbanTasks,
    getDevReports,
    createDevTask,
    updateDevTask,
    deleteDevTask,
    duplicateDevTask,
    getDevTaskById,
    addDevTaskComment,
    getDevTeam,
    createDevTeamMember,
    updateDevTeamMember,
    deleteDevTeamMember,
    getDevReleases,
    getDevReleaseById,
    createDevTaskChecklist,
    addDevTaskChecklistItem,
    toggleDevTaskChecklistItem,
    deleteDevTaskChecklistItem,
    addDevTaskTimeLog,
    deleteDevTaskTimeLog,
    editDevTaskTimeLog,
    startDevTaskTimer,
    stopDevTaskTimer,
    pauseDevTaskTimer,
    resumeDevTaskTimer,
    getActiveTimer,
    getAllActiveTimers,
    createDevTaskSubtask,
    uploadDevTaskAttachments,
    uploadDevTaskAttachment,
    deleteDevTaskAttachment,
    updateDevTaskStatus,
    getServerDiskUsage,
    getLeaderboard,
    getEscalationHistory,
    getOrphanedFilesStats,
    performOrphanedCleanup
};
