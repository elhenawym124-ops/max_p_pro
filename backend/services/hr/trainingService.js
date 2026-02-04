/**
 * 📚 Employee Training Service
 * خدمة التدريب والتطوير
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class TrainingService {
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
   * إنشاء سجل تدريب جديد
   */
  async createTraining(companyId, employeeId, data) {
    try {
      console.log('🔍 [Debug] createTraining params:', { companyId, employeeId });
      
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
        found: !!employee
      });

      if (!employee) {
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

      const training = await this.prisma.employeeTraining.create({
        data: {
          companyId,
          userId: employeeId, // Use userId instead of employeeId
          trainingName: data.trainingName,
          provider: data.provider,
          type: data.type || 'internal',
          description: data.description,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          duration: data.duration,
          cost: data.cost,
          currency: data.currency || 'EGP',
          status: data.status || 'PLANNED'
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

      // Map user to employee for frontend compatibility
      return {
        ...training,
        user,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error creating training:', error);
      
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
          throw new Error(`الموظف غير موجود في قاعدة البيانات أو هناك مشكلة في قاعدة البيانات بالمعرف ${employeeId}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * جلب جميع سجلات التدريب للشركة
   */
  async getTrainings(companyId, options = {}) {
    try {
      const { status, limit = 50 } = options;

      const where = {
        companyId
      };

      if (status && status !== 'all') {
        where.status = status;
      }

      // Filter out orphaned records by ensuring userId exists in User table
      const userWhere = { companyId };
      const validUserIds = await this.prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      // Only include trainings with valid user IDs
      if (validUserIdList.length > 0) {
        where.userId = { in: validUserIdList };
      } else {
        // No valid users found, return empty result
        return [];
      }

      const trainings = await this.prisma.employeeTraining.findMany({
        where,
        orderBy: { startDate: 'desc' },
        take: parseInt(limit)
      });

      // Fetch all users for these trainings
      const userIds = [...new Set(trainings.map(t => t.userId).filter(Boolean))];
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
      return trainings.map(training => ({
        ...training,
        user: userMap[training.userId],
        employee: this.mapUserToEmployee(userMap[training.userId])
      }));
    } catch (error) {
      console.error('❌ Error getting trainings:', error);
      throw error;
    }
  }

  /**
   * جلب سجلات التدريب لموظف
   */
  async getEmployeeTrainings(companyId, employeeId, options = {}) {
    try {
      const { status, limit = 50 } = options;

      // Filter out orphaned records by ensuring userId exists in User table
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

      const where = {
        companyId,
        userId: employeeId // Use userId instead of employeeId
      };

      if (status && status !== 'all') {
        where.status = status;
      }

      const trainings = await this.prisma.employeeTraining.findMany({
        where,
        orderBy: { startDate: 'desc' },
        take: parseInt(limit)
      });

      // Fetch user data
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

      // Map user to employee for frontend compatibility
      return trainings.map(training => ({
        ...training,
        user,
        employee: this.mapUserToEmployee(user)
      }));
    } catch (error) {
      console.error('❌ Error getting trainings:', error);
      throw error;
    }
  }

  /**
   * جلب سجل تدريب بالـ ID
   */
  async getTrainingById(companyId, trainingId) {
    try {
      // First, get the training without relations to check if it exists
      const trainingExists = await this.prisma.employeeTraining.findFirst({
        where: { id: trainingId, companyId },
        select: { id: true, userId: true }
      });

      if (!trainingExists) {
        throw new Error('سجل التدريب غير موجود');
      }

      // Check if userId exists in users table
      const validUserIds = await this.prisma.user.findMany({
        where: { companyId },
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      if (!validUserIdList.includes(trainingExists.userId)) {
        throw new Error('سجل التدريب يحتوي على مراجع غير صالحة');
      }

      const training = await this.prisma.employeeTraining.findFirst({
        where: { id: trainingId, companyId }
      });

      if (!training) {
        throw new Error('سجل التدريب غير موجود');
      }

      // Fetch user data separately
      const user = await this.prisma.user.findUnique({
        where: { id: training.userId },
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
        ...training,
        user,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error getting training:', error);
      throw error;
    }
  }

  /**
   * تحديث سجل تدريب
   */
  async updateTraining(companyId, trainingId, data) {
    try {
      const existing = await this.prisma.employeeTraining.findFirst({
        where: { id: trainingId, companyId }
      });

      if (!existing) {
        throw new Error('سجل التدريب غير موجود');
      }

      const updateData = {};
      if (data.trainingName) updateData.trainingName = data.trainingName;
      if (data.provider) updateData.provider = data.provider;
      if (data.type) updateData.type = data.type;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.startDate) updateData.startDate = new Date(data.startDate);
      if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
      if (data.duration !== undefined) updateData.duration = data.duration;
      if (data.cost !== undefined) updateData.cost = data.cost;
      if (data.status) updateData.status = data.status;
      if (data.completionDate) updateData.completionDate = new Date(data.completionDate);
      if (data.certificateUrl) updateData.certificateUrl = data.certificateUrl;
      if (data.score !== undefined) updateData.score = data.score;
      if (data.feedback !== undefined) updateData.feedback = data.feedback;

      // إذا تم تحديث الحالة إلى COMPLETED، قم بتحديث تاريخ الإكمال
      if (data.status === 'COMPLETED' && !updateData.completionDate) {
        updateData.completionDate = new Date();
      }

      const training = await this.prisma.employeeTraining.update({
        where: { id: trainingId },
        data: updateData
      });

      // Fetch user data separately
      const user = await this.prisma.user.findUnique({
        where: { id: training.userId },
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
        ...training,
        user,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error updating training:', error);
      throw error;
    }
  }

  /**
   * حذف سجل تدريب
   */
  async deleteTraining(companyId, trainingId) {
    try {
      const existing = await this.prisma.employeeTraining.findFirst({
        where: { id: trainingId, companyId }
      });

      if (!existing) {
        throw new Error('سجل التدريب غير موجود');
      }

      await this.prisma.employeeTraining.delete({
        where: { id: trainingId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting training:', error);
      throw error;
    }
  }

  /**
   * إحصائيات التدريب
   */
  async getTrainingStats(companyId, options = {}) {
    try {
      const { employeeId, year } = options;

      const where = { companyId };
      if (employeeId) where.userId = employeeId; // Use userId instead of employeeId
      if (year) {
        where.startDate = { gte: new Date(`${year}-01-01`) };
      }

      const [total, byStatus, byType, totalCost, completed] = await Promise.all([
        this.prisma.employeeTraining.count({ where }),
        this.prisma.employeeTraining.groupBy({
          by: ['status'],
          where,
          _count: true
        }),
        this.prisma.employeeTraining.groupBy({
          by: ['type'],
          where,
          _count: true
        }),
        this.prisma.employeeTraining.aggregate({
          where,
          _sum: { cost: true }
        }),
        this.prisma.employeeTraining.count({
          where: { ...where, status: 'COMPLETED' }
        })
      ]);

      return {
        total,
        byStatus,
        byType,
        totalCost: totalCost._sum.cost || 0,
        completed,
        completionRate: total > 0 ? (completed / total * 100) : 0
      };
    } catch (error) {
      console.error('❌ Error getting training stats:', error);
      throw error;
    }
  }
}

module.exports = new TrainingService();


















































