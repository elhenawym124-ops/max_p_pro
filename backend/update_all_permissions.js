/**
 * Update DevSystemSettings with ALL expanded permissions including Settings Access
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePermissions() {
    try {
        console.log('🔄 Updating roles with ALL expanded permissions...\n');

        const newPermissions = {
            'Project Manager': {
                // Task Permissions
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canChangeStatus: true,
                canComment: true,
                canAssign: true,
                canArchive: true,
                // Project & Reports
                canViewReports: true,
                canManageProjects: true,
                canExport: true,
                // Settings Access
                canAccessSettings: true,
                canManageTaskSettings: true,
                // View Scope
                viewScope: 'all'
            },
            'Team Lead': {
                // Task Permissions
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canChangeStatus: true,
                canComment: true,
                canAssign: true,
                canArchive: true,
                // Project & Reports
                canViewReports: true,
                canManageProjects: false,
                canExport: true,
                // Settings Access
                canAccessSettings: true,
                canManageTaskSettings: false,
                // View Scope
                viewScope: 'all'
            },
            'Agent': {
                // Task Permissions
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canChangeStatus: true,
                canComment: true,
                canAssign: false,
                canArchive: false,
                // Project & Reports
                canViewReports: false,
                canManageProjects: false,
                canExport: false,
                // Settings Access
                canAccessSettings: false,
                canManageTaskSettings: false,
                // View Scope
                viewScope: 'assigned'
            }
        };

        await prisma.devSystemSettings.upsert({
            where: { id: 'default' },
            update: {
                permissions: JSON.stringify(newPermissions)
            },
            create: {
                id: 'default',
                permissions: JSON.stringify(newPermissions)
            }
        });

        console.log('✅ All permissions updated successfully!\n');
        console.log('Role permissions summary:');
        console.log('\n📌 Project Manager: Full access to everything');
        console.log('📌 Team Lead: Full task access, limited settings');
        console.log('📌 Agent: Basic task access only');
        console.log('\nTotal: 12 permissions per role');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePermissions();
