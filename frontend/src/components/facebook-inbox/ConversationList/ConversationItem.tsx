import React, { memo } from 'react';
import { InboxConversation } from '../../../types/inbox.types';

interface ConversationItemProps {
    conversation: InboxConversation;
    isSelected: boolean;
    isMultiSelected?: boolean;
    onToggleSelection?: (e: React.MouseEvent) => void;
    onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = memo(({
    conversation,
    isSelected,
    isMultiSelected = false,
    onToggleSelection,
    onClick
}) => {
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `${minutes} د`;
        if (hours < 24) return `${hours} س`;
        if (days < 7) return `${days} يوم`;

        return date.toLocaleDateString('ar-EG', { 
            day: 'numeric', 
            month: 'short',
            calendar: 'gregory'
        });
    };

    return (
        <div
            onClick={onClick}
            className={`
        group relative p-4 cursor-pointer transition-all duration-200 border-b border-gray-100 dark:border-gray-700
        ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-r-blue-600 dark:border-r-blue-400'
                    : conversation.unreadCount > 0
                        ? 'bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50 dark:hover:bg-red-900/20 border-r-2 border-r-red-300 dark:border-r-red-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }
        ${isMultiSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}
      `}
        >
            <div className="flex items-start gap-3">
                {/* Avatar / Checkbox Container */}
                <div className="relative flex-shrink-0">
                    {/* Checkbox overlay - visible on hover or when selected */}
                    {(onToggleSelection && (isMultiSelected || true)) && (
                        <div
                            className={`absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 dark:bg-gray-700/80 transition-opacity duration-200 ${isMultiSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                            onClick={onToggleSelection}
                        >
                            <input
                                type="checkbox"
                                checked={isMultiSelected}
                                onChange={() => { }} // Handled by div click
                                className="w-5 h-5 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 cursor-pointer"
                            />
                        </div>
                    )}

                    {conversation.customerAvatar ? (
                        <img
                            src={conversation.customerAvatar}
                            alt={conversation.customerName}
                            loading="lazy"
                            className="w-12 h-12 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                            {conversation.customerName.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {/* Online indicator */}
                    {conversation.platform === 'facebook' && (
                        <div className="relative -mt-3 -mr-1 float-left">
                            <div className="w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Unread indicator - similar to unreplied messages */}
                    {conversation.unreadCount > 0 && (
                        <div className="flex items-center gap-1 mb-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">رسائل جديدة</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm truncate ${conversation.unreadCount > 0 ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-800 dark:text-gray-200'
                            }`}>
                            {conversation.customerName}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 mr-2">
                            {formatTime(conversation.lastMessageTime)}
                        </span>
                    </div>

                    {/* Last message */}
                    <p className={`text-sm text-gray-600 dark:text-gray-300 truncate ${conversation.unreadCount > 0 ? 'font-medium' : ''
                        }`}>
                        {conversation.lastMessageIsFromCustomer ? '' : 'أنت: '}
                        {conversation.lastMessage}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-2">
                        {conversation.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-blue-600 dark:bg-blue-500 text-white rounded-full">
                                {conversation.unreadCount}
                            </span>
                        )}

                        {conversation.priority && (
                            <span className="text-yellow-500 dark:text-yellow-400">⭐</span>
                        )}

                        {conversation.assignedTo && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                                👤 معين
                            </span>
                        )}

                        {conversation.tags.length > 0 && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                🏷️ {conversation.tags.length}
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
        prevProps.conversation.id === nextProps.conversation.id &&
        prevProps.conversation.lastMessage === nextProps.conversation.lastMessage &&
        prevProps.conversation.lastMessageTime.getTime() === nextProps.conversation.lastMessageTime.getTime() &&
        prevProps.conversation.unreadCount === nextProps.conversation.unreadCount &&
        prevProps.conversation.status === nextProps.conversation.status &&
        prevProps.conversation.assignedTo === nextProps.conversation.assignedTo &&
        prevProps.conversation.priority === nextProps.conversation.priority &&
        prevProps.conversation.tags.length === nextProps.conversation.tags.length &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isMultiSelected === nextProps.isMultiSelected
    );
});

ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;
