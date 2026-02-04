const dashboardService = require('../services/dashboardService');

const getRealDashboardStatistics = async (req, res) => {
    const { companyId } = req.params;

    try {
        const result = await dashboardService.getRealDashboardStats(companyId);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب إحصائيات لوحة التحكم'
        });
    }
};

const getRecentActivities = async (req, res) => {
    const { companyId } = req.params;
    const { limit } = req.query;

    try {
        const result = await dashboardService.getRecentActivities(companyId, parseInt(limit) || 10);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting recent activities:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب الأنشطة الأخيرة'
        });
    }
};

const getRealTimeMetrics = async (req, res) => {
    const { companyId } = req.params;

    try {
        const result = await dashboardService.getRealTimeMetrics(companyId);
        res.json(result);
    } catch (error) {
        console.error('Error getting real-time metrics:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب المقاييس المباشرة'
        });
    }
};

module.exports = {
    getRealDashboardStatistics , 
    getRealTimeMetrics , getRecentActivities
}