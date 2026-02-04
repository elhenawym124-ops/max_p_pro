const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Multipliers (Must match superAdminController.js)
const TYPE_MULTIPLIERS = {
    'BUG': 15,
    'FEATURE': 20,
    'ENHANCEMENT': 10,
    'HOTFIX': 25,
    'REFACTOR': 15,
    'SECURITY': 30
};

const PRIORITY_MULTIPLIERS = {
    'CRITICAL': 20,
    'HIGH': 15,
    'MEDIUM': 5,
    'LOW': 0
};

const calculateLevel = (xp) => {
    if (xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

async function recalculateXP() {
    console.log('🚀 Starting XP Recalculation...');
    try {
        // 1. Get all DevTeamMembers
        const members = await prisma.devTeamMember.findMany({
            include: {
                user: { select: { firstName: true, lastName: true, email: true } }
            }
        });

        console.log(`👥 Found ${members.length} members.`);

        for (const member of members) {
            console.log(`\n👤 Processing: ${member.user.firstName} ${member.user.lastName} (${member.id})`);

            // 2. Find all DONE tasks for this member
            const completedTasks = await prisma.devTask.findMany({
                where: {
                    assigneeId: member.id,
                    status: 'DONE'
                }
            });

            console.log(`   📝 Found ${completedTasks.length} completed tasks.`);

            // 3. Calculate Total XP
            let totalXP = 0;
            for (const task of completedTasks) {
                let taskXP = 10; // Base
                taskXP += (TYPE_MULTIPLIERS[task.type] || 5);
                taskXP += (PRIORITY_MULTIPLIERS[task.priority] || 0);
                totalXP += taskXP;
            }

            // 4. Calculate Level
            const newLevel = calculateLevel(totalXP);

            // 5. Update Member
            if (totalXP !== member.xp || newLevel !== member.level) {
                await prisma.devTeamMember.update({
                    where: { id: member.id },
                    data: {
                        xp: totalXP,
                        level: newLevel
                    }
                });
                console.log(`   ✅ Updated! XP: ${member.xp} -> ${totalXP}, Level: ${member.level} -> ${newLevel}`);
            } else {
                console.log(`   ✨ Already up to date. XP: ${totalXP}`);
            }
        }

        console.log('\n✅ Recalculation Complete!');

    } catch (error) {
        console.error('❌ Error during recalculation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

recalculateXP();
