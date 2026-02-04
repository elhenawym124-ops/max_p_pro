const { getSharedPrismaClient } = require('./sharedDatabase');

class TimeTrackingService {
    constructor() {
        this.prisma = getSharedPrismaClient();
    }

    /**
     * Get Dashboard Overview Stats
     */
    async getDashboardStats(dateRange = 'today') {
        const { startDate, endDate } = this.getDateRange(dateRange);

        // Get all time logs in range
        const timeLogs = await this.prisma.devTimeLog.findMany({
            where: {
                startTime: {
                    gte: startDate,
                    lte: endDate
                },
                isRunning: false
            },
            include: {
                member: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, avatar: true }
                        }
                    }
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        type: true,
                        priority: true
                    }
                }
            }
        });

        // Get running timers
        const runningTimers = await this.prisma.devTimeLog.findMany({
            where: { isRunning: true },
            include: {
                member: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, avatar: true }
                        }
                    }
                },
                task: {
                    select: { id: true, title: true, type: true }
                }
            }
        });

        // Get tasks completed in range
        const completedTasks = await this.prisma.devTask.findMany({
            where: {
                status: 'DONE',
                completedDate: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Calculate stats
        const totalMinutes = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const totalHours = (totalMinutes / 60).toFixed(1);
        const billableMinutes = timeLogs.filter(log => log.isBillable).reduce((sum, log) => sum + (log.duration || 0), 0);
        const billableHours = (billableMinutes / 60).toFixed(1);
        
        const uniqueMembers = new Set(timeLogs.map(log => log.memberId));
        const activeMembers = runningTimers.length;
        const totalMembers = uniqueMembers.size;

        const avgTimePerTask = completedTasks.length > 0 
            ? (totalMinutes / completedTasks.length / 60).toFixed(1) 
            : 0;

        return {
            totalHours: parseFloat(totalHours),
            billableHours: parseFloat(billableHours),
            activeMembers,
            totalMembers,
            tasksCompleted: completedTasks.length,
            avgTimePerTask: parseFloat(avgTimePerTask),
            runningTimers: runningTimers.map(timer => ({
                id: timer.id,
                memberId: timer.memberId,
                memberName: `${timer.member.user.firstName} ${timer.member.user.lastName}`,
                memberAvatar: timer.member.user.avatar,
                taskId: timer.task.id,
                taskTitle: timer.task.title,
                taskType: timer.task.type,
                startTime: timer.startTime,
                elapsedMinutes: Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 60000)
            }))
        };
    }

    /**
     * Get Live Activity (Running Timers)
     */
    async getLiveActivity() {
        const runningTimers = await this.prisma.devTimeLog.findMany({
            where: { isRunning: true },
            include: {
                member: {
                    include: {
                        user: {
                            select: { 
                                id: true,
                                firstName: true, 
                                lastName: true, 
                                avatar: true,
                                department: true
                            }
                        }
                    }
                },
                task: {
                    select: { 
                        id: true, 
                        title: true, 
                        type: true,
                        priority: true,
                        project: {
                            select: { name: true, color: true }
                        }
                    }
                }
            },
            orderBy: { startTime: 'desc' }
        });

        // Get all active members (who logged time today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayLogs = await this.prisma.devTimeLog.findMany({
            where: {
                startTime: { gte: today }
            },
            select: { memberId: true },
            distinct: ['memberId']
        });

        const allMembers = await this.prisma.devTeamMember.findMany({
            where: {
                id: { in: todayLogs.map(log => log.memberId) }
            },
            include: {
                user: {
                    select: { 
                        id: true,
                        firstName: true, 
                        lastName: true, 
                        avatar: true,
                        department: true
                    }
                }
            }
        });

        return {
            runningTimers: runningTimers.map(timer => ({
                id: timer.id,
                memberId: timer.memberId,
                memberName: `${timer.member.user.firstName} ${timer.member.user.lastName}`,
                memberAvatar: timer.member.user.avatar,
                department: timer.member.user.department,
                taskId: timer.task.id,
                taskTitle: timer.task.title,
                taskType: timer.task.type,
                taskPriority: timer.task.priority,
                projectName: timer.task.project?.name,
                projectColor: timer.task.project?.color,
                startTime: timer.startTime,
                elapsedMinutes: Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 60000)
            })),
            activeMembers: allMembers.map(member => ({
                id: member.id,
                userId: member.user.id,
                name: `${member.user.firstName} ${member.user.lastName}`,
                avatar: member.user.avatar,
                department: member.user.department,
                isWorking: runningTimers.some(t => t.memberId === member.id)
            }))
        };
    }

    /**
     * Get Time Logs with Filters
     */
    async getTimeLogs(filters = {}) {
        const { 
            dateRange = 'today', 
            memberId, 
            projectId, 
            taskType,
            isBillable,
            page = 1,
            limit = 50
        } = filters;

        const { startDate, endDate } = this.getDateRange(dateRange, filters.startDate, filters.endDate);

        const where = {
            startTime: {
                gte: startDate,
                lte: endDate
            },
            isRunning: false
        };

        if (memberId) where.memberId = memberId;
        if (isBillable !== undefined) where.isBillable = isBillable === 'true' || isBillable === true;
        if (taskType) where.task = { type: taskType };
        if (projectId) where.task = { ...where.task, projectId };

        const [timeLogs, total] = await Promise.all([
            this.prisma.devTimeLog.findMany({
                where,
                include: {
                    member: {
                        include: {
                            user: {
                                select: { firstName: true, lastName: true, avatar: true }
                            }
                        }
                    },
                    task: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            type: true,
                            priority: true,
                            project: {
                                select: { name: true, color: true }
                            }
                        }
                    }
                },
                orderBy: { startTime: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            this.prisma.devTimeLog.count({ where })
        ]);

        return {
            data: timeLogs.map(log => ({
                id: log.id,
                taskId: log.taskId,
                taskTitle: log.task.title,
                taskType: log.task.type,
                taskPriority: log.task.priority,
                taskStatus: log.task.status,
                projectName: log.task.project?.name,
                projectColor: log.task.project?.color,
                memberId: log.memberId,
                memberName: `${log.member.user.firstName} ${log.member.user.lastName}`,
                memberAvatar: log.member.user.avatar,
                startTime: log.startTime,
                endTime: log.endTime,
                duration: log.duration,
                durationHours: (log.duration / 60).toFixed(2),
                description: log.description,
                isBillable: log.isBillable
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get Member Performance Report
     */
    async getMemberPerformance(filters = {}) {
        const { dateRange = 'today' } = filters;
        const { startDate, endDate } = this.getDateRange(dateRange, filters.startDate, filters.endDate);

        // Get all members with time logs
        const members = await this.prisma.devTeamMember.findMany({
            where: {
                timeLogs: {
                    some: {
                        startTime: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                }
            },
            include: {
                user: {
                    select: { 
                        id: true,
                        firstName: true, 
                        lastName: true, 
                        avatar: true,
                        department: true
                    }
                },
                timeLogs: {
                    where: {
                        startTime: {
                            gte: startDate,
                            lte: endDate
                        },
                        isRunning: false
                    },
                    include: {
                        task: {
                            select: { status: true, type: true }
                        }
                    }
                },
                assignedTasks: {
                    where: {
                        completedDate: {
                            gte: startDate,
                            lte: endDate
                        },
                        status: 'DONE'
                    }
                }
            }
        });

        return members.map(member => {
            const totalMinutes = member.timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
            const billableMinutes = member.timeLogs.filter(log => log.isBillable).reduce((sum, log) => sum + (log.duration || 0), 0);
            const tasksCompleted = member.assignedTasks.length;
            const avgTaskDuration = tasksCompleted > 0 ? totalMinutes / tasksCompleted : 0;

            // Calculate efficiency score (tasks completed per hour)
            const efficiencyScore = totalMinutes > 0 ? (tasksCompleted / (totalMinutes / 60)).toFixed(2) : 0;

            return {
                memberId: member.id,
                userId: member.user.id,
                name: `${member.user.firstName} ${member.user.lastName}`,
                avatar: member.user.avatar,
                department: member.user.department,
                totalHours: (totalMinutes / 60).toFixed(2),
                billableHours: (billableMinutes / 60).toFixed(2),
                tasksCompleted,
                avgTaskDuration: (avgTaskDuration / 60).toFixed(2),
                efficiencyScore: parseFloat(efficiencyScore),
                timeLogCount: member.timeLogs.length
            };
        }).sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours));
    }

    /**
     * Get Analytics Data for Charts
     */
    async getAnalytics(filters = {}) {
        const { dateRange = 'week' } = filters;
        const { startDate, endDate } = this.getDateRange(dateRange, filters.startDate, filters.endDate);

        // Daily hours trend
        const dailyStats = await this.getDailyStats(startDate, endDate);

        // Task type distribution
        const taskTypeStats = await this.getTaskTypeDistribution(startDate, endDate);

        // Member comparison
        const memberComparison = await this.getMemberComparison(startDate, endDate);

        // Hourly heatmap
        const hourlyHeatmap = await this.getHourlyHeatmap(startDate, endDate);

        return {
            dailyStats,
            taskTypeStats,
            memberComparison,
            hourlyHeatmap
        };
    }

    /**
     * Get Daily Stats for Trend Chart
     */
    async getDailyStats(startDate, endDate) {
        const timeLogs = await this.prisma.devTimeLog.findMany({
            where: {
                startTime: { gte: startDate, lte: endDate },
                isRunning: false
            },
            select: {
                startTime: true,
                duration: true,
                isBillable: true
            }
        });

        const dailyMap = {};
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            dailyMap[dateKey] = { total: 0, billable: 0, nonBillable: 0 };
            currentDate.setDate(currentDate.getDate() + 1);
        }

        timeLogs.forEach(log => {
            const dateKey = new Date(log.startTime).toISOString().split('T')[0];
            if (dailyMap[dateKey]) {
                const hours = log.duration / 60;
                dailyMap[dateKey].total += hours;
                if (log.isBillable) {
                    dailyMap[dateKey].billable += hours;
                } else {
                    dailyMap[dateKey].nonBillable += hours;
                }
            }
        });

        return Object.entries(dailyMap).map(([date, stats]) => ({
            date,
            totalHours: parseFloat(stats.total.toFixed(2)),
            billableHours: parseFloat(stats.billable.toFixed(2)),
            nonBillableHours: parseFloat(stats.nonBillable.toFixed(2))
        }));
    }

    /**
     * Get Task Type Distribution
     */
    async getTaskTypeDistribution(startDate, endDate) {
        const timeLogs = await this.prisma.devTimeLog.findMany({
            where: {
                startTime: { gte: startDate, lte: endDate },
                isRunning: false
            },
            include: {
                task: {
                    select: { type: true }
                }
            }
        });

        const typeMap = {};
        timeLogs.forEach(log => {
            const type = log.task.type || 'UNKNOWN';
            if (!typeMap[type]) typeMap[type] = 0;
            typeMap[type] += log.duration / 60;
        });

        return Object.entries(typeMap).map(([type, hours]) => ({
            type,
            hours: parseFloat(hours.toFixed(2)),
            percentage: 0 // Will be calculated on frontend
        }));
    }

    /**
     * Get Member Comparison
     */
    async getMemberComparison(startDate, endDate) {
        const members = await this.prisma.devTeamMember.findMany({
            where: {
                timeLogs: {
                    some: {
                        startTime: { gte: startDate, lte: endDate }
                    }
                }
            },
            include: {
                user: {
                    select: { firstName: true, lastName: true }
                },
                timeLogs: {
                    where: {
                        startTime: { gte: startDate, lte: endDate },
                        isRunning: false
                    }
                }
            },
            take: 10
        });

        return members.map(member => {
            const totalMinutes = member.timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
            return {
                name: `${member.user.firstName} ${member.user.lastName}`,
                hours: parseFloat((totalMinutes / 60).toFixed(2))
            };
        }).sort((a, b) => b.hours - a.hours);
    }

    /**
     * Get Hourly Heatmap (Day of week × Hour of day)
     */
    async getHourlyHeatmap(startDate, endDate) {
        const timeLogs = await this.prisma.devTimeLog.findMany({
            where: {
                startTime: { gte: startDate, lte: endDate },
                isRunning: false
            },
            select: {
                startTime: true,
                duration: true
            }
        });

        const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));

        timeLogs.forEach(log => {
            const date = new Date(log.startTime);
            const dayOfWeek = date.getDay(); // 0 = Sunday
            const hour = date.getHours();
            heatmap[dayOfWeek][hour] += log.duration / 60;
        });

        return heatmap;
    }

    /**
     * Export Timesheet
     */
    async exportTimesheet(filters = {}) {
        const { dateRange = 'week' } = filters;
        const { startDate, endDate } = this.getDateRange(dateRange, filters.startDate, filters.endDate);

        const timeLogs = await this.prisma.devTimeLog.findMany({
            where: {
                startTime: { gte: startDate, lte: endDate },
                isRunning: false
            },
            include: {
                member: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, email: true }
                        }
                    }
                },
                task: {
                    select: {
                        title: true,
                        type: true,
                        priority: true,
                        project: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        });

        return timeLogs.map(log => ({
            date: new Date(log.startTime).toISOString().split('T')[0],
            member: `${log.member.user.firstName} ${log.member.user.lastName}`,
            email: log.member.user.email,
            task: log.task.title,
            taskType: log.task.type,
            project: log.task.project?.name || 'N/A',
            startTime: log.startTime,
            endTime: log.endTime,
            duration: log.duration,
            hours: (log.duration / 60).toFixed(2),
            billable: log.isBillable ? 'Yes' : 'No',
            description: log.description || ''
        }));
    }

    /**
     * Helper: Get Date Range
     */
    getDateRange(range, customStart, customEnd) {
        const now = new Date();
        let startDate, endDate;

        switch (range) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'yesterday':
                startDate = new Date(now.setDate(now.getDate() - 1));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.setDate(now.getDate() - 30));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'custom':
                startDate = customStart ? new Date(customStart) : new Date(now.setDate(now.getDate() - 7));
                endDate = customEnd ? new Date(customEnd) : new Date();
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
        }

        return { startDate, endDate };
    }
}

module.exports = new TimeTrackingService();
