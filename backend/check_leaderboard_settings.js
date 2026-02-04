const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettings() {
    try {
        const settings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        console.log('📊 Settings from database:');
        console.log('ID:', settings?.id);
        console.log('Has leaderboardSettings:', !!settings?.leaderboardSettings);
        console.log('leaderboardSettings raw value:', settings?.leaderboardSettings);
        
        if (settings?.leaderboardSettings) {
            try {
                const parsed = JSON.parse(settings.leaderboardSettings);
                console.log('leaderboardSettings parsed:', JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log('Error parsing:', e.message);
            }
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkSettings();
