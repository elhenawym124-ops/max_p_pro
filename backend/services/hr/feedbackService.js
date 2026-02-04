/**
 * 💬 Feedback Service
 * خدمة التغذية الراجعة
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class FeedbackService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  async createFeedback(companyId, fromUserId, data) {
    try {
      console.log('📝 Creating feedback:', { companyId, fromUserId, data });
      
      const feedback = await this.prisma.feedback.create({
        data: {
          companyId,
          fromUserId,
          toUserId: data.toUserId || null,
          type: data.type || 'PEER',
          category: data.category,
          content: data.content,
          rating: data.rating,
          isAnonymous: data.isAnonymous || false,
          status: data.status || 'ACTIVE'
        }
      });
      
      console.log('✅ Feedback created successfully:', feedback.id);
      
      // Fetch user details separately
      const fromUser = fromUserId
        ? await this.prisma.user.findUnique({
            where: { id: fromUserId },
            select: { id: true, firstName: true, lastName: true }
          })
        : null;

      const toUser = data.toUserId
        ? await this.prisma.user.findUnique({
            where: { id: data.toUserId },
            select: { id: true, firstName: true, lastName: true }
          })
        : null;

      return {
        ...feedback,
        fromEmployee: fromUser,
        toEmployee: toUser
      };
    } catch (error) {
      console.error('❌ Error creating feedback:', error);
      throw new Error(`فشل في إنشاء التغذية الراجعة: ${error.message}`);
    }
  }

  async getFeedback(companyId, options = {}) {
    try {
      const { toUserId, fromUserId, type, limit = 50 } = options;
      const where = { companyId };
      
      if (toUserId) where.toUserId = toUserId;
      if (fromUserId) where.fromUserId = fromUserId;
      if (type) where.type = type;

      console.log('🔍 Fetching feedback with filters:', where);

      const feedback = await this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit)
      });

      console.log(`✅ Found ${feedback.length} feedback records`);

      // Manually fetch user details if needed
      const feedbackWithUsers = await Promise.all(
        feedback.map(async (item) => {
          const fromUser = item.fromUserId
            ? await this.prisma.user.findUnique({
                where: { id: item.fromUserId },
                select: { id: true, firstName: true, lastName: true, email: true }
              })
            : null;

          const toUser = item.toUserId
            ? await this.prisma.user.findUnique({
                where: { id: item.toUserId },
                select: { id: true, firstName: true, lastName: true, email: true }
              })
            : null;

          return {
            ...item,
            fromEmployee: fromUser,
            toEmployee: toUser
          };
        })
      );

      return feedbackWithUsers;
    } catch (error) {
      console.error('❌ Error getting feedback:', error);
      throw new Error(`فشل في جلب التغذية الراجعة: ${error.message}`);
    }
  }

  async getFeedbackById(companyId, feedbackId) {
    try {
      const feedback = await this.prisma.feedback.findFirst({
        where: { id: feedbackId, companyId },
        include: {
          company: true
        }
      });

      if (!feedback) throw new Error('التغذية الراجعة غير موجودة');

      // Manually fetch user details
      const fromUser = feedback.fromUserId
        ? await this.prisma.user.findUnique({
            where: { id: feedback.fromUserId },
            select: { id: true, firstName: true, lastName: true, email: true }
          })
        : null;

      const toUser = feedback.toUserId
        ? await this.prisma.user.findUnique({
            where: { id: feedback.toUserId },
            select: { id: true, firstName: true, lastName: true, email: true }
          })
        : null;

      return {
        ...feedback,
        fromEmployee: fromUser,
        toEmployee: toUser
      };
    } catch (error) {
      console.error('❌ Error getting feedback:', error);
      throw error;
    }
  }

  async updateFeedback(companyId, feedbackId, data) {
    try {
      const existing = await this.prisma.feedback.findFirst({
        where: { id: feedbackId, companyId }
      });
      if (!existing) throw new Error('التغذية الراجعة غير موجودة');

      console.log('📝 Updating feedback:', feedbackId);

      const feedback = await this.prisma.feedback.update({
        where: { id: feedbackId },
        data
      });
      
      // Fetch user details separately
      const fromUser = feedback.fromUserId
        ? await this.prisma.user.findUnique({
            where: { id: feedback.fromUserId },
            select: { id: true, firstName: true, lastName: true }
          })
        : null;

      const toUser = feedback.toUserId
        ? await this.prisma.user.findUnique({
            where: { id: feedback.toUserId },
            select: { id: true, firstName: true, lastName: true }
          })
        : null;

      return {
        ...feedback,
        fromEmployee: fromUser,
        toEmployee: toUser
      };
    } catch (error) {
      console.error('❌ Error updating feedback:', error);
      throw new Error(`فشل في تحديث التغذية الراجعة: ${error.message}`);
    }
  }

  async deleteFeedback(companyId, feedbackId) {
    try {
      const existing = await this.prisma.feedback.findFirst({
        where: { id: feedbackId, companyId }
      });
      if (!existing) throw new Error('التغذية الراجعة غير موجودة');

      await this.prisma.feedback.delete({ where: { id: feedbackId } });
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting feedback:', error);
      throw error;
    }
  }

  async getFeedbackStats(companyId, options = {}) {
    try {
      const { userId } = options;
      const where = { companyId };
      if (userId) where.toUserId = userId;

      const [total, byType, averageRating] = await Promise.all([
        this.prisma.feedback.count({ where }),
        this.prisma.feedback.groupBy({
          by: ['type'],
          where,
          _count: true
        }),
        this.prisma.feedback.aggregate({
          where: { ...where, rating: { not: null } },
          _avg: { rating: true }
        })
      ]);

      return {
        total,
        byType,
        averageRating: averageRating._avg.rating || 0
      };
    } catch (error) {
      console.error('❌ Error getting feedback stats:', error);
      throw error;
    }
  }
}

module.exports = new FeedbackService();

















































