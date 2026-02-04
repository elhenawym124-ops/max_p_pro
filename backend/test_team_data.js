const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTeamData() {
    try {
        console.log('🔍 Testing Team Performance Data...\n');

        // Get all tasks
        const allTasks = await prisma.devTask.findMany({
            select: {
                id: true,
                title: true,
                status: true,
                assigneeId: true,
                dueDate: true,
                assignee: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`📊 Total Tasks: ${allTasks.length}\n`);

        // Group by status
        const statusGroups = {};
        allTasks.forEach(task => {
            statusGroups[task.status] = (statusGroups[task.status] || 0) + 1;
        });

        console.log('📈 Tasks by Status:');
        Object.entries(statusGroups).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });
        console.log('');

        // Get team members
        const teamMembers = await prisma.devTeamMember.findMany({
            include: {
                user: true
            }
        });

        console.log(`👥 Team Members: ${teamMembers.length}\n`);

        // Analyze each member
        teamMembers.forEach(member => {
            const memberTasks = allTasks.filter(t => t.assigneeId === member.id);
            const completed = memberTasks.filter(t => t.status === 'DONE').length;
            const inProgress = memberTasks.filter(t => t.status === 'IN_PROGRESS').length;
            const pending = memberTasks.filter(t => 
                t.status === 'TODO' || 
                t.status === 'BACKLOG' || 
                t.status === 'IN_REVIEW' ||
                t.status === 'TESTING' ||
                t.status === 'CANCELLED'
            ).length;
            
            const now = new Date();
            const overdue = memberTasks.filter(t => 
                t.status !== 'DONE' && 
                t.dueDate && 
                new Date(t.dueDate) < now
            ).length;

            console.log(`👤 ${member.user.firstName} ${member.user.lastName}:`);
            console.log(`   Total: ${memberTasks.length}`);
            console.log(`   ✅ Completed: ${completed}`);
            console.log(`   ⏳ In Progress: ${inProgress}`);
            console.log(`   📋 Pending: ${pending}`);
            console.log(`   ⚠️  Overdue: ${overdue}`);
            console.log(`   📊 Completion Rate: ${memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0}%`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testTeamData();
