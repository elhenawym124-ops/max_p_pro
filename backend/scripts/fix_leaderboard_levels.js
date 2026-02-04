/**
 * 🔧 Fix Leaderboard Levels: Recalculate all member levels based on XP
 * 
 * This script recalculates the level for all DevTeamMembers based on their current XP
 * using the same formula: Level = floor(sqrt(XP / 100)) + 1
 * 
 * Usage: node backend/scripts/fix_leaderboard_levels.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate Level based on XP
 */
const calculateLevel = (xp) => {
    if (xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};

async function fixLeaderboardLevels() {
    try {
        console.log('🔧 Starting Leaderboard Levels Fix...\n');

        // Get all active members
        const members = await prisma.devTeamMember.findMany({
            where: { isActive: true },
            select: {
                id: true,
                userId: true,
                xp: true,
                level: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        console.log(`📊 Found ${members.length} active members\n`);

        let updatedCount = 0;
        let unchangedCount = 0;

        for (const member of members) {
            const correctLevel = calculateLevel(member.xp);
            
            if (member.level !== correctLevel) {
                await prisma.devTeamMember.update({
                    where: { id: member.id },
                    data: { level: correctLevel }
                });
                
                console.log(`✅ Updated: ${member.user.firstName} ${member.user.lastName}`);
                console.log(`   XP: ${member.xp} → Level: ${member.level} → ${correctLevel}`);
                updatedCount++;
            } else {
                unchangedCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`  ✅ Updated: ${updatedCount} members`);
        console.log(`  ✓ Unchanged: ${unchangedCount} members`);
        console.log(`  📈 Total: ${members.length} members`);

        // Show level distribution
        const levelDistribution = {};
        for (const member of members) {
            const level = calculateLevel(member.xp);
            levelDistribution[level] = (levelDistribution[level] || 0) + 1;
        }

        console.log('\n📊 Level Distribution:');
        Object.keys(levelDistribution)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .forEach(level => {
                console.log(`  Level ${level}: ${levelDistribution[level]} members`);
            });

        console.log('\n✅ Leaderboard levels fixed successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

fixLeaderboardLevels();
