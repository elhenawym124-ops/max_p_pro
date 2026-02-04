const { getSharedPrismaClient } = require('./sharedDatabase');

class DevSettingsService {
    constructor() {
        this.prisma = getSharedPrismaClient();
    }

    async getSettings() {
        let settings = await this.prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });



        if (!settings) {
            console.log('⚠️ [devSettingsService] No settings found, creating new record');
            // 🔐 Seed default settings with production-ready roles (matching development environment)
            // This ensures consistency between dev and production environments
            settings = await this.prisma.devSystemSettings.create({
                data: {
                    id: 'default',
                    taskStatuses: JSON.stringify([
                        { value: 'BACKLOG', label: 'Backlog', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
                        { value: 'TODO', label: 'To Do', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
                        { value: 'IN_PROGRESS', label: 'In Progress', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
                        { value: 'IN_REVIEW', label: 'In Review', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
                        { value: 'TESTING', label: 'Testing', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
                        { value: 'DONE', label: 'Done', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
                        { value: 'CANCELLED', label: 'Cancelled', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' }
                    ]),
                    taskPriorities: JSON.stringify([
                        { value: 'LOW', label: 'Low', color: '#94a3b8' },
                        { value: 'MEDIUM', label: 'Medium', color: '#3b82f6' },
                        { value: 'HIGH', label: 'High', color: '#f97316' },
                        { value: 'URGENT', label: 'Urgent', color: '#ef4444' },
                        { value: 'CRITICAL', label: 'Critical', color: '#991b1b' }
                    ]),
                    permissions: JSON.stringify({
                        'Project Manager': {
                            canCreate: true,
                            canEdit: true,
                            canDelete: true,
                            canChangeStatus: true,
                            canComment: true,
                            canAssign: true,
                            canArchive: true,
                            canViewReports: true,
                            canManageProjects: true,
                            canExport: true,
                            canAccessSettings: true,
                            canManageTaskSettings: true,
                            canViewAll: true,
                            viewScope: 'all'
                        },
                        'Team Lead': {
                            canCreate: true,
                            canEdit: true,
                            canDelete: true,
                            canChangeStatus: true,
                            canComment: true,
                            canAssign: true,
                            canArchive: true,
                            canViewReports: true,
                            canManageProjects: false,
                            canExport: true,
                            canAccessSettings: true,
                            canManageTaskSettings: false,
                            canViewAll: true,
                            viewScope: 'all'
                        },
                        'Developer': {
                            canCreate: true,
                            canEdit: true,
                            canDelete: false,
                            canChangeStatus: true,
                            canComment: true,
                            canAssign: false,
                            canArchive: false,
                            canViewReports: false,
                            canManageProjects: false,
                            canExport: false,
                            canAccessSettings: false,
                            canManageTaskSettings: false,
                            canViewAll: false,
                            viewScope: 'project'
                        },
                        'Tester': {
                            canCreate: true,
                            canEdit: true,
                            canDelete: false,
                            canChangeStatus: true,
                            canComment: true,
                            canAssign: false,
                            canArchive: false,
                            canViewReports: true,
                            canManageProjects: false,
                            canExport: false,
                            canAccessSettings: false,
                            canManageTaskSettings: false,
                            canViewAll: false,
                            viewScope: 'all'
                        },
                        'Agent': {
                            canCreate: true,
                            canEdit: true,
                            canDelete: false,
                            canChangeStatus: true,
                            canComment: true,
                            canAssign: false,
                            canArchive: false,
                            canViewReports: false,
                            canManageProjects: false,
                            canExport: false,
                            canAccessSettings: false,
                            canManageTaskSettings: false,
                            canViewAll: false,
                            viewScope: 'assigned_only'
                        }
                    }),
                    componentMappings: JSON.stringify({}),
                    autoTestingSubtask: false,
                    autoTestingAssigneeId: null,
                    leaderboardSettings: JSON.stringify({
                        baseXP: 10,
                        taskTypeScores: {
                            'BUG': 15,
                            'FEATURE': 20,
                            'ENHANCEMENT': 10,
                            'HOTFIX': 25,
                            'REFACTOR': 15,
                            'SECURITY': 30,
                            'DOCUMENTATION': 5,
                            'TESTING': 8,
                            'PERFORMANCE': 20,
                            'MAINTENANCE': 5
                        },
                        priorityScores: {
                            'CRITICAL': 20,
                            'URGENT': 20,
                            'HIGH': 15,
                            'MEDIUM': 5,
                            'LOW': 0
                        },
                        timeBasedScoring: {
                            enabled: true,
                            earlyCompletionBonus: 20, // % bonus for completing before estimated time
                            onTimeBonus: 10, // % bonus for completing on time (within 10% of estimate)
                            lateCompletionPenalty: 15, // % penalty for completing late
                            maxBonusPercent: 50, // Maximum bonus percentage
                            maxPenaltyPercent: 30 // Maximum penalty percentage
                        },
                        taskDetailsVisibility: {
                            showDescription: true,
                            showRelatedLinks: true,
                            showChecklists: true,
                            showBusinessValue: true,
                            showAcceptanceCriteria: true,
                            showAttachments: true,
                            showCreatedAt: true
                        }
                    }),
                    timezone: 'Africa/Cairo'
                }
            });
        }

        // Migration: If timezone is missing, set default
        if (!settings.timezone) {
            console.log('🔄 [devSettingsService] Migrating: Adding default timezone');
            settings = await this.prisma.devSystemSettings.update({
                where: { id: 'default' },
                data: { timezone: 'Africa/Cairo' }
            });
        }

        // Migration: If leaderboardSettings is missing, add default values
        if (!settings.leaderboardSettings) {
            console.log('🔄 [devSettingsService] Migrating: Adding default leaderboardSettings');
            settings = await this.prisma.devSystemSettings.update({
                where: { id: 'default' },
                data: {
                    leaderboardSettings: JSON.stringify({
                        baseXP: 10,
                        taskTypeScores: {
                            'BUG': 15,
                            'FEATURE': 20,
                            'ENHANCEMENT': 10,
                            'HOTFIX': 25,
                            'REFACTOR': 15,
                            'SECURITY': 30,
                            'DOCUMENTATION': 5,
                            'TESTING': 8,
                            'PERFORMANCE': 20,
                            'MAINTENANCE': 5
                        },
                        priorityScores: {
                            'CRITICAL': 20,
                            'URGENT': 20,
                            'HIGH': 15,
                            'MEDIUM': 5,
                            'LOW': 0
                        },
                        timeBasedScoring: {
                            enabled: true,
                            earlyCompletionBonus: 20,
                            onTimeBonus: 10,
                            lateCompletionPenalty: 15,
                            maxBonusPercent: 50,
                            maxPenaltyPercent: 30
                        }
                    })
                }
            });
        }

        // Migration: If taskDetailsVisibility is missing, add default values
        if (!settings.taskDetailsVisibility) {
            console.log('🔄 [devSettingsService] Migrating: Adding default taskDetailsVisibility');
            settings = await this.prisma.devSystemSettings.update({
                where: { id: 'default' },
                data: {
                    taskDetailsVisibility: JSON.stringify({
                        showDescription: true,
                        showRelatedLinks: true,
                        showChecklists: true,
                        showBusinessValue: true,
                        showAcceptanceCriteria: true,
                        showAttachments: true,
                        showCreatedAt: true
                    })
                }
            });
        }

        // Migration: If automationSettings is missing, add default values
        if (!settings.automationSettings) {
            console.log('🔄 [devSettingsService] Migrating: Adding default automationSettings');
            settings = await this.prisma.devSystemSettings.update({
                where: { id: 'default' },
                data: {
                    automationSettings: JSON.stringify({
                        rules: []
                    })
                }
            });
        }

        return {
            ...settings,
            taskStatuses: this._parseJSON(settings.taskStatuses),
            taskPriorities: this._parseJSON(settings.taskPriorities),
            permissions: this._parseJSON(settings.permissions),
            componentMappings: this._parseJSON(settings.componentMappings),
            leaderboardSettings: this._parseJSON(settings.leaderboardSettings),
            taskDetailsVisibility: this._parseJSON(settings.taskDetailsVisibility),
            automationSettings: this._parseJSON(settings.automationSettings)
        };
    }

    async updateSettings(data) {
        const updateData = {};
        if (data.taskStatuses) updateData.taskStatuses = JSON.stringify(data.taskStatuses);
        if (data.taskPriorities) updateData.taskPriorities = JSON.stringify(data.taskPriorities);
        if (data.permissions) updateData.permissions = JSON.stringify(data.permissions);
        if (data.componentMappings) updateData.componentMappings = JSON.stringify(data.componentMappings);
        if (typeof data.autoTestingSubtask !== 'undefined') updateData.autoTestingSubtask = data.autoTestingSubtask;
        if (typeof data.autoTestingAssigneeId !== 'undefined') updateData.autoTestingAssigneeId = data.autoTestingAssigneeId;
        if (data.leaderboardSettings) {
            updateData.leaderboardSettings = JSON.stringify(data.leaderboardSettings);
        }
        if (data.taskDetailsVisibility) {
            updateData.taskDetailsVisibility = JSON.stringify(data.taskDetailsVisibility);
        }
        if (data.automationSettings) {
            updateData.automationSettings = JSON.stringify(data.automationSettings);
        }
        if (data.timezone) {
            updateData.timezone = data.timezone;
        }

        const settings = await this.prisma.devSystemSettings.update({
            where: { id: 'default' },
            data: updateData
        });

        const result = {
            ...settings,
            taskStatuses: this._parseJSON(settings.taskStatuses),
            taskPriorities: this._parseJSON(settings.taskPriorities),
            permissions: this._parseJSON(settings.permissions),
            componentMappings: this._parseJSON(settings.componentMappings),
            leaderboardSettings: this._parseJSON(settings.leaderboardSettings),
            taskDetailsVisibility: this._parseJSON(settings.taskDetailsVisibility),
            automationSettings: this._parseJSON(settings.automationSettings)
        };


        return result;
    }

    _parseJSON(str) {
        try {
            return str ? JSON.parse(str) : null;
        } catch (e) {
            console.error('⚠️ [devSettingsService] JSON parse error:', e);
            return null;
        }
    }
}

module.exports = new DevSettingsService();
