/**
 * AI Error Task Service
 * خدمة لإنشاء مهام تلقائية عند حدوث أخطاء في AI
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

class AIErrorTaskService {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * العثور على مدير الشركة
   * @param {string} companyId - معرف الشركة
   * @returns {Promise<Object|null>} - مدير الشركة أو null
   */
  async findCompanyAdmin(companyId) {
    try {
      const admin = await this.prisma.user.findFirst({
        where: {
          companyId: companyId,
          role: 'COMPANY_ADMIN',
          isActive: true
        },
        orderBy: {
          createdAt: 'asc' // أول مدير تم إنشاؤه
        }
      });

      return admin;
    } catch (error) {
      console.error('❌ [AIErrorTaskService] Error finding company admin:', error);
      return null;
    }
  }

  /**
   * الحصول على مشروع "AI Errors" أو إنشاؤه إذا لم يكن موجوداً
   * @param {string} companyId - معرف الشركة
   * @param {string} adminId - معرف مدير الشركة
   * @returns {Promise<Object|null>} - المشروع أو null
   */
  async getOrCreateAIErrorsProject(companyId, adminId) {
    try {
      // البحث عن المشروع
      let project = await this.prisma.project.findFirst({
        where: {
          companyId: companyId,
          name: 'AI Errors'
        }
      });

      // إن لم يكن موجوداً، إنشاؤه
      if (!project) {
        project = await this.prisma.project.create({
          data: {
            companyId: companyId,
            name: 'AI Errors',
            description: 'مشروع تلقائي لتتبع أخطاء الذكاء الاصطناعي',
            status: 'ACTIVE',
            priority: 'HIGH',
            managerId: adminId,
            teamMembers: [],
            tags: ['ai_errors', 'auto_generated']
          }
        });
        console.log('✅ [AIErrorTaskService] Created AI Errors project:', project.id);
      }

      return project;
    } catch (error) {
      console.error('❌ [AIErrorTaskService] Error getting/creating AI Errors project:', error);
      return null;
    }
  }

  /**
   * إنشاء مهمة عند حدوث خطأ في AI
   * @param {Error} error - كائن الخطأ
   * @param {Object} context - السياق (companyId, conversationId, customerId, etc.)
   * @returns {Promise<Object|null>} - المهمة المنشأة أو null
   */
  async createErrorTask(error, context = {}) {
    try {
      const { companyId, conversationId, customerId, userMessage, errorType } = context;

      // التحقق من وجود companyId
      if (!companyId) {
        console.warn('⚠️ [AIErrorTaskService] No companyId provided, skipping task creation');
        return null;
      }

      // العثور على مدير الشركة
      const admin = await this.findCompanyAdmin(companyId);
      if (!admin) {
        console.warn('⚠️ [AIErrorTaskService] No company admin found, skipping task creation');
        return null;
      }

      // الحصول على مشروع AI Errors أو إنشاؤه
      const project = await this.getOrCreateAIErrorsProject(companyId, admin.id);
      if (!project) {
        console.warn('⚠️ [AIErrorTaskService] Failed to get/create AI Errors project, skipping task creation');
        return null;
      }

      // تحديد نوع الخطأ
      const classifiedErrorType = errorType || this.classifyError(error);

      // بناء عنوان المهمة
      const taskTitle = `خطأ في AI - ${this.getErrorTypeLabel(classifiedErrorType)}`;

      // بناء وصف المهمة
      const taskDescription = this.buildTaskDescription(error, context, classifiedErrorType);

      // إنشاء المهمة
      const task = await this.prisma.task.create({
        data: {
          companyId: companyId,
          projectId: project.id,
          title: taskTitle,
          description: taskDescription,
          status: 'PENDING',
          priority: 'HIGH',
          type: 'ai_error',
          assignedTo: admin.id,
          createdBy: admin.id,
          dueDate: null,
          estimatedHours: 0,
          actualHours: 0,
          progress: 0,
          tags: ['ai_error', 'auto_generated', classifiedErrorType],
          dependencies: []
        }
      });

      console.log('✅ [AIErrorTaskService] Created error task:', task.id, 'for company:', companyId);
      return task;

    } catch (taskError) {
      // معالجة الأخطاء بشكل آمن - لا نريد إيقاف العملية الرئيسية
      console.error('❌ [AIErrorTaskService] Error creating task:', taskError);
      return null;
    }
  }

  /**
   * تصنيف نوع الخطأ
   * @param {Error} error - كائن الخطأ
   * @returns {string} - نوع الخطأ
   */
  classifyError(error) {
    const errorMessage = (error.message || '').toLowerCase();
    const errorCode = error.code || error.status;

    if (errorCode === 429 || 
        errorMessage.includes('quota') || 
        errorMessage.includes('too many requests') ||
        errorMessage.includes('rate limit')) {
      return 'api_quota_exceeded';
    }

    if (errorCode === 'ECONNRESET' || 
        errorCode === 'ENOTFOUND' || 
        errorCode === 'ETIMEDOUT' ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')) {
      return 'network_timeout';
    }

    if (errorCode === 401 || 
        errorCode === 403 ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('authentication')) {
      return 'auth_error';
    }

    if (errorCode === 503 ||
        errorMessage.includes('service unavailable') ||
        errorMessage.includes('unavailable')) {
      return 'service_unavailable';
    }

    if (errorMessage.includes('invalid') ||
        errorMessage.includes('malformed') ||
        errorMessage.includes('parse')) {
      return 'invalid_response';
    }

    return 'general_error';
  }

  /**
   * الحصول على تسمية نوع الخطأ بالعربية
   * @param {string} errorType - نوع الخطأ
   * @returns {string} - التسمية بالعربية
   */
  getErrorTypeLabel(errorType) {
    const labels = {
      'api_quota_exceeded': 'تجاوز حد API',
      'network_timeout': 'انتهاء مهلة الاتصال',
      'auth_error': 'خطأ في المصادقة',
      'service_unavailable': 'الخدمة غير متاحة',
      'invalid_response': 'رد غير صحيح',
      'general_error': 'خطأ عام'
    };
    return labels[errorType] || 'خطأ غير معروف';
  }

  /**
   * بناء وصف المهمة
   * @param {Error} error - كائن الخطأ
   * @param {Object} context - السياق
   * @param {string} errorType - نوع الخطأ
   * @returns {string} - وصف المهمة
   */
  buildTaskDescription(error, context, errorType) {
    const { conversationId, customerId, userMessage } = context;
    
    let description = `تفاصيل الخطأ في الذكاء الاصطناعي:\n\n`;
    description += `نوع الخطأ: ${this.getErrorTypeLabel(errorType)} (${errorType})\n`;
    description += `رسالة الخطأ: ${error.message || 'غير متوفر'}\n\n`;

    if (conversationId) {
      description += `معرف المحادثة: ${conversationId}\n`;
    }

    if (customerId) {
      description += `معرف العميل: ${customerId}\n`;
    }

    if (userMessage) {
      const truncatedMessage = userMessage.length > 200 
        ? userMessage.substring(0, 200) + '...' 
        : userMessage;
      description += `رسالة المستخدم: ${truncatedMessage}\n`;
    }

    description += `\nالوقت: ${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}\n`;

    if (error.stack) {
      description += `\nتفاصيل تقنية:\n${error.stack.substring(0, 500)}`;
    }

    return description;
  }
}

// Export singleton instance
module.exports = new AIErrorTaskService();

