import React, { useMemo } from 'react';
import {
    Box, Typography, IconButton, Button, Paper, Chip
} from '@mui/material';
import {
    Download as DownloadIcon,
    LocationOn as LocationIcon,
    Check as CheckIcon,
    DoneAll as DoneAllIcon,
    AccessTime as PendingIcon,
    Error as ErrorIcon,
    Description as DocumentIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format, isToday, isYesterday } from 'date-fns';
import { config } from '../../../config';
import { Message } from '../../../hooks/useWhatsAppQueries';

interface MessageBubbleProps {
    message: Message;
    previousMessage?: Message;
    isGroup: boolean;
    onContextMenu: (event: React.MouseEvent, message: Message) => void;
    getParticipantName: (jid: string) => string;
}

const getMediaUrl = (path: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = config.apiUrl || window.location.origin;
    const cleanBaseUrl = baseUrl.replace(/\/api\/v1$/, '');
    return `${cleanBaseUrl}${path}`;
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'PENDING': return <PendingIcon fontSize="small" color="action" />;
        case 'SENT': return <CheckIcon fontSize="small" color="action" />;
        case 'DELIVERED': return <DoneAllIcon fontSize="small" color="action" />;
        case 'READ': return <DoneAllIcon fontSize="small" color="primary" />;
        case 'ERROR': return <ErrorIcon fontSize="small" color="error" />;
        default: return <PendingIcon fontSize="small" color="action" />;
    }
};

// getDateSeparatorText moved inside component to use t()

