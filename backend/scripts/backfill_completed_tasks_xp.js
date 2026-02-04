
/**
 * 🔧 Backfill Completed Tasks XP: Recalculate XP for all dev members
 * 
 * This script recalculates XP from scratch for all DevTeamMembers based on their
 * currently COMPLETED/DONE tasks. It is idempotent (safe to run multiple times).
 * 
 * Usage: npm run fix:xp
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate Level based on XP
 */
const calculateLevel = (xp) => {
    if (xp < 0) return 1;
    return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
};

/**
 * Get leaderboard settings from database
 */
const getLeaderboardSettings = async () => {
    try {
        const settings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        if (settings && settings.leaderboardSettings) {
            return JSON.parse(settings.leaderboardSettings);
        }

        // Fallback to default values if not found
        return {
            baseXP: 10,
            taskTypeScores: {
                'BUG': 15,
                'FEATURE': 20,
                'ENHANCEMENT': 10,
                'HOTFIX': 25,
                'REFACTOR': 15,
                'SECURITY': 30,
                'DOCUMENTATION': 5,
                'TESTING': 8,
                'PERFORMANCE': 20,
                'MAINTENANCE': 5
            },
            priorityScores: {
                'CRITICAL': 20,
                'URGENT': 20,
                'HIGH': 15,
                'MEDIUM': 5,
                'LOW': 0
            },
            timeBasedScoring: {
                enabled: true,
                earlyCompletionBonus: 20,
                onTimeBonus: 10,
                lateCompletionPenalty: 15,
                maxBonusPercent: 50,
                maxPenaltyPercent: 30
            }
        };
    } catch (error) {
        console.error('⚠️ Error loading leaderboard settings, using defaults:', error);
        return {
            baseXP: 10,
            taskTypeScores: {
                'BUG': 15,
                'FEATURE': 20,
                'ENHANCEMENT': 10,
                'HOTFIX': 25,
                'REFACTOR': 15,
                'SECURITY': 30,
                'DOCUMENTATION': 5,
                'TESTING': 8,
                'PERFORMANCE': 20,
                'MAINTENANCE': 5
            },
            priorityScores: {
                'CRITICAL': 20,
                'URGENT': 20,
                'HIGH': 15,
                'MEDIUM': 5,
                'LOW': 0
            },
            timeBasedScoring: {
                enabled: true,
                earlyCompletionBonus: 20,
                onTimeBonus: 10,
                lateCompletionPenalty: 15,
                maxBonusPercent: 50,
                maxPenaltyPercent: 30
            }
        };
    }
};

/**
 * Calculate actual hours spent on a task
 */
const calculateActualHours = (task) => {
    try {
        // If task has time logs, use them
        if (task.dev_time_logs && task.dev_time_logs.length > 0) {
            const totalMinutes = task.dev_time_logs.reduce((sum, log) => sum + (log.duration || 0), 0);
            return totalMinutes / 60;
        }

        // Otherwise, calculate from creation to completion
        const createdAt = new Date(task.createdAt);
        const completedAt = new Date(task.updatedAt);
        const diffMs = completedAt - createdAt;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Cap at reasonable maximum (e.g., 720 hours = 30 days)
        return Math.min(diffHours, 720);
    } catch (error) {
        return 0;
    }
};

/**
 * Calculate XP for a single task using dynamic settings
 */
