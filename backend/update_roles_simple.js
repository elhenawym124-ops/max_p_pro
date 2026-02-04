/**
 * Update DevSystemSettings to use simplified English roles
 * Roles: Project Manager, Team Lead, Agent
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRoles() {
    try {
        console.log('🔄 Updating roles to simplified English format...\n');

        const newPermissions = {
            'Project Manager': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            },
            'Team Lead': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            },
            'Agent': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
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

        console.log('✅ Roles updated successfully!\n');
        console.log('New roles:');
        console.log('  - Project Manager (Full access)');
        console.log('  - Team Lead (Full access)');
        console.log('  - Agent (Limited access)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateRoles();
