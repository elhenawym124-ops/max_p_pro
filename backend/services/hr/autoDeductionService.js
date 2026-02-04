/**
 * 💸 Auto Deduction Service
 * خدمة الخصم التلقائي للتأخير
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const latenessCalculationService = require('./latenessCalculationService');

class AutoDeductionService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * معالجة التأخير وإنشاء خصم تلقائي إذا لزم الأمر
   */
  async processLateAttendance(companyId, employeeId, attendanceId, checkInTime, scheduledTime) {
    try {
      console.log('🕐 [AutoDeduction] Processing late attendance:', {
        employeeId,
        attendanceId,
        checkInTime,
        scheduledTime
      });

      // حساب دقائق التأخير
      const lateMinutes = latenessCalculationService.calculateLateMinutes(scheduledTime, checkInTime);

      if (lateMinutes === 0) {
        console.log('✅ [AutoDeduction] No lateness detected');
        return { hasDeduction: false, lateMinutes: 0 };
      }

      console.log(`⏰ [AutoDeduction] Late by ${lateMinutes} minutes`);

      // حساب الخصم المطلوب
      const calculation = await latenessCalculationService.calculateDeduction(
        companyId,
        employeeId,
        lateMinutes,
        checkInTime
      );

      console.log('📊 [AutoDeduction] Calculation result:', calculation);

      if (calculation.skipDeduction) {
        console.log('⏭️ [AutoDeduction] Auto deduction disabled for this employee');
        return { hasDeduction: false, lateMinutes, calculation };
      }

      // تحديث رصيد المرونة الشهري
      await latenessCalculationService.updateMonthlyBalance(
        companyId,
        employeeId,
        checkInTime,
        calculation
      );

      // إنشاء خصم تلقائي إذا كان هناك دقائق مخصومة
      let deduction = null;
      if (calculation.deductMinutes > 0 && calculation.totalDeduction > 0) {
        deduction = await this.createAutoDeduction(
          companyId,
          employeeId,
          attendanceId,
          calculation,
          checkInTime
        );
      }

      return {
        hasDeduction: calculation.deductMinutes > 0,
        lateMinutes,
        calculation,
        deduction
      };
    } catch (error) {
      console.error('❌ Error processing late attendance:', error);
      throw error;
    }
  }

  /**
   * معالجة الانصراف المبكر وإنشاء خصم تلقائي
   */
  async processEarlyCheckout(companyId, employeeId, attendanceId, checkoutTime, scheduledTime, earlyMinutes) {
    try {
      console.log('🕐 [AutoDeduction] Processing early checkout:', {
        employeeId,
        attendanceId,
        checkoutTime,
        scheduledTime,
        earlyMinutes
      });

      if (!earlyMinutes || earlyMinutes <= 0) {
        return { hasDeduction: false, earlyMinutes: 0 };
      }

      // حساب الخصم المطلوب
      const calculation = await latenessCalculationService.calculateEarlyCheckoutDeduction(
        companyId,
        employeeId,
        earlyMinutes,
        checkoutTime
      );

      console.log('📊 [AutoDeduction] Early checkout calculation result:', calculation);

      if (calculation.skipDeduction) {
        return { hasDeduction: false, earlyMinutes, calculation };
      }

      // إنشاء خصم تلقائي
      let deduction = null;
      if (calculation.deductMinutes > 0 && calculation.totalDeduction > 0) {
        deduction = await this.createAutoDeduction(
          companyId,
          employeeId,
          attendanceId,
          {
            ...calculation,
            breakdown: {
              ...calculation.breakdown,
              lateMinutes: earlyMinutes // نستخدم نفس مسمى الحقل للتوافق مع createAutoDeduction
            }
          },
          checkoutTime,
          'EARLY_LEAVE'
        );
      }

      return {
        hasDeduction: calculation.deductMinutes > 0,
        earlyMinutes,
        calculation,
        deduction
      };
    } catch (error) {
      console.error('❌ Error processing early checkout:', error);
      throw error;
    }
  }

  /**
   * إنشاء خصم تلقائي في جدول ManualDeduction
   */
  async createAutoDeduction(companyId, employeeId, attendanceId, calculation, date, type = 'LATE') {
    try {
      const checkInDate = new Date(date);
      const month = checkInDate.getMonth() + 1;
      const year = checkInDate.getFullYear();

      // بناء وصف تفصيلي للخصم
      const description = this.buildDeductionDescription(calculation, type);

      const reasonPrefix = type === 'LATE' ? 'تأخير' : 'انصراف مبكر';
      const reason = `خصم تلقائي - ${reasonPrefix} ${calculation.breakdown.lateMinutes} دقيقة`;

      // التحقق من إعدادات المراجعة
      const hrSettings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });

      const status = hrSettings?.requireDeductionReview !== false ? 'PENDING' : 'APPROVED';

      const deduction = await this.prisma.manualDeduction.create({
        data: {
          companyId,
          employeeId,
          type,
          category: 'AUTO_DEDUCTION',
          amount: calculation.totalDeduction,
          reason,
          description,
          date: checkInDate,
          effectiveMonth: month,
          effectiveYear: year,
          status, // استخدام الحالة المتغيرة
          approvedBy: status === 'APPROVED' ? 'SYSTEM' : null,
          approvedAt: status === 'APPROVED' ? new Date() : null,
          appliedToPayroll: false,
          notes: `Attendance ID: ${attendanceId}`,
          createdBy: 'SYSTEM'
        }
      });

      console.log('✅ [AutoDeduction] Created deduction:', deduction.id);
      return deduction;
    } catch (error) {
      console.error('❌ Error creating auto deduction:', error);
      throw error;
    }
  }

  /**
   * بناء وصف تفصيلي للخصم
   */
  buildDeductionDescription(calculation, type = 'LATE') {
    const b = calculation.breakdown;
    const title = type === 'LATE' ? 'تأخير' : 'انصراف مبكر';

    let desc = `تفاصيل الخصم التلقائي (${title}):\n`;
    desc += `• إجمالي ${title}: ${b.lateMinutes || b.earlyMinutes} دقيقة\n`;

    if (type === 'LATE') {
      desc += `• الحد الأقصى اليومي: ${b.maxDaily} دقائق\n`;
      if (calculation.exceedsDaily) {
        desc += `• تجاوز الحد اليومي: ${b.immediateDeduct} دقيقة (خصم فوري)\n`;
      }
      desc += `• دقائق قابلة للمرونة: ${b.graceEligibleMinutes} دقيقة\n`;
      desc += `• رصيد المرونة المتبقي: ${b.remainingGrace} دقيقة\n`;
      desc += `• استخدام من الرصيد: ${calculation.useGraceMinutes} دقيقة\n`;
      if (b.additionalDeduct > 0) {
        desc += `• خصم إضافي (نفاد الرصيد): ${b.additionalDeduct} دقيقة\n`;
      }
    } else {
      desc += `• الحد المسموح: ${b.threshold} دقيقة\n`;
    }

    if (b.multiplier && b.multiplier > 1) {
      desc += `• المضاعف المطبق: x${b.multiplier}\n`;
    }

    desc += `• إجمالي الدقائق المخصومة: ${calculation.deductMinutes} دقيقة\n`;
    desc += `• معدل الخصم: ${b.effectiveRate || b.baseRate || b.deductionRate} جنيه/دقيقة\n`;

    if (calculation.isCapped) {
      desc += `• المبلغ المحتسب سابقاً: ${calculation.originalAmount} جنيه\n`;
      desc += `• تطبيق الحد الأقصى اليومي (${b.maxDailyDeductionDays} يوم): ${calculation.totalDeduction} جنيه\n`;
    } else {
      desc += `• المبلغ الإجمالي: ${calculation.totalDeduction} جنيه`;
    }

    return desc;
  }

  /**
   * الحصول على تقرير الخصومات التلقائية للموظف
   */
  async getEmployeeAutoDeductions(companyId, employeeId, month, year) {
    try {
      const deductions = await this.prisma.manualDeduction.findMany({
        where: {
          companyId,
          employeeId,
          type: 'LATE',
          category: 'AUTO_DEDUCTION',
          effectiveMonth: month,
          effectiveYear: year
        },
        orderBy: {
          date: 'desc'
        }
      });

      const total = deductions.reduce((sum, d) => sum + parseFloat(d.amount), 0);

      return {
        deductions,
        count: deductions.length,
        totalAmount: total
      };
    } catch (error) {
      console.error('❌ Error getting employee auto deductions:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الخصومات التلقائية للشركة
   */
  async getCompanyAutoDeductionStats(companyId, month, year) {
    try {
      const where = {
        companyId,
        type: 'LATE',
        category: 'AUTO_DEDUCTION'
      };

      if (month && year) {
        where.effectiveMonth = month;
        where.effectiveYear = year;
      }

      const deductions = await this.prisma.manualDeduction.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // جلب بيانات الموظفين
      const employeeIds = [...new Set(deductions.map(d => d.employeeId))];
      const employees = await this.prisma.user.findMany({
        where: {
          id: { in: employeeIds }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true
        }
      });

      const employeeMap = {};
      employees.forEach(emp => {
        employeeMap[emp.id] = emp;
      });

      // حساب الإحصائيات
      const totalAmount = deductions.reduce((sum, d) => sum + parseFloat(d.amount), 0);

      const byEmployee = {};
      deductions.forEach(d => {
        if (!byEmployee[d.employeeId]) {
          byEmployee[d.employeeId] = {
            employee: employeeMap[d.employeeId],
            count: 0,
            totalAmount: 0
          };
        }
        byEmployee[d.employeeId].count++;
        byEmployee[d.employeeId].totalAmount += parseFloat(d.amount);
      });

      return {
        totalDeductions: deductions.length,
        totalAmount,
        affectedEmployees: Object.keys(byEmployee).length,
        byEmployee: Object.values(byEmployee).sort((a, b) => b.totalAmount - a.totalAmount),
        deductions: deductions.map(d => ({
          ...d,
          employee: employeeMap[d.employeeId]
        }))
      };
    } catch (error) {
      console.error('❌ Error getting company auto deduction stats:', error);
      throw error;
    }
  }

  /**
   * إلغاء خصم تلقائي (في حالات استثنائية)
   */
  async cancelAutoDeduction(companyId, deductionId, cancelledBy, reason) {
    try {
      const deduction = await this.prisma.manualDeduction.findFirst({
        where: {
          id: deductionId,
          companyId,
          type: 'LATE',
          category: 'AUTO_DEDUCTION'
        }
      });

      if (!deduction) {
        throw new Error('الخصم غير موجود');
      }

      if (deduction.appliedToPayroll) {
        throw new Error('لا يمكن إلغاء خصم تم تطبيقه على الراتب');
      }

      // تحديث حالة الخصم
      const updated = await this.prisma.manualDeduction.update({
        where: { id: deductionId },
        data: {
          status: 'CANCELLED',
          notes: `${deduction.notes || ''}\nتم الإلغاء بواسطة: ${cancelledBy}\nسبب الإلغاء: ${reason}`
        }
      });

      // تحديث رصيد المرونة (استرجاع الدقائق المخصومة)
      const month = deduction.effectiveMonth;
      const year = deduction.effectiveYear;

      // استخراج الدقائق المخصومة من الوصف
      const deductMinutesMatch = deduction.description.match(/إجمالي الدقائق المخصومة: (\d+)/);
      const deductMinutes = deductMinutesMatch ? parseInt(deductMinutesMatch[1]) : 0;

      if (deductMinutes > 0) {
        const balance = await this.prisma.latenessBalance.findUnique({
          where: {
            employeeId_month_year: {
              employeeId: deduction.employeeId,
              month,
              year
            }
          }
        });

        if (balance) {
          await this.prisma.latenessBalance.update({
            where: { id: balance.id },
            data: {
              deductedMinutes: {
                decrement: deductMinutes
              },
              totalDeductionAmount: {
                decrement: parseFloat(deduction.amount)
              }
            }
          });
        }
      }

      console.log('✅ [AutoDeduction] Cancelled deduction:', deductionId);
      return updated;
    } catch (error) {
      console.error('❌ Error cancelling auto deduction:', error);
      throw error;
    }
  }
}

module.exports = new AutoDeductionService();
