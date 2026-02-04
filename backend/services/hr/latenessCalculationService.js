/**
 * 🕐 Lateness Calculation Service
 * خدمة حساب التأخير والمرونة الشهرية
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class LatenessCalculationService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * حساب دقائق التأخير بناءً على وقت الدخول المحدد ووقت الدخول الفعلي
   */
  calculateLateMinutes(scheduledTime, actualCheckIn) {
    if (!scheduledTime || !actualCheckIn) {
      return 0;
    }

    const scheduled = new Date(scheduledTime);
    const actual = new Date(actualCheckIn);

    const diffMs = actual - scheduled;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return diffMinutes > 0 ? diffMinutes : 0;
  }

  /**
   * الحصول على أو إنشاء رصيد المرونة للموظف في الشهر الحالي
   */
  async getOrCreateMonthlyBalance(companyId, employeeId, month, year) {
    try {
      let balance = await this.prisma.latenessBalance.findUnique({
        where: {
          employeeId_month_year: {
            employeeId,
            month,
            year
          }
        }
      });

      if (!balance) {
        balance = await this.prisma.latenessBalance.create({
          data: {
            companyId,
            employeeId,
            month,
            year,
            totalLateMinutes: 0,
            graceMinutesUsed: 0,
            deductedMinutes: 0,
            totalDeductionAmount: 0,
            lateCount: 0
          }
        });
      }

      return balance;
    } catch (error) {
      console.error('❌ Error getting/creating monthly balance:', error);
      throw error;
    }
  }

  /**
   * حساب الخصم المطلوب بناءً على التأخير والمرونة المتاحة
   * @returns {Object} { deductMinutes, useGraceMinutes, exceedsDaily, totalDeduction }
   */
  async calculateDeduction(companyId, employeeId, lateMinutes, date) {
    try {
      // 1. جلب إعدادات الشركة (النظام الجديد)
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });

      // 2. جلب إعدادات الموظف (للتوافق مع النظام القديم أو الاستثناءات)
      const employee = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          monthlyGraceMinutes: true,
          maxDailyLateMinutes: true,
          lateDeductionRate: true,
          enableAutoDeduction: true,
          baseSalary: true // Fix: Include baseSalary for daily rate calculation
        }
      });

      // التحقق من تفعيل الخصم التلقائي
      // 1. يجب أن يكون النظام مفعلاً للشركة
      // 2. يجب ألا يكون الموظف مستثنى يدوياً (enableAutoDeduction)
      const isCompanyEnabled = settings ? settings.autoDeductionEnabled : true;
      const isEmployeeEnabled = employee?.enableAutoDeduction !== false;

      if (!isCompanyEnabled || !isEmployeeEnabled) {
        return {
          deductMinutes: 0,
          useGraceMinutes: 0,
          exceedsDaily: false,
          totalDeduction: 0,
          skipDeduction: true,
          skipReason: !isCompanyEnabled ? 'DISABLED_GLOBALLY' : 'EMPLOYEE_EXCLUDED'
        };
      }

      // تحديد القيم المستخدمة (تفضيل إعدادات الشركة)
      const monthlyGrace = settings ? settings.gracePeriodMinutes : (employee?.monthlyGraceMinutes || 60);

      // ✅ TO-DO UNITY: Use lateGracePeriod (reporting) if lateThresholdMinutes is not set
      // Currently merging them into a unified concept for better UX
      const maxDailyThreshold = settings
        ? (settings.lateThresholdMinutes || settings.lateGracePeriod || 15)
        : (employee?.maxDailyLateMinutes || 10);

      const baseDeductionRate = parseFloat(employee?.lateDeductionRate || 0);
      const maxDailyDeductionDays = settings ? parseFloat(settings.maxDailyDeductionDays || 1.0) : 1.0;

      // الحصول على رصيد المرونة الشهري الحالي
      const checkInDate = new Date(date);
      const month = checkInDate.getMonth() + 1;
      const year = checkInDate.getFullYear();

      const balance = await this.getOrCreateMonthlyBalance(companyId, employeeId, month, year);
      const remainingGrace = monthlyGrace - balance.graceMinutesUsed;

      // حساب المضاعف (Multiplier) بناءً على عدد مرات التأخير هذا الشهر
      let multiplier = 1.0;
      if (settings) {
        if (balance.lateCount === 0) multiplier = parseFloat(settings.firstViolationMultiplier || 1.0);
        else if (balance.lateCount === 1) multiplier = parseFloat(settings.secondViolationMultiplier || 2.0);
        else multiplier = parseFloat(settings.thirdViolationMultiplier || 3.0);
      }

      let immediateDeduct = 0;
      let graceEligibleMinutes = lateMinutes;
      let exceedsDaily = false;

      // التحقق من تجاوز الحد اليومي
      if (lateMinutes > maxDailyThreshold) {
        exceedsDaily = true;
        immediateDeduct = lateMinutes - maxDailyThreshold;
        graceEligibleMinutes = maxDailyThreshold;
      }

      // حساب ما يمكن استخدامه من رصيد المرونة
      let useGraceMinutes = 0;
      let additionalDeduct = 0;

      if (graceEligibleMinutes <= remainingGrace) {
        useGraceMinutes = graceEligibleMinutes;
        additionalDeduct = 0;
      } else {
        useGraceMinutes = remainingGrace > 0 ? remainingGrace : 0;
        additionalDeduct = graceEligibleMinutes - useGraceMinutes;
      }

      const totalDeductMinutes = immediateDeduct + additionalDeduct;
      const effectiveDeductionRate = baseDeductionRate * multiplier;
      let totalDeduction = totalDeductMinutes * effectiveDeductionRate;

      // 🕒 Apply Tiered Penalties (if configured)
      let appliedTier = null;
      if (settings && settings.delayPenaltyTiers) {
        try {
          const tiers = JSON.parse(settings.delayPenaltyTiers);
          if (Array.isArray(tiers) && tiers.length > 0) {
            // Sort tiers by minMinutes descending to find the highest applicable tier
            const applicableTiers = tiers
              .filter(t => lateMinutes >= t.minMinutes)
              .sort((a, b) => b.minMinutes - a.minMinutes);

            if (applicableTiers.length > 0) {
              appliedTier = applicableTiers[0];
              // Tier-based deduction overrides per-minute deduction
              totalDeduction = appliedTier.deductionDays * dailySalary;
            }
          }
        } catch (e) {
          console.error('❌ [LatenessCalc] Error parsing delayPenaltyTiers:', e);
        }
      }

      // 🛡️ Apply Deduction Cap (Max Daily Deduction)
      // Cap is expressed in "days". We need to convert it to actual amount.
      const dailySalary = parseFloat(employee?.baseSalary || 0) / (settings?.workingDaysPerMonth || 22);
      const maxDeductionAmount = dailySalary * maxDailyDeductionDays;

      let isCapped = false;
      let originalAmount = totalDeduction;

      if (totalDeduction > maxDeductionAmount && maxDeductionAmount > 0) {
        totalDeduction = maxDeductionAmount;
        isCapped = true;
      }

      return {
        deductMinutes: totalDeductMinutes,
        useGraceMinutes,
        exceedsDaily,
        totalDeduction,
        isCapped,
        originalAmount,
        multiplier,
        appliedTier,
        skipDeduction: false,
        breakdown: {
          lateMinutes,
          maxDaily: maxDailyThreshold,
          immediateDeduct,
          graceEligibleMinutes,
          remainingGrace,
          useGraceMinutes,
          additionalDeduct,
          baseRate: baseDeductionRate,
          multiplier,
          effectiveRate: effectiveDeductionRate,
          dailySalary,
          maxDailyDeductionDays,
          maxDeductionAmount
        }
      };
    } catch (error) {
      console.error('❌ Error calculating deduction:', error);
      throw error;
    }
  }

  /**
   * تحديث رصيد المرونة الشهري بعد تسجيل الحضور
   */
  async updateMonthlyBalance(companyId, employeeId, date, calculation) {
    try {
      const checkInDate = new Date(date);
      const month = checkInDate.getMonth() + 1;
      const year = checkInDate.getFullYear();

      const balance = await this.getOrCreateMonthlyBalance(companyId, employeeId, month, year);

      const updated = await this.prisma.latenessBalance.update({
        where: { id: balance.id },
        data: {
          totalLateMinutes: {
            increment: calculation.breakdown.lateMinutes
          },
          graceMinutesUsed: {
            increment: calculation.useGraceMinutes
          },
          deductedMinutes: {
            increment: calculation.deductMinutes
          },
          totalDeductionAmount: {
            increment: calculation.totalDeduction
          },
          lateCount: {
            increment: 1
          }
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error updating monthly balance:', error);
      throw error;
    }
  }

  /**
   * حساب الخصم المطلوب للانصراف المبكر
   */
  async calculateEarlyCheckoutDeduction(companyId, employeeId, earlyMinutes, date) {
    try {
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });

      const employee = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          lateDeductionRate: true,
          enableAutoDeduction: true
        }
      });

      const isCompanyEnabled = settings ? settings.earlyCheckoutEnabled : true;
      const isEmployeeEnabled = employee?.enableAutoDeduction !== false;
      const threshold = settings ? settings.earlyCheckoutThresholdMinutes : 0;
      const baseDeductionRate = parseFloat(employee?.lateDeductionRate || 0);

      if (!isCompanyEnabled || !isEmployeeEnabled || earlyMinutes <= threshold) {
        return {
          deductMinutes: 0,
          totalDeduction: 0,
          skipDeduction: true,
          skipReason: !isCompanyEnabled ? 'DISABLED_GLOBALLY' : (!isEmployeeEnabled ? 'EMPLOYEE_EXCLUDED' : 'BELOW_THRESHOLD')
        };
      }

      // الانصراف المبكر عادة يخصم كامل الدقائق بدون مرونة شهرية (حسب رغبة المستخدم غالباً)
      const deductMinutes = earlyMinutes;
      const totalDeduction = deductMinutes * baseDeductionRate;

      return {
        deductMinutes,
        totalDeduction,
        skipDeduction: false,
        breakdown: {
          earlyMinutes,
          threshold,
          deductMinutes,
          baseRate: baseDeductionRate
        }
      };
    } catch (error) {
      console.error('❌ Error calculating early checkout deduction:', error);
      throw error;
    }
  }

  /**
   * الحصول على رصيد المرونة المتبقي للموظف في الشهر الحالي
   */
  async getRemainingGraceMinutes(employeeId) {
    try {
      const employee = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          monthlyGraceMinutes: true,
          companyId: true
        }
      });

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const balance = await this.getOrCreateMonthlyBalance(
        employee.companyId,
        employeeId,
        month,
        year
      );

      const monthlyGrace = employee.monthlyGraceMinutes || 60;
      const remaining = monthlyGrace - balance.graceMinutesUsed;

      return {
        total: monthlyGrace,
        used: balance.graceMinutesUsed,
        remaining: remaining > 0 ? remaining : 0,
        lateCount: balance.lateCount,
        totalDeducted: balance.deductedMinutes,
        totalDeductionAmount: parseFloat(balance.totalDeductionAmount)
      };
    } catch (error) {
      console.error('❌ Error getting remaining grace minutes:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقرير التأخير الشهري للموظف
   */
  async getMonthlyLatenessReport(companyId, employeeId, month, year) {
    try {
      const balance = await this.prisma.latenessBalance.findUnique({
        where: {
          employeeId_month_year: {
            employeeId,
            month,
            year
          }
        }
      });

      if (!balance) {
        return {
          month,
          year,
          totalLateMinutes: 0,
          graceMinutesUsed: 0,
          deductedMinutes: 0,
          totalDeductionAmount: 0,
          lateCount: 0
        };
      }

      return {
        month: balance.month,
        year: balance.year,
        totalLateMinutes: balance.totalLateMinutes,
        graceMinutesUsed: balance.graceMinutesUsed,
        deductedMinutes: balance.deductedMinutes,
        totalDeductionAmount: parseFloat(balance.totalDeductionAmount),
        lateCount: balance.lateCount
      };
    } catch (error) {
      console.error('❌ Error getting monthly lateness report:', error);
      throw error;
    }
  }

  /**
   * إعادة تعيين رصيد المرونة في بداية كل شهر (يتم استدعاؤه تلقائياً)
   */
  async resetMonthlyBalances(companyId) {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // لا نحتاج لإعادة تعيين - النظام ينشئ رصيد جديد تلقائياً لكل شهر
      console.log(`✅ Monthly balances are auto-created for ${currentMonth}/${currentYear}`);

      return { success: true, month: currentMonth, year: currentYear };
    } catch (error) {
      console.error('❌ Error resetting monthly balances:', error);
      throw error;
    }
  }
}

module.exports = new LatenessCalculationService();
