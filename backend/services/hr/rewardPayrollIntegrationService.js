/**
 * 💰 Reward Payroll Integration Service
 * خدمة تكامل المكافآت مع الرواتب
 * 
 * Handles fetching rewards for payroll, calculating totals, and managing offsets.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { BusinessLogicError } = require('../../utils/hrErrors');

class RewardPayrollIntegrationService {
    constructor() {
        // Don't initialize prisma here
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * جلب المكافآت المعتمدة لاستحقاق الرواتب
     * Get approved rewards for payroll period
     */
    async getApprovedRewardsForPayroll(companyId, userId, month, year) {
        // Find rewards applied in this month/year that are APPROVED and NOT yet included in payroll
        const rewards = await this.prisma.rewardRecord.findMany({
            where: {
                companyId,
                userId,
                status: 'APPROVED',
                isIncludedInPayroll: false,
                appliedMonth: parseInt(month),
                appliedYear: parseInt(year)
            },
            include: {
                rewardType: {
                    select: { name: true, calculationMethod: true }
                }
            }
        });

        return rewards;
    }

    /**
     * حساب إجمالي المكافآت
     * Calculate total reward value that affects salary
     */
    calculateTotalRewards(rewards) {
        if (!rewards || rewards.length === 0) return 0;

        return rewards.reduce((sum, record) => {
            // Only include monetary rewards in total
            // POINTS and NON_MONETARY should not add to salary
            // Check calculationMethod from included relation or record if available
            const method = record.rewardType?.calculationMethod;

            if (record.rewardCategory === 'NON_MONETARY' ||
                method === 'POINTS' ||
                method === 'NON_MONETARY') {
                return sum;
            }
            return sum + Number(record.calculatedValue);
        }, 0);
    }

    /**
     * ربط المكافآت بكشف الراتب
     * Link rewards to payroll record
     */
    async applyRewardsToPayroll(payrollId, rewards) {
        if (!rewards || rewards.length === 0) return;

        const ids = rewards.map(r => r.id);

        await this.prisma.rewardRecord.updateMany({
            where: { id: { in: ids } },
            data: {
                payrollId,
                isIncludedInPayroll: true,
                status: 'APPLIED' // Change status to APPLIED
            }
        });
    }

    /**
     * معالجة خصم المكافآت من الجزاءات
     * Handle Offset Logic
     */
    async calculateNetWithRewards(companyId, grossSalary, totalDeductions, totalRewards) {
        const settings = await this.prisma.rewardSettings.findUnique({ where: { companyId } });

        let netSalary = 0;
        let netDeductions = Number(totalDeductions);
        let effectiveRewards = Number(totalRewards);
        const gross = Number(grossSalary);

        if (settings && settings.allowRewardDeductionOffset) {
            // Rewards reduce deductions first

            if (effectiveRewards >= netDeductions) {
                effectiveRewards = effectiveRewards - netDeductions;
                netDeductions = 0;
            } else {
                netDeductions = netDeductions - effectiveRewards;
                effectiveRewards = 0;
            }
        }

        netSalary = gross - netDeductions + effectiveRewards;

        return {
            netSalary,
            netDeductions,
            effectiveRewards,
            isOffsetApplied: settings ? settings.allowRewardDeductionOffset : false
        };
    }
}

module.exports = new RewardPayrollIntegrationService();
