const timeTrackingService = require('../services/timeTrackingService');

/**
 * Get Dashboard Overview Stats
 */
const getDashboardStats = async (req, res) => {
    try {
        const { dateRange = 'today' } = req.query;
        const stats = await timeTrackingService.getDashboardStats(dateRange);
        
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ [TIME-TRACKING] Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب إحصائيات اللوحة',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get Live Activity (Running Timers)
 */
const getLiveActivity = async (req, res) => {
    try {
        const activity = await timeTrackingService.getLiveActivity();
        
        res.status(200).json({
            success: true,
            data: activity
        });
    } catch (error) {
        console.error('❌ [TIME-TRACKING] Error getting live activity:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب النشاط الحي',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get Time Logs with Filters
 */
const getTimeLogs = async (req, res) => {
    try {
        const filters = {
            dateRange: req.query.dateRange || 'today',
            memberId: req.query.memberId,
            projectId: req.query.projectId,
            taskType: req.query.taskType,
            isBillable: req.query.isBillable,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        const result = await timeTrackingService.getTimeLogs(filters);
        
        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('❌ [TIME-TRACKING] Error getting time logs:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب سجلات الوقت',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get Member Performance Report
 */
const getMemberPerformance = async (req, res) => {
    try {
        const filters = {
            dateRange: req.query.dateRange || 'today',
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const performance = await timeTrackingService.getMemberPerformance(filters);
        
        res.status(200).json({
            success: true,
            data: performance
        });
    } catch (error) {
        console.error('❌ [TIME-TRACKING] Error getting member performance:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب تقرير أداء الأعضاء',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get Analytics Data for Charts
 */
const getAnalytics = async (req, res) => {
    try {
        const filters = {
            dateRange: req.query.dateRange || 'week',
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const analytics = await timeTrackingService.getAnalytics(filters);
        
        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('❌ [TIME-TRACKING] Error getting analytics:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب التحليلات',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Export Timesheet
 */
const exportTimesheet = async (req, res) => {
    try {
        const filters = {
            dateRange: req.query.dateRange || 'week',
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const format = req.query.format || 'json';
        const data = await timeTrackingService.exportTimesheet(filters);

        if (format === 'csv') {
            // Convert to CSV
            const headers = Object.keys(data[0] || {});
            const csvRows = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' && value.includes(',') 
                        ? `"${value}"` 
                        : value;
                }).join(','))
            ];
            const csv = csvRows.join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=timesheet-${new Date().toISOString().split('T')[0]}.csv`);
            res.status(200).send(csv);
        } else {
            // Return JSON
            res.status(200).json({
                success: true,
                data
            });
        }
    } catch (error) {
        console.error('❌ [TIME-TRACKING] Error exporting timesheet:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تصدير الجدول الزمني',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get Member Detail Report
 */
const getMemberDetail = async (req, res) => {
    try {
        const { memberId } = req.params;
        const filters = {
            dateRange: req.query.dateRange || 'week',
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const { startDate, endDate } = timeTrackingService.getDateRange(
            filters.dateRange, 
            filters.startDate, 
            filters.endDate
        );

        // Get member info
        const member = await timeTrackingService.prisma.devTeamMember.findUnique({
            where: { id: memberId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true,
                        department: true
                    }
                }
            }
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        // Get time logs
        const timeLogs = await timeTrackingService.prisma.devTimeLog.findMany({
            where: {
                memberId,
                startTime: { gte: startDate, lte: endDate },
                isRunning: false
            },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        priority: true,
                        status: true,
                        project: {
                            select: { name: true, color: true }
                        }
                    }
                }
            },
            orderBy: { startTime: 'desc' }
        });

        // Get completed tasks
        const completedTasks = await timeTrackingService.prisma.devTask.findMany({
            where: {
                assigneeId: memberId,
                status: 'DONE',
                completedDate: { gte: startDate, lte: endDate }
            },
            select: {
                id: true,
                title: true,
                type: true,
                completedDate: true
            }
        });

        // Calculate stats
        const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const billableMinutes = timeLogs.filter(log => log.isBillable).reduce((sum, log) => sum + (log.duration || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                member: {
                    id: member.id,
                    userId: member.user.id,
                    name: `${member.user.firstName} ${member.user.lastName}`,
                    email: member.user.email,
                    avatar: member.user.avatar,
                    department: member.user.department
                },
                stats: {
                    totalHours: (totalMinutes / 60).toFixed(2),
                    billableHours: (billableMinutes / 60).toFixed(2),
                    tasksCompleted: completedTasks.length,
                    timeLogCount: timeLogs.length,
                    avgTaskDuration: completedTasks.length > 0 
                        ? (totalMinutes / completedTasks.length / 60).toFixed(2) 
                        : 0
                },
                timeLogs: timeLogs.map(log => ({
                    id: log.id,
                    taskId: log.task.id,
                    taskTitle: log.task.title,
                    taskType: log.task.type,
                    taskPriority: log.task.priority,
                    projectName: log.task.project?.name,
                    projectColor: log.task.project?.color,
                    startTime: log.startTime,
                    endTime: log.endTime,
                    duration: log.duration,
                    hours: (log.duration / 60).toFixed(2),
                    isBillable: log.isBillable,
                    description: log.description
                })),
                completedTasks
            }
        });
    } catch (error) {
        console.error('❌ [TIME-TRACKING] Error getting member detail:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب تفاصيل العضو',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getDashboardStats,
    getLiveActivity,
    getTimeLogs,
    getMemberPerformance,
    getAnalytics,
    exportTimesheet,
    getMemberDetail
};
