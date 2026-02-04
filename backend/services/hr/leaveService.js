/**
 * 🏖️ Leave Service
 * خدمة إدارة الإجازات
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { validateLeaveData } = require('../../utils/hrValidation');
const auditService = require('./auditService');
const {
  NotFoundError,
  InsufficientLeaveBalanceError,
  LeaveOverlapError,
  LeaveError
} = require('../../utils/hrErrors');

class LeaveService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء طلب إجازة
   */
  async createLeaveRequest(companyId, employeeId, data) {
    try {
      // التحقق من صحة البيانات
      validateLeaveData(data);

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      // حساب عدد الأيام
      const totalDays = this.calculateWorkingDays(startDate, endDate, data.isHalfDay);

      // التحقق من وجود الموظف وأنه ينتمي للشركة
      console.log('🔍 [Debug Leave] Employee lookup params:', { employeeId, companyId });
      
      const employee = await this.prisma.user.findFirst({
        where: {
          id: employeeId,
          companyId: companyId
        }
      });

      console.log('🔍 [Debug Leave] Employee lookup result:', {
        employeeId,
        companyId,
        found: !!employee,
        employeeId: employee?.id,
        employeeCompanyId: employee?.companyId
      });

      if (!employee) {
        // Additional debugging: check if employee exists at all
        const employeeAnyCompany = await this.prisma.user.findUnique({
          where: { id: employeeId },
          select: { id: true, companyId: true, firstName: true, lastName: true }
        });
        
        console.log('🔍 [Debug Leave] Employee in any company:', employeeAnyCompany);
        
        if (employeeAnyCompany) {
          throw new NotFoundError(`الموظف موجود لكن ينتمي لشركة أخرى`, employeeId);
        } else {
          throw new NotFoundError('الموظف', employeeId);
        }
      }

      // التحقق من الرصيد حسب نوع الإجازة
      if (data.type === 'ANNUAL' && employee.annualLeaveBalance < totalDays) {
        throw new InsufficientLeaveBalanceError(
          'الإجازات السنوية',
          totalDays,
          employee.annualLeaveBalance
        );
      }

      if (data.type === 'SICK' && employee.sickLeaveBalance < totalDays) {
        throw new InsufficientLeaveBalanceError(
          'الإجازات المرضية',
          totalDays,
          employee.sickLeaveBalance
        );
      }

      // التحقق من عدم وجود تداخل مع إجازات أخرى
      const overlapping = await this.prisma.leaveRequest.findFirst({
        where: {
          userId: employeeId,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      });

      if (overlapping) {
        throw new LeaveOverlapError(overlapping);
      }

      console.log('🔍 [Debug Leave] Creating leave request with:', {
        companyId,
        userId: employeeId,
        employeeId: employee.id,
        employeeCompanyId: employee.companyId,
        type: data.type,
        startDate,
        endDate
      });

      // Double-check user exists directly in database before creating
      // This helps catch any database sync issues
      const userExists = await this.prisma.user.findUnique({
        where: { id: employeeId },
        select: { id: true }
      });

      if (!userExists) {
        console.error('❌ [Debug Leave] User not found in database before create:', employeeId);
        throw new NotFoundError('الموظف', employeeId);
      }

      const leaveRequest = await this.prisma.leaveRequest.create({
        data: {
          companyId,
          userId: employeeId,
          type: data.type,
          startDate,
          endDate,
          totalDays,
          isHalfDay: data.isHalfDay || false,
          halfDayPeriod: data.halfDayPeriod,
          reason: data.reason,
          attachments: data.attachments ? JSON.stringify(data.attachments) : null,
          substituteId: data.substituteId,
          status: 'PENDING'
        }
      });

      return leaveRequest;
    } catch (error) {
      console.error('❌ Error creating leave request:', error);
      
      // Handle foreign key constraint errors specifically
      if (error.code === 'P2003') {
        const constraintField = error.meta?.field_name || error.meta?.constraint?.[0];
        console.error('❌ Foreign key constraint violation:', {
          code: error.code,
          field: constraintField,
          constraint: error.meta?.constraint,
          employeeId: employeeId
        });
        
        if (constraintField === 'userId' || error.meta?.constraint?.includes('userId')) {
          console.error('❌ User ID foreign key constraint failed');
          console.error('❌ This usually means:');
          console.error('   1. The user does not exist in the database');
          console.error('   2. The foreign key constraint is misconfigured');
          console.error('   3. Database schema is out of sync');
          throw new NotFoundError('الموظف غير موجود في قاعدة البيانات أو هناك مشكلة في قاعدة البيانات', employeeId);
        }
      }
      
      throw error;
    }
  }

  /**
   * جلب طلبات الإجازات
   */
  async getLeaveRequests(companyId, options = {}) {
    try {
      const {
        employeeId,
        status,
        type,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = options;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const where = {};
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }

      if (status) where.status = status;
      if (type) where.type = type;

      if (startDate || endDate) {
        where.startDate = {};
        if (startDate) where.startDate.gte = new Date(startDate);
        if (endDate) where.startDate.lte = new Date(endDate);
      }

      // Filter out orphaned records by ensuring userId exists in User table
      // This prevents Prisma errors when including the user relation
      const userWhere = {};
      if (companyId) {
        userWhere.companyId = companyId;
      }
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
            requests: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0
            }
          };
        }
      } else {
        // Only include leave requests with valid user IDs
        if (validUserIdList.length > 0) {
          where.userId = { in: validUserIdList };
        } else {
          // No valid users found, return empty result
          return {
            requests: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0
            }
          };
        }
      }

      const [requests, total] = await Promise.all([
        this.prisma.leaveRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum
        }),
        this.prisma.leaveRequest.count({ where })
      ]);

      // Fetch user data separately since user relation is commented out in schema
      const userIds = [...new Set(requests.map(r => r.userId))];
      const approverIds = [...new Set(requests.map(r => r.approvedBy).filter(Boolean))];
      
      const [users, approvers] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            departmentRelation: {
              select: { name: true }
            }
          }
        }),
        approverIds.length > 0 ? this.prisma.user.findMany({
          where: { id: { in: approverIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }) : []
      ]);

      const usersMap = new Map(users.map(u => [u.id, u]));
      const approversMap = new Map(approvers.map(a => [a.id, a]));

      // Map user data to requests
      const mappedRequests = requests.map(request => {
        const user = usersMap.get(request.userId);
        const approver = request.approvedBy ? approversMap.get(request.approvedBy) : null;
        
        return {
          ...request,
          employee: user ? {
            ...user,
            department: user.departmentRelation
          } : null,
          approver: approver || null
        };
      });

      return {
        requests: mappedRequests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting leave requests:', error);
      throw error;
    }
  }

  /**
   * جلب آخر طلبات الإجازات للموظف
   */
  async getRecentLeavesForEmployee(companyId, employeeId, limit = 5) {
    try {
      const leaves = await this.prisma.leaveRequest.findMany({
        where: {
          companyId,
          userId: employeeId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return leaves;
    } catch (error) {
      console.error('❌ Error getting recent leaves for employee:', error);
      throw error;
    }
  }

  /**
   * جلب طلب إجازة بالـ ID
   */
  async getLeaveRequestById(companyId, requestId) {
    try {
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      return request;
    } catch (error) {
      console.error('❌ Error getting leave request:', error);
      throw error;
    }
  }

  /**
   * الموافقة على طلب إجازة
   */
  async approveLeaveRequest(companyId, requestId, approverEmployeeId, approverUserId = null) {
    try {
      console.log(`🔍 [LEAVE-APPROVE] Starting approval for request ${requestId} by employee ${approverEmployeeId}`);
      
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      if (!request) {
        throw new Error('طلب الإجازة غير موجود');
      }

      if (request.status !== 'PENDING') {
        throw new Error('لا يمكن الموافقة على هذا الطلب');
      }

      // 🛡️ Security Check: Prevent Self-Approval (unless user is COMPANY_ADMIN or SUPER_ADMIN)
      if (request.userId === approverEmployeeId) {
        console.log(`⚠️ [LEAVE-APPROVE] Self-approval detected. Request userId: ${request.userId}, Approver employeeId: ${approverEmployeeId}`);
        console.log(`🔍 [LEAVE-APPROVE] Checking approver role. approverUserId: ${approverUserId}`);
        
        // Check if approver is COMPANY_ADMIN or SUPER_ADMIN
        let isAdmin = false;
        if (approverUserId) {
          const approverUser = await this.prisma.user.findUnique({
            where: { id: approverUserId },
            select: { role: true, email: true }
          });
          
          console.log(`👤 [LEAVE-APPROVE] Approver user: ${approverUser?.email}, Role: ${approverUser?.role}`);
          
          isAdmin = approverUser?.role === 'COMPANY_ADMIN' || approverUser?.role === 'SUPER_ADMIN';
        } else {
          console.warn(`⚠️ [LEAVE-APPROVE] approverUserId is null/undefined - cannot check admin status`);
        }
        
        if (!isAdmin) {
          console.error(`❌ [LEAVE-APPROVE] Self-approval blocked - user is not COMPANY_ADMIN or SUPER_ADMIN`);
          throw new Error('لا يمكنك الموافقة على طلب الإجازة الخاص بك (مطلوب مدير آخر)');
        } else {
          console.log(`✅ [LEAVE-APPROVE] Admin user approving their own leave request - allowed`);
        }
      }

      console.log(`✅ [LEAVE-APPROVE] Request validated: ${request.type} from ${request.startDate} to ${request.endDate}`);

      // تحديث الطلب
      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedBy: approverEmployeeId,
          approvedAt: new Date()
        }
      });

      // Note: annualLeaveBalance and sickLeaveBalance are not in User model
      // Leave balance should be calculated from LeaveRequest records instead

      // إنشاء سجلات حضور للإجازة
      try {
        const dates = this.getDateRange(request.startDate, request.endDate);
        for (const date of dates) {
          // Ensure date is a Date object with only date part (no time)
          const dateOnly = new Date(date);
          dateOnly.setHours(0, 0, 0, 0);
          
          try {
            await this.prisma.attendance.upsert({
              where: {
                userId_date: {
                  userId: request.userId,
                  date: dateOnly
                }
              },
              create: {
                companyId,
                userId: request.userId,
                date: dateOnly,
                status: 'ON_LEAVE',
                notes: `إجازة ${this.getLeaveTypeName(request.type)}`
              },
              update: {
                status: 'ON_LEAVE',
                notes: `إجازة ${this.getLeaveTypeName(request.type)}`
              }
            });
          } catch (attendanceError) {
            console.error(`❌ Error creating attendance for date ${dateOnly.toISOString()}:`, attendanceError);
            // Continue with other dates even if one fails
          }
        }
      } catch (dateRangeError) {
        console.error('❌ Error getting date range:', dateRangeError);
        // Don't throw - attendance records are secondary to approval
      }

      // 📝 Audit Log: تسجيل الموافقة
      try {
        // Use provided userId or use approverEmployeeId directly (it's already a userId)
        let actorUserId = approverUserId || approverEmployeeId;
        
        if (actorUserId) {
          await auditService.logAction(
            companyId,
            actorUserId,
            'APPROVE',
            'LEAVE',
            requestId,
            {
              leaveType: request.type,
              totalDays: request.totalDays,
              startDate: request.startDate,
              endDate: request.endDate,
              employeeId: request.employeeId,
              approverEmployeeId: approverEmployeeId
            }
          );
        }
      } catch (auditError) {
        console.error('❌ Error creating audit log:', auditError);
        // Don't throw - audit log is secondary to approval
      }

      return updated;
    } catch (error) {
      console.error('❌ Error approving leave request:', error);
      throw error;
    }
  }

  /**
   * رفض طلب إجازة
   */
  async rejectLeaveRequest(companyId, requestId, approverId, reason) {
    try {
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId }
      });

      if (!request) {
        throw new Error('طلب الإجازة غير موجود');
      }

      if (request.status !== 'PENDING') {
        throw new Error('لا يمكن رفض هذا الطلب');
      }

      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          approvedBy: approverId,
          approvedAt: new Date(),
          rejectionReason: reason
        }
      });

      // 📝 Audit Log: تسجيل الرفض
      await auditService.logAction(
        companyId,
        approverId,
        'REJECT',
        'LEAVE',
        requestId,
        {
          leaveType: request.type,
          totalDays: request.totalDays,
          rejectionReason: reason,
          employeeId: request.employeeId
        }
      );

      return updated;
    } catch (error) {
      console.error('❌ Error rejecting leave request:', error);
      throw error;
    }
  }

  /**
   * إلغاء طلب إجازة
   */
  async cancelLeaveRequest(companyId, requestId, employeeId) {
    try {
      const request = await this.prisma.leaveRequest.findFirst({
        where: { id: requestId, companyId, employeeId }
      });

      if (!request) {
        throw new Error('طلب الإجازة غير موجود');
      }

      if (request.status === 'CANCELLED') {
        throw new Error('الطلب ملغي مسبقاً');
      }

      // إذا كان معتمداً، نرجع الرصيد
      if (request.status === 'APPROVED') {
        if (request.type === 'ANNUAL') {
          // Note: annualLeaveBalance and sickLeaveBalance are not in User model
          // Leave balance should be calculated from LeaveRequest records instead
        } else if (request.type === 'SICK') {
          // Note: annualLeaveBalance and sickLeaveBalance are not in User model
          // Leave balance should be calculated from LeaveRequest records instead
        }

        // حذف سجلات الحضور
        await this.prisma.attendance.deleteMany({
          where: {
            userId: employeeId,
            date: {
              gte: request.startDate,
              lte: request.endDate
            },
            status: 'ON_LEAVE'
          }
        });
      }

      const updated = await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error cancelling leave request:', error);
      throw error;
    }
  }

  /**
   * جلب رصيد الإجازات
   */
  async getLeaveBalance(companyId, employeeId) {
    try {
      // Calculate leave balance from LeaveRequest records
      const employee = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });
      
      // Calculate balances from actual leave requests
      const approvedLeaves = await this.prisma.leaveRequest.findMany({
        where: {
          userId: employeeId,
          companyId,
          status: 'APPROVED'
        },
        select: {
          type: true,
          totalDays: true
        }
      });
      
      const annualLeaveBalance = 21 - approvedLeaves
        .filter(l => l.type === 'ANNUAL')
        .reduce((sum, l) => sum + l.totalDays, 0);
      
      const sickLeaveBalance = 7 - approvedLeaves
        .filter(l => l.type === 'SICK')
        .reduce((sum, l) => sum + l.totalDays, 0);

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      // حساب الإجازات المستخدمة هذا العام
      const year = new Date().getFullYear();
      const usedLeaves = await this.prisma.leaveRequest.groupBy({
        by: ['type'],
        where: {
          userId: employeeId,
          status: 'APPROVED',
          startDate: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31)
          }
        },
        _sum: { totalDays: true }
      });

      const usedAnnual = usedLeaves.find(l => l.type === 'ANNUAL')?._sum.totalDays || 0;
      const usedSick = usedLeaves.find(l => l.type === 'SICK')?._sum.totalDays || 0;

      return {
        annual: {
          balance: employee.annualLeaveBalance,
          used: usedAnnual,
          total: employee.annualLeaveBalance + usedAnnual
        },
        sick: {
          balance: employee.sickLeaveBalance,
          used: usedSick,
          total: employee.sickLeaveBalance + usedSick
        }
      };
    } catch (error) {
      console.error('❌ Error getting leave balance:', error);
      throw error;
    }
  }

  /**
   * تقويم الإجازات
   */
  async getLeaveCalendar(companyId, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const leaves = await this.prisma.leaveRequest.findMany({
        where: {
          companyId,
          status: 'APPROVED',
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      });

      return leaves;
    } catch (error) {
      console.error('❌ Error getting leave calendar:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الإجازات
   */
  async getLeaveStats(companyId, year) {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      const [
        byType,
        byStatus,
        byMonth,
        pendingCount
      ] = await Promise.all([
        this.prisma.leaveRequest.groupBy({
          by: ['type'],
          where: {
            companyId,
            status: 'APPROVED',
            startDate: { gte: startDate, lte: endDate }
          },
          _sum: { totalDays: true },
          _count: true
        }),
        this.prisma.leaveRequest.groupBy({
          by: ['status'],
          where: {
            companyId,
            createdAt: { gte: startDate, lte: endDate }
          },
          _count: true
        }),
        this.prisma.$queryRaw`
          SELECT MONTH(startDate) as month, SUM(totalDays) as days
          FROM hr_leave_requests
          WHERE companyId = ${companyId}
            AND status = 'APPROVED'
            AND startDate >= ${startDate}
            AND startDate <= ${endDate}
          GROUP BY MONTH(startDate)
        `,
        this.prisma.leaveRequest.count({
          where: { companyId, status: 'PENDING' }
        })
      ]);

      return {
        year,
        byType,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byMonth,
        pendingCount
      };
    } catch (error) {
      console.error('❌ Error getting leave stats:', error);
      throw error;
    }
  }

  // ===== Helper Methods =====

  calculateWorkingDays(startDate, endDate, isHalfDay) {
    if (isHalfDay) return 0.5;

    let days = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // استبعاد الجمعة والسبت (يمكن تخصيصها حسب الإعدادات)
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Reset time to midnight for accurate date comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  getLeaveTypeName(type) {
    const types = {
      ANNUAL: 'سنوية',
      SICK: 'مرضية',
      UNPAID: 'بدون راتب',
      MATERNITY: 'أمومة',
      PATERNITY: 'أبوة',
      BEREAVEMENT: 'عزاء',
      MARRIAGE: 'زواج',
      HAJJ: 'حج',
      STUDY: 'دراسية',
      EMERGENCY: 'طارئة',
      OTHER: 'أخرى'
    };
    return types[type] || type;
  }
}

module.exports = new LeaveService();
