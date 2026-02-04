import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    Avatar,
    Badge,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    Paper,
    CircularProgress,
    Chip,
    ListItemSecondaryAction,
    Button
} from '@mui/material';
import {
    Search as SearchIcon,
    MoreVert as MoreVertIcon,
    FilterList as FilterListIcon,
    Add as AddIcon,
    GroupAdd as GroupAddIcon,
    Archive as ArchiveIcon,
    Unarchive as UnarchiveIcon,
    PushPin as PinIcon,
    VolumeOff as VolumeOffIcon,
    Block as BlockIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    PersonSearch as PersonSearchIcon,
    Campaign as BroadcastIcon,
    Security as SecurityIcon,
    Business as StoreIcon
} from '@mui/icons-material';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale'; // Import enUS
import { useTranslation } from 'react-i18next'; // Import hook
import { Contact, WhatsAppSession } from '../../../hooks/useWhatsAppQueries';

// Minimal interface for Status until exported
interface WhatsAppStatus {
    id: string;
    remoteJid: string;
    content?: string;
    mediaUrl?: string;
    timestamp: Date;
    type: string;
}

interface ChatSidebarProps {
    sessions: WhatsAppSession[];
    conversations: Contact[];
    statuses: WhatsAppStatus[];
    selectedSession: string;
    selectedContact: Contact | null;
    currentUserProfile: any;
    isLoadingConversations: boolean;
    isLoadingMoreConversations: boolean;
    hasMoreConversations: boolean;
    isLoadingStatuses: boolean;
    onSelectSession: (sessionId: string) => void;
    onSelectContact: (contact: Contact) => void;
    onOpenProfile: () => void;
    onOpenNewChat: () => void;
    onOpenNewGroup: () => void;
    onOpenPrivacySettings: () => void;
    onOpenBusinessProfile: () => void;
    onPinChat: (contact: Contact) => void;
    onArchiveChat: (contact: Contact) => void;
    onDeleteChat: (contact: Contact) => void;
    onBlockContact: (contact: Contact) => void;
    onMuteChat: (contact: Contact) => void;
    onMarkAsRead: (contact: Contact) => void;
    onLoadMore: () => void;
    onAddStatus: () => void;
    // Extra actions
    onOpenBroadcast: () => void;
    onOpenCheckNumber: () => void;
    onOpenLabels: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    sessions,
    conversations,
    statuses,
    selectedSession,
    selectedContact,
    currentUserProfile,
    isLoadingConversations,
    isLoadingMoreConversations,
    hasMoreConversations,
    isLoadingStatuses,
    onSelectSession,
    onSelectContact,
    onOpenProfile,
    onOpenNewChat,
    onOpenNewGroup,
    onOpenPrivacySettings,
    onOpenBusinessProfile,
    onPinChat,
    onArchiveChat,
    onDeleteChat,
    onBlockContact,
    onMuteChat,
    onMarkAsRead,
    onLoadMore,
    onAddStatus,
    onOpenBroadcast,
    onOpenCheckNumber,
    onOpenLabels
}) => {
    const { t, i18n } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups' | 'statuses'>('all');
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; contact: Contact } | null>(null);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleContextMenu = (event: React.MouseEvent, contact: Contact) => {
        event.preventDefault();
        setContextMenu(
            contextMenu === null
                ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6, contact }
                : null,
        );
    };

    const handleContextMenuClose = () => {
        setContextMenu(null);
    };

    const getContactName = (contact: Contact) => {
        return contact.name || contact.pushName || contact.phoneNumber || contact.jid.split('@')[0];
    };

    const formatTime = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return t('whatsapp.window.yesterday');
        return format(date, 'dd/MM/yyyy');
    };

    const filteredConversations = useMemo(() => {
        let filtered = conversations;

        // Filter by search term
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                (c.name && c.name.toLowerCase().includes(lowerTerm)) ||
                (c.pushName && c.pushName.toLowerCase().includes(lowerTerm)) ||
                c.phoneNumber.includes(lowerTerm)
            );
        }

        // Filter by Archive status
        filtered = filtered.filter(c => !!c.isArchived === showArchived);

        // Filter by Type
        if (filterType === 'unread') {
            filtered = filtered.filter(c => c.unreadCount > 0);
        } else if (filterType === 'groups') {
            filtered = filtered.filter(c => c.isGroup);
        }

        // Sort: Pinned first, then by lastMessageAt
        return filtered.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            const dateA = new Date(a.lastMessageAt || 0).getTime();
            const dateB = new Date(b.lastMessageAt || 0).getTime();
            return dateB - dateA;
        });
    }, [conversations, searchTerm, showArchived, filterType]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        const threshold = 150;
        const isNearBottom = scrollHeight - scrollTop <= clientHeight + threshold;
        if (isNearBottom && hasMoreConversations && !isLoadingMoreConversations) {
            onLoadMore();
        }
    };

    return (
        <Paper
            sx={{
                width: 380,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid',
                borderColor: 'divider',
                borderRadius: 0
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Avatar
                        src={currentUserProfile?.profilePicUrl || ''}
                        onClick={onOpenProfile}
                        sx={{ cursor: 'pointer', width: 40, height: 40 }}
                    />
                    {sessions.length > 0 && (
                        <TextField
                            select
                            size="small"
                            value={selectedSession}
                            onChange={(e) => onSelectSession(e.target.value)}
                            variant="standard"
                            sx={{ minWidth: 120 }}
                            SelectProps={{ disableUnderline: true }}
                        >
                            <MenuItem value="all">{t('whatsapp.sidebar.all')}</MenuItem>
                            {sessions.map(session => (
                                <MenuItem key={session.id} value={session.id}>
                                    {session.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                </Box>
                <Box>
                    <IconButton onClick={onOpenLabels} title="التصنيفات">
                        <LabelIcon />
                    </IconButton>
                    <IconButton onClick={handleMenuClick}>
                        <MoreVertIcon />
                    </IconButton>
                    <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={handleMenuClose}
                    >
                        <MenuItem onClick={() => { handleMenuClose(); onOpenNewGroup(); }}>
                            <GroupAddIcon sx={{ mr: 1 }} fontSize="small" /> {t('whatsapp.sidebar.newGroup')}
                        </MenuItem>
                        <MenuItem onClick={() => { handleMenuClose(); onOpenProfile(); }}>
                            <PersonIcon sx={{ mr: 1 }} fontSize="small" /> {t('whatsapp.sidebar.profile')}
                        </MenuItem>
                        <MenuItem onClick={() => { handleMenuClose(); setShowArchived(!showArchived); }}>
                            {showArchived ? <UnarchiveIcon sx={{ mr: 1 }} fontSize="small" /> : <ArchiveIcon sx={{ mr: 1 }} fontSize="small" />}
                            {showArchived ? t('whatsapp.sidebar.all') : t('whatsapp.sidebar.archive')}
                        </MenuItem>
                        <MenuItem onClick={() => { handleMenuClose(); onOpenBusinessProfile(); }}>
                            <StoreIcon sx={{ mr: 1 }} fontSize="small" /> {t('whatsapp.sidebar.settings')}
                        </MenuItem>
                        <MenuItem onClick={() => { handleMenuClose(); onOpenPrivacySettings(); }}>
                            <SecurityIcon sx={{ mr: 1 }} fontSize="small" /> {t('whatsapp.sidebar.settings')}
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>

            {/* Search & Toolbar */}
            <Box sx={{ p: 2, pb: 1 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder={t('whatsapp.sidebar.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setFilterType(filterType === 'unread' ? 'all' : 'unread')}>
                                    <FilterListIcon color={filterType !== 'all' ? 'primary' : 'action'} fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    sx={{ mb: 1.5 }}
                />

                {/* Quick Actions & Filters */}
                <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                    <Chip label={t('whatsapp.sidebar.all')} size="small" onClick={() => setFilterType('all')} color={filterType === 'all' ? 'primary' : 'default'} clickable />
                    <Chip label={t('whatsapp.sidebar.unread')} size="small" onClick={() => setFilterType('unread')} color={filterType === 'unread' ? 'primary' : 'default'} clickable />
                    <Chip label={t('whatsapp.sidebar.groups')} size="small" onClick={() => setFilterType('groups')} color={filterType === 'groups' ? 'primary' : 'default'} clickable />
                    <Chip label={t('whatsapp.sidebar.statuses')} size="small" onClick={() => setFilterType('statuses')} color={filterType === 'statuses' ? 'primary' : 'default'} clickable />

                    <Box sx={{ flex: 1 }} />

                    <IconButton size="small" onClick={onOpenNewChat} title="محادثة جديدة">
                        <AddIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={onOpenBroadcast} title="إرسال بث">
                        <BroadcastIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            {/* List Content */}
            <Box
                sx={{ flex: 1, overflowY: 'auto' }}
                onScroll={handleScroll}
            >
                {filterType === 'statuses' ? (
                    // Statuses View
                    <Box sx={{ p: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={onAddStatus}
                            fullWidth
                            sx={{ mb: 2 }}
                        >
                            {t('whatsapp.sidebar.addStatus')}
                        </Button>

                        {isLoadingStatuses ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : statuses.length === 0 ? (
                            <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
                                <Typography variant="body2">{t('whatsapp.sidebar.noStatuses')}</Typography>
                                <Typography variant="caption">{t('whatsapp.sidebar.recentUpdates')}</Typography>
                            </Box>
                        ) : (
                            <List>
                                {statuses.map((status) => (
                                    <ListItem
                                        key={status.id}
                                        sx={{ mb: 1, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'primary.main' }}>📸</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={status.remoteJid.split('@')[0]}
                                            primaryTypographyProps={{ component: 'div' }}
                                            secondaryTypographyProps={{ component: 'div' }}
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2">{status.content || `[${status.type}]`}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatDistanceToNow(new Date(status.timestamp), { addSuffix: true, locale: i18n.language === 'ar' ? ar : enUS })}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        {status.mediaUrl && (
                                            <ListItemSecondaryAction>
                                                <Avatar src={status.mediaUrl} variant="rounded" sx={{ width: 56, height: 56 }} />
                                            </ListItemSecondaryAction>
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                ) : (
                    // Conversations View
                    <>
                        {isLoadingConversations && filteredConversations.length === 0 ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress size={30} />
                            </Box>
                        ) : filteredConversations.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography variant="body2">{t('conversations.noConversations')}</Typography>
                            </Box>
                        ) : (
                            <List sx={{ p: 0 }}>
                                {filteredConversations.map(contact => (
                                    <ListItem
                                        key={contact.id}
                                        button
                                        selected={selectedContact?.id === contact.id}
                                        onClick={() => onSelectContact(contact)}
                                        onContextMenu={(e) => handleContextMenu(e, contact)}
                                        sx={{
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: contact.unreadCount > 0 ? 'action.hover' : 'inherit'
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Badge
                                                color="success"
                                                variant="dot"
                                                invisible={true}
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            >
                                                <Avatar src={contact.profilePicUrl || ''} />
                                            </Badge>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primaryTypographyProps={{ component: 'div' }}
                                            secondaryTypographyProps={{ component: 'div' }}
                                            primary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="subtitle2" noWrap sx={{ maxWidth: '70%', fontWeight: contact.unreadCount > 0 ? 'bold' : 'normal' }}>
                                                        {getContactName(contact)}
                                                    </Typography>
                                                    <Typography variant="caption" color={contact.unreadCount > 0 ? 'primary' : 'text.secondary'}>
                                                        {formatTime(contact.lastMessageAt)}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '80%' }}>
                                                        {contact.isGroup && <Typography component="span" variant="caption" sx={{ mr: 0.5, fontWeight: 'bold' }}>~{contact.pushName}:</Typography>}
                                                        <span dir="auto">{contact.lastMessage?.content || '....'}</span>
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        {contact.isPinned && <PinIcon fontSize="small" sx={{ fontSize: 16, color: 'text.secondary' }} />}
                                                        {contact.isMuted && <VolumeOffIcon fontSize="small" sx={{ fontSize: 16, color: 'text.secondary' }} />}
                                                        {contact.unreadCount > 0 && (
                                                            <Badge badgeContent={contact.unreadCount} color="success" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18 } }} />
                                                        )}
                                                    </Box>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                        {isLoadingMoreConversations && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress size={20} />
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* Context Menu */}
            <Menu
                open={contextMenu !== null}
                onClose={handleContextMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={() => {
                    if (contextMenu?.contact) onPinChat(contextMenu.contact);
                    handleContextMenuClose();
                }}>
                    <PinIcon sx={{ mr: 1 }} fontSize="small" />
                    {contextMenu?.contact?.isPinned ? t('whatsapp.sidebar.unpinChat') : t('whatsapp.sidebar.pinChat')}
                </MenuItem>
                <MenuItem onClick={() => {
                    if (contextMenu?.contact) onMarkAsRead(contextMenu.contact);
                    handleContextMenuClose();
                }}>
                    <PersonIcon sx={{ mr: 1 }} fontSize="small" />
                    {contextMenu?.contact?.unreadCount > 0 ? t('whatsapp.sidebar.read') : t('whatsapp.sidebar.unreadAction')}
                </MenuItem>
                <MenuItem onClick={() => {
                    if (contextMenu?.contact) onMuteChat(contextMenu.contact);
                    handleContextMenuClose();
                }}>
                    <VolumeOffIcon sx={{ mr: 1 }} fontSize="small" />
                    {contextMenu?.contact?.isMuted ? t('whatsapp.sidebar.unmute') : t('whatsapp.sidebar.mute')}
                </MenuItem>
                <MenuItem onClick={() => {
                    if (contextMenu?.contact) onArchiveChat(contextMenu.contact);
                    handleContextMenuClose();
                }}>
                    <ArchiveIcon sx={{ mr: 1 }} fontSize="small" />
                    {contextMenu?.contact?.isArchived ? t('whatsapp.sidebar.unarchive') : t('whatsapp.sidebar.archive')}
                </MenuItem>
                <MenuItem onClick={() => {
                    if (contextMenu?.contact) onDeleteChat(contextMenu.contact);
                    handleContextMenuClose();
                }} sx={{ color: 'error.main' }}>
                    <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                    {t('whatsapp.sidebar.deleteChat')}
                </MenuItem>
                <MenuItem onClick={() => {
                    if (contextMenu?.contact) onBlockContact(contextMenu.contact);
                    handleContextMenuClose();
                }} sx={{ color: 'error.main' }}>
                    <BlockIcon sx={{ mr: 1 }} fontSize="small" />
                    {contextMenu?.contact?.isBlocked ? t('whatsapp.sidebar.unblock') : t('whatsapp.sidebar.block')}
                </MenuItem>
            </Menu>
        </Paper>
    );
};

// Internal helper for LabelIcon since it's used in header
import { Label as LabelIcon } from '@mui/icons-material';

export default ChatSidebar;
