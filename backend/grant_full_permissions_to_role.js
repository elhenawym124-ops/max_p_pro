
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function grantFullPermissions() {
    try {
        const prisma = getSharedPrismaClient();
        console.log('🔄 Granting full permissions to "Project Manager"...');

        // 1. Fetch current settings
        const settings = await prisma.devSystemSettings.findFirst();

        if (!settings) {
            console.error('❌ No DevSystemSettings found! Please run initialization first.');
            return;
        }

        let permissions = {};
        try {
            permissions = JSON.parse(settings.permissions);
        } catch (e) {
            console.warn('⚠️ Could not parse existing permissions, starting fresh.');
        }

        // 2. Define full permissions object
        const fullPermissions = {
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canAssign: true,
            canComment: true,
            canViewAll: true,
            canChangeStatus: true,
            canArchive: true,
            canViewReports: true,
            canManageProjects: true,
            canExport: true,
            canAccessSettings: true,
            canManageTaskSettings: true
        };

        // 3. Update Project Manager role
        permissions['Project Manager'] = fullPermissions;

        console.log('📝 New permissions for Project Manager:', permissions['Project Manager']);

        // 4. Save back to DB
        await prisma.devSystemSettings.update({
            where: { id: settings.id },
            data: {
                permissions: JSON.stringify(permissions)
            }
        });

        console.log('✅ Permissions updated successfully!');

    } catch (error) {
        console.error('❌ Error updating permissions:', error);
    } finally {
        // Disconnect handled by shared service usually, but we can exit
        process.exit(0);
    }
}

grantFullPermissions();
