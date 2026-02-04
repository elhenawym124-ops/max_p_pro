/**
 * 📊 Performance Review Service
 * خدمة تقييم الأداء
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class PerformanceService {
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
   * إنشاء تقييم أداء جديد
   */
  async createPerformanceReview(companyId, employeeId, data) {
    try {
      // التحقق من وجود الموظف (User)
      const employee = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      // التحقق من وجود المقيم (User)
      const reviewer = await this.prisma.user.findFirst({
        where: { id: data.reviewerId, companyId }
      });

      if (!reviewer) {
        throw new Error('المقيم غير موجود');
      }

      const review = await this.prisma.performanceReview.create({
        data: {
          companyId,
          userId: employeeId, // Use userId instead of employeeId
          reviewerId: data.reviewerId,
          reviewPeriod: data.reviewPeriod,
          periodStart: new Date(data.periodStart),
          periodEnd: new Date(data.periodEnd),
          overallRating: data.overallRating,
          ratings: data.ratings ? JSON.stringify(data.ratings) : null,
          goals: data.goals ? JSON.stringify(data.goals) : null,
          goalsAchievement: data.goalsAchievement,
          strengths: data.strengths,
          improvements: data.improvements,
          reviewerComments: data.reviewerComments,
          employeeComments: data.employeeComments,
          recommendations: data.recommendations ? JSON.stringify(data.recommendations) : null,
          status: data.status || 'DRAFT',
          updatedAt: new Date()
        }
      });

      // Parse JSON fields
      return {
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null
      };
    } catch (error) {
      console.error('❌ Error creating performance review:', error);
      
      // Handle foreign key constraint errors specifically
      if (error.code === 'P2003') {
        const constraintField = error.meta?.field_name || error.meta?.constraint?.[0];
        console.error('❌ Foreign key constraint violation:', {
          code: error.code,
          field: constraintField,
          constraint: error.meta?.constraint,
          employeeId: employeeId,
          reviewerId: data.reviewerId
        });
        
        if (constraintField === 'userId' || error.meta?.constraint?.includes('userId')) {
          console.error('❌ User ID foreign key constraint failed');
          throw new Error(`الموظف غير موجود في قاعدة البيانات أو هناك مشكلة في قاعدة البيانات بالمعرف ${employeeId}`);
        } else if (constraintField === 'reviewerId' || error.meta?.constraint?.includes('reviewerId')) {
          console.error('❌ Reviewer ID foreign key constraint failed');
          throw new Error(`المقيم غير موجود في قاعدة البيانات أو هناك مشكلة في قاعدة البيانات بالمعرف ${data.reviewerId}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * جلب تقييمات أداء موظف
   */
  async getEmployeeReviews(companyId, employeeId, options = {}) {
    try {
      const { status, limit = 50 } = options;

      // Filter out orphaned records by ensuring userId and reviewerId exist in User table
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

      // Also filter by valid reviewerIds
      if (validUserIdList.length > 0) {
        where.reviewerId = { in: validUserIdList };
      } else {
        where.reviewerId = { in: [] };
      }

      const reviews = await this.prisma.performanceReview.findMany({
        where,
        orderBy: { periodEnd: 'desc' },
        take: parseInt(limit),
      });

      // Parse JSON fields
      return reviews.map(review => ({
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null
      }));
    } catch (error) {
      console.error('❌ Error getting performance reviews:', error);
      throw error;
    }
  }

  /**
   * جلب جميع تقييمات الأداء للشركة
   */
  async getPerformanceReviews(companyId, options = {}) {
    try {
      const { status, employeeId, limit = 100 } = options;

      const where = { companyId };
      if (status && status !== 'all') where.status = status;

      // Filter out orphaned records by ensuring userId and reviewerId exist in User table
      // This prevents Prisma errors when including the user and reviewer relations
      const userWhere = { companyId };
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
          return [];
        }
      } else {
        // Only include reviews with valid user IDs
        if (validUserIdList.length > 0) {
          where.userId = { in: validUserIdList };
        } else {
          // No valid users found, return empty result
          return [];
        }
      }

      // Also filter by valid reviewerIds
      if (validUserIdList.length > 0) {
        where.reviewerId = { in: validUserIdList };
      } else {
        where.reviewerId = { in: [] };
      }

      const reviews = await this.prisma.performanceReview.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit)
      });

      return reviews.map(review => ({
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null
      }));
    } catch (error) {
      console.error('❌ Error getting company performance reviews:', error);
      throw error;
    }
  }

  /**
   * جلب تقييم أداء بالـ ID
   */
  async getReviewById(companyId, reviewId) {
    try {
      // First, get the review without relations to check if it exists
      const reviewExists = await this.prisma.performanceReview.findFirst({
        where: { id: reviewId, companyId },
        select: { id: true, userId: true, reviewerId: true }
      });

      if (!reviewExists) {
        throw new Error('التقييم غير موجود');
      }

      // Check if userId and reviewerId exist in users table
      const validUserIds = await this.prisma.user.findMany({
        where: { companyId },
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      if (!validUserIdList.includes(reviewExists.userId) || !validUserIdList.includes(reviewExists.reviewerId)) {
        throw new Error('التقييم يحتوي على مراجع غير صالحة');
      }

      const review = await this.prisma.performanceReview.findFirst({
        where: { id: reviewId, companyId }
      });

      if (!review) {
        throw new Error('التقييم غير موجود');
      }

      // Parse JSON fields
      return {
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null
      };
    } catch (error) {
      console.error('❌ Error getting performance review:', error);
      throw error;
    }
  }

  /**
   * تحديث تقييم أداء
   */
  async updateReview(companyId, reviewId, data) {
    try {
      const existing = await this.prisma.performanceReview.findFirst({
        where: { id: reviewId, companyId }
      });

      if (!existing) {
        throw new Error('التقييم غير موجود');
      }

      const updateData = {};
      if (data.overallRating !== undefined) updateData.overallRating = data.overallRating;
      if (data.ratings) updateData.ratings = JSON.stringify(data.ratings);
      if (data.goals) updateData.goals = JSON.stringify(data.goals);
      if (data.goalsAchievement !== undefined) updateData.goalsAchievement = data.goalsAchievement;
      if (data.strengths !== undefined) updateData.strengths = data.strengths;
      if (data.improvements !== undefined) updateData.improvements = data.improvements;
      if (data.reviewerComments !== undefined) updateData.reviewerComments = data.reviewerComments;
      if (data.employeeComments !== undefined) updateData.employeeComments = data.employeeComments;
      if (data.recommendations) updateData.recommendations = JSON.stringify(data.recommendations);
      if (data.status) updateData.status = data.status;
      if (data.status === 'SUBMITTED') updateData.submittedAt = new Date();
      if (data.status === 'ACKNOWLEDGED') updateData.acknowledgedAt = new Date();

      const review = await this.prisma.performanceReview.update({
        where: { id: reviewId },
        data: updateData
      });

      // Parse JSON fields
      return {
        ...review,
        ratings: review.ratings ? JSON.parse(review.ratings) : null,
        goals: review.goals ? JSON.parse(review.goals) : null,
        recommendations: review.recommendations ? JSON.parse(review.recommendations) : null
      };
    } catch (error) {
      console.error('❌ Error updating performance review:', error);
      throw error;
    }
  }

  /**
   * حذف تقييم أداء
   */
  async deleteReview(companyId, reviewId) {
    try {
      const existing = await this.prisma.performanceReview.findFirst({
        where: { id: reviewId, companyId }
      });

      if (!existing) {
        throw new Error('التقييم غير موجود');
      }

      await this.prisma.performanceReview.delete({
        where: { id: reviewId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting performance review:', error);
      throw error;
    }
  }

  /**
   * إحصائيات التقييمات
   */
  async getPerformanceStats(companyId, options = {}) {
    try {
      const { employeeId, year } = options;

      // Filter out orphaned records by ensuring userId and reviewerId exist in User table
      const userWhere = { companyId };
      const validUserIds = await this.prisma.user.findMany({
        where: userWhere,
        select: { id: true }
      });
      const validUserIdList = validUserIds.map(u => u.id);

      const where = { companyId };
      
      // Handle userId filter
      if (employeeId) {
        if (validUserIdList.includes(employeeId)) {
          where.userId = employeeId;
        } else {
          // Requested employeeId doesn't exist, return empty stats
          return {
            total: 0,
            byStatus: [],
            averageRating: 0,
            byPeriod: []
          };
        }
      } else {
        // Only include reviews with valid user IDs
        if (validUserIdList.length > 0) {
          where.userId = { in: validUserIdList };
        } else {
          return {
            total: 0,
            byStatus: [],
            averageRating: 0,
            byPeriod: []
          };
        }
      }

      // Also filter by valid reviewerIds
      if (validUserIdList.length > 0) {
        where.reviewerId = { in: validUserIdList };
      } else {
        where.reviewerId = { in: [] };
      }

      if (year) {
        where.periodStart = { gte: new Date(`${year}-01-01`) };
        where.periodEnd = { lte: new Date(`${year}-12-31`) };
      }

      const [total, byStatus, averageRating, byPeriod] = await Promise.all([
        this.prisma.performanceReview.count({ where }),
        this.prisma.performanceReview.groupBy({
          by: ['status'],
          where,
          _count: true
        }),
        this.prisma.performanceReview.aggregate({
          where,
          _avg: { overallRating: true }
        }),
        this.prisma.performanceReview.groupBy({
          by: ['reviewPeriod'],
          where,
          _count: true,
          _avg: { overallRating: true }
        })
      ]);

      return {
        total,
        byStatus,
        averageRating: averageRating._avg.overallRating || 0,
        byPeriod
      };
    } catch (error) {
      console.error('❌ Error getting performance stats:', error);
      throw error;
    }
  }
}

module.exports = new PerformanceService();


















































