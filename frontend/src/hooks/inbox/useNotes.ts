import { useCallback, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { Note } from '../../types/inbox.types';

export const useNotes = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch notes for a customer
    const fetchNotes = useCallback(async (customerId: string): Promise<Note[]> => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get<{ data: any[] }>(`/customers/${customerId}/notes`);

            // Transform backend response to match frontend Note interface
            // Backend returns: { id, customerId, authorId, content, createdAt, author: {firstName, lastName, avatar} }
            // Frontend expects: { id, conversationId, content, authorId, authorName, mentions, attachments, createdAt, updatedAt }

            return response.data.data.map((note: any) => ({
                id: note.id,
                conversationId: '', // Notes are per-customer now, but interface requires string
                content: note.content,
                authorId: note.authorId,
                authorName: `${note.author?.firstName || ''} ${note.author?.lastName || ''}`.trim() || 'Unknown',
                authorAvatar: note.author?.avatar, // We might need to extend Note interface or ignore this
                mentions: [],
                attachments: [],
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt || note.createdAt)
            }));
        } catch (err: any) {
            console.error('❌ Error fetching notes:', err);
            setError(err.message || 'فشل في جلب الملاحظات');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Add a new note
    const addNote = useCallback(async (customerId: string, content: string): Promise<Note | null> => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.post<{ data: any }>(`/customers/${customerId}/notes`, { content });

            const note = response.data.data;

            return {
                id: note.id,
                conversationId: '',
                content: note.content,
                authorId: note.authorId,
                authorName: `${note.author?.firstName || ''} ${note.author?.lastName || ''}`.trim() || 'Unknown',
                mentions: [],
                attachments: [],
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt || note.createdAt)
            };
        } catch (err: any) {
            console.error('❌ Error adding note:', err);
            setError(err.message || 'فشل في إضافة الملاحظة');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Delete a note
    const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);
            await apiClient.delete(`/customers/notes/${noteId}`);
            return true;
        } catch (err: any) {
            console.error('❌ Error deleting note:', err);
            setError(err.message || 'فشل في حذف الملاحظة');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        fetchNotes,
        addNote,
        deleteNote,
        loading,
        error
    };
};
