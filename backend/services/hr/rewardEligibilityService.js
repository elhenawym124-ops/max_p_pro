/**
 * 🎯 Reward Eligibility Service
 * خدمة التحقق من استحقاق المكافآت
 * 
 * Evaluates whether employees meet the conditions defined in RewardType.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { BusinessLogicError } = require('../../utils/hrErrors');

class RewardEligibilityService {
    constructor() {
        // Don't initialize prisma here
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * تقييم استحقاق موظف لمكافأة معينة
     * Evaluate eligibility for a single employee and reward type
     */
    async evaluateEligibility(companyId, userId, rewardTypeId, periodStart, periodEnd) {
        const rewardType = await this.prisma.rewardType.findFirst({
            where: { id: rewardTypeId, companyId }
        });

        if (!rewardType) {
            throw new Error('Reward Type not found');
        }

        if (!rewardType.isActive) {
            return { isEligible: false, reason: 'Reward type is inactive' };
        }

        // Parse conditions
        let conditions = {};
        try {
            conditions = rewardType.eligibilityConditions ? JSON.parse(rewardType.eligibilityConditions) : {};
        } catch (e) {
            console.error('Error parsing eligibility conditions:', e);
            return { isEligible: false, reason: 'Invalid eligibility conditions' };
        }

        // Evaluate based on category
        let result = { isEligible: true, details: {}, reason: '' };

        // Common Checks
        if (conditions.minServiceDays) {
            // Check hire date
            const employee = await this.prisma.user.findUnique({ where: { id: userId } });
            if (employee && employee.hireDate) {
                const serviceDays = Math.floor((new Date() - new Date(employee.hireDate)) / (1000 * 60 * 60 * 24));
                if (serviceDays < conditions.minServiceDays) {
                    result.isEligible = false;
                    result.details.serviceDays = serviceDays;
                    result.details.required = conditions.minServiceDays;
                    result.reason = `Service period ${serviceDays} days is less than required ${conditions.minServiceDays}`;
                }
            }
        }

        // Attendance Checks
        if (result.isEligible && this._hasAttendanceConditions(conditions)) {
            const attendanceResult = await this._checkAttendanceEligibility(companyId, userId, periodStart, periodEnd, conditions);
            if (!attendanceResult.isEligible) {
                result.isEligible = false;
                result.reason = result.reason ? result.reason + '; ' + attendanceResult.reason : attendanceResult.reason;
            }
            result.details.attendance = attendanceResult.details;
        }

        // Performance Checks
        if (result.isEligible && this._hasPerformanceConditions(conditions)) {
            const performanceResult = await this._checkPerformanceEligibility(companyId, userId, periodStart, periodEnd, conditions);
            if (!performanceResult.isEligible) {
                result.isEligible = false;
                result.reason = result.reason ? result.reason + '; ' + performanceResult.reason : performanceResult.reason;
            }
            result.details.performance = performanceResult.details;
        }

        // Log the evaluation
        await this._logEvaluation(companyId, userId, rewardTypeId, periodStart, periodEnd, result, conditions);

        return result;
    }

    _hasAttendanceConditions(conditions) {
        return conditions.noLateness || conditions.noAbsences || conditions.maxLateMinutes !== undefined || conditions.minAttendanceRate !== undefined;
    }

    _hasPerformanceConditions(conditions) {
        return conditions.minPerformanceScore !== undefined || conditions.minGoalsAchievement !== undefined;
    }

    async _checkAttendanceEligibility(companyId, userId, startDate, endDate, conditions) {
        const attendanceRecords = await this.prisma.attendance.findMany({
            where: {
                userId,
                companyId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            }
        });

        const presentRecords = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY');
        const lateRecords = attendanceRecords.filter(a => (a.lateMinutes > 0) || (a.status === 'LATE'));
        const absentRecords = attendanceRecords.filter(a => a.status === 'ABSENT');

        const totalLateMinutes = attendanceRecords.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);

        let isEligible = true;
        let reason = '';

        if (conditions.noLateness && lateRecords.length > 0) {
            isEligible = false;
            reason = 'Employee has lateness records';
        }

        if (conditions.noAbsences && absentRecords.length > 0) {
            isEligible = false;
            reason = 'Employee has absence records';
        }

        if (conditions.maxLateMinutes !== undefined && totalLateMinutes > conditions.maxLateMinutes) {
            isEligible = false;
            reason = `Total late minutes ${totalLateMinutes} exceeds limit ${conditions.maxLateMinutes}`;
        }

        // Min Attendance Rate %
        if (conditions.minAttendanceRate !== undefined) {
            const totalRecords = attendanceRecords.length;
            // Note: This logic assumes records exist for scheduled days.
            if (totalRecords > 0) {
                const rate = (presentRecords.length / totalRecords) * 100;
                if (rate < conditions.minAttendanceRate) {
                    isEligible = false;
                    reason = `Attendance rate ${rate.toFixed(1)}% is below ${conditions.minAttendanceRate}%`;
                }
            }
        }

        return {
            isEligible,
            reason,
            details: {
                totalLateMinutes,
                lateCount: lateRecords.length,
                absentCount: absentRecords.length,
                presentCount: presentRecords.length
            }
        };
    }

    async _checkPerformanceEligibility(companyId, userId, startDate, endDate, conditions) {
        const reviews = await this.prisma.performanceReview.findMany({
            where: {
                userId,
                companyId,
                periodStart: { gte: new Date(startDate) },
                periodEnd: { lte: new Date(endDate) },
                // status: { in: ['COMPLETED', 'ACKNOWLEDGED', 'SUBMITTED'] } 
                // Assuming reviews in the period are valid sources
            }
        });

        if (reviews.length === 0) {
            return { isEligible: false, reason: 'No performance reviews in period', details: { reviewCount: 0 } };
        }

        const avgRating = reviews.reduce((sum, r) => sum + Number(r.overallRating), 0) / reviews.length;
        const avgGoals = reviews.reduce((sum, r) => sum + (Number(r.goalsAchievement) || 0), 0) / reviews.length;

        let isEligible = true;
        let reason = '';

        if (conditions.minPerformanceScore !== undefined && avgRating < conditions.minPerformanceScore) {
            isEligible = false;
            reason = `Average rating ${avgRating.toFixed(2)} is below ${conditions.minPerformanceScore}`;
        }

        if (conditions.minGoalsAchievement !== undefined && avgGoals < conditions.minGoalsAchievement) {
            isEligible = false;
            reason = `Goals achievement ${avgGoals.toFixed(2)}% is below ${conditions.minGoalsAchievement}%`;
        }

        return {
            isEligible,
            reason,
            details: {
                avgRating,
                avgGoals,
                reviewCount: reviews.length
            }
        };
    }

    async _logEvaluation(companyId, userId, rewardTypeId, periodStart, periodEnd, result, conditions) {
        await this.prisma.rewardEligibilityLog.create({
            data: {
                companyId,
                userId,
                rewardTypeId,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                isEligible: result.isEligible,
                eligibilityDetails: JSON.stringify({ ...result.details, reason: result.reason }),
                conditionsChecked: JSON.stringify(conditions)
            }
        });
    }

    /**
     * تقييم جماعي للموظفين
     * Batch evaluate all active employees
     */
    async evaluateAllEligibleEmployees(companyId, rewardTypeId, periodStart, periodEnd) {
        // Get all active employees
        const employees = await this.prisma.user.findMany({
            where: { companyId, isActive: true, employeeNumber: { not: null } },
            select: { id: true }
        });

        const results = [];
        for (const emp of employees) {
            const result = await this.evaluateEligibility(companyId, emp.id, rewardTypeId, periodStart, periodEnd);
            if (result.isEligible) {
                results.push({ userId: emp.id, result });
            }
        }
        return results;
    }
}

module.exports = new RewardEligibilityService();
