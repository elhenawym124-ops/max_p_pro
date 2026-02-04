const { getSharedPrismaClient } = require('./sharedDatabase');
const devSettingsService = require('./devSettingsService');
const devTeamService = require('./devTeamService');
const activityLogger = require('./activityLogger');

class OverdueTaskAutomationService {
    constructor() {
        this.prisma = getSharedPrismaClient();
    }

    /**
     * Run the automation check
     */
    async runcheck() {
        console.log('🤖 [AUTOMATION] Starting overdue task check...');
        try {
            // 1. Get Settings
            const settings = await devSettingsService.getSettings();
            if (!settings.automationSettings || !settings.automationSettings.rules) {
                console.log('🤖 [AUTOMATION] No rules defined. Skipping.');
                return;
            }

            const rules = settings.automationSettings.rules;
            console.log(`🤖 [AUTOMATION] Found ${rules.length} rules.`);

            for (const rule of rules) {
                await this.processRule(rule);
            }

        } catch (error) {
            console.error('❌ [AUTOMATION] Error running check:', error);
        }
    }

    /**
     * Process a single rule
     */
    async processRule(rule) {
        // rule: { threshold: number, unit: 'hours', scope: 'all'|userId, action: 'assign', targetId: userId }

        // Calculate cutoff date
        const now = new Date();
        const cutoff = new Date(now);
        if (rule.unit === 'days') {
            cutoff.setDate(cutoff.getDate() - rule.threshold);
        } else {
            cutoff.setHours(cutoff.getHours() - rule.threshold);
        }

        console.log(`🤖 [AUTOMATION] Processing rule: Overdue by ${rule.threshold} ${rule.unit} (Cutoff: ${cutoff.toISOString()})`);

        // Build Query
        const where = {
            status: { not: 'DONE' }, // Only active tasks
            dueDate: { lt: cutoff }, // Overdue
            // Prevent infinite loops: Don't reassign if already assigned to target
            assigneeId: { not: rule.targetId }
        };

        if (rule.scope !== 'all') {
            where.assigneeId = rule.scope;
        }

        // Find Tasks
        const tasks = await this.prisma.devTask.findMany({
            where,
            include: { assignee: { include: { user: true } } }
        });

        console.log(`🤖 [AUTOMATION] Found ${tasks.length} tasks matching rule.`);

        // Apply Action
        for (const task of tasks) {
            await this.escalateTask(task, rule);
        }
    }

    /**
     * Get a valid author ID for system comments
     */
    async getSystemAuthorId() {
        // 1. Try to find a user named "System" (via User relation)
        const systemUser = await this.prisma.devTeamMember.findFirst({
            where: {
                user: {
                    OR: [
                        { firstName: { contains: 'System' } },
                        { lastName: { contains: 'System' } },
                        { email: { contains: 'system' } }
                    ]
                }
            }
        });
        if (systemUser) return systemUser.id;

        // 2. Fallback: Find the first Owner/Admin
        const adminUser = await this.prisma.devTeamMember.findFirst({
            where: { role: { in: ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'] } }
        });

        if (adminUser) return adminUser.id;

        // 3. Fallback: Any member
        const anyMember = await this.prisma.devTeamMember.findFirst();
        return anyMember?.id;
    }

    /**
     * Escalate a task
     */
    async escalateTask(task, rule) {
        console.log(`🤖 [AUTOMATION] Escalating task ${task.title} (${task.id}) -> Target User ID: ${rule.targetId}`);

        try {
            const authorId = await this.getSystemAuthorId();
            if (!authorId) {
                console.error('❌ [AUTOMATION] No valid author ID found for system comment');
                return;
            }

            // 1. Get valid target member ID (handling virtual users)
            const targetMemberId = await devTeamService.getOrCreateMember(rule.targetId);

            if (!targetMemberId) {
                console.error(`❌ [AUTOMATION] Failed to resolve target member for ID: ${rule.targetId}`);
                return;
            }

            // 2. Reassign
            const oldAssigneeId = task.assigneeId;

            await this.prisma.devTask.update({
                where: { id: task.id },
                data: { assigneeId: targetMemberId }
            });

            // 3. Add Comment
            const oldAssigneeName = task.assignee?.user?.firstName || 'Unknown';
            await this.prisma.devTaskComment.create({
                data: {
                    taskId: task.id,
                    content: `🤖 **System Escalation**: This task was overdue by more than ${rule.threshold} ${rule.unit}. Automatically reassigned from ${oldAssigneeName} to new owner.`,
                    authorId: authorId
                }
            });

            // 4. Log Activity for History
            await activityLogger.logTaskEscalated(
                task.id,
                authorId, // System user performs the action
                oldAssigneeId,
                targetMemberId,
                `Overdue by ${rule.threshold} ${rule.unit}`
            );

            console.log(`✅ [AUTOMATION] Task ${task.id} escalated successfully to ${targetMemberId}`);

            // 5. Notify (Todo: Integrate with notification system)
            // await notificationService.sendEscalationNotification(...)

        } catch (error) {
            console.error(`❌ [AUTOMATION] Failed to escalate task ${task.id}:`, error);
        }
    }
}

module.exports = new OverdueTaskAutomationService();
