/**
 * 💰 Advance Request Service
 * خدمة إدارة السلف
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const auditService = require('./auditService');

class AdvanceService {
    constructor() {
        // Don't initialize prisma here - get it dynamically
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * Helper function to map user object to employee format for frontend compatibility
     */
    mapUserToEmployee(user) {
        if (!user) return null;
        const employee = { ...user };
        // Map positionRelation to position
        if (user.positionRelation) {
            employee.position = user.positionRelation;
            delete employee.positionRelation;
        }
        // Map departmentRelation to department
        if (user.departmentRelation) {
            employee.department = user.departmentRelation;
            delete employee.departmentRelation;
        }
        return employee;
    }

    /**
     * حساب مدة العمل بالأشهر
     */
    calculateEmploymentMonths(hireDate) {
        const joinDate = new Date(hireDate);
        const currentDate = new Date();
        return (currentDate.getFullYear() - joinDate.getFullYear()) * 12 + (currentDate.getMonth() - joinDate.getMonth());
    }

    /**
     * إنشاء طلب سلفة جديد مع التحقق من الشروط
     */
    async createRequest(companyId, data) {
        try {
            const { employeeId, amount, reason, repaymentType, installmentsCount } = data;

            // 1. جلب إعدادات السلف
            const settings = await this.prisma.hRSettings.findUnique({
                where: { companyId }
            });

            if (!settings) throw new Error('يرجى ضبط إعدادات الموارد البشرية أولاً');

            // 2. جلب بيانات الموظف
            const user = await this.prisma.user.findFirst({
                where: { id: employeeId, companyId },
                include: { positionRelation: true }
            });

            if (!user) throw new Error('الموظف غير موجود');

            // 3. التحقق من السلف النشطة
            const activeAdvances = await this.prisma.advanceRequest.count({
                where: {
                    userId: employeeId, // Use userId instead of employeeId
                    status: 'APPROVED',
                    isPaidOff: false
                }
            });

            if (activeAdvances >= settings.maxActiveAdvances) {
                throw new Error('لديك سلفة نشطة بالفعل. يجب سدادها أولاً');
            }

            // 5. التحقق من الحد الأقصى للمبلغ
            const maxAllowed = (parseFloat(user.baseSalary) * settings.maxAdvancePercentage) / 100;
            const requestedAmount = parseFloat(amount);

            if (requestedAmount > maxAllowed) {
                throw new Error(`الحد الأقصى للسلفة هو ${maxAllowed} (${settings.maxAdvancePercentage}% من الراتب الأساسي)`);
            }

            // 6. التحقق من فترة السداد
            if (repaymentType === 'INSTALLMENTS' && parseInt(installmentsCount) > settings.advanceRepaymentMonths) {
                throw new Error(`الحد الأقصى لفترة السداد هو ${settings.advanceRepaymentMonths} أشهر`);
            }

            // 7. حساب القسط الشهري
            const monthlyAmount = repaymentType === 'INSTALLMENTS'
                ? requestedAmount / parseInt(installmentsCount)
                : requestedAmount;

            // 8. إنشاء الطلب
            const request = await this.prisma.advanceRequest.create({
                data: {
                    companyId,
                    userId: employeeId, // Use userId instead of employeeId
                    amount: requestedAmount,
                    reason,
                    repaymentType,
                    installmentsCount: repaymentType === 'INSTALLMENTS' ? parseInt(installmentsCount) : 1,
                    monthlyAmount,
                    employeeSalary: user.baseSalary,
                    maxAllowedAmount: maxAllowed,
                    installmentAmount: monthlyAmount,
                    remainingBalance: requestedAmount,
                    status: 'PENDING'
                }
            });

            // Fetch user data separately
            const requestUser = await this.prisma.user.findUnique({
                where: { id: employeeId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true,
                    avatar: true,
                    departmentRelation: { select: { name: true } },
                    positionRelation: { select: { title: true } }
                }
            });

            // Log Audit
            await auditService.logAction(
                companyId,
                user.id || 'SYSTEM',
                'CREATE',
                'ADVANCE_REQUEST',
                request.id,
                { amount: requestedAmount, installments: installmentsCount }
            );

            console.log('✅ [HR] Advance request created:', request.id);
            
            // Map user to employee for frontend compatibility
            return {
                ...request,
                user: requestUser,
                employee: this.mapUserToEmployee(requestUser)
            };
        } catch (error) {
            console.error('❌ Error creating advance request:', error);
            throw error;
        }
    }

    /**
     * الموافقة على طلب سلفة
     */
    async approveRequest(companyId, requestId, approvedBy) {
        try {
            const request = await this.prisma.advanceRequest.findFirst({
                where: { id: requestId, companyId },
                select: { id: true, userId: true, status: true, amount: true, monthlyAmount: true, employeeSalary: true }
            });

            if (!request) throw new Error('الطلب غير موجود');
            if (request.status !== 'PENDING') throw new Error('الطلب تم معالجته مسبقاً');

            // 🛡️ Security Check: Prevent Self-Approval
            if (request.userId === approvedBy) {
                throw new Error('لا يمكنك الموافقة على طلب السلفة الخاص بك (مطلوب مدير آخر)');
            }

            // تحديث حالة الطلب
            const updatedRequest = await this.prisma.advanceRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    approvedBy,
                    approvedAt: new Date(),
                    // remainingBalance is already set during creation
                }
            });

            // 📝 Audit Log
            await auditService.logAction(
                companyId,
                approvedBy,
                'APPROVE',
                'ADVANCE_REQUEST',
                requestId,
                {
                    amount: request.amount,
                    monthlyAmount: request.monthlyAmount,
                    totalSalary: request.employeeSalary
                }
            );

            console.log('✅ [HR] Advance request approved:', requestId);
            return updatedRequest;
        } catch (error) {
            console.error('❌ Error approving advance request:', error);
            throw error;
        }
    }

    /**
     * رفض طلب سلفة
     */
    async rejectRequest(companyId, requestId, rejectionReason) {
        try {
            const request = await this.prisma.advanceRequest.findFirst({
                where: { id: requestId, companyId }
            });

            if (!request) throw new Error('الطلب غير موجود');
            if (request.status !== 'PENDING') throw new Error('الطلب تم معالجته مسبقاً');

            const updatedRequest = await this.prisma.advanceRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    rejectionReason
                }
            });

            // 📝 Audit Log
            await auditService.logAction(
                companyId,
                'SYSTEM',
                'REJECT',
                'ADVANCE_REQUEST',
                requestId,
                { reason: rejectionReason }
            );

            console.log('✅ [HR] Advance request rejected:', requestId);
            return updatedRequest;
        } catch (error) {
            console.error('❌ Error rejecting advance request:', error);
            throw error;
        }
    }

    /**
     * جلب طلبات السلف للموظف
     */
    async getMyAdvances(companyId, employeeId) {
        try {
            const requests = await this.prisma.advanceRequest.findMany({
                where: { companyId, userId: employeeId }, // Use userId instead of employeeId
                orderBy: { createdAt: 'desc' }
            });

            // Fetch user data separately
            const user = await this.prisma.user.findUnique({
                where: { id: employeeId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true,
                    departmentRelation: { select: { name: true } },
                    positionRelation: { select: { title: true } }
                }
            });

            // Fetch approvers if needed
            const approverIds = [...new Set(requests.map(r => r.approvedBy).filter(Boolean))];
            const approvers = approverIds.length > 0 ? await this.prisma.user.findMany({
                where: { id: { in: approverIds } },
                select: { id: true, firstName: true, lastName: true }
            }) : [];
            const approverMap = Object.fromEntries(approvers.map(a => [a.id, a]));

            return requests.map(req => ({
                ...req,
                user,
                employee: this.mapUserToEmployee(user),
                approver: req.approvedBy ? approverMap[req.approvedBy] : null
            }));
        } catch (error) {
            console.error('❌ Error fetching employee advances:', error);
            throw error;
        }
    }

    /**
     * جلب جميع طلبات السلف
     */
    async getAllAdvances(companyId, options = {}) {
        try {
            const { status, page = 1, limit = 20 } = options;

            const where = { companyId };
            if (status && status !== 'all') where.status = status;

            // Filter out orphaned records by ensuring userId exists in User table
            const userWhere = { companyId };
            const validUserIds = await this.prisma.user.findMany({
                where: userWhere,
                select: { id: true }
            });
            const validUserIdList = validUserIds.map(u => u.id);

            // Only include advances with valid user IDs
            if (validUserIdList.length > 0) {
                where.userId = { in: validUserIdList };
            } else {
                // No valid users found, return empty result
                return {
                    requests: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0
                    }
                };
            }

            const [requests, total] = await Promise.all([
                this.prisma.advanceRequest.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit
                }),
                this.prisma.advanceRequest.count({ where })
            ]);

            // Fetch all users for these requests
            const userIds = [...new Set(requests.map(r => r.userId).filter(Boolean))];
            const users = userIds.length > 0 ? await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true,
                    avatar: true,
                    departmentRelation: { select: { name: true } },
                    positionRelation: { select: { title: true } }
                }
            }) : [];
            const userMap = Object.fromEntries(users.map(u => [u.id, u]));

            // Fetch approvers
            const approverIds = [...new Set(requests.map(r => r.approvedBy).filter(Boolean))];
            const approvers = approverIds.length > 0 ? await this.prisma.user.findMany({
                where: { id: { in: approverIds } },
                select: { id: true, firstName: true, lastName: true }
            }) : [];
            const approverMap = Object.fromEntries(approvers.map(a => [a.id, a]));

            // Map user to employee for frontend compatibility
            const mappedRequests = requests.map(req => ({
                ...req,
                user: userMap[req.userId],
                employee: this.mapUserToEmployee(userMap[req.userId]),
                approver: req.approvedBy ? approverMap[req.approvedBy] : null
            }));

            return {
                requests: mappedRequests,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching all advances:', error);
            throw error;
        }
    }
}

module.exports = new AdvanceService();
