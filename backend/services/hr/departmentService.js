/**
 * 🏢 Department Service
 * خدمة إدارة الأقسام
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class DepartmentService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء قسم جديد
   */
  async createDepartment(companyId, data) {
    try {
      const department = await this.prisma.department.create({
        data: {
          companyId,
          ...data,
          updatedAt: new Date()
        },
        include: {
          parent: {
            select: { id: true, name: true }
          },
          _count: {
            select: { users: true, positions: true }
          }
        }
      });

      return department;
    } catch (error) {
      console.error('❌ Error creating department:', error);
      throw error;
    }
  }

  /**
   * جلب جميع الأقسام
   */
  async getDepartments(companyId, options = {}) {
    try {
      const { includeInactive = false, tree = false } = options;

      const where = {};
      
      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }
      
      if (!includeInactive) {
        where.isActive = true;
      }

      console.log(`🔍 [DEPARTMENT-SERVICE] getDepartments - companyId: ${companyId}, where:`, JSON.stringify(where));

      const departments = await this.prisma.department.findMany({
        where,
        select: {
          id: true,
          companyId: true,
          name: true,
          nameEn: true,
          description: true,
          managerId: true,
          parentId: true,
          color: true,
          icon: true,
          isActive: true,
          sortOrder: true,
          createdAt: true,
          // updatedAt: true, // Excluding potential problem field
          parent: {
            select: { id: true, name: true }
          },
          _count: {
            select: { users: true, positions: true, children: true }
          }
        },
        orderBy: { sortOrder: 'asc' }
      });

      if (tree) {
        // بناء شجرة الأقسام
        const buildTree = (parentId = null) => {
          return departments
            .filter(dept => dept.parentId === parentId)
            .map(dept => ({
              ...dept,
              children: buildTree(dept.id)
            }));
        };
        return buildTree(null);
      }

      return departments;
    } catch (error) {
      console.error('❌ Error getting departments:', error);
      throw error;
    }
  }

  /**
   * جلب قسم بالـ ID
   */
  async getDepartmentById(companyId, departmentId) {
    try {
      const department = await this.prisma.department.findFirst({
        where: { id: departmentId, companyId },
        include: {
          parent: true,
          children: {
            include: {
              _count: { select: { users: true } }
            }
          },
          users: {
            where: { isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              positionRelation: { select: { title: true } }
            }
          },
          positions: {
            include: {
              _count: { select: { users: true } }
            }
          }
        }
      });

      return department;
    } catch (error) {
      console.error('❌ Error getting department:', error);
      throw error;
    }
  }

  /**
   * تحديث قسم
   */
  async updateDepartment(companyId, departmentId, data) {
    try {
      const existing = await this.prisma.department.findFirst({
        where: { id: departmentId, companyId }
      });

      if (!existing) {
        throw new Error('القسم غير موجود');
      }

      // منع جعل القسم أباً لنفسه
      if (data.parentId === departmentId) {
        throw new Error('لا يمكن جعل القسم أباً لنفسه');
      }

      const department = await this.prisma.department.update({
        where: { id: departmentId },
        data: { ...data, updatedAt: new Date() },
        include: {
          parent: {
            select: { id: true, name: true }
          },
          _count: {
            select: { users: true, positions: true }
          }
        }
      });

      return department;
    } catch (error) {
      console.error('❌ Error updating department:', error);
      throw error;
    }
  }

  /**
   * حذف قسم
   */
  async deleteDepartment(companyId, departmentId) {
    try {
      const existing = await this.prisma.department.findFirst({
        where: { id: departmentId, companyId },
        include: {
          _count: { select: { users: true, children: true } }
        }
      });

      if (!existing) {
        throw new Error('القسم غير موجود');
      }

      if (existing._count.users > 0) {
        throw new Error('لا يمكن حذف قسم يحتوي على موظفين');
      }

      if (existing._count.children > 0) {
        throw new Error('لا يمكن حذف قسم يحتوي على أقسام فرعية');
      }

      await this.prisma.department.delete({
        where: { id: departmentId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting department:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الأقسام
   */
  async getDepartmentStats(companyId) {
    try {
      const departments = await this.prisma.department.findMany({
        where: { companyId, isActive: true },
        include: {
          _count: {
            select: { users: true, positions: true }
          },
          users: {
            where: { isActive: true },
            select: { baseSalary: true }
          }
        }
      });

      const stats = departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        color: dept.color,
        employeeCount: dept._count.users,
        positionCount: dept._count.positions,
        totalSalary: dept.users.reduce((sum, user) =>
          sum + (parseFloat(user.baseSalary) || 0), 0
        )
      }));

      return {
        totalDepartments: departments.length,
        departments: stats
      };
    } catch (error) {
      console.error('❌ Error getting department stats:', error);
      throw error;
    }
  }
}

module.exports = new DepartmentService();
