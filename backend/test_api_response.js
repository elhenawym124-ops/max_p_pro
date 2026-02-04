const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPIResponse() {
    try {
        const period = 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        const allTasks = await prisma.devTask.findMany({
            where: { createdAt: { gte: startDate } },
            include: {
                assignee: { include: { user: true } },
                project: true
            }
        });

        const teamMembersData = await prisma.devTeamMember.findMany({
            include: { user: true }
        });

        const teamPerformance = teamMembersData.map(member => {
            const memberTasks = allTasks.filter(t => t.assigneeId === member.id);
            const completed = memberTasks.filter(t => t.status === 'DONE').length;
            const inProgress = memberTasks.filter(t => t.status === 'IN_PROGRESS').length;
            
            // المهام غير المكتملة (TODO, BACKLOG, IN_REVIEW, TESTING, CANCELLED)
            const pending = memberTasks.filter(t => 
                t.status === 'TODO' || 
                t.status === 'BACKLOG' || 
                t.status === 'IN_REVIEW' ||
                t.status === 'TESTING' ||
                t.status === 'CANCELLED'
            ).length;
            
            // المهام المتأخرة
            const now = new Date();
            const overdue = memberTasks.filter(t => 
                t.status !== 'DONE' && 
                t.dueDate && 
                new Date(t.dueDate) < now
            ).length;
            
            const totalTasks = memberTasks.length;

            return {
                memberId: member.id,
                memberName: `${member.user.firstName} ${member.user.lastName}`,
                tasksCompleted: completed,
                tasksInProgress: inProgress,
                pendingTasks: pending,
                overdueTasks: overdue,
                totalTasks: totalTasks,
                completionRate: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0
            };
        });

        console.log('📊 API Response - Team Performance:');
        console.log(JSON.stringify(teamPerformance, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAPIResponse();
