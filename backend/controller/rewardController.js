/**
 * 🎮 Reward Controller
 * وحدة التحكم في المكافآت والحوافز
 */

const rewardTypeService = require('../services/hr/rewardTypeService');
const rewardApplicationService = require('../services/hr/rewardApplicationService');
const rewardReportingService = require('../services/hr/rewardReportingService');
const rewardManagementService = require('../services/hr/rewardManagementService');
const { handleHRError } = require('../utils/hrErrors');

class RewardController {
    // --- Reward Types ---

    async createRewardType(req, res) {
        try {
            const { companyId } = req.user;
            const data = { ...req.body, createdBy: req.user.id };
            const rewardType = await rewardTypeService.createRewardType(companyId, data);
            res.status(201).json({ success: true, data: rewardType });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async getRewardTypes(req, res) {
        try {
            const { companyId } = req.user;
            const result = await rewardTypeService.getRewardTypes(companyId, req.query);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async getRewardTypeById(req, res) {
        try {
            const { companyId } = req.user;
            const rewardType = await rewardTypeService.getRewardTypeById(companyId, req.params.id);
            res.status(200).json({ success: true, data: rewardType });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async updateRewardType(req, res) {
        try {
            const { companyId } = req.user;
            const rewardType = await rewardTypeService.updateRewardType(companyId, req.params.id, req.body);
            res.status(200).json({ success: true, data: rewardType });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async deleteRewardType(req, res) {
        try {
            const { companyId } = req.user;
            await rewardTypeService.deleteRewardType(companyId, req.params.id);
            res.status(200).json({ success: true, message: 'Deleted successfully' });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async toggleRewardTypeStatus(req, res) {
        try {
            const { companyId } = req.user;
            const { isActive } = req.body;
            const rewardType = await rewardTypeService.toggleRewardTypeStatus(companyId, req.params.id, isActive);
            res.status(200).json({ success: true, data: rewardType });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async seedRewardTypes(req, res) {
        try {
            const { companyId, id: userId } = req.user;
            const result = await rewardTypeService.seedDefaultRewardTypes(companyId, userId);
            res.status(200).json({ success: true, data: result, count: result.length });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    // --- Reward Application ---

    async applyReward(req, res) {
        try {
            const { companyId } = req.user;
            const { userId, rewardTypeId, periodStart, periodEnd, reason, skipEligibilityCheck } = req.body;

            const start = periodStart || new Date().toISOString().split('T')[0];
            const end = periodEnd || new Date().toISOString().split('T')[0];

            const record = await rewardApplicationService.applyReward(
                companyId,
                userId,
                rewardTypeId,
                new Date(start),
                new Date(end),
                req.user.id, // triggeredBy
                { reason, skipEligibilityCheck }
            );
            res.status(201).json({ success: true, data: record });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async applyBulkRewards(req, res) {
        try {
            const { companyId } = req.user;
            const { userIds, rewardTypeId, periodStart, periodEnd, reason } = req.body;

            const start = periodStart || new Date().toISOString().split('T')[0];
            const end = periodEnd || new Date().toISOString().split('T')[0];

            const results = await rewardApplicationService.applyBulkRewards(
                companyId,
                userIds,
                rewardTypeId,
                new Date(start),
                new Date(end),
                req.user.id,
                { reason }
            );
            res.status(200).json({ success: true, data: results });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async approveReward(req, res) {
        try {
            const { companyId } = req.user;
            const record = await rewardApplicationService.approveReward(companyId, req.params.id, req.user.id);
            res.status(200).json({ success: true, data: record });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async rejectReward(req, res) {
        try {
            const { companyId } = req.user;
            const { reason } = req.body;
            const record = await rewardApplicationService.rejectReward(companyId, req.params.id, req.user.id, reason);
            res.status(200).json({ success: true, data: record });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async voidReward(req, res) {
        try {
            const { companyId } = req.user;
            const { reason } = req.body;
            const record = await rewardApplicationService.voidReward(companyId, req.params.id, req.user.id, reason);
            res.status(200).json({ success: true, data: record });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    // --- Reporting ---

    async getMyRewards(req, res) {
        try {
            const { companyId } = req.user;
            const userId = req.user.id;
            const rewards = await rewardReportingService.getRewardsByEmployee(companyId, userId, req.query);
            res.status(200).json({ success: true, data: rewards });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async getEmployeeRewards(req, res) {
        try {
            const { companyId } = req.user;
            const { userId } = req.params;
            const rewards = await rewardReportingService.getRewardsByEmployee(companyId, userId, req.query);
            res.status(200).json({ success: true, data: rewards });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async getMonthlyReport(req, res) {
        try {
            const { companyId } = req.user;
            const { month, year } = req.query;
            const report = await rewardReportingService.getMonthlyRewardReport(companyId, month, year);
            res.status(200).json({ success: true, data: report });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async getCostAnalysis(req, res) {
        try {
            const { companyId } = req.user;
            const { startDate, endDate } = req.query;
            const analysis = await rewardReportingService.getRewardCostAnalysis(companyId, startDate, endDate);
            res.status(200).json({ success: true, data: analysis });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    // --- Reward Management (CRUD) ---

    async getAllRewards(req, res) {
        try {
            console.log('📋 [RewardRecords] Getting records for company:', req.user?.companyId);
            console.log('📋 [RewardRecords] Query params:', req.query);

            const { companyId } = req.user;

            if (!companyId) {
                console.error('❌ [RewardRecords] No companyId found in user');
                return res.status(400).json({ success: false, message: 'Company ID is required' });
            }

            const result = await rewardManagementService.getRewardRecords(
                companyId,
                req.query,
                {
                    page: req.query.page,
                    limit: req.query.limit,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder
                }
            );

            console.log('✅ [RewardRecords] Records retrieved successfully, count:', result.records?.length || 0);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error('❌ FATAL [RewardRecords] Error getting records:', error.message);
            console.error('❌ FATAL [RewardRecords] Error stack:', error.stack);

            res.status(500).json({
                success: false,
                message: 'فشل في جلب المكافآت',
                error: error.message,
                code: error.code || 'UNKNOWN'
            });
        }
    }

    async getRewardById(req, res) {
        try {
            const { companyId } = req.user;

            const reward = await rewardManagementService.getRewardRecordById(companyId, req.params.id);
            res.status(200).json({ success: true, data: reward });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async createManualReward(req, res) {
        try {
            const { companyId, id: userId } = req.user;

            const reward = await rewardManagementService.createManualReward(companyId, req.body, userId);
            res.status(201).json({ success: true, data: reward });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async updateReward(req, res) {
        try {
            const { companyId, id: userId } = req.user;

            const reward = await rewardManagementService.updateRewardRecord(companyId, req.params.id, req.body, userId);
            res.status(200).json({ success: true, data: reward });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async deleteReward(req, res) {
        try {
            const { companyId, id: userId } = req.user;

            const result = await rewardManagementService.deleteRewardRecord(companyId, req.params.id, userId);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }

    async getRewardStatistics(req, res) {
        try {
            console.log('📊 [RewardStats] Getting statistics for company:', req.user?.companyId);
            console.log('📊 [RewardStats] Query params:', req.query);

            const { companyId } = req.user;

            if (!companyId) {
                console.error('❌ [RewardStats] No companyId found in user');
                return res.status(400).json({ success: false, message: 'Company ID is required' });
            }

            const stats = await rewardManagementService.getRewardStatistics(companyId, req.query);
            console.log('✅ [RewardStats] Statistics retrieved successfully');
            res.status(200).json({ success: true, data: stats });
        } catch (error) {
            console.error('❌ FATAL [RewardStats] Error getting reward statistics:', error.message);
            console.error('❌ FATAL [RewardStats] Error stack:', error.stack);

            // Return a more descriptive error
            res.status(500).json({
                success: false,
                message: 'فشل في جلب الإحصائيات',
                error: error.message,
                code: error.code || 'UNKNOWN'
            });
        }
    }

    async getEmployeeRewardHistory(req, res) {
        try {
            const { companyId } = req.user;

            const history = await rewardManagementService.getEmployeeRewardHistory(
                companyId,
                req.params.userId,
                req.query
            );
            res.status(200).json({ success: true, ...history });
        } catch (error) {
            handleHRError(error, req, res);
        }
    }
}

module.exports = new RewardController();
