const { getSharedPrismaClient } = require('./sharedDatabase');

class DevTeamService {
    constructor() {
        this.prisma = getSharedPrismaClient();
    }

    /**
     * Get or create DevTeamMember for a user
     * Returns DevTeamMember.id (creates one if doesn't exist)
     * Handles "virtual-" prefixed IDs
     * @param {string} userId - The user ID or virtual ID
     * @returns {Promise<string|null>} - The valid DevTeamMember ID
     */
    async getOrCreateMember(userId) {
        if (!userId) return null;

        try {
            // Check if userId is actually a DevTeamMember.id (starts with 'cmk' or similar, not virtual-)
            // If it's a valid ID that's NOT virtual, it might be a direct DevTeamMember ID or a User ID.
            // But our heuristic in controller was: if not starts with 'virtual-', check if it exists as DevTeamMember ID.

            if (!userId.startsWith('virtual-')) {
                // Check if it's already a DevTeamMember ID
                const existingMember = await this.prisma.devTeamMember.findUnique({
                    where: { id: userId }
                });
                if (existingMember) return userId;
            }

            // Extract userId from virtual ID if needed
            const actualUserId = userId.startsWith('virtual-') ? userId.replace('virtual-', '') : userId;

            // Find existing DevTeamMember by userId
            let teamMember = await this.prisma.devTeamMember.findFirst({
                where: { userId: actualUserId }
            });

            if (!teamMember) {
                // Get user to get role details
                const user = await this.prisma.devTeamMember.findFirst({ // Mistake in thought log? No, look at user table.
                    // The original controller looked at 'User' table.
                    // I must query 'User' table.
                });

                const userRecord = await this.prisma.user.findUnique({
                    where: { id: actualUserId },
                    select: { role: true, firstName: true, lastName: true }
                });

                if (!userRecord) {
                    console.warn(`⚠️ [devTeamService] User not found for ID: ${actualUserId}`);
                    return null;
                }

                // Create DevTeamMember automatically
                teamMember = await this.prisma.devTeamMember.create({
                    data: {
                        userId: actualUserId,
                        role: userRecord.role || 'Agent',
                        department: null,
                        availability: 'available',
                        isActive: true
                    }
                });

                console.log(`✅ [devTeamService] Created DevTeamMember for user ${actualUserId} (${teamMember.id})`);
            }

            return teamMember.id;
        } catch (error) {
            console.error('❌ [devTeamService] Error getting/creating member:', error);
            return null;
        }
    }
}

module.exports = new DevTeamService();
