import React from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Avatar,
    TextField,
    CircularProgress
} from '@mui/material';
import {
    Info as InfoIcon,
    Close as CloseIcon,
    EmojiEmotions as EmojiEmotionsIcon,
    AttachFile as AttachIcon,
    Poll as PollIcon,
    SmartButton as ButtonIcon,
    ViewList as ListIcon,
    Storefront as CatalogIcon,
    LocationOn as LocationIcon,
    Send as SendIcon,
    Mic as MicIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import EmojiPicker from 'emoji-picker-react';
import { VirtualItem } from '@tanstack/react-virtual';
import { Contact, Message } from '../../../hooks/useWhatsAppQueries';
import MessageBubble from './MessageBubble';
import AudioRecorder from './AudioRecorder';

interface ChatWindowProps {
    selectedContact: Contact | null;
    messages: Message[];
    loadingMessages: boolean;
    virtualItems: VirtualItem[];
    totalHeight: number;
    messagesContainerRef: React.RefObject<HTMLDivElement>;
    typingUsers: Set<string>;

    // Input State
    newMessage: string;
    setNewMessage: (text: string) => void;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (show: boolean) => void;
    replyingTo: Message | null;
    setReplyingTo: (msg: Message | null) => void;
    isRecording: boolean;
    setIsRecording: (isRecording: boolean) => void;
    isSendingMessage: boolean; // Button loading state

    // Handlers
    onSendMessage: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onVoiceNoteSend: (blob: Blob) => void;
    onOpenContactInfo: () => void;
    onMessageContextMenu: (event: React.MouseEvent, message: Message) => void;

    // Helpers
    getContactName: (contact: Contact) => string;
    getParticipantName: (participantJid: string) => string;

    // Toolbar Actions
    onOpenPoll: () => void;
    onOpenButtons: () => void;
    onOpenList: () => void;
    onOpenCatalog: () => void;
    onOpenLocation: () => void;
    onOpenOrder: () => void;

    // Refs
    fileInputRef: React.RefObject<HTMLInputElement>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
    selectedContact,
    messages,
    loadingMessages,
    virtualItems,
    totalHeight,
    messagesContainerRef,
    typingUsers,
    newMessage,
    setNewMessage,
    showEmojiPicker,
    setShowEmojiPicker,
    replyingTo,
    setReplyingTo,
    isRecording,
    setIsRecording,
    isSendingMessage,
    onSendMessage,
    onFileUpload,
    onVoiceNoteSend,
    onOpenContactInfo,
    onMessageContextMenu,
    getContactName,
    getParticipantName,
    onOpenPoll,
    onOpenButtons,
    onOpenList,
    onOpenCatalog,
    onOpenLocation,
    onOpenOrder,
    fileInputRef
}) => {
    const { t } = useTranslation();

    // Memoize total size to prevent setState-in-render warning
    const totalSize = totalHeight;

    if (!selectedContact) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
                <Typography>{t('whatsapp.window.selectChat')}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper sx={{ p: 2, borderRadius: 0, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={selectedContact.profilePicUrl || ''} />
                    <Box>
                        <Typography variant="subtitle1">{getContactName(selectedContact)}</Typography>
                        {selectedContact.isGroup && (
                            <Typography variant="caption" color="text.secondary" display="block">
                                {/* Could show participants count if available */}
                                {t('whatsapp.window.group')}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Box>
                    <IconButton onClick={onOpenContactInfo}><InfoIcon /></IconButton>
                </Box>
            </Paper>

            {/* Messages List Area */}
            <Box
                ref={messagesContainerRef}
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 2,
                    bgcolor: '#e5ddd5', // Standard WhatsApp BG Color (light mode equivalent)
                    position: 'relative'
                    // Background image could be added here
                }}
            >
                {loadingMessages && messages.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            height: `${totalSize}px`,
                            width: '100%',
                            position: 'relative'
                        }}
                    >
                        {virtualItems.map((virtualItem) => {
                            const message = messages[virtualItem.index];
                            const previousMessage = messages[virtualItem.index - 1]; // This might need index check if virtualized window is small?
                            // Actually virtualItem.index is the index in the full list

                            return (
                                <Box
                                    key={virtualItem.key}
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualItem.start}px)`
                                    }}
                                >
                                    <MessageBubble
                                        message={message}
                                        previousMessage={previousMessage || undefined}
                                        isGroup={selectedContact?.isGroup || false}
                                        onContextMenu={onMessageContextMenu}
                                        getParticipantName={getParticipantName}
                                    />
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {/* Typing Indicator */}
                {typingUsers.size > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1, position: 'absolute', bottom: 0, left: 0, right: 0, p: 2, pointerEvents: 'none' }}>
                        <Paper sx={{ p: 1, pointerEvents: 'auto' }}>
                            <Typography variant="caption" color="text.secondary">{t('whatsapp.window.typing')}</Typography>
                        </Paper>
                    </Box>
                )}
            </Box>

            {/* Input Area */}
            <Paper sx={{ p: 2, borderRadius: 0 }}>
                {replyingTo && (
                    <Box sx={{ p: 1, mb: 1, bgcolor: 'action.hover', borderLeft: '4px solid', borderColor: 'primary.main', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" color="primary" fontWeight="bold">
                                {replyingTo.fromMe ? t('whatsapp.window.you') : (replyingTo.participant ? getParticipantName(replyingTo.participant) : getContactName(selectedContact))}
                            </Typography>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                {replyingTo.content || (replyingTo.mediaType ? `[${replyingTo.mediaType}]` : t('whatsapp.window.message'))}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setReplyingTo(null)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                )}

                {isRecording ? (
                    <AudioRecorder
                        onCancel={() => setIsRecording(false)}
                        onSend={(blob) => {
                            setIsRecording(false);
                            onVoiceNoteSend(blob);
                        }}
                    />
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
                        {showEmojiPicker && (
                            <Box sx={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 1000 }}>
                                <EmojiPicker onEmojiClick={(data) => setNewMessage(newMessage + data.emoji)} />
                            </Box>
                        )}

                        <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                            <EmojiEmotionsIcon color={showEmojiPicker ? 'primary' : 'inherit'} />
                        </IconButton>

                        <IconButton onClick={() => fileInputRef.current?.click()} title={t('whatsapp.tooltips.attach')}><AttachIcon /></IconButton>

                        {/* Extended Actions */}
                        <IconButton onClick={onOpenPoll} title={t('whatsapp.tooltips.poll')}>
                            <PollIcon />
                        </IconButton>
                        <IconButton onClick={onOpenButtons} title={t('whatsapp.tooltips.buttons')}>
                            <ButtonIcon />
                        </IconButton>
                        <IconButton onClick={onOpenList} title={t('whatsapp.tooltips.list')}>
                            <ListIcon />
                        </IconButton>
                        <IconButton onClick={onOpenCatalog} title={t('whatsapp.tooltips.catalog')}>
                            <CatalogIcon />
                        </IconButton>
                        <IconButton onClick={onOpenLocation} title={t('whatsapp.tooltips.location')}>
                            <LocationIcon />
                        </IconButton>
                        <IconButton onClick={onOpenOrder} title={t('whatsapp.tooltips.order')}>
                            <CatalogIcon color="secondary" />
                        </IconButton>

                        <input type="file" ref={fileInputRef} hidden onChange={onFileUpload} />

                        <TextField
                            fullWidth
                            size="small"
                            placeholder={t('whatsapp.window.inputPlaceholder')}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    onSendMessage();
                                }
                            }}
                        />

                        {newMessage.trim() ? (
                            <IconButton color="primary" onClick={onSendMessage} disabled={isSendingMessage}>
                                {isSendingMessage ? <CircularProgress size={24} /> : <SendIcon />}
                            </IconButton>
                        ) : (
                            <IconButton color="primary" onClick={() => setIsRecording(true)}><MicIcon /></IconButton>
                        )}
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default ChatWindow;
