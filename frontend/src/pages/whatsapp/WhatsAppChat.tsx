/**
 * 📱 WhatsApp Chat Page
 * صفحة دردشة WhatsApp
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Alert, Drawer, Grid, CircularProgress, Menu, MenuItem, IconButton,
  List, ListItem, Typography, ListItemAvatar, ListItemText, Avatar, TextField,
  FormControl, InputLabel, Select, Divider, Chip, Badge, Paper, InputAdornment,
  Tabs, Tab, ListItemSecondaryAction
} from '@mui/material';
import {
  AddReaction as AddReactionIcon, Label as LabelIcon,
  SmartToy as AIIcon, Refresh as RefreshIcon, Check as CheckIcon,
  Delete as DeleteIcon, Archive as ArchiveIcon, PushPin as PinIcon,
  VolumeOff as MuteIcon, AccessTime as PendingIcon,
  Reply as ReplyIcon, ContentCopy as CopyIcon, Forward as ForwardIcon,
  StarBorder as StarBorderIcon, Poll as PollIcon, SmartButton as ButtonIcon,
  ViewList as ListIcon, Storefront as CatalogIcon, LocationOn as LocationIcon,
  ShoppingCart as CartIcon, Close as CloseIcon,
  DoneAll as DoneAllIcon, Error as ErrorIcon, Star as StarIcon,
  Block as BlockIcon, Report as ReportIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../services/apiClient';
import useSocket from '../../hooks/useSocket';
import CreateGroupDialog from '../../components/whatsapp/CreateGroupDialog';
import GroupInfoDrawer from '../../components/whatsapp/GroupInfoDrawer';
import ProfileDialog from '../../components/whatsapp/ProfileDialog';
import CheckNumberDialog from '../../components/whatsapp/CheckNumberDialog';
import LabelsDialog from '../../components/whatsapp/LabelsDialog';
import BroadcastDialog from '../../components/whatsapp/BroadcastDialog';
import PrivacySettingsDialog from '../../components/whatsapp/PrivacySettingsDialog';
import BusinessProfileDialog from '../../components/whatsapp/BusinessProfileDialog';
import AudioRecorder from './components/AudioRecorder';
import { useAuth } from '../../hooks/useAuthSimple';
import MessageBubble from './components/MessageBubble';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { config } from '../../config';
import {
  useWhatsAppSessions,
  useWhatsAppConversations,
  useWhatsAppMessages,
  useWhatsAppQuickReplies,
  type Session,
  type Contact,
  type Message,
  type QuickReply
} from '../../hooks/useWhatsAppQueries';

import { useStatuses, usePostStatus } from '../../hooks/useWhatsAppStatuses'; // 📸 Status Hooks
import { AddCircle as AddIcon } from '@mui/icons-material';
import {
  useSendMessage,
  useSendMedia,
  useMarkAsRead,
  useDeleteConversation,
  useArchiveConversation
} from '../../hooks/useWhatsAppMutations';
import {
  useVirtualConversations,
  useVirtualMessages,
  useInfiniteScroll
} from '../../hooks/useVirtualScroll';

// Types are now imported from useWhatsAppQueries

import { MuiThemeWrapper } from '../../components/theme/MuiThemeWrapper';
import { useTheme as useMuiTheme } from '@mui/material/styles';

const WhatsAppChatContent: React.FC = () => {
  const muiTheme = useMuiTheme();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const conversationsListRef = useRef<HTMLDivElement>(null); // Moved to ChatSidebar
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Session state
  const [selectedSession, setSelectedSession] = useState<string>('');

  // Contact state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // UI State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  // const [searchQuery, setSearchQuery] = useState(''); // Moved to ChatSidebar
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [contactMenuAnchor, setContactMenuAnchor] = useState<null | HTMLElement>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [chatMenuAnchor, setChatMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedChatForMenu, setSelectedChatForMenu] = useState<Contact | null>(null);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedContactsForForward, setSelectedContactsForForward] = useState<string[]>([]);
  const [messageInfoDialogOpen, setMessageInfoDialogOpen] = useState(false);
  const [selectedMessageForInfo, setSelectedMessageForInfo] = useState<Message | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [checkNumberDialogOpen, setCheckNumberDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [businessProfileDialogOpen, setBusinessProfileDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [selectedContactForLabel, setSelectedContactForLabel] = useState<Contact | null>(null);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollData, setPollData] = useState({ question: '', options: ['', ''], selectableCount: 1 });

  // Interactive Messages
  const [buttonsDialogOpen, setButtonsDialogOpen] = useState(false);
  const [buttonsData, setButtonsData] = useState({ text: '', footer: '', buttons: [{ id: '1', text: '' }] });
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [listData, setListData] = useState({
    text: '',
    buttonText: 'اختر',
    title: '',
    sections: [{ title: 'القسم 1', rows: [{ id: '1', title: '', description: '' }] }]
  });

  // Broadcast
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);

  // Catalog
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Starred Messages
  const [starredMessagesOpen, setStarredMessagesOpen] = useState(false);
  const [starredMessages, setStarredMessages] = useState<Message[]>([]);

  // Location
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationData, setLocationData] = useState({ latitude: '', longitude: '', address: '' });

  // Order/Cart
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [orderData, setOrderData] = useState({
    items: [] as { productId: string; quantity: number; price: number }[],
    currency: 'EGP',
    note: ''
  });
  const loadContactsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMarkAsReadRef = useRef<{ sessionId: string; remoteJid: string } | null>(null);
  const lastMarkedAsReadRef = useRef<{ sessionId: string; remoteJid: string } | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<{
    notificationSound: boolean;
    browserNotifications: boolean;
  }>({
    notificationSound: true,
    browserNotifications: true
  });
  // const [chatFilter, setChatFilter] = useState('all'); // Moved to ChatSidebar
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string; status: string; profilePicUrl: string } | null>(null);

  // 📸 Status State
  const [statusContent, setStatusContent] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Dialog States
  const [confirmData, setConfirmData] = useState<{ open: boolean; title: string; content: string; onConfirm: () => void }>({
    open: false,
    title: '',
    content: '',
    onConfirm: () => { }
  });

  // TanStack Query Hooks
  const { data: sessions = [], isLoading: loadingSessions } = useWhatsAppSessions();
  const { data: statuses = [], isLoading: loadingStatuses } = useStatuses(
    selectedSession && selectedSession !== 'all' ? selectedSession : ''
  );
  const { mutate: postStatus, isPending: postingStatus } = usePostStatus();

  const {

    data: conversationsData,
    isLoading: loadingConversations,
    isFetchingNextPage: isLoadingMoreConversations,
    fetchNextPage: fetchNextConversationsPage,
    hasNextPage: hasMoreConversations
  } = useWhatsAppConversations(selectedSession || 'all', 30);

  const conversations = useMemo(() => {
    if (!conversationsData) return [];
    return conversationsData.pages.flatMap(page => page.conversations || []);
  }, [conversationsData]);

  const targetSessionId = useMemo(() => {
    if (!selectedContact || !selectedSession) return null;
    return selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
  }, [selectedContact, selectedSession]);

  const {
    data: messagesData,
    isLoading: loadingMessages,
    fetchNextPage: fetchNextMessagesPage,
    hasNextPage: hasMoreMessages
  } = useWhatsAppMessages(selectedContact?.jid || null, targetSessionId);

  const messages = useMemo(() => {
    if (!messagesData) return [];
    // Flatten and sort messages by timestamp (oldest first for proper display)
    const allMessages = messagesData.pages.flatMap(page => page.messages || []);
    return allMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }, [messagesData]);

  // Filter out reactions from the main message list
  const visibleMessages = useMemo(() => {
    return messages.filter(m => m.messageType !== 'REACTION');
  }, [messages]);

  // Aggregate reactions by original message ID
  const reactionsMap = useMemo(() => {
    const map = new Map<string, Array<{ emoji: string, sender: string, fromMe: boolean }>>();
    messages.forEach(m => {
      if (m.messageType === 'REACTION' && m.quotedMessageId && m.content) {
        const targetId = m.quotedMessageId;
        if (!map.has(targetId)) {
          map.set(targetId, []);
        }
        // Use participant for group members, or derive sender name
        // For now, we store basic info.
        map.get(targetId)?.push({
          emoji: m.content,
          sender: m.fromMe ? 'You' : (m.participant || m.remoteJid),
          fromMe: m.fromMe
        });
      }
    });
    return map;
  }, [messages]);

  const { data: quickReplies = [] } = useWhatsAppQuickReplies();

  // Mutations
  const sendMessageMutation = useSendMessage();
  const sendMediaMutation = useSendMedia();
  const markAsReadMutation = useMarkAsRead();
  const deleteConversationMutation = useDeleteConversation();
  const archiveConversationMutation = useArchiveConversation();

  // Helper functions
  const getContactName = useCallback((contact: Contact) => {
    if (contact.customer && (contact.customer.firstName || contact.customer.lastName)) {
      return `${contact.customer.firstName} ${contact.customer.lastName}`.trim();
    }
    return contact.name || contact.pushName || contact.phoneNumber;
  }, []);

  // Filtered contacts logic moved to ChatSidebar

  const handlePostStatus = useCallback(() => {
    if (!statusContent.trim() || !selectedSession || selectedSession === 'all') return;

    postStatus(
      { sessionId: selectedSession, content: statusContent },
      {
        onSuccess: () => {
          setStatusContent('');
          setStatusDialogOpen(false);
          enqueueSnackbar('تم نشر الحالة بنجاح', { variant: 'success' });
        },
        onError: () => {
          enqueueSnackbar('فشل نشر الحالة', { variant: 'error' });
        }
      }
    );
  }, [statusContent, selectedSession, postStatus, enqueueSnackbar]);

  // Virtual Scrolling for conversations moved/removed in favor of ChatSidebar
  // const conversationsVirtualizer = ...

  const {
    virtualizer: messagesVirtualizer,
    isAtBottom,
    scrollToBottom: scrollToBottomFn,
    scrollToTop: scrollToTopFn
  } = useVirtualMessages(
    visibleMessages,
    messagesContainerRef,
    {
      estimateSize: 60,
      overscan: 10,
      scrollToBottom: true,
      reverse: false
    }
  );

  // Infinite scroll for loading older messages
  useInfiniteScroll(
    messagesContainerRef,
    () => {
      if (hasMoreMessages && !loadingMessages) {
        fetchNextMessagesPage();
      }
    },
    { threshold: 200, enabled: !!selectedContact }
  );

  const fetchUserProfile = async () => {
    if (!selectedSession || selectedSession === 'all') return;
    try {
      const response = await api.get('/whatsapp/profile', { params: { sessionId: selectedSession } });
      if (response.data.success) {
        setCurrentUserProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    if (selectedSession && selectedSession !== 'all') {
      fetchUserProfile();
    }
  }, [selectedSession]);



  // Auto-select first session when sessions load
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].id);
    }
  }, [sessions, selectedSession]);

  // Load initial data (notification settings)
  useEffect(() => {
    loadNotificationSettings();
    requestNotificationPermission();
  }, []);

  // Debounced version to avoid excessive API calls - now handled inline in socket handlers

  // Socket Listeners - Using refs to avoid stale closures
  const selectedContactRef = useRef(selectedContact);
  const selectedSessionRef = useRef(selectedSession);
  const notificationSettingsRef = useRef(notificationSettings);

  // Update refs when values change
  useEffect(() => {
    selectedContactRef.current = selectedContact;
    selectedSessionRef.current = selectedSession;
    notificationSettingsRef.current = notificationSettings;
  }, [selectedContact, selectedSession, notificationSettings]);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    // Helper to normalize JID for comparison
    const normalizeJid = (jid: string) => {
      if (!jid) return '';
      const parts = jid.split('@')[0];
      const bareJid = parts?.split(':')[0] || '';
      return bareJid.replace(/\D/g, '');
    };

    const handleNewMessage = (data: any) => {
      // console.log('🔔 [FRONTEND] Received whatsapp:message:new:', data);
      const { sessionId, message } = data;

      // Normalize JIDs for comparison
      const msgJid = normalizeJid(message.remoteJid);
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      // Only process incoming messages (not sent by us)
      if (message.fromMe) {
        return;
      }

      const isCurrentChat = currentContact && msgJid === currentJid && (currentSession === 'all' || sessionId === currentSession);

      if (isCurrentChat) {
        // Update messages cache using queryClient
        const targetSid = currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        queryClient.setQueryData(['whatsapp', 'messages', currentContact.jid, targetSid], (old: any) => {
          if (!old) return old;
          const lastPage = old.pages[old.pages.length - 1];
          // Check for duplicates
          if (lastPage.messages.some((m: Message) => m.messageId === message.messageId)) {
            return old;
          }
          const newPages = [...old.pages];
          newPages[newPages.length - 1] = {
            ...lastPage,
            messages: [...lastPage.messages, message]
          };
          return { ...old, pages: newPages };
        });

        // Mark as read (debounced) - فقط للرسائل الواردة (ليست من المستخدم)
        if (currentContact && !message.fromMe) {
          const targetSessionId = currentContact.sessionId || (currentSession === 'all' ? null : currentSession);
          if (targetSessionId) {
            debouncedMarkAsRead(targetSessionId, currentContact.jid);
          }
        }
        // Play sound if enabled and chat is open (quieter notification)
        if (notificationSettingsRef.current.notificationSound) {
          playNotificationSound();
        }
      } else {
        // Show notification if chat is not open or different contact
        if (currentSession === 'all' || sessionId === currentSession) {
          // Get contact name from cache
          const sessionKey = currentSession === 'all' ? 'all' : currentSession;
          const conversationsQuery = queryClient.getQueryData(['whatsapp', 'conversations', sessionKey, 30]) as any;
          const currentContacts = conversationsQuery?.pages?.[0]?.conversations || [];
          const contactName = currentContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid)?.name ||
            currentContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid)?.pushName ||
            message.remoteJid.split('@')[0];
          const messageText = message.content
            ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content)
            : (message.messageType === 'IMAGE' ? '📷 صورة' :
              message.messageType === 'VIDEO' ? '🎥 فيديو' :
                message.messageType === 'AUDIO' ? '🎵 صوت' :
                  message.messageType === 'DOCUMENT' ? '📎 ملف' : 'رسالة جديدة');

          // Show in-app notification (snackbar) - always show this
          enqueueSnackbar(
            messageText,
            {
              variant: 'info',
              anchorOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
              autoHideDuration: 5000,
              action: (key) => (
                <Button
                  size="small"
                  onClick={() => {
                    // Find and select the contact from cache
                    const sessionKey = currentSession === 'all' ? 'all' : currentSession;
                    const conversationsQuery = queryClient.getQueryData(['whatsapp', 'conversations', sessionKey, 30]) as any;
                    const currentContacts = conversationsQuery?.pages?.[0]?.conversations || [];
                    const contact = currentContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid);
                    if (contact) {
                      setSelectedContact(contact);
                    }
                  }}
                >
                  فتح المحادثة
                </Button>
              ),
            }
          );

          // Play sound if enabled
          if (notificationSettingsRef.current.notificationSound) {
            playNotificationSound();
          }

          // Show browser notification if enabled
          if (notificationSettingsRef.current.browserNotifications) {
            showBrowserNotification(
              `رسالة جديدة من ${contactName}`,
              messageText
            );
          }
        }
      }
      // Update conversations cache immediately
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      queryClient.setQueryData(['whatsapp', 'conversations', sessionKey, 30], (old: any) => {
        if (!old || !old.pages || old.pages.length === 0) return old;
        // Update first page (most recent conversations)
        const firstPage = old.pages[0];
        const contactIndex = firstPage.conversations.findIndex((c: Contact) => normalizeJid(c.jid) === msgJid);
        if (contactIndex > -1) {
          const contact = firstPage.conversations[contactIndex];
          const updatedContact = {
            ...contact,
            lastMessage: {
              content: message.content,
              messageType: message.messageType,
              fromMe: message.fromMe,
              timestamp: message.timestamp
            },
            lastMessageAt: message.timestamp,
            unreadCount: isCurrentChat ? 0 : (contact.unreadCount || 0) + 1
          };
          const newContacts = [...firstPage.conversations];
          newContacts.splice(contactIndex, 1);
          const pinned = newContacts.filter((c: Contact) => c.isPinned);
          const unpinned = newContacts.filter((c: Contact) => !c.isPinned);
          if (updatedContact.isPinned) pinned.unshift(updatedContact);
          else unpinned.unshift(updatedContact);
          return {
            ...old,
            pages: [{
              ...firstPage,
              conversations: [...pinned, ...unpinned]
            }, ...old.pages.slice(1)]
          };
        }
        return old;
      });

      // Invalidate conversations query to refetch in background (debounced)
      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
      }
      loadContactsTimeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'conversations', sessionKey],
          refetchType: 'none' // Don't refetch immediately, just mark as stale
        });
      }, 500);
    };

    const handleNotification = (data: any) => {
      const { contactName, message, messageType, soundEnabled, notificationsEnabled, sessionId } = data;
      const currentSession = selectedSessionRef.current;
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      const conversationsQuery = queryClient.getQueryData(['whatsapp', 'conversations', sessionKey, 30]) as any;
      const currentContacts = conversationsQuery?.pages?.[0]?.conversations || [];
      const currentNotificationSettings = notificationSettingsRef.current;

      // console.log('🔔 [NOTIFICATION] Received notification:', { contactName, messageType, soundEnabled, notificationsEnabled });

      // Prepare message text
      const messageText = message ||
        (messageType === 'IMAGE' ? '📷 صورة' :
          messageType === 'VIDEO' ? '🎥 فيديو' :
            messageType === 'AUDIO' ? '🎵 صوت' :
              messageType === 'DOCUMENT' ? '📎 ملف' : 'رسالة جديدة');

      // Show in-app notification (snackbar) - always show this
      enqueueSnackbar(
        messageText,
        {
          variant: 'info',
          anchorOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
          autoHideDuration: 5000,
          action: (key) => (
            <Button
              size="small"
              onClick={() => {
                // Navigate to the chat if not already there
                if (sessionId && sessionId !== currentSession) {
                  setSelectedSession(sessionId);
                }
                // Find and select the contact from cache
                const contact = currentContacts.find((c: Contact) =>
                  c.name === contactName || c.pushName === contactName
                );
                if (contact) {
                  setSelectedContact(contact);
                }
              }}
            >
              فتح المحادثة
            </Button>
          ),
        }
      );

      // Show browser notification if enabled (use data from server or local settings)
      const shouldShowNotification = notificationsEnabled !== undefined ? notificationsEnabled : currentNotificationSettings.browserNotifications;
      if (shouldShowNotification) {
        showBrowserNotification(
          `رسالة جديدة من ${contactName}`,
          messageText
        );
      }

      // Play sound if enabled (use data from server or local settings)
      const shouldPlaySound = soundEnabled !== undefined ? soundEnabled : currentNotificationSettings.notificationSound;
      if (shouldPlaySound) {
        playNotificationSound();
      }
    };

    const handleMessageStatus = (data: any) => {
      const { messageId, status, remoteJid, sessionId } = data;
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;

      const msgJid = normalizeJid(remoteJid);
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      // Only update if it matches current chat
      if (currentContact && msgJid === currentJid && (currentSession === 'all' || sessionId === currentSession)) {
        const targetSid = currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        // Update message status in cache
        queryClient.setQueryData(['whatsapp', 'messages', currentContact.jid, targetSid], (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: Message) =>
              m.messageId === messageId ? { ...m, status } : m
            )
          }));
          return { ...old, pages: newPages };
        });
      }
    };

    const handleMessageSent = (data: any) => {
      // console.log('🔔 [FRONTEND] Received whatsapp:message:sent:', data);
      const { sessionId, message } = data;
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;

      const msgJid = normalizeJid(message.remoteJid);
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      if (currentContact && msgJid === currentJid && (currentSession === 'all' || sessionId === currentSession)) {
        // Update messages cache
        // Use currentContact.jid to ensure key matches the query key (handle device suffixes etc)
        // Also use targetSessionId logic for consistency
        const targetSid = currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        queryClient.setQueryData(['whatsapp', 'messages', currentContact.jid, targetSid], (old: any) => {
          if (!old) return old;
          const lastPage = old.pages[old.pages.length - 1];
          // Check for duplicates
          if (lastPage.messages.some((m: Message) => m.messageId === message.messageId)) {
            return old;
          }
          const newPages = [...old.pages];
          newPages[newPages.length - 1] = {
            ...lastPage,
            messages: [...lastPage.messages, message]
          };
          return { ...old, pages: newPages };
        });
      }

      // Update conversations cache
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      queryClient.setQueryData(['whatsapp', 'conversations', sessionKey, 30], (old: any) => {
        if (!old || !old.pages || old.pages.length === 0) return old;
        // Update first page (most recent conversations)
        const firstPage = old.pages[0];
        const contactIndex = firstPage.conversations.findIndex((c: Contact) => normalizeJid(c.jid) === msgJid);
        if (contactIndex > -1) {
          const contact = firstPage.conversations[contactIndex];
          const updatedContact = {
            ...contact,
            lastMessage: {
              content: message.content,
              messageType: message.messageType,
              fromMe: message.fromMe,
              timestamp: message.timestamp
            },
            lastMessageAt: message.timestamp
          };
          const newContacts = [...firstPage.conversations];
          newContacts.splice(contactIndex, 1);
          const pinned = newContacts.filter((c: Contact) => c.isPinned);
          const unpinned = newContacts.filter((c: Contact) => !c.isPinned);
          if (updatedContact.isPinned) pinned.unshift(updatedContact);
          else unpinned.unshift(updatedContact);
          return {
            ...old,
            pages: [{
              ...firstPage,
              conversations: [...pinned, ...unpinned]
            }, ...old.pages.slice(1)]
          };
        }
        return old;
      });

      // Invalidate conversations query in background (debounced)
      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
      }
      loadContactsTimeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'conversations', sessionKey],
          refetchType: 'none'
        });
      }, 500);
    };

    const handleUserTyping = (data: any) => {
      const currentContact = selectedContactRef.current;
      if (currentContact && data.jid === currentContact.jid) {
        setTypingUsers(prev => new Set(prev).add(data.jid));
      }
    };

    const handleUserStoppedTyping = (data: any) => {
      if (data.jid) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.jid);
          return newSet;
        });
      }
    };

    socket.on('whatsapp:message:new', handleNewMessage);
    socket.on('whatsapp:message:status', handleMessageStatus);
    socket.on('whatsapp:message:sent', handleMessageSent);
    socket.on('whatsapp:notification:new', handleNotification);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('whatsapp:message:new', handleNewMessage);
      socket.off('whatsapp:message:status', handleMessageStatus);
      socket.off('whatsapp:message:sent', handleMessageSent);
      socket.off('whatsapp:notification:new', handleNotification);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      // Cleanup timeouts
      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
        loadContactsTimeoutRef.current = null;
      }
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
    };
  }, [socket, enqueueSnackbar, queryClient]);

  // Debounced mark as read function
  const debouncedMarkAsRead = useCallback((sessionId: string, remoteJid: string) => {
    // Skip if already marked as read recently for the same contact
    const lastMarked = lastMarkedAsReadRef.current;
    const pending = pendingMarkAsReadRef.current;

    // Check if we already have a pending or recent call for the same contact
    if (lastMarked && lastMarked.sessionId === sessionId && lastMarked.remoteJid === remoteJid) {
      return; // Already marked, skip
    }

    if (pending && pending.sessionId === sessionId && pending.remoteJid === remoteJid) {
      return; // Already pending for the same contact, skip
    }

    // Clear any pending timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    // Store the pending call
    pendingMarkAsReadRef.current = { sessionId, remoteJid };

    // Set a new timeout with longer debounce
    markAsReadTimeoutRef.current = setTimeout(() => {
      const pendingCall = pendingMarkAsReadRef.current;
      if (pendingCall) {
        // Double-check we haven't already marked this as read
        const lastMarkedCheck = lastMarkedAsReadRef.current;
        if (lastMarkedCheck &&
          lastMarkedCheck.sessionId === pendingCall.sessionId &&
          lastMarkedCheck.remoteJid === pendingCall.remoteJid) {
          // Already marked, skip
          pendingMarkAsReadRef.current = null;
          markAsReadTimeoutRef.current = null;
          return;
        }

        // Update last marked ref before making the call
        lastMarkedAsReadRef.current = {
          sessionId: pendingCall.sessionId,
          remoteJid: pendingCall.remoteJid
        };

        markAsReadMutation.mutate(
          {
            sessionId: pendingCall.sessionId,
            remoteJid: pendingCall.remoteJid
          },
          {
            onError: (error: any) => {
              // Reset last marked on error so we can retry
              if (!error?.message?.includes('timeout')) {
                lastMarkedAsReadRef.current = null;
              }
              // Only log error, don't show toast for timeout errors
              if (error?.message?.includes('timeout')) {
                console.warn('⚠️ Mark as read timeout (silent):', pendingCall.remoteJid);
              } else {
                console.error('❌ Mark as read error:', error);
              }
            }
          }
        );
        pendingMarkAsReadRef.current = null;
      }
      markAsReadTimeoutRef.current = null;
    }, 3000); // زيادة debounce إلى 3 ثوان لتقليل الطلبات
  }, [markAsReadMutation]);

  // Mark as read when contact is selected
  useEffect(() => {
    if (selectedContact && targetSessionId) {
      // Reset last marked ref when contact changes
      lastMarkedAsReadRef.current = null;
      debouncedMarkAsRead(targetSessionId, selectedContact.jid);
    }
    // Cleanup on unmount
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
    };
  }, [selectedContact?.jid, targetSessionId, debouncedMarkAsRead]);





  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !selectedSession || sendMessageMutation.isPending) return;

    // Check authentication
    if (!user?.id) {
      enqueueSnackbar('يجب تسجيل الدخول لإرسال الرسائل', { variant: 'error' });
      return;
    }

    const targetSessionId = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!targetSessionId) {
      enqueueSnackbar('خطأ: لا يمكن تحديد الجلسة', { variant: 'error' });
      return;
    }

    sendMessageMutation.mutate({
      sessionId: targetSessionId,
      to: selectedContact.jid,
      text: newMessage,
      quotedMessageId: replyingTo?.messageId,
      userId: user?.id
    }, {
      onSuccess: () => {
        setNewMessage('');
        setReplyingTo(null);
      },
      onError: (error: any) => {
        enqueueSnackbar(error.response?.data?.error || error.message || 'حدث خطأ أثناء الإرسال', { variant: 'error' });
      }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedContact || !selectedSession) return;

    const targetSessionId = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!targetSessionId) {
      enqueueSnackbar('خطأ: لا يمكن تحديد الجلسة', { variant: 'error' });
      return;
    }

    const file = files[0];
    if (!file) return;

    sendMediaMutation.mutate({
      sessionId: targetSessionId,
      to: selectedContact.jid,
      file,
      userId: user?.id
    }, {
      onError: (error: any) => {
        enqueueSnackbar(error.response?.data?.error || 'حدث خطأ أثناء رفع الملف', { variant: 'error' });
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleClearChat = (contact: Contact) => {
    if (!selectedSession) return;
    setConfirmData({
      open: true,
      title: t('whatsapp.dialogs.clearChatTitle'),
      content: t('whatsapp.dialogs.clearChatContent'),
      onConfirm: async () => {
        try {
          await api.post(`/whatsapp/conversations/${contact.jid}/clear`, { sessionId: selectedSession });
          enqueueSnackbar(t('whatsapp.dialogs.success'), { variant: 'success' });
          if (selectedContact?.jid === contact.jid && targetSessionId) {
            queryClient.setQueryData(['whatsapp', 'messages', contact.jid, targetSessionId], (old: any) => {
              if (!old) return old;
              return {
                ...old,
                pages: [{ messages: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }]
              };
            });
          }
        } catch (error) {
          enqueueSnackbar('فشل مسح المحادثة', { variant: 'error' });
        }
        setConfirmData(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleDeleteChat = (contact: Contact) => {
    if (!selectedSession) return;
    setConfirmData({
      open: true,
      title: t('whatsapp.dialogs.deleteChatTitle'),
      content: t('whatsapp.dialogs.deleteChatContent'),
      onConfirm: () => {
        deleteConversationMutation.mutate({
          conversationId: contact.id,
          jid: contact.jid,
          sessionId: selectedSession
        }, {
          onSuccess: () => {
            if (selectedContact?.jid === contact.jid) {
              setSelectedContact(null);
            }
            setConfirmData(prev => ({ ...prev, open: false }));
          }
        });
      }
    });
  };

  const handleArchiveChat = async (contact: Contact) => {
    if (!selectedSession) return;

    archiveConversationMutation.mutate({
      jid: contact.jid,
      sessionId: selectedSession,
      isArchived: !contact.isArchived
    });
  };

  const handlePinChat = async (contact: Contact) => {
    if (!selectedSession) return;
    try {
      await api.post(`/whatsapp/conversations/${contact.jid}/pin`, {
        sessionId: selectedSession,
        pin: !contact.isPinned
      });
      enqueueSnackbar(contact.isPinned ? 'تم إلغاء التثبيت' : 'تم التثبيت', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
    } catch (error) {
      enqueueSnackbar('فشل تحديث حالة التثبيت', { variant: 'error' });
    }
  };

  const handleMuteChat = async (contact: Contact) => {
    if (!selectedSession) return;
    try {
      await api.post(`/whatsapp/conversations/${contact.jid}/mute`, {
        sessionId: selectedSession,
        mute: !contact.isMuted
      });
      enqueueSnackbar(contact.isMuted ? 'تم إلغاء الكتم' : 'تم الكتم', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
    } catch (error) {
      enqueueSnackbar('فشل تحديث حالة الكتم', { variant: 'error' });
    }
  };

  const handleMarkUnread = async (contact: Contact) => {
    if (!selectedSession) return;
    try {
      await api.post(`/whatsapp/conversations/${contact.jid}/mark-unread`, { sessionId: selectedSession });
      enqueueSnackbar('تم تمييز المحادثة كغير مقروءة', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
    } catch (error) {
      enqueueSnackbar('فشل تحديث حالة القراءة', { variant: 'error' });
    }
  };

  const handleForwardMessage = async () => {
    if (!selectedSession || !selectedMessageForMenu || selectedContactsForForward.length === 0) return;

    try {
      await Promise.all(selectedContactsForForward.map(jid =>
        api.post('/whatsapp/messages/forward', {
          sessionId: selectedSession,
          to: jid,
          messageId: selectedMessageForMenu.messageId
        })
      ));
      enqueueSnackbar('تم إعادة توجيه الرسالة', { variant: 'success' });
      setForwardDialogOpen(false);
      setSelectedContactsForForward([]);
      setSelectedMessageForMenu(null);
    } catch (error) {
      enqueueSnackbar('فشل إعادة توجيه الرسالة', { variant: 'error' });
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedSession || !selectedMessageForMenu || !selectedContact) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;

    try {
      await api.delete(`/whatsapp/messages/${selectedMessageForMenu.messageId}`, {
        data: {
          sessionId: selectedSession,
          remoteJid: selectedMessageForMenu.remoteJid,
          fromMe: selectedMessageForMenu.fromMe
        }
      });
      enqueueSnackbar('تم حذف الرسالة', { variant: 'success' });

      // Update messages cache
      queryClient.setQueryData(['whatsapp', 'messages', selectedContact.jid, targetSessionId], (old: any) => {
        if (!old) return old;
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.filter((m: Message) => m.messageId !== selectedMessageForMenu.messageId)
        }));
        return { ...old, pages: newPages };
      });

      setMessageMenuAnchor(null);
      setSelectedMessageForMenu(null);
    } catch (error) {
      enqueueSnackbar('فشل حذف الرسالة', { variant: 'error' });
    }
  };

  const handleReply = () => {
    if (selectedMessageForMenu) {
      setReplyingTo(selectedMessageForMenu);
      setMessageMenuAnchor(null);
      setSelectedMessageForMenu(null);
    }
  };

  const handleCopy = () => {
    if (selectedMessageForMenu?.content) {
      navigator.clipboard.writeText(selectedMessageForMenu.content);
      enqueueSnackbar('تم نسخ النص', { variant: 'success' });
      setMessageMenuAnchor(null);
      setSelectedMessageForMenu(null);
    }
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


  const handleMessageContextMenu = (event: React.MouseEvent, message: Message) => {
    event.preventDefault();
    setMessageMenuAnchor(event.currentTarget as HTMLElement);
    setSelectedMessageForMenu(message);
  };


  const loadNotificationSettings = async () => {
    try {
      const res = await api.get('/whatsapp/settings');
      if (res.data.settings) {
        setNotificationSettings({
          notificationSound: res.data.settings.notificationSound !== false,
          browserNotifications: res.data.settings.browserNotifications !== false
        });
      }
    } catch (e) {
      console.error('Error loading notification settings:', e);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.error('Error requesting notification permission:', e);
      }
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed', e));
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  };

  const showBrowserNotification = (title: string, body: string, icon?: string) => {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          tag: 'whatsapp-message',
          requireInteraction: false,
          silent: false
        });

        // Close notification after 5 seconds
        const notificationTimeout = setTimeout(() => {
          notification.close();
        }, 5000);

        // Store timeout for cleanup if needed
        notification.onclose = () => {
          clearTimeout(notificationTimeout);
        };
      } catch (e) {
        console.error('Error showing browser notification:', e);
      }
    } else if (Notification.permission !== 'denied') {
      // Request permission if not already denied
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          try {
            const notification = new Notification(title, {
              body,
              icon: icon || '/favicon.ico',
              tag: 'whatsapp-message'
            });
            const notificationTimeout = setTimeout(() => {
              notification.close();
            }, 5000);

            // Store timeout for cleanup if needed
            notification.onclose = () => {
              clearTimeout(notificationTimeout);
            };
          } catch (e) {
            console.error('Error showing browser notification:', e);
          }
        }
      });
    }
  };

  // ==================== Reactions ====================
  const handleSendReaction = async (messageId: string, emoji: string) => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/send-reaction', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        messageId,
        emoji
      });
      setShowReactionPicker(null);
      enqueueSnackbar('تم إرسال التفاعل', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('فشل إرسال التفاعل', { variant: 'error' });
    }
  };

  const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // ==================== Star Messages ====================
  const handleStarMessage = async (message: Message) => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/star', {
        sessionId: targetSessionId,
        key: {
          remoteJid: message.remoteJid,
          id: message.messageId,
          fromMe: message.fromMe
        }
      });
      enqueueSnackbar('تم تمييز الرسالة بنجمة', { variant: 'success' });
      setMessageMenuAnchor(null);
    } catch (error) {
      enqueueSnackbar('فشل تمييز الرسالة', { variant: 'error' });
    }
  };

  const handleUnstarMessage = async (message: Message) => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/unstar', {
        sessionId: targetSessionId,
        key: {
          remoteJid: message.remoteJid,
          id: message.messageId,
          fromMe: message.fromMe
        }
      });
      enqueueSnackbar('تم إلغاء تمييز الرسالة', { variant: 'success' });
      setMessageMenuAnchor(null);
    } catch (error) {
      enqueueSnackbar('فشل إلغاء تمييز الرسالة', { variant: 'error' });
    }
  };

  // ==================== Labels ====================
  const loadLabels = async () => {
    if (!selectedSession || selectedSession === 'all') return;
    try {
      const res = await api.get('/whatsapp/labels', { params: { sessionId: selectedSession } });
      setLabels(res.data.labels || []);
    } catch (error) {
      console.error('Error loading labels:', error);
    }
  };

  const handleLabelChat = async (labelId: string) => {
    if (!selectedSession || !selectedContactForLabel) return;
    try {
      await api.post('/whatsapp/labels/chat', {
        sessionId: selectedSession,
        jid: selectedContactForLabel.jid,
        labelId
      });
      enqueueSnackbar('تم إضافة العلامة للمحادثة', { variant: 'success' });
      setLabelDialogOpen(false);
      setSelectedContactForLabel(null);
    } catch (error) {
      enqueueSnackbar('فشل إضافة العلامة', { variant: 'error' });
    }
  };

  // ==================== Polls ====================
  const handleSendPoll = async () => {
    if (!selectedSession || !selectedContact || !pollData.question.trim()) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    const validOptions = pollData.options.filter(o => o.trim());
    if (validOptions.length < 2) {
      enqueueSnackbar('يجب إضافة خيارين على الأقل', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/whatsapp/messages/send-poll', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        pollData: {
          name: pollData.question,
          values: validOptions,
          selectableCount: pollData.selectableCount
        }
      });
      enqueueSnackbar('تم إرسال الاستطلاع', { variant: 'success' });
      setPollDialogOpen(false);
      setPollData({ question: '', options: ['', ''], selectableCount: 1 });
    } catch (error) {
      enqueueSnackbar('فشل إرسال الاستطلاع', { variant: 'error' });
    }
  };

  // ==================== Interactive Buttons ====================
  const handleSendButtons = async () => {
    if (!selectedSession || !selectedContact || !buttonsData.text.trim()) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    const validButtons = buttonsData.buttons.filter(b => b.text.trim());
    if (validButtons.length === 0 || validButtons.length > 3) {
      enqueueSnackbar('يجب إضافة 1-3 أزرار', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/whatsapp/messages/send-buttons', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        text: buttonsData.text,
        buttons: validButtons.map((b, i) => ({ buttonId: `btn_${i}`, buttonText: { displayText: b.text }, type: 1 })),
        footer: buttonsData.footer || undefined
      });
      enqueueSnackbar('تم إرسال الرسالة بالأزرار', { variant: 'success' });
      setButtonsDialogOpen(false);
      setButtonsData({ text: '', footer: '', buttons: [{ id: '1', text: '' }] });
    } catch (error) {
      enqueueSnackbar('فشل إرسال الرسالة', { variant: 'error' });
    }
  };

  // ==================== Interactive List ====================
  const handleSendList = async () => {
    if (!selectedSession || !selectedContact || !listData.text.trim()) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/send-list', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        text: listData.text,
        buttonText: listData.buttonText,
        title: listData.title,
        sections: listData.sections.map(s => ({
          title: s.title,
          rows: s.rows.filter(r => r.title.trim()).map(r => ({
            rowId: r.id,
            title: r.title,
            description: r.description
          }))
        }))
      });
      enqueueSnackbar('تم إرسال القائمة', { variant: 'success' });
      setListDialogOpen(false);
      setListData({ text: '', buttonText: 'اختر', title: '', sections: [{ title: 'القسم 1', rows: [{ id: '1', title: '', description: '' }] }] });
    } catch (error) {
      enqueueSnackbar('فشل إرسال القائمة', { variant: 'error' });
    }
  };

  // ==================== Broadcast ====================


  // ==================== Catalog ====================
  const loadProducts = async () => {
    if (!selectedSession || selectedSession === 'all') return;
    try {
      const res = await api.get('/whatsapp/catalog/products', { params: { sessionId: selectedSession } });
      setProducts(res.data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSendProduct = async (product: any) => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/send-product', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        product: {
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency || 'EGP',
          imageUrl: product.imageUrl
        }
      });
      enqueueSnackbar('تم إرسال المنتج', { variant: 'success' });
      setCatalogDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('فشل إرسال المنتج', { variant: 'error' });
    }
  };

  // ==================== Starred Messages ====================
  const loadStarredMessages = async () => {
    if (!selectedSession || !selectedContact) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      const res = await api.get('/whatsapp/messages/starred', {
        params: { sessionId: targetSessionId, jid: selectedContact.jid }
      });
      setStarredMessages(res.data.messages || []);
      setStarredMessagesOpen(true);
    } catch (error) {
      enqueueSnackbar('فشل تحميل الرسائل المميزة', { variant: 'error' });
    }
  };

  // ==================== Location Sharing ====================
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationData({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
            address: ''
          });
          enqueueSnackbar('تم تحديد موقعك الحالي', { variant: 'success' });
        },
        (error) => {
          enqueueSnackbar('فشل تحديد الموقع: ' + error.message, { variant: 'error' });
        }
      );
    } else {
      enqueueSnackbar('المتصفح لا يدعم تحديد الموقع', { variant: 'error' });
    }
  };

  const handleSendLocation = async () => {
    if (!selectedSession || !selectedContact || !locationData.latitude || !locationData.longitude) return;
    const targetSessionId = selectedContact.sessionId || selectedSession;
    try {
      await api.post('/whatsapp/messages/send-location', {
        sessionId: targetSessionId,
        to: selectedContact.jid,
        location: {
          degreesLatitude: parseFloat(locationData.latitude),
          degreesLongitude: parseFloat(locationData.longitude),
          name: locationData.address || 'موقعي',
          address: locationData.address
        }
      });
      enqueueSnackbar('تم إرسال الموقع', { variant: 'success' });
      setLocationDialogOpen(false);
      setLocationData({ latitude: '', longitude: '', address: '' });
    } catch (error) {
      enqueueSnackbar('فشل إرسال الموقع', { variant: 'error' });
    }
  };

  const handleBlockContact = async (contact: Contact) => {
    if (!window.confirm(`هل أنت متأكد من حظر ${getContactName(contact)}؟`)) return;
    try {
      await api.post('/whatsapp/contacts/block', { sessionId: selectedSession, jid: contact.jid });
      enqueueSnackbar('تم حظر جهة الاتصال', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
      setShowContactInfo(false);
    } catch (error) {
      enqueueSnackbar('فشل حظر جهة الاتصال', { variant: 'error' });
    }
  };

  const handleUnblockContact = async (contact: Contact) => {
    try {
      await api.post('/whatsapp/contacts/unblock', { sessionId: selectedSession, jid: contact.jid });
      enqueueSnackbar('تم إلغاء حظر جهة الاتصال', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
      setShowContactInfo(false);
    } catch (error) {
      enqueueSnackbar('فشل إلغاء حظر جهة الاتصال', { variant: 'error' });
    }
  };

  // ==================== Group Advanced Features ====================
  const handleToggleEphemeral = async (duration: number) => {
    if (!selectedSession || !selectedContact?.isGroup) return;
    try {
      await api.post('/whatsapp/groups/ephemeral', {
        sessionId: selectedSession,
        groupId: selectedContact.jid,
        duration // 0 = off, 86400 = 24h, 604800 = 7 days, 7776000 = 90 days
      });
      enqueueSnackbar('تم تحديث إعدادات الرسائل المؤقتة', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('فشل تحديث الإعدادات', { variant: 'error' });
    }
  };

  const handleUpdateGroupPicture = async (file: File) => {
    if (!selectedSession || !selectedContact?.isGroup) return;
    try {
      const formData = new FormData();
      formData.append('sessionId', selectedSession);
      formData.append('groupId', selectedContact.jid);
      formData.append('image', file);
      await api.post('/whatsapp/groups/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      enqueueSnackbar('تم تحديث صورة المجموعة', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('فشل تحديث الصورة', { variant: 'error' });
    }
  };

  const handleAcceptGroupInvite = async (inviteCode: string) => {
    if (!selectedSession) return;
    try {
      await api.post('/whatsapp/groups/invite/accept', {
        sessionId: selectedSession,
        inviteCode
      });
      enqueueSnackbar('تم قبول الدعوة والانضمام للمجموعة', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
    } catch (error) {
      enqueueSnackbar('فشل قبول الدعوة', { variant: 'error' });
    }
  };

  const handleGetUrlInfo = async (url: string) => {
    if (!selectedSession) return null;
    try {
      const res = await api.get('/whatsapp/url-info', {
        params: { sessionId: selectedSession, url }
      });
      return res.data;
    } catch (error) {
      console.error('Error getting URL info:', error);
      return null;
    }
  };

  // ==================== Order/Cart ====================
  const loadCart = async () => {
    if (!selectedSession || !selectedContact) return;
    try {
      const res = await api.get('/whatsapp/cart', {
        params: { sessionId: selectedSession, jid: selectedContact.jid }
      });
      setCartItems(res.data.cart || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const handleSendOrder = async () => {
    if (!selectedSession || !selectedContact || orderData.items.length === 0) return;
    try {
      await api.post('/whatsapp/messages/send-order', {
        sessionId: selectedSession,
        to: selectedContact.jid,
        order: {
          items: orderData.items,
          currency: orderData.currency,
          note: orderData.note
        }
      });
      enqueueSnackbar('تم إرسال الطلب', { variant: 'success' });
      setOrderDialogOpen(false);
      setOrderData({ items: [], currency: 'EGP', note: '' });
    } catch (error) {
      enqueueSnackbar('فشل إرسال الطلب', { variant: 'error' });
    }
  };

  const addToOrder = (product: any) => {
    const existingItem = orderData.items.find(i => i.productId === product.id);
    if (existingItem) {
      setOrderData({
        ...orderData,
        items: orderData.items.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      });
    } else {
      setOrderData({
        ...orderData,
        items: [...orderData.items, { productId: product.id, quantity: 1, price: product.price || 0 }]
      });
    }
  };

  const removeFromOrder = (productId: string) => {
    setOrderData({
      ...orderData,
      items: orderData.items.filter(i => i.productId !== productId)
    });
  };

  const sendQuickReply = async (qr: QuickReply) => {
    if (!selectedSession || !selectedContact) return;
    try {
      await api.post('/whatsapp/messages/send', {
        sessionId: selectedSession,
        to: selectedContact.jid,
        text: qr.content
      });
      setShowQuickReplies(false);
    } catch (error) {
      console.error(error);
    }
  };


  const getParticipantName = (participantJid: string) => {
    // Normalize JID for lookup
    const normalizedJid = participantJid.includes('@') ? participantJid : `${participantJid}@s.whatsapp.net`;
    const contact = conversations.find(c => c.jid === normalizedJid || c.jid === normalizedJid.split('@')[0] + '@s.whatsapp.net');
    if (contact) {
      return getContactName(contact);
    }
    return participantJid.split('@')[0];
  };

  // Show loading if auth is still loading or initial data is loading
  if (authLoading || loadingSessions) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={2}>
        <Typography variant="h6">يجب تسجيل الدخول للوصول إلى هذه الصفحة</Typography>
        <Button variant="contained" href="/auth/login">تسجيل الدخول</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        conversations={conversations}
        statuses={statuses}
        selectedSession={selectedSession}
        selectedContact={selectedContact}
        currentUserProfile={currentUserProfile}
        isLoadingConversations={loadingConversations}
        isLoadingMoreConversations={isLoadingMoreConversations}
        hasMoreConversations={hasMoreConversations}
        isLoadingStatuses={loadingStatuses}
        onSelectSession={setSelectedSession}
        onSelectContact={setSelectedContact}
        onOpenProfile={() => setProfileDialogOpen(true)}
        onOpenNewChat={() => setCreateGroupDialogOpen(true) /* Use createGroupDialog for now, or new chat dialog if exists */}
        onOpenNewGroup={() => setCreateGroupDialogOpen(true)}
        onOpenPrivacySettings={() => setPrivacyDialogOpen(true)}
        onOpenBusinessProfile={() => setBusinessProfileDialogOpen(true)}
        onPinChat={handlePinChat}
        onArchiveChat={handleArchiveChat}
        onDeleteChat={handleDeleteChat}
        onBlockContact={handleBlockContact}
        onMuteChat={handleMuteChat}
        onMarkAsRead={handleMarkUnread}
        onLoadMore={fetchNextConversationsPage}
        onAddStatus={() => setStatusDialogOpen(true)}
        onOpenBroadcast={() => setBroadcastDialogOpen(true)}
        onOpenCheckNumber={() => setCheckNumberDialogOpen(true)}
        onOpenLabels={() => setLabelDialogOpen(true)}
      />

      <ChatWindow
        selectedContact={selectedContact}
        messages={messages}
        loadingMessages={loadingMessages}
        virtualItems={messagesVirtualizer.getVirtualItems()}
        totalHeight={messagesVirtualizer.getTotalSize()}
        messagesContainerRef={messagesContainerRef}
        typingUsers={typingUsers}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        isRecording={isRecording}
        setIsRecording={setIsRecording}
        isSendingMessage={sendMessageMutation.isPending}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        onVoiceNoteSend={async (blob) => {
          const formData = new FormData();
          if (selectedSession && selectedContact) {
            formData.append('sessionId', selectedSession);
            formData.append('to', selectedContact.jid);
            formData.append('file', blob, 'voice_note.webm');
            try {
              await api.post('/whatsapp/messages/upload-send', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
              enqueueSnackbar('تم إرسال الرسالة الصوتية', { variant: 'success' });
              // Messages reload automatically via socket or refetch
            } catch (error) {
              enqueueSnackbar('فشل إرسال الرسالة الصوتية', { variant: 'error' });
            }
          }
        }}
        onOpenContactInfo={() => setShowContactInfo(true)}
        onMessageContextMenu={handleMessageContextMenu}
        getContactName={getContactName}
        getParticipantName={getParticipantName}
        onOpenPoll={() => setPollDialogOpen(true)}
        onOpenButtons={() => setButtonsDialogOpen(true)}
        onOpenList={() => setListDialogOpen(true)}
        onOpenCatalog={() => { loadProducts(); setCatalogDialogOpen(true); }}
        onOpenLocation={() => setLocationDialogOpen(true)}
        onOpenOrder={() => { loadProducts(); setOrderDialogOpen(true); }}
        fileInputRef={fileInputRef}
      />

      <ConfirmDialog
        open={confirmData.open}
        title={confirmData.title}
        content={confirmData.content}
        onConfirm={confirmData.onConfirm}
        onCancel={() => setConfirmData(prev => ({ ...prev, open: false }))}
        confirmLabel={t('whatsapp.dialogs.confirm')}
        cancelLabel={t('whatsapp.dialogs.cancel')}
      />

      {/* Chat Context Menu */}
      <Menu anchorEl={chatMenuAnchor} open={Boolean(chatMenuAnchor)} onClose={() => setChatMenuAnchor(null)}>
        <MenuItem onClick={() => { if (selectedChatForMenu) handleClearChat(selectedChatForMenu); setChatMenuAnchor(null); }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> مسح المحتوى
        </MenuItem>
        <MenuItem onClick={() => { if (selectedChatForMenu) handleArchiveChat(selectedChatForMenu); setChatMenuAnchor(null); }}>
          <ArchiveIcon fontSize="small" sx={{ mr: 1 }} /> {selectedChatForMenu?.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}
        </MenuItem>
        <MenuItem onClick={() => { if (selectedChatForMenu) handlePinChat(selectedChatForMenu); setChatMenuAnchor(null); }}>
          <PinIcon fontSize="small" sx={{ mr: 1 }} /> {selectedChatForMenu?.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
        </MenuItem>
        <MenuItem onClick={() => { if (selectedChatForMenu) handleMuteChat(selectedChatForMenu); setChatMenuAnchor(null); }}>
          <MuteIcon fontSize="small" sx={{ mr: 1 }} /> {selectedChatForMenu?.isMuted ? 'إلغاء الكتم' : 'كتم'}
        </MenuItem>
        <MenuItem onClick={() => { if (selectedChatForMenu) handleMarkUnread(selectedChatForMenu); setChatMenuAnchor(null); }}>
          <PendingIcon fontSize="small" sx={{ mr: 1 }} /> تمييز كغير مقروء
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedChatForMenu) {
            setSelectedContactForLabel(selectedChatForMenu);
            setLabelDialogOpen(true);
          }
          setChatMenuAnchor(null);
        }}>
          <LabelIcon fontSize="small" sx={{ mr: 1 }} /> إضافة علامة
        </MenuItem>
        <MenuItem onClick={() => { if (selectedChatForMenu) handleDeleteChat(selectedChatForMenu); setChatMenuAnchor(null); }} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> حذف المحادثة
        </MenuItem>
      </Menu>

      {/* Message Context Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={() => setMessageMenuAnchor(null)}
      >
        {/* Quick Reactions */}
        <Box sx={{ display: 'flex', gap: 0.5, p: 1, borderBottom: 1, borderColor: 'divider' }}>
          {commonReactions.map(emoji => (
            <IconButton
              key={emoji}
              size="small"
              onClick={() => {
                if (selectedMessageForMenu) {
                  handleSendReaction(selectedMessageForMenu.messageId, emoji);
                  setMessageMenuAnchor(null);
                }
              }}
              sx={{ fontSize: '1.2rem' }}
            >
              {emoji}
            </IconButton>
          ))}
          <IconButton
            size="small"
            onClick={() => {
              if (selectedMessageForMenu) {
                setShowReactionPicker(selectedMessageForMenu.messageId);
                setMessageMenuAnchor(null);
              }
            }}
          >
            <AddReactionIcon fontSize="small" />
          </IconButton>
        </Box>
        <MenuItem onClick={handleReply}>
          <ReplyIcon fontSize="small" sx={{ mr: 1 }} /> رد
        </MenuItem>
        <MenuItem onClick={handleCopy}>
          <CopyIcon fontSize="small" sx={{ mr: 1 }} /> نسخ
        </MenuItem>
        <MenuItem onClick={() => { setForwardDialogOpen(true); setMessageMenuAnchor(null); }}>
          <ForwardIcon fontSize="small" sx={{ mr: 1 }} /> إعادة توجيه
        </MenuItem>
        <MenuItem onClick={() => { if (selectedMessageForMenu) handleStarMessage(selectedMessageForMenu); }}>
          <StarBorderIcon fontSize="small" sx={{ mr: 1 }} /> تمييز بنجمة
        </MenuItem>
        {selectedMessageForMenu?.fromMe && (
          <MenuItem onClick={handleDeleteMessage} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> حذف للجميع
          </MenuItem>
        )}
      </Menu>

      {/* Forward Dialog */}
      <Dialog open={forwardDialogOpen} onClose={() => setForwardDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إعادة توجيه الرسالة إلى...</DialogTitle>
        <DialogContent dividers>
          <List>
            {conversations.map(contact => (
              <ListItem
                key={contact.id}
                button
                onClick={() => {
                  if (selectedContactsForForward.includes(contact.id)) {
                    setSelectedContactsForForward(prev => prev.filter(id => id !== contact.id));
                  } else {
                    setSelectedContactsForForward(prev => [...prev, contact.id]);
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar src={contact.profilePicUrl || ''} />
                </ListItemAvatar>
                <ListItemText primary={getContactName(contact)} />
                {selectedContactsForForward.includes(contact.id) && <CheckIcon color="primary" />}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleForwardMessage} variant="contained" disabled={selectedContactsForForward.length === 0}>
            إرسال ({selectedContactsForForward.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Info Drawer (Individual) */}
      <Drawer
        anchor="right"
        open={showContactInfo && !selectedContact?.isGroup}
        onClose={() => setShowContactInfo(false)}
        PaperProps={{ sx: { width: 350 } }}
      >
        {selectedContact && !selectedContact.isGroup && (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar src={selectedContact.profilePicUrl || ''} sx={{ width: 120, height: 120, mb: 2 }} />
            <Typography variant="h6">{getContactName(selectedContact)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{selectedContact.phoneNumber}</Typography>

            <Divider sx={{ width: '100%', mb: 2 }} />

            <List sx={{ width: '100%' }}>
              <ListItem button>
                <ListItemText primary="الوسائط والروابط والمستندات" secondary="0" />
              </ListItem>
              <ListItem button onClick={loadStarredMessages}>
                <ListItemText primary="الرسائل المميزة بنجمة" />
                <StarIcon sx={{ color: 'warning.main' }} />
              </ListItem>
              <ListItem button onClick={() => handleMuteChat(selectedContact)}>
                <ListItemText primary="كتم الإشعارات" />
                <Typography variant="caption">{selectedContact.isMuted ? 'مفعل' : 'غير مفعل'}</Typography>
              </ListItem>
            </List>

            <Divider sx={{ width: '100%', my: 2 }} />

            <Button fullWidth color="error" startIcon={<DeleteIcon />} onClick={() => { handleDeleteChat(selectedContact); setShowContactInfo(false); }}>
              حذف المحادثة
            </Button>
            {selectedContact.isBlocked ? (
              <Button fullWidth color="primary" startIcon={<CheckIcon />} sx={{ mt: 1 }} onClick={() => handleUnblockContact(selectedContact)}>
                إلغاء حظر {getContactName(selectedContact)}
              </Button>
            ) : (
              <Button fullWidth color="error" startIcon={<BlockIcon />} sx={{ mt: 1 }} onClick={() => handleBlockContact(selectedContact)}>
                حظر {getContactName(selectedContact)}
              </Button>
            )}
            <Button fullWidth color="error" startIcon={<ReportIcon />} sx={{ mt: 1 }} onClick={() => enqueueSnackbar('قريباً', { variant: 'info' })}>
              الإبلاغ عن {getContactName(selectedContact)}
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Group Info Drawer */}
      <GroupInfoDrawer
        open={showContactInfo && !!selectedContact?.isGroup}
        onClose={() => setShowContactInfo(false)}
        sessionId={selectedContact?.sessionId || selectedSession}
        groupJid={selectedContact?.jid || ''}
        contacts={conversations}
      />

      <CreateGroupDialog
        open={createGroupDialogOpen}
        onClose={() => setCreateGroupDialogOpen(false)}
        sessionId={selectedSession}
        contacts={conversations}
        onGroupCreated={(group) => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
          // Optionally select the new group
          // setSelectedContact(group); 
        }}
      />
      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        sessionId={selectedSession}
        currentName={currentUserProfile?.name || ''}
        currentStatus={currentUserProfile?.status || ''}
        currentPicture={currentUserProfile?.profilePicUrl || ''}
      />

      <CheckNumberDialog
        open={checkNumberDialogOpen}
        onClose={() => setCheckNumberDialogOpen(false)}
        sessionId={selectedSession}
        onChatStart={(jid) => {
          const existingContact = conversations.find(c => c.jid === jid);
          if (existingContact) {
            setSelectedContact(existingContact);
          } else {
            // Invalidate queries to refetch and find the new contact
            queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
            // Create temporary contact for immediate selection
            const newContact: Contact = {
              id: jid,
              sessionId: selectedSession,
              jid: jid,
              phoneNumber: jid.split('@')[0] || jid,
              name: null,
              pushName: null,
              profilePicUrl: null,
              isGroup: false,
              category: null,
              unreadCount: 0,
              lastMessageAt: new Date().toISOString(),
              isArchived: false,
              isPinned: false,
              isMuted: false,
              isBlocked: false,
              session: { name: '', phoneNumber: '' },
              customer: null
            };
            setSelectedContact(newContact);
          }
        }}
      />



      {/* Poll Dialog */}
      <Dialog open={pollDialogOpen} onClose={() => setPollDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PollIcon color="primary" />
            إنشاء استطلاع
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="السؤال"
            value={pollData.question}
            onChange={(e) => setPollData(prev => ({ ...prev, question: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>الخيارات:</Typography>
          {pollData.options.map((option, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={`الخيار ${index + 1}`}
                value={option}
                onChange={(e) => {
                  const newOptions = [...pollData.options];
                  newOptions[index] = e.target.value;
                  setPollData(prev => ({ ...prev, options: newOptions }));
                }}
              />
              {pollData.options.length > 2 && (
                <IconButton
                  size="small"
                  onClick={() => {
                    const newOptions = pollData.options.filter((_, i) => i !== index);
                    setPollData(prev => ({ ...prev, options: newOptions }));
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          {pollData.options.length < 12 && (
            <Button
              size="small"
              onClick={() => setPollData(prev => ({ ...prev, options: [...prev.options, ''] }))}
              sx={{ mb: 2 }}
            >
              + إضافة خيار
            </Button>
          )}
          <FormControl fullWidth size="small">
            <InputLabel>عدد الاختيارات المسموحة</InputLabel>
            <Select
              value={pollData.selectableCount}
              label="عدد الاختيارات المسموحة"
              onChange={(e) => setPollData(prev => ({ ...prev, selectableCount: Number(e.target.value) }))}
            >
              <MenuItem value={1}>اختيار واحد فقط</MenuItem>
              <MenuItem value={0}>اختيارات متعددة</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPollDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSendPoll}
            disabled={!pollData.question.trim() || pollData.options.filter(o => o.trim()).length < 2}
          >
            إرسال الاستطلاع
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reaction Picker Dialog */}
      <Dialog
        open={!!showReactionPicker}
        onClose={() => setShowReactionPicker(null)}
        maxWidth="xs"
      >
        <DialogTitle>اختر تفاعل</DialogTitle>
        <DialogContent>
          <EmojiPicker
            onEmojiClick={(data: EmojiClickData) => {
              if (showReactionPicker) {
                handleSendReaction(showReactionPicker, data.emoji);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Buttons Dialog */}
      <Dialog open={buttonsDialogOpen} onClose={() => setButtonsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ButtonIcon color="primary" />
            إرسال رسالة بأزرار
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="نص الرسالة"
            multiline
            rows={3}
            value={buttonsData.text}
            onChange={(e) => setButtonsData(prev => ({ ...prev, text: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="نص التذييل (اختياري)"
            value={buttonsData.footer}
            onChange={(e) => setButtonsData(prev => ({ ...prev, footer: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>الأزرار (حد أقصى 3):</Typography>
          {buttonsData.buttons.map((btn, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={`الزر ${index + 1}`}
                value={btn.text}
                onChange={(e) => {
                  const newButtons = [...buttonsData.buttons];
                  newButtons[index] = { ...btn, text: e.target.value };
                  setButtonsData(prev => ({ ...prev, buttons: newButtons }));
                }}
              />
              {buttonsData.buttons.length > 1 && (
                <IconButton size="small" onClick={() => {
                  setButtonsData(prev => ({ ...prev, buttons: prev.buttons.filter((_, i) => i !== index) }));
                }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          {buttonsData.buttons.length < 3 && (
            <Button size="small" onClick={() => setButtonsData(prev => ({
              ...prev,
              buttons: [...prev.buttons, { id: String(prev.buttons.length + 1), text: '' }]
            }))}>
              + إضافة زر
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setButtonsDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSendButtons} disabled={!buttonsData.text.trim()}>
            إرسال
          </Button>
        </DialogActions>
      </Dialog>

      {/* List Dialog */}
      <Dialog open={listDialogOpen} onClose={() => setListDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ListIcon color="primary" />
            إرسال رسالة بقائمة
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="نص الرسالة"
            multiline
            rows={2}
            value={listData.text}
            onChange={(e) => setListData(prev => ({ ...prev, text: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="عنوان القائمة"
              value={listData.title}
              onChange={(e) => setListData(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              fullWidth
              label="نص الزر"
              value={listData.buttonText}
              onChange={(e) => setListData(prev => ({ ...prev, buttonText: e.target.value }))}
            />
          </Box>

          {listData.sections.map((section, sIndex) => (
            <Paper key={sIndex} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <TextField
                  size="small"
                  label="عنوان القسم"
                  value={section.title}
                  onChange={(e) => {
                    const newSections = [...listData.sections];
                    newSections[sIndex] = { ...section, title: e.target.value };
                    setListData(prev => ({ ...prev, sections: newSections }));
                  }}
                />
                {listData.sections.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => {
                    setListData(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== sIndex) }));
                  }}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>

              {section.rows.map((row, rIndex) => (
                <Box key={rIndex} sx={{ display: 'flex', gap: 1, mb: 1, ml: 2 }}>
                  <TextField
                    size="small"
                    placeholder="العنوان"
                    value={row.title}
                    onChange={(e) => {
                      const newSections = [...listData.sections];
                      if (newSections[sIndex]?.rows[rIndex]) {
                        newSections[sIndex].rows[rIndex] = { ...row, title: e.target.value };
                        setListData(prev => ({ ...prev, sections: newSections }));
                      }
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    placeholder="الوصف (اختياري)"
                    value={row.description}
                    onChange={(e) => {
                      const newSections = [...listData.sections];
                      if (newSections[sIndex]?.rows[rIndex]) {
                        newSections[sIndex].rows[rIndex] = { ...row, description: e.target.value };
                        setListData(prev => ({ ...prev, sections: newSections }));
                      }
                    }}
                    sx={{ flex: 1 }}
                  />
                  {section.rows.length > 1 && (
                    <IconButton size="small" onClick={() => {
                      const newSections = [...listData.sections];
                      if (newSections[sIndex]) {
                        newSections[sIndex].rows = section.rows.filter((_, i) => i !== rIndex);
                        setListData(prev => ({ ...prev, sections: newSections }));
                      }
                    }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Button size="small" onClick={() => {
                const newSections = [...listData.sections];
                if (newSections[sIndex]) {
                  newSections[sIndex].rows.push({ id: String(section.rows.length + 1), title: '', description: '' });
                  setListData(prev => ({ ...prev, sections: newSections }));
                }
              }}>
                + إضافة عنصر
              </Button>
            </Paper>
          ))}

          {listData.sections.length < 10 && (
            <Button onClick={() => setListData(prev => ({
              ...prev,
              sections: [...prev.sections, { title: `القسم ${prev.sections.length + 1}`, rows: [{ id: '1', title: '', description: '' }] }]
            }))}>
              + إضافة قسم
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setListDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSendList} disabled={!listData.text.trim()}>
            إرسال
          </Button>
        </DialogActions>
      </Dialog>



      {/* Catalog Dialog */}
      <Dialog open={catalogDialogOpen} onClose={() => setCatalogDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CatalogIcon color="primary" />
            إرسال منتج
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {products.length === 0 ? (
            <Alert severity="info">لا توجد منتجات في الكتالوج.</Alert>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
              {products.map((product, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: selectedProduct?.id === product.id ? '2px solid' : '1px solid',
                    borderColor: selectedProduct?.id === product.id ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.light' }
                  }}
                  onClick={() => setSelectedProduct(product)}
                >
                  {product.imageUrl && (
                    <Box
                      component="img"
                      src={product.imageUrl}
                      sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 1, mb: 1 }}
                    />
                  )}
                  <Typography variant="subtitle2" noWrap>{product.name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {product.description}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {product.price} {product.currency || 'EGP'}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatalogDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => selectedProduct && handleSendProduct(selectedProduct)}
            disabled={!selectedProduct}
          >
            إرسال المنتج
          </Button>
        </DialogActions>
      </Dialog>

      {/* Starred Messages Drawer */}
      <Drawer
        anchor="right"
        open={starredMessagesOpen}
        onClose={() => setStarredMessagesOpen(false)}
        PaperProps={{ sx: { width: 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <StarIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
              الرسائل المميزة
            </Typography>
            <IconButton onClick={() => setStarredMessagesOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {starredMessages.length === 0 ? (
            <Typography color="text.secondary" textAlign="center">
              لا توجد رسائل مميزة
            </Typography>
          ) : (
            <List>
              {starredMessages.map((msg, index) => (
                <Paper key={index} sx={{ p: 1, mb: 1 }}>
                  <Typography variant="body2">{msg.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(msg.timestamp), 'dd/MM/yyyy HH:mm')}
                  </Typography>
                </Paper>
              ))}
            </List>
          )}
        </Box>
      </Drawer>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CatalogIcon color="secondary" />
            إنشاء طلب
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle1" gutterBottom>المنتجات المتاحة</Typography>
              {products.length === 0 ? (
                <Alert severity="info">لا توجد منتجات</Alert>
              ) : (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {products.map((product, index) => (
                    <ListItem key={index} secondaryAction={
                      <Button size="small" onClick={() => addToOrder(product)}>إضافة</Button>
                    }>
                      <ListItemText
                        primary={product.name}
                        secondary={`${product.price || 0} ${orderData.currency}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle1" gutterBottom>الطلب الحالي</Typography>
              {orderData.items.length === 0 ? (
                <Typography color="text.secondary">لم تتم إضافة منتجات</Typography>
              ) : (
                <>
                  <List>
                    {orderData.items.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <ListItem key={index} secondaryAction={
                          <IconButton size="small" color="error" onClick={() => removeFromOrder(item.productId)}>
                            <DeleteIcon />
                          </IconButton>
                        }>
                          <ListItemText
                            primary={product?.name || item.productId}
                            secondary={`${item.quantity} × ${item.price} = ${item.quantity * item.price} ${orderData.currency}`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6">
                    الإجمالي: {orderData.items.reduce((sum, i) => sum + (i.quantity * i.price), 0)} {orderData.currency}
                  </Typography>
                </>
              )}

              <TextField
                fullWidth
                label="ملاحظات"
                value={orderData.note}
                onChange={(e) => setOrderData({ ...orderData, note: e.target.value })}
                multiline
                rows={2}
                sx={{ mt: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSendOrder}
            disabled={orderData.items.length === 0}
          >
            إرسال الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onClose={() => setLocationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            إرسال موقع
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LocationIcon />}
            onClick={getCurrentLocation}
            sx={{ mb: 3 }}
          >
            استخدام موقعي الحالي
          </Button>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>أو أدخل الإحداثيات يدوياً:</Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="خط العرض (Latitude)"
              value={locationData.latitude}
              onChange={(e) => setLocationData(prev => ({ ...prev, latitude: e.target.value }))}
              type="number"
              inputProps={{ step: 'any' }}
            />
            <TextField
              fullWidth
              label="خط الطول (Longitude)"
              value={locationData.longitude}
              onChange={(e) => setLocationData(prev => ({ ...prev, longitude: e.target.value }))}
              type="number"
              inputProps={{ step: 'any' }}
            />
          </Box>

          <TextField
            fullWidth
            label="العنوان (اختياري)"
            value={locationData.address}
            onChange={(e) => setLocationData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="مثال: القاهرة، مصر"
          />

          {locationData.latitude && locationData.longitude && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                📍 الموقع: {locationData.latitude}, {locationData.longitude}
              </Typography>
              <Button
                size="small"
                href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
                target="_blank"
                sx={{ mt: 1 }}
              >
                عرض على الخريطة
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSendLocation}
            disabled={!locationData.latitude || !locationData.longitude}
          >
            إرسال الموقع
          </Button>
        </DialogActions>
      </Dialog>

      {/* Labels Dialog */}
      <LabelsDialog
        open={labelDialogOpen}
        onClose={() => {
          setLabelDialogOpen(false);
          setSelectedContactForLabel(null);
        }}
        sessionId={selectedSession}
        contactJid={selectedContactForLabel?.jid}
        initialLabels={selectedContactForLabel?.labels || []}
        onLabelsUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', selectedSession] });
        }}
      />

      {/* Post Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة حالة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="نص الحالة"
            fullWidth
            multiline
            rows={3}
            value={statusContent}
            onChange={(e) => setStatusContent(e.target.value)}
            placeholder="ماذا يحدث؟"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            💡 الحالة ستنتهي بعد 24 ساعة
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handlePostStatus}
            variant="contained"
            disabled={!statusContent.trim() || postingStatus}
          >
            {postingStatus ? <CircularProgress size={20} /> : 'نشر'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Broadcast Dialog */}
      <BroadcastDialog
        open={broadcastDialogOpen}
        onClose={() => setBroadcastDialogOpen(false)}
        sessionId={selectedSession}
        contacts={conversations}
      />

      {/* Privacy Settings Dialog */}
      <PrivacySettingsDialog
        open={privacyDialogOpen}
        onClose={() => setPrivacyDialogOpen(false)}
        sessionId={selectedSession}
        contacts={conversations}
      />

      {/* Business Profile Dialog */}
      <BusinessProfileDialog
        open={businessProfileDialogOpen}
        onClose={() => setBusinessProfileDialogOpen(false)}
        sessionId={selectedSession}
      />
    </Box >
  );
};

const WhatsAppChat: React.FC = () => {
  return (
    <MuiThemeWrapper>
      <WhatsAppChatContent />
    </MuiThemeWrapper>
  );
};

export default WhatsAppChat;
