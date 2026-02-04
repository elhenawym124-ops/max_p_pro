/**
 * Migration Script: Update DevSystemSettings permissions to use Arabic roles
 * This script:
 * 1. Removes old English roles (developer, manager, admin)
 * 2. Adds new Arabic roles with proper permissions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRoles() {
    try {
        console.log('🔄 Starting Role Migration...\n');

        // 1. Fetch current settings
        const settings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!settings) {
            console.log('❌ No DevSystemSettings found. Creating new one...');
        }

        // 2. Define new Arabic roles with permissions
        const newPermissions = {
            // Development Team Roles
            'مطور الواجهة الأمامية': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            'مطور الواجهة الخلفية': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            'مطور شامل (Full Stack)': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            'مطور تطبيقات موبايل': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            'مصمم UI/UX': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            'مهندس جودة (QA)': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'all'
            },
            'مهندس عمليات (DevOps)': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            },
            // Leadership Roles
            'قائد تقني': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            },
            'مدير مشروع': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            },
            'مالك المنتج': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            }
        };

        // 3. Update or create settings
        const updatedSettings = await prisma.devSystemSettings.upsert({
            where: { id: 'default' },
            update: {
                permissions: JSON.stringify(newPermissions)
            },
            create: {
                id: 'default',
                permissions: JSON.stringify(newPermissions)
            }
        });

        console.log('✅ Role Migration Completed!\n');
        console.log('New Roles configured:');
        Object.keys(newPermissions).forEach(role => {
            console.log(`   - ${role}`);
        });

        console.log('\n📊 Old English roles (developer, manager, admin) have been removed.');
        console.log('📊 New Arabic roles are now active with proper permissions.');

    } catch (error) {
        console.error('❌ Migration Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateRoles();
