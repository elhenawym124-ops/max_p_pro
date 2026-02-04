const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFilters() {
    console.log('🧪 Testing Dev Task Filters...');

    try {
        // 0. Get a reporter (DevTeamMember)
        const reporter = await prisma.devTeamMember.findFirst();
        if (!reporter) {
            console.error('❌ No DevTeamMember found. Cannot create task.');
            return;
        }
        console.log('👤 Using reporter:', reporter.id);

        // 1. Create a dummy task with specific attributes
        const testTask = await prisma.devTask.create({
            data: {
                id: 'test-task-' + Date.now(),
                title: 'Test Filter Task ' + Date.now(),
                description: 'Testing advanced filters',
                status: 'IN_PROGRESS',
                priority: 'HIGH',
                type: 'BUG',
                tags: JSON.stringify(['urgent', 'backend']), // Stored as JSON string
                component: 'backend',
                estimatedHours: 1,
                actualHours: 0,
                progress: 0,
                reporterId: reporter.id, // Required relation
                updatedAt: new Date()
            }
        });
        console.log('✅ Created test task:', testTask.id);

        // 2. Test Component Filter
        console.log('\n🔍 Testing Component Filter (backend)...');
        const componentTasks = await prisma.devTask.findMany({
            where: { component: 'backend' }
        });
        console.log(`Found ${componentTasks.length} tasks with component='backend'`);
        if (!componentTasks.find(t => t.id === testTask.id)) console.error('❌ Failed to find test task by component');

        // 3. Test Tags Filter (Simulating the logic in controller)
        console.log('\n🔍 Testing Tags Filter (urgent)...');
        const tag = 'urgent';
        // Logic from controller: tags: { contains: tag }
        const tagTasks = await prisma.devTask.findMany({
            where: {
                tags: { contains: tag }
            }
        });
        console.log(`Found ${tagTasks.length} tasks with tag='urgent'`);
        if (!tagTasks.find(t => t.id === testTask.id)) console.error('❌ Failed to find test task by tag');

        // 4. Test Date Filter (createdAt)
        console.log('\n🔍 Testing Date Filter (createdAt)...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateTasks = await prisma.devTask.findMany({
            where: {
                createdAt: {
                    gte: yesterday,
                    lte: tomorrow
                }
            }
        });
        console.log(`Found ${dateTasks.length} tasks created in last 24h`);
        if (!dateTasks.find(t => t.id === testTask.id)) console.error('❌ Failed to find test task by date');

        // Cleanup
        await prisma.devTask.delete({ where: { id: testTask.id } });
        console.log('\n✅ Cleanup done.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testFilters();
