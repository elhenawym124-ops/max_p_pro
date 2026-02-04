/**
 * 🎁 Customer Loyalty Service
 * خدمة إدارة نظام ولاء العملاء
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues - use getSharedPrismaClient() inside functions

class CustomerLoyaltyService {
  /**
   * جلب جميع برامج الولاء للشركة
   */
  async getPrograms(companyId, filters = {}) {
    const prisma = getSharedPrismaClient();
    try {
      const where = {
        companyId,
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type })
      };

      const programs = await prisma.customerLoyaltyProgram.findMany({
        where,
        include: {
          _count: {
            select: {
              records: {
                where: {
                  status: 'ACTIVE'
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // حساب الإحصائيات لكل برنامج
      const programsWithStats = await Promise.all(
        programs.map(async (program) => {
          const stats = await this.getProgramStatistics(companyId, program.id);
          return {
            ...program,
            customersCount: program._count.records,
            totalPointsIssued: stats.totalPointsIssued,
            totalPointsRedeemed: stats.totalPointsRedeemed
          };
        })
      );

      return programsWithStats;
    } catch (error) {
      console.error('❌ Error getting loyalty programs:', error);
      throw error;
    }
  }

  /**
   * جلب برنامج ولاء محدد
   */
  async getProgramById(companyId, programId) {
    const prisma = getSharedPrismaClient();
    try {
      const program = await prisma.customerLoyaltyProgram.findFirst({
        where: {
          id: programId,
          companyId
        },
        include: {
          tiers: {
            orderBy: {
              priority: 'asc'
            }
          },
          _count: {
            select: {
              records: true
            }
          }
        }
      });

      if (!program) {
        throw new Error('برنامج الولاء غير موجود');
      }

      const stats = await this.getProgramStatistics(companyId, programId);
      
      return {
        ...program,
        ...stats
      };
    } catch (error) {
      console.error('❌ Error getting loyalty program:', error);
      throw error;
    }
  }

  /**
   * إنشاء برنامج ولاء جديد
   */
  async createProgram(companyId, data, createdBy) {
    const prisma = getSharedPrismaClient();
    try {
      const program = await prisma.customerLoyaltyProgram.create({
        data: {
          companyId,
          name: data.name,
          nameAr: data.nameAr,
          description: data.description,
          type: data.type || 'POINTS',
          status: data.status || 'DRAFT',
          pointsPerPurchase: data.pointsPerPurchase || 1,
          pointsPerReferral: data.pointsPerReferral || 10,
          pointsPerAmount: data.pointsPerAmount,
          redemptionRate: data.redemptionRate || 100,
          minimumPoints: data.minimumPoints || 100,
          maxPointsPerTransaction: data.maxPointsPerTransaction,
          expiryMonths: data.expiryMonths || 12,
          rules: data.rules ? JSON.stringify(data.rules) : null,
          createdBy
        }
      });

      return program;
    } catch (error) {
      console.error('❌ Error creating loyalty program:', error);
      throw error;
    }
  }

  /**
   * تحديث برنامج ولاء
   */
  async updateProgram(companyId, programId, data) {
    const prisma = getSharedPrismaClient();
    try {
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.pointsPerPurchase !== undefined) updateData.pointsPerPurchase = data.pointsPerPurchase;
      if (data.pointsPerReferral !== undefined) updateData.pointsPerReferral = data.pointsPerReferral;
      if (data.pointsPerAmount !== undefined) updateData.pointsPerAmount = data.pointsPerAmount;
      if (data.redemptionRate !== undefined) updateData.redemptionRate = data.redemptionRate;
      if (data.minimumPoints !== undefined) updateData.minimumPoints = data.minimumPoints;
      if (data.maxPointsPerTransaction !== undefined) updateData.maxPointsPerTransaction = data.maxPointsPerTransaction;
      if (data.expiryMonths !== undefined) updateData.expiryMonths = data.expiryMonths;
      if (data.rules !== undefined) updateData.rules = data.rules ? JSON.stringify(data.rules) : null;

      const program = await prisma.customerLoyaltyProgram.update({
        where: {
          id: programId,
          companyId
        },
        data: updateData
      });

      return program;
    } catch (error) {
      console.error('❌ Error updating loyalty program:', error);
      throw error;
    }
  }

  /**
   * جلب جميع المستويات (Tiers)
   */
  async getTiers(companyId, programId = null) {
    const prisma = getSharedPrismaClient();
    try {
      const where = {
        companyId,
        ...(programId && { programId })
      };

      const tiers = await prisma.customerLoyaltyTier.findMany({
        where,
        include: {
          program: {
            select: {
              id: true,
              name: true,
              nameAr: true
            }
          }
        },
        orderBy: {
          priority: 'asc'
        }
      });

      // حساب عدد العملاء لكل مستوى
      const tiersWithCounts = await Promise.all(
        tiers.map(async (tier) => {
          const count = await prisma.customerLoyaltyRecord.count({
            where: {
              companyId,
              tierId: tier.id,
              status: 'ACTIVE'
            }
          });

          return {
            ...tier,
            customersCount: count,
            benefits: tier.benefits ? JSON.parse(tier.benefits) : []
          };
        })
      );

      return tiersWithCounts;
    } catch (error) {
      console.error('❌ Error getting loyalty tiers:', error);
      throw error;
    }
  }

  /**
   * إنشاء مستوى جديد
   */
  async createTier(companyId, data) {
    const prisma = getSharedPrismaClient();
    try {
      const tier = await prisma.customerLoyaltyTier.create({
        data: {
          companyId,
          programId: data.programId,
          name: data.name,
          nameAr: data.nameAr,
          minPoints: data.minPoints,
          maxPoints: data.maxPoints,
          benefits: data.benefits ? JSON.stringify(data.benefits) : null,
          color: data.color || '#6366f1',
          icon: data.icon || 'crown',
          priority: data.priority || 1
        }
      });

      return {
        ...tier,
        benefits: tier.benefits ? JSON.parse(tier.benefits) : []
      };
    } catch (error) {
      console.error('❌ Error creating loyalty tier:', error);
      throw error;
    }
  }

  /**
   * جلب سجلات ولاء العملاء
   */
  async getCustomerRecords(companyId, filters = {}) {
    const prisma = getSharedPrismaClient();
    try {
      const where = {
        companyId,
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.programId && { programId: filters.programId }),
        ...(filters.status && { status: filters.status })
      };

      const records = await prisma.customerLoyaltyRecord.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          program: true,
          tier: true
        },
        orderBy: {
          lastActivity: 'desc'
        }
      });

      return records.map(record => ({
        ...record,
        metadata: record.metadata ? JSON.parse(record.metadata) : null
      }));
    } catch (error) {
      console.error('❌ Error getting customer loyalty records:', error);
      throw error;
    }
  }

  /**
   * إضافة عميل إلى برنامج ولاء
   */
  async enrollCustomer(companyId, customerId, programId, initialPoints = 0) {
    const prisma = getSharedPrismaClient();
    try {
      // التحقق من وجود البرنامج
      const program = await prisma.customerLoyaltyProgram.findFirst({
        where: {
          id: programId,
          companyId,
          status: 'ACTIVE'
        }
      });

      if (!program) {
        throw new Error('برنامج الولاء غير موجود أو غير نشط');
      }

      // التحقق من عدم وجود سجل سابق
      const existingRecord = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customer_program_unique: {
            customerId,
            programId
          }
        }
      });

      if (existingRecord) {
        throw new Error('العميل مسجل بالفعل في هذا البرنامج');
      }

      // تحديد المستوى الأولي
      const initialTier = await this.determineTier(companyId, programId, initialPoints);

      // إنشاء السجل
      const record = await prisma.customerLoyaltyRecord.create({
        data: {
          companyId,
          customerId,
          programId,
          tierId: initialTier?.id,
          currentPoints: initialPoints,
          totalEarned: initialPoints,
          status: 'ACTIVE',
          joinDate: new Date(),
          lastActivity: new Date(),
          lastPointsEarned: initialPoints > 0 ? new Date() : null
        },
        include: {
          customer: true,
          program: true,
          tier: true
        }
      });

      return record;
    } catch (error) {
      console.error('❌ Error enrolling customer:', error);
      throw error;
    }
  }

  /**
   * إضافة نقاط للعميل
   */
  async addPoints(companyId, customerId, programId, points, reason = null) {
    const prisma = getSharedPrismaClient();
    try {
      const record = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customer_program_unique: {
            customerId,
            programId
          }
        }
      });

      if (!record || record.companyId !== companyId) {
        throw new Error('سجل الولاء غير موجود');
      }

      if (record.status !== 'ACTIVE') {
        throw new Error('سجل الولاء غير نشط');
      }

      // تحديث النقاط
      const updatedRecord = await prisma.customerLoyaltyRecord.update({
        where: {
          id: record.id
        },
        data: {
          currentPoints: {
            increment: points
          },
          totalEarned: {
            increment: points
          },
          lastActivity: new Date(),
          lastPointsEarned: new Date(),
          metadata: reason ? JSON.stringify({ lastReason: reason }) : record.metadata
        },
        include: {
          customer: true,
          program: true,
          tier: true
        }
      });

      // تحديث المستوى إذا لزم الأمر
      await this.updateCustomerTier(companyId, customerId, programId);

      return updatedRecord;
    } catch (error) {
      console.error('❌ Error adding points:', error);
      throw error;
    }
  }

  /**
   * استبدال النقاط
   */
  async redeemPoints(companyId, customerId, programId, points) {
    const prisma = getSharedPrismaClient();
    try {
      const record = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customer_program_unique: {
            customerId,
            programId
          }
        },
        include: {
          program: true
        }
      });

      if (!record || record.companyId !== companyId) {
        throw new Error('سجل الولاء غير موجود');
      }

      if (record.status !== 'ACTIVE') {
        throw new Error('سجل الولاء غير نشط');
      }

      if (record.currentPoints < points) {
        throw new Error('النقاط غير كافية');
      }

      if (points < record.program.minimumPoints) {
        throw new Error(`الحد الأدنى للاستبدال هو ${record.program.minimumPoints} نقطة`);
      }

      // تحديث النقاط
      const updatedRecord = await prisma.customerLoyaltyRecord.update({
        where: {
          id: record.id
        },
        data: {
          currentPoints: {
            decrement: points
          },
          totalRedeemed: {
            increment: points
          },
          lastActivity: new Date(),
          lastPointsRedeemed: new Date()
        },
        include: {
          customer: true,
          program: true,
          tier: true
        }
      });

      return updatedRecord;
    } catch (error) {
      console.error('❌ Error redeeming points:', error);
      throw error;
    }
  }

  /**
   * تحديث مستوى العميل بناءً على نقاطه
   */
  async updateCustomerTier(companyId, customerId, programId) {
    const prisma = getSharedPrismaClient();
    try {
      const record = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customer_program_unique: {
            customerId,
            programId
          }
        }
      });

      if (!record) return;

      const newTier = await this.determineTier(companyId, programId, record.currentPoints);

      if (newTier && newTier.id !== record.tierId) {
        await prisma.customerLoyaltyRecord.update({
          where: {
            id: record.id
          },
          data: {
            tierId: newTier.id
          }
        });
      }
    } catch (error) {
      console.error('❌ Error updating customer tier:', error);
      // لا نرمي الخطأ هنا لأنها عملية ثانوية
    }
  }

  /**
   * تحديد المستوى بناءً على النقاط
   */
  async determineTier(companyId, programId, points) {
    const prisma = getSharedPrismaClient();
    try {
      const tiers = await prisma.customerLoyaltyTier.findMany({
        where: {
          companyId,
          programId
        },
        orderBy: {
          priority: 'desc' // أعلى أولوية أولاً
        }
      });

      for (const tier of tiers) {
        if (points >= tier.minPoints && (!tier.maxPoints || points <= tier.maxPoints)) {
          return tier;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error determining tier:', error);
      return null;
    }
  }

  /**
   * جلب إحصائيات البرنامج
   */
  async getProgramStatistics(companyId, programId) {
    const prisma = getSharedPrismaClient();
    try {
      const records = await prisma.customerLoyaltyRecord.findMany({
        where: {
          companyId,
          programId
        },
        select: {
          totalEarned: true,
          totalRedeemed: true
        }
      });

      const totalPointsIssued = records.reduce((sum, r) => sum + parseFloat(r.totalEarned), 0);
      const totalPointsRedeemed = records.reduce((sum, r) => sum + parseFloat(r.totalRedeemed), 0);

      return {
        totalPointsIssued,
        totalPointsRedeemed
      };
    } catch (error) {
      console.error('❌ Error getting program statistics:', error);
      return {
        totalPointsIssued: 0,
        totalPointsRedeemed: 0
      };
    }
  }
}

module.exports = new CustomerLoyaltyService();
