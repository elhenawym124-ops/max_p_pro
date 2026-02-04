/**
 * 📈 Goal Service
 * خدمة إدارة الأهداف
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class GoalService {
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

  async createGoal(companyId, data) {
    try {
      const goal = await this.prisma.goal.create({
        data: {
          companyId,
          userId: data.employeeId || null, // Use userId instead of employeeId
          departmentId: data.departmentId || null,
          title: data.title,
          description: data.description,
          targetValue: data.targetValue,
          currentValue: data.currentValue || 0,
          unit: data.unit,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          status: data.status || 'PENDING',
          progress: data.progress || 0
        }
      });

      // Fetch user and department separately
      const [user, department] = await Promise.all([
        goal.userId ? this.prisma.user.findUnique({
          where: { id: goal.userId },
          select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        }) : null,
        goal.departmentId ? this.prisma.department.findUnique({
          where: { id: goal.departmentId },
          select: { id: true, name: true }
        }) : null
      ]);
      
      // Map user to employee for frontend compatibility
      return {
        ...goal,
        user,
        department,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error creating goal:', error);
      throw error;
    }
  }

  async getGoals(companyId, options = {}) {
    try {
      const { employeeId, departmentId, status } = options;
      const where = { companyId };
      if (employeeId) where.userId = employeeId; // Use userId instead of employeeId
      if (departmentId) where.departmentId = departmentId;
      if (status && status !== 'all') where.status = status;

      const goals = await this.prisma.goal.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // Fetch all users and departments
      const userIds = [...new Set(goals.map(g => g.userId).filter(Boolean))];
      const users = userIds.length > 0 ? await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, employeeNumber: true }
      }) : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      const deptIds = [...new Set(goals.map(g => g.departmentId).filter(Boolean))];
      const departments = deptIds.length > 0 ? await this.prisma.department.findMany({
        where: { id: { in: deptIds } },
        select: { id: true, name: true }
      }) : [];
      const deptMap = Object.fromEntries(departments.map(d => [d.id, d]));
      
      // Map user to employee for frontend compatibility
      return goals.map(goal => ({
        ...goal,
        user: userMap[goal.userId],
        department: deptMap[goal.departmentId],
        employee: this.mapUserToEmployee(userMap[goal.userId])
      }));
    } catch (error) {
      console.error('❌ Error getting goals:', error);
      throw error;
    }
  }

  async getGoalById(companyId, goalId) {
    try {
      const goal = await this.prisma.goal.findFirst({
        where: { id: goalId, companyId }
      });

      if (!goal) throw new Error('الهدف غير موجود');

      // Fetch user and department separately
      const [user, department] = await Promise.all([
        goal.userId ? this.prisma.user.findUnique({
          where: { id: goal.userId },
          select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        }) : null,
        goal.departmentId ? this.prisma.department.findUnique({
          where: { id: goal.departmentId },
          select: { id: true, name: true }
        }) : null
      ]);
      
      // Map user to employee for frontend compatibility
      return {
        ...goal,
        user,
        department,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error getting goal:', error);
      throw error;
    }
  }

  async updateGoal(companyId, goalId, data) {
    try {
      const existing = await this.prisma.goal.findFirst({
        where: { id: goalId, companyId }
      });
      if (!existing) throw new Error('الهدف غير موجود');

      const updateData = {};
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
      if (data.currentValue !== undefined) {
        updateData.currentValue = data.currentValue;
        // حساب التقدم تلقائياً
        if (data.targetValue !== undefined) {
          updateData.progress = Math.min(100, Math.max(0, (data.currentValue / data.targetValue) * 100));
        } else {
          updateData.progress = Math.min(100, Math.max(0, (data.currentValue / existing.targetValue) * 100));
        }
      }
      if (data.status) {
        updateData.status = data.status;
        if (data.status === 'COMPLETED' && updateData.progress !== 100) {
          updateData.progress = 100;
        }
      }

      const goal = await this.prisma.goal.update({
        where: { id: goalId },
        data: updateData
      });

      // Fetch user and department separately
      const [user, department] = await Promise.all([
        goal.userId ? this.prisma.user.findUnique({
          where: { id: goal.userId },
          select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        }) : null,
        goal.departmentId ? this.prisma.department.findUnique({
          where: { id: goal.departmentId },
          select: { id: true, name: true }
        }) : null
      ]);

      // Map user to employee for frontend compatibility
      return {
        ...goal,
        user,
        department,
        employee: this.mapUserToEmployee(user)
      };
    } catch (error) {
      console.error('❌ Error updating goal:', error);
      throw error;
    }
  }

  async deleteGoal(companyId, goalId) {
    try {
      const existing = await this.prisma.goal.findFirst({
        where: { id: goalId, companyId }
      });
      if (!existing) throw new Error('الهدف غير موجود');

      await this.prisma.goal.delete({ where: { id: goalId } });
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting goal:', error);
      throw error;
    }
  }

  async getGoalStats(companyId, options = {}) {
    try {
      const { employeeId, departmentId } = options;
      const where = { companyId };
      if (employeeId) where.userId = employeeId; // Use userId instead of employeeId
      if (departmentId) where.departmentId = departmentId;

      const [total, byStatus, completed, averageProgress] = await Promise.all([
        this.prisma.goal.count({ where }),
        this.prisma.goal.groupBy({
          by: ['status'],
          where,
          _count: true
        }),
        this.prisma.goal.count({ where: { ...where, status: 'COMPLETED' } }),
        this.prisma.goal.aggregate({
          where,
          _avg: { progress: true }
        })
      ]);

      return {
        total,
        byStatus,
        completed,
        completionRate: total > 0 ? (completed / total * 100) : 0,
        averageProgress: averageProgress._avg.progress || 0
      };
    } catch (error) {
      console.error('❌ Error getting goal stats:', error);
      throw error;
    }
  }
}

module.exports = new GoalService();

















































