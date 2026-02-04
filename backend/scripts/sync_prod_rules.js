
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Production Environment Sync...');

    // 1. Sync Dev System Settings (Roles, Priorities, Statuses)
    console.log('⚙️ Syncing Dev System Settings...');

    const defaultSettings = {
        taskStatuses: JSON.stringify([
            { value: 'BACKLOG', label: 'Backlog', color: '#94a3b8' },
            { value: 'TODO', label: 'To Do', color: '#64748b' },
            { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
            { value: 'IN_REVIEW', label: 'In Review', color: '#eab308' },
            { value: 'TESTING', label: 'Testing', color: '#8b5cf6' },
            { value: 'DONE', label: 'Done', color: '#22c55e' },
            { value: 'CANCELLED', label: 'Cancelled', color: '#ef4444' }
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
                canCreate: true, canEdit: true, canDelete: true, canChangeStatus: true,
                canComment: true, canAssign: true, canArchive: true, canViewReports: true,
                canManageProjects: true, canExport: true, canAccessSettings: true,
                canManageTaskSettings: true, canViewAll: true, viewScope: 'all'
            },
            'Team Lead': {
                canCreate: true, canEdit: true, canDelete: true, canChangeStatus: true,
                canComment: true, canAssign: true, canArchive: true, canViewReports: true,
                canManageProjects: false, canExport: true, canAccessSettings: true,
                canManageTaskSettings: false, canViewAll: true, viewScope: 'all'
            },
            'Developer': {
                canCreate: true, canEdit: true, canDelete: false, canChangeStatus: true,
                canComment: true, canAssign: false, canArchive: false, canViewReports: false,
                canManageProjects: false, canExport: false, canAccessSettings: false,
                canManageTaskSettings: false, canViewAll: false, viewScope: 'project'
            },
            'Tester': {
                canCreate: true, canEdit: true, canDelete: false, canChangeStatus: true,
                canComment: true, canAssign: false, canArchive: false, canViewReports: true,
                canManageProjects: false, canExport: false, canAccessSettings: false,
                canManageTaskSettings: false, canViewAll: false, viewScope: 'all'
            },
            'Agent': {
                canCreate: true, canEdit: true, canDelete: false, canChangeStatus: true,
                canComment: true, canAssign: false, canArchive: false, canViewReports: false,
                canManageProjects: false, canExport: false, canAccessSettings: false,
                canManageTaskSettings: false, canViewAll: false, viewScope: 'assigned_only'
            }
        })
    };

    await prisma.devSystemSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', ...defaultSettings },
        update: defaultSettings
    });

    console.log('✅ Dev System Settings Synced Successfully!');


    // 2. Fix Development Heroes (Missing DevTeamMember records)
    console.log('👥 Cleanup: Removing Agents and non-dev roles from DevTeamMember...');

    // Strict allowed roles for Leaderboard
    const allowedRoles = ['Project Manager', 'Team Lead', 'Developer', 'Tester', 'SUPER_ADMIN'];

    // 2.1 CLEANUP: Delete DevTeamMembers who are NOT in the allowed roles
    const invalidMembers = await prisma.devTeamMember.deleteMany({
        where: {
            user: {
                role: { notIn: allowedRoles }
            }
        }
    });

    console.log(`🧹 Deleted ${invalidMembers.count} ineligible members from DevTeam.`);

    // 2.2 CREATE: Add only allowed roles
    console.log('👥 Checking for missing DevTeamMember records (Strict Mode)...');

    // Get all users with allowed roles
    const users = await prisma.user.findMany({
        where: {
            role: { in: allowedRoles },
            isActive: true
        }
    });

    console.log(`Found ${users.length} eligible team members.`);

    let createdCount = 0;

    for (const user of users) {
        // Check if DevTeamMember exists
        const member = await prisma.devTeamMember.findUnique({
            where: { userId: user.id }
        });

        if (!member) {
            console.log(`Creating DevTeamMember for: ${user.firstName} ${user.lastName} (${user.role})`);

            await prisma.devTeamMember.create({
                data: {
                    userId: user.id,
                    role: user.role || 'Developer', // Default fallback
                    department: user.department || 'Engineering',
                    skills: user.skills || '[]',
                    availability: user.availability || 'available',
                    isActive: true,
                    xp: 0,
                    level: 1
                }
            });
            createdCount++;
        }
    }

    console.log(`✅ Created ${createdCount} missing DevTeamMember records.`);
    console.log('🎉 Production Environment Sync Completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
