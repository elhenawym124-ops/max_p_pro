import React, { useState } from 'react';
import { X, Search, Send, User } from 'lucide-react';
import { InboxConversation } from '../../../types/inbox.types';

interface ForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onForward: (targetConversationId: string) => Promise<void>;
    conversations: InboxConversation[];
}

const ForwardModal: React.FC<ForwardModalProps> = ({ isOpen, onClose, onForward, conversations }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const filteredConversations = conversations.filter(c =>
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.pageName && c.pageName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleForward = async () => {
        if (!selectedConversationId) return;
        setSending(true);
        try {
            await onForward(selectedConversationId);
            onClose();
        } catch (error) {
            console.error('Forward failed', error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">إعادة توجيه الرسالة</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="بحث عن محادثة..."
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filteredConversations.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد محادثات</p>
                    ) : (
                        <div className="space-y-1">
                            {filteredConversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversationId(conv.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedConversationId === conv.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                                        }`}
                                >
                                    {conv.customerAvatar ? (
                                        <img src={conv.customerAvatar} alt={conv.customerName} className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                            <User size={20} />
                                        </div>
                                    )}
                                    <div className="text-right flex-1">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{conv.customerName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.pageName || 'Facebook User'}</p>
                                    </div>
                                    {selectedConversationId === conv.id && (
                                        <div className="text-blue-600 dark:text-blue-400">
                                            <Send size={18} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                        disabled={sending}
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleForward}
                        disabled={!selectedConversationId || sending}
                        className={`px-6 py-2 rounded-lg flex items-center gap-2 ${selectedConversationId && !sending
                                ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {sending ? 'جاري الإرسال...' : 'إرسال'}
                        {!sending && <Send size={16} className="rotate-180" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
