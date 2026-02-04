const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSettingsToEnglish() {
    try {
        console.log('🔄 Updating DevSystemSettings to English...');

        const settings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!settings) {
            console.log('⚠️ No settings found. They will be created automatically on first use.');
            return;
        }

        // Update with English labels
        const updatedSettings = await prisma.devSystemSettings.update({
            where: { id: 'default' },
            data: {
                taskStatuses: JSON.stringify([
                    { value: 'BACKLOG', label: 'Backlog', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
                    { value: 'TODO', label: 'To Do', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
                    { value: 'IN_PROGRESS', label: 'In Progress', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
                    { value: 'IN_REVIEW', label: 'In Review', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
                    { value: 'TESTING', label: 'Testing', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
                    { value: 'DONE', label: 'Done', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
                    { value: 'CANCELLED', label: 'Cancelled', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' }
                ]),
                taskPriorities: JSON.stringify([
                    { value: 'LOW', label: 'Low', color: '#94a3b8' },
                    { value: 'MEDIUM', label: 'Medium', color: '#3b82f6' },
                    { value: 'HIGH', label: 'High', color: '#f97316' },
                    { value: 'URGENT', label: 'Urgent', color: '#ef4444' },
                    { value: 'CRITICAL', label: 'Critical', color: '#991b1b' }
                ])
            }
        });

        console.log('✅ Settings updated successfully!');
        console.log('📊 Task Statuses:', JSON.parse(updatedSettings.taskStatuses));
        console.log('📊 Task Priorities:', JSON.parse(updatedSettings.taskPriorities));

    } catch (error) {
        console.error('❌ Error updating settings:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

updateSettingsToEnglish()
    .then(() => {
        console.log('🎉 Migration completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    });
