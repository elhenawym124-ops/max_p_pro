/**
 * 📝 Audit Service
 * خدمة سجل التدقيق
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class AuditService {
    constructor() {
        // Don't initialize prisma here - get it dynamically
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * تسجيل عملية في سجل التدقيق
     * @param {string} companyId - معرف الشركة
     * @param {string} actorId - معرف المستخدم الذي قام بالعملية
     * @param {string} action - نوع العملية (APPROVE, REJECT, UPDATE, etc)
     * @param {string} entityType - نوع الكيان (LEAVE, ADVANCE, etc)
     * @param {string} entityId - معرف الكيان
     * @param {object} details - تفاصيل إضافية
     * @param {string} actorName - اسم المستخدم (اختياري، سيتم جلبه إذا لم يتوفر)
     */
    async logAction(companyId, actorId, action, entityType, entityId, details = {}, actorName = null) {
        try {
            // إذا لم يتم توفير الاسم، نجلبه
            if (!actorName) {
                const user = await this.prisma.user.findUnique({
                    where: { id: actorId },
                    select: { firstName: true, lastName: true }
                });
                if (user) {
                    actorName = `${user.firstName} ${user.lastName}`;
                } else {
                    actorName = 'Unknown User';
                }
            }

            await this.prisma.hRAuditLog.create({
                data: {
                    companyId,
                    actorId,
                    action,
                    entityType,
                    entityId,
                    actorName,
                    details: JSON.stringify(details)
                }
            });

            console.log(`📝 [Audit] Logged: ${action} on ${entityType} by ${actorName}`);
        } catch (error) {
            console.error('❌ Error creating audit log:', error);
            // لا نوقف العملية الأساسية إذا فشل التسجيل، ولكن نسجل الخطأ
        }
    }

    /**
     * جلب سجلات التدقيق
     */
    async getLogs(companyId, options = {}) {
        try {
            const { entityType, action, startDate, endDate, limit = 50, page = 1 } = options;
            const skip = (page - 1) * limit;

            const where = { companyId };
            if (entityType) where.entityType = entityType;
            if (action) where.action = action;
            if (startDate && endDate) {
                where.createdAt = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            const [logs, total] = await Promise.all([
                this.prisma.hRAuditLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: parseInt(limit),
                    skip: parseInt(skip),
                    include: {
                        actor: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                avatar: true
                            }
                        }
                    }
                }),
                this.prisma.hRAuditLog.count({ where })
            ]);

            return {
                logs,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('❌ Error fetching audit logs:', error);
            throw error;
        }
    }
}

module.exports = new AuditService();
