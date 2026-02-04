
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateDevTeamData() {
    try {
        console.log('🔄 Starting migration of DevTeamMember data to User...\n');

        // 1. Fetch all DevTeamMember records
        const devMembers = await prisma.devTeamMember.findMany({
            include: {
                user: true
            }
        });

        console.log(`Found ${devMembers.length} DevTeam members.`);

        let updatedCount = 0;
        let errorsCount = 0;

        for (const member of devMembers) {
            try {
                if (!member.userId) {
                    console.log(`⚠️ Skipping member without userId: ${member.id}`);
                    continue;
                }

                console.log(`Processing ${member.user?.firstName || 'User'} (${member.user?.email})...`);
                console.log(`   - Role: ${member.role}`);
                console.log(`   - Department: ${member.department}`);
                console.log(`   - Availability: ${member.availability}`);

                // 2. Update User record
                await prisma.user.update({
                    where: { id: member.userId },
                    data: {
                        // Migrate fields
                        role: member.role, // Overwrite role with DevTeam role
                        department: member.department,
                        skills: member.skills,
                        availability: member.availability,
                        // Ensure they are active if the dev member was active
                        isActive: member.isActive ?? true
                    }
                });

                updatedCount++;
                console.log(`   ✅ Synced successfully.`);

            } catch (err) {
                console.error(`   ❌ Error updating user ${member.userId}: ${err.message}`);
                errorsCount++;
            }
        }

        console.log('\n==========================================');
        console.log(`Migration Complete.`);
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`❌ Errors: ${errorsCount}`);
        console.log('==========================================\n');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateDevTeamData();
