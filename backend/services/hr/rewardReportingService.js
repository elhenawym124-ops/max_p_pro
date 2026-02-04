/**
 * 📊 Reward Reporting Service
 * خدمة تقارير المكافآت
 * 
 * Generates reports and analytics for rewards.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { BusinessLogicError } = require('../../utils/hrErrors');

class RewardReportingService {
    constructor() {
        // Don't initialize prisma here
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * تقرير المكافآت الشهري
     * Monthly Reward Report
     */
    async getMonthlyRewardReport(companyId, month, year) {
        const m = parseInt(month);
        const y = parseInt(year);

        const rewards = await this.prisma.rewardRecord.findMany({
            where: {
                companyId,
                appliedMonth: m,
                appliedYear: y
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeNumber: true,
                        departmentRelation: { select: { name: true } }
                    }
                },
                rewardType: {
                    select: { name: true, category: true }
                }
            },
            orderBy: { appliedAt: 'desc' }
        });

        // Aggregate stats
        const stats = {
            totalAmount: 0,
            totalCount: rewards.length,
            byCategory: {},
            byDepartment: {},
            pendingCount: 0,
            approvedCount: 0
        };

        rewards.forEach(r => {
            if (r.status === 'APPROVED' || r.status === 'APPLIED') {
                stats.totalAmount += Number(r.calculatedValue || 0);
            }

            if (r.status === 'PENDING') stats.pendingCount++;
            if (r.status === 'APPROVED' || r.status === 'APPLIED') stats.approvedCount++;

            const cat = r.rewardCategory;
            stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;

            const dept = r.user?.departmentRelation?.name || 'Unassigned';
            stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + Number(r.calculatedValue || 0);
        });

        return {
            month: m,
            year: y,
            stats,
            details: rewards.map(r => ({
                ...r,
                calculatedValue: Number(r.calculatedValue),
                calculationDetails: r.calculationDetails ? JSON.parse(r.calculationDetails) : null
            }))
        };
    }

    /**
     * تحليل تكلفة المكافآت
     * Reward Cost Analysis
     */
    async getRewardCostAnalysis(companyId, startDate, endDate) {
        const records = await this.prisma.rewardRecord.findMany({
            where: {
                companyId,
                appliedAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                },
                status: { in: ['APPROVED', 'APPLIED'] }
            },
            include: {
                rewardType: { select: { name: true } }
            }
        });

        const totalCost = records.reduce((sum, r) => sum + Number(r.calculatedValue || 0), 0);
        const byType = {};
        const monthlyTrend = {};

        for (const r of records) {
            const typeName = r.rewardName || 'Unknown'; // Snapshot name
            if (!byType[typeName]) byType[typeName] = 0;
            byType[typeName] += Number(r.calculatedValue || 0);

            const monthKey = `${r.appliedYear}-${String(r.appliedMonth).padStart(2, '0')}`;
            if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = 0;
            monthlyTrend[monthKey] += Number(r.calculatedValue || 0);
        }

        return {
            totalCost,
            byType,
            monthlyTrend,
            count: records.length,
            period: { startDate, endDate }
        };
    }

    /**
     * سجل مكافآت الموظف
     * Employee Reward History
     */
    async getRewardsByEmployee(companyId, userId, options = {}) {
        const { startDate, endDate, status } = options;

        const where = {
            companyId,
            userId
        };

        if (startDate) where.periodStart = { gte: new Date(startDate) };
        if (endDate) where.periodEnd = { lte: new Date(endDate) };
        if (status) where.status = status;

        const rewards = await this.prisma.rewardRecord.findMany({
            where,
            orderBy: { appliedAt: 'desc' },
            include: {
                rewardType: { select: { name: true, category: true } }
            }
        });

        return rewards.map(r => ({
            ...r,
            calculatedValue: Number(r.calculatedValue),
            calculationDetails: r.calculationDetails ? JSON.parse(r.calculationDetails) : null
        }));
    }
}

module.exports = new RewardReportingService();
