import React, { useState, useEffect } from 'react';
import { Note } from '../../../types/inbox.types';
import { useNotes } from '../../../hooks/inbox/useNotes';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface NotesPanelProps {
    customerId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ customerId, isOpen, onClose }) => {
    const { fetchNotes, addNote, deleteNote, loading } = useNotes();
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && customerId) {
            loadNotes();
        }
    }, [isOpen, customerId]);

    const loadNotes = async () => {
        const fetchedNotes = await fetchNotes(customerId);
        setNotes(fetchedNotes);
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        const addedNote = await addNote(customerId, newNote);
        setIsSubmitting(false);

        if (addedNote) {
            setNotes([addedNote, ...notes]);
            setNewNote('');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
            const success = await deleteNote(noteId);
            if (success) {
                setNotes(notes.filter(n => n.id !== noteId));
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 w-80 shadow-lg absolute right-0 top-0 bottom-0 z-20 transform transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">الملاحظات الخاصة</h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && notes.length === 0 ? (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                ) : notes.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        لا توجد ملاحظات بعد
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/50 relative group">
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.content}</p>
                            <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                <span>{note.authorName}</span>
                                <span>{format(note.createdAt, 'PP p', { locale: ar })}</span>
                            </div>
                            <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="absolute top-2 left-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="حذف"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <form onSubmit={handleAddNote}>
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="أضف ملاحظة خاصة..."
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none h-24 text-sm"
                        disabled={isSubmitting}
                    />
                    <div className="mt-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={!newNote.trim() || isSubmitting}
                            className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${isSubmitting ? 'cursor-wait' : ''}`}
                        >
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