const shouldShowDateSeparator = (currentMessage: Message, previousMessage: Message | undefined) => {
    if (!previousMessage) return true;
    const currentDate = new Date(currentMessage.timestamp).toDateString();
    const previousDate = new Date(previousMessage.timestamp).toDateString();
    return currentDate !== previousDate;
};

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
    message,
    previousMessage,
    isGroup,
    onContextMenu,
    getParticipantName
}) => {
    const { t } = useTranslation();
    const senderName = message.fromMe && message.senderName ? message.senderName : null;

    const getDateSeparatorText = (timestamp: string) => {
        const date = new Date(timestamp);
        if (isToday(date)) return t('whatsapp.window.today');
        if (isYesterday(date)) return t('whatsapp.window.yesterday');
        return format(date, 'dd/MM/yyyy');
    };

    const renderContent = () => {
        if (message.mediaUrl === 'FAILED_DOWNLOAD') {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', p: 1, bgcolor: 'error.lighter', borderRadius: 1 }}>
                    <ErrorIcon fontSize="small" />
                    <Typography variant="body2">{t('whatsapp.dialogs.failedDownload')}</Typography>
                </Box>
            );
        }

        if (message.mediaUrl) {
            const fullMediaUrl = getMediaUrl(message.mediaUrl);
            switch (message.messageType) {
                case 'IMAGE':
                    return (
                        <Box>
                            <img
                                src={fullMediaUrl}
                                alt="Image"
                                style={{ maxWidth: '100%', borderRadius: 8, cursor: 'pointer', maxHeight: 300, objectFit: 'cover' }}
                                onClick={() => window.open(fullMediaUrl, '_blank')}
                            />
                            {message.content && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 1.25,
                                        wordBreak: 'break-word',
                                        lineHeight: 1.75,
                                        fontSize: '0.9375rem',
                                        color: message.fromMe ? 'inherit' : 'text.primary',
                                        letterSpacing: '0.015em',
                                        py: 0.5,
                                        display: 'block'
                                    }}
                                >
                                    {message.content}
                                </Typography>
                            )}
                        </Box>
                    );
                case 'VIDEO':
                    return (
                        <Box>
                            <video src={fullMediaUrl} controls style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 300 }} />
                            {message.content && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 1.25,
                                        wordBreak: 'break-word',
                                        lineHeight: 1.75,
                                        fontSize: '0.9375rem',
                                        color: message.fromMe ? 'inherit' : 'text.primary',
                                        letterSpacing: '0.015em',
                                        py: 0.5,
                                        display: 'block'
                                    }}
                                >
                                    {message.content}
                                </Typography>
                            )}
                        </Box>
                    );
                case 'AUDIO':
                    return <audio src={fullMediaUrl} controls style={{ width: '100%', minWidth: 200 }} />;
                case 'DOCUMENT':
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1, minWidth: 200 }}>
                            <DocumentIcon color="error" fontSize="large" />
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Typography variant="body2" noWrap>{message.mediaFileName || 'ملف'}</Typography>
                                <Typography variant="caption" color="text.secondary">مستند</Typography>
                            </Box>
                            <IconButton href={message.mediaUrl} target="_blank" size="small">
                                <DownloadIcon />
                            </IconButton>
                        </Box>
                    );
                default:
                    return (
                        <Box>
                            <Typography variant="body2" color="error">Unsupported media type: {message.messageType}</Typography>
                            <Button href={fullMediaUrl} target="_blank" size="small" startIcon={<DownloadIcon />}>{t('common.download') || 'Download'}</Button>
                        </Box>
                    );
            }
        }

        if (message.messageType === 'LOCATION') {
            try {
                const loc = message.content ? JSON.parse(message.content) : {};
                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
                return (
                    <Box>
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <LocationIcon color="primary" fontSize="large" />
                                <Box>
                                    <Typography variant="body2" fontWeight="bold">{t('whatsapp.window.location')}</Typography>
                                    <Typography variant="caption" display="block">{loc.address || loc.name || `${loc.latitude}, ${loc.longitude}`}</Typography>
                                </Box>
                            </Box>
                        </a>
                    </Box>
                );
            } catch (e) {
                return <Typography>{message.content}</Typography>;
            }
        }

        return (
            <Typography
                sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.85,
                    fontSize: '0.95rem',
                    color: message.fromMe ? 'inherit' : 'text.primary',
                    letterSpacing: '0.02em',
                    py: 0.75,
                    display: 'block',
                    fontWeight: 400
                }}
            >
                {message.content}
            </Typography>
        );
    };

    return (
        <Box
            sx={{
                width: '100%',
                px: 1,
                py: 0.25
            }}
        >
            <React.Fragment>
                {/* Date Separator */}
                {shouldShowDateSeparator(message, previousMessage) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5, mb: 1 }}>
                        <Chip
                            label={getDateSeparatorText(message.timestamp)}
                            size="small"
                            sx={{
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'rgba(0,0,0,0.08)',
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                                height: '24px',
                                px: 1.5
                            }}
                        />
                    </Box>
                )}
                {/* Message */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: message.fromMe ? 'flex-end' : 'flex-start',
                    width: '100%',
                    px: 1.5,
                    py: 0.25,
                    position: 'relative'
                }}>
                    <Paper
                        sx={{
                            p: 2.25,
                            px: 2.75,
                            py: 2,
                            maxWidth: '75%',
                            bgcolor: (theme) => message.fromMe
                                ? (theme.palette.mode === 'dark' ? 'primary.dark' : '#d9fdd3')
                                : 'background.paper',
                            cursor: 'context-menu',
                            borderRadius: message.fromMe ? '16px 0 16px 16px' : '0 16px 16px 16px',
                            boxShadow: (theme) => theme.palette.mode === 'dark' ? 2 : '0 1px 3px rgba(0,0,0,0.12)',
                            minWidth: '100px',
                            position: 'relative',
                            zIndex: 1,
                            display: 'inline-block'
                        }}
                        onContextMenu={(e) => onContextMenu(e, message)}
                    >
                        {isGroup && !message.fromMe && message.participant && (
                            <Typography variant="caption" sx={{ display: 'block', color: 'secondary.main', fontWeight: 'bold', mb: 0.5 }}>
                                {getParticipantName(message.participant)}
                            </Typography>
                        )}
                        {message.quotedContent && (
                            <Box sx={{ bgcolor: 'action.hover', borderInlineStart: '4px solid', borderColor: 'primary.main', p: 0.5, mb: 0.5, borderRadius: 0.5 }}>
                                <Typography variant="caption" sx={{ display: 'block', color: 'primary.main' }}>{t('whatsapp.window.replyingTo')}</Typography>
                                <Typography variant="caption" noWrap>{message.quotedContent}</Typography>
                            </Box>
                        )}

                        {senderName && (
                            <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                                {senderName}
                            </Typography>
                        )}

                        {renderContent()}

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.75, mt: 1.25, pt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 400 }}>
                                {format(new Date(message.timestamp), 'HH:mm')}
                            </Typography>
                            {message.fromMe && getStatusIcon(message.status)}
                        </Box>

                        {/* Reactions can be handled here or passed as children if needed, but for now we'll keep it simple */}

                    </Paper>
                </Box>
            </React.Fragment>
        </Box>
    );
});

export default MessageBubble;
