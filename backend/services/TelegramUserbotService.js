let TelegramClient, Api, StringSession;
try {
    const telegramModule = require("telegram");
    TelegramClient = telegramModule.TelegramClient;
    Api = telegramModule.Api;

    const sessionsModule = require("telegram/sessions");
    StringSession = sessionsModule.StringSession;

    // Validate imports
    if (!TelegramClient || typeof TelegramClient !== 'function') {
        console.error("❌ [TELEGRAM] TelegramClient is not a function:", typeof TelegramClient);
        throw new Error("TelegramClient is not properly imported");
    }
    if (!StringSession || typeof StringSession !== 'function') {
        console.error("❌ [TELEGRAM] StringSession is not a function:", typeof StringSession);
        throw new Error("StringSession is not properly imported");
    }
    console.log("✅ [TELEGRAM] TelegramClient and StringSession imported successfully");
} catch (importError) {
    console.error("❌ [TELEGRAM] Failed to import telegram modules:", importError);
    throw importError;
}

const { getSharedPrismaClient } = require('./sharedDatabase');
const input = require("input"); // For console input if ever needed
const fs = require('fs');
const path = require('path');
const os = require('os');

class TelegramUserbotService {
    constructor() {
        this.clients = new Map(); // userbotConfigId -> TelegramClient
        this.prisma = getSharedPrismaClient();
    }

    // --- Private Helpers ---

    /**
     * Retrieves a stored session string from the database.
     */
    async _getSession(userbotConfigId) {
        try {
            const config = await this.prisma.telegramConfig.findFirst({
                where: {
                    id: userbotConfigId,
                    type: 'USERBOT'
                }
            });

            if (!config) {
                console.warn(`⚠️ [_getSession] Config not found for userbotConfigId: ${userbotConfigId}`);
                return "";
            }

            // Use sessionString if available, otherwise fallback to clientSession (for backward compatibility)
            const session = config.sessionString || config.clientSession || "";
            return session;
        } catch (error) {
            console.error(`❌ [_getSession] Error getting session:`, error);
            return "";
        }
    }

    /**
     * Retrieves the userbot configuration.
     */
    async _getUserbotConfig(userbotConfigId, companyId) {
        const config = await this.prisma.telegramConfig.findFirst({
            where: {
                id: userbotConfigId,
                companyId,
                type: 'USERBOT'
            }
        });
        return config;
    }

    /**
     * Centralized method to get or create a Telegram Client.
     * Handles memory caching, validation, and restoring from session.
     */
    async _getClient(userbotConfigId, companyId) {
        // 1. Check Memory
        let clientData = this.clients.get(userbotConfigId);
        let client = null;

        // Extract client from stored data (it might be an object wrap or direct client)
        if (clientData) {
            if (typeof clientData === 'object' && clientData.client) {
                client = clientData.client;
            } else {
                client = clientData;
            }
        }

        // 2. Validate In-Memory Client
        let isClientValid = false;
        try {
            if (client) {
                if (client instanceof TelegramClient) {
                    isClientValid = true;
                } else if (typeof client === 'object' && client.constructor && client.constructor.name === 'TelegramClient') {
                    isClientValid = true;
                }
            }
        } catch (e) {
            console.warn("⚠️ [_getClient] Client validation warning:", e.message);
            isClientValid = false;
        }

        if (isClientValid && client.connected) {
            // Optional: Check connection status if possible, but usually existence implies we tried to connect
            return client;
        }

        // 3. Restore from Session if memory failed
        console.log(`🔄 [_getClient] Restoring client for ${userbotConfigId}...`);

        const config = await this._getUserbotConfig(userbotConfigId, companyId);
        if (!config || !config.apiId || !config.apiHash) {
            console.error(`❌ [_getClient] Missing config or API credentials for ${userbotConfigId}`);
            throw new Error("Userbot configuration not found or missing API credentials");
        }

        const sessionString = await this._getSession(userbotConfigId);
        if (!sessionString || sessionString.trim() === '') {
            console.error(`❌ [_getClient] No session string found for ${userbotConfigId}`);
            throw new Error("Not logged in (No session found)");
        }

        try {
            console.log(`🔧 [_getClient] Creating new TelegramClient instance...`);
            client = new TelegramClient(new StringSession(sessionString), parseInt(config.apiId), config.apiHash, {
                connectionRetries: 5,
            });
            console.log(`🔌 [_getClient] Connecting...`);
            await client.connect();

            // Save updated session string if detailed (DC/Auth Key) changed to prevent invalidation
            const newSessionString = client.session.save();
            if (newSessionString !== sessionString) {
                console.log(`💾 [_getClient] Session string updated/migrated. Saving to DB for ${userbotConfigId}...`);
                await this.prisma.telegramConfig.update({
                    where: { id: userbotConfigId },
                    data: { sessionString: newSessionString, isActive: true }
                });
            }

            // Update memory
            this.clients.set(userbotConfigId, client);
            console.log(`✅ [_getClient] Client restored and connected.`);
            return client;
        } catch (error) {
            console.error(`❌ [_getClient] Failed to restore client:`, error);
            throw error;
        }
    }

