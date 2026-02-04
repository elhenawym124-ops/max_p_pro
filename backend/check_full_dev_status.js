const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const results = {
            projects: await prisma.devProject.count(),
            tasks: await prisma.devTask.count(),
            teamMembers: await prisma.devTeamMember.count(),
            releases: await prisma.devRelease.count(),
            comments: await prisma.devTaskComment.count(),
            attachments: await prisma.devTaskAttachment.count(),
            activities: await prisma.devTaskActivity.count(),
            checklists: await prisma.devTaskChecklist.count(),
            checklistItems: await prisma.devTaskChecklistItem.count(),
            timeLogs: await prisma.devTimeLog.count(),
            notifications: await prisma.devNotification.count()
        };

        console.log('--- Full Dev Table Status ---');
        console.log(JSON.stringify(results, null, 2));
        console.log('------------------------------');

        if (results.projects > 0) {
            const sampleProj = await prisma.devProject.findFirst({ select: { name: true, createdAt: true } });
            console.log('Sample Project:', sampleProj);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
