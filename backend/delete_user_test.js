const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function deleteUser() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    const userId = 'cmiug0rm70vbdjuewr9cuiy82'; // mokhtar@mokhtar.com
    
    console.log(`\n🗑️ Starting deletion test for user: ${userId}\n`);
    
    try {
        // Get user info first
        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            select: { email: true, role: true, firstName: true, lastName: true }
        });
        
        if (!user) {
            console.log('❌ User not found');
            process.exit(1);
        }
        
        console.log(`📧 Email: ${user.email}`);
        console.log(`🎭 Role: ${user.role}`);
        console.log(`👤 Name: ${user.firstName} ${user.lastName}\n`);
        
        // Delete all related records in order
        
        // 1. Task-related records
        console.log('🔄 Deleting task-related records...');
        await prisma.taskActivity.deleteMany({ where: { userId } });
        await prisma.taskAttachment.deleteMany({ where: { userId } });
        await prisma.taskChecklistItem.deleteMany({ where: { completedBy: userId } });
        await prisma.taskComment.deleteMany({ where: { userId } });
        await prisma.taskNotification.deleteMany({ where: { userId } });
        await prisma.taskWatcher.deleteMany({ where: { userId } });
        console.log('✅ Task-related records deleted');
        
        // 2. Time tracking
        console.log('🔄 Deleting time entries...');
        await prisma.timeEntry.deleteMany({ where: { userId } });
        console.log('✅ Time entries deleted');
        
        // 3. Support tickets
        console.log('🔄 Updating support tickets...');
        await prisma.supportMessage.deleteMany({ where: { senderId: userId } });
        await prisma.supportTicket.updateMany({ 
            where: { assignedUserId: userId }, 
            data: { assignedUserId: null } 
        });
        // Note: userId in SupportTicket has onDelete: Cascade, so tickets will be deleted automatically
        console.log('✅ Support tickets updated');
        
        // 4. HR-related records
        console.log('🔄 Deleting HR records...');
        await prisma.attendance.deleteMany({ where: { userId } });
        await prisma.shiftAssignment.deleteMany({ where: { userId } });
        await prisma.hRAuditLog.deleteMany({ where: { actorId: userId } });
        console.log('✅ HR records deleted');
        
        // 5. Rewards & Kudos
        console.log('🔄 Deleting rewards records...');
        await prisma.rewardRecord.deleteMany({ where: { userId } });
        await prisma.rewardEligibilityLog.deleteMany({ where: { userId } });
        await prisma.kudos.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } });
        console.log('✅ Rewards records deleted');
        
        // 6. Other relations
        console.log('🔄 Deleting other user records...');
        await prisma.activity.deleteMany({ where: { userId } });
        await prisma.customerNote.deleteMany({ where: { authorId: userId } });
        await prisma.callAttemptLog.deleteMany({ where: { userId } });
        await prisma.returnActivityLog.deleteMany({ where: { userId } });
        await prisma.returnContactAttempt.deleteMany({ where: { userId } });
        await prisma.clearanceChecklist.updateMany({ where: { completedBy: userId }, data: { completedBy: null } });
        console.log('✅ Other user records deleted');
        
        // 7. Image & Text galleries
        console.log('🔄 Deleting gallery records...');
        await prisma.imageGallery.deleteMany({ where: { userId } });
        await prisma.imageStudioHistory.deleteMany({ where: { userId } });
        await prisma.textGallery.deleteMany({ where: { userId } });
        console.log('✅ Gallery records deleted');
        
        // 8. DevTeamMember
        console.log('🔄 Deleting DevTeamMember...');
        await prisma.devTeamMember.deleteMany({ where: { userId } });
        console.log('✅ DevTeamMember deleted');
        
        // 9. UserCompany relations
        console.log('🔄 Deleting UserCompany relations...');
        await prisma.userCompany.deleteMany({ where: { userId } });
        console.log('✅ UserCompany relations deleted');
        
        // 10. ActivityLogs & Notifications
        console.log('🔄 Deleting ActivityLogs & Notifications...');
        await prisma.activityLog.deleteMany({ where: { userId } });
        await prisma.notification.deleteMany({ where: { userId } });
        console.log('✅ ActivityLogs & Notifications deleted');
        
        // 11. Delete Tasks assigned to or created by user
        console.log('🔄 Deleting tasks...');
        await prisma.task.deleteMany({ where: { OR: [{ assignedTo: userId }, { createdBy: userId }] } });
        console.log('✅ Tasks deleted');
        
        // 12. Delete the user
        console.log('🔄 Deleting user...');
        await prisma.user.delete({ where: { id: userId } });
        console.log('✅ User deleted successfully!\n');
        
        console.log('🎉 Deletion completed without errors!');
        
    } catch (error) {
        console.error('\n❌ ERROR during deletion:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('\nFull error:', error);
    }
    
    process.exit(0);
}

deleteUser().catch(console.error);
