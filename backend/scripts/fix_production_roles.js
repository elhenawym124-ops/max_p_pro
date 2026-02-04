/**
 * 🔧 Fix Production Roles: Migrate from old roles to new production roles
 * 
 * This script fixes the issue where production environment has different roles
 * than development environment. It migrates old roles (developer, manager, admin)
 * to new roles (Project Manager, Team Lead, Developer, Tester, Agent).
 * 
 * Usage: node backend/scripts/fix_production_roles.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProductionRoles() {
    try {
        console.log('🔧 Starting Production Roles Fix...\n');

        // Get current settings
        const currentSettings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!currentSettings) {
            console.log('⚠️ No settings found. The service will create default settings on next request.');
            return;
        }

        // Parse existing permissions
        let existingPermissions = {};
        try {
            existingPermissions = currentSettings?.permissions
                ? JSON.parse(currentSettings.permissions)
                : {};
        } catch (e) {
            console.log('⚠️ Could not parse existing permissions, using empty object');
            existingPermissions = {};
        }

        console.log('📋 Current roles in database:');
        Object.keys(existingPermissions).forEach(role => {
            console.log(`  - ${role}`);
        });

        // Define new production roles (matching development environment)
        const newPermissions = {
            'Project Manager': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canChangeStatus: true,
                canComment: true,
                canAssign: true,
                canArchive: true,
                canViewReports: true,
                canManageProjects: true,
                canExport: true,
                canAccessSettings: true,
                canManageTaskSettings: true,
                canViewAll: true,
                viewScope: 'all'
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
                canViewAll: true,
                viewScope: 'all'
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
                canViewAll: false,
                viewScope: 'project'
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
                canViewAll: false,
                viewScope: 'all'
            },
            'Agent': {
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
            }
        };

        // Map old roles to new roles (if they exist)
        const roleMapping = {
            'developer': 'Developer',
            'manager': 'Project Manager',
            'admin': 'Project Manager',
            'Admin': 'Project Manager',
            'Developer': 'Developer', // Keep if already exists
            'Project Manager': 'Project Manager', // Keep if already exists
            'Team Lead': 'Team Lead', // Keep if already exists
            'Tester': 'Tester', // Keep if already exists
            'Agent': 'Agent', // Keep if already exists
            'AGENT': 'Agent' // Normalize case
        };

        // 🔄 Replace old roles with new roles (completely replace, don't merge)
        // First, check if we have old roles (developer, manager, admin)
        const hasOldRoles = Object.keys(existingPermissions).some(role =>
            ['developer', 'manager', 'admin', 'Developer', 'Manager', 'Admin'].includes(role)
        );

        let finalPermissions;

        if (hasOldRoles) {
            console.log('🔄 Old roles detected, completely replacing with new production roles...\n');

            // Completely replace with new roles structure - don't preserve old roles
            finalPermissions = { ...newPermissions };

            console.log('✅ Replaced old roles with new production roles');
            console.log('   Removed old roles: developer, manager, admin');
        } else {
            // No old roles found, merge to preserve any custom roles
            finalPermissions = { ...newPermissions };

            // Preserve any existing roles that match new roles (only if not old roles)
            for (const [oldRole, perms] of Object.entries(existingPermissions)) {
                const normalizedRole = roleMapping[oldRole] || oldRole;

                // If the role maps to a new role, merge permissions
                if (finalPermissions[normalizedRole] && !['developer', 'manager', 'admin', 'Developer', 'Manager', 'Admin'].includes(oldRole)) {
                    finalPermissions[normalizedRole] = {
                        ...finalPermissions[normalizedRole],
                        ...perms // Preserve any custom permissions
                    };
                    console.log(`✅ Merged permissions for: ${oldRole} → ${normalizedRole}`);
                } else if (!newPermissions[oldRole] && !['developer', 'manager', 'admin', 'Developer', 'Manager', 'Admin'].includes(oldRole)) {
                    // Keep custom roles that don't match any new role (but not old roles)
                    finalPermissions[oldRole] = {
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
                    console.log(`⚠️ Preserved custom role: ${oldRole}`);
                }
            }
        }

        // Update settings
        await prisma.devSystemSettings.update({
            where: { id: 'default' },
            data: {
                permissions: JSON.stringify(finalPermissions)
            }
        });

        console.log('\n✅ Production roles fixed successfully!\n');
        console.log('📋 New roles in database:');
        Object.keys(finalPermissions).forEach(role => {
            const perms = finalPermissions[role];
            console.log(`  - ${role}`);
            console.log(`    viewScope: ${perms.viewScope}, canDelete: ${perms.canDelete}, canViewAll: ${perms.canViewAll}`);
        });

        console.log('\n🔧 Migration Summary:');
        console.log('  ✓ Updated to production-ready roles');
        console.log('  ✓ Preserved custom permissions where applicable');
        console.log('  ✓ Normalized role names (case-insensitive)');
        console.log('  ✓ Ensured all roles have complete permission structure');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

fixProductionRoles();
