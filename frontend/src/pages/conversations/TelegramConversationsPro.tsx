import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import { useTranslation } from 'react-i18next';
import useSocket from '../../hooks/useSocket';
import { companyAwareApi } from '../../services/companyAwareApi';
import {
    Send, Paperclip, Smile, MoreVertical,
    Search, Phone, Check, CheckCheck,
    MessageCircle, Bot, Settings,
    User, MapPin, File, Image as ImageIcon,
    Reply, Forward, Trash2, Mic, X,
    Video, Music, Map, Contact, Edit, Download,
    Play, Pause, Volume2
} from 'lucide-react';

// --- Types ---
interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'voice';
    isFromCustomer: boolean;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    conversationId: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    isAiGenerated?: boolean;
    replyToMessageId?: string;
    location?: { latitude: number; longitude: number };
    duration?: number; // for audio/voice messages
}

interface Conversation {
    id: string;
    customerId: string;
    customerName: string;
    customerAvatar?: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    platform: 'telegram';
    isOnline: boolean;
    messages: Message[];
    telegramBotId?: string;
}

const TelegramConversationsPro: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const { i18n } = useTranslation();
    const { socket, isConnected } = useSocket();

    // Detect language direction
    const isRTL = i18n.language === 'ar';
    const dir = isRTL ? 'rtl' : 'ltr';

    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [isInfoOpen, setIsInfoOpen] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [showMediaGallery, setShowMediaGallery] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [showFileMenu, setShowFileMenu] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);

    // Filtered Conversations
    const filteredConversations = conversations.filter(c =>
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filtered Messages (for chat search)
    const filteredMessages = chatSearchQuery
        ? messages.filter(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
        : messages;

    const activeConversation = conversations.find(c => c.id === selectedConversationId);

    // --- Effects ---

    // 1. Load Conversations
    useEffect(() => {
        if (!isAuthenticated || !user?.companyId) return;

        const fetchConversations = async () => {
            try {
                setLoading(true);
                const response = await companyAwareApi.getConversations({
                    page: 1,
                    limit: 50,
                    platform: 'telegram'
                });

                if (response.data && response.data.data) {
                    const formatted = response.data.data.map((c: any) => ({
                        id: c.id,
                        customerId: c.customerId,
                        customerName: c.customerName || 'Telegram User',
                        lastMessage: c.lastMessage || '',
                        lastMessageTime: new Date(c.lastMessageTime || Date.now()),
                        unreadCount: c.unreadCount || 0,
                        platform: 'telegram',
                        isOnline: false,
                        messages: []
                    }));
                    setConversations(formatted);
                }
            } catch (error) {
                console.error("Failed to load Telegram conversations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [isAuthenticated, user?.companyId]);

    // 2. Load Messages
    useEffect(() => {
        if (!selectedConversationId) return;

        const fetchMessages = async () => {
            try {
                const response = await companyAwareApi.get(`/conversations/${selectedConversationId}/messages`);
                const data = response.data.data || [];

                const loadedMessages: Message[] = data.map((msg: any) => ({
                    id: msg.id,
                    content: msg.content,
                    senderId: msg.senderId || 'unknown',
                    senderName: msg.isFromCustomer ? 'Customer' : 'Agent',
                    timestamp: new Date(msg.createdAt || Date.now()),
                    type: (msg.type || 'text').toLowerCase(),
                    isFromCustomer: msg.isFromCustomer,
                    status: 'read',
                    conversationId: selectedConversationId,
                    fileUrl: msg.fileUrl || (msg.metadata ? JSON.parse(msg.metadata || '{}').fileUrl : undefined),
                    fileName: msg.fileName || (msg.metadata ? JSON.parse(msg.metadata || '{}').fileName : undefined),
                    fileSize: msg.fileSize || (msg.metadata ? JSON.parse(msg.metadata || '{}').fileSize : undefined),
                    location: msg.location || (msg.metadata ? JSON.parse(msg.metadata || '{}').location : undefined),
                    duration: msg.duration || (msg.metadata ? JSON.parse(msg.metadata || '{}').duration : undefined)
                }));

                // ترتيب الرسائل من الأقدم للأحدث (الأقدم أولاً)
                const sortedMessages = loadedMessages.sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );

                setMessages(sortedMessages);
            } catch (error) {
                console.error("Failed to load messages:", error);
            }
        };

        fetchMessages();
    }, [selectedConversationId]);

    // 3. Socket
    useEffect(() => {
        if (!socket || !isConnected || !user?.companyId) {
            console.log('⚠️ [SOCKET] Socket not ready:', {
                socket: !!socket,
                isConnected,
                companyId: user?.companyId
            });
            return;
        }

        // Join company room to receive messages
        socket.emit('join_company_room', { companyId: user.companyId });
        console.log('🔌 [SOCKET] Joined company room:', user.companyId);

        const handleNewMessage = (data: any) => {
            console.log('📨 [SOCKET] Received message:', {
                id: data.id,
                platform: data.platform,
                channel: data.channel,
                conversationId: data.conversationId,
                companyId: data.companyId,
                userCompanyId: user?.companyId,
                content: data.content?.substring(0, 50)
            });

            // Filter for Telegram messages
            const isTelegram = data.platform === 'telegram' || data.channel === 'TELEGRAM';
            if (!isTelegram) {
                console.log('⚠️ [SOCKET] Not a Telegram message, skipping. Platform:', data.platform, 'Channel:', data.channel);
                return;
            }

            if (String(data.companyId) !== String(user?.companyId)) {
                console.log('⚠️ [SOCKET] Different company, skipping. Data company:', data.companyId, 'User company:', user?.companyId);
                return;
            }

            console.log('✅ [SOCKET] Processing Telegram message for conversation:', data.conversationId);

            setConversations(prev => {
                const exists = prev.find(c => c.id === data.conversationId);
                if (exists) {
                    return prev.map(c => c.id === data.conversationId ? {
                        ...c,
                        lastMessage: data.content,
                        lastMessageTime: new Date(),
                        unreadCount: data.conversationId === selectedConversationId ? 0 : (c.unreadCount + 1)
                    } : c);
                }
                return prev;
            });

            if (selectedConversationId === data.conversationId) {
                const newMsg: Message = {
                    id: data.id || Date.now().toString(),
                    content: data.content,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    timestamp: new Date(data.timestamp || Date.now()),
                    type: (data.type || 'text').toLowerCase(),
                    isFromCustomer: data.isFromCustomer,
                    status: 'delivered',
                    conversationId: data.conversationId,
                    fileUrl: data.fileUrl || (data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata).fileUrl : undefined),
                    fileName: data.fileName || (data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata).fileName : undefined),
                    location: data.location || (data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata).location : undefined),
                    duration: data.duration || (data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata).duration : undefined)
                };

                // منع التكرار: التحقق من وجود الرسالة بالفعل
                setMessages(prev => {
                    // التحقق من وجود الرسالة بنفس ID
                    const existsById = prev.some(msg => msg.id === newMsg.id);
                    if (existsById) {
                        console.log('⚠️ [SOCKET] Message already exists by ID, skipping:', newMsg.id);
                        return prev;
                    }

                    // التحقق من الرسائل المؤقتة (temp messages) - استبدالها بالرسالة الحقيقية
                    const tempMessageIndex = prev.findIndex(msg =>
                        msg.id.startsWith('temp_') &&
                        msg.content === newMsg.content &&
                        !msg.isFromCustomer === !newMsg.isFromCustomer &&
                        Math.abs(new Date(msg.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) < 5000
                    );

                    if (tempMessageIndex !== -1) {
                        // استبدال الرسالة المؤقتة بالرسالة الحقيقية
                        const updated = [...prev];
                        updated[tempMessageIndex] = newMsg;
                        // ترتيب الرسائل بعد الاستبدال
                        return updated.sort((a, b) =>
                            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        );
                    }

                    // إضافة الرسالة الجديدة وترتيبها
                    const updated = [...prev, newMsg];
                    return updated.sort((a, b) =>
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    );
                });
                setTimeout(scrollToBottom, 100);
            }
        };

        const handleTyping = (data: any) => {
            if (data.conversationId === selectedConversationId && data.isFromCustomer) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 3000);
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('typing', handleTyping);
        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('typing', handleTyping);
        };
    }, [socket, isConnected, selectedConversationId, user?.companyId]);

    // Handlers
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!selectedConversationId || !inputText.trim()) return;

        const messageContent = inputText.trim();
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempMsg: Message = {
            id: tempId,
            content: messageContent,
            senderId: user?.id || 'me',
            senderName: 'Me',
            timestamp: new Date(),
            type: 'text',
            isFromCustomer: false,
            status: 'sending',
            conversationId: selectedConversationId,
            replyToMessageId: replyingTo?.id
        };

        // إضافة الرسالة المؤقتة
        setMessages(prev => {
            const updated = [...prev, tempMsg];
            return updated.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
        });
        setInputText('');
        setReplyingTo(null);
        setTimeout(scrollToBottom, 100);

        try {
            const response = await companyAwareApi.post(`/conversations/${selectedConversationId}/messages`, {
                message: messageContent,
                type: 'text',
                replyToMessageId: replyingTo?.id
            });

            // إذا كانت الرسالة تم حفظها بنجاح، سيتم استبدالها بالرسالة الحقيقية من Socket
            // لكن إذا لم تأت من Socket، نحدث حالة الرسالة المؤقتة
            if (response.data.success && response.data.data) {
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId
                        ? { ...msg, id: response.data.data.id, status: 'sent' }
                        : msg
                ));
            }
        } catch (error) {
            console.error("Failed to send:", error);
            // في حالة الفشل، إزالة الرسالة المؤقتة
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' | 'document') => {
        if (!e.target.files || !e.target.files[0] || !selectedConversationId) return;

        const file = e.target.files[0];
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // إضافة رسالة مؤقتة
        const tempMsg: Message = {
            id: tempId,
            content: `[${type}]`,
            senderId: user?.id || 'me',
            senderName: 'Me',
            timestamp: new Date(),
            type: type,
            isFromCustomer: false,
            status: 'sending',
            conversationId: selectedConversationId,
            fileName: file.name,
            fileSize: file.size
        };

        setMessages(prev => {
            const updated = [...prev, tempMsg];
            return updated.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
        });
        setTimeout(scrollToBottom, 100);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        try {
            const response = await companyAwareApi.post(`/conversations/${selectedConversationId}/messages/media`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                // تحديث الرسالة المؤقتة بالرسالة الحقيقية
                // سيتم استبدالها بالرسالة الكاملة من Socket لاحقاً
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId
                        ? { ...msg, id: response.data.data.id, status: 'sent' }
                        : msg
                ));
            }
        } catch (error) {
            console.error("Failed to upload file:", error);
            // إزالة الرسالة المؤقتة في حالة الفشل
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            alert(isRTL ? 'فشل رفع الملف' : 'Failed to upload file');
        }
    };

    const handleSendLocation = async () => {
        if (!selectedConversationId) return;

        if (!navigator.geolocation) {
            alert(isRTL ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const response = await companyAwareApi.post(`/conversations/${selectedConversationId}/messages`, {
                    type: 'location',
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });

                if (response.data.success) {
                    const newMsg: Message = {
                        id: response.data.data.id || Date.now().toString(),
                        content: '',
                        senderId: user?.id || 'me',
                        senderName: 'Me',
                        timestamp: new Date(),
                        type: 'location',
                        isFromCustomer: false,
                        status: 'sent',
                        conversationId: selectedConversationId,
                        location: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        }
                    };
                    setMessages(prev => [...prev, newMsg]);
                    setTimeout(scrollToBottom, 100);
                }
            } catch (error) {
                console.error("Failed to send location:", error);
            }
        });
    };

    const handleEditMessage = async (message: Message) => {
        if (!inputText.trim()) return;

        try {
            await companyAwareApi.put(`/conversations/${selectedConversationId}/messages/${message.id}`, {
                content: inputText
            });

            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, content: inputText } : m));
            setEditingMessage(null);
            setInputText('');
        } catch (error) {
            console.error("Failed to edit message:", error);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm(isRTL ? 'هل تريد حذف هذه الرسالة؟' : 'Delete this message?')) return;

        try {
            await companyAwareApi.delete(`/conversations/${selectedConversationId}/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    };

    const handleForwardMessage = async (message: Message) => {
        // TODO: Implement forward to another conversation
        alert(isRTL ? 'ميزة إعادة التوجيه قريباً' : 'Forward feature coming soon');
    };

    // Get media messages for gallery
    const mediaMessages = messages.filter(m => ['image', 'video', 'document'].includes(m.type));

    // --- Render ---
    return (
        <div className={`flex h-[calc(100vh-64px)] bg-[#f0f2f5] dark:bg-gray-900 overflow-hidden`} dir={dir}>

            {/* SIDEBAR: Conversations List - Position based on language */}
            <div className={`w-[350px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 z-20 ${isRTL ? 'order-3' : 'order-1'}`}>
                {/* Header */}
                <div className="p-4 bg-[#2AABEE] text-white flex justify-between items-center shadow-sm">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Bot size={20} />
                        {isRTL ? 'محادثات تيليجرام' : 'Telegram Chats'}
                    </h2>
                    <div className="flex gap-2">
                        <Settings size={18} className="cursor-pointer opacity-80 hover:opacity-100" />
                    </div>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isRTL ? 'بحث في المحادثات...' : 'Search chats...'}
                            className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#2AABEE] transition-all`}
                        />
                        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5 text-gray-400`} size={16} />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2AABEE] mb-2"></div>
                            {isRTL ? 'جاري التحميل...' : 'Loading...'}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">
                            {searchQuery ? (isRTL ? 'لا توجد نتائج' : 'No results found') : (isRTL ? 'لا توجد محادثات' : 'No conversations found')}
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setSelectedConversationId(conv.id)}
                                className={`p-3 border-b border-gray-50 dark:border-gray-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors
                                    ${selectedConversationId === conv.id ? `bg-blue-100 dark:bg-blue-900/20 ${isRTL ? 'border-r-4 border-r-[#2AABEE]' : 'border-l-4 border-l-[#2AABEE]'}` : ''}
                                `}
                            >
                                <div className={`flex justify-between items-start mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm truncate">{conv.customerName}</h3>
                                    <span className={`text-[10px] text-gray-400 whitespace-nowrap ${isRTL ? 'mr-2' : 'ml-2'}`}>
                                        {conv.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`flex justify-between items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <p className={`text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px] ${isRTL ? 'text-right' : 'text-left'}`}>{conv.lastMessage}</p>
                                    {conv.unreadCount > 0 && (
                                        <span className="bg-[#2AABEE] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MIDDLE: Chat Area */}
            <div className="flex-1 flex flex-col bg-[#8EBFD4] dark:bg-gray-800 bg-opacity-10 relative order-2">
                {selectedConversationId && activeConversation ? (
                    <>
                        {/* Header */}
                        <div className={`p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center z-10 shadow-sm px-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                    {activeConversation.customerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white pointer-events-none">
                                        {activeConversation.customerName}
                                    </h3>
                                    <div className={`text-xs text-[#2AABEE] flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        {isRTL ? 'مشترك بوت' : 'bot subscriber'}
                                        {isTyping && <span className="text-gray-500 ml-2">{isRTL ? 'يكتب...' : 'typing...'}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <button
                                    onClick={() => setChatSearchQuery(chatSearchQuery ? '' : ' ')}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    title={isRTL ? 'بحث في المحادثة' : 'Search in chat'}
                                >
                                    <Search size={20} />
                                </button>
                                <button
                                    onClick={() => setShowMediaGallery(!showMediaGallery)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    title={isRTL ? 'معرض الوسائط' : 'Media gallery'}
                                >
                                    <ImageIcon size={20} />
                                </button>
                                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title={isRTL ? 'مكالمة (قريباً)' : 'Call (Coming Soon)'}>
                                    <Phone size={20} />
                                </button>
                                <button
                                    className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${isInfoOpen ? 'text-[#2AABEE] bg-blue-50' : ''}`}
                                    onClick={() => setIsInfoOpen(!isInfoOpen)}
                                    title={isRTL ? 'تبديل المعلومات' : 'Toggle Info'}
                                >
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Search Bar */}
                        {chatSearchQuery !== null && chatSearchQuery !== '' && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={chatSearchQuery}
                                    onChange={(e) => setChatSearchQuery(e.target.value)}
                                    placeholder={isRTL ? 'بحث في الرسائل...' : 'Search messages...'}
                                    className={`flex-1 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2AABEE]`}
                                    autoFocus
                                />
                                <button onClick={() => setChatSearchQuery('')} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {/* Media Gallery */}
                        {showMediaGallery && (
                            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                                <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">{isRTL ? 'الوسائط المشتركة' : 'Shared Media'}</h4>
                                <div className="grid grid-cols-6 gap-2">
                                    {mediaMessages.slice(0, 12).map((msg, idx) => (
                                        <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80">
                                            {msg.type === 'image' && msg.fileUrl ? (
                                                <img src={msg.fileUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {msg.type === 'video' && <Video size={20} className="text-gray-400" />}
                                                    {msg.type === 'document' && <File size={20} className="text-gray-400" />}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 z-10 custom-scrollbar">
                            {/* ترتيب الرسائل من الأقدم للأحدث للعرض */}
                            {filteredMessages
                                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                .map((msg, idx) => {
                                    const isMe = !msg.isFromCustomer;
                                    const replyingToMsg = msg.replyToMessageId ? messages.find(m => m.id === msg.replyToMessageId) : null;

                                    return (
                                        <div
                                            key={idx}
                                            className={`group flex ${isMe ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}
                                        >
                                            <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm relative group-hover:shadow-md transition-shadow
                                            ${isMe ? `bg-[#E3F2FD] ${isRTL ? 'rounded-tl-none' : 'rounded-tr-none'}` : `bg-white ${isRTL ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                                        `}>
                                                {/* Reply Preview */}
                                                {replyingToMsg && (
                                                    <div className={`mb-2 ${isRTL ? 'border-r-2' : 'border-l-2'} border-[#2AABEE] pl-2 pr-2 py-1 bg-gray-50 rounded text-xs`}>
                                                        <p className="font-semibold text-[#2AABEE]">{replyingToMsg.senderName}</p>
                                                        <p className="text-gray-600 truncate">{replyingToMsg.content || (isRTL ? 'وسائط' : 'Media')}</p>
                                                    </div>
                                                )}

                                                {!isMe && <p className="text-[10px] text-blue-500 font-bold mb-1 opacity-80">{msg.senderName}</p>}

                                                {/* Media Rendering */}
                                                {msg.type === 'image' && msg.fileUrl && (
                                                    <div className="mb-2 relative rounded-lg overflow-hidden border border-gray-100">
                                                        <img src={msg.fileUrl} alt="attachment" className="max-w-xs max-h-64 object-cover" />
                                                    </div>
                                                )}

                                                {msg.type === 'video' && msg.fileUrl && (
                                                    <div className="mb-2 relative rounded-lg overflow-hidden border border-gray-100">
                                                        <video src={msg.fileUrl} controls className="max-w-xs max-h-64" />
                                                    </div>
                                                )}

                                                {msg.type === 'audio' && (
                                                    <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded">
                                                        <Music size={20} className="text-[#2AABEE]" />
                                                        <div className="flex-1">
                                                            <p className="text-xs font-semibold">{msg.fileName || (isRTL ? 'ملف صوتي' : 'Audio file')}</p>
                                                            {msg.duration && <p className="text-[10px] text-gray-500">{msg.duration}s</p>}
                                                        </div>
                                                        <button className="p-1 hover:bg-gray-200 rounded">
                                                            <Play size={16} />
                                                        </button>
                                                    </div>
                                                )}

                                                {msg.type === 'voice' && (
                                                    <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded">
                                                        <Mic size={20} className="text-[#2AABEE]" />
                                                        <div className="flex-1 bg-gray-200 h-1 rounded-full">
                                                            <div className="bg-[#2AABEE] h-1 rounded-full" style={{ width: '60%' }}></div>
                                                        </div>
                                                        {msg.duration && <span className="text-xs text-gray-500">{msg.duration}s</span>}
                                                    </div>
                                                )}

                                                {msg.type === 'document' && (
                                                    <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                                                        <File size={24} className="text-[#2AABEE]" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold truncate">{msg.fileName || (isRTL ? 'مستند' : 'Document')}</p>
                                                            {msg.fileSize && <p className="text-xs text-gray-500">{(msg.fileSize / 1024).toFixed(1)} KB</p>}
                                                        </div>
                                                        <button className="p-1 hover:bg-gray-200 rounded">
                                                            <Download size={16} />
                                                        </button>
                                                    </div>
                                                )}

                                                {msg.type === 'location' && msg.location && (
                                                    <div className="mb-2 relative rounded-lg overflow-hidden border border-gray-100">
                                                        <div className="w-64 h-32 bg-gray-200 flex items-center justify-center">
                                                            <Map size={32} className="text-[#2AABEE]" />
                                                        </div>
                                                        <a
                                                            href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="absolute bottom-2 left-2 right-2 bg-white px-2 py-1 rounded text-xs text-[#2AABEE] hover:bg-blue-50"
                                                        >
                                                            {isRTL ? 'فتح في الخرائط' : 'Open in Maps'}
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Text Content */}
                                                {msg.content && (
                                                    <p className={`text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed min-w-[120px] ${isRTL ? 'text-right' : 'text-left'}`}>
                                                        {msg.content}
                                                    </p>
                                                )}

                                                {/* Footer (Time + Status) */}
                                                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} items-center gap-1 mt-1 select-none`}>
                                                    <span className="text-[10px] text-gray-400">
                                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && (
                                                        msg.status === 'read' ? <CheckCheck size={14} className="text-[#2AABEE]" /> : <Check size={14} className="text-gray-400" />
                                                    )}
                                                </div>

                                                {/* Message Actions (Hover) */}
                                                <div className={`absolute top-0 ${isMe ? (isRTL ? '-right-20' : '-left-20') : (isRTL ? '-left-20' : '-right-20')} h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <button
                                                        onClick={() => setReplyingTo(msg)}
                                                        className="p-1.5 bg-white rounded-full shadow text-gray-500 hover:text-[#2AABEE]"
                                                        title={isRTL ? 'رد' : 'Reply'}
                                                    >
                                                        <Reply size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleForwardMessage(msg)}
                                                        className="p-1.5 bg-white rounded-full shadow text-gray-500 hover:text-[#2AABEE]"
                                                        title={isRTL ? 'إعادة توجيه' : 'Forward'}
                                                    >
                                                        <Forward size={14} />
                                                    </button>
                                                    {isMe && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingMessage(msg);
                                                                    setInputText(msg.content);
                                                                }}
                                                                className="p-1.5 bg-white rounded-full shadow text-gray-500 hover:text-[#2AABEE]"
                                                                title={isRTL ? 'تعديل' : 'Edit'}
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteMessage(msg.id)}
                                                                className="p-1.5 bg-white rounded-full shadow text-gray-500 hover:text-red-500"
                                                                title={isRTL ? 'حذف' : 'Delete'}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10 px-4 py-4">
                            {/* Reply Preview */}
                            {replyingTo && (
                                <div className={`mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-[#2AABEE]">{isRTL ? 'رد على' : 'Replying to'} {replyingTo.senderName}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{replyingTo.content || (isRTL ? 'وسائط' : 'Media')}</p>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Edit Preview */}
                            {editingMessage && (
                                <div className={`mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">{isRTL ? 'تعديل الرسالة' : 'Editing message'}</p>
                                    <button onClick={() => {
                                        setEditingMessage(null);
                                        setInputText('');
                                    }} className="p-1 hover:bg-yellow-100 rounded">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <div className={`flex items-end gap-2 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {/* File Menu */}
                                {showFileMenu && (
                                    <div className={`absolute bottom-16 ${isRTL ? 'right-4' : 'left-4'} bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50`}>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                    setShowFileMenu(false);
                                                }}
                                                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex flex-col items-center gap-2"
                                            >
                                                <ImageIcon size={24} className="text-[#2AABEE]" />
                                                <span className="text-xs text-gray-700 dark:text-gray-300">{isRTL ? 'صورة' : 'Photo'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    videoInputRef.current?.click();
                                                    setShowFileMenu(false);
                                                }}
                                                className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center gap-2"
                                            >
                                                <Video size={24} className="text-[#2AABEE]" />
                                                <span className="text-xs">{isRTL ? 'فيديو' : 'Video'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    audioInputRef.current?.click();
                                                    setShowFileMenu(false);
                                                }}
                                                className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center gap-2"
                                            >
                                                <Music size={24} className="text-[#2AABEE]" />
                                                <span className="text-xs">{isRTL ? 'صوت' : 'Audio'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    documentInputRef.current?.click();
                                                    setShowFileMenu(false);
                                                }}
                                                className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center gap-2"
                                            >
                                                <File size={24} className="text-[#2AABEE]" />
                                                <span className="text-xs">{isRTL ? 'ملف' : 'File'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleSendLocation();
                                                    setShowFileMenu(false);
                                                }}
                                                className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center gap-2"
                                            >
                                                <Map size={24} className="text-[#2AABEE]" />
                                                <span className="text-xs">{isRTL ? 'موقع' : 'Location'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // TODO: Implement contact sharing
                                                    alert(isRTL ? 'ميزة مشاركة جهة الاتصال قريباً' : 'Contact sharing coming soon');
                                                    setShowFileMenu(false);
                                                }}
                                                className="p-3 hover:bg-gray-50 rounded-lg flex flex-col items-center gap-2"
                                            >
                                                <Contact size={24} className="text-[#2AABEE]" />
                                                <span className="text-xs">{isRTL ? 'جهة اتصال' : 'Contact'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Hidden File Inputs */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e, 'image')}
                                />
                                <input
                                    type="file"
                                    ref={videoInputRef}
                                    className="hidden"
                                    accept="video/*"
                                    onChange={(e) => handleFileSelect(e, 'video')}
                                />
                                <input
                                    type="file"
                                    ref={audioInputRef}
                                    className="hidden"
                                    accept="audio/*"
                                    onChange={(e) => handleFileSelect(e, 'audio')}
                                />
                                <input
                                    type="file"
                                    ref={documentInputRef}
                                    className="hidden"
                                    onChange={(e) => handleFileSelect(e, 'document')}
                                />

                                <button
                                    onClick={() => setShowFileMenu(!showFileMenu)}
                                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title={isRTL ? 'إرفاق ملف' : 'Attach File'}
                                >
                                    <Paperclip size={24} />
                                </button>

                                <div className={`flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl flex items-center ${isRTL ? 'pr-4 pl-4' : 'pl-4 pr-4'} py-2 focus-within:ring-2 focus-within:ring-[#2AABEE] focus-within:bg-white dark:focus-within:bg-gray-600 transition-all`}>
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (editingMessage) {
                                                    handleEditMessage(editingMessage);
                                                } else {
                                                    handleSendMessage();
                                                }
                                            }
                                        }}
                                        placeholder={isRTL ? 'اكتب رسالة...' : 'Write a message...'}
                                        className="w-full bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed"
                                    />
                                    <Smile size={20} className={`text-gray-400 cursor-pointer hover:text-gray-600 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                                </div>

                                {inputText.trim() || editingMessage ? (
                                    <button
                                        onClick={() => editingMessage ? handleEditMessage(editingMessage) : handleSendMessage()}
                                        className="p-3 bg-[#2AABEE] text-white rounded-full shadow-lg hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center transform"
                                    >
                                        <Send size={20} className={isRTL ? 'mr-0.5' : 'ml-0.5'} />
                                    </button>
                                ) : (
                                    <button
                                        className="p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                                        title={isRTL ? 'رسالة صوتية (قريباً)' : 'Record Voice (Coming Soon)'}
                                    >
                                        <Mic size={24} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 select-none">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <MessageCircle size={48} className="text-gray-200" />
                        </div>
                        <p className="text-lg font-medium text-gray-400">{isRTL ? 'اختر محادثة للبدء' : 'Select a chat to start messaging'}</p>
                        <p className={`text-sm mt-2 max-w-xs text-center ${isRTL ? 'text-right' : 'text-left'}`}>
                            {isRTL ? 'استخدم شريط البحث على اليمين للعثور على عملاء محددين.' : 'Use the search bar on the left to find specific customers.'}
                        </p>
                    </div>
                )}
            </div>

            {/* RIGHT SIDEBAR: Info/CRM - Position based on language */}
            {selectedConversationId && activeConversation && isInfoOpen && (
                <div className={`w-[300px] bg-white border-l border-gray-200 flex flex-col z-20 shadow-lg animate-in slide-in-from-right duration-300 ${isRTL ? 'order-1 border-r border-l-0' : 'order-3'}`}>
                    {/* Header */}
                    <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h3 className="font-bold text-gray-700">{isRTL ? 'معلومات المستخدم' : 'UserInfo'}</h3>
                        <button onClick={() => setIsInfoOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                        {/* Avatar */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2AABEE] to-blue-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg mb-3">
                                {activeConversation.customerName.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-lg font-bold text-gray-800 text-center">{activeConversation.customerName}</h2>
                            <p className="text-sm text-gray-500">@{activeConversation.customerName.replace(/\s/g, '').toLowerCase()}</p>
                            <span className="mt-2 text-xs bg-blue-50 text-[#2AABEE] px-2 py-1 rounded-full font-medium">
                                {isRTL ? 'مستخدم تيليجرام' : 'Telegram User'}
                            </span>
                        </div>

                        {/* Info List */}
                        <div className="space-y-4">
                            <div className={`flex items-center gap-3 text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Phone size={18} className="text-gray-400" />
                                <span className="text-sm">+20 10XXXX XXXX</span>
                            </div>
                            <div className={`flex items-center gap-3 text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Bot size={18} className="text-gray-400" />
                                <span className="text-sm text-wrap break-all">{activeConversation.customerId}</span>
                            </div>
                            <div className={`flex items-center gap-3 text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <MapPin size={18} className="text-gray-400" />
                                <span className="text-sm">{isRTL ? 'مصر (تقريبي)' : 'Egypt (Approx.)'}</span>
                            </div>
                        </div>

                        {/* Shared Media Section */}
                        <div className="pt-4 border-t border-gray-100">
                            <h4 className={`text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {isRTL ? 'الوسائط المشتركة' : 'Shared Media'}
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {mediaMessages.slice(0, 9).map((msg, idx) => (
                                    <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80">
                                        {msg.type === 'image' && msg.fileUrl ? (
                                            <img src={msg.fileUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {msg.type === 'video' && <Video size={20} className="text-gray-300" />}
                                                {msg.type === 'document' && <File className="text-gray-300" size={20} />}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-gray-100 space-y-2">
                            <button className={`w-full py-2 flex items-center justify-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Trash2 size={16} />
                                {isRTL ? 'حذف المحادثة' : 'Delete Conversation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TelegramConversationsPro;

