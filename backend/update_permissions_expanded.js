/**
 * Update DevSystemSettings with expanded permissions
 * New permissions: canChangeStatus, canArchive, canViewReports, canManageProjects, canExport
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePermissions() {
    try {
        console.log('🔄 Updating roles with expanded permissions...\n');

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

        console.log('✅ Permissions updated successfully!\n');
        console.log('Expanded permissions now include:');
        console.log('  📋 Task Permissions:');
        console.log('     - canCreate (إنشاء مهام)');
        console.log('     - canEdit (تعديل مهام)');
        console.log('     - canDelete (حذف مهام)');
        console.log('     - canChangeStatus (تغيير الحالة)');
        console.log('     - canComment (إضافة تعليق)');
        console.log('     - canAssign (تعيين مسؤولين)');
        console.log('     - canArchive (أرشفة المهام)');
        console.log('  📊 Project & Reports:');
        console.log('     - canViewReports (عرض التقارير)');
        console.log('     - canManageProjects (إدارة المشاريع)');
        console.log('     - canExport (تصدير البيانات)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePermissions();
