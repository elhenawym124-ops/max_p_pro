/**
 * AI Notifications Controller
 * التحكم في إشعارات أخطاء الذكاء الاصطناعي
 */

const aiResponseMonitor = require('../services/aiResponseMonitor');

/**
 * الحصول على جميع الإشعارات للشركة
 */
const getNotifications = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const { limit = 50, unreadOnly = false } = req.query;

    const notifications = await aiResponseMonitor.getNotifications(companyId, {
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    const unreadCount = await aiResponseMonitor.getUnreadCount(companyId);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting AI notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  }
};

/**
 * الحصول على عدد الإشعارات غير المقروءة
 */
const getUnreadCount = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const unreadCount = await aiResponseMonitor.getUnreadCount(companyId);

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
};

/**
 * تعليم إشعار كمقروء (مع عزل الشركات)
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }
    
    // 🔐 SECURITY: تمرير companyId للتأكد من عزل الشركات
    const success = await aiResponseMonitor.markNotificationAsRead(id, companyId);

    if (success) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Notification not found or access denied'
      });
    }
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
};

/**
 * تعليم جميع الإشعارات كمقروءة
 */
const markAllAsRead = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const success = await aiResponseMonitor.markAllNotificationsAsRead(companyId);

    if (success) {
      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
};

/**
 * الحصول على إحصائيات الفشل
 */
const getFailureStats = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const { timeRange = 24 } = req.query; // hours
    const timeRangeMs = parseInt(timeRange) * 60 * 60 * 1000;

    const stats = await aiResponseMonitor.getFailureStats(companyId, timeRangeMs);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting failure stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get failure stats'
    });
  }
};

/**
 * حذف الإشعارات القديمة (مع عزل الشركات)
 * - المسؤولين يمكنهم حذف كل الإشعارات
 * - المستخدمين العاديين يحذفون إشعارات شركتهم فقط
 */
const cleanupOldNotifications = async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const companyId = req.user?.companyId || req.companyId;
    const userRole = req.user?.role;
    
    // 🔐 SECURITY: Super Admin يمكنه حذف جميع الإشعارات، المستخدمين العاديين لشركتهم فقط
    const targetCompanyId = (userRole === 'SUPER_ADMIN') ? null : companyId;
    
    if (!targetCompanyId && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required for non-admin users'
      });
    }

    const deletedCount = await aiResponseMonitor.cleanupOldNotifications(
      parseInt(daysToKeep),
      targetCompanyId
    );

    res.json({
      success: true,
      message: targetCompanyId 
        ? `Cleaned up ${deletedCount} old notifications for your company`
        : `Cleaned up ${deletedCount} old notifications (all companies)`,
      data: {
        deletedCount,
        scope: targetCompanyId ? 'company' : 'global'
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup notifications'
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getFailureStats,
  cleanupOldNotifications
};
