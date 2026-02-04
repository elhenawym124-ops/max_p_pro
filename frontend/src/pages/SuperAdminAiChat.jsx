import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuthSimple';
import { buildApiUrl } from '../utils/urlHelper';
import {
    PaperAirplaneIcon,
    SparklesIcon,
    UserIcon,
    CpuChipIcon,
    TrashIcon
} from '@heroicons/react/24/outline';

const SuperAdminAiChat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'system',
            content: 'مرحباً بك! أنا خبير النظام الذكي. كيف يمكنني مساعدتك اليوم في إدارة النظام أو فهم الكود؟',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch history from DB on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(buildApiUrl('super-admin/ai-chat/history'), {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                });
                const data = await response.json();
                if (data.success && data.data.length > 0) {
                    const mappedMessages = data.data.map((msg, index) => ({
                        id: `history-${index}`,
                        role: msg.role === 'assistant' ? 'assistant' : 'user', // Ensure strict mapping
                        content: msg.content,
                        timestamp: new Date() // Or fetch real timestamp if available
                    }));
                    // Prepend welcome message if needed or just use history
                    setMessages(prev => {
                        // Avoid duplicating if react strict mode runs twice
                        if (prev.length > 1) return prev;
                        return [prev[0], ...mappedMessages];
                    });
                }
            } catch (error) {
                console.error('Failed to load chat history:', error);
            }
        };
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Frontend sends full history for context, but backend will only save the new message
            const response = await fetch(buildApiUrl('super-admin/ai-chat'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            const data = await response.json();

            if (data.success) {
                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.data,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                const errorMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'system',
                    content: 'عذراً، حدث خطأ أثناء الاتصال بالخادم: ' + (data.message || 'Unknown Error'),
                    isError: true,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Chat Error:', error);
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: 'فشل في الاتصال بالخدمة. يرجى المحاولة لاحقاً.',
                isError: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        // Here we might want to add an API call to clear history in DB too if requested
        setMessages([
            {
                id: 'welcome',
                role: 'system',
                content: 'تم مسح المحادثة من الشاشة الحالية.',
                timestamp: new Date()
            }
        ]);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] w-full p-4" dir="rtl">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                        <CpuChipIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">خبير النظام الذكي</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">مساعدك الشخصي لإدارة وتطوير النظام</p>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="مسح المحادثة"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                                    ? 'bg-gray-200 dark:bg-gray-700'
                                    : message.isError ? 'bg-red-100 dark:bg-red-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'
                                    }`}>
                                    {message.role === 'user' ? (
                                        <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    ) : (
                                        <SparklesIcon className={`w-5 h-5 ${message.isError ? 'text-red-600' : 'text-indigo-600 dark:text-indigo-400'}`} />
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`p-4 rounded-2xl shadow-sm ${message.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : message.isError
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-tl-none'
                                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                    }`}>
                                    <div className="whitespace-pre-wrap leading-relaxed text-sm">
                                        {message.content}
                                    </div>
                                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                                        }`}>
                                        {new Date(message.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex gap-3 max-w-[80%]">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl rounded-tl-none flex items-center gap-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleSend} className="relative flex items-end gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                                placeholder="اكتب رسالتك للنظام... (Shift+Enter لسطر جديد)"
                                className="w-full pl-4 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-sm"
                                rows={1}
                                style={{ minHeight: '50px', maxHeight: '150px' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 active:scale-95"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <PaperAirplaneIcon className="w-6 h-6 transform -rotate-180" /> // Rotated for RTL if needed, usually icon points right. Check usage.
                            )}
                        </button>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            يمكن للذكاء الاصطناعي ارتكاب أخطاء. يرجى مراجعة المعلومات الحساسة.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminAiChat;

