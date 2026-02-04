const { getSharedPrismaClient } = require('../services/sharedDatabase');
const automationService = require('../services/overdueTaskAutomationService');
const devTeamService = require('../services/devTeamService');
require('dotenv').config({ path: '../.env' }); // Also fix dotenv path if needed, but usually it finds nearest? Safest to point to root.
// Wait, manual_verify_overdue.js used require('dotenv').config();
// Let's assume .env is in backend root.
// If I run from backend root `node scripts/verify...`, then process.cwd() is backend root.
// AND require paths are relative to the FILE.
// So yes, require('../services') is correct.

const prisma = getSharedPrismaClient();

async function verify() {
    console.log('--- Starting Virtual User Verification ---');

    let sourceMember;
    let targetUser;
    let task;
    let previousSettings;

    try {
        // 1. Create Source User (DevTeamMember)
        const sourceUserRecord = await prisma.user.create({
            data: {
                firstName: 'Source',
                lastName: 'Dev',
                email: `source${Date.now()}@test.com`,
                password: 'password',
                role: 'DEVELOPER'
            }
        });

        // Use service to make member
        const sourceMemberId = await devTeamService.getOrCreateMember(sourceUserRecord.id);
        sourceMember = await prisma.devTeamMember.findUnique({ where: { id: sourceMemberId } });
        console.log(`✅ Created Source Member: ${sourceMember.id}`);

        // 2. Create Target User (User ONLY - No DevTeamMember initially)
        targetUser = await prisma.user.create({
            data: {
                firstName: 'Virtual',
                lastName: 'Target',
                email: `target${Date.now()}@test.com`,
                password: 'password',
                role: 'DEVELOPER'
            }
        });
        console.log(`✅ Created Target User: ${targetUser.id} (No DevTeamMember yet)`);

        // Ensure no member exists
        const existingMember = await prisma.devTeamMember.findFirst({ where: { userId: targetUser.id } });
        if (existingMember) {
            console.warn('⚠️ Member already exists for target user, deleting...');
            await prisma.devTeamMember.delete({ where: { id: existingMember.id } });
        }

        // 3. Create Overdue Task
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 1); // 1 day ago

        task = await prisma.devTask.create({
            data: {
                title: 'Virtual Escalation Test ' + Date.now(),
                description: 'Testing virtual user escalation',
                status: 'BACKLOG',
                priority: 'HIGH',
                assigneeId: sourceMember.id,
                reporterId: sourceMember.id,
                dueDate: overdueDate
            }
        });
        console.log(`✅ Created Overdue Task: ${task.id}`);

        // 4. Update Settings with Virtual Rule
        const currentSettings = await prisma.devSystemSettings.findUnique({ where: { id: 'default' } });
        previousSettings = currentSettings?.automationSettings;

        const rule = {
            threshold: 1, // 1 hour
            unit: 'hours',
            scope: 'all',
            targetId: `virtual-${targetUser.id}`, // 🧪 TEST CASE: Virtual ID
            action: 'assign'
        };

        await prisma.devSystemSettings.upsert({
            where: { id: 'default' },
            update: { automationSettings: JSON.stringify({ rules: [rule] }) },
            create: { id: 'default', automationSettings: JSON.stringify({ rules: [rule] }) }
        });
        console.log(`✅ Set Automation Rule Target: ${rule.targetId}`);

        // 5. Run Automation
        console.log('🤖 Running Automation Service...');
        await automationService.runcheck();

        // 6. Verify Outcome
        const updatedTask = await prisma.devTask.findUnique({
            where: { id: task.id },
            include: { assignee: true }
        });

        // Check Assignee
        if (!updatedTask.assignee) {
            throw new Error('❌ Task has no assignee! Escalation failed completely.');
        }

        console.log(`📝 Updated Assignee ID: ${updatedTask.assigneeId}`);
        console.log(`📝 Target User ID was: ${targetUser.id}`);

        // Verify the assignee is indeed linked to the target user
        if (updatedTask.assignee.userId === targetUser.id) {
            console.log('✅ SUCCESS: Task assigned to member linked to Target User.');
        } else {
            throw new Error(`❌ FAILURE: Task assigned to wrong user! Got userId ${updatedTask.assignee.userId}, expected ${targetUser.id}`);
        }

        // Verify History Log
        const logs = await prisma.devTaskActivity.findMany({
            where: {
                taskId: task.id,
                action: 'TASK_ESCALATED'
            }
        });

        if (logs.length > 0) {
            console.log(`✅ SUCCESS: Escalation log found: "${logs[0].description}"`);
        } else {
            console.warn('⚠️ WARNING: No escalation log found in devTaskActivity.');
        }

    } catch (error) {
        console.error('❌ SCREENSHOT: Verification Crashed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('🧹 Cleaning up...');
        if (task) await prisma.devTask.delete({ where: { id: task.id } }).catch(() => { });
        if (targetUser) {
            // Delete created member if exists
            await prisma.devTeamMember.deleteMany({ where: { userId: targetUser.id } }).catch(() => { });
            await prisma.user.delete({ where: { id: targetUser.id } }).catch(() => { });
        }
        if (sourceMember) {
            await prisma.user.delete({ where: { id: sourceMember.userId } }).catch(() => { }); // Cascade deletes member usually? No, check schema.
            // Schema: User -> DevTeamMember ... Relation might not cascade delete User -> Member if defined on Member side.
            // Member has @relation(fields: [userId], references: [id], onDelete: Cascade) ?
            // Let's check schema snippet.
            // Yes:   user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
            // So deleting user deletes member.
        }

        // Restore Settings
        if (previousSettings) {
            await prisma.devSystemSettings.update({
                where: { id: 'default' },
                data: { automationSettings: previousSettings }
            });
            console.log('✅ Settings restored.');
        }

        process.exit(0);
    }
}

verify();
