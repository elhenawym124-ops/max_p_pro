const { getSharedPrismaClient } = require('./services/sharedDatabase');
const automationService = require('./services/overdueTaskAutomationService');
require('dotenv').config();

const prisma = getSharedPrismaClient();

async function verify() {
    console.log('--- Starting Verification ---');

    // 1. Get Users
    const users = await prisma.devTeamMember.findMany({
        take: 2,
        include: { user: true }
    });
    if (users.length < 2) {
        console.log('Not enough users to test reassignment. Need at least 2.');
        if (users.length === 1) {
            console.log('Creating dummy user...');
            const dummy = await prisma.devTeamMember.create({
                data: {
                    name: 'Dummy Target',
                    email: `dummy${Date.now()}@test.com`,
                    role: 'DEVELOPER',
                    password: 'hashedpassword',
                    color: '#000000',
                    avatar: 'default.png'
                }
            });
            users.push(dummy);
        } else {
            console.error("No users found at all!");
            process.exit(1);
        }
    }
    const sourceUser = users[0];
    const targetUser = users[1];
    console.log(`Source User: ${sourceUser.user?.firstName} ${sourceUser.user?.lastName} (${sourceUser.id})`);
    console.log(`Target User: ${targetUser.user?.firstName} ${targetUser.user?.lastName} (${targetUser.id})`);

    // 2. Create Overdue Task
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 1); // 1 day ago

    const task = await prisma.devTask.create({
        data: {
            title: 'Test Overdue Task ' + Date.now(),
            description: 'This task should be escalated',
            status: 'BACKLOG',
            priority: 'MEDIUM',
            assigneeId: sourceUser.id,
            reporterId: sourceUser.id,
            dueDate: overdueDate
        }
    });
    console.log(`Created Task: ${task.title} (${task.id}) with Due Date: ${task.dueDate}`);

    // 3. Set Automation Rule
    // We want to escalate if overdue by 1 hour. Task is overdue by 24 hours.
    const rule = {
        threshold: 1,
        unit: 'hours',
        scope: 'all',
        targetId: targetUser.id
    };

    const settings = {
        rules: [rule]
    };

    // Fetch existing settings to preserve other fields
    let currentSettings = await prisma.devSystemSettings.findUnique({ where: { id: 'default' } });
    if (!currentSettings) {
        currentSettings = await prisma.devSystemSettings.create({ data: { id: 'default' } });
    }

    await prisma.devSystemSettings.update({
        where: { id: 'default' },
        data: { automationSettings: JSON.stringify(settings) }
    });
    console.log('Updated Automation Rules:', JSON.stringify(settings));

    // 4. Run Automation Check
    console.log('--- Running Automation Service ---');
    await automationService.runcheck();

    // 5. Verify Result
    const updatedTask = await prisma.devTask.findUnique({
        where: { id: task.id },
        include: { dev_task_comments: true }
    });

    let success = false;
    if (updatedTask.assigneeId === targetUser.id) {
        console.log('✅ SUCCESS: Task was reassigned to target user.');
        success = true;
    } else {
        console.error(`❌ FAILURE: Task was NOT reassigned. Expected ${targetUser.id}, got ${updatedTask.assigneeId}`);
        console.log('Task status:', updatedTask.status);
        console.log('Task dueDate:', updatedTask.dueDate);
    }

    const systemComment = updatedTask.dev_task_comments.find(c => c.content.includes('System Escalation'));
    if (systemComment) {
        console.log('✅ SUCCESS: System comment added.');
    } else {
        console.error('❌ FAILURE: No system comment found.');
        success = false;
    }

    // Cleanup
    console.log('Cleaning up...');
    await prisma.devTask.delete({ where: { id: task.id } });

    // Restore original settings
    await prisma.devSystemSettings.update({
        where: { id: 'default' },
        data: { automationSettings: currentSettings.automationSettings }
    });
    console.log('Restored original settings.');

    // Process exit logic done outside to assume standard node behavior (process keeps running if handles open)
    // But connection pool might keep it open.
    process.exit(success ? 0 : 1);
}

verify()
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
