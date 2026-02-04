
/**
 * Add Comment to Dev Task
 */
const addDevTaskComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        // Get Dev Team Member ID
        const member = await getPrisma().devTeamMember.findFirst({
            where: { userId }
        });

        if (!member) {
            return res.status(403).json({ success: false, message: 'You are not a dev team member' });
        }

        const comment = await getPrisma().devTaskComment.create({
            data: {
                content,
                taskId: id,
                authorId: member.id
            },
            include: {
                author: {
                    include: {
                        user: { select: { firstName: true, lastName: true, avatar: true } }
                    }
                }
            }
        });

        res.status(201).json({ success: true, data: comment });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error adding comment:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

/**
 * Delete Dev Task
 */
const deleteDevTask = async (req, res) => {
    try {
        const { id } = req.params;
        await getPrisma().devTask.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error deleting task:', error);
        res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
};
