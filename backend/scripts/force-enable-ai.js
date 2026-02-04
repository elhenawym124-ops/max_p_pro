
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceEnable() {
    const companyId = 'cmem8ayyr004cufakqkcsyn97';
    console.log(`🔌 Forcing AI ENABLE for Company ID: ${companyId}`);

    try {
        const minQualityScore = 70; // Ensure this required field has a valid value (using default)

        // First check if it exists
        const existing = await prisma.aiSettings.findUnique({ where: { companyId } });

        if (existing) {
            const updated = await prisma.aiSettings.update({
                where: { companyId },
                data: {
                    autoReplyEnabled: true,
                    replyMode: 'all',
                    updatedAt: new Date()
                }
            });
            console.log('✅ Settings UPDATED successfully.');
            console.log(`   New Status: ${updated.autoReplyEnabled}`);
        } else {
            // Create if missing
            const created = await prisma.aiSettings.create({
                data: {
                    companyId,
                    autoReplyEnabled: true,
                    replyMode: 'all',
                    minQualityScore: minQualityScore, // Providing default for potentially required field
                    workingHours: JSON.stringify({ start: '09:00', end: '18:00' }),
                    workingHoursEnabled: false
                }
            });
            console.log('✅ Settings CREATED successfully.');
            console.log(`   New Status: ${created.autoReplyEnabled}`);
        }

    } catch (e) {
        console.error('❌ Error updating settings:', e);
    } finally {
        await prisma.$disconnect();
    }
}

forceEnable();
