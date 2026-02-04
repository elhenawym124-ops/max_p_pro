/**
 * 💎 Benefit Service
 * خدمة إدارة المزايا
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class BenefitService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  async createBenefit(companyId, data) {
    try {
      const benefit = await this.prisma.benefit.create({
        data: {
          companyId,
          name: data.name,
          description: data.description,
          type: data.type,
          cost: data.cost,
          currency: data.currency || 'EGP',
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });
      return benefit;
    } catch (error) {
      console.error('❌ Error creating benefit:', error);
      throw error;
    }
  }

  async getBenefits(companyId, options = {}) {
    try {
      const { includeInactive } = options;
      const where = { companyId };
      if (!includeInactive) where.isActive = true;

      const benefits = await this.prisma.benefit.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // حساب عدد الاشتراكات النشطة لكل ميزة
      const benefitsWithCounts = await Promise.all(
        benefits.map(async (benefit) => {
          const activeCount = await this.prisma.benefitEnrollment.count({
            where: {
              benefitId: benefit.id,
              status: 'ACTIVE'
            }
          });
          return {
            ...benefit,
            activeEnrollments: activeCount
          };
        })
      );

      return benefitsWithCounts;
    } catch (error) {
      console.error('❌ Error getting benefits:', error);
      throw error;
    }
  }

  async getBenefitById(companyId, benefitId) {
    try {
      const benefit = await this.prisma.benefit.findFirst({
        where: { id: benefitId, companyId },
        include: {
          enrollments: {
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeNumber: true }
              }
            },
            orderBy: { startDate: 'desc' }
          }
        }
      });

      if (!benefit) throw new Error('الميزة غير موجودة');
      return benefit;
    } catch (error) {
      console.error('❌ Error getting benefit:', error);
      throw error;
    }
  }

  async updateBenefit(companyId, benefitId, data) {
    try {
      const existing = await this.prisma.benefit.findFirst({
        where: { id: benefitId, companyId }
      });
      if (!existing) throw new Error('الميزة غير موجودة');

      const benefit = await this.prisma.benefit.update({
        where: { id: benefitId },
        data
      });
      return benefit;
    } catch (error) {
      console.error('❌ Error updating benefit:', error);
      throw error;
    }
  }

  async deleteBenefit(companyId, benefitId) {
    try {
      const existing = await this.prisma.benefit.findFirst({
        where: { id: benefitId, companyId }
      });
      if (!existing) throw new Error('الميزة غير موجودة');

      await this.prisma.benefit.delete({ where: { id: benefitId } });
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting benefit:', error);
      throw error;
    }
  }

  async enrollEmployee(companyId, employeeId, benefitId, data) {
    try {
      const [employee, benefit] = await Promise.all([
        this.prisma.user.findFirst({ where: { id: employeeId, companyId } }),
        this.prisma.benefit.findFirst({ where: { id: benefitId, companyId } })
      ]);

      if (!employee) throw new Error('الموظف غير موجود');
      if (!benefit) throw new Error('الميزة غير موجودة');

      const enrollment = await this.prisma.benefitEnrollment.create({
        data: {
          companyId,
          employeeId,
          benefitId,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          status: data.status || 'ACTIVE',
          notes: data.notes
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
          },
          benefit: true
        }
      });

      return enrollment;
    } catch (error) {
      console.error('❌ Error enrolling employee:', error);
      throw error;
    }
  }

  async getEmployeeEnrollments(companyId, employeeId) {
    try {
      const enrollments = await this.prisma.benefitEnrollment.findMany({
        where: { companyId, employeeId },
        include: {
          benefit: true
        },
        orderBy: { startDate: 'desc' }
      });
      return enrollments;
    } catch (error) {
      console.error('❌ Error getting enrollments:', error);
      throw error;
    }
  }

  async updateEnrollment(companyId, enrollmentId, data) {
    try {
      const existing = await this.prisma.benefitEnrollment.findFirst({
        where: { id: enrollmentId, companyId }
      });
      if (!existing) throw new Error('الاشتراك غير موجود');

      const updateData = {};
      if (data.status) updateData.status = data.status;
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      if (data.notes !== undefined) updateData.notes = data.notes;

      const enrollment = await this.prisma.benefitEnrollment.update({
        where: { id: enrollmentId },
        data: updateData,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true }
          },
          benefit: true
        }
      });

      return enrollment;
    } catch (error) {
      console.error('❌ Error updating enrollment:', error);
      throw error;
    }
  }

  async getBenefitStats(companyId) {
    try {
      const [total, active, totalEnrollments, byType] = await Promise.all([
        this.prisma.benefit.count({ where: { companyId } }),
        this.prisma.benefit.count({ where: { companyId, isActive: true } }),
        this.prisma.benefitEnrollment.count({ where: { companyId, status: 'ACTIVE' } }),
        this.prisma.benefit.groupBy({
          by: ['type'],
          where: { companyId },
          _count: true
        })
      ]);

      return { total, active, totalEnrollments, byType };
    } catch (error) {
      console.error('❌ Error getting benefit stats:', error);
      throw error;
    }
  }
}

module.exports = new BenefitService();

