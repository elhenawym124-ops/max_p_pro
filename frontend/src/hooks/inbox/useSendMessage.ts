import { useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/apiClient';
import { uploadService } from '../../services/uploadService';

interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
    type: 'text' | 'image' | 'file' | 'IMAGE' | 'FILE';
    isFromCustomer: boolean;
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
    conversationId: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    isAiGenerated?: boolean;
}

export const useSendMessage = () => {
    const [sending, setSending] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    
    // 🆕 Track pending messages count for optimistic UI
    const pendingMessagesRef = useRef(0);

    // 🆕 Send text message with Optimistic UI support
    const sendTextMessage = useCallback(async (
        conversationId: string,
        content: string,
        companyId: string,
        replyTo?: any,
        onOptimisticMessage?: (message: Message) => void,
        onMessageSent?: (tempId: string, realMessage: Message) => void,
        onMessageError?: (tempId: string, error: string) => void
    ): Promise<Message | null> => {
        if (!content.trim()) return null;

        // 🆕 Create optimistic message with temporary ID
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const optimisticMessage: Message = {
            id: tempId,
            content: content.trim(),
            senderId: 'currentUser',
            senderName: 'أنت',
            timestamp: new Date(),
            type: 'text',
            isFromCustomer: false,
            status: 'sending',
            conversationId,
        };

        // 🆕 Immediately show optimistic message
        if (onOptimisticMessage) {
            onOptimisticMessage(optimisticMessage);
        }

        pendingMessagesRef.current++;
        setSending(pendingMessagesRef.current > 0);

        try {
            const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
                message: content.trim(),
                type: 'text',
                companyId,
                replyTo
            });

            const data = response.data?.data || response.data;

            // Format response as Message
            const message: Message = {
                id: data.id,
                content: data.content,
                senderId: data.senderId,
                senderName: data.senderName || 'أنت',
                timestamp: new Date(data.timestamp || data.createdAt),
                type: 'text',
                isFromCustomer: false,
                status: 'sent',
                conversationId: data.conversationId,
            };

            // 🆕 Update optimistic message with real data
            if (onMessageSent) {
                onMessageSent(tempId, message);
            }

            return message;
        } catch (error: any) {
            console.error('❌ Error sending message:', error);
            // 🆕 Mark optimistic message as error
            if (onMessageError) {
                onMessageError(tempId, error.message || 'فشل في إرسال الرسالة');
            }
            throw new Error(error.message || 'فشل في إرسال الرسالة');
        } finally {
            pendingMessagesRef.current--;
            setSending(pendingMessagesRef.current > 0);
        }
    }, []);

    // Send file/image message
    const sendFileMessage = useCallback(async (
        conversationId: string,
        file: File,
        _companyId: string
    ): Promise<Message | null> => {
        try {
            setUploadingFile(true);

            // Validate file
            const validation = uploadService.validateFile(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Upload file
            const uploadResult = await uploadService.uploadConversationFile(conversationId, file);

            if (!uploadResult.success || !uploadResult.data || !Array.isArray(uploadResult.data) || uploadResult.data.length === 0) {
                throw new Error('فشل في رفع الملف');
            }

            const uploadedFile = uploadResult.data[0];
            const isImage = file.type.startsWith('image/');

            // Return constructed message object from upload result
            // Backend already created the message and emitted socket event
            return {
                id: uploadedFile.messageId || Date.now().toString(),
                content: isImage ? 'صورة' : file.name,
                senderId: 'currentUser', // Placeholder
                senderName: 'Me', // Placeholder
                timestamp: new Date(),
                type: isImage ? 'image' : 'file',
                isFromCustomer: false,
                status: 'sent',
                conversationId,
                fileUrl: uploadedFile.fullUrl,
                fileName: uploadedFile.originalName,
                fileSize: uploadedFile.size
            };
        } catch (error: any) {
            console.error('❌ Error sending file:', error);
            throw new Error(error.message || 'فشل في إرسال الملف');
        } finally {
            setUploadingFile(false);
        }
    }, []);

    return {
        sendTextMessage,
        sendFileMessage,
        sending,
        uploadingFile,
    };
};
