/**
 * 💰 Payroll Service
 * خدمة إدارة الرواتب
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { validatePayrollData } = require('../../utils/hrValidation');
const rewardPayrollIntegrationService = require('./rewardPayrollIntegrationService');
const {
  NotFoundError,
  DuplicatePayrollError,
  PayrollAlreadyPaidError,
  PayrollError
} = require('../../utils/hrErrors');

class PayrollService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء كشف راتب
   */
  async createPayroll(companyId, employeeId, data) {
    try {
      const { month, year } = data;

      // التحقق من صحة البيانات
      validatePayrollData({ month, year });

      // التحقق من عدم وجود كشف راتب لنفس الشهر
      const existing = await this.prisma.payroll.findFirst({
        where: { userId: employeeId, month, year }
      });

      if (existing) {
        throw new DuplicatePayrollError(month, year);
      }

      // حساب بيانات الراتب
      const payrollData = await this.calculatePayrollData(companyId, employeeId, month, year, data);

      const payroll = await this.prisma.payroll.create({
        data: {
          companyId,
          userId: employeeId,
          month,
          year,
          periodStart: payrollData.periodStart,
          periodEnd: payrollData.periodEnd,
          baseSalary: payrollData.baseSalary,
          workingDays: payrollData.totalWorkingDaysInMonth,
          actualWorkDays: payrollData.presentDays,
          allowances: JSON.stringify(payrollData.allowances),
          totalAllowances: payrollData.totalAllowances,
          deductions: JSON.stringify(payrollData.deductions),
          totalDeductions: payrollData.totalDeductions,
          attendanceDeduction: payrollData.attendanceDeduction,
          absentDays: payrollData.absentDays,
          latePenalty: payrollData.latePenalty,
          overtimeHours: payrollData.totalOvertimeHours,
          overtimeRate: payrollData.overtimeRate,
          overtimeAmount: payrollData.overtimeAmount,
          bonuses: payrollData.bonuses,
          bonusNotes: data.bonusNotes,
          socialInsurance: payrollData.socialInsurance,
          taxAmount: payrollData.taxAmount,
          grossSalary: payrollData.grossSalary,
          netSalary: payrollData.netSalary,
          status: 'DRAFT',
          notes: data.notes
        }
      });

      // Link rewards to payroll and update their status
      if (payrollData.approvedRewards && payrollData.approvedRewards.length > 0) {
        await rewardPayrollIntegrationService.applyRewardsToPayroll(payroll.id, payrollData.approvedRewards);
      }

      return payroll;
    } catch (error) {
      console.error('❌ Error creating payroll:', error);
      throw error;
    }
  }

  /**
   * توليد كشوف رواتب لجميع الموظفين
   * @param {boolean} forceRegenerate - إذا كان true، يتم حذف كشوف الرواتب الموجودة وإعادة توليدها
   */
  async generateMonthlyPayroll(companyId, month, year, forceRegenerate = false) {
    try {
      const employees = await this.prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { employeeNumber: { not: null } },
            { departmentId: { not: null } },
            { positionId: { not: null } }
          ]
        }
      });

      const results = {
        success: [],
        failed: [],
        skipped: [],
        regenerated: []
      };

      // إذا كان forceRegenerate = true، نحذف كشوف الرواتب الموجودة أولاً
      if (forceRegenerate) {
        const deletedCount = await this.prisma.payroll.deleteMany({
          where: { companyId, month, year }
        });
        console.log(`🗑️ Deleted ${deletedCount.count} existing payrolls for ${month}/${year}`);
      }

      for (const employee of employees) {
        try {
          // تحقق من وجود كشف راتب سابق
          const existing = await this.prisma.payroll.findFirst({
            where: { userId: employee.id, month, year }
          });

          if (existing && !forceRegenerate) {
            // تخطي الموظف إذا كان لديه كشف راتب مسبقاً
            results.skipped.push({
              userId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              existingPayrollId: existing.id,
              message: 'كشف الراتب موجود مسبقاً'
            });
            continue;
          }

          const payroll = await this.createPayroll(companyId, employee.id, { month, year });

          if (forceRegenerate && existing) {
            results.regenerated.push({
              userId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              payrollId: payroll.id
            });
          } else {
            results.success.push({
              userId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              payrollId: payroll.id
            });
          }
        } catch (error) {
          results.failed.push({
            userId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error generating monthly payroll:', error);
      throw error;
    }
  }

  /**
   * جلب كشوف الرواتب
   */
  async getPayrolls(companyId, options = {}) {
    try {
      const {
        employeeId,
        month,
        year,
        status,
        page = 1,
        limit = 20
      } = options;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const where = { companyId };

      if (month) where.month = parseInt(month);
      if (year) where.year = parseInt(year);
      if (status) where.status = status;

      // Filter out orphaned records by ensuring userId exists in User table
      // This prevents Prisma errors when including the user relation
      const userWhere = { companyId };
      const validUserIds = await this.prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      // Handle userId filter: if employeeId is provided, verify it's valid
      if (employeeId) {
        if (validUserIdList.includes(employeeId)) {
          where.userId = employeeId;
        } else {
          // Requested employeeId doesn't exist, return empty result
          return {
            payrolls: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0
            }
          };
        }
      } else {
        // Only include payrolls with valid user IDs
        if (validUserIdList.length > 0) {
          where.userId = { in: validUserIdList };
        } else {
          // No valid users found, return empty result
          return {
            payrolls: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0
            }
          };
        }
      }

      const [payrolls, total] = await Promise.all([
        this.prisma.payroll.findMany({
          where,
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          skip: (pageNum - 1) * limitNum,
          take: limitNum
        }),
        this.prisma.payroll.count({ where })
      ]);

      // Fetch user data separately since user relation is commented out in schema
      const userIds = [...new Set(payrolls.map(p => p.userId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          avatar: true,
          departmentRelation: {
            select: { name: true }
          },
          positionRelation: {
            select: { title: true }
          }
        }
      });

      const usersMap = new Map(users.map(u => [u.id, u]));

      // Map user data to payrolls
      const mappedPayrolls = payrolls.map(payroll => {
        const user = usersMap.get(payroll.userId);

        return {
          ...payroll,
          employee: user ? {
            ...user,
            department: user.departmentRelation,
            position: user.positionRelation
          } : null
        };
      });

      return {
        payrolls: mappedPayrolls,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting payrolls:', error);
      throw error;
    }
  }

  /**
   * جلب كشف راتب بالـ ID
   */
  async getPayrollById(companyId, payrollId) {
    try {
      const payroll = await this.prisma.payroll.findFirst({
        where: { id: payrollId, companyId }
      });

      if (payroll) {
        // تحويل JSON strings إلى objects
        payroll.allowances = JSON.parse(payroll.allowances || '{}');
        payroll.deductions = JSON.parse(payroll.deductions || '{}');
      }

      return payroll;
    } catch (error) {
      console.error('❌ Error getting payroll:', error);
      throw error;
    }
  }

  /**
   * تحديث كشف راتب
   */
  async updatePayroll(companyId, payrollId, data) {
    try {
      const existing = await this.prisma.payroll.findFirst({
        where: { id: payrollId, companyId }
      });

      if (!existing) {
        throw new Error('كشف الراتب غير موجود');
      }

      if (existing.status === 'PAID') {
        throw new Error('لا يمكن تعديل كشف راتب مدفوع');
      }

      // إعادة حساب الإجماليات إذا تغيرت البدلات أو الخصومات
      let updateData = { ...data };

      if (data.allowances) {
        updateData.allowances = JSON.stringify(data.allowances);
        updateData.totalAllowances = Object.values(data.allowances).reduce((sum, val) =>
          sum + (parseFloat(val) || 0), 0
        );
      }

      if (data.deductions) {
        updateData.deductions = JSON.stringify(data.deductions);
        updateData.totalDeductions = Object.values(data.deductions).reduce((sum, val) => {
          if (Array.isArray(val)) return sum; // Skip arrays like advanceDetails
          return sum + (parseFloat(val) || 0);
        }, 0);
      }

      // إعادة حساب الإجماليات
      const baseSalary = parseFloat(data.baseSalary || existing.baseSalary);
      const totalAllowances = updateData.totalAllowances || parseFloat(existing.totalAllowances);
      const totalDeductions = updateData.totalDeductions || parseFloat(existing.totalDeductions);
      const overtimeAmount = parseFloat(data.overtimeAmount || existing.overtimeAmount);
      const bonuses = parseFloat(data.bonuses || existing.bonuses);
      const socialInsurance = parseFloat(data.socialInsurance || existing.socialInsurance);
      const taxAmount = parseFloat(data.taxAmount || existing.taxAmount);

      updateData.grossSalary = baseSalary + totalAllowances + overtimeAmount + bonuses;
      updateData.netSalary = updateData.grossSalary - totalDeductions - socialInsurance - taxAmount;

      const payroll = await this.prisma.payroll.update({
        where: { id: payrollId },
        data: updateData,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true
            }
          }
        }
      });

      return payroll;
    } catch (error) {
      console.error('❌ Error updating payroll:', error);
      throw error;
    }
  }

  /**
   * اعتماد كشف راتب
   */
  async approvePayroll(companyId, payrollId) {
    try {
      const payroll = await this.prisma.payroll.update({
        where: { id: payrollId },
        data: { status: 'APPROVED' }
      });

      return payroll;
    } catch (error) {
      console.error('❌ Error approving payroll:', error);
      throw error;
    }
  }

  /**
   * صرف الراتب
   */
  async markAsPaid(companyId, payrollId, paymentData = {}) {
    try {
      const payroll = await this.prisma.payroll.findUnique({ where: { id: payrollId } });

      if (!payroll) throw new Error('Payroll not found');
      if (payroll.status === 'PAID') throw new Error('Payroll already paid');

      const updatedPayroll = await this.prisma.$transaction(async (tx) => {
        // 1. Update Payroll Status
        const p = await tx.payroll.update({
          where: { id: payrollId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paymentMethod: paymentData.method || 'bank_transfer',
            paymentReference: paymentData.reference
          }
        });

        // 2. Proccess Advances Deductions
        const deductions = JSON.parse(payroll.deductions || '{}');
        if (deductions.advanceDetails && Array.isArray(deductions.advanceDetails)) {
          for (const item of deductions.advanceDetails) {
            const advance = await tx.advanceRequest.findUnique({
              where: { id: item.advanceId }
            });

            if (advance) {
              const newBalance = parseFloat(advance.remainingBalance) - parseFloat(item.amount);
              const isPaidOff = newBalance <= 0.01; // Tolerance for float precision

              await tx.advanceRequest.update({
                where: { id: item.advanceId },
                data: {
                  remainingBalance: newBalance > 0 ? newBalance : 0,
                  isPaidOff: isPaidOff,
                  status: isPaidOff ? 'COMPLETED' : advance.status
                }
              });
            }
          }
        }

        return p;
      });

      return updatedPayroll;
    } catch (error) {
      console.error('❌ Error marking payroll as paid:', error);
      throw error;
    }
  }

  /**
   * صرف رواتب متعددة
   */
  async bulkMarkAsPaid(companyId, payrollIds, paymentData = {}) {
    try {
      let successCount = 0;

      // Loop purely to reuse the logic in markAsPaid which handles transaction and advance updates
      for (const id of payrollIds) {
        try {
          await this.markAsPaid(companyId, id, paymentData);
          successCount++;
        } catch (err) {
          console.error(`Failed to mark payroll ${id} as paid:`, err);
        }
      }

      return { updated: successCount };
    } catch (error) {
      console.error('❌ Error bulk marking payrolls as paid:', error);
      throw error;
    }
  }

  /**
   * حذف كشف راتب
   */
  async deletePayroll(companyId, payrollId) {
    try {
      const existing = await this.prisma.payroll.findFirst({
        where: { id: payrollId, companyId }
      });

      if (!existing) {
        throw new Error('كشف الراتب غير موجود');
      }

      if (existing.status === 'PAID') {
        throw new Error('لا يمكن حذف كشف راتب مدفوع');
      }

      await this.prisma.payroll.delete({
        where: { id: payrollId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting payroll:', error);
      throw error;
    }
  }

  /**
   * ملخص الرواتب الشهري
   */
  async getPayrollSummary(companyId, month, year) {
    try {
      // Filter out orphaned records by ensuring userId exists in User table
      const userWhere = { companyId };
      const validUserIds = await this.prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      const where = {
        companyId,
        month,
        year
      };

      // Only include payrolls with valid user IDs
      if (validUserIdList.length > 0) {
        where.userId = { in: validUserIdList };
      } else {
        // No valid users found, return empty summary
        return {
          month,
          year,
          totalEmployees: 0,
          totalBaseSalary: 0,
          totalAllowances: 0,
          totalDeductions: 0,
          totalOvertime: 0,
          totalBonuses: 0,
          totalSocialInsurance: 0,
          totalTax: 0,
          totalGross: 0,
          totalNet: 0,
          byStatus: {},
          byDepartment: {}
        };
      }

      const payrolls = await this.prisma.payroll.findMany({
        where
      });

      // جلب بيانات المستخدمين بشكل منفصل للحصول على أقسامهم
      const userIds = [...new Set(payrolls.map(p => p.userId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          departmentRelation: { select: { id: true, name: true } }
        }
      });
      const usersMap = new Map(users.map(u => [u.id, u]));

      const summary = {
        month,
        year,
        totalEmployees: payrolls.length,
        totalBaseSalary: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        totalOvertime: 0,
        totalBonuses: 0,
        totalSocialInsurance: 0,
        totalTax: 0,
        totalGross: 0,
        totalNet: 0,
        byStatus: {},
        byDepartment: {}
      };

      payrolls.forEach(p => {
        summary.totalBaseSalary += parseFloat(p.baseSalary) || 0;
        summary.totalAllowances += parseFloat(p.totalAllowances) || 0;
        summary.totalDeductions += parseFloat(p.totalDeductions) || 0;
        summary.totalOvertime += parseFloat(p.overtimeAmount) || 0;
        summary.totalBonuses += parseFloat(p.bonuses) || 0;
        summary.totalSocialInsurance += parseFloat(p.socialInsurance) || 0;
        summary.totalTax += parseFloat(p.taxAmount) || 0;
        summary.totalGross += parseFloat(p.grossSalary) || 0;
        summary.totalNet += parseFloat(p.netSalary) || 0;

        // حسب الحالة
        summary.byStatus[p.status] = (summary.byStatus[p.status] || 0) + 1;

        // حسب القسم
        const user = usersMap.get(p.userId);
        const deptName = user?.departmentRelation?.name || 'بدون قسم';
        if (!summary.byDepartment[deptName]) {
          summary.byDepartment[deptName] = { count: 0, total: 0 };
        }
        summary.byDepartment[deptName].count++;
        summary.byDepartment[deptName].total += parseFloat(p.netSalary) || 0;
      });

      return summary;
    } catch (error) {
      console.error('❌ Error getting payroll summary:', error);
      throw error;
    }
  }

  /**
   * تقرير الرواتب السنوي
   */
  async getAnnualReport(companyId, year, employeeId = null) {
    try {
      const where = { companyId, year };
      if (employeeId) where.userId = employeeId;

      const payrolls = await this.prisma.payroll.findMany({
        where,
        orderBy: { month: 'asc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true
            }
          }
        }
      });

      // تجميع حسب الموظف
      const byEmployee = {};
      payrolls.forEach(p => {
        const empId = p.userId;
        if (!byEmployee[empId]) {
          byEmployee[empId] = {
            employee: p.user,
            months: [],
            totals: {
              baseSalary: 0,
              allowances: 0,
              deductions: 0,
              overtime: 0,
              bonuses: 0,
              gross: 0,
              net: 0
            }
          };
        }

        byEmployee[empId].months.push({
          month: p.month,
          netSalary: p.netSalary,
          status: p.status
        });

        byEmployee[empId].totals.baseSalary += parseFloat(p.baseSalary) || 0;
        byEmployee[empId].totals.allowances += parseFloat(p.totalAllowances) || 0;
        byEmployee[empId].totals.deductions += parseFloat(p.totalDeductions) || 0;
        byEmployee[empId].totals.overtime += parseFloat(p.overtimeAmount) || 0;
        byEmployee[empId].totals.bonuses += parseFloat(p.bonuses) || 0;
        byEmployee[empId].totals.gross += parseFloat(p.grossSalary) || 0;
        byEmployee[empId].totals.net += parseFloat(p.netSalary) || 0;
      });

      return {
        year,
        employees: Object.values(byEmployee)
      };
    } catch (error) {
      console.error('❌ Error getting annual report:', error);
      throw error;
    }
  }


  /**
   * حساب تفاصيل الراتب (بدون حفظ)
   */
  async calculatePayrollData(companyId, employeeId, month, year, data = {}) {
    // جلب بيانات الموظف (User)
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new NotFoundError('الموظف', employeeId);
    }

    // جلب إعدادات HR
    const settings = await this.prisma.hRSettings.findUnique({
      where: { companyId }
    });

    // حساب فترة الراتب
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    // جلب سجلات الحضور للشهر
    const periodStartAdjusted = new Date(year, month - 1, 1, 0, 0, 0);
    const periodEndAdjusted = new Date(year, month, 0, 23, 59, 59);

    const attendance = await this.prisma.attendance.findMany({
      where: {
        userId: employeeId,
        date: { gte: periodStartAdjusted, lte: periodEndAdjusted }
      }
    });

    // تحديد ما إذا كان الكشف للشهر الحالي (لم ينتهِ بعد)
    const now = new Date();
    const isCurrentMonth = now.getMonth() + 1 === parseInt(month) && now.getFullYear() === parseInt(year);

    // حساب أيام العمل الفعلية في الشهر (لتقسيم الراتب عليها - المقام الثابت)
    const totalWorkingDaysInMonth = this.getWorkingDaysInMonth(year, month);

    // حساب أيام العمل المستحقة حتى الآن (لحساب الغياب)
    const workingDaysTarget = isCurrentMonth
      ? this.getWorkingDaysInMonth(year, month, now.getDate())
      : totalWorkingDaysInMonth;

    const presentDays = attendance.filter(a =>
      ['PRESENT', 'LATE', 'REMOTE'].includes(a.status) &&
      (!isCurrentMonth || new Date(a.date) <= now)
    ).length;

    // أيام الغياب
    const absentDays = Math.max(0, workingDaysTarget - presentDays);

    // حساب ساعات العمل الإضافي
    const totalOvertimeHours = attendance.reduce((sum, a) =>
      sum + (parseFloat(a.overtimeHours) || 0), 0
    );

    // حساب دقائق التأخير والخروج المبكر
    const totalLateMinutes = attendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
    const totalEarlyMinutes = attendance.reduce((sum, a) => sum + (a.earlyLeaveMinutes || 0), 0);

    // الراتب الأساسي
    const fullMonthBaseSalary = parseFloat(employee.baseSalary) || 0;
    const dailyRate = fullMonthBaseSalary / totalWorkingDaysInMonth;
    const hourlyRate = dailyRate / 8;

    // البدلات
    const allowances = data.allowances || {};
    const fullMonthAllowances = Object.values(allowances).reduce((sum, val) =>
      sum + (parseFloat(val) || 0), 0
    );
    
    // حساب الراتب والبدلات المستحقة بناءً على الأيام التي مرت (للشهر الحالي فقط)
    let baseSalary = fullMonthBaseSalary;
    let totalAllowances = fullMonthAllowances;
    
    if (isCurrentMonth) {
      const daysPassedWorking = this.getWorkingDaysInMonth(year, month, now.getDate());
      const earnedRatio = daysPassedWorking / totalWorkingDaysInMonth;
      baseSalary = fullMonthBaseSalary * earnedRatio;
      totalAllowances = fullMonthAllowances * earnedRatio;
      
      console.log('📊 [PAYROLL-CALC] Current month - calculating earned salary:', {
        totalWorkingDays: totalWorkingDaysInMonth,
        daysPassedWorking,
        earnedRatio: earnedRatio.toFixed(4),
        fullMonthBaseSalary,
        earnedBaseSalary: baseSalary.toFixed(2)
      });
    }

    // ---------------------------------------------------------
    // 💸 DEDUCTIONS INTEGRATION (الخصومات) - Daily Aware Logic
    // ---------------------------------------------------------
    
    // التحقق من تفعيل الخصم التلقائي للموظف
    const isAutoDeductionEnabled = employee.enableAutoDeduction !== false;
    console.log('🔍 [PAYROLL-DEDUCTION] Auto deduction check:', {
      employeeId,
      enableAutoDeduction: employee.enableAutoDeduction,
      isAutoDeductionEnabled
    });
    
    const dailyPenaltyMap = new Map(); // Date string -> { total: number, details: string[] }
    const deductions = {};
    let attendanceDeduction = 0;
    let latePenalty = 0;
    let manualDeductionAmount = 0;

    const maxDailyDeductionDays = parseFloat(settings?.maxDailyDeductionDays) || 0;
    const dailyCapLimit = maxDailyDeductionDays > 0 ? (dailyRate * maxDailyDeductionDays) : Infinity;

    const addDailyPenalty = (date, amount, reason) => {
      const dateStr = this.toLocalDateKey(date);
      if (!dailyPenaltyMap.has(dateStr)) {
        dailyPenaltyMap.set(dateStr, { total: 0, details: [] });
      }
      const dayData = dailyPenaltyMap.get(dateStr);
      dayData.total += amount;
      dayData.details.push(reason);
    };

    // 1. Manual Deductions (Approved)
    const manualDeductions = await this.prisma.manualDeduction.findMany({
      where: {
        employeeId,
        companyId,
        effectiveMonth: parseInt(month),
        effectiveYear: parseInt(year),
        status: { in: ['APPROVED', 'APPLIED'] }
      }
    });

    manualDeductions.forEach(d => {
      addDailyPenalty(d.date, parseFloat(d.amount), `يدوي: ${d.reason}`);
    });

    // 2. Absence Penalty (Find specific dates)
    // للشهر الحالي: نحسب خصم الغياب فقط على الأيام اللي عدّت ومافيهاش بصمة
    // للشهور السابقة: نحسب خصم الغياب على كل أيام الشهر
    const workingDates = this.getWorkingDaysDates(year, month, isCurrentMonth ? now.getDate() : null);
    const attendedDates = new Set(
      attendance
        .filter(a => ['PRESENT', 'LATE', 'REMOTE'].includes(a.status))
        .map(a => this.toLocalDateKey(a.date))
    );

    const absenceMultiplier = parseFloat(settings?.absencePenaltyRate) || 1.0;
    
    // للشهر الحالي: لا نحسب خصم غياب - فقط نحسب الراتب المستحق للأيام اللي عدّت
    // للشهور السابقة: نحسب خصم الغياب عادي
    if (!isCurrentMonth) {
      workingDates.forEach(dateStr => {
        if (!attendedDates.has(dateStr)) {
          addDailyPenalty(dateStr, dailyRate * absenceMultiplier, 'غياب');
        }
      });
    }

    // 3. Late Penalty (Tiered / Escalation) - فقط إذا كان الخصم التلقائي مفعل
    if (isAutoDeductionEnabled) {
      const lateOccurrences = attendance.filter(a => (a.lateMinutes > 0 || a.status === 'LATE')).sort((a, b) => new Date(a.date) - new Date(b.date));
      const delayPenaltyTiers = settings?.delayPenaltyTiers ? JSON.parse(settings.delayPenaltyTiers) : [];
      const lateWarningLevels = settings?.lateWarningLevels ? JSON.parse(settings.lateWarningLevels) : [];
      const monthlyLateLimit = parseInt(settings?.monthlyLateLimit) || 3;

      console.log('🔍 [PAYROLL-DEDUCTION] Processing late penalties:', {
        lateOccurrencesCount: lateOccurrences.length,
        delayPenaltyTiersCount: delayPenaltyTiers.length,
        lateWarningLevelsCount: lateWarningLevels.length,
        monthlyLateLimit
      });

      let lateDescription = [];

      if (delayPenaltyTiers && delayPenaltyTiers.length > 0) {
        lateOccurrences.forEach(occ => {
          const mins = occ.lateMinutes || 0;
          const applicableTier = [...delayPenaltyTiers].sort((a, b) => b.minMinutes - a.minMinutes).find(t => mins >= t.minMinutes);
          if (applicableTier) {
            const amount = dailyRate * (parseFloat(applicableTier.deductionDays) || 0);
            console.log('🔍 [PAYROLL-DEDUCTION] Applying tier penalty:', {
              date: occ.date,
              minutes: mins,
              tier: applicableTier,
              amount
            });
            addDailyPenalty(occ.date, amount, `تأخير ${mins}د`);
          }
        });
      } else {
        lateOccurrences.forEach((occ, index) => {
          const rank = index + 1;
          if (rank > monthlyLateLimit) {
            const occurrenceSeq = rank - monthlyLateLimit;
            const level = lateWarningLevels.find(l => l.count === occurrenceSeq) || (lateWarningLevels.length > 0 ? lateWarningLevels[lateWarningLevels.length - 1] : null);
            if (level) {
              const amount = dailyRate * (parseFloat(level.deductionFactor) || 0);
              console.log('🔍 [PAYROLL-DEDUCTION] Applying escalation penalty:', {
                date: occ.date,
                rank,
                level,
                amount
              });
              addDailyPenalty(occ.date, amount, `تأخير رقم ${rank}`);
            }
          }
        });
      }
    } else {
      console.log('🔍 [PAYROLL-DEDUCTION] Auto deduction disabled - skipping late penalties');
    }

    // Early Leave
    if (totalEarlyMinutes > 60) {
      const earlyPenaltyHours = Math.floor(totalEarlyMinutes / 60);
      const amount = hourlyRate * earlyPenaltyHours;
      const lastCheckOut = attendance.filter(a => a.check_out).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (lastCheckOut) {
        addDailyPenalty(lastCheckOut.date, amount, `خروج مبكر ${earlyPenaltyHours}س`);
      }
    }

    // 🛡️ APPLY DAILY CAP AND SUMMARIZE
    let totalCappedAttendancePenalty = 0;
    let totalCappedManualPenalty = 0;
    let capAuditTrail = [];
    let deductionBreakdown = [];

    dailyPenaltyMap.forEach((dayData, dateStr) => {
      let dailyTotal = dayData.total;

      if (dailyTotal > dailyCapLimit) {
        capAuditTrail.push(`${dateStr}: تم خفض من ${dailyTotal.toFixed(2)} إلى ${dailyCapLimit.toFixed(2)} (سقف)`);
        dailyTotal = dailyCapLimit;
      }

      deductionBreakdown.push(`${dateStr}: ${dailyTotal.toFixed(2)} (${dayData.details.join(', ')})`);

      if (dayData.details.some(d => d.includes('يدوي'))) {
        totalCappedManualPenalty += dailyTotal;
      } else {
        totalCappedAttendancePenalty += dailyTotal;
      }
    });

    // تصنيف الخصومات حسب النوع
    if (totalCappedManualPenalty > 0) {
      deductions['خصم يدوي'] = totalCappedManualPenalty;
      deductions.manualDetails = manualDeductions.map(d => `${d.reason}(${d.amount})`).join(' | ');
    }

    attendanceDeduction = totalCappedAttendancePenalty;
    if (attendanceDeduction > 0) {
      deductions['غياب وتأخير'] = attendanceDeduction;
    }
    deductions.details = deductionBreakdown.join(' | ');

    if (capAuditTrail.length > 0) {
      deductions.capNotes = capAuditTrail.join(' | ');
    }

    // 4. Advances Repayment (خصم السلف)
    const activeAdvances = await this.prisma.advanceRequest.findMany({
      where: {
        userId: employeeId,
        status: 'APPROVED',
        isPaidOff: false,
        remainingBalance: { gt: 0 }
      }
    });

    let totalAdvanceDeduction = 0;
    const advanceDetails = [];

    for (const advance of activeAdvances) {
      let deduction = 0;
      if (advance.repaymentType === 'INSTALLMENTS') {
        deduction = parseFloat(advance.installmentAmount) || 0;
      } else {
        deduction = parseFloat(advance.remainingBalance);
      }

      if (deduction > parseFloat(advance.remainingBalance)) {
        deduction = parseFloat(advance.remainingBalance);
      }

      // للشهر الحالي: نحسب السُلفة بنفس نسبة الأيام التي مرت
      if (isCurrentMonth && baseSalary !== fullMonthBaseSalary) {
        const earnedRatio = baseSalary / fullMonthBaseSalary;
        deduction = deduction * earnedRatio;
      }

      if (deduction > 0) {
        totalAdvanceDeduction += deduction;
        advanceDetails.push({
          advanceId: advance.id,
          amount: deduction
        });
      }
    }

    if (totalAdvanceDeduction > 0) {
      deductions['سلف'] = totalAdvanceDeduction;
      deductions.advanceDetails = advanceDetails;
    }

    // 5. Ad-hoc/Extra Deductions from manually created payroll form
    if (data.deductions) {
      Object.assign(deductions, data.deductions);
    }

    const totalDeductions = Object.values(deductions).reduce((sum, val) => {
      if (Array.isArray(val) || typeof val === 'string') return sum;
      return sum + (parseFloat(val) || 0);
    }, 0);

    // حساب الإضافي
    const overtimeRate = parseFloat(settings?.overtimeRate) || 1.5;
    const overtimeAmount = totalOvertimeHours * hourlyRate * overtimeRate;

    // Fetch approved rewards for this period
    const approvedRewards = await rewardPayrollIntegrationService.getApprovedRewardsForPayroll(
      companyId,
      employeeId,
      month,
      year
    );

    const rewardTotal = rewardPayrollIntegrationService.calculateTotalRewards(approvedRewards);

    // المكافآت (تدمج المكافآت اليدوية مع النظامية)
    const bonuses = (parseFloat(data.bonuses) || 0) + rewardTotal;

    // الإجماليات
    // الراتب الأساسي يظل ثابت (لا يتغير)
    // الراتب الإجمالي = الراتب الأساسي + البدلات + الإضافي + المكافآت
    const grossSalary = baseSalary + totalAllowances + overtimeAmount + bonuses;
    
    // التأمينات - فقط إذا كانت مفعلة في الإعدادات
    // يتم حسابها على الراتب الأساسي المستحق
    const socialInsuranceRate = parseFloat(settings?.socialInsuranceRate) || 0;
    const socialInsurance = socialInsuranceRate > 0 ? (baseSalary * socialInsuranceRate) / 100 : 0;

    // الضرائب - فقط إذا كانت مفعلة في الإعدادات
    // Handle potential missing taxRate field safely
    let taxRate = 0;
    try {
      taxRate = parseFloat(settings?.taxRate) || 0;
    } catch (error) {
      console.warn('⚠️ [PAYROLL] taxRate field missing in HR settings, using default 0');
      taxRate = 0;
    }
    const taxAmount = taxRate > 0 ? this.calculateTax(baseSalary + totalAllowances, settings?.taxBrackets) : 0;
    
    // صافي الراتب = الراتب الإجمالي - الخصومات - التأمينات - الضرائب
    // صافي الراتب لا يمكن أن يكون سالباً (الحد الأدنى = 0)
    const calculatedNetSalary = grossSalary - totalDeductions - socialInsurance - taxAmount;
    const netSalary = Math.max(0, calculatedNetSalary);

    return {
      employee,
      periodStart,
      periodEnd,
      baseSalary,
      totalWorkingDaysInMonth,
      presentDays,
      absentDays,
      allowances,
      totalAllowances,
      deductions,
      totalDeductions,
      attendanceDeduction,
      latePenalty,
      totalOvertimeHours,
      overtimeRate,
      overtimeAmount,
      bonuses,
      socialInsurance,
      taxAmount,
      grossSalary,
      netSalary,
      approvedRewards
    };
  }


  getWorkingDaysInMonth(year, month, uptoDay = null) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const limit = uptoDay ? Math.min(uptoDay, daysInMonth) : daysInMonth;
    let workingDays = 0;

    for (let day = 1; day <= limit; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      // استبعاد الجمعة والسبت
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  }

  toLocalDateKey(date) {
    if (!date) return date;

    if (typeof date === 'string') {
      return date.split('T')[0];
    }

    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * جلب تواريخ أيام العمل المتوقعة في الشهر
   */
  getWorkingDaysDates(year, month, uptoDay = null) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const limit = uptoDay ? Math.min(uptoDay, daysInMonth) : daysInMonth;
    let dates = [];

    for (let day = 1; day <= limit; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      // استبعاد الجمعة والسبت
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        dates.push(this.toLocalDateKey(date));
      }
    }

    return dates;
  }

  calculateTax(income, taxBracketsJson) {
    // حساب ضريبي مبسط - يمكن تطويره حسب قوانين الدولة
    try {
      const brackets = taxBracketsJson ? JSON.parse(taxBracketsJson) : [
        { min: 0, max: 15000, rate: 0 },
        { min: 15000, max: 30000, rate: 2.5 },
        { min: 30000, max: 45000, rate: 10 },
        { min: 45000, max: 60000, rate: 15 },
        { min: 60000, max: 200000, rate: 20 },
        { min: 200000, max: 400000, rate: 22.5 },
        { min: 400000, max: Infinity, rate: 25 }
      ];

      // تحويل الراتب الشهري إلى سنوي
      const annualIncome = income * 12;
      let tax = 0;

      for (const bracket of brackets) {
        if (annualIncome > bracket.min) {
          const taxableInBracket = Math.min(annualIncome, bracket.max) - bracket.min;
          tax += (taxableInBracket * bracket.rate) / 100;
        }
      }

      return tax / 12; // تحويل إلى ضريبة شهرية
    } catch (error) {
      console.error('❌ Error calculating tax:', error);
      return 0;
    }
  }

  /**
   * جلب توقع الراتب للشهر الحالي
   */
  async getPayrollProjection(companyId, employeeId) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // نستخدم الدالة الموحدة للحساب
    const payrollData = await this.calculatePayrollData(companyId, employeeId, month, year);

    // حساب الأيام التي مرت من الشهر
    const totalWorkingDays = payrollData.totalWorkingDaysInMonth;
    const daysPassedWorking = this.getWorkingDaysInMonth(year, month, now.getDate());
    
    // حساب الراتب المستحق فقط للأيام التي مرت
    // نسبة الأيام التي مرت من إجمالي أيام الشهر
    const earnedRatio = daysPassedWorking / totalWorkingDays;
    
    // حساب المكونات المستحقة بناءً على الأيام التي مرت
    const earnedBaseSalary = payrollData.baseSalary * earnedRatio;
    const earnedAllowances = payrollData.totalAllowances * earnedRatio;
    
    // الإضافي والمكافآت تظل كما هي (لأنها فعلية)
    const earnedOvertimeAmount = payrollData.overtimeAmount;
    const earnedBonuses = payrollData.bonuses;
    
    // الإجمالي المستحق
    const earnedGrossSalary = earnedBaseSalary + earnedAllowances + earnedOvertimeAmount + earnedBonuses;
    
    // التأمينات والضرائب تحسب على الراتب المستحق
    const earnedSocialInsurance = payrollData.socialInsurance * earnedRatio;
    const earnedTaxAmount = payrollData.taxAmount * earnedRatio;
    
    // الخصومات تظل كما هي (لأنها فعلية)
    const earnedDeductions = payrollData.totalDeductions;
    
    // صافي الراتب المستحق
    const earnedNetSalary = earnedGrossSalary - earnedDeductions - earnedSocialInsurance - earnedTaxAmount;

    console.log('📊 [PAYROLL-PROJECTION] Calculation:', {
      totalWorkingDays,
      daysPassedWorking,
      earnedRatio: earnedRatio.toFixed(2),
      baseSalary: payrollData.baseSalary,
      earnedBaseSalary: earnedBaseSalary.toFixed(2),
      earnedNetSalary: earnedNetSalary.toFixed(2)
    });

    // نعيد البيانات بتنسيق يشبه كشف الراتب العادي
    return {
      id: 'projection',
      month,
      year,
      companyId,
      employeeId,
      periodStart: payrollData.periodStart,
      periodEnd: payrollData.periodEnd,

      baseSalary: earnedBaseSalary,
      workingDays: totalWorkingDays,
      actualWorkDays: payrollData.presentDays,

      allowances: payrollData.allowances,
      totalAllowances: earnedAllowances,

      deductions: payrollData.deductions,
      totalDeductions: earnedDeductions,

      attendanceDeduction: payrollData.attendanceDeduction,
      absentDays: payrollData.absentDays,

      latePenalty: payrollData.latePenalty,

      overtimeHours: payrollData.totalOvertimeHours,
      overtimeRate: payrollData.overtimeRate,
      overtimeAmount: earnedOvertimeAmount,

      bonuses: earnedBonuses,

      socialInsurance: earnedSocialInsurance,
      taxAmount: earnedTaxAmount,

      grossSalary: earnedGrossSalary,
      netSalary: Math.max(0, earnedNetSalary),

      status: 'PROJECTION',
      isProjection: true,

      daysPassedWorking,
      earnedRatio,

      employee: payrollData.employee,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * جلب آخر كشف راتب لموظف محدد
   */
  async getLastPayrollForEmployee(companyId, employeeId) {
    try {
      const payroll = await this.prisma.payroll.findFirst({
        where: {
          companyId,
          userId: employeeId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return payroll;
    } catch (error) {
      console.error('❌ Error getting last payroll for employee:', error);
      throw error;
    }
  }
}

module.exports = new PayrollService();
