/**
 * 🎁 Reward Application Service
 * خدمة تطبيق واعتماد المكافآت
 * 
 * Handles the lifecycle of applying rewards to employees:
 * Application -> Eligibility Check -> Calculation -> Recording -> Approval
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { BusinessLogicError, NotFoundError, ConflictError } = require('../../utils/hrErrors');
const rewardEligibilityService = require('./rewardEligibilityService');
const rewardCalculationService = require('./rewardCalculationService');

class RewardApplicationService {
    constructor() {
        // Don't initialize prisma here
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * تطبيق مكافأة لموظف
     * Apply a reward to an employee
     */
    async applyReward(companyId, userId, rewardTypeId, periodStart, periodEnd, triggeredBy, options = {}) {
        // 1. Get Reward Type
        const rewardType = await this.prisma.rewardType.findFirst({
            where: { id: rewardTypeId, companyId }
        });

        if (!rewardType) throw new NotFoundError('Reward Type', rewardTypeId);
        if (!rewardType.isActive) throw new BusinessLogicError('Reward type is inactive');

        // 2. Check Eligibility (unless skipped via options for MANUAL override)
        let eligibilityDetails = { checked: false };
        if (!options.skipEligibilityCheck) {
            const eligibility = await rewardEligibilityService.evaluateEligibility(companyId, userId, rewardTypeId, periodStart, periodEnd);
            eligibilityDetails = eligibility;
            if (!eligibility.isEligible) {
                throw new BusinessLogicError(`Employee is not eligible: ${eligibility.reason}`, eligibility.details);
            }
        } else {
            eligibilityDetails = { skipped: true, reason: 'Manual override' };
        }

        // 3. Calculate Value
        // Pass calculate options?
        const calculation = await rewardCalculationService.calculateRewardValue(companyId, userId, rewardType);

        // 4. Determine Status
        // If TRIGGER is AUTOMATIC (triggered by system job) -> Approve
        // If settings allow auto-approve for manual application -> Approve
        // Otherwise -> Pending
        const settings = await this.prisma.rewardSettings.findUnique({ where: { companyId } });

        let status = 'PENDING';
        if (rewardType.triggerType === 'AUTOMATIC') {
            status = 'APPROVED';
        } else if (settings && !settings.requireManagerApproval) {
            status = 'APPROVED';
        }

        const now = new Date();
        const appliedMonth = new Date(periodStart).getMonth() + 1;
        const appliedYear = new Date(periodStart).getFullYear();

        // 5. Create Record
        const record = await this.prisma.rewardRecord.create({
            data: {
                companyId,
                userId,
                rewardTypeId,
                rewardName: rewardType.name,
                rewardCategory: rewardType.category,
                calculatedValue: calculation.value,
                calculationDetails: JSON.stringify(calculation.details),
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                appliedMonth,
                appliedYear,
                reason: options.reason || 'Applied via system',
                eligibilityMet: JSON.stringify(eligibilityDetails),
                status: status,
                appliedAt: now,
                approvedAt: status === 'APPROVED' ? now : null,
                approvedBy: status === 'APPROVED' ? (triggeredBy || 'SYSTEM') : null,
                isLocked: status === 'APPROVED' // Lock if approved immediately
            }
        });

        return record;
    }

    /**
     * تطبيق مكافآت جماعية
     * Bulk apply rewards
     */
    async applyBulkRewards(companyId, userIds, rewardTypeId, periodStart, periodEnd, triggeredBy, options = {}) {
        const results = {
            applied: [],
            failed: []
        };

        for (const userId of userIds) {
            try {
                const record = await this.applyReward(companyId, userId, rewardTypeId, periodStart, periodEnd, triggeredBy, options);
                results.applied.push({ userId, recordId: record.id, status: record.status });
            } catch (error) {
                results.failed.push({ userId, reason: error.message });
            }
        }

        return results;
    }

    /**
     * اعتماد مكافأة
     * Approve a pending reward
     */
    async approveReward(companyId, recordId, approvedBy) {
        const record = await this.prisma.rewardRecord.findFirst({
            where: { id: recordId, companyId }
        });

        if (!record) throw new NotFoundError('Reward Record', recordId);
        if (record.status !== 'PENDING') throw new BusinessLogicError(`Cannot approve reward with status ${record.status}`);

        const updated = await this.prisma.rewardRecord.update({
            where: { id: recordId },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvedAt: new Date(),
                isLocked: true // Lock immutably
            }
        });

        return updated;
    }

    /**
     * رفض مكافأة
     * Reject a reward
     */
    async rejectReward(companyId, recordId, rejectedBy, reason) {
        const record = await this.prisma.rewardRecord.findFirst({
            where: { id: recordId, companyId }
        });

        if (!record) throw new NotFoundError('Reward Record', recordId);
        if (record.status !== 'PENDING') throw new BusinessLogicError(`Cannot reject reward with status ${record.status}`);

        return await this.prisma.rewardRecord.update({
            where: { id: recordId },
            data: {
                status: 'REJECTED',
                voidReason: reason
            }
        });
    }

    /**
     * إلغاء مكافأة (Admin Only)
     * Void an applied/approved reward
     */
    async voidReward(companyId, recordId, voidedBy, reason) {
        const record = await this.prisma.rewardRecord.findFirst({
            where: { id: recordId, companyId }
        });

        if (!record) throw new NotFoundError('Reward Record', recordId);

        // Check if payroll processed
        if (record.isIncludedInPayroll) {
            throw new ConflictError('Cannot void reward that has already been processed in payroll');
        }

        return await this.prisma.rewardRecord.update({
            where: { id: recordId },
            data: {
                status: 'VOIDED',
                voidedBy,
                voidedAt: new Date(),
                voidReason: reason,
                isLocked: true // Locked as voided
            }
        });
    }
}

module.exports = new RewardApplicationService();