const calculateXPForTask = (task, leaderboardSettings) => {
    // Base calculation
    let xp = leaderboardSettings.baseXP || 10;
    xp += (leaderboardSettings.taskTypeScores[task.type] || 5);
    xp += (leaderboardSettings.priorityScores[task.priority] || leaderboardSettings.priorityScores[task.priority?.toUpperCase()] || 0);

    // Time-based scoring
    if (leaderboardSettings.timeBasedScoring?.enabled && task.estimatedHours > 0) {
        const actualHours = calculateActualHours(task);
        const estimatedHours = task.estimatedHours;

        if (actualHours > 0) {
            const timeRatio = actualHours / estimatedHours;
            let timeMultiplier = 0;

            if (timeRatio <= 0.9) {
                // Early completion (finished in 90% or less of estimated time)
                const earlyBonus = leaderboardSettings.timeBasedScoring.earlyCompletionBonus || 20;
                timeMultiplier = Math.min(earlyBonus, leaderboardSettings.timeBasedScoring.maxBonusPercent || 50);
            } else if (timeRatio <= 1.1) {
                // On time (within 10% of estimate)
                timeMultiplier = leaderboardSettings.timeBasedScoring.onTimeBonus || 10;
            } else {
                // Late completion
                const latePenalty = leaderboardSettings.timeBasedScoring.lateCompletionPenalty || 15;
                timeMultiplier = -Math.min(latePenalty, leaderboardSettings.timeBasedScoring.maxPenaltyPercent || 30);
            }

            const timeBonus = Math.round((xp * timeMultiplier) / 100);
            xp += timeBonus;
        }
    }

    // Ensure minimum XP of 1
    return Math.max(1, Math.round(xp));
};

async function backfillXP() {
    console.log('🚀 Starting XP Recalculation (Idempotent)...');

    try {
        // 0. Load leaderboard settings
        const leaderboardSettings = await getLeaderboardSettings();
        console.log('⚙️ Loaded leaderboard settings:', JSON.stringify(leaderboardSettings, null, 2));

        // 1. Get all DevTeamMembers
        const members = await prisma.devTeamMember.findMany({
            include: {
                user: {
                    select: { email: true, firstName: true, lastName: true }
                }
            }
        });

        console.log(`👥 Found ${members.length} dev team members.`);

        let totalUpdates = 0;

        for (const member of members) {
            const memberName = member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown';

            // 2. Find all DONE/COMPLETED tasks for this member
            const completedTasks = await prisma.devTask.findMany({
                where: {
                    assigneeId: member.id,
                    status: 'DONE'
                },
                select: {
                    id: true,
                    title: true,
                    priority: true,
                    status: true,
                    type: true,
                    estimatedHours: true,
                    createdAt: true,
                    updatedAt: true
                },
                include: {
                    dev_time_logs: true
                }
            });

            // 3. Calculate Total XP using dynamic settings
            let totalXP = 0;
            for (const task of completedTasks) {
                totalXP += calculateXPForTask(task, leaderboardSettings);
            }

            const newLevel = calculateLevel(totalXP);

            // 4. Update Member if needed
            if (member.xp !== totalXP || member.level !== newLevel) {
                console.log(`\nProcessing ${memberName} (${member.user?.email})...`);
                console.log(`   - Found ${completedTasks.length} completed tasks.`);
                console.log(`   - Old XP: ${member.xp} (Lv ${member.level}) -> New XP: ${totalXP} (Lv ${newLevel})`);

                await prisma.devTeamMember.update({
                    where: { id: member.id },
                    data: {
                        xp: totalXP,
                        level: newLevel
                    }
                });
                console.log(`   ✅ Updated.`);
                totalUpdates++;
            } else {
                // console.log(`   ✨ ${memberName} already up to date (${totalXP} XP).`);
            }
        }

        console.log(`\n🎉 XP Recalculation completed! Updated ${totalUpdates} members.`);

        // Show Leaderboard
        const leaderboard = await prisma.devTeamMember.findMany({
            where: { isActive: true },
            orderBy: { xp: 'desc' },
            take: 5,
            include: { user: true }
        });

        console.log('\n🏆 Current Leaderboard (Top 5):');
        leaderboard.forEach((m, i) => {
            console.log(`${i + 1}. ${m.user?.firstName} ${m.user?.lastName}: ${m.xp} XP (Lv ${m.level})`);
        });

    } catch (error) {
        console.error('❌ Error during backfill:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

backfillXP();
