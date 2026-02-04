/**
 * 🔥 Streak Reward Service
 * خدمة المكافآت التلقائية بناءً على سلاسل الحضور (Attendance Streaks)
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const attendanceService = require('./attendanceService');
const rewardManagementService = require('./rewardManagementService');

class StreakRewardService {
    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * فحص وتطبيق مكافآت السلسلة لموظف معين
     */
    async checkAndApplyStreakRewards(companyId, userId) {
        try {
            console.log(`🔍 [StreakReward] Checking rewards for user ${userId} in company ${companyId}`);

            // 1. حساب سلاسل الحضور (Punctuality & Presence)
            const presenceStreak = await attendanceService.calculateAttendanceStreak(companyId, userId, 'PRESENT');

            // 2. جلب أنواع المكافآت المرتبطة بالحضور
            const attendanceRewardTypes = await this.prisma.rewardType.findMany({
                where: {
                    companyId,
                    isActive: true,
                    category: 'ATTENDANCE',
                    triggerType: 'AUTOMATIC'
                }
            });

            if (attendanceRewardTypes.length === 0) {
                console.log('ℹ️ [StreakReward] No automatic attendance rewards configured.');
                return { success: true, rewardsApplied: 0 };
            }

            let appliedCount = 0;

            for (const type of attendanceRewardTypes) {
                // Parse conditions (e.g., { minStreak: 30 })
                let conditions = {};
                try {
                    conditions = type.eligibilityConditions ? JSON.parse(type.eligibilityConditions) : {};
                } catch (e) {
                    continue;
                }

                if (conditions.minStreak && presenceStreak >= conditions.minStreak) {
                    // التحقق من عدم منح هذه المكافأة مؤخراً لنفس السلسلة (لتجنب التكرار)
                    const lastReward = await this.prisma.rewardRecord.findFirst({
                        where: {
                            userId,
                            rewardTypeId: type.id,
                            companyId,
                            createdAt: {
                                gte: new Date(new Date().setDate(new Date().getDate() - 25)) // Within last 25 days
                            }
                        }
                    });

                    if (!lastReward) {
                        // تطبيق المكافأة
                        await rewardManagementService.createManualReward(companyId, {
                            userId,
                            rewardTypeId: type.id,
                            reason: `مكافأة تلقائية لتحقيق سلسلة حضور متواصل لمدة ${presenceStreak} يوماً`,
                            calculatedValue: type.value,
                            periodStart: new Date(new Date().setDate(new Date().getDate() - presenceStreak)),
                            periodEnd: new Date(),
                            appliedMonth: new Date().getMonth() + 1,
                            appliedYear: new Date().getFullYear(),
                            eligibilityMet: JSON.stringify({ streak: presenceStreak, required: conditions.minStreak })
                        }, 'SYSTEM');

                        appliedCount++;
                        console.log(`✅ [StreakReward] Applied reward ${type.name} to user ${userId}`);
                    }
                }
            }

            return { success: true, rewardsApplied: appliedCount };
        } catch (error) {
            console.error('❌ [StreakReward] Error checking streak rewards:', error);
            throw error;
        }
    }

    /**
     * تشغيل الفحص لجميع الموظفين (Batch Processing)
     */
    async processAllEmployees(companyId) {
        const employees = await this.prisma.user.findMany({
            where: { companyId, isActive: true, employeeNumber: { not: null } },
            select: { id: true }
        });

        const results = [];
        for (const emp of employees) {
            const res = await this.checkAndApplyStreakRewards(companyId, emp.id);
            results.push({ userId: emp.id, ...res });
        }
        return results;
    }
}

module.exports = new StreakRewardService();
