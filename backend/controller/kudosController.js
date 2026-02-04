/**
 * 🎮 Kudos Controller
 * وحدة التحكم في التقدير المتبادل (Kudos) والمكافآت التلقائية
 */

const kudosService = require('../services/hr/kudosService');
const streakRewardService = require('../services/hr/streakRewardService');
const { handleHRError } = require('../utils/hrErrors');

class KudosController {
    /**
     * إرسال تقدير لزميل
     */
    async sendKudos(req, res) {
        try {
            const { companyId, id: fromUserId } = req.user;
            const { toUserId, reason, points } = req.body;

            const kudos = await kudosService.sendKudos(companyId, fromUserId, toUserId, reason, points);
            res.status(201).json({ success: true, data: kudos });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    /**
     * جلب سجلات التقدير
     */
    async getKudos(req, res) {
        try {
            const { companyId } = req.user;
            const result = await kudosService.getKudos(companyId, req.query);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    /**
     * جلب إحصائيات التقدير
     */
    async getKudosStats(req, res) {
        try {
            const { companyId } = req.user;
            const userId = req.query.userId || null;
            const stats = await kudosService.getKudosStats(companyId, userId);
            res.status(200).json({ success: true, data: stats });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    /**
     * تشغيل فحص المكافآت التلقائية (نقطة نهاية إدارية)
     */
    async triggerStreakCheck(req, res) {
        try {
            const { companyId } = req.user;
            const results = await streakRewardService.processAllEmployees(companyId);
            res.status(200).json({ success: true, data: results });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }
}

module.exports = new KudosController();