    /**
     * Centralized error handler for Telegram API errors.
     * Specifically handles session expiration (AUTH_KEY_UNREGISTERED).
     */
    async _handleAuthError(error, userbotConfigId, companyId) {
        const errorMessage = error.message || '';
        const errorString = error.toString() || '';
        const isAuthError = errorMessage.includes('AUTH_KEY_UNREGISTERED') ||
            errorString.includes('AUTH_KEY_UNREGISTERED') ||
            errorMessage.includes('401') ||
            error.code === 401;

        if (isAuthError) {
            console.warn(`⚠️ [_handleAuthError] Session expired for ${userbotConfigId}. Clearing data.`);
            try {
                // Clear DB
                await this.prisma.telegramConfig.updateMany({
                    where: {
                        id: userbotConfigId,
                        companyId: companyId,
                        type: 'USERBOT'
                    },
                    data: {
                        sessionString: null,
                        clientSession: null,
                        clientPhone: null,
                        isActive: false
                    }
                });

                // Clear Memory
                this.clients.delete(userbotConfigId);
            } catch (clearError) {
                console.error(`❌ [_handleAuthError] Failed to clear session:`, clearError);
            }

            return {
                success: false,
                error: "AUTH_KEY_UNREGISTERED",
                message: "Session expired. Please login again.",
                requiresReauth: true
            };
        }

        // Return original error if not auth-related
        return { success: false, error: error.message || "Unknown error occurred" };
    }

    // --- Public Info Methods ---

    // For backward compatibility if needed, but _getSession is preferred internally
    async getSession(userbotConfigId) {
        return this._getSession(userbotConfigId);
    }

    async getUserbotConfig(userbotConfigId, companyId) {
        return this._getUserbotConfig(userbotConfigId, companyId);
    }

    // --- Auth Step 1: Send Code ---
    async sendCode(userbotConfigId, companyId, phoneNumber) {
        console.log(`🔍 [SEND-CODE] Starting for ${userbotConfigId}, phone: ${phoneNumber}`);
        try {
            const config = await this._getUserbotConfig(userbotConfigId, companyId);
            if (!config || !config.apiId || !config.apiHash) {
                return { success: false, error: "API credentials not configured." };
            }

            const session = new StringSession("");
            const client = new TelegramClient(session, parseInt(config.apiId), config.apiHash, {
                connectionRetries: 5,
            });

            await client.connect();

            // Store temporarily for verify step
            const tempData = { client, phoneNumber, phoneCodeHash: null, companyId };
            this.clients.set(userbotConfigId, tempData);

            const apiCredentials = {
                apiId: parseInt(config.apiId),
                apiHash: config.apiHash
            };

            const result = await client.sendCode(apiCredentials, phoneNumber);

            // Update stored data with hash
            tempData.phoneCodeHash = result.phoneCodeHash;
            this.clients.set(userbotConfigId, tempData);

            return { success: true, message: "Code sent successfully" };

        } catch (error) {
            console.error("❌ [SEND-CODE] Error:", error);
            // This is pre-login, so we don't need _handleAuthError usually, but good to be safe
            // However, usually sendCode fails due to config/network, not auth key
            return { success: false, error: error.message || "Failed to send code" };
        }
    }

