import { useCallback, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { ConversationStatus } from '../../types/inbox.types';

export const useConversationActions = () => {
    const [updating, setUpdating] = useState(false);

    // Update conversation status
    const updateStatus = useCallback(async (
        conversationId: string,
        status: ConversationStatus,
        companyId: string
    ) => {
        try {
            setUpdating(true);

            await apiClient.put(`/conversations/${conversationId}`, {
                status,
                companyId
            });

            return true;
        } catch (error: any) {
            console.error('❌ Error updating status:', error);
            throw new Error(error.message || 'فشل في تحديث الحالة');
        } finally {
            setUpdating(false);
        }
    }, []);

    // Assign conversation to user
    const assignConversation = useCallback(async (
        conversationId: string,
        userId: string | null,
        companyId: string
    ) => {
        try {
            setUpdating(true);

            await apiClient.put(`/conversations/${conversationId}`, {
                assignedTo: userId,
                companyId
            });

            return true;
        } catch (error: any) {
            console.error('❌ Error assigning conversation:', error);
            throw new Error(error.message || 'فشل في تعيين المحادثة');
        } finally {
            setUpdating(false);
        }
    }, []);

    // Mark conversation as done
    const markAsDone = useCallback(async (
        conversationId: string,
        companyId: string
    ) => {
        try {
            setUpdating(true);

            await apiClient.put(`/conversations/${conversationId}`, {
                status: 'done',
                tab: 'done',
                companyId
            });

            return true;
        } catch (error: any) {
            console.error('❌ Error marking as done:', error);
            throw new Error(error.message || 'فشل في تحديث المحادثة');
        } finally {
            setUpdating(false);
        }
    }, []);

    // Toggle priority/star
    const togglePriority = useCallback(async (
        conversationId: string,
        priority: boolean,
        companyId: string
    ) => {
        try {
            setUpdating(true);

            await apiClient.put(`/conversations/${conversationId}`, {
                priority,
                companyId
            });

            return true;
        } catch (error: any) {
            console.error('❌ Error toggling priority:', error);
            throw new Error(error.message || 'فشل في تحديث الأولوية');
        } finally {
            setUpdating(false);
        }
    }, []);

    // Bulk update
    const bulkUpdate = useCallback(async (
        conversationIds: string[],
        action: string,
        value: any,
        _companyId?: string
    ) => {
        try {
            setUpdating(true);

            // Build updates object based on action
            const updates: Record<string, any> = {};
            updates[action] = value;

            const response = await apiClient.put('/conversations/bulk-update', {
                conversationIds,
                updates
            });

            return response.data;
        } catch (error: any) {
            console.error('❌ Error in bulk update:', error);
            throw new Error(error.message || 'فشل في تحديث المحادثات');
        } finally {
            setUpdating(false);
        }
    }, []);

    // Delete message
    const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
        try {
            setUpdating(true);
            await apiClient.delete(`/conversations/${conversationId}/messages/${messageId}`);
            return true;
        } catch (error: any) {
            console.error('❌ Error deleting message:', error);
            throw new Error(error.message || 'فشل في حذف الرسالة');
        } finally {
            setUpdating(false);
        }
    }, []);

    // Forward message
    const forwardMessage = useCallback(async (
        targetConversationId: string,
        message: { content: string, type: string, fileUrl?: string, fileName?: string },
        companyId: string
    ) => {
        try {
            setUpdating(true);

            if ((message.type === 'image' || message.type === 'IMAGE') && message.fileUrl) {
                // Forward image using send-existing-image
                await apiClient.post(`/conversations/${targetConversationId}/send-existing-image`, {
                    imageUrl: message.fileUrl,
                    filename: message.fileName || 'forwarded_image.jpg',
                    companyId
                });
            } else {
                // Forward text
                // Check if it has content, if not (e.g. file without specific handler), send placeholder
                const contentToSend = message.content || (message.fileUrl ? `File: ${message.fileUrl}` : 'Forwarded message');

                await apiClient.post(`/conversations/${targetConversationId}/messages`, {
                    message: contentToSend,
                    companyId
                });
            }
            return true;
        } catch (error: any) {
            console.error('❌ Error forwarding message:', error);
            throw new Error(error.message || 'فشل في إعادة توجيه الرسالة');
        } finally {
            setUpdating(false);
        }
    }, []);

    // Toggle message star
    const toggleMessageStar = useCallback(async (conversationId: string, messageId: string) => {
        try {
            // Note: Optimistic update should be handled in the UI
            const response = await apiClient.put(`/conversations/${conversationId}/messages/${messageId}/star`);
            return response.data.data.isStarred;
        } catch (error: any) {
            console.error('❌ Error starring message:', error);
            throw new Error(error.message || 'فشل في تمييز الرسالة');
        }
    }, []);

    // Toggle message reaction
    const toggleMessageReaction = useCallback(async (conversationId: string, messageId: string, reaction: string) => {
        try {
            const response = await apiClient.put(`/conversations/${conversationId}/messages/${messageId}/reaction`, { reaction });
            return response.data;
        } catch (error: any) {
            console.error('❌ Error updating reaction:', error);
            throw new Error(error.message || 'فشل في تحديث التفاعل');
        }
    }, []);

    const snoozeConversation = useCallback(async (conversationId: string, until: Date, companyId: string) => {
        setUpdating(true);
        try {
            await apiClient.post(`/conversations/${conversationId}/snooze`, {
                snoozeUntil: until.toISOString()
            });
        } catch (error) {
            console.error('Error snoozing conversation:', error);
            throw error;
        } finally {
            setUpdating(false);
        }
    }, []);

    const toggleAI = useCallback(async (conversationId: string, aiEnabled: boolean) => {
        setUpdating(true);
        try {
            const response = await apiClient.patch(`/conversations/${conversationId}/ai-toggle`, {
                aiEnabled
            });
            return response.data;
        } catch (error) {
            console.error('Error toggling AI:', error);
            throw error;
        } finally {
            setUpdating(false);
        }
    }, []);

    return {
        updateStatus,
        assignConversation,
        markAsDone,
        togglePriority,
        bulkUpdate,
        deleteMessage,
        forwardMessage,
        toggleMessageStar,
        toggleMessageReaction,

        snoozeConversation,
        toggleAI,
        updating,
    };
};
