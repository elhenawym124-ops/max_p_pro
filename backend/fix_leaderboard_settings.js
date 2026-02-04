const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSettings() {
    try {
        console.log('🔧 Fixing leaderboardSettings...');
        
        const defaultSettings = {
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

        const updated = await prisma.devSystemSettings.update({
            where: { id: 'default' },
            data: {
                leaderboardSettings: JSON.stringify(defaultSettings)
            }
        });

        console.log('✅ Successfully updated leaderboardSettings!');
        console.log('📊 New value:', updated.leaderboardSettings);

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        await prisma.$disconnect();
    }
}

fixSettings();