    // --- Auth Step 2: Sign In ---
    async signIn(userbotConfigId, companyId, code, password) {
        const temp = this.clients.get(userbotConfigId);
        if (!temp || (typeof temp !== 'object') || !temp.client) {
            return { success: false, error: "Session expired or not found. Try sending code again." };
        }

        try {
            const { client, phoneNumber, phoneCodeHash } = temp;

            let authResult;
            try {
                authResult = await client.invoke(
                    new Api.auth.SignIn({
                        phoneNumber,
                        phoneCodeHash,
                        phoneCode: code,
                    })
                );
            } catch (error) {
                if (error.errorMessage === 'SESSION_PASSWORD_NEEDED' || error.message?.includes('password')) {
                    if (!password) {
                        return {
                            success: false,
                            error: "Two-factor authentication is enabled. Password is required.",
                            requiresPassword: true
                        };
                    }

                    const passwordHash = await client.invoke(new Api.account.GetPassword());
                    const { computeCheck } = require('telegram/Password');
                    const passwordCheck = await computeCheck(passwordHash, password);

                    authResult = await client.invoke(
                        new Api.auth.CheckPassword({ password: passwordCheck })
                    );
                } else {
                    throw error;
                }
            }

            const sessionString = client.session.save();

            // Save to DB
            await this.prisma.telegramConfig.update({
                where: { id: userbotConfigId },
                data: { sessionString, isActive: true, clientPhone: phoneNumber }
            });

            // Store actual client instance (clean up temp object)
            this.clients.set(userbotConfigId, client);

            return { success: true, message: "Logged in successfully" };

        } catch (error) {
            console.error("❌ [SIGN-IN] Error:", error);
            return { success: false, error: error.message };
        }
    }

    // --- Main Features ---

    async getDialogs(userbotConfigId, companyId) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const dialogs = await client.getDialogs({ limit: 50 });

            const formatted = dialogs.map(d => {
                try {
                    const chatId = d.entity?.id?.toString() || d.id?.toString() || 'unknown';
                    const title = d.title || d.name || d.entity?.title || d.entity?.firstName || 'Unknown';

                    return {
                        id: chatId,
                        name: title,
                        unreadCount: d.unreadCount || 0,
                        lastMessage: d.message?.message || d.message?.text || "",
                        date: d.date || new Date(),
                        isGroup: d.isGroup || false,
                        isUser: d.isUser || false,
                        isChannel: d.isChannel || false
                    };
                } catch (e) {
                    return { id: 'error', name: 'Error', unreadCount: 0, lastMessage: '', date: new Date() };
                }
            });

            return { success: true, data: formatted };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async sendMessage(userbotConfigId, companyId, chatId, message) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            // Resolve entity (works for IDs or Usernames)
            const entity = await client.getEntity(chatId);
            await client.sendMessage(entity, { message });

            return { success: true };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async getMessages(userbotConfigId, companyId, chatId, limit = 50) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            let entity;
            try {
                const numericChatId = typeof chatId === 'string' ? BigInt(chatId) : chatId;
                entity = await client.getEntity(numericChatId);
            } catch (e) {
                entity = await client.getEntity(chatId);
            }

            // Fetch messages (fallback to GetHistory if getMessages helper fails)
            let messages;
            try {
                messages = await client.getMessages(entity, { limit: parseInt(limit) || 50 });
            } catch (e) {
                const result = await client.invoke(
                    new Api.messages.GetHistory({
                        peer: entity,
                        limit: parseInt(limit) || 50,
                        offsetId: 0,
                        offsetDate: 0,
                        addOffset: 0,
                        maxId: 0,
                        minId: 0,
                        hash: BigInt(0)
                    })
                );
                messages = result.messages || [];
            }

