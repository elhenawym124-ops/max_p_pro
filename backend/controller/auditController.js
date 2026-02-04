/**
 * 📝 Audit Controller
 * التحكم في سجلات التدقيق
 */

const auditService = require('../services/hr/auditService');

class AuditController {
    /**
     * جلب سجلات التدقيق
     * GET /api/v1/hr/audit-logs
     */
    async getAuditLogs(req, res) {
        try {
            const { companyId } = req.user;
            const { entityType, action, startDate, endDate, limit, page } = req.query;

            const result = await auditService.getLogs(companyId, {
                entityType,
                action,
                startDate,
                endDate,
                limit,
                page
            });

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('❌ Error getting audit logs:', error);
            res.status(500).json({
                success: false,
                message: 'فشل في جلب سجلات التدقيق',
                error: error.message
            });
        }
    }
}

module.exports = new AuditController();
