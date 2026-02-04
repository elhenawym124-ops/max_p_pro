/**
 * Super Admin DevTask Migration Script
 * Migrates data from Hostinger (Source) to Local/Target Environment.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

// 1. SOURCE: Remote VPS (Hostinger)
const REMOTE_VPS_URL = 'mysql://u339372869_test2:0165676135Aa%40A@92.113.22.70:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci';

// 2. TARGET: Local Machine (Localhost)
// IMPORTANT: Please update 'your_password' and 'maxp' with your local MySQL details
const LOCAL_DESKTOP_URL = 'mysql://root:password@localhost:3306/maxp?charset=utf8mb4&collation=utf8mb4_unicode_ci';

const sourcePrisma = new PrismaClient({
    datasources: { db: { url: REMOTE_VPS_URL } }
});

const targetPrisma = new PrismaClient({
    datasources: { db: { url: LOCAL_DESKTOP_URL } }
});

async function migrate() {
    console.log('🚀 Starting Super Admin Task Migration: [REMOTE VPS] -> [LOCAL DESKTOP]');
    console.log(`📡 Remote Source: ${REMOTE_VPS_URL.split('@')[1]}`);
    console.log(`🎯 Local Target: ${LOCAL_DESKTOP_URL.split('@')[1]}`);

    try {
        // 1. Migrate Super Admin Users
        console.log('\n👥 Migrating Super Admin Users...');
        const sourceAdmins = await sourcePrisma.user.findMany({
            where: { role: 'SUPER_ADMIN' }
        });

        for (const admin of sourceAdmins) {
            const exists = await targetPrisma.user.findUnique({ where: { email: admin.email } });
            if (!exists) {
                console.log(`   + Creating User: ${admin.email}`);
                await targetPrisma.user.create({ data: admin });
            } else {
                console.log(`   ~ Skipping (Already exists): ${admin.email}`);
            }
        }

        // 2. Migrate DevTeamMembers
        console.log('\n🛠️ Migrating DevTeamMembers...');
        const sourceMembers = await sourcePrisma.devTeamMember.findMany();
        for (const member of sourceMembers) {
            const exists = await targetPrisma.devTeamMember.findUnique({ where: { userId: member.userId } });
            if (!exists) {
                // Ensure user exists first
                const userExists = await targetPrisma.user.findUnique({ where: { id: member.userId } });
                if (userExists) {
                    console.log(`   + Creating DevTeamMember for UserID: ${member.userId}`);
                    await targetPrisma.devTeamMember.create({ data: member });
                } else {
                    console.warn(`   ⚠️ Warning: User ${member.userId} not found in target. Skipping DevTeamMember.`);
                }
            }
        }

        // 3. Migrate DevProjects
        console.log('\n📂 Migrating DevProjects...');
        const sourceProjects = await sourcePrisma.devProject.findMany();
        for (const project of sourceProjects) {
            const exists = await targetPrisma.devProject.findUnique({ where: { id: project.id } });
            if (!exists) {
                console.log(`   + Creating Project: ${project.name}`);
                // Remove managerId if it doesn't exist in target
                if (project.managerId) {
                    const managerExists = await targetPrisma.devTeamMember.findUnique({ where: { id: project.managerId } });
                    if (!managerExists) project.managerId = null;
                }
                await targetPrisma.devProject.create({ data: project });
            }
        }

        // 4. Migrate DevReleases
        console.log('\n🏷️ Migrating DevReleases...');
        const sourceReleases = await sourcePrisma.devRelease.findMany();
        for (const release of sourceReleases) {
            const exists = await targetPrisma.devRelease.findUnique({ where: { id: release.id } });
            if (!exists) {
                console.log(`   + Creating Release: ${release.name} (${release.version})`);
                await targetPrisma.devRelease.create({ data: release });
            }
        }

        // 5. Migrate DevTasks
        console.log('\n✅ Migrating DevTasks...');
        const sourceTasks = await sourcePrisma.devTask.findMany();
        for (const task of sourceTasks) {
            const exists = await targetPrisma.devTask.findUnique({ where: { id: task.id } });
            if (!exists) {
                console.log(`   + Creating Task: ${task.title}`);

                // Relationship checks
                if (task.assigneeId) {
                    const assigneeExists = await targetPrisma.devTeamMember.findUnique({ where: { id: task.assigneeId } });
                    if (!assigneeExists) task.assigneeId = null;
                }

                const reporterExists = await targetPrisma.devTeamMember.findUnique({ where: { id: task.reporterId } });
                if (!reporterExists) {
                    console.warn(`   ⚠️ Warning: Reporter ${task.reporterId} missing. Skipping task ${task.id}.`);
                    continue;
                }

                await targetPrisma.devTask.create({ data: task });
            }
        }

        console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
    } finally {
        await sourcePrisma.$disconnect();
        await targetPrisma.$disconnect();
    }
}

migrate();
