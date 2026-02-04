const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // معلومات المستخدم والشركة
  // استخدام String لأن Prisma IDs ليست MongoDB ObjectIds
  userId: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // نوع النشاط
  category: {
    type: String,
    required: true,
    enum: [
      'AUTH',           // المصادقة
      'ADS',            // الحملات الإعلانية
      'CONVERSATIONS',  // المحادثات
      'BILLING',        // الفواتير
      'SETTINGS',       // الإعدادات
      'SUPPORT',        // الدعم الفني
      'FILES',          // الملفات
      'USERS',          // إدارة المستخدمين
      'COMPANY',        // إدارة الشركة
      'REPORTS'         // التقارير
    ],
    index: true
  },

  action: {
    type: String,
    required: true,
    enum: [
      'CREATE',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'UPLOAD',
      'DOWNLOAD',
      'VIEW',
      'SEND',
      'RECEIVE',
      'ACTIVATE',
      'DEACTIVATE',
      'APPROVE',
      'REJECT',
      'EXPORT',
      'IMPORT',
      'SHARE',
      'ARCHIVE',
      'RESTORE'
    ],
    index: true
  },

  // التفاصيل
  description: {
    type: String,
    required: true
  },

  // العنصر المستهدف
  targetType: {
    type: String,
    enum: [
      'Campaign',
      'AdSet',
      'Ad',
      'Conversation',
      'Message',
      'User',
      'Company',
      'Ticket',
      'FAQ',
      'File',
      'Invoice',
      'Payment',
      'ApiKey',
      'Settings',
      'Report'
    ]
  },

  targetId: {
    type: String // استخدام String لأن Prisma IDs ليست MongoDB ObjectIds
  },

  targetName: {
    type: String // اسم العنصر للعرض السريع
  },

  // البيانات التفصيلية
  metadata: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    location: String,
    deviceType: String,
    browser: String,
    os: String,
    changes: [{ // للتعديلات المتعددة
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    additionalInfo: mongoose.Schema.Types.Mixed
  },

  // التصنيف والحالة
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },

  isSuccess: {
    type: Boolean,
    default: true,
    index: true
  },

  errorMessage: String,

  // للبحث والفلترة
  tags: [String],

  // منع التعديل (Immutable)
  isLocked: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  // منع التعديل بعد الإنشاء
  strict: true
});

// Indexes للأداء
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ companyId: 1, createdAt: -1 });
activityLogSchema.index({ category: 1, action: 1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });
activityLogSchema.index({ severity: 1, isSuccess: 1 });

// منع التعديل والحذف
activityLogSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.isLocked !== false) {
    return next(new Error('Activity logs are immutable and cannot be modified'));
  }
  next();
});

activityLogSchema.pre('findOneAndDelete', function(next) {
  return next(new Error('Activity logs cannot be deleted'));
});

// Virtual للحصول على معلومات المستخدم
activityLogSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual للحصول على معلومات الشركة
activityLogSchema.virtual('company', {
  ref: 'Company',
  localField: 'companyId',
  foreignField: '_id',
  justOne: true
});

// Method لتنسيق الوصف بالعربية
activityLogSchema.methods.getArabicDescription = function() {
  const actionMap = {
    CREATE: 'إنشاء',
    UPDATE: 'تعديل',
    DELETE: 'حذف',
    LOGIN: 'تسجيل دخول',
    LOGOUT: 'تسجيل خروج',
    UPLOAD: 'رفع',
    DOWNLOAD: 'تحميل',
    VIEW: 'عرض',
    SEND: 'إرسال',
    RECEIVE: 'استقبال',
    ACTIVATE: 'تفعيل',
    DEACTIVATE: 'إيقاف',
    APPROVE: 'موافقة',
    REJECT: 'رفض',
    EXPORT: 'تصدير',
    IMPORT: 'استيراد',
    SHARE: 'مشاركة',
    ARCHIVE: 'أرشفة',
    RESTORE: 'استعادة'
  };

  const categoryMap = {
    AUTH: 'المصادقة',
    ADS: 'الإعلانات',
    CONVERSATIONS: 'المحادثات',
    BILLING: 'الفواتير',
    SETTINGS: 'الإعدادات',
    SUPPORT: 'الدعم الفني',
    FILES: 'الملفات',
    USERS: 'المستخدمين',
    COMPANY: 'الشركة',
    REPORTS: 'التقارير'
  };

  return {
    action: actionMap[this.action] || this.action,
    category: categoryMap[this.category] || this.category,
    description: this.description
  };
};

// Static method لإنشاء سجل نشاط
activityLogSchema.statics.log = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating activity log:', error);
    // لا نريد أن يفشل الطلب الأصلي بسبب فشل التسجيل
    return null;
  }
};

// Static method للحصول على إحصائيات
activityLogSchema.statics.getStats = async function(companyId, startDate, endDate) {
  const match = { companyId };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          category: '$category',
          action: '$action'
        },
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: ['$isSuccess', 1, 0] }
        },
        failureCount: {
          $sum: { $cond: ['$isSuccess', 0, 1] }
        }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count',
            successCount: '$successCount',
            failureCount: '$failureCount'
          }
        },
        totalCount: { $sum: '$count' }
      }
    },
    { $sort: { totalCount: -1 } }
  ]);

  return stats;
};

// Static method لأكثر المستخدمين نشاطاً
activityLogSchema.statics.getMostActiveUsers = async function(companyId, limit = 10) {
  const users = await this.aggregate([
    { $match: { companyId } },
    {
      $group: {
        _id: '$userId',
        activityCount: { $sum: 1 },
        lastActivity: { $max: '$createdAt' }
      }
    },
    { $sort: { activityCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        activityCount: 1,
        lastActivity: 1
      }
    }
  ]);

  return users;
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
