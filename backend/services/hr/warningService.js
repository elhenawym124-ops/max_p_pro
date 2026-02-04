/**
 * ⚠️ Employee Warning Service
 * خدمة الإنذارات
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class WarningService {
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

  /**
   * إنشاء إنذار جديد
   */
  async createWarning(companyId, employeeId, data) {
    try {
      console.log('🔍 [Debug] createWarning params:', { companyId, employeeId });
      
      if (!companyId) {
        throw new Error('يجب تحديد الشركة لإنشاء إنذار');
      }

      if (!employeeId || employeeId.trim() === '') {
        throw new Error('معرف الموظف مطلوب');
      }

      // التحقق من وجود الموظف
      const employee = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });

      console.log('🔍 [Debug] Employee lookup result:', {
        employeeId,
        companyId,
        found: !!employee,
        employeeCompanyId: employee?.companyId
      });

      if (!employee) {
        // Additional debugging
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

      const warning = await this.prisma.employeeWarning.create({
        data: {
          companyId,
          userId: employeeId, // Use userId instead of employeeId
          type: data.type,
          severity: data.severity || 'minor',
          title: data.title,
          description: data.description,
          incidentDate: new Date(data.incidentDate),
          actionTaken: data.actionTaken,
          issuedBy: data.issuedBy,
          attachments: data.attachments ? JSON.stringify(data.attachments) : null
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

      // Parse JSON fields and map user to employee
      return {
        ...warning,
        user,
        employee: this.mapUserToEmployee(user),
        attachments: warning.attachments ? JSON.parse(warning.attachments) : null
      };
    } catch (error) {
      console.error('❌ Error creating warning:', error);
      throw error;
    }
  }

  /**
   * جلب جميع التحذيرات (للمسؤولين)
   */
  async getWarnings(companyId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      const where = {};
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN, companyId might be null)
      if (companyId) {
        where.companyId = companyId;
      }

      // Filter out orphaned records by ensuring userId exists in User table
      if (companyId) {
        const userWhere = { companyId };
        const validUserIds = await this.prisma.user.findMany({
          where: userWhere,
          select: { id: true }
        });
        const validUserIdList = validUserIds.map(u => u.id);

        // Only include warnings with valid user IDs
        if (validUserIdList.length > 0) {
          where.userId = { in: validUserIdList };
        } else {
          // No valid users found, return empty result
          return [];
        }
      }

      const warnings = await this.prisma.employeeWarning.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' }
      });

      // Fetch all users for these warnings
      const userIds = [...new Set(warnings.map(w => w.userId).filter(Boolean))];
      const users = userIds.length > 0 ? await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          avatar: true,
          positionRelation: { select: { title: true } },
          departmentRelation: { select: { name: true } }
        }
      }) : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      return warnings.map(w => ({
        ...w,
        user: userMap[w.userId],
        employee: this.mapUserToEmployee(userMap[w.userId]),
        attachments: w.attachments ? JSON.parse(w.attachments) : null
      }));
    } catch (error) {
      console.error('❌ Error getting all warnings:', error);
      throw error;
    }
  }

  /**
   * جلب إنذارات موظف
   */
  async getEmployeeWarnings(companyId, employeeId, options = {}) {
    try {
      const { type, severity, limit = 50 } = options;

      const where = {};
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }

      // Filter out orphaned records by ensuring userId exists in User table
      if (companyId) {
        const userWhere = { companyId };
        const validUserIds = await this.prisma.user.findMany({
          where: userWhere,
          select: { id: true }
        });
        const validUserIdList = validUserIds.map(u => u.id);

        // Verify the requested employeeId exists
        if (!validUserIdList.includes(employeeId)) {
          // Requested employeeId doesn't exist, return empty result
          return [];
        }
        where.userId = employeeId; // Use userId instead of employeeId
      } else {
        where.userId = employeeId; // Use userId instead of employeeId
      }

      if (type && type !== 'all') {
        where.type = type;
      }

      if (severity && severity !== 'all') {
        where.severity = severity;
      }

      const warnings = await this.prisma.employeeWarning.findMany({
        where,
        orderBy: { incidentDate: 'desc' },
        take: parseInt(limit)
      });

      // Parse JSON fields
      return warnings.map(warning => ({
        ...warning,
        attachments: warning.attachments ? JSON.parse(warning.attachments) : null
      }));
    } catch (error) {
      console.error('❌ Error getting warnings:', error);
      throw error;
    }
  }

  /**
   * جلب إنذار بالـ ID
   */
  async getWarningById(companyId, warningId) {
    try {
      const where = { id: warningId };
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }
      
      // First check if warning exists and has valid userId
      const warningExists = await this.prisma.employeeWarning.findFirst({
        where,
        select: { id: true, userId: true }
      });

      if (!warningExists) {
        throw new Error('الإنذار غير موجود');
      }

      // Check if userId exists in users table
      if (companyId) {
        const validUserIds = await this.prisma.user.findMany({
          where: { companyId },
          select: { id: true }
        });
        const validUserIdList = validUserIds.map(u => u.id);

        if (!validUserIdList.includes(warningExists.userId)) {
          throw new Error('الإنذار يحتوي على مراجع غير صالحة');
        }
      }

      const warning = await this.prisma.employeeWarning.findFirst({
        where
      });

      if (!warning) {
        throw new Error('الإنذار غير موجود');
      }

      // Fetch user data separately
      const user = await this.prisma.user.findUnique({
        where: { id: warning.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          positionRelation: { select: { title: true } },
          departmentRelation: { select: { name: true } }
        }
      });

      // Parse JSON fields and map user to employee
      return {
        ...warning,
        user,
        employee: this.mapUserToEmployee(user),
        attachments: warning.attachments ? JSON.parse(warning.attachments) : null
      };
    } catch (error) {
      console.error('❌ Error getting warning:', error);
      throw error;
    }
  }

  /**
   * تحديث إنذار
   */
  async updateWarning(companyId, warningId, data) {
    try {
      const where = { id: warningId };
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }
      
      const existing = await this.prisma.employeeWarning.findFirst({
        where
      });

      if (!existing) {
        throw new Error('الإنذار غير موجود');
      }

      const updateData = {};
      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.type) updateData.type = data.type;
      if (data.severity) updateData.severity = data.severity;
      if (data.incidentDate) updateData.incidentDate = new Date(data.incidentDate);
      if (data.actionTaken !== undefined) updateData.actionTaken = data.actionTaken;
      if (data.employeeResponse !== undefined) updateData.employeeResponse = data.employeeResponse;
      if (data.attachments) updateData.attachments = JSON.stringify(data.attachments);
      if (data.acknowledgedAt) updateData.acknowledgedAt = new Date(data.acknowledgedAt);

      const warning = await this.prisma.employeeWarning.update({
        where: { id: warningId },
        data: updateData
      });

      // Fetch user data separately
      const user = await this.prisma.user.findUnique({
        where: { id: warning.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          positionRelation: { select: { title: true } },
          departmentRelation: { select: { name: true } }
        }
      });

      // Parse JSON fields and map user to employee
      return {
        ...warning,
        user,
        employee: this.mapUserToEmployee(user),
        attachments: warning.attachments ? JSON.parse(warning.attachments) : null
      };
    } catch (error) {
      console.error('❌ Error updating warning:', error);
      throw error;
    }
  }

  /**
   * تسجيل اعتراف الموظف بالإنذار
   */
  async acknowledgeWarning(companyId, warningId, employeeResponse) {
    try {
      const where = { id: warningId };
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }
      
      const warning = await this.prisma.employeeWarning.findFirst({
        where
      });

      if (!warning) {
        throw new Error('الإنذار غير موجود');
      }

      const updated = await this.prisma.employeeWarning.update({
        where: { id: warningId },
        data: {
          acknowledgedAt: new Date(),
          employeeResponse: employeeResponse
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error acknowledging warning:', error);
      throw error;
    }
  }

  /**
   * حذف إنذار
   */
  async deleteWarning(companyId, warningId) {
    try {
      const where = { id: warningId };
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }
      
      const existing = await this.prisma.employeeWarning.findFirst({
        where
      });

      if (!existing) {
        throw new Error('الإنذار غير موجود');
      }

      await this.prisma.employeeWarning.delete({
        where: { id: warningId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting warning:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الإنذارات
   */
  async getWarningStats(companyId, options = {}) {
    try {
      const { employeeId, year } = options;

      const where = {};
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }
      
      // Filter out orphaned records by ensuring userId exists in User table
      if (companyId) {
        const userWhere = { companyId };
        const validUserIds = await this.prisma.user.findMany({
          where: userWhere,
          select: { id: true }
        });
        const validUserIdList = validUserIds.map(u => u.id);

        // Only include warnings with valid user IDs
        if (employeeId) {
          if (!validUserIdList.includes(employeeId)) {
            // Requested employeeId doesn't exist, return empty stats
            return {
              total: 0,
              byType: [],
              bySeverity: [],
              acknowledged: 0,
              acknowledgmentRate: 0
            };
          }
          where.userId = employeeId; // Use userId instead of employeeId
        } else {
          if (validUserIdList.length > 0) {
            where.userId = { in: validUserIdList };
          } else {
            return {
              total: 0,
              byType: [],
              bySeverity: [],
              acknowledged: 0,
              acknowledgmentRate: 0
            };
          }
        }
      } else {
        // No companyId (SUPER_ADMIN), use employeeId directly
        if (employeeId) where.userId = employeeId; // Use userId instead of employeeId
      }
      if (year) {
        where.incidentDate = { gte: new Date(`${year}-01-01`) };
      }

      const [total, byType, bySeverity, acknowledged] = await Promise.all([
        this.prisma.employeeWarning.count({ where }),
        this.prisma.employeeWarning.groupBy({
          by: ['type'],
          where,
          _count: true
        }),
        this.prisma.employeeWarning.groupBy({
          by: ['severity'],
          where,
          _count: true
        }),
        this.prisma.employeeWarning.count({
          where: { ...where, acknowledgedAt: { not: null } }
        })
      ]);

      return {
        total,
        byType,
        bySeverity,
        acknowledged,
        acknowledgmentRate: total > 0 ? (acknowledged / total * 100) : 0
      };
    } catch (error) {
      console.error('❌ Error getting warning stats:', error);
      throw error;
    }
  }
}

module.exports = new WarningService();


















































