/**
 * 📝 Resignation Service
 * خدمة إدارة الاستقالات
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const auditService = require('./auditService');

class ResignationService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * Helper function to map user object to employee format for frontend compatibility
   */
  mapUserToEmployee(user) {
    if (!user) return null;
    const employee = { ...user };
    // Map positionRelation to position
    if (user.positionRelation) {
      employee.position = user.positionRelation;
      delete employee.positionRelation;
    }
    // Map departmentRelation to department
    if (user.departmentRelation) {
      employee.department = user.departmentRelation;
      delete employee.departmentRelation;
    }
    return employee;
  }

  async createResignation(companyId, employeeId, data) {
    try {
      console.log('🔍 [Debug Service] createResignation params:', { companyId, employeeId });

      // 0. Validate employeeId
      if (!employeeId || employeeId.trim() === '') {
        throw new Error('معرف الموظف مطلوب');
      }

      // 0.1. Verify employee exists and belongs to the same company
      const employee = await this.prisma.user.findFirst({
        where: {
          id: employeeId,
          companyId: companyId
        }
      });

      console.log('🔍 [Debug] Employee lookup result:', {
        employeeId,
        companyId,
        found: !!employee,
        employeeCompanyId: employee?.companyId
      });

      if (!employee) {
        // Additional debugging: check if employee exists at all
        const employeeAnyCompany = await this.prisma.user.findUnique({
          where: { id: employeeId },
          select: { id: true, companyId: true, firstName: true, lastName: true }
        });

        console.log('🔍 [Debug] Employee in any company:', employeeAnyCompany);

        if (employeeAnyCompany) {
          throw new Error(`الموظف موجود لكن ينتمي لشركة أخرى (${employeeAnyCompany.companyId} بدلاً من ${companyId})`);
        } else {
          throw new Error('الموظف غير موجود في النظام');
        }
      }

      // 1. Fetch HR Settings for Notice Period & Clearance
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });
      const noticePeriodDays = settings?.noticePeriodDays || 30;
      const requireClearance = settings?.requireClearance ?? true;

      // 2. Calculate Expected Last Day
      const regDate = new Date(data.resignationDate);
      const expectedLastDay = new Date(regDate);
      expectedLastDay.setDate(regDate.getDate() + noticePeriodDays);

      // 3. Validation: Last working day should be >= Expected last day
      const proposedLastDay = new Date(data.lastWorkingDay);
      // Optional: Throw error or just save the expected date for comparison
      // if (proposedLastDay < expectedLastDay) { ... }

      const resignation = await this.prisma.resignation.create({
        data: {
          companyId,
          userId: employeeId, // Use userId instead of employeeId
          resignationDate: regDate,
          lastWorkingDay: proposedLastDay,
          expectedLastDay: expectedLastDay,
          noticePeriodDays: noticePeriodDays,
          reason: data.reason,
          status: data.status || 'PENDING',
          clearanceCompleted: !requireClearance // If not required, mark completed
        }
      });

      // Fetch user data separately
      const user = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          positionRelation: { select: { title: true } },
          departmentRelation: { select: { name: true } }
        }
      });

      // 4. Create Clearance Checklist if required
      if (requireClearance) {
        let items = [];
        try {
          items = settings?.clearanceItems ? JSON.parse(settings.clearanceItems) : [];
        } catch (e) {
          items = [];
        }

        // Default items if none configured
        if (items.length === 0) {
          items = [
            { name: 'Laptop Return', description: 'Return company laptop' },
            { name: 'ID Card', description: 'Return access card' },
            { name: 'Email Access', description: 'Revoke email access' }
          ];
        }

        if (items.length > 0) {
          await this.prisma.clearanceChecklist.createMany({
            data: items.map(item => ({
              resignationId: resignation.id,
              itemName: item.name || item,
              description: item.description || ''
            }))
          });
        }
      }

      await auditService.logAction(
        companyId,
        data.submittedBy || 'SYSTEM', // Default to SYSTEM if not provided
        'CREATE',
        'RESIGNATION',
        resignation.id,
        {
          employeeId,
          resignationDate: regDate,
          noticePeriod: noticePeriodDays
        }
      );

      // Map user to employee for frontend compatibility
      return {
        ...resignation,
        user,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error creating resignation:', error);
      throw error;
    }
  }

  async getResignations(companyId, options = {}) {
    try {
      const { status, limit = 50 } = options;
      const where = { companyId };
      if (status && status !== 'all') where.status = status;

      // Filter out orphaned records by ensuring userId exists in User table
      const userWhere = { companyId };
      const validUserIds = await this.prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      // Only include resignations with valid user IDs
      if (validUserIdList.length > 0) {
        where.userId = { in: validUserIdList };
      } else {
        // No valid users found, return empty result
        return [];
      }

      const resignations = await this.prisma.resignation.findMany({
        where,
        orderBy: { resignationDate: 'desc' },
        take: parseInt(limit)
      });

      // Fetch all users for these resignations
      const userIds = [...new Set(resignations.map(r => r.userId).filter(Boolean))];
      const users = userIds.length > 0 ? await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          positionRelation: { select: { title: true } },
          departmentRelation: { select: { name: true } }
        }
      }) : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      // Map user to employee for frontend compatibility
      return resignations.map(resignation => ({
        ...resignation,
        user: userMap[resignation.userId],
        employee: this.mapUserToEmployee(userMap[resignation.userId])
      }));
    } catch (error) {
      console.error('❌ Error getting resignations:', error);
      throw error;
    }
  }

  async getResignationById(companyId, resignationId) {
    try {
      // First check if resignation exists and has valid userId
      const resignationExists = await this.prisma.resignation.findFirst({
        where: { id: resignationId, companyId },
        select: { id: true, userId: true }
      });

      if (!resignationExists) {
        throw new Error('الاستقالة غير موجودة');
      }

      // Check if userId exists in users table
      const validUserIds = await this.prisma.user.findMany({
        where: { companyId },
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      if (!validUserIdList.includes(resignationExists.userId)) {
        throw new Error('الاستقالة تحتوي على مراجع غير صالحة');
      }

      const resignation = await this.prisma.resignation.findFirst({
        where: { id: resignationId, companyId }
      });

      if (!resignation) {
        throw new Error('الاستقالة غير موجودة');
      }

      // Fetch user data separately
      const user = await this.prisma.user.findUnique({
        where: { id: resignation.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          positionRelation: { select: { title: true } },
          departmentRelation: { select: { name: true } }
        }
      });

      // Map user to employee for frontend compatibility
      return {
        ...resignation,
        user,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error getting resignation:', error);
      throw error;
    }
  }

  async updateResignation(companyId, resignationId, data) {
    try {
      const existing = await this.prisma.resignation.findFirst({
        where: { id: resignationId, companyId },
        select: { id: true, userId: true, resignationDate: true, lastWorkingDay: true }
      });
      if (!existing) throw new Error('الاستقالة غير موجودة');

      // 🛡️ Security Check: Prevent Self-Approval
      if (data.status === 'APPROVED' && existing.userId === data.approvedBy) {
        throw new Error('لا يمكنك الموافقة على طلب الاستقالة الخاص بك (مطلوب مدير آخر)');
      }

      const updateData = {};
      if (data.status) {
        updateData.status = data.status;
        if (data.status === 'APPROVED') {
          updateData.approvedBy = data.approvedBy;
          updateData.approvedAt = new Date();
        }
      }
      if (data.exitInterview !== undefined) updateData.exitInterview = data.exitInterview;
      if (data.reason !== undefined) updateData.reason = data.reason;

      const resignation = await this.prisma.resignation.update({
        where: { id: resignationId },
        data: updateData
      });

      // Fetch user data separately
      const user = await this.prisma.user.findUnique({
        where: { id: resignation.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          positionRelation: { select: { title: true } },
          departmentRelation: { select: { name: true } }
        }
      });

      // 📝 Audit Log: تسجيل تحديث حالة الاستقالة
      if (data.status) {
        await auditService.logAction(
          companyId,
          data.approvedBy || 'SYSTEM',
          data.status === 'APPROVED' ? 'APPROVE' : data.status === 'REJECTED' ? 'REJECT' : 'UPDATE',
          'RESIGNATION',
          resignationId,
          {
            newStatus: data.status,
            employeeId: existing.userId, // Use userId instead of employeeId
            resignationDate: existing.resignationDate,
            lastWorkingDay: existing.lastWorkingDay
          }
        );
      }

      // Map user to employee for frontend compatibility
      return {
        ...resignation,
        user,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error updating resignation:', error);
      throw error;
    }
  }

  async getResignationStats(companyId, options = {}) {
    try {
      const { year } = options;
      const where = { companyId };
      if (year) {
        where.resignationDate = {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        };
      }

      const [total, byStatus] = await Promise.all([
        this.prisma.resignation.count({ where }),
        this.prisma.resignation.groupBy({
          by: ['status'],
          where,
          _count: true
        })
      ]);

      return { total, byStatus };
    } catch (error) {
      console.error('❌ Error getting resignation stats:', error);
      throw error;
    }
  }
  // --- Clearance Methods ---

  async getClearanceChecklist(companyId, resignationId) {
    // Verify Company
    const res = await this.prisma.resignation.findFirst({ where: { id: resignationId, companyId } });
    if (!res) throw new Error('Resignation not found');

    return this.prisma.clearanceChecklist.findMany({
      where: { resignationId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async updateClearanceItem(companyId, itemId, data, userId) {
    const item = await this.prisma.clearanceChecklist.findUnique({
      where: { id: itemId },
      include: { resignation: true }
    });
    if (!item || item.resignation.companyId !== companyId) throw new Error('Item not found');

    const updated = await this.prisma.clearanceChecklist.update({
      where: { id: itemId },
      data: {
        isCompleted: data.isCompleted,
        completedBy: data.isCompleted ? userId : null,
        completedAt: data.isCompleted ? new Date() : null,
        notes: data.notes
      }
    });

    // Check if all items completed
    await this.checkClearanceCompletion(item.resignationId);

    return updated;
  }

  async checkClearanceCompletion(resignationId) {
    const items = await this.prisma.clearanceChecklist.findMany({
      where: { resignationId }
    });

    const allCompleted = items.every(i => i.isCompleted);

    if (allCompleted) {
      await this.prisma.resignation.update({
        where: { id: resignationId },
        data: { clearanceCompleted: true }
      });
    }
    return allCompleted;
  }

  async calculateFinalSettlement(companyId, resignationId) {
    try {
      const resignation = await this.prisma.resignation.findFirst({
        where: { id: resignationId, companyId }
      });

      if (!resignation) throw new Error('الاستقالة غير موجودة');

      const user = await this.prisma.user.findUnique({
        where: { id: resignation.userId },
        select: { id: true, firstName: true, lastName: true, email: true, baseSalary: true }
      });

      if (!user) throw new Error('بيانات الموظف غير موجودة');

      const baseSalary = parseFloat(user.baseSalary) || 0;
      const dailySalary = baseSalary / 30;

      // 1. Remaining salary (pro-rated for the final month)
      const lastDay = resignation.lastWorkingDay ? new Date(resignation.lastWorkingDay) : new Date();
      const daysWorkedInFinalMonth = lastDay.getDate();
      const remainingSalary = daysWorkedInFinalMonth * dailySalary;

      // 2. Unused leave balance compensation
      // Note: annualLeaveBalance might not be in User model, so we'll need to calculate it or get it from leave requests
      const unusedLeaves = 0; // TODO: Calculate from leave requests if needed
      const leaveCompensation = unusedLeaves * dailySalary;

      // 3. Outstanding advances debt
      const activeAdvances = await this.prisma.advanceRequest.findMany({
        where: {
          userId: user.id, // Use userId instead of employeeId
          isPaidOff: false,
          status: 'APPROVED'
        }
      });
      const advanceDebt = activeAdvances.reduce((sum, adv) => sum + parseFloat(adv.remainingBalance || 0), 0);

      // 4. Final Amount
      const finalSettlementAmount = remainingSalary + leaveCompensation - advanceDebt;

      return {
        remainingSalary: parseFloat(remainingSalary.toFixed(2)),
        leaveCompensation: parseFloat(leaveCompensation.toFixed(2)),
        advanceDebt: parseFloat(advanceDebt.toFixed(2)),
        finalSettlementAmount: parseFloat(finalSettlementAmount.toFixed(2)),
        details: {
          baseSalary,
          dailySalary: parseFloat(dailySalary.toFixed(2)),
          daysWorkedInFinalMonth,
          unusedLeaves
        }
      };
    } catch (error) {
      console.error('❌ Error calculating final settlement:', error);
      throw error;
    }
  }

  async approveFinalSettlement(companyId, resignationId, amount) {
    try {
      const resignation = await this.prisma.resignation.update({
        where: { id: resignationId },
        data: {
          finalSettlement: amount,
          status: 'SETTLED' // Optional: new status to indicate financial closure
        }
      });

      // Audit Log
      await auditService.logAction(
        companyId,
        'SYSTEM',
        'SETTLEMENT',
        'RESIGNATION',
        resignationId,
        { amount }
      );

      return resignation;
    } catch (error) {
      console.error('❌ Error approving settlement:', error);
      throw error;
    }
  }
}

module.exports = new ResignationService();

















































