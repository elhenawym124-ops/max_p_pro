
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const getPrisma = () => getSharedPrismaClient();

/**
 * Get Leaderboard Data
 */
const getLeaderboard = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50; // Default limit 50 to prevent overload
        const skip = (page - 1) * limit;

        // Fetch all dev members with their XP and Level
        // Sort by XP descending
        const members = await getPrisma().devTeamMember.findMany({
            where: { isActive: true },
            orderBy: { xp: 'desc' },
            skip: skip,
            take: limit,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        email: true
                    }
                },
                badges: true
            }
        });

        // Map data for frontend
        const leaderboard = members.map((member, index) => ({
            id: member.id,
            rank: skip + index + 1, // Calculate correct rank with pagination
            name: `${member.user.firstName} ${member.user.lastName}`,
            email: member.user.email,
            avatar: member.user.avatar,
            xp: member.xp,
            level: member.level,
            badges: member.badges.map(b => b.badgeCode)
        }));

        res.status(200).json({ success: true, data: leaderboard });
    } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
    }
};

module.exports = {
    getLeaderboard
};