            const formattedMessages = await Promise.all(messages.map(async (msg) => {
                try {
                    let senderName = 'System';
                    let senderId = 'system';

                    if (msg.out) {
                        senderName = 'You';
                        senderId = 'me';
                    } else if (msg.fromId) {
                        try {
                            const senderEntity = await client.getEntity(msg.fromId);
                            senderName = senderEntity.firstName || senderEntity.title || senderEntity.username || 'Unknown';
                            if (senderEntity.lastName) senderName += ' ' + senderEntity.lastName;
                            senderId = msg.fromId?.value?.toString() || msg.fromId?.toString() || 'unknown';
                        } catch (e) {
                            senderName = 'Unknown';
                            senderId = msg.fromId?.toString();
                        }
                    }

                    return {
                        id: msg.id?.toString() || String(msg.id),
                        text: msg.message || msg.text || '',
                        date: msg.date ? (msg.date instanceof Date ? Math.floor(msg.date.getTime() / 1000) : msg.date) : 0,
                        fromId: senderId,
                        senderName,
                        isOut: msg.out || false,
                        media: msg.media ? { type: msg.media.className || 'unknown' } : null
                    };
                } catch (e) {
                    return { id: 'error', text: 'Error formatting' };
                }
            }));

            // Sort by date ascending
            formattedMessages.sort((a, b) => a.date - b.date);

