/**
 * 📝 HR Audit Log Service
 * خدمة تسجيل العمليات الحساسة في نظام الموارد البشرية
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class AuditLogService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * تسجيل عملية في سجل المراجعة
   */
  async log(data) {
    try {
      const {
        companyId,
        userId,
        action,
        entityType,
        entityId,
        oldValues = null,
        newValues = null,
        ipAddress = null,
        userAgent = null,
        metadata = null
      } = data;

      const auditLog = await this.prisma.activityLog.create({
        data: {
          companyId,
          userId,
          action,
          entityType,
          entityId,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
          ipAddress,
          userAgent,
          metadata: metadata ? JSON.stringify(metadata) : null,
          timestamp: new Date()
        }
      });

      return auditLog;
    } catch (error) {
      console.error('❌ Error creating audit log:', error);
      // لا نرمي خطأ هنا لأننا لا نريد أن يفشل الطلب الأصلي بسبب فشل التسجيل
    }
  }

  /**
   * تسجيل إنشاء موظف
   */
  async logEmployeeCreated(companyId, userId, employee, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: employee.id,
      newValues: {
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        baseSalary: employee.baseSalary
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل تحديث موظف
   */
  async logEmployeeUpdated(companyId, userId, employeeId, oldValues, newValues, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'Employee',
      entityId: employeeId,
      oldValues,
      newValues,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل حذف موظف
   */
  async logEmployeeDeleted(companyId, userId, employee, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'EMPLOYEE_DELETED',
      entityType: 'Employee',
      entityId: employee.id,
      oldValues: {
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل تغيير الراتب
   */
  async logSalaryChanged(companyId, userId, employeeId, oldSalary, newSalary, reason, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'SALARY_CHANGED',
      entityType: 'Employee',
      entityId: employeeId,
      oldValues: { baseSalary: oldSalary },
      newValues: { baseSalary: newSalary },
      metadata: { reason, changeAmount: newSalary - oldSalary },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل إنشاء كشف راتب
   */
  async logPayrollCreated(companyId, userId, payroll, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'PAYROLL_CREATED',
      entityType: 'Payroll',
      entityId: payroll.id,
      newValues: {
        employeeId: payroll.employeeId,
        month: payroll.month,
        year: payroll.year,
        grossSalary: payroll.grossSalary,
        netSalary: payroll.netSalary
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل تحديث كشف راتب
   */
  async logPayrollUpdated(companyId, userId, payrollId, oldValues, newValues, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'PAYROLL_UPDATED',
      entityType: 'Payroll',
      entityId: payrollId,
      oldValues,
      newValues,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل صرف راتب
   */
  async logPayrollPaid(companyId, userId, payroll, paymentData, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'PAYROLL_PAID',
      entityType: 'Payroll',
      entityId: payroll.id,
      newValues: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: paymentData.method,
        paymentReference: paymentData.reference,
        amount: payroll.netSalary
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل الموافقة على إجازة
   */
  async logLeaveApproved(companyId, userId, leaveRequest, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'LEAVE_APPROVED',
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      newValues: {
        employeeId: leaveRequest.employeeId,
        type: leaveRequest.type,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
        status: 'APPROVED'
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل رفض إجازة
   */
  async logLeaveRejected(companyId, userId, leaveRequest, reason, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'LEAVE_REJECTED',
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      newValues: {
        employeeId: leaveRequest.employeeId,
        type: leaveRequest.type,
        status: 'REJECTED',
        rejectionReason: reason
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل تعديل الحضور اليدوي
   */
  async logAttendanceManualEdit(companyId, userId, attendanceId, oldValues, newValues, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'ATTENDANCE_MANUAL_EDIT',
      entityType: 'Attendance',
      entityId: attendanceId,
      oldValues,
      newValues,
      metadata: { isManualEdit: true },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * تسجيل تغيير إعدادات HR
   */
  async logSettingsChanged(companyId, userId, oldSettings, newSettings, req = null) {
    return this.log({
      companyId,
      userId,
      action: 'HR_SETTINGS_CHANGED',
      entityType: 'HRSettings',
      entityId: companyId,
      oldValues: oldSettings,
      newValues: newSettings,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * جلب سجلات المراجعة
   */
  async getAuditLogs(companyId, options = {}) {
    try {
      const {
        action,
        entityType,
        entityId,
        userId,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = options;

      const where = { companyId };

      if (action) where.action = action;
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;
      if (userId) where.userId = userId;

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      const [logs, total] = await Promise.all([
        this.prisma.activityLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { timestamp: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.activityLog.count({ where })
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * جلب سجلات مراجعة لكيان معين
   */
  async getEntityAuditTrail(companyId, entityType, entityId) {
    try {
      const logs = await this.prisma.activityLog.findMany({
        where: {
          companyId,
          entityType,
          entityId
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      return logs;
    } catch (error) {
      console.error('❌ Error getting entity audit trail:', error);
      throw error;
    }
  }
}

module.exports = new AuditLogService();
