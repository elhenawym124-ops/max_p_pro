import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import InboxTabs from '../../components/facebook-inbox/InboxTabs/InboxTabs';
import ConversationItem from '../../components/facebook-inbox/ConversationList/ConversationItem';
import MessageBubble from '../../components/facebook-inbox/MessageBubble/MessageBubble';
import MessageInput from '../../components/facebook-inbox/MessageInput/MessageInput';
import ConversationActionsBar from '../../components/facebook-inbox/ConversationActionsBar/ConversationActionsBar';
import { NotesPanel } from '../../components/facebook-inbox/NotesPanel/NotesPanel';
import FilterPanel, { FilterState } from '../../components/facebook-inbox/FilterPanel/FilterPanel';
import StatsDashboard from '../../components/facebook-inbox/StatsDashboard/StatsDashboard';
import CustomerProfile from '../../components/facebook-inbox/CustomerProfile/CustomerProfile';
import BulkActionsBar from '../../components/facebook-inbox/BulkActionsBar/BulkActionsBar';
import ForwardModal from '../../components/facebook-inbox/Modals/ForwardModal';
import SnoozeModal from '../../components/facebook-inbox/Modals/SnoozeModal';
import QuickOrderModal from '../../components/facebook-inbox/Modals/QuickOrderModal';
import AIToggle from '../../components/facebook-inbox/AIToggle/AIToggle';
import TextGalleryModal from '../../components/facebook-inbox/TextGallery/TextGalleryModal';
import ImageGalleryModal from '../../components/facebook-inbox/ImageGallery/ImageGalleryModal';
import { InboxTab, ConversationStatus, InboxMessage, InboxConversation } from '../../types/inbox.types';
import { useInboxConversations } from '../../hooks/inbox/useInboxConversations';
import { useSendMessage } from '../../hooks/inbox/useSendMessage';
import { useConversationActions } from '../../hooks/inbox/useConversationActions';
import { useTagManagement } from '../../hooks/inbox/useTagManagement';
import useSocket from '../../hooks/useSocket';
import TypingIndicator from '../../components/facebook-inbox/TypingIndicator/TypingIndicator';
import AISuggestions from '../../components/facebook-inbox/AISuggestions/AISuggestions';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../hooks/useAuthSimple';
import { StickyNote, Menu, ArrowRight, Copy, Check } from 'lucide-react';
import { NoSymbolIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../../services/apiClient';
import { useDebounce } from '../../hooks/useDebounce';
import { apiService } from '../../services/apiService';
import { socketService } from '../../services/socketService';

const FacebookInbox: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { companyId } = useCompany();
    const { socket, isConnected } = useSocket();

    // Conversations management
    const {
        conversations,
        selectedConversation,
        messages,
        loading,
        loadingMessages,
        error,
        selectConversation,
        loadMessages,
        loadConversations,
        loadMoreMessages,
        addMessage,
        hasMore,
        // Conversations pagination
        hasMoreConversations,
        loadMoreConversations,
        // Update selected conversation
        updateSelectedConversation,
        // Selection
        selectedIds,
        toggleSelection,
        clearSelection,
        // 🆕 API counts for accurate tab counts
        apiCounts,
        // 🆕 Add conversation to list
        addConversationToList,
        // 🆕 Mark messages as read (for read receipts)
        markMessagesAsRead
    } = useInboxConversations();

    // Send message
    const { sendTextMessage, sendFileMessage, sending, uploadingFile } = useSendMessage();

    // Conversation actions
    const {
        updateStatus,
        assignConversation,
        markAsDone,
        togglePriority,
        bulkUpdate,
        deleteMessage,
        forwardMessage,
        toggleMessageStar,
        toggleMessageReaction,
        snoozeConversation,
        toggleAI,
        updating
    } = useConversationActions();

    // Tag management
    const { addTags, updating: updatingTags } = useTagManagement();

    // Local state - Default to 'unreplied' tab
    const [activeTab, setActiveTab] = useState<InboxTab>('unreplied');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search for better performance
    const [showFilters, setShowFilters] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true); // للتحكم في إظهار/إخفاء Sidebar على الموبايل
    const [filters, setFilters] = useState<FilterState>({
        unreadOnly: false,
        assignedTo: 'all',
        startDate: null,
        endDate: null
    });

    // Forwarding State
    const [forwardModalOpen, setForwardModalOpen] = useState(false);
    const [messageToForward, setMessageToForward] = useState<InboxMessage | null>(null);
    const [replyToMessage, setReplyToMessage] = useState<any>(null);
    const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);

    // Text Gallery State
    const [showTextGallery, setShowTextGallery] = useState(false);

    // Image Gallery State
    const [showImageGallery, setShowImageGallery] = useState(false);

    // 🆕 Quick Order Modal State
    const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);

    // 🆕 Block Customer States
    const [isBlocked, setIsBlocked] = useState(false);
    const [checkingBlockStatus, setCheckingBlockStatus] = useState(false);
    const [blocking, setBlocking] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockReason, setBlockReason] = useState('');

    // 🆕 Sound & Notifications States
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // 🆕 Copy Link State
    const [copiedLink, setCopiedLink] = useState(false);

    // 🆕 Advanced Search States
    const [loadingMessagesForSearch, setLoadingMessagesForSearch] = useState<Set<string>>(new Set());
    const [conversationMessages, setConversationMessages] = useState<Map<string, InboxMessage[]>>(new Map());

    // 🆕 Load specific conversation from URL
    const conversationsRef = useRef(conversations);
    conversationsRef.current = conversations; // Keep ref updated

    const loadSpecificConversation = useCallback(async (conversationId: string) => {
        if (!companyId || !conversationId) return;

        try {
            console.log('🔄 [URL-LOAD] Loading specific conversation from URL:', conversationId);

            // Check if conversation is already loaded (use ref to avoid dependency)
            const existingConversation = conversationsRef.current.find(c => c.id === conversationId);
            if (existingConversation) {
                console.log('✅ [URL-LOAD] Conversation already loaded, selecting it');
                selectConversation(existingConversation);
                return;
            }

            // Load conversation from API
            const response = await apiClient.get(`/conversations/${conversationId}`, {
                params: { companyId }
            });

            const convData = response.data?.data || response.data;
            if (!convData) {
                console.error('❌ [URL-LOAD] Conversation not found');
                return;
            }

            // Format conversation to match InboxConversation interface
            const formattedConversation: InboxConversation = {
                id: convData.id,
                customerId: convData.customerId,
                customerName: convData.customer?.name || convData.customerName || 'عميل',
                customerAvatar: convData.customer?.avatar || convData.customerAvatar,
                lastMessage: convData.lastMessage || 'لا توجد رسائل',
                lastMessageTime: new Date(convData.lastMessageTime || convData.updatedAt),
                unreadCount: convData.unreadCount || 0,
                platform: 'facebook' as const,
                tab: (() => {
                    const status = (convData.status || 'active').toLowerCase();
                    if (status === 'resolved' || status === 'done') return 'done';
                    if (status === 'active' || status === 'open' || status === 'pending') {
                        if (convData.metadata) {
                            try {
                                const metadata = typeof convData.metadata === 'string' ? JSON.parse(convData.metadata) : convData.metadata;
                                const metadataTab = metadata.tab || metadata.inboxTab;
                                if (['main', 'general', 'requests', 'spam'].includes(metadataTab)) {
                                    return metadataTab as InboxTab;
                                }
                            } catch (e) { }
                        }
                        return 'main';
                    }
                    return 'all';
                })(),
                status: (() => {
                    const status = (convData.status || 'active').toLowerCase();
                    if (status === 'resolved' || status === 'done') return 'done';
                    if (status === 'pending') return 'pending';
                    return 'open';
                })(),
                assignedTo: convData.assignedTo || null,
                assignedToName: convData.assignedToName || null,
                tags: convData.tags || [],
                priority: convData.priority || false,
                snoozedUntil: convData.snoozedUntil ? new Date(convData.snoozedUntil) : null,
                archived: convData.archived || false,
                muted: convData.muted || false,
                lastStatusChange: new Date(convData.lastStatusChange || convData.updatedAt),
                firstResponseTime: convData.firstResponseTime || null,
                avgResponseTime: convData.avgResponseTime || null,
                pageName: convData.pageName,
                pageId: convData.pageId,
                aiEnabled: (() => {
                    if (convData.hasOwnProperty('aiEnabled') && convData.aiEnabled !== undefined) return convData.aiEnabled;
                    if (convData.metadata) {
                        try {
                            const metadata = typeof convData.metadata === 'string' ? JSON.parse(convData.metadata) : convData.metadata;
                            return metadata.aiEnabled !== false;
                        } catch (e) { return true; }
                    }
                    return true;
                })(),
                lastMessageIsFromCustomer: convData.lastMessageIsFromCustomer,
                hasUnreadMessages: convData.hasUnreadMessages,
                postId: (() => {
                    if (convData.postId) return convData.postId;
                    if (convData.metadata) {
                        try {
                            const metadata = typeof convData.metadata === 'string' ? JSON.parse(convData.metadata) : convData.metadata;
                            return metadata.postId || null;
                        } catch (e) { return null; }
                    }
                    return null;
                })()
            };

            // Add conversation to list if not already there
            addConversationToList(formattedConversation);

            // Select the conversation
            selectConversation(formattedConversation);

            console.log('✅ [URL-LOAD] Conversation loaded and selected:', conversationId);

        } catch (error: any) {
            console.error('❌ [URL-LOAD] Error loading conversation:', error);
        }
    }, [companyId, selectConversation, addConversationToList]); // Remove conversations from dependencies to prevent infinite loop

    // 🆕 Reload conversations when tab changes (especially for unreplied)
    // Skip initial load since useInboxConversations already loads on mount
    const isInitialMount = useRef(true);
    const loadConversationsRef = useRef(loadConversations);
    loadConversationsRef.current = loadConversations; // Keep ref updated

    // 🆕 Check URL for conversation parameter on mount (only once)
    const urlConversationLoadedRef = useRef(false);
    const loadSpecificConversationRef = useRef(loadSpecificConversation);
    loadSpecificConversationRef.current = loadSpecificConversation; // Keep ref updated

    useEffect(() => {
        // Only run once when component mounts
        if (urlConversationLoadedRef.current) return;

        const urlParams = new URLSearchParams(window.location.search);
        const conversationId = urlParams.get('conversation');

        if (conversationId && companyId) {
            urlConversationLoadedRef.current = true; // Mark as loaded
            console.log('🔗 [URL] Found conversation ID in URL:', conversationId);
            // Wait a bit for conversations to load first, then load specific conversation
            setTimeout(() => {
                if (loadSpecificConversationRef.current) {
                    loadSpecificConversationRef.current(conversationId);
                }
            }, 500);
        }
    }, [companyId]); // Only depend on companyId, not loadSpecificConversation

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            // 🆕 Use database search when search query exists
            if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
                loadConversationsRef.current(1, false, activeTab, debouncedSearchQuery.trim());
            } else {
                loadConversationsRef.current(1, false, activeTab);
            }
            return;
        }

        // 🆕 Use database search when search query exists
        if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
            loadConversationsRef.current(1, false, activeTab, debouncedSearchQuery.trim());
        } else {
            loadConversationsRef.current(1, false, activeTab);
        }
    }, [activeTab, debouncedSearchQuery]); // 🔧 Added debouncedSearchQuery to trigger search in database

    // 🔧 OPTIMIZED: Debounce loadConversations to prevent excessive API calls
    // Move this before handlers that use it
    const loadConversationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const loadConversationsRefForDebounce = useRef(loadConversations);
    const debouncedSearchQueryRef = useRef(debouncedSearchQuery);
    debouncedSearchQueryRef.current = debouncedSearchQuery; // Keep ref updated
    loadConversationsRefForDebounce.current = loadConversations; // Keep ref updated

    const debouncedLoadConversations = useCallback((tab: InboxTab) => {
        if (loadConversationsTimeoutRef.current) {
            clearTimeout(loadConversationsTimeoutRef.current);
        }
        loadConversationsTimeoutRef.current = setTimeout(() => {
            // 🆕 Use database search when search query exists
            const search = debouncedSearchQueryRef.current?.trim();
            if (search) {
                loadConversationsRefForDebounce.current(1, false, tab, search);
            } else {
                loadConversationsRefForDebounce.current(1, false, tab);
            }
            loadConversationsTimeoutRef.current = null;
        }, 500); // Debounce by 500ms to batch multiple updates
    }, []); // 🔧 OPTIMIZED: Empty dependencies, use ref instead

    // Tab counts - OPTIMIZED: Single pass calculation instead of multiple filters
    const tabCounts = useMemo(() => {
        // Use API counts when available (more accurate)
        const counts = {
            all: apiCounts.total || 0,
            unreplied: apiCounts.unreplied || 0,
            done: 0,
            main: 0,
            general: 0,
            requests: 0,
            spam: 0,
        };

        // 🔧 OPTIMIZED: Single pass through conversations instead of multiple filters
        if (conversations.length > 0) {
            for (const conv of conversations) {
                switch (conv.tab) {
                    case 'done':
                        counts.done++;
                        break;
                    case 'main':
                        counts.main++;
                        break;
                    case 'general':
                        counts.general++;
                        break;
                    case 'requests':
                        counts.requests++;
                        break;
                    case 'spam':
                        counts.spam++;
                        break;
                }
            }
        }

        // Fallback to conversations.length if API count not available
        if (!apiCounts.total && conversations.length > 0) {
            counts.all = conversations.length;
        }

        return counts;
    }, [conversations, apiCounts]);

    // 🆕 Load all messages for a conversation (for advanced search)
    const loadAllMessagesForConversation = useCallback(async (conversationId: string) => {
        // Avoid duplicate loading
        if (loadingMessagesForSearch.has(conversationId)) {
            return;
        }

        // Check if messages are already loaded
        if (conversationMessages.has(conversationId)) {
            const existingMessages = conversationMessages.get(conversationId);
            if (existingMessages && existingMessages.length > 0) {
                return; // Already loaded
            }
        }

        // Check if messages are already loaded for selected conversation
        if (selectedConversation?.id === conversationId && messages.length > 0) {
            // Store messages in conversationMessages map for search (convert to InboxMessage format)
            const inboxMessages: InboxMessage[] = messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                senderId: msg.senderId,
                senderName: msg.senderName,
                timestamp: msg.timestamp,
                type: msg.type as InboxMessage['type'],
                isFromCustomer: msg.isFromCustomer,
                status: msg.status as InboxMessage['status'],
                conversationId: msg.conversationId,
                fileUrl: msg.fileUrl,
                fileName: msg.fileName,
                fileSize: msg.fileSize,
                isAiGenerated: msg.isAiGenerated,
                metadata: msg.metadata,
                attachments: msg.attachments
            }));
            setConversationMessages(prev => {
                const newMap = new Map(prev);
                newMap.set(conversationId, inboxMessages);
                return newMap;
            });
            return;
        }

        setLoadingMessagesForSearch(prev => new Set(prev).add(conversationId));

        try {
            console.log('🔍 [SEARCH] Loading all messages for conversation:', conversationId);

            let allMessages: InboxMessage[] = [];
            let page = 1;
            let hasMore = true;

            // Load all messages using pagination
            while (hasMore) {
                const response = await apiClient.get(`/conversations/${conversationId}/messages`, {
                    params: {
                        page,
                        limit: 50
                    }
                });

                const data = response.data?.data || response.data || [];

                if (data.length === 0) {
                    hasMore = false;
                    break;
                }

                // Parse messages to InboxMessage format
                const parsedMessages: InboxMessage[] = data.map((msg: any) => ({
                    id: msg.id,
                    content: msg.content || '',
                    senderId: msg.senderId || msg.sender?.id || '',
                    senderName: msg.senderName || msg.sender?.name || (msg.isFromCustomer ? 'العميل' : 'موظف'),
                    timestamp: new Date(msg.timestamp || msg.createdAt),
                    type: (msg.type || 'text') as InboxMessage['type'],
                    isFromCustomer: msg.isFromCustomer || false,
                    status: (msg.status || 'sent') as InboxMessage['status'],
                    conversationId: conversationId,
                    fileUrl: msg.fileUrl,
                    fileName: msg.fileName,
                    fileSize: msg.fileSize,
                    isAiGenerated: msg.metadata ? (() => {
                        try {
                            const md = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
                            return md.isAIGenerated || md.isAutoGenerated || false;
                        } catch {
                            return false;
                        }
                    })() : false
                }));

                allMessages = [...allMessages, ...parsedMessages];

                // If messages count is less than 50, no more messages
                if (data.length < 50) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            console.log(`✅ [SEARCH] Loaded ${allMessages.length} messages for conversation ${conversationId}`);

            // Store messages in conversationMessages map for search
            setConversationMessages(prev => {
                const newMap = new Map(prev);
                newMap.set(conversationId, allMessages);
                return newMap;
            });

        } catch (error) {
            console.error('❌ [SEARCH] Error loading all messages for conversation:', error);
        } finally {
            setLoadingMessagesForSearch(prev => {
                const newSet = new Set(prev);
                newSet.delete(conversationId);
                return newSet;
            });
        }
    }, [selectedConversation, messages, loadingMessagesForSearch, conversationMessages]);

    // Filtered conversations - using debounced search query with advanced message search
    // 🔧 OPTIMIZED: Removed activeTab from dependencies (not used in filtering)
    const filteredConversations = useMemo(() => {
        const filtered = conversations.filter(conv => {
            // 1. Tab filter - REMOVED (Server-side filtering now)
            // We assume 'conversations' contains only items for the current tab


            // 2. Search query (using debounced value) - 🆕 Advanced: search in messages too
            if (debouncedSearchQuery) {
                const query = debouncedSearchQuery.toLowerCase();
                const matchesName = conv.customerName.toLowerCase().includes(query);
                const matchesMessage = conv.lastMessage.toLowerCase().includes(query);

                // 🆕 Advanced: Search in loaded messages (from conversationMessages map or current messages)
                let matchesMessagesContent = false;

                // Check if messages are loaded for this conversation
                const loadedMessages = conversationMessages.get(conv.id);
                if (loadedMessages && loadedMessages.length > 0) {
                    matchesMessagesContent = loadedMessages.some(msg =>
                        (msg.content || '').toLowerCase().includes(query)
                    );
                } else if (selectedConversation?.id === conv.id && messages.length > 0) {
                    // Fallback to current messages if conversation is selected
                    matchesMessagesContent = messages.some(msg =>
                        (msg.content || '').toLowerCase().includes(query)
                    );
                }

                if (!matchesName && !matchesMessage && !matchesMessagesContent) return false;
            }

            // 3. Unread filter
            if (filters.unreadOnly && conv.unreadCount === 0) return false;

            // 4. Assignment filter
            if (filters.assignedTo === 'me' && conv.assignedTo !== user?.id) return false;
            if (filters.assignedTo === 'unassigned' && conv.assignedTo !== null) return false;

            // 5. Date Range
            if (filters.startDate || filters.endDate) {
                const convDate = new Date(conv.lastMessageTime);
                if (filters.startDate && convDate < filters.startDate) return false;
                if (filters.endDate) {
                    const endOfDay = new Date(filters.endDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (convDate > endOfDay) return false;
                }
            }

            return true;
        });
        return filtered;
    }, [conversations, debouncedSearchQuery, filters, user?.id, selectedConversation, messages, conversationMessages]); // 🔧 Added conversationMessages for advanced search

    // Auto-scroll to bottom
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef(0);
    const oldScrollHeightRef = useRef(0);
    const wasAtBottomRef = useRef(true);

    // Scroll to bottom helper
    const scrollToBottom = useCallback((smooth = true) => {
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }, []);

    // Check if user is at bottom of scroll
    const isAtBottom = useCallback((container: HTMLDivElement, threshold = 100) => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        return scrollHeight - scrollTop - clientHeight < threshold;
    }, []);

    // Track if this is initial load for a conversation
    const isInitialLoadRef = useRef(true);
    const lastConversationIdRef = useRef<string | null>(null);

    // Scroll to bottom when conversation changes or initial load
    useEffect(() => {
        // Detect conversation change
        if (selectedConversation?.id !== lastConversationIdRef.current) {
            isInitialLoadRef.current = true;
            lastConversationIdRef.current = selectedConversation?.id || null;
        }

        if (messages.length > 0 && selectedConversation && isInitialLoadRef.current) {
            // Always scroll to bottom when opening a conversation
            // Use multiple timeouts to ensure scroll happens after render
            scrollToBottom(false);
            setTimeout(() => scrollToBottom(false), 50);
            setTimeout(() => scrollToBottom(false), 150);
            setTimeout(() => scrollToBottom(false), 300);
            wasAtBottomRef.current = true;
            isInitialLoadRef.current = false;
        }
    }, [selectedConversation?.id, messages.length, scrollToBottom]);

    // Scroll to bottom on new messages if user was already at bottom
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || messages.length === 0) return;

        // If new message was added (length increased) and user was at bottom
        if (messages.length > prevMessagesLength.current && wasAtBottomRef.current) {
            setTimeout(() => scrollToBottom(true), 50);
        }

        prevMessagesLength.current = messages.length;
    }, [messages.length, scrollToBottom]);

    // Handle scroll events - detect if user is at bottom and load more when scrolling up
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;

        // Check if at bottom
        wasAtBottomRef.current = isAtBottom(container);

        // Load more messages when scrolling to top
        if (container.scrollTop < 200 && hasMore && !loadingMessages) {
            const oldScrollHeight = container.scrollHeight;
            oldScrollHeightRef.current = oldScrollHeight;
            loadMoreMessages();
        }
    }, [hasMore, loadingMessages, loadMoreMessages, isAtBottom]);

    // Restore scroll position after loading older messages
    useLayoutEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || !oldScrollHeightRef.current) return;

        // If messages increased and we were loading more (old scroll height exists)
        if (messages.length > prevMessagesLength.current && prevMessagesLength.current > 0) {
            const newScrollHeight = container.scrollHeight;
            const diff = newScrollHeight - oldScrollHeightRef.current;
            container.scrollTop = diff;
            oldScrollHeightRef.current = 0;
        }
    }, [messages.length]);


    // Send message handlers
    // 🆕 Optimistic UI handlers for instant message display
    const handleOptimisticMessage = useCallback((optimisticMsg: any) => {
        // Add message immediately to UI
        addMessage(optimisticMsg);
    }, [addMessage]);

    const handleMessageSent = useCallback((_tempId: string, _realMessage: any) => {
        // Message sent successfully - socket will handle the update
        // No need to replace since socket event will add the real message
    }, []);

    const handleMessageError = useCallback((tempId: string, error: string) => {
        // Mark message as failed - could update UI to show error state
        console.error('Message failed:', tempId, error);
    }, []);

    // 🆕 Optimistic UI - message appears instantly, sends in background
    const handleSendMessage = useCallback(async (content: string) => {
        if (!selectedConversation || !companyId) return;

        // Clear reply immediately for better UX
        const currentReplyTo = replyToMessage;
        setReplyToMessage(null);

        // 🆕 Update conversation state immediately
        updateSelectedConversation({
            lastMessageIsFromCustomer: false,
            lastMessage: content.length > 100 ? content.substring(0, 100) + '...' : content,
            lastMessageTime: new Date()
        });

        try {
            // 🆕 Send with optimistic callbacks - message shows instantly
            await sendTextMessage(
                selectedConversation.id,
                content,
                companyId,
                currentReplyTo,
                handleOptimisticMessage,
                handleMessageSent,
                handleMessageError
            );

            // 🔧 OPTIMIZED: Don't reload messages if socket will handle it
            if (!isConnected) {
                loadMessages(selectedConversation.id);
            }

            // 🆕 If in unreplied tab, reload conversations to get fresh data
            if (activeTab === 'unreplied') {
                debouncedLoadConversations('unreplied');
            }
        } catch (error) {
            // Error already handled by handleMessageError
            console.error('فشل في إرسال الرسالة:', error);
        }
    }, [selectedConversation, companyId, sendTextMessage, loadMessages, replyToMessage, updateSelectedConversation, activeTab, isConnected, debouncedLoadConversations, handleOptimisticMessage, handleMessageSent, handleMessageError]);

    const handleSendFile = useCallback(async (file: File) => {
        if (!selectedConversation || !companyId) return;
        try {
            await sendFileMessage(selectedConversation.id, file, companyId);

            // 🆕 Update conversation state - message is now from us (not customer)
            updateSelectedConversation({
                lastMessageIsFromCustomer: false,
                lastMessage: `📎 ${file.name}`,
                lastMessageTime: new Date()
            });

            // 🔧 OPTIMIZED: Don't reload messages if socket will handle it
            if (!isConnected) {
                loadMessages(selectedConversation.id);
            }

            // 🆕 If in unreplied tab, reload conversations to get fresh data
            if (activeTab === 'unreplied') {
                debouncedLoadConversations('unreplied');
            }
        } catch (error) {
            alert('فشل في إرسال الملف');
        }
    }, [selectedConversation, companyId, sendFileMessage, loadMessages, updateSelectedConversation, activeTab, isConnected, debouncedLoadConversations]);

    // Handle text selection from gallery
    const handleSelectTextFromGallery = useCallback(async (text: { content: string; imageUrls?: string[] }) => {
        if (!selectedConversation || !companyId) return;

        setShowTextGallery(false);

        try {
            const messageContent = text.content?.trim() || '';
            const imageUrls = text.imageUrls || [];

            // If only text, send it normally
            if (messageContent && imageUrls.length === 0) {
                await sendTextMessage(selectedConversation.id, messageContent, companyId);
                updateSelectedConversation({
                    lastMessageIsFromCustomer: false,
                    lastMessage: messageContent,
                    lastMessageTime: new Date()
                });
                loadMessages(selectedConversation.id);
                return;
            }

            // Send text first if exists
            if (messageContent) {
                await sendTextMessage(selectedConversation.id, messageContent, companyId);
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Send images
            if (imageUrls.length > 0) {
                let successCount = 0;
                for (const imageUrl of imageUrls) {
                    try {
                        const urlParts = imageUrl.split('/');
                        const filename = urlParts[urlParts.length - 1] || 'image.jpg';

                        await apiClient.post(`/conversations/${selectedConversation.id}/send-existing-image`, {
                            imageUrl,
                            filename
                        });
                        successCount++;

                        if (successCount < imageUrls.length) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    } catch (error) {
                        console.error('Error sending image:', error);
                    }
                }
            }

            // Update state
            updateSelectedConversation({
                lastMessageIsFromCustomer: false,
                lastMessage: messageContent || '📷 صورة',
                lastMessageTime: new Date()
            });

            // 🔧 OPTIMIZED: Don't reload messages if socket will handle it
            if (!isConnected) {
                setTimeout(() => {
                    loadMessages(selectedConversation.id);
                }, 500);
            }

            // Reload conversations if in unreplied tab
            if (activeTab === 'unreplied') {
                debouncedLoadConversations('unreplied');
            }
        } catch (error) {
            console.error('Error sending from text gallery:', error);
            alert('فشل في إرسال النص');
        }
    }, [selectedConversation, companyId, sendTextMessage, loadMessages, updateSelectedConversation, activeTab, isConnected, debouncedLoadConversations]);

    // Handle single image selection from gallery
    const handleSelectImageFromGallery = useCallback(async (imageUrl: string, filename: string) => {
        if (!selectedConversation || !companyId) return;

        setShowImageGallery(false);

        try {
            await apiClient.post(`/conversations/${selectedConversation.id}/send-existing-image`, {
                imageUrl,
                filename
            });

            updateSelectedConversation({
                lastMessageIsFromCustomer: false,
                lastMessage: '📷 صورة',
                lastMessageTime: new Date()
            });

            if (!isConnected) {
                setTimeout(() => {
                    loadMessages(selectedConversation.id);
                }, 500);
            }

            if (activeTab === 'unreplied') {
                debouncedLoadConversations('unreplied');
            }
        } catch (error) {
            console.error('Error sending image from gallery:', error);
            alert('فشل في إرسال الصورة');
        }
    }, [selectedConversation, companyId, loadMessages, updateSelectedConversation, activeTab, isConnected, debouncedLoadConversations]);

    // Handle multiple images selection from gallery
    const handleSelectMultipleImagesFromGallery = useCallback(async (images: Array<{ url: string; filename: string }>) => {
        if (!selectedConversation || !companyId || images.length === 0) return;

        setShowImageGallery(false);

        try {
            let successCount = 0;
            for (const image of images) {
                try {
                    await apiClient.post(`/conversations/${selectedConversation.id}/send-existing-image`, {
                        imageUrl: image.url,
                        filename: image.filename
                    });
                    successCount++;

                    if (successCount < images.length) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error('Error sending image:', error);
                }
            }

            if (successCount > 0) {
                updateSelectedConversation({
                    lastMessageIsFromCustomer: false,
                    lastMessage: `📷 ${successCount} صورة`,
                    lastMessageTime: new Date()
                });

                if (!isConnected) {
                    setTimeout(() => {
                        loadMessages(selectedConversation.id);
                    }, 500);
                }

                if (activeTab === 'unreplied') {
                    debouncedLoadConversations('unreplied');
                }

                if (successCount < images.length) {
                    alert(`⚠️ تم إرسال ${successCount} صورة من ${images.length}`);
                }
            } else {
                alert('Failed to send images');
            }
        } catch (error) {
            console.error('Error sending images from gallery:', error);
            alert('فشل في إرسال الصور');
        }
    }, [selectedConversation, companyId, loadMessages, updateSelectedConversation, activeTab, isConnected, debouncedLoadConversations]);

    // Bulk Action Handlers
    const handleBulkMarkDone = useCallback(async () => {
        if (!companyId || selectedIds.size === 0) return;
        if (!window.confirm(`هل أنت متأكد من إنهاء ${selectedIds.size} محادثة؟`)) return;

        try {
            await bulkUpdate(Array.from(selectedIds), 'mark_done', null, companyId);
            debouncedLoadConversations(activeTab);
            clearSelection();
            alert('✅ تم إنهاء المحادثات بنجاح');
        } catch (error) {
            alert('فشل في تنفيذ العملية');
        }
    }, [selectedIds, companyId, bulkUpdate, activeTab, debouncedLoadConversations, clearSelection]);

    const handleBulkAssign = useCallback(() => {
        // TODO: Show assignment modal
        alert('سيتم إضافة نافذة اختيار الموظف قريباً');
    }, [selectedIds]);

    const handleBulkTags = useCallback(() => {
        // TODO: Show tags modal
        alert('سيتم إضافة نافذة اختيار التصنيفات قريباً');
    }, [selectedIds]);

    // Action handlers
    const handleStatusChange = useCallback(async (status: ConversationStatus) => {
        if (!selectedConversation || !companyId) return;
        try {
            await updateStatus(selectedConversation.id, status, companyId);
            debouncedLoadConversations(activeTab);
        } catch (error) {
            console.error('فشل في تحديث الحالة:', error);
        }
    }, [selectedConversation, companyId, updateStatus, activeTab, debouncedLoadConversations]);

    const handleAssignment = useCallback(async (userId: string | null) => {
        if (!selectedConversation || !companyId) return;
        try {
            await assignConversation(selectedConversation.id, userId, companyId);
            debouncedLoadConversations(activeTab);
        } catch (error) {
            console.error('فشل في تعيين المحادثة:', error);
        }
    }, [selectedConversation, companyId, assignConversation, activeTab, debouncedLoadConversations]);

    const handleMarkDone = useCallback(async () => {
        if (!selectedConversation || !companyId) return;
        try {
            await markAsDone(selectedConversation.id, companyId);
            debouncedLoadConversations(activeTab);
        } catch (error) {
            console.error('فشل في تحديث المحادثة:', error);
        }
    }, [selectedConversation, companyId, markAsDone, activeTab, debouncedLoadConversations]);

    const handleTogglePriority = useCallback(async () => {
        if (!selectedConversation || !companyId) return;
        try {
            await togglePriority(
                selectedConversation.id,
                !selectedConversation.priority,
                companyId
            );
            debouncedLoadConversations(activeTab);
        } catch (error) {
            console.error('فشل في تحديث الأولوية:', error);
        }
    }, [selectedConversation, companyId, togglePriority, activeTab, debouncedLoadConversations]);

    // Tags handler
    const handleTagsChange = useCallback(async (tags: string[]) => {
        if (!selectedConversation || !companyId) return;
        try {
            await addTags(selectedConversation.id, tags, companyId);
            debouncedLoadConversations(activeTab);
        } catch (error) {
            console.error('فشل في تحديث التصنيفات:', error);
        }
    }, [selectedConversation, companyId, addTags, activeTab, debouncedLoadConversations]);

    // Delete message handler
    const handleDeleteMessage = useCallback(async (messageId: string) => {
        if (!selectedConversation) return;
        if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;

        try {
            await deleteMessage(selectedConversation.id, messageId);
            loadMessages(selectedConversation.id); // Reload to reflect deletion
        } catch (error) {
            alert('فشل في حذف الرسالة');
        }
    }, [selectedConversation, deleteMessage, loadMessages]);

    // Forward message request handler
    const handleForwardRequest = useCallback((message: any) => {
        setMessageToForward(message);
        setForwardModalOpen(true);
    }, []);

    // Execute forward handler
    const handleForward = useCallback(async (targetConversationId: string) => {
        if (!messageToForward || !companyId) return;

        try {
            await forwardMessage(targetConversationId, messageToForward, companyId);
            alert('✅ تم إعادة توجيه الرسالة بنجاح');
            // Optional: Move to the target conversation
            // selectConversation(conversations.find(c => c.id === targetConversationId));
        } catch (error) {
            alert('فشل في إعادة توجيه الرسالة');
        }
    }, [messageToForward, companyId, forwardMessage]);

    // Star message handler
    const handleStarMessage = useCallback(async (messageId: string) => {
        if (!selectedConversation) return;
        try {
            await toggleMessageStar(selectedConversation.id, messageId);
            // Optimistic update or reload
            loadMessages(selectedConversation.id);
        } catch (error) {
            console.error('Failed to star message', error);
        }
    }, [selectedConversation, toggleMessageStar, loadMessages]);

    // Reaction handler
    const handleMessageReaction = useCallback(async (messageId: string, reaction: string) => {
        if (!selectedConversation) return;
        try {
            await toggleMessageReaction(selectedConversation.id, messageId, reaction);
            loadMessages(selectedConversation.id);
        } catch (error) {
            console.error('Failed to update reaction', error);
        }
    }, [selectedConversation, toggleMessageReaction, loadMessages]);

    // Reply handler
    const handleReplyToMessage = useCallback((message: any) => {
        setReplyToMessage(message);
        // Focus input? 
    }, []);

    const handleCancelReply = useCallback(() => {
        setReplyToMessage(null);
    }, []);

    // Snooze handler
    const handleSnoozeConfirm = useCallback(async (until: Date) => {
        if (!selectedConversation || !companyId) return;
        try {
            await snoozeConversation(selectedConversation.id, until, companyId);
            setSnoozeModalOpen(false);
            debouncedLoadConversations(activeTab);
            alert('✅ تم تأجيل المحادثة بنجاح');
        } catch (error) {
            alert('فشل في تأجيل المحادثة');
        }
    }, [selectedConversation, companyId, snoozeConversation, activeTab, debouncedLoadConversations]);

    // AI Toggle Handler
    const handleToggleAI = useCallback(async (enabled: boolean) => {
        if (!selectedConversation || !companyId) {
            return;
        }
        try {
            await toggleAI(selectedConversation.id, enabled);
            // Optimistic update or reload
            debouncedLoadConversations(activeTab); // Reload to get fresh state including metadata
        } catch (error: any) {
            alert('فشل في تحديث حالة الذكاء الاصطناعي');
        }
    }, [selectedConversation, companyId, toggleAI, activeTab, debouncedLoadConversations]);

    // AI Typing State
    const [isAITyping, setIsAITyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [suggestedText, setSuggestedText] = useState('');

    // 🆕 Sound & Notifications Functions (defined before Socket.IO useEffect)
    const playNotificationSound = useCallback(() => {
        if (!soundEnabled) return;
        socketService.playNotificationSound();
    }, [soundEnabled]);

    const showBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
        if (!notificationsEnabled) return;

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: icon || '/favicon.ico',
                tag: 'new-message',
                requireInteraction: false,
                silent: false
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, {
                        body,
                        icon: icon || '/favicon.ico',
                        tag: 'new-message'
                    });
                }
            });
        }
    }, [notificationsEnabled]);

    // Socket.IO
    // 🔧 FIX: Use ref to track activeTab for socket handler to avoid stale closure
    const activeTabRef = useRef<InboxTab>(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleNewMessage = (data: any) => {
            if (selectedConversation && data.conversationId === selectedConversation.id) {
                addMessage(data);
                // Stop typing indicator when message arrives
                setIsAITyping(false);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            }

            // 🆕 Play sound and show notification for customer messages
            if (data.isFromCustomer) {
                playNotificationSound();
                if (selectedConversation && data.conversationId === selectedConversation.id) {
                    // Don't show notification if conversation is already open
                } else {
                    showBrowserNotification(
                        `رسالة جديدة من ${data.customerName || 'عميل'}`,
                        data.content?.substring(0, 50) || 'رسالة جديدة'
                    );
                }
            }

            // 🔧 OPTIMIZED: Use debounced loadConversations to prevent excessive API calls
            debouncedLoadConversations(activeTabRef.current);
        };

        const handleAITyping = (data: { conversationId: string, isTyping: boolean }) => {
            if (selectedConversation && data.conversationId === selectedConversation.id) {
                setIsAITyping(data.isTyping);

                // Auto-hide after 15 seconds if no "stop" event received (safety net)
                if (data.isTyping) {
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsAITyping(false);
                    }, 15000);
                }
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('ai_typing', handleAITyping);

        // 🆕 Handle read receipts - update message status to 'read'
        const handleMessagesRead = (data: { conversationId: string; watermark: number }) => {
            if (selectedConversation?.id === data.conversationId) {
                // Update all messages sent before watermark to 'read' status
                markMessagesAsRead(data.watermark);
                console.log('👁️ [READ-RECEIPT] Messages marked as read up to:', new Date(data.watermark));
            }
        };

        socket.on('messages_read', handleMessagesRead);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('ai_typing', handleAITyping);
            socket.off('messages_read', handleMessagesRead);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (loadConversationsTimeoutRef.current) clearTimeout(loadConversationsTimeoutRef.current);
        };
    }, [socket, isConnected, selectedConversation, addMessage, debouncedLoadConversations, playNotificationSound, showBrowserNotification, markMessagesAsRead]);

    // Fetch post details when conversation is selected
    const fetchPostDetails = useCallback(async (conversationId: string) => {
        try {
            const response = await apiClient.get(`/conversations/${conversationId}/post-details`);

            if (response.data?.success && response.data?.data) {
                const postDetails = response.data.data;

                // Update selectedConversation with post details
                updateSelectedConversation({ postDetails });
            }
        } catch (error: any) {
            // Silently fail if 404 (post details not found) - it's optional
            if (error.response?.status !== 404) {
                console.error('Error fetching post details:', error);
            }
        }
    }, [updateSelectedConversation]);

    // Fetch post details when conversation with postId is selected
    useEffect(() => {
        if (selectedConversation?.postId && !selectedConversation?.postDetails) {
            fetchPostDetails(selectedConversation.id);
        }
    }, [selectedConversation?.id, selectedConversation?.postId, selectedConversation?.postDetails, fetchPostDetails]);

    // 🆕 Load messages for search when search query changes
    useEffect(() => {
        if (!debouncedSearchQuery || debouncedSearchQuery.trim() === '') {
            return;
        }

        const searchLower = debouncedSearchQuery.toLowerCase().trim();

        // Find conversations that match search in name or last message
        const matchingConversations = conversations.filter(conv => {
            const matchesName = conv.customerName.toLowerCase().includes(searchLower);
            const matchesMessage = conv.lastMessage.toLowerCase().includes(searchLower);
            return matchesName || matchesMessage;
        });

        // Load messages for matching conversations that don't have messages loaded yet
        matchingConversations.forEach(conv => {
            // Check if messages are already loaded
            if (!conversationMessages.has(conv.id)) {
                // Also check if it's the selected conversation with messages
                if (selectedConversation?.id === conv.id && messages.length > 0) {
                    // Store current messages (convert to InboxMessage format)
                    const inboxMessages: InboxMessage[] = messages.map(msg => ({
                        id: msg.id,
                        content: msg.content,
                        senderId: msg.senderId,
                        senderName: msg.senderName,
                        timestamp: msg.timestamp,
                        type: msg.type as InboxMessage['type'],
                        isFromCustomer: msg.isFromCustomer,
                        status: msg.status as InboxMessage['status'],
                        conversationId: msg.conversationId,
                        fileUrl: msg.fileUrl,
                        fileName: msg.fileName,
                        fileSize: msg.fileSize,
                        isAiGenerated: msg.isAiGenerated,
                        metadata: msg.metadata,
                        attachments: msg.attachments
                    }));
                    setConversationMessages(prev => {
                        const newMap = new Map(prev);
                        newMap.set(conv.id, inboxMessages);
                        return newMap;
                    });
                } else {
                    // Load messages for this conversation
                    loadAllMessagesForConversation(conv.id);
                }
            }
        });
    }, [debouncedSearchQuery, conversations, conversationMessages, selectedConversation, messages, loadAllMessagesForConversation]);

    // 🆕 Block Customer Functions
    const checkBlockStatus = useCallback(async () => {
        if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
            setIsBlocked(false);
            return;
        }

        try {
            setCheckingBlockStatus(true);
            const status = await apiService.checkCustomerBlockStatus(
                selectedConversation.customerId,
                selectedConversation.pageId
            );
            setIsBlocked(status.isBlocked);
        } catch (error) {
            console.error('Error checking block status:', error);
            setIsBlocked(false);
        } finally {
            setCheckingBlockStatus(false);
        }
    }, [selectedConversation?.pageId, selectedConversation?.customerId]);

    const handleBlockCustomer = useCallback(async () => {
        if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
            alert('معرف الصفحة أو العميل غير متوفر');
            return;
        }

        try {
            setBlocking(true);
            await apiService.blockCustomerOnPage(
                selectedConversation.customerId,
                selectedConversation.pageId,
                blockReason || undefined
            );
            setIsBlocked(true);
            setShowBlockModal(false);
            setBlockReason('');
            alert('تم حظر العميل على الصفحة بنجاح');
        } catch (error: any) {
            alert(error.message || 'فشل حظر العميل');
        } finally {
            setBlocking(false);
        }
    }, [selectedConversation?.pageId, selectedConversation?.customerId, blockReason]);

    const handleUnblockCustomer = useCallback(async () => {
        if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
            alert('معرف الصفحة أو العميل غير متوفر');
            return;
        }

        if (!window.confirm('هل أنت متأكد من إلغاء حظر هذا العميل على الصفحة؟')) {
            return;
        }

        try {
            setBlocking(true);
            await apiService.unblockCustomerOnPage(
                selectedConversation.customerId,
                selectedConversation.pageId
            );
            setIsBlocked(false);
            alert('تم إلغاء حظر العميل بنجاح');
        } catch (error: any) {
            alert(error.message || 'فشل إلغاء حظر العميل');
        } finally {
            setBlocking(false);
        }
    }, [selectedConversation?.pageId, selectedConversation?.customerId]);

    // Check block status when conversation changes
    useEffect(() => {
        if (selectedConversation?.pageId && selectedConversation?.customerId) {
            checkBlockStatus();
        } else {
            setIsBlocked(false);
        }
    }, [selectedConversation?.id, selectedConversation?.pageId, selectedConversation?.customerId, checkBlockStatus]);

    // Calculate which customer messages have been replied to - OPTIMIZED VERSION
    const repliedMessages = useMemo((): Set<string> => {
        const repliedSet = new Set<string>();
        if (messages.length === 0) return repliedSet;

        // 🔧 OPTIMIZED: Single pass algorithm - more efficient than nested loops
        // Sort messages by timestamp once
        const sortedMessages = [...messages].sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
        });

        // Track the last reply timestamp
        let lastReplyTime = 0;

        // Single pass: iterate backwards to mark all customer messages before a reply
        for (let i = sortedMessages.length - 1; i >= 0; i--) {
            const msg = sortedMessages[i];
            if (!msg) continue; // Safety check

            const msgTime = new Date(msg.timestamp).getTime();

            if (!msg.isFromCustomer) {
                // Found a reply - update last reply time
                lastReplyTime = Math.max(lastReplyTime, msgTime);
            } else if (lastReplyTime > 0 && msgTime < lastReplyTime) {
                // This customer message is before the last reply, so it's been replied to
                repliedSet.add(msg.id);
            }
        }

        return repliedSet;
    }, [messages]);

    // إزالة padding و overflow من parent main element في Layout
    useEffect(() => {
        const mainElement = document.querySelector('main');
        if (mainElement) {
            // حفظ الـ classes الأصلية
            const originalClasses = mainElement.className;
            // إزالة padding و overflow وإضافة overflow-hidden و h-full
            mainElement.classList.remove('p-6', 'overflow-y-auto');
            mainElement.classList.add('p-0', 'overflow-hidden', 'flex-1', 'h-full');

            return () => {
                // استعادة الـ classes الأصلية عند إغلاق الصفحة
                mainElement.className = originalClasses;
            };
        }
        return undefined;
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden w-full">
            <InboxTabs
                activeTab={activeTab}
                onTabChange={(newTab) => {
                    setActiveTab(newTab);
                }}
                counts={tabCounts}
                onSearch={setSearchQuery}
                onToggleFilters={() => setShowFilters(!showFilters)}
                onShowStats={() => setShowStats(true)}
            />

            <StatsDashboard
                isOpen={showStats}
                onClose={() => setShowStats(false)}
                conversations={conversations}
            />

            <ForwardModal
                isOpen={forwardModalOpen}
                onClose={() => setForwardModalOpen(false)}
                onForward={handleForward}
                conversations={conversations}
            />

            <SnoozeModal
                isOpen={snoozeModalOpen}
                onClose={() => setSnoozeModalOpen(false)}
                onSnooze={handleSnoozeConfirm}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Notes Panel Overlay */}
                {selectedConversation && (
                    <NotesPanel
                        customerId={selectedConversation.customerId}
                        isOpen={showNotes}
                        onClose={() => setShowNotes(false)}
                    />
                )}

                {/* Mobile Sidebar Overlay */}
                {showSidebar && (
                    <div
                        className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
                        onClick={() => setShowSidebar(false)}
                    />
                )}

                {/* Left: Conversations */}
                <div className={`
                    ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0
                    fixed md:relative
                    inset-y-0 left-0
                    w-full sm:w-80 md:w-72 lg:w-80
                    z-30
                    border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col
                    transition-transform duration-300 ease-in-out
                `}>
                    {/* Bulk Actions Bar Overlay */}
                    <BulkActionsBar
                        selectedCount={selectedIds.size}
                        onClearSelection={clearSelection}
                        onMarkAsDone={handleBulkMarkDone}
                        onAssign={handleBulkAssign}
                        onAddTags={handleBulkTags}
                    />

                    <FilterPanel
                        isOpen={showFilters}
                        filters={filters}
                        onFilterChange={setFilters}
                        onClose={() => setShowFilters(false)}
                        onReset={() => setFilters({
                            unreadOnly: false,
                            assignedTo: 'all',
                            startDate: null,
                            endDate: null
                        })}
                    />

                    <div
                        className="flex-1 overflow-y-auto"
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            const { scrollTop, scrollHeight, clientHeight } = target;
                            // Load more when near bottom (within 200px)
                            if (scrollHeight - scrollTop - clientHeight < 200 && hasMoreConversations && !loading) {
                                loadMoreConversations();
                            }
                        }}
                    >
                        {loading && conversations.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                            </div>
                        ) : error ? (
                            <div className="text-center p-8 text-red-500 dark:text-red-400">{error}</div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="text-center p-8">
                                <div className="text-6xl mb-4">💬</div>
                                <p className="text-gray-600 dark:text-gray-400">لا توجد محادثات</p>
                            </div>
                        ) : (
                            <div>
                                {/* Deduplicate conversations by ID to prevent duplicate key warnings */}
                                {Array.from(
                                    new Map(filteredConversations.map(conv => [conv.id, conv])).values()
                                ).map((conv) => (
                                    <ConversationItem
                                        key={conv.id}
                                        conversation={conv}
                                        isSelected={selectedConversation?.id === conv.id}
                                        isMultiSelected={selectedIds.has(conv.id)}
                                        onToggleSelection={(e) => {
                                            e.stopPropagation();
                                            toggleSelection(conv.id);
                                        }}
                                        onClick={() => selectConversation(conv)}
                                    />
                                ))}
                                {/* Loading more conversations indicator */}
                                {loading && conversations.length > 0 && (
                                    <div className="flex justify-center p-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 dark:border-gray-500"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Chat */}
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 relative">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header - simplified, Status & Assignment moved to sidebar */}
                            <div className="border-b border-gray-200 dark:border-gray-700 p-2 sm:p-3">
                                <div className="flex items-center justify-between">
                                    {/* زر الرجوع للموبايل */}
                                    <button
                                        onClick={() => {
                                            setShowSidebar(true);
                                            selectConversation(null);
                                        }}
                                        className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="رجوع للمحادثات"
                                    >
                                        <ArrowRight size={20} className="text-gray-600 dark:text-gray-400" />
                                    </button>

                                    <div className="flex items-center gap-3">
                                        {selectedConversation.customerAvatar ? (
                                            <img
                                                src={selectedConversation.customerAvatar}
                                                alt={selectedConversation.customerName}
                                                className="w-10 h-10 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center text-white font-bold">
                                                {selectedConversation.customerName.charAt(0)}
                                            </div>
                                        )}

                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {selectedConversation.customerName}
                                            </h2>
                                            {selectedConversation.pageName && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedConversation.pageName}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* 🆕 Copy Conversation Link Button */}
                                        <button
                                            onClick={() => {
                                                const conversationLink = `${window.location.origin}/facebook-inbox?conversation=${selectedConversation.id}`;
                                                navigator.clipboard.writeText(conversationLink).then(() => {
                                                    setCopiedLink(true);
                                                    setTimeout(() => setCopiedLink(false), 2000);
                                                }).catch((err) => {
                                                    console.error('Failed to copy link:', err);
                                                    alert(`${t('inbox.conversationLink')}:\n${conversationLink}`);
                                                });
                                            }}
                                            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${copiedLink
                                                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                                                : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                }`}
                                            title={copiedLink ? t('inbox.linkCopied') : t('inbox.copyLink')}
                                        >
                                            {copiedLink ? (
                                                <>
                                                    <Check size={16} />
                                                    <span>{t('inbox.done')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={16} />
                                                    <span>{t('inbox.conversationLink')}</span>
                                                </>
                                            )}
                                        </button>

                                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                        {/* AI Toggle */}
                                        <AIToggle
                                            enabled={selectedConversation.aiEnabled !== false} // Default to true if undefined
                                            onToggle={handleToggleAI}
                                            loading={updating}
                                        />

                                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                        <button
                                            onClick={() => setShowNotes(!showNotes)}
                                            className={`p-2 rounded-full transition-colors ${showNotes ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                            title={t('inbox.notes')}
                                        >
                                            <StickyNote size={20} />
                                        </button>
                                        <ConversationActionsBar
                                            isPriority={selectedConversation.priority}
                                            onTogglePriority={handleTogglePriority}
                                            onMarkDone={handleMarkDone}
                                            onSnooze={() => setSnoozeModalOpen(true)}
                                            disabled={updating}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Messages Container - scrollable area, messages directly above input */}
                            <div
                                className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 pb-4"
                                ref={messagesContainerRef}
                                onScroll={handleScroll}
                            >
                                {loadingMessages && !hasMore ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                    </div>
                                ) : messages.length === 0 && !loadingMessages ? (
                                    <div className="flex items-center justify-center h-full py-10">
                                        <p className="text-gray-500 dark:text-gray-400">{t('inbox.noMessages')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Loading more indicator at top when loading older messages */}
                                        {loadingMessages && hasMore && (
                                            <div className="flex justify-center p-2">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 dark:border-gray-500"></div>
                                            </div>
                                        )}

                                        {/* Messages in normal order (oldest first, newest last) */}
                                        {Array.from(
                                            new Map(messages.map(msg => [msg.id, msg])).values()
                                        ).map((msg) => {
                                            // hasBeenReplied: true if replied, false if not replied, undefined if not a customer message
                                            const hasBeenReplied = msg.isFromCustomer
                                                ? repliedMessages.has(msg.id)
                                                : undefined;
                                            return (
                                                <MessageBubble
                                                    key={msg.id}
                                                    message={msg}
                                                    {...(hasBeenReplied !== undefined && { hasBeenReplied })}
                                                    onDelete={handleDeleteMessage}
                                                    onForward={handleForwardRequest}
                                                    onStar={handleStarMessage}
                                                    onReaction={handleMessageReaction}
                                                    onReply={handleReplyToMessage}
                                                    currentUserId={user?.id || ''}
                                                />
                                            );
                                        })}

                                        {/* AI Typing Indicator at bottom */}
                                        {isAITyping && (
                                            <div className="mt-2">
                                                <TypingIndicator />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Sticky bottom section - AI Suggestions + Saved Texts + Message Input */}
                            <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 shadow-lg mt-auto">
                                {/* AI Suggestions + Saved Texts Button */}
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                                    <AISuggestions
                                        conversationId={selectedConversation.id}
                                        onSelectSuggestion={(text) => {
                                            setSuggestedText(text);
                                        }}
                                    />

                                    {/* Saved Texts Button */}
                                    <button
                                        onClick={() => setShowTextGallery(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg transition-colors border border-green-200 dark:border-green-700"
                                        title="حافظة النصوص المحفوظة"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-sm font-medium hidden sm:inline">الردود المحفوظة</span>
                                    </button>

                                    {/* Saved Images Button */}
                                    <button
                                        onClick={() => setShowImageGallery(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
                                        title="حافظة الصور المحفوظة"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm font-medium hidden sm:inline">الصور المحفوظة</span>
                                    </button>

                                    {/* 🆕 Quick Order Button */}
                                    <button
                                        onClick={() => setShowQuickOrderModal(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg transition-colors border border-orange-200 dark:border-orange-700"
                                        title="إنشاء طلب سريع"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="text-sm font-medium hidden sm:inline">إنشاء طلب</span>
                                    </button>
                                </div>

                                <MessageInput
                                    onSendMessage={handleSendMessage}
                                    onSendFile={handleSendFile}
                                    sending={sending}
                                    uploadingFile={uploadingFile}
                                    conversation={selectedConversation}
                                    user={user}
                                    replyTo={replyToMessage}
                                    onCancelReply={handleCancelReply}
                                    initialText={suggestedText}
                                    onTextCleared={() => setSuggestedText('')}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                {/* زر فتح القائمة على الموبايل */}
                                <button
                                    onClick={() => setShowSidebar(true)}
                                    className="md:hidden mb-4 p-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                                    title="عرض المحادثات"
                                >
                                    <Menu size={24} />
                                </button>
                                <div className="text-6xl mb-4">💬</div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">اختر محادثة</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">اختر محادثة من القائمة</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Customer Profile */}
                <div className="hidden xl:block h-full flex flex-col">
                    {selectedConversation ? (
                        <CustomerProfile
                            conversation={selectedConversation}
                            onTagsChange={handleTagsChange}
                            updatingTags={updatingTags}
                            currentStatus={selectedConversation.status}
                            onStatusChange={(status) => handleStatusChange(status as ConversationStatus)}
                            currentAssignee={selectedConversation.assignedTo}
                            currentAssigneeName={selectedConversation.assignedToName ?? null}
                            onAssign={handleAssignment}
                            disabled={updating}
                            // 🆕 Copy Conversation Link
                            onCopyConversationLink={(conversationId) => {
                                // Build conversation link
                                const conversationLink = `${window.location.origin}/facebook-inbox?conversation=${conversationId}`;

                                // Copy to clipboard
                                navigator.clipboard.writeText(conversationLink).then(() => {
                                    console.log('✅ Conversation link copied:', conversationLink);
                                }).catch((err) => {
                                    console.error('❌ Failed to copy link:', err);
                                    // Fallback: show link in alert
                                    alert(`رابط المحادثة:\n${conversationLink}`);
                                });
                            }}
                            // 🆕 Block Customer Props
                            isBlocked={isBlocked}
                            checkingBlockStatus={checkingBlockStatus}
                            blocking={blocking}
                            showBlockModal={showBlockModal}
                            blockReason={blockReason}
                            onBlockClick={() => setShowBlockModal(true)}
                            onUnblockClick={handleUnblockCustomer}
                            onBlockReasonChange={setBlockReason}
                            onBlockConfirm={handleBlockCustomer}
                            onBlockCancel={() => {
                                setShowBlockModal(false);
                                setBlockReason('');
                            }}
                            // 🆕 Sound & Notifications Props
                            soundEnabled={soundEnabled}
                            notificationsEnabled={notificationsEnabled}
                            onSoundToggle={() => setSoundEnabled(!soundEnabled)}
                            onNotificationsToggle={() => setNotificationsEnabled(!notificationsEnabled)}
                            // 🆕 Quick Order
                            onCreateOrder={() => setShowQuickOrderModal(true)}
                        />
                    ) : (
                        <div className="w-80 h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <p className="text-sm">لا يوجد محادثة محددة</p>
                        </div>
                    )}
                </div>
            </div>

            {!isConnected && (
                <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-lg shadow-lg">
                    ⚠️ غير متصل
                </div>
            )}

            {/* Text Gallery Modal */}
            <TextGalleryModal
                isOpen={showTextGallery}
                onClose={() => setShowTextGallery(false)}
                onSelectText={handleSelectTextFromGallery}
            />

            {/* Image Gallery Modal */}
            <ImageGalleryModal
                isOpen={showImageGallery}
                onClose={() => setShowImageGallery(false)}
                onSelectImage={handleSelectImageFromGallery}
                onSelectMultipleImages={handleSelectMultipleImagesFromGallery}
            />

            {/* 🆕 Block Customer Modal */}
            {showBlockModal && selectedConversation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">حظر العميل على صفحة الفيس بوك</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            سيتم حظر هذا العميل على صفحة الفيس بوك المحددة ولن يتم استقبال رسائله.
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                سبب الحظر (اختياري)
                            </label>
                            <textarea
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                rows={3}
                                placeholder="أدخل سبب الحظر..."
                            />
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setShowBlockModal(false);
                                    setBlockReason('');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleBlockCustomer}
                                disabled={blocking}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {blocking ? 'جاري الحظر...' : 'تأكيد الحظر'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🆕 Blocked Customer Alert */}
            {isBlocked && selectedConversation && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
                    <div className="flex items-center space-x-2">
                        <NoSymbolIcon className="w-6 h-6 text-red-600" />
                        <p className="text-sm text-red-700">
                            ⚠️ هذا العميل محظور على صفحة الفيس بوك - لن يتم استقبال رسائله
                        </p>
                    </div>
                </div>
            )}

            {/* 🆕 Quick Order Modal */}
            {selectedConversation && (
                <QuickOrderModal
                    isOpen={showQuickOrderModal}
                    onClose={() => setShowQuickOrderModal(false)}
                    conversation={selectedConversation}
                    customerName={selectedConversation.customerName}
                    onOrderCreated={(orderId) => {
                        console.log('✅ Order created:', orderId);
                        // يمكن إضافة رسالة تلقائية للعميل هنا
                    }}
                />
            )}
        </div>
    );
};

export default FacebookInbox;
