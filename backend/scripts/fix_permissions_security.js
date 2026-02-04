/**
 * 🔐 Security Fix: Update DevSystemSettings with complete permissions
 * Run this script to add missing permissions like canViewAll
 * 
 * Usage: node backend/scripts/fix_permissions_security.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPermissions() {
    try {
        console.log('🔐 Starting security permissions fix...\n');

        // Get current settings
        const currentSettings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!currentSettings) {
            console.log('⚠️ No settings found, creating default...');
        }

        // Parse existing permissions
        let existingPermissions = {};
        try {
            existingPermissions = currentSettings?.permissions 
                ? JSON.parse(currentSettings.permissions) 
                : {};
        } catch (e) {
            console.log('⚠️ Could not parse existing permissions, using empty object');
        }

        // Agent permissions template (shared for both 'Agent' and 'AGENT')
        const agentPermissions = {
            canCreate: true,
            canEdit: true,
            canDelete: false,
            canChangeStatus: true,
            canComment: true,
            canAssign: false,
            canArchive: false,
            canViewReports: false,
            canManageProjects: false,
            canExport: false,
            canAccessSettings: false,
            canManageTaskSettings: false,
            canViewAll: false,
            viewScope: 'assigned_only'
        };

        // Complete permissions structure with all new fields
        const completePermissions = {
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
                // Users & Admin
                canViewAll: true,  // 🔐 NEW
                // View Scope
                viewScope: 'all',
                // Merge with existing
                ...existingPermissions['Project Manager']
            },
            'Team Lead': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canChangeStatus: true,
                canComment: true,
                canAssign: true,
                canArchive: true,
                canViewReports: true,
                canManageProjects: false,
                canExport: true,
                canAccessSettings: true,
                canManageTaskSettings: false,
                canViewAll: true,  // 🔐 NEW
                viewScope: 'all',
                ...existingPermissions['Team Lead']
            },
            'Developer': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canChangeStatus: true,
                canComment: true,
                canAssign: false,
                canArchive: false,
                canViewReports: false,
                canManageProjects: false,
                canExport: false,
                canAccessSettings: false,
                canManageTaskSettings: false,
                canViewAll: false,  // 🔐 NEW
                viewScope: 'project',
                ...existingPermissions['Developer']
            },
            'Tester': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canChangeStatus: true,
                canComment: true,
                canAssign: false,
                canArchive: false,
                canViewReports: true,
                canManageProjects: false,
                canExport: false,
                canAccessSettings: false,
                canManageTaskSettings: false,
                canViewAll: false,  // 🔐 NEW
                viewScope: 'all',
                ...existingPermissions['Tester']
            },
            // 🔐 FIX: Support both 'Agent' and 'AGENT' variations
            'Agent': {
                ...agentPermissions,
                ...existingPermissions['Agent']
            },
            'AGENT': {
                ...agentPermissions,
                ...existingPermissions['AGENT']
            }
        };

        // Add any existing roles that aren't in our template
        for (const [role, perms] of Object.entries(existingPermissions)) {
            if (!completePermissions[role]) {
                completePermissions[role] = {
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canChangeStatus: false,
                    canComment: true,
                    canAssign: false,
                    canArchive: false,
                    canViewReports: false,
                    canManageProjects: false,
                    canExport: false,
                    canAccessSettings: false,
                    canManageTaskSettings: false,
                    canViewAll: false,
                    viewScope: 'assigned_only',
                    ...perms
                };
            }
        }

        // Update settings
        await prisma.devSystemSettings.upsert({
            where: { id: 'default' },
            update: {
                permissions: JSON.stringify(completePermissions)
            },
            create: {
                id: 'default',
                permissions: JSON.stringify(completePermissions),
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
                componentMappings: JSON.stringify({})
            }
        });

        console.log('✅ Permissions updated successfully!\n');
        console.log('Updated roles:');
        for (const role of Object.keys(completePermissions)) {
            console.log(`  - ${role} (canViewAll: ${completePermissions[role].canViewAll}, viewScope: ${completePermissions[role].viewScope})`);
        }

        console.log('\n🔐 Security fixes applied:');
        console.log('  ✓ Added canViewAll permission to all roles');
        console.log('  ✓ Ensured all permission fields are present');
        console.log('  ✓ Preserved existing custom permissions');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixPermissions();
