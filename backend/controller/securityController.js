const { securityMonitor } = require('../middleware/securityMonitor');
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const getSecurityStats = async(req, res) => {
  try {
    const report = securityMonitor.getDailySecurityReport();
    res.json({
      success: true,
      data: report,
      message: 'التقرير الأمني اليومي'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التقرير الأمني'
    });
  }
};


const getSecurityReports = async (req, res) => {
  try {
    const report = securityMonitor.getDailySecurityReport();
    res.json({
      success: true,
      data: report,
      message: 'التقرير الأمني اليومي'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التقرير الأمني'
    });
  }

};


module.exports = {
  getSecurityStats,
  getSecurityReports
};
