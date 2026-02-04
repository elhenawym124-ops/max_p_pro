import React, { useState, memo } from 'react';
import { Trash2, MoreVertical, Reply, Forward, Star, Smile } from 'lucide-react';
import ReactionSelector from '../Generic/ReactionSelector';

interface Message {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
    type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'template' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO' | 'TEMPLATE';
    isFromCustomer: boolean;
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
    conversationId: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    isAiGenerated?: boolean;
    metadata?: any;
    attachments?: any[];
    isStarred?: boolean; // We will map this from metadata in parent or handle it here
}

interface MessageBubbleProps {
    message: Message;
    onDelete?: (messageId: string) => void;
    onForward?: (message: Message) => void;
    onStar?: (messageId: string, isStarred: boolean) => void;
    onReaction?: (messageId: string, reaction: string) => void;
    onReply?: (message: Message) => void;
    currentUserId?: string;
    hasBeenReplied?: boolean; // جديد: هل تم الرد على هذه الرسالة
}

const MessageBubble: React.FC<MessageBubbleProps> = memo(({ message, onDelete, onForward, onStar, onReaction, onReply, currentUserId, hasBeenReplied }) => {
    const isCustomer = !!message.isFromCustomer;
    const isAI = message.isAiGenerated;
    const [showActions, setShowActions] = useState(false);
    const [showReactionSelector, setShowReactionSelector] = useState(false);

    // Parse metadata safely
    let metadata: any = {};
    try {
        if (typeof message.metadata === 'string') {
            metadata = JSON.parse(message.metadata);
        } else if (typeof message.metadata === 'object') {
            metadata = message.metadata;
        }
    } catch (e) {
        // ignore
    }

    const isStarred = metadata?.isStarred || message.isStarred;
    const replyTo = metadata?.replyTo;
    const myReaction = metadata?.myReaction;
    const reactionCounts = metadata?.reactions || {};

    const formatTime = (date: Date) => {
        const now = new Date();
        const messageDate = new Date(date);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));
        
        const timeStr = messageDate.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            calendar: 'gregory'
        });
        
        if (diffDays === 0) {
            // Today
            return timeStr;
        } else if (diffDays === 1) {
            // Yesterday
            return `أمس ${timeStr}`;
        } else if (diffDays < 7) {
            // Within this week
            return messageDate.toLocaleDateString('ar-EG', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                calendar: 'gregory'
            });
        } else {
            // Older
            return messageDate.toLocaleDateString('ar-EG', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                calendar: 'gregory'
            });
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div
            className={`flex w-full mb-4 group relative`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Action Buttons (Left for user, Right for customer) */}
            {showActions && (
                <div
                    className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm p-1 z-20 ${isCustomer ? 'right-full mr-2' : 'left-full ml-2'
                        }`}
                >
                    {onReaction && (
                        <div className="relative">
                            <button
                                onClick={() => setShowReactionSelector(!showReactionSelector)}
                                className={`p-1.5 rounded-full transition-colors ${myReaction
                                    ? 'text-yellow-500 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                                    : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                title="إضافة تفاعل"
                            >
                                <Smile size={14} />
                            </button>
                            {showReactionSelector && (
                                <ReactionSelector
                                    onSelect={(r) => {
                                        if (onReaction) onReaction(message.id, r);
                                        setShowReactionSelector(false);
                                    }}
                                    currentReaction={myReaction}
                                />
                            )}
                        </div>
                    )}
                    {onReply && (
                        <button
                            onClick={() => onReply(message)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            title="رد"
                        >
                            <Reply size={14} />
                        </button>
                    )}
                    {onStar && (
                        <button
                            onClick={() => onStar(message.id, !!isStarred)}
                            className={`p-1.5 rounded-full transition-colors ${isStarred
                                ? 'text-yellow-500 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            title={isStarred ? "إلغاء التمييز" : "تمييز الرسالة"}
                        >
                            <Star size={14} fill={isStarred ? "currentColor" : "none"} />
                        </button>
                    )}
                    {onForward && (
                        <button
                            onClick={() => onForward(message)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            title="إعادة توجيه"
                        >
                            <Forward size={14} />
                        </button>
                    )}
                    {!isCustomer && onDelete && (
                        <button
                            onClick={() => onDelete(message.id)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            title="حذف الرسالة"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            )}

            <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${isCustomer ? 'ml-auto' : 'mr-auto'}`}>
                {/* Sender name (for employee/AI messages) */}
                {!isCustomer && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-left">
                        {message.senderName}
                        {isAI && ' 🤖'}
                    </div>
                )}

                {/* Unreplied indicator for customer messages */}
                {isCustomer && hasBeenReplied === false && (
                    <div className="flex items-center gap-1 mb-1 text-xs text-red-600 dark:text-red-400 font-medium">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        <span>غير مردود عليها</span>
                    </div>
                )}

                <div
                    className={`px-4 py-2 rounded-2xl ${isCustomer
                        ? hasBeenReplied === false 
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-br-sm border-2 border-red-300 dark:border-red-500' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-br-sm'
                        : isAI
                            ? 'bg-green-500 dark:bg-green-600 text-white rounded-bl-sm'
                            : 'bg-blue-600 dark:bg-blue-500 text-white rounded-bl-sm'
                        }`}
                >
                    {/* Reply Context */}
                    {replyTo && (
                        <div className={`mb-2 text-xs border-l-2 pl-2 ${isCustomer ? 'border-gray-500 dark:border-gray-400 text-gray-600 dark:text-gray-300' : 'border-white/50 text-white/80'}`}>
                            <div className="font-semibold">{replyTo.senderName}</div>
                            <div className="truncate opacity-80">
                                {replyTo.type === 'text' ? replyTo.content : 'مرفق/صورة'}
                            </div>
                        </div>
                    )}

                    {/* Image message */}
                    {(message.type === 'image' || message.type === 'IMAGE') && (message.fileUrl || (typeof message.content === 'string' && message.content.startsWith('http'))) && (
                        <div className="mb-2">
                            <img
                                src={message.fileUrl || message.content}
                                alt="صورة"
                                loading="lazy"
                                className="rounded-lg max-w-full h-auto"
                                style={{ maxHeight: '300px' }}
                            />
                        </div>
                    )}

                    {/* Video message */}
                    {(message.type === 'video' || message.type === 'VIDEO') && (message.fileUrl || (typeof message.content === 'string' && message.content.startsWith('http'))) && (
                        <div className="mb-2">
                            <video
                                src={message.fileUrl || message.content}
                                controls
                                className="rounded-lg max-w-full h-auto"
                                style={{ maxHeight: '300px' }}
                            />
                        </div>
                    )}

                    {/* Audio message */}
                    {(message.type === 'audio' || message.type === 'AUDIO') && (message.fileUrl || (typeof message.content === 'string' && message.content.startsWith('http'))) && (
                        <div className="mb-2">
                            <audio
                                src={message.fileUrl || message.content}
                                controls
                                className="w-full min-w-[200px]"
                            />
                        </div>
                    )}

                    {/* Template/Check for buttons in metadata or attachments */}
                    {((message.type === 'template' || message.type === 'TEMPLATE') || (message.attachments && message.attachments.length > 0)) && (
                        <div className="mb-2 flex flex-col gap-2">
                            {message.attachments?.map((att: any, i: number) => {
                                // Skip standard media as they might be handled above, unless we want to show everything from attachments
                                if (att.type === 'image' || att.type === 'IMAGE') return null;
                                if (att.type === 'video' || att.type === 'VIDEO') return null;
                                if (att.type === 'audio' || att.type === 'AUDIO') return null;

                                // Handle template
                                if (att.payload && att.payload.template_type === 'generic') {
                                    return (
                                        <div key={i} className="flex flex-col gap-2 overflow-hidden rounded-lg border border-white/20">
                                            {att.payload.elements?.map((el: any, j: number) => (
                                                <div key={j} className="bg-black/10 p-2">
                                                    {el.image_url && <img src={el.image_url} alt="" className="w-full h-32 object-cover rounded mb-2" />}
                                                    {el.title && <div className="font-bold text-sm mb-1">{el.title}</div>}
                                                    {el.subtitle && <div className="text-xs opacity-80 mb-2">{el.subtitle}</div>}
                                                    <div className="flex flex-col gap-1">
                                                        {el.buttons && el.buttons.map((btn: any, k: number) => (
                                                            <a key={k} href={btn.url} target="_blank" rel="noopener noreferrer" className="block text-center bg-white/20 hover:bg-white/30 py-1.5 px-3 rounded text-xs transition-colors truncate">
                                                                {btn.title} {btn.type === 'web_url' ? '🔗' : ''}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }

                                // Handle button template
                                if (att.payload && att.payload.template_type === 'button') {
                                    return (
                                        <div key={i} className="flex flex-col gap-2">
                                            <div className="text-sm opacity-90 mb-1">{att.payload.text}</div>
                                            <div className="flex flex-col gap-1">
                                                {att.payload.buttons && att.payload.buttons.map((btn: any, k: number) => (
                                                    <a key={k} href={btn.url} target="_blank" rel="noopener noreferrer" className="block text-center bg-white/20 hover:bg-white/30 py-1.5 px-3 rounded text-xs transition-colors truncate">
                                                        {btn.title}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    )}

                    {/* File message */}
                    {(message.type === 'file' || message.type === 'FILE') && (message.fileUrl || (typeof message.content === 'string' && message.content.startsWith('http'))) && (
                        <a
                            href={message.fileUrl || message.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${isCustomer ? 'bg-gray-300 dark:bg-gray-600' : 'bg-white/20'
                                }`}
                        >
                            <div className="flex-shrink-0 w-10 h-10 bg-white/30 dark:bg-gray-700/50 rounded-lg flex items-center justify-center">
                                📎
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isCustomer ? 'text-gray-900 dark:text-gray-100' : 'text-white'
                                    }`}>
                                    {message.fileName || message.content}
                                </p>
                                <p className={`text-xs ${isCustomer ? 'text-gray-600 dark:text-gray-400' : 'text-white/70'
                                    }`}>
                                    {formatFileSize(message.fileSize)}
                                </p>
                            </div>
                            <div className="text-xs">⬇️</div>
                        </a>
                    )}

                    {/* Text content */}
                    {message.content && (
                        (() => {
                            // Check if content has embedded URL (format: "text |TYPE_URL|url")
                            if (message.content.includes('|IMAGE_URL|') || message.content.includes('|FILE_URL|') || message.content.includes('|VIDEO_URL|') || message.content.includes('|AUDIO_URL|')) {
                                const textPart = message.content.split(/(\|(IMAGE|FILE|VIDEO|AUDIO)_URL\|)/)[0].trim();
                                return textPart ? (
                                    <p className="text-sm whitespace-pre-wrap break-words mb-2">
                                        {textPart}
                                    </p>
                                ) : null;
                            }
                            // Regular text content (not a URL)
                            // Don't show content as text if it's a URL and the message type is media
                            const isMediaType = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'image', 'video', 'audio', 'file'].includes(message.type);
                            const contentIsUrl = typeof message.content === 'string' && message.content.startsWith('http');
                            if (message.content !== message.fileUrl && !(isMediaType && contentIsUrl)) {
                                return (
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                        {message.content}
                                    </p>
                                );
                            }
                            return null;
                        })()
                    )}

                    {/* Reactions Display */}
                    {Object.keys(reactionCounts).length > 0 && (
                        <div className={`absolute -bottom-3 ${isCustomer ? 'right-2' : 'left-2'} bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-100 dark:border-gray-700 flex items-center px-1.5 py-0.5 gap-1`}>
                            {Object.entries(reactionCounts).map(([reaction, count]) => (
                                <span key={reaction} className="text-xs leading-none flex items-center">
                                    <span className="text-sm">{reaction}</span>
                                    {count > 1 && <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-0.5 font-medium">{count}</span>}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Timestamp and status */}
                    <div className="flex items-center justify-end mt-1 gap-2">
                        {isStarred && <Star size={10} className="text-yellow-500 dark:text-yellow-400 fill-current" />}
                        <span className="text-xs opacity-75">
                            {formatTime(message.timestamp)}
                        </span>
                        {!isCustomer && (
                            <span className="text-xs flex items-center gap-0.5">
                                {message.status === 'sending' && (
                                    <span className="flex items-center gap-1 text-white/70">
                                        <span className="animate-spin inline-block w-3 h-3 border border-white/50 border-t-white rounded-full"></span>
                                    </span>
                                )}
                                {message.status === 'sent' && <span className="text-white/90">✓</span>}
                                {message.status === 'delivered' && <span className="text-white">✓✓</span>}
                                {message.status === 'read' && <span className="text-blue-200 dark:text-blue-300">✓✓</span>}
                                {message.status === 'error' && <span className="text-red-300 dark:text-red-400">❌</span>}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.content === nextProps.message.content &&
        prevProps.message.timestamp.getTime() === nextProps.message.timestamp.getTime() &&
        prevProps.message.status === nextProps.message.status &&
        prevProps.message.metadata === nextProps.message.metadata &&
        prevProps.hasBeenReplied === nextProps.hasBeenReplied &&
        prevProps.currentUserId === nextProps.currentUserId
    );
});

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
