/**
 * 📸 WhatsApp Status Hooks
 * React Query hooks for status operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

interface WhatsAppStatus {
    id: string;
    sessionId: string;
    remoteJid: string;
    messageId: string;
    type: string;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    timestamp: Date;
    expiresAt: Date;
    isViewed: boolean;
    viewedAt?: Date;
}

/**
 * Hook to fetch statuses for a session
 */
export const useStatuses = (sessionId: string) => {
    return useQuery({
        queryKey: ['whatsapp', 'statuses', sessionId],
        queryFn: async () => {
            const response = await apiClient.get(`/whatsapp/${sessionId}/statuses`);
            return response.data.statuses as WhatsAppStatus[];
        },
        enabled: !!sessionId,
        refetchInterval: 60000 // Refresh every minute
    });
};

/**
 * Hook to post a new status
 */
export const usePostStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sessionId, content, media }: {
            sessionId: string;
            content?: string;
            media?: File;
        }) => {
            const formData = new FormData();
            if (content) formData.append('content', content);
            if (media) formData.append('media', media);

            const response = await apiClient.post(
                `/whatsapp/${sessionId}/status`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );
            return response.data;
        },
        onSuccess: (_, variables) => {
            // Invalidate statuses query to refresh
            queryClient.invalidateQueries({ queryKey: ['whatsapp', 'statuses', variables.sessionId] });
        }
    });
};

/**
 * Hook to mark status as viewed
 */
export const useMarkStatusViewed = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sessionId, statusId }: {
            sessionId: string;
            statusId: string;
        }) => {
            const response = await apiClient.put(
                `/whatsapp/${sessionId}/status/${statusId}/view`
            );
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp', 'statuses', variables.sessionId] });
        }
    });
};
