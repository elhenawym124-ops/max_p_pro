const { getSharedPrismaClient } = require('../sharedDatabase');

function parseDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const s = String(value).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00.000Z`);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [mm, dd, yyyy] = s.split('/');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  }

  return new Date(s);
}

class PromotionService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * إنشاء ترقية جديدة
   */
  async createPromotion(companyId, data) {
    try {
      // التحقق من وجود الموظف
      const employee = await this.prisma.user.findFirst({
        where: { id: data.employeeId, companyId }
      });

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      // التحقق من المنصب الجديد أو إنشاؤه
      let toPosition = null;
      let toPositionId = data.toPositionId;
      
      if (data.toPositionId) {
        // إذا تم اختيار منصب من القائمة
        toPosition = await this.prisma.position.findFirst({
          where: { id: data.toPositionId, companyId }
        });

        if (!toPosition) {
          throw new Error('المنصب الجديد غير موجود');
        }
      } else if (data.toPositionName && data.toPositionName.trim() !== '') {
        // إذا تم كتابة اسم المنصب يدوياً، نقوم بإنشائه
        toPosition = await this.prisma.position.create({
          data: {
            companyId,
            title: data.toPositionName.trim(),
            description: `منصب تم إنشاؤه تلقائياً من الترقية`,
            departmentId: null,
            level: 1,
            minSalary: null,
            maxSalary: null,
            updatedAt: new Date() 
          }
        });
        toPositionId = toPosition.id;
        console.log('✅ [HR] Created new position:', toPosition.title);
      } else {
        throw new Error('يجب تحديد المنصب الجديد');
      }

      // التحقق من أن المنصب الجديد مختلف عن السابق (إذا تم تحديده)
      if (data.fromPositionId && data.fromPositionId === data.toPositionId) {
        throw new Error('المنصب الجديد يجب أن يكون مختلفاً عن المنصب السابق');
      }

      // التحقق من المنصب السابق أو إنشاؤه (إذا تم تحديده)
      let fromPosition = null;
      let fromPositionId = data.fromPositionId;
      
      if (data.fromPositionId && data.fromPositionId !== 'none') {
        fromPosition = await this.prisma.position.findFirst({
          where: { id: data.fromPositionId, companyId }
        });

        if (!fromPosition) {
          throw new Error('المنصب السابق غير موجود');
        }
      } else if (data.fromPositionName && data.fromPositionName.trim() !== '') {
        // إذا تم كتابة اسم المنصب السابق يدوياً، نقوم بإنشائه
        fromPosition = await this.prisma.position.create({
          data: {
            companyId,
            title: data.fromPositionName.trim(),
            description: `منصب تم إنشاؤه تلقائياً من الترقية`,
            departmentId: null,
            level: 1,
            minSalary: null,
            maxSalary: null,
            updatedAt: new Date()
          }
        });
        fromPositionId = fromPosition.id;
        console.log('✅ [HR] Created new position:', fromPosition.title);
      }

      const promotionDate = parseDateOnly(data.promotionDate);
      if (!promotionDate || Number.isNaN(promotionDate.getTime())) {
        throw new Error('تاريخ الترقية غير صحيح');
      }

      const effectiveDate = parseDateOnly(data.effectiveDate);
      if (!effectiveDate || Number.isNaN(effectiveDate.getTime())) {
        throw new Error('تاريخ السريان غير صحيح');
      }

      // إنشاء الترقية
      const promotion = await this.prisma.promotion.create({
        data: {
          companyId,
          userId: data.employeeId,
          fromPositionId: fromPositionId && fromPositionId !== 'none' ? fromPositionId : null,
          toPositionId: toPositionId,
          fromPositionName: fromPosition?.title || null,
          toPositionName: toPosition.title,
          fromSalary: data.fromSalary ?? null,
          toSalary: data.toSalary ?? null,
          promotionDate,
          effectiveDate,
          reason: data.reason,
          notes: data.notes || null,
          status: 'PENDING'
        }
      });

      // Fetch user data separately
      const user = await this.prisma.user.findUnique({
        where: { id: data.employeeId },
        select: { id: true, firstName: true, lastName: true, employeeNumber: true }
      });

      console.log('✅ [HR] Promotion created:', promotion.id);
      return { ...promotion, user, fromPosition, toPosition };
    } catch (error) {
      console.error('❌ [HR] Error creating promotion:', error);
      throw error;
    }
  }

  /**
   * جلب جميع الترقيات
   */
  async getPromotions(companyId, options = {}) {
    try {
      const {
        page: pageStr = 1,
        limit: limitStr = 20,
        search,
        employeeId,
        status
      } = options;

      const page = parseInt(pageStr, 10) || 1;
      const limit = parseInt(limitStr, 10) || 20;

      const where = { companyId };

      if (employeeId) {
        where.userId = employeeId;
      }

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { reason: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const [promotions, total] = await Promise.all([
        this.prisma.promotion.findMany({
          where,
          orderBy: { promotionDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.promotion.count({ where })
      ]);

      // Fetch all users
      const userIds = [...new Set(promotions.map(p => p.userId).filter(Boolean))];
      const users = userIds.length > 0 ? await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, employeeNumber: true, avatar: true }
      }) : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      // Fetch positions
      const positionIds = [...new Set([...promotions.map(p => p.fromPositionId), ...promotions.map(p => p.toPositionId)].filter(Boolean))];
      const positions = positionIds.length > 0 ? await this.prisma.position.findMany({
        where: { id: { in: positionIds } },
        select: { id: true, title: true }
      }) : [];
      const positionMap = Object.fromEntries(positions.map(p => [p.id, p]));

      const enrichedPromotions = promotions.map(p => ({
        ...p,
        user: userMap[p.userId],
        fromPosition: p.fromPositionId ? positionMap[p.fromPositionId] : null,
        toPosition: positionMap[p.toPositionId]
      }));

      return { promotions: enrichedPromotions, total, page, limit };
    } catch (error) {
      console.error('❌ [HR] Error getting promotions:', error);
      throw error;
    }
  }

  /**
   * جلب ترقية واحدة بواسطة ID
   */
  async getPromotionById(companyId, id) {
    try {
      const promotion = await this.prisma.promotion.findFirst({
        where: { id, companyId }
      });
      if (!promotion) {
        throw new Error('الترقية غير موجودة');
      }

      // Fetch user and positions separately
      const [user, fromPosition, toPosition] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: promotion.userId },
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, avatar: true }
        }),
        promotion.fromPositionId ? this.prisma.position.findUnique({
          where: { id: promotion.fromPositionId },
          select: { id: true, title: true }
        }) : null,
        this.prisma.position.findUnique({
          where: { id: promotion.toPositionId },
          select: { id: true, title: true }
        })
      ]);

      return { ...promotion, user, fromPosition, toPosition };
    } catch (error) {
      console.error('❌ [HR] Error getting promotion by ID:', error);
      throw error;
    }
  }

  /**
   * تحديث ترقية موجودة
   */
  async updatePromotion(companyId, id, data) {
    try {
      // Fetch existing promotion to get current employeeId
      const existingPromotion = await this.prisma.promotion.findFirst({
        where: { id, companyId },
        select: { userId: true, fromPositionId: true, approvedAt: true, rejectedAt: true }
      });

      if (!existingPromotion) {
        throw new Error('الترقية غير موجودة');
      }

      // التحقق من المنصب الجديد أو إنشاؤه
      let toPosition = null;
      let toPositionId = data.toPositionId;
      
      if (data.toPositionId) {
        toPosition = await this.prisma.position.findFirst({
          where: { id: data.toPositionId, companyId }
        });
        if (!toPosition) {
          throw new Error('المنصب الجديد غير موجود');
        }
      } else if (data.toPositionName && data.toPositionName.trim() !== '') {
        toPosition = await this.prisma.position.create({
          data: {
            companyId,
            title: data.toPositionName.trim(),
            description: `منصب تم إنشاؤه تلقائياً من الترقية`,
            departmentId: null,
            level: 1,
            minSalary: null,
            maxSalary: null,
            updatedAt: new Date()
          }
        });
        toPositionId = toPosition.id;
        console.log('✅ [HR] Created new position:', toPosition.title);
      } else {
        throw new Error('يجب تحديد المنصب الجديد');
      }

      // التحقق من المنصب السابق أو إنشاؤه
      let fromPosition = null;
      let fromPositionId = data.fromPositionId;
      
      if (data.fromPositionId && data.fromPositionId !== 'none') {
        fromPosition = await this.prisma.position.findFirst({
          where: { id: data.fromPositionId, companyId }
        });
        if (!fromPosition) {
          throw new Error('المنصب السابق غير موجود');
        }
      } else if (data.fromPositionName && data.fromPositionName.trim() !== '') {
        fromPosition = await this.prisma.position.create({
          data: {
            companyId,
            title: data.fromPositionName.trim(),
            description: `منصب تم إنشاؤه تلقائياً من الترقية`,
            departmentId: null,
            level: 1,
            minSalary: null,
            maxSalary: null,
            updatedAt: new Date()
          }
        });
        fromPositionId = fromPosition.id;
        console.log('✅ [HR] Created new position:', fromPosition.title);
      }

      // Ensure new position is different from old position if both are specified
      if (data.fromPositionId && data.fromPositionId !== 'none' && data.fromPositionId === data.toPositionId) {
        throw new Error('المنصب الجديد يجب أن يكون مختلفاً عن المنصب السابق');
      }

      const promotionDate = parseDateOnly(data.promotionDate);
      if (!promotionDate || Number.isNaN(promotionDate.getTime())) {
        throw new Error('تاريخ الترقية غير صحيح');
      }

      const effectiveDate = parseDateOnly(data.effectiveDate);
      if (!effectiveDate || Number.isNaN(effectiveDate.getTime())) {
        throw new Error('تاريخ السريان غير صحيح');
      }

      const updateResult = await this.prisma.promotion.updateMany({
        where: { id, companyId },
        data: {
          fromPositionId: fromPositionId === 'none' ? null : fromPositionId,
          toPositionId: toPositionId,
          fromPositionName: fromPosition?.title || null,
          toPositionName: toPosition.title,
          fromSalary: data.fromSalary ?? null,
          toSalary: data.toSalary ?? null,
          promotionDate,
          effectiveDate,
          reason: data.reason,
          notes: data.notes || null,
          status: data.status || 'PENDING',
          approvedBy: data.approvedBy || null,
          approvedAt: data.status === 'APPROVED' && !existingPromotion.approvedAt ? new Date() : existingPromotion.approvedAt,
          rejectedAt: data.status === 'REJECTED' && !existingPromotion.rejectedAt ? new Date() : existingPromotion.rejectedAt,
          rejectionReason: data.rejectionReason || null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true
            }
          },
          fromPosition: {
            select: {
              id: true,
              title: true
            }
          },
          toPosition: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      if (!updatedPromotion) {
        throw new Error('الترقية غير موجودة');
      }

      console.log('✅ [HR] Promotion updated:', updatedPromotion.id);
      return { ...updatedPromotion, user, fromPosition, toPosition };
    } catch (error) {
      console.error('❌ [HR] Error updating promotion:', error);
      throw error;
    }
  }

  /**
   * حذف ترقية
   */
  async deletePromotion(companyId, id) {
    try {
      // التحقق من وجود الترقية
      const existingPromotion = await this.prisma.promotion.findFirst({
        where: { id, companyId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true
            }
          },
          fromPosition: {
            select: {
              id: true,
              title: true
            }
          },
          toPosition: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      if (!existingPromotion) {
        throw new Error('الترقية غير موجودة');
      }

      // حذف الترقية
      const deletedPromotion = await this.prisma.promotion.delete({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true
            }
          },
          fromPosition: {
            select: {
              id: true,
              title: true
            }
          },
          toPosition: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      console.log('✅ [HR] Promotion deleted:', deletedPromotion.id);
      return deletedPromotion;
    } catch (error) {
      console.error('❌ [HR] Error deleting promotion:', error);
      throw error;
    }
  }
}

module.exports = new PromotionService();
