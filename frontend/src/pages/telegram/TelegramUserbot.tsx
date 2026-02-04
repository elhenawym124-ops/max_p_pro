import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import { apiClient } from '../../services/apiClient';

// Alias for easier usage
const api = apiClient;

// Media cache to avoid re-downloading the same media
const mediaCache = new Map<string, { blobUrl: string; mimeType: string; timestamp: number }>();
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

// Cleanup old cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of mediaCache.entries()) {
        if (now - value.timestamp > CACHE_MAX_AGE) {
            URL.revokeObjectURL(value.blobUrl);
            mediaCache.delete(key);
        }
    }
}, 5 * 60 * 1000); // Check every 5 minutes
import {
    PaperAirplaneIcon,
    ChatBubbleLeftRightIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';

interface Chat {
    id: string;
    name: string;
    unreadCount: number;
    lastMessage: string;
    date: number;
    isGroup: boolean;
    isUser: boolean;
    isChannel: boolean;
}

interface Message {
    id: number | string;
    text: string;
    date: number;
    senderId: string | null;
    senderName?: string;
    isOut: boolean;
    media: { type: string } | null | boolean; // Can be object with type, null, or boolean (for backwards compat)
}

// Internal Media Component - Extracted to prevent re-remounting
const MediaMessage = ({ msg, userbotId, chatId }: { msg: Message, userbotId: string, chatId?: string }) => {
    // Create cache key
    const cacheKey = useMemo(() => `${userbotId}-${chatId}-${msg.id}`, [userbotId, chatId, msg.id]);

    // Check cache first
    const cachedMedia = useMemo(() => {
        const cached = mediaCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_MAX_AGE) {
            return cached;
        }
        return null;
    }, [cacheKey]);

    const [mediaUrl, setMediaUrl] = useState<string | null>(cachedMedia?.blobUrl || null);
    const [loading, setLoading] = useState(!cachedMedia);
    const [error, setError] = useState(false);
    const [mimeType, setMimeType] = useState<string | null>(cachedMedia?.mimeType || null);

    // Determine media type from the media object
    const getMediaType = () => {
        if (!msg.media || typeof msg.media !== 'object') return 'unknown';
        const type = (msg.media as any).type || '';
        if (type.includes('Photo') || type === 'MessageMediaPhoto') return 'image';
        if (type.includes('Video') || type === 'MessageMediaVideo') return 'video';
        if (type.includes('Document') || type === 'MessageMediaDocument') return 'document';
        if (type.includes('Audio') || type === 'MessageMediaAudio') return 'audio';
        if (type.includes('WebPage')) return 'webpage';
        return 'unknown';
    };

    const mediaType = getMediaType();

    // Check if media is WebPage (link preview) - often not downloadable
    const isWebPage = mediaType === 'webpage';

    const loadMedia = useCallback(async () => {
        // Check cache first
        const cached = mediaCache.get(cacheKey);
        const hasValidCache = cached && (Date.now() - cached.timestamp) < CACHE_MAX_AGE;

        // Don't auto-load WebPage previews
        if (isWebPage) {
            setLoading(false);
            return;
        }

        // Use cached media if available
        if (hasValidCache) {
            setMediaUrl(cached.blobUrl);
            setMimeType(cached.mimeType);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(false);
        try {
            const response = await api.get('/userbot/message/media', {
                params: {
                    userbotConfigId: userbotId,
                    chatId: chatId,
                    messageId: msg.id
                },
                responseType: 'blob'
            });

            const url = URL.createObjectURL(response.data);
            const detectedMimeType = response.data.type || response.headers['content-type'] || 'application/octet-stream';

            // Cache the media
            mediaCache.set(cacheKey, {
                blobUrl: url,
                mimeType: detectedMimeType,
                timestamp: Date.now()
            });

            setMediaUrl(url);
            setMimeType(detectedMimeType);
            setLoading(false);
        } catch (err: any) {
            console.error("Failed to load media", err);
            setError(true);
            setLoading(false);
        }
    }, [cacheKey, isWebPage, msg.id, userbotId, chatId, mediaType]);

    useEffect(() => {
        // Check cache directly (not through cachedMedia which might be stale)
        const cached = mediaCache.get(cacheKey);
        const hasValidCache = cached && (Date.now() - cached.timestamp) < CACHE_MAX_AGE;

        if (isWebPage) {
            setLoading(false);
        } else if (hasValidCache) {
            // Use cached media immediately
            // Check if mediaUrl needs to be updated (may differ if cache was populated after component mount)
            setMediaUrl(cached.blobUrl);
            setMimeType(cached.mimeType);
            setLoading(false);
        } else {
            // No valid cache - need to load media (even if mediaUrl exists, it might be stale/invalid)
            // loadMedia will check cache again and load from API if needed
            loadMedia();
        }

        // Don't revoke blob URLs here - they're cached and will be cleaned up by the cache cleanup interval
        return () => {
            // Note: We don't revoke blob URLs here because they're cached
            // The cache cleanup will handle revoking old URLs
        };
    }, [msg.id, userbotId, chatId, isWebPage, cacheKey, loadMedia]);

    // Determine if mime type indicates image, video, or document
    // Priority: MIME type (from API) > Telegram media type
    const isImage = mimeType ? mimeType.startsWith('image/') : (mediaType === 'image');
    const isVideo = mimeType ? mimeType.startsWith('video/') : (mediaType === 'video');
    const isAudio = mimeType ? mimeType.startsWith('audio/') : (mediaType === 'audio');

    // For documents, check if MIME type indicates it's actually an image/video/audio
    const isDocumentAsImage = mediaType === 'document' && mimeType?.startsWith('image/');
    const isDocumentAsVideo = mediaType === 'document' && mimeType?.startsWith('video/');
    const isDocumentAsAudio = mediaType === 'document' && mimeType?.startsWith('audio/');

    const finalIsImage = isImage || isDocumentAsImage;
    const finalIsVideo = isVideo || isDocumentAsVideo;
    const finalIsAudio = isAudio || isDocumentAsAudio;

    if (isWebPage) return null; // Hide WebPage media for now

    if (loading) {
        return <div className="h-40 w-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded flex items-center justify-center"><PhotoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" /></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-2 border border-red-200 dark:border-red-800 rounded bg-red-50 dark:bg-red-900/20 mb-2">
                <div className="text-xs text-red-500 dark:text-red-400 mb-1">Failed to load media</div>
                <button
                    onClick={(e) => { e.stopPropagation(); loadMedia(); }}
                    className="text-[10px] bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!mediaUrl) return null;

    // Render based on media type
    if (finalIsImage) {
        return (
            <div className="mb-2 -mx-3 -mt-3 first:mt-0">
                <img
                    src={mediaUrl}
                    alt="Media"
                    className="w-full rounded-t-lg max-h-96 object-contain cursor-pointer"
                    style={{ maxWidth: '400px', display: 'block' }}
                    onClick={() => window.open(mediaUrl, '_blank')}
                    onError={() => {
                        setError(true);
                    }}
                />
            </div>
        );
    }

    if (finalIsVideo) {
        return (
            <div className="mb-2 -mx-3 -mt-3 first:mt-0">
                <video
                    src={mediaUrl}
                    controls
                    className="w-full rounded-t-lg max-h-96 cursor-pointer"
                    style={{ maxWidth: '400px', display: 'block' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        );
    }

    if (finalIsAudio) {
        return (
            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <audio
                    src={mediaUrl}
                    controls
                    className="w-full"
                >
                    Your browser does not support the audio tag.
                </audio>
            </div>
        );
    }

    // For documents or unknown types, show download link
    return (
        <div className="mb-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center gap-2">
                <PhotoIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Media file</span>
                <a
                    href={mediaUrl}
                    download
                    className="ml-auto text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    onClick={(e) => e.stopPropagation()}
                >
                    Download
                </a>
            </div>
            {mimeType && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{mimeType}</div>
            )}
        </div>
    );
};

const TelegramUserbot: React.FC = () => {
    const { user } = useAuth();
    const [step, setStep] = useState<'SELECT' | 'LOGIN' | 'VERIFY' | 'CHATS'>('SELECT');

    // Userbot Selection
    const [userbots, setUserbots] = useState<any[]>([]);
    const [selectedUserbot, setSelectedUserbot] = useState<string | null>(null);

    // Chats & Messages

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Filtered chats
    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Auto-scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ... removed internal MediaMessage ...

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load userbots on mount
    useEffect(() => {
        if (user?.companyId) {
            loadUserbots();
        }
    }, [user?.companyId]);

    // Auto-fetch chats when userbot is selected and step is CHATS (for auto-login)
    useEffect(() => {
        if (selectedUserbot && step === 'CHATS' && chats.length === 0) {
            console.log('🔄 Auto-fetching chats for logged in userbot:', selectedUserbot);
            fetchChats();
        }
    }, [selectedUserbot, step]);

    const loadUserbots = async () => {
        if (!user?.companyId) return;

        try {
            const response = await api.get('/v1/telegram/userbots');

            const userbotsList = response.data?.data || response.data || [];
            setUserbots(Array.isArray(userbotsList) ? userbotsList : []);

            // Check if any userbot is already logged in (has active session)
            const loggedInUserbot = userbotsList.find((ub: any) =>
                ub.sessionString
            );

            if (loggedInUserbot) {
                // Userbot is already logged in, go directly to chats
                console.log('✅ Found logged in userbot:', loggedInUserbot.id);
                setSelectedUserbot(loggedInUserbot.id);
                setStep('CHATS');
            } else {
                // No connected userbot found, show selection (which will show "not connected" state if bots exist but aren't connected)
                setStep('SELECT');
            }
        } catch (error: any) {
            console.error('Failed to load userbots:', error);
            if (error.response?.status === 404) {
                // No userbots configured yet - this is OK
                setUserbots([]);
                setStep('SELECT');
            } else {
                // (error.response?.data?.error || 'Failed to load userbots. Please add a userbot in Settings first.'); // Removed setError
            }
        }
    };


    // 3. Fetch Chats
    const fetchChats = async () => {
        if (!selectedUserbot) {
            console.warn('⚠️ Cannot fetch chats: no userbot selected');
            return;
        }

        try {
            console.log('📥 Fetching chats for userbot:', selectedUserbot);
            const res = await api.get('/userbot/dialogs', {
                params: {
                    userbotConfigId: selectedUserbot
                }
            });

            if (res.data.success) {
                console.log('✅ Chats fetched:', res.data.data?.length || 0);
                setChats(res.data.data || []);
                setStep('CHATS');
            } else {
                console.error('❌ Failed to fetch chats:', res.data.error);

                // Check if session expired
                if (res.data.error === 'AUTH_KEY_UNREGISTERED' || res.data.requiresReauth) {
                    // Session expired.
                    setStep('SELECT');
                    // Clear any cached userbot selection
                    setSelectedUserbot(null);
                } else {
                    // (res.data.error || res.data.message || 'Failed to fetch chats');
                }
            }
        } catch (err: any) {
            console.error('❌ Failed to fetch chats:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to fetch chats';

            // Check if it's an auth error
            if (errorMessage.includes('AUTH_KEY_UNREGISTERED') || err.response?.data?.requiresReauth) {
                // Session expired.
                setStep('SELECT');
                setSelectedUserbot(null);
            } else {
                if (step === 'CHATS') {
                    // If we're already on CHATS step, maybe session expired
                    console.warn('⚠️ Session might be expired, redirecting to select');
                    setStep('SELECT');
                }
            }
        }
    };

    // 4. Fetch Messages
    useEffect(() => {
        if (!selectedChat || !user?.companyId) return;

        const fetchMessages = async () => {
            if (!selectedUserbot) return;

            try {
                const res = await api.get('/userbot/messages', {
                    params: {
                        userbotConfigId: selectedUserbot,
                        chatId: selectedChat.id
                    }
                });
                // Sort messages by date (oldest first) before setting
                const sortedMessages = (res.data.data || []).sort((a: Message, b: Message) => a.date - b.date);
                setMessages(sortedMessages);
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Polling every 3s
        return () => clearInterval(interval);
    }, [selectedChat, user?.companyId]);

    // Check session on mount


    // 5. Send Message
    const handleSendMessage = async () => {
        if (!selectedChat || !messageText.trim() || !selectedUserbot) return;

        try {
            await api.post('/userbot/message', {
                userbotConfigId: selectedUserbot,
                chatId: selectedChat.id,
                message: messageText
            });

            // Optimistic update
            const newMessage: Message = {
                id: Date.now(),
                text: messageText,
                date: Math.floor(Date.now() / 1000),
                senderId: "me",
                isOut: true,
                media: false
            };
            setMessages(prev => [...prev, newMessage]);
            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // 6. Logout


    // 7. Send File
    const handleSendFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedChat || !e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userbotConfigId', selectedUserbot || '');
        formData.append('chatId', selectedChat.id);

        try {
            await api.post('/userbot/message/file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            // Optimistic Update (Text only placeholder)
            const newMessage: Message = {
                id: Date.now(),
                text: `[File: ${file.name}]`,
                date: Math.floor(Date.now() / 1000),
                senderId: "me",
                isOut: true,
                media: true
            };
            setMessages(prev => [...prev, newMessage]);
        } catch (err: any) {
            alert('Failed to upload: ' + err.message);
        }
    };

    return (
        <div className="p-6 w-full h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                        <PaperAirplaneIcon className="h-8 w-8 text-blue-500" />
                        Telegram Userbot
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Connect your personal Telegram account</p>
                </div>
            </div>

            {step === 'SELECT' && (
                <div className="flex-1 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md text-center">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Select Userbot</h2>
                        {!userbots || userbots.length === 0 ? (
                            <div className="py-4">
                                <PaperAirplaneIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-6">No Telegram Userbots connected yet.</p>
                                <a href="/settings/telegram" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    Go to Settings to Connect
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select an account to start chatting:</p>
                                {Array.isArray(userbots) && userbots.map((userbot: any) => {
                                    if (!userbot || !userbot.id) return null;
                                    const isConnected = userbot.sessionString;

                                    if (!isConnected) return null; // Only show connected bots

                                    return (
                                        <button
                                            key={userbot.id}
                                            onClick={() => {
                                                setSelectedUserbot(userbot.id);
                                                // Check if it's already connected
                                                if (userbot.sessionString) {
                                                    setStep('CHATS');
                                                } else {
                                                    setStep('SELECT');
                                                }
                                            }}
                                            className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                                        >
                                            <div className="font-semibold flex items-center justify-between dark:text-white">
                                                <span>{userbot.label || 'Unnamed Userbot'}</span>
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                    Connected
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {userbot.clientPhone}
                                            </div>
                                        </button>
                                    );
                                })}

                                {userbots.filter(u => u.sessionString).length === 0 && (
                                    <div className="py-4">
                                        <p className="text-amber-600 mb-4">You have added Userbots but none are connected.</p>
                                        <a href="/settings/telegram" className="text-blue-600 font-medium hover:underline">
                                            Go to Settings to Complete Setup
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {
                step === 'CHATS' && (
                    <div className="flex-1 flex bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border dark:border-gray-700">
                        {/* Sidebar */}
                        <div className="w-80 border-r dark:border-r-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800">
                            <div className="p-4 border-b dark:border-b-gray-700 flex justify-between items-center">
                                <h3 className="font-bold dark:text-white">Chats</h3>
                                <button onClick={fetchChats} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded dark:text-gray-300">
                                    <ArrowPathIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="p-3 border-b dark:border-b-gray-700 bg-white dark:bg-gray-800">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search chats..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Logout should be handled in settings mostly, but let's keep a disconnect or redirect */}
                            <div className="px-4 pb-2">
                                <a href="/settings/telegram" className="text-xs text-gray-500 hover:underline block pt-2">
                                    Manage Connections in Settings
                                </a>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {filteredChats.map(chat => (
                                    <div
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        className={`p-3 border-b dark:border-b-gray-700 cursor-pointer hover:bg-white dark:hover:bg-gray-750 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}`}
                                    >
                                        <div className="flex justify-between mb-1">
                                            <span className="font-semibold truncate dark:text-white">{chat.name}</span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(chat.date * 1000).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate w-4/5">
                                                {chat.lastMessage}
                                            </div>
                                            {chat.unreadCount > 0 && (
                                                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-gray-900">
                            {selectedChat ? (
                                <>
                                    <div className="p-4 bg-white dark:bg-gray-800 border-b dark:border-b-gray-700 shadow-sm flex-none">
                                        <h3 className="font-bold text-lg dark:text-white">{selectedChat.name}</h3>
                                    </div>

                                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                        {messages
                                            .sort((a, b) => a.date - b.date) // Sort by date (oldest first)
                                            .map((msg, index) => (
                                                <div key={`${msg.id}-${index}`} className={`flex ${msg.isOut ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[70%] rounded-lg shadow-sm overflow-hidden ${msg.isOut ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none'
                                                        } ${msg.media ? 'p-0' : 'p-3'}`}>
                                                        {/* Sender name for incoming messages */}
                                                        {!msg.isOut && msg.senderName && (
                                                            <div className={`text-xs font-semibold mb-1 px-3 pt-3 ${msg.isOut ? 'text-blue-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                {msg.senderName}
                                                            </div>
                                                        )}
                                                        {msg.media && selectedUserbot && selectedChat && (
                                                            <MediaMessage msg={msg} userbotId={selectedUserbot} chatId={selectedChat.id} />
                                                        )}
                                                        {!msg.media && <div className="break-words">{msg.text}</div>}
                                                        {msg.media && msg.text && <div className="break-words mt-2 px-3">{msg.text}</div>}
                                                        <div className={`text-[10px] mt-1 flex justify-between items-center px-3 pb-2 ${msg.isOut ? 'text-blue-200' : 'text-gray-400'}`}>
                                                            <span>{new Date(msg.date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            {msg.isOut && <span className="ml-2">✓</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-t-gray-700 flex gap-2 flex-none items-center">
                                        <label className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500">
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={handleSendFile}
                                            />
                                            <span className="text-xl">📎</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="flex-1 border dark:border-gray-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                                            placeholder="Type a message..."
                                            value={messageText}
                                            onChange={e => setMessageText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                                        >
                                            <PaperAirplaneIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col justify-center items-center text-gray-400">
                                    <ChatBubbleLeftRightIcon className="h-20 w-20 mb-4 opacity-20" />
                                    <p>Select a chat to view conversation</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TelegramUserbot;

