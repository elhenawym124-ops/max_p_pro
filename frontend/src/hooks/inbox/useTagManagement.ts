import { useCallback, useState } from 'react';
import { apiClient } from '../../services/apiClient';

export const useTagManagement = () => {
    const [updating, setUpdating] = useState(false);

    // Add tags to conversation
    const addTags = useCallback(async (
        conversationId: string,
        tagIds: string[],
        companyId: string
    ) => {
        try {
            setUpdating(true);

            await apiClient.put(`/conversations/${conversationId}`, {
                tags: tagIds,
                companyId
            });

            return true;
        } catch (error: any) {
            console.error('❌ Error adding tags:', error);
            throw new Error(error.message || 'فشل في إضافة التصنيفات');
        } finally {
            setUpdating(false);
        }
    }, []);

    // Remove tag from conversation
    const removeTag = useCallback(async (
        conversationId: string,
        currentTags: string[],
        tagToRemove: string,
        companyId: string
    ) => {
        try {
            setUpdating(true);

            const newTags = currentTags.filter(t => t !== tagToRemove);

            await apiClient.put(`/conversations/${conversationId}`, {
                tags: newTags,
                companyId
            });

            return true;
        } catch (error: any) {
            console.error('❌ Error removing tag:', error);
            throw new Error(error.message || 'فشل في إزالة التصنيف');
        } finally {
            setUpdating(false);
        }
    }, []);

    return {
        addTags,
        removeTag,
        updating,
    };
};