            return { success: true, data: formattedMessages };

        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async sendFile(userbotConfigId, companyId, chatId, fileBuffer, fileName, caption) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            const tempPath = path.join(os.tmpdir(), fileName || `upload_${Date.now()}.dat`);
            try {
                fs.writeFileSync(tempPath, fileBuffer);

                const entity = await client.getEntity(chatId);
                await client.sendMessage(entity, {
                    message: caption || "",
                    file: tempPath
                });

                fs.unlinkSync(tempPath);
                return { success: true };
            } catch (fileError) {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                throw fileError;
            }
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async downloadMedia(userbotConfigId, companyId, chatId, messageId) {
        console.log(`[Media] Downloading media for ${chatId}, Msg ${messageId}`);
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            // Resolve entity - try cache first, then populate cache if needed
            let entity;
            const numericChatId = typeof chatId === 'string' ? BigInt(chatId) : chatId;

            try {
                entity = await client.getEntity(numericChatId);
            } catch (e) {
                console.log(`[Media] Entity ${chatId} not found in cache. Fetching dialogs...`);
                // If not found (e.g. after server restart), fetch dialogs to populate cache
                await client.getDialogs({ limit: 100 });
                try {
                    entity = await client.getEntity(numericChatId);
                } catch (e2) {
                    console.error('[Media] Failed to resolve entity:', e2);
                    // Last resort: try looking by string if it wasn't a number
                    try {
                        entity = await client.getEntity(chatId);
                    } catch (e3) {
                        return { success: false, error: "Chat Entity not found. Please refresh chats." };
                    }
                }
            }

            // Get the message
            // Note: messageId from frontend might be string, ensure int
            const ids = [parseInt(messageId)];
            const messages = await client.getMessages(entity, { ids: ids });

            if (!messages || messages.length === 0 || !messages[0]) {
                console.warn(`[Media] Message ${messageId} not found in chat ${chatId}`);
                return { success: false, error: "Message not found" };
            }

            const message = messages[0];
            if (!message.media) {
                console.warn(`[Media] Message ${messageId} has no media`);
                return { success: false, error: "Message has no media" };
            }

            // Download media (returns Buffer)
            console.log(`[Media] Found message, downloading...`);
            const buffer = await client.downloadMedia(message);

            if (!buffer) {
                console.error(`[Media] Download failed (empty buffer)`);
                return { success: false, error: "Download returned empty" };
            }

            // Try to determine mime type
            let mimeType = 'application/octet-stream';
            if (message.media) {
                if (message.media.document) {
                    mimeType = message.media.document.mimeType;
                } else if (message.media.photo) {
                    mimeType = 'image/jpeg';
                }
            }

            console.log(`[Media] Download success, size: ${buffer.length}, type: ${mimeType}`);
            return { success: true, buffer, mimeType };

        } catch (error) {
            console.error('[Media] Error in downloadMedia:', error);
            // Check for specific auth error or generic
            if (error.message && error.message.includes('AUTH_KEY')) {
                return this._handleAuthError(error, userbotConfigId, companyId);
            }
            return { success: false, error: error.message };
        }
    }

    async logout(userbotConfigId, companyId) {
        const clientData = this.clients.get(userbotConfigId);
        let client = null;

        if (clientData) {
            if (typeof clientData === 'object' && clientData.client) {
                client = clientData.client;
            } else {
                client = clientData;
            }
        }

        if (client && client.connected) {
            try { await client.disconnect(); } catch (e) { }
        }

        this.clients.delete(userbotConfigId);

        await this.prisma.telegramConfig.update({
            where: { id: userbotConfigId },
            data: { sessionString: null, isActive: false, clientPhone: null }
        });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚀 ADVANCED FEATURES
    // ═══════════════════════════════════════════════════════════════════════════════

    // --- 1️⃣ Auto-Reply System ---

    async setupAutoReply(userbotConfigId, companyId) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const rules = await this.prisma.telegramAutoReplyRule.findMany({
                where: { userbotConfigId, isActive: true },
                orderBy: { priority: 'desc' }
            });

            client.addEventHandler(async (event) => {
                if (event.message && !event.message.out) {
                    const message = event.message.message || '';
                    const userId = event.message.fromId?.toString();

                    for (const rule of rules) {
                        if (await this._matchAutoReplyRule(message, rule, userId)) {
                            await client.sendMessage(event.message.peerId, {
                                message: rule.response,
                                replyTo: event.message.id
                            });

                            await this.prisma.telegramAutoReplyUsage.create({
                                data: {
                                    id: require('crypto').randomUUID(),
                                    ruleId: rule.id,
                                    userId: userId || 'unknown'
                                }
                            });
                            break;
                        }
                    }
                }
            }, new Api.UpdateNewMessage({}));

            return { success: true, rulesCount: rules.length };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async _matchAutoReplyRule(message, rule, userId) {
        const now = new Date();
        
        if (rule.workingHoursOnly && rule.startTime && rule.endTime) {
            const currentTime = now.toTimeString().slice(0, 5);
            if (currentTime < rule.startTime || currentTime > rule.endTime) {
                return false;
            }
        }

        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
            const currentDay = now.getDay();
            if (!rule.daysOfWeek.includes(currentDay)) {
                return false;
            }
        }

        if (rule.maxUsesPerUser && userId) {
            const usageCount = await this.prisma.telegramAutoReplyUsage.count({
                where: {
                    ruleId: rule.id,
                    userId,
                    usedAt: { gte: new Date(Date.now() - rule.cooldownMinutes * 60000) }
                }
            });
            if (usageCount >= rule.maxUsesPerUser) {
                return false;
            }
        }

        const lowerMessage = message.toLowerCase();
        switch (rule.triggerType) {
            case 'KEYWORD':
                return lowerMessage.includes(rule.triggerValue.toLowerCase());
            case 'REGEX':
                return new RegExp(rule.triggerValue, 'i').test(message);
            case 'ALL':
                return true;
            default:
                return false;
        }
    }

    // --- 2️⃣ Bulk Messaging ---

    async sendBulkMessages(userbotConfigId, companyId, bulkMessageId) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const bulkMessage = await this.prisma.telegramBulkMessage.findUnique({
                where: { id: bulkMessageId }
            });

            if (!bulkMessage || bulkMessage.status !== 'PENDING') {
                return { success: false, error: 'Bulk message not found or already processed' };
            }

            await this.prisma.telegramBulkMessage.update({
                where: { id: bulkMessageId },
                data: { status: 'IN_PROGRESS', startedAt: new Date() }
            });

            const recipients = bulkMessage.recipients;
            let sentCount = 0;
            let failedCount = 0;

            for (const recipient of recipients) {
                try {
                    const entity = await client.getEntity(recipient);
                    await client.sendMessage(entity, { message: bulkMessage.message });

                    await this.prisma.telegramBulkMessageLog.create({
                        data: {
                            id: require('crypto').randomUUID(),
                            bulkMessageId,
                            recipient,
                            status: 'SENT',
                            sentAt: new Date()
                        }
                    });

                    sentCount++;
                    await new Promise(resolve => setTimeout(resolve, bulkMessage.delayBetweenMessages));
                } catch (error) {
                    await this.prisma.telegramBulkMessageLog.create({
                        data: {
                            id: require('crypto').randomUUID(),
                            bulkMessageId,
                            recipient,
                            status: 'FAILED',
                            error: error.message
                        }
                    });
                    failedCount++;
                }

                await this.prisma.telegramBulkMessage.update({
                    where: { id: bulkMessageId },
                    data: { sentCount, failedCount }
                });
            }

            await this.prisma.telegramBulkMessage.update({
                where: { id: bulkMessageId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    sentCount,
                    failedCount
                }
            });

            return { success: true, sentCount, failedCount };
        } catch (error) {
            await this.prisma.telegramBulkMessage.update({
                where: { id: bulkMessageId },
                data: { status: 'FAILED' }
            });
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    // --- 3️⃣ Message Scheduler ---

    async processScheduledMessages() {
        try {
            const now = new Date();
            const pending = await this.prisma.telegramScheduledMessage.findMany({
                where: {
                    status: 'PENDING',
                    scheduledTime: { lte: now }
                }
            });

            for (const msg of pending) {
                try {
                    await this.sendMessage(msg.userbotConfigId, msg.companyId, msg.chatId, msg.message);
                    
                    await this.prisma.telegramScheduledMessage.update({
                        where: { id: msg.id },
                        data: { status: 'SENT', sentAt: new Date() }
                    });

                    if (msg.recurring && msg.recurringPattern) {
                        const nextTime = this._calculateNextRecurringTime(msg.scheduledTime, msg.recurringPattern);
                        await this.prisma.telegramScheduledMessage.create({
                            data: {
                                id: require('crypto').randomUUID(),
                                userbotConfigId: msg.userbotConfigId,
                                companyId: msg.companyId,
                                chatId: msg.chatId,
                                message: msg.message,
                                mediaUrl: msg.mediaUrl,
                                mediaType: msg.mediaType,
                                scheduledTime: nextTime,
                                recurring: true,
                                recurringPattern: msg.recurringPattern,
                                createdBy: msg.createdBy
                            }
                        });
                    }
                } catch (error) {
                    await this.prisma.telegramScheduledMessage.update({
                        where: { id: msg.id },
                        data: { status: 'FAILED', error: error.message }
                    });
                }
            }

            return { success: true, processed: pending.length };
        } catch (error) {
            console.error('Error processing scheduled messages:', error);
            return { success: false, error: error.message };
        }
    }

    _calculateNextRecurringTime(currentTime, pattern) {
        const next = new Date(currentTime);
        switch (pattern) {
            case 'DAILY':
                next.setDate(next.getDate() + 1);
                break;
            case 'WEEKLY':
                next.setDate(next.getDate() + 7);
                break;
            case 'MONTHLY':
                next.setMonth(next.getMonth() + 1);
                break;
        }
        return next;
    }

    // --- 4️⃣ Group Management ---

    async createChannel(userbotConfigId, companyId, title, about, isPublic = false) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            const result = await client.invoke(
                new Api.channels.CreateChannel({
                    title,
                    about,
                    broadcast: true,
                    megagroup: false
                })
            );

            const channelId = result.chats[0].id.toString();

            await this.prisma.telegramGroup.create({
                data: {
                    id: require('crypto').randomUUID(),
                    userbotConfigId,
                    companyId,
                    telegramId: channelId,
                    title,
                    type: 'CHANNEL',
                    description: about,
                    isPublic,
                    managedByUs: true
                }
            });

            return { success: true, channelId };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async createGroup(userbotConfigId, companyId, title, users = []) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            const userEntities = [];
            for (const userId of users) {
                try {
                    const entity = await client.getEntity(userId);
                    userEntities.push(entity);
                } catch (e) {
                    console.warn(`Failed to get entity for ${userId}`);
                }
            }

            const result = await client.invoke(
                new Api.messages.CreateChat({
                    users: userEntities,
                    title
                })
            );

            const groupId = result.chats[0].id.toString();

            await this.prisma.telegramGroup.create({
                data: {
                    id: require('crypto').randomUUID(),
                    userbotConfigId,
                    companyId,
                    telegramId: groupId,
                    title,
                    type: 'GROUP',
                    managedByUs: true
                }
            });

            return { success: true, groupId };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async addMembersToGroup(userbotConfigId, companyId, groupId, userIds) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const group = await client.getEntity(groupId);

            const results = [];
            for (const userId of userIds) {
                try {
                    const user = await client.getEntity(userId);
                    await client.invoke(
                        new Api.channels.InviteToChannel({
                            channel: group,
                            users: [user]
                        })
                    );
                    results.push({ userId, success: true });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    results.push({ userId, success: false, error: error.message });
                }
            }

            return { success: true, results };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async getGroupMembers(userbotConfigId, companyId, groupId, saveToDb = true) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const group = await client.getEntity(groupId);

            const participants = await client.getParticipants(group, { limit: 10000 });

            const members = participants.map(p => ({
                id: p.id.toString(),
                firstName: p.firstName || '',
                lastName: p.lastName || '',
                username: p.username || null,
                phone: p.phone || null,
                isBot: p.bot || false,
                isPremium: p.premium || false
            }));

            if (saveToDb) {
                for (const member of members) {
                    await this.prisma.telegramContact.upsert({
                        where: {
                            telegramId_companyId: {
                                telegramId: member.id,
                                companyId
                            }
                        },
                        update: {
                            firstName: member.firstName,
                            lastName: member.lastName,
                            username: member.username,
                            phone: member.phone,
                            isBot: member.isBot,
                            isPremium: member.isPremium
                        },
                        create: {
                            id: require('crypto').randomUUID(),
                            userbotConfigId,
                            companyId,
                            telegramId: member.id,
                            firstName: member.firstName,
                            lastName: member.lastName,
                            username: member.username,
                            phone: member.phone,
                            isBot: member.isBot,
                            isPremium: member.isPremium,
                            source: 'GROUP_SCRAPE',
                            sourceGroupId: groupId
                        }
                    });
                }
            }

            return { success: true, count: members.length, members };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    // --- 5️⃣ Message Forwarding ---

    async forwardMessages(userbotConfigId, companyId, fromChatId, toChatId, messageIds) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);

            const fromChat = await client.getEntity(fromChatId);
            const toChat = await client.getEntity(toChatId);

            await client.forwardMessages(toChat, {
                messages: messageIds,
                fromPeer: fromChat
            });

            return { success: true };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    async setupAutoForward(userbotConfigId, companyId, ruleId) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const rule = await this.prisma.telegramForwardRule.findUnique({
                where: { id: ruleId }
            });

            if (!rule || !rule.isActive) {
                return { success: false, error: 'Rule not found or inactive' };
            }

            client.addEventHandler(async (event) => {
                const message = event.message;
                const chatId = message.peerId.toString();

                if (rule.sourceChats.includes(chatId)) {
                    const passesFilter = this._passesForwardFilters(message, rule);
                    if (passesFilter) {
                        await this.forwardMessages(
                            userbotConfigId,
                            companyId,
                            chatId,
                            rule.targetChat,
                            [message.id]
                        );

                        await this.prisma.telegramForwardRule.update({
                            where: { id: ruleId },
                            data: { forwardCount: { increment: 1 } }
                        });
                    }
                }
            }, new Api.UpdateNewMessage({}));

            return { success: true };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }

    _passesForwardFilters(message, rule) {
        if (rule.filterKeywords && rule.filterKeywords.length > 0) {
            const text = (message.message || '').toLowerCase();
            const hasKeyword = rule.filterKeywords.some(kw => text.includes(kw.toLowerCase()));
            if (!hasKeyword) return false;
        }

        if (rule.filterMediaTypes && rule.filterMediaTypes.length > 0) {
            if (!message.media) return false;
            const mediaType = message.media.className;
            if (!rule.filterMediaTypes.includes(mediaType)) return false;
        }

        return true;
    }

    // --- 6️⃣ Search & Export ---

    async searchMessages(userbotConfigId, companyId, chatId, query, limit = 100) {
        try {
            const client = await this._getClient(userbotConfigId, companyId);
            const entity = await client.getEntity(chatId);

            const result = await client.invoke(
                new Api.messages.Search({
                    peer: entity,
                    q: query,
                    filter: new Api.InputMessagesFilterEmpty(),
                    limit
                })
            );

            return {
                success: true,
                messages: result.messages.map(m => ({
                    id: m.id,
                    text: m.message,
                    date: m.date,
                    fromId: m.fromId?.toString()
                }))
            };
        } catch (error) {
            return this._handleAuthError(error, userbotConfigId, companyId);
        }
    }
}

module.exports = new TelegramUserbotService();
