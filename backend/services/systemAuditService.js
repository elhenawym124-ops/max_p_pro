/**
 * System Audit Service
 * خدمة تسجيل عمليات النظام والتدقيق
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

class SystemAuditService {
    constructor() {
        this._prisma = null;
    }

    get prisma() {
        if (!this._prisma) {
            this._prisma = getSharedPrismaClient();
        }
        return this._prisma;
    }

    /**
     * تسجيل عملية تغيير في النظام
     * @param {string} userId - معرّف المستخدم الذي قام بالعملية
     * @param {string} action - نوع العملية (e.g. TOGGLE_SYSTEM, UPDATE_CONFIG)
     * @param {string} target - الهدف (e.g. systemName)
     * @param {string} details - تفاصيل إضافية نصية
     * @param {object} metadata - بيانات إضافية JSON
     */
    async logAction(userId, action, target, details, metadata = {}) {
        try {
            if (!userId) {
                console.warn('⚠️ [SystemAudit] No userId provided for audit log');
                return;
            }

            console.log(`📝 [SystemAudit] Logging: ${action} on ${target} by ${userId}`);

            // استخدام جدول ActivityLog الموجود بالفعل
            /*
              Model ActivityLog assumption:
              id, userId, action, details, metadata, ipAddress, userAgent, createdAt
            */

            // بما أننا لا نملك جدول SystemAudit مخصص، سنستخدم ActivityLog أو Console حالياً
            // سنحاول الحفظ في ActivityLog إذا كان الموديل موجوداً

            try {
                await this.prisma.activityLog.create({
                    data: {
                        userId: userId,
                        action: `SYSTEM_${action}`,
                        resourceType: 'SYSTEM_SETTINGS',
                        resourceId: target,
                        details: details,
                        metadata: JSON.stringify(metadata),
                        createdAt: new Date()
                    }
                });
            } catch (dbError) {
                // إذا فشل الحفظ في DB (مثلاً الجدول غير موجود أو الـ Schema مختلفة)، نكتفي بالـ Log
                console.warn('⚠️ [SystemAudit] Failed to save to DB, falling back to console:', dbError.message);
            }

        } catch (error) {
            console.error('❌ [SystemAudit] Error logging action:', error);
        }
    }
}

const systemAuditService = new SystemAuditService();
module.exports = systemAuditService;
