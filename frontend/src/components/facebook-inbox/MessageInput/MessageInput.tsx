import React, { useState, useRef } from 'react';
import { PaperAirplaneIcon, PaperClipIcon, FaceSmileIcon, XMarkIcon } from '@heroicons/react/24/outline';
import EmojiPicker from 'emoji-picker-react';
import QuickReplyDropdown, { QuickReply } from '../QuickReplyDropdown/QuickReplyDropdown';
import { replaceVariables, getContextVariables } from '../../../utils/quickReplyUtils';

interface MessageInputProps {
    onSendMessage: (content: string) => void;
    onSendFile: (file: File) => void;
    sending: boolean;
    uploadingFile: boolean;
    conversation?: any;
    user?: any;
    replyTo?: any;
    onCancelReply?: () => void;
    initialText?: string;
    onTextCleared?: () => void;
    onOpenTextGallery?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
    onSendMessage,
    onSendFile,
    sending,
    uploadingFile,
    conversation,
    user,
    replyTo,
    onCancelReply,
    initialText,
    onTextCleared,
    onOpenTextGallery
}) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageInputRef = useRef<HTMLTextAreaElement>(null);

    // Update message when initialText changes (e.g. from AI suggestion)
    React.useEffect(() => {
        if (initialText) {
            setMessage(initialText);
            // Clear the parent state immediately so we don't get stuck with this text
            // or keep it so user can edit? Usually one-off set is better.
            // But if we clear it immediately, the parent might pass empty string back if renders happen.
            // Let's rely on parent to clear it if needed, or better:
            // The parent passed it because user clicked a suggestion.
            // We set it here. We should ideally callback to say "we consumed it".
            if (onTextCleared) {
                // Using a small timeout to avoid render loops or state clashes during render
                setTimeout(() => onTextCleared(), 100);
            }
        }
    }, [initialText, onTextCleared]);

    // Focus input on mount and after sending message
    React.useEffect(() => {
        // Focus input when component mounts
        if (messageInputRef.current && !sending && !uploadingFile) {
            messageInputRef.current.focus();
        }
    }, []);

    // Keep input focused after sending message
    React.useEffect(() => {
        if (!sending && messageInputRef.current) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                messageInputRef.current?.focus();
            }, 50);
        }
    }, [sending]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !sending) {
            onSendMessage(message);
            setMessage('');
            setShowQuickReplies(false);
            // Focus input after sending to allow immediate typing
            setTimeout(() => {
                messageInputRef.current?.focus();
            }, 100);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        // Don't send on Enter if quick replies dropdown is open
        if (e.key === 'Enter' && !e.shiftKey && !showQuickReplies) {
            e.preventDefault();
            handleSend(e);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setMessage(value);

        // Show quick replies if starts with /
        if (value.startsWith('/')) {
            setShowQuickReplies(true);
        } else {
            setShowQuickReplies(false);
        }

        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    };

    const handleSelectQuickReply = (reply: QuickReply) => {
        // Replace variables in content
        const contextVars = getContextVariables(conversation, user);
        const processedContent = replaceVariables(reply.content, contextVars);

        setMessage(processedContent);
        setShowQuickReplies(false);
    };

    const handleEmojiClick = (emojiData: any) => {
        setMessage(prev => prev + emojiData.emoji);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && !uploadingFile) {
            onSendFile(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
            {/* Quick Replies Dropdown */}
            {showQuickReplies && (
                <QuickReplyDropdown
                    inputValue={message}
                    onSelectReply={handleSelectQuickReply}
                    onClose={() => setShowQuickReplies(false)}
                />
            )}

            {/* Reply Banner - الآن داخل منطقة الإدخال */}
            {replyTo && (
                <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 flex justify-between items-center text-xs sm:text-sm">
                    <div className="flex flex-col max-w-[85%] sm:max-w-[90%] flex-1 min-w-0">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs truncate">
                            الرد على {replyTo.senderName}:
                        </span>
                        <span className="truncate text-gray-600 dark:text-gray-400 text-xs">
                            {replyTo.type === 'text' ? replyTo.content : (replyTo.type === 'image' ? '🖼️ صورة' : '📎 ملف')}
                        </span>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="p-1 sm:p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full flex-shrink-0"
                    >
                        <XMarkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2 flex-wrap p-2.5 sm:p-3 md:p-4">
                {/* File Upload */}
                <div className="relative flex-shrink-0">
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        title="إرفاق ملف"
                    >
                        {uploadingFile ? (
                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <PaperClipIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                        )}
                    </button>
                </div>

                {/* Text Gallery Button */}
                {onOpenTextGallery && (
                    <div className="relative flex-shrink-0">
                        <button
                            type="button"
                            onClick={onOpenTextGallery}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="حافظة النصوص المحفوظة"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Emoji Picker */}
                <div className="relative flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="إيموجي"
                    >
                        <FaceSmileIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                    </button>

                    {showEmojiPicker && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowEmojiPicker(false)}
                            />
                            <div className="fixed bottom-20 left-4 z-50 shadow-2xl rounded-lg overflow-visible">
                                <EmojiPicker 
                                    onEmojiClick={handleEmojiClick}
                                    width={350}
                                    height={450}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Text Input */}
                <div className="flex-1 relative min-w-0">
                    <textarea
                        ref={messageInputRef}
                        value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder="اكتب رسالة... (أو / للردود السريعة) - Shift+Enter لسطر جديد"
                        disabled={sending || uploadingFile}
                        autoFocus
                        rows={1}
                        className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none overflow-hidden"
                        style={{ minHeight: '38px', maxHeight: '150px' }}
                    />
                    {message.startsWith('/') && !showQuickReplies && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
                            ⚡
                        </div>
                    )}
                </div>

                {/* Send Button */}
                <button
                    type="submit"
                    disabled={!message.trim() || sending || uploadingFile}
                    className="px-3 py-1.5 sm:px-4 md:px-6 sm:py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                >
                    {sending ? (
                        <>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="hidden sm:inline">جاري الإرسال...</span>
                        </>
                    ) : (
                        <>
                            <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">إرسال</span>
                        </>
                    )}
                </button>
            </form>

            {/* Helper Text */}
            {message.startsWith('/') && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span>💡</span>
                    <span>اضغط Tab أو Enter لاختيار رد سريع</span>
                </div>
            )}
        </div>
    );
};

export default MessageInput;
