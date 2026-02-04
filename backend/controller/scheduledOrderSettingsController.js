const scheduledOrderService = require('../services/scheduledOrderService');

const getSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح بالوصول' 
      });
    }

    const settings = await scheduledOrderService.getScheduledOrderSettings(companyId);
    
    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ [SCHEDULED-SETTINGS] Error getting settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإعدادات',
      error: error.message
    });
  }
};

const updateSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح بالوصول' 
      });
    }

    const result = await scheduledOrderService.updateScheduledOrderSettings(companyId, req.body);
    
    return res.json(result);
  } catch (error) {
    console.error('❌ [SCHEDULED-SETTINGS] Error updating settings:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الإعدادات',
      error: error.message
    });
  }
};

const getStats = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح بالوصول' 
      });
    }

    const result = await scheduledOrderService.getScheduledOrdersStats(companyId);
    
    return res.json(result);
  } catch (error) {
    console.error('❌ [SCHEDULED-SETTINGS] Error getting stats:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الإحصائيات',
      error: error.message
    });
  }
};

const getUpcomingOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح بالوصول' 
      });
    }

    const hoursAhead = parseInt(req.query.hoursAhead) || 24;
    const result = await scheduledOrderService.checkUpcomingScheduledOrders(companyId, hoursAhead);
    
    return res.json(result);
  } catch (error) {
    console.error('❌ [SCHEDULED-SETTINGS] Error getting upcoming orders:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الطلبات القادمة',
      error: error.message
    });
  }
};

const manualTransition = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح بالوصول' 
      });
    }

    const result = await scheduledOrderService.checkAndTransitionScheduledOrders(companyId);
    
    return res.json(result);
  } catch (error) {
    console.error('❌ [SCHEDULED-SETTINGS] Error in manual transition:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحويل اليدوي',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getStats,
  getUpcomingOrders,
  manualTransition
};
