/**
 * 📱 WhatsApp Manager Service
 * إدارة جلسات WhatsApp المتعددة باستخدام Baileys
 * 
 * المميزات:
 * - إدارة جلسات متعددة لكل شركة
 * - حفظ واستعادة الجلسات من قاعدة البيانات
 * - إعادة الاتصال التلقائي
 * - إرسال الأحداث عبر Socket.IO
 */

const { useDatabaseAuthState } = require('./DatabaseAuthState');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const fs = require('fs').promises;
const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const WhatsAppSyncService = require('./WhatsAppSyncService');
// // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues // ❌ Removed to prevent early loading issues
const socketService = require('../socketService');
const getIO = () => socketService.getIO();

// Dynamic import for Baileys
let makeWASocket, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage;
const initBaileys = async () => {
    const baileys = await import('@whiskeysockets/baileys');
    makeWASocket = baileys.makeWASocket;
    DisconnectReason = baileys.DisconnectReason;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
    downloadMediaMessage = baileys.downloadMediaMessage;
};
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');

// تخزين الجلسات النشطة في الذاكرة
const activeSessions = new Map();

// مسار حفظ بيانات الجلسات
const SESSIONS_DIR = path.join(__dirname, '../../data/whatsapp-sessions');
// مسار حفظ الوسائط
const MEDIA_DIR = path.join(__dirname, '../../public/uploads/whatsapp');

/**
 * تهيئة مجلد الجلسات والوسائط
 */
async function initSessionsDirectory() {
    try {
        await fs.mkdir(SESSIONS_DIR, { recursive: true });
        await fs.mkdir(MEDIA_DIR, { recursive: true });

        // Lazy load to avoid circular dependency
        const WhatsAppMediaHandler = require('./WhatsAppMediaHandler');
        await WhatsAppMediaHandler.initMediaDirectory();

        console.log('📁 WhatsApp sessions and media directories initialized');
    } catch (error) {
        console.error('❌ Error creating directories:', error);
    }
}

// ... (rest of the file until extractMessageContent)

/**
 * استخراج محتوى الرسالة (Async)
 */
async function extractMessageContent(msg, sock) {
    const message = msg.message;
    if (!message) return null;

    let type = 'TEXT';
    let text = null;
    let mediaUrl = null;
    let mediaType = null;
    let mimetype = null;
    let fileName = null;
    let quotedId = null;
    let quotedText = null;

    // دالة مساعدة لتحميل الوسائط
    const downloadMedia = async (messageType, fileExtension) => {
        try {
            const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                    logger: pino({ level: 'silent' }),
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            const filename = `media_${msg.key.id}_${Date.now()}.${fileExtension}`;
            const filepath = path.join(MEDIA_DIR, filename);
            await fs.writeFile(filepath, buffer);
            return `/uploads/whatsapp/${filename}`;
        } catch (error) {
            console.error('❌ Error downloading media:', error);
            return 'FAILED_DOWNLOAD';
        }
    };

    // نص عادي
    if (message.conversation) {
        text = message.conversation;
    }
    // نص موسع
    else if (message.extendedTextMessage) {
        text = message.extendedTextMessage.text;
        if (message.extendedTextMessage.contextInfo?.quotedMessage) {
            quotedId = message.extendedTextMessage.contextInfo.stanzaId;
            quotedText = message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
                message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text;
        }
    }
    // صورة
    else if (message.imageMessage) {
        type = 'IMAGE';
        text = message.imageMessage.caption;
        mimetype = message.imageMessage.mimetype;
        mediaType = 'image';
        mediaUrl = await downloadMedia('imageMessage', 'jpg');
    }
    // فيديو
    else if (message.videoMessage) {
        type = 'VIDEO';
        text = message.videoMessage.caption;
        mimetype = message.videoMessage.mimetype;
        mediaType = 'video';
        mediaUrl = await downloadMedia('videoMessage', 'mp4');
    }
    // صوت
    else if (message.audioMessage) {
        type = 'AUDIO';
        mimetype = message.audioMessage.mimetype;
        mediaType = 'audio';
        // تحديد الامتداد بناءً على mimetype (ogg للصوتيات عادةً)
        const ext = mimetype.includes('mp4') ? 'm4a' : 'ogg';
        mediaUrl = await downloadMedia('audioMessage', ext);
    }
    // ملف
    else if (message.documentMessage) {
        type = 'DOCUMENT';
        text = message.documentMessage.caption;
        mimetype = message.documentMessage.mimetype;
        fileName = message.documentMessage.fileName;
        mediaType = 'document';
        // محاولة استخراج الامتداد من اسم الملف
        const ext = fileName ? fileName.split('.').pop() : 'bin';
        mediaUrl = await downloadMedia('documentMessage', ext);
    }
    // ستيكر
    else if (message.stickerMessage) {
        type = 'STICKER';
        mimetype = message.stickerMessage.mimetype;
        mediaType = 'sticker';
        mediaUrl = await downloadMedia('stickerMessage', 'webp');
    }
    // موقع
    else if (message.locationMessage) {
        type = 'LOCATION';
        text = `${message.locationMessage.degreesLatitude},${message.locationMessage.degreesLongitude}`;
    }
    // جهة اتصال
    else if (message.contactMessage) {
        type = 'CONTACT';
        text = message.contactMessage.displayName;
    }
    // تفاعل
    else if (message.reactionMessage) {
        type = 'REACTION';
        text = message.reactionMessage.text;
        // Extract the ID of the message being reacted to
        quotedId = message.reactionMessage.key?.id;
        // We might also want to know who sent the reaction, which is handled by the main message processing (sender/participant)
    }
    // أزرار تفاعلية
    else if (message.buttonsMessage) {
        type = 'BUTTONS';
        text = message.buttonsMessage.contentText || message.buttonsMessage.text;
    }
    // قائمة
    else if (message.listMessage) {
        type = 'LIST';
        text = message.listMessage.description || message.listMessage.title;
    }
    // منتج (قد يكون في templateMessage)
    else if (message.templateMessage) {
        type = 'TEMPLATE';
        text = message.templateMessage.hydratedTemplate?.hydratedContentText ||
            message.templateMessage.hydratedTemplate?.templateId;
    }
    else {
        return null;
    }

    return { type, text, mediaUrl, mediaType, mimetype, fileName, quotedId, quotedText };
}

/**
 * الحصول على مسار جلسة معينة
 */
function getSessionPath(sessionId) {
    return path.join(SESSIONS_DIR, sessionId);
}

/**
 * إنشاء جلسة WhatsApp جديدة
 * @param {string} sessionId - معرف الجلسة
 * @param {string} companyId - معرف الشركة
 * @param {object} options - خيارات إضافية
 */
async function createSession(sessionId, companyId, options = {}) {
    try {
        console.log(`📱 Creating WhatsApp session: ${sessionId} for company: ${companyId}`);

        // Initialize Baileys if not already done
        if (!makeWASocket) {
            await initBaileys();
        }

        // التحقق من وجود جلسة نشطة
        if (activeSessions.has(sessionId)) {
            console.log(`⚠️ Session ${sessionId} already exists, returning existing session`);
            return activeSessions.get(sessionId);
        }

        // تحميل حالة المصادقة من قاعدة البيانات
        const { state, saveCreds } = await useDatabaseAuthState(sessionId);

        // الحصول على أحدث إصدار من Baileys
        const { version } = await fetchLatestBaileysVersion();
        console.log(`📦 Using Baileys version: ${version.join('.')}`);

        // إنشاء Socket مع معالجة أخطاء محسنة
        const sock = makeWASocket({
            version,
            auth: state,

            logger: pino({ level: 'fatal' }), // تقليل الـ logs إلى الأخطاء الحرجة فقط
            browser: ['MaxBot', 'Chrome', '120.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            emitOwnEvents: true,
            markOnlineOnConnect: true,
            syncFullHistory: false, // تعطيل مزامنة التاريخ الكامل لتقليل أخطاء فك التشفير
            ...options
        });

        // حفظ الجلسة في الذاكرة
        const sessionData = {
            sock,
            sessionId,
            companyId,
            status: 'connecting',
            qrCode: null,
            phoneNumber: null,
            createdAt: new Date()
        };
        activeSessions.set(sessionId, sessionData);

        // معالجة أحداث الاتصال
        sock.ev.on('connection.update', async (update) => {
            await handleConnectionUpdate(sessionId, companyId, update, sock);
        });

        // حفظ بيانات المصادقة
        sock.ev.on('creds.update', saveCreds);

        // إضافة معالج أخطاء عام
        sock.ev.on('error', (error) => {
            // تجاهل أخطاء Bad MAC الشائعة
            if (error.message && error.message.includes('Bad MAC')) {
                // لا تطبع هذه الأخطاء - هي أخطاء شائعة وغير حرجة
                return;
            }
            console.error(`❌ [WhatsApp] Session ${sessionId} error:`, error.message);
        });

        // معالجة الرسائل الواردة
        sock.ev.on('messages.upsert', async (m) => {
            await handleIncomingMessages(sessionId, companyId, m, sock);
        });

        // معالجة تحديث حالة الرسائل
        sock.ev.on('messages.update', async (updates) => {
            await handleMessageStatusUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث المجموعات
        sock.ev.on('groups.update', async (updates) => {
            await handleGroupsUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث جهات الاتصال
        sock.ev.on('contacts.update', async (updates) => {
            await handleContactsUpdate(sessionId, companyId, updates);
        });

        // معالجة أحداث الحضور (typing, online, etc.)
        sock.ev.on('presence.update', async (update) => {
            await handlePresenceUpdate(sessionId, companyId, update);
        });

        // معالجة أحداث المكالمات
        sock.ev.on('call.update', async (update) => {
            await handleCallUpdate(sessionId, companyId, update);
        });

        return sessionData;
    } catch (error) {
        console.error(`❌ Error creating session ${sessionId}:`, error);
        throw error;
    }
}

/**
 * معالجة تحديثات الاتصال
 */
async function handleConnectionUpdate(sessionId, companyId, update, sock) {
    const { connection, lastDisconnect, qr } = update;
    const io = getIO();

    // التحقق من أن التحديث يأتي من الجلسة النشطة الحالية
    const currentSession = activeSessions.get(sessionId);
    if (currentSession && currentSession.sock !== sock) {
        console.log(`⚠️ Ignoring connection update for session ${sessionId} from stale socket`);
        return;
    }

    try {
        // إرسال QR Code
        if (qr) {
            console.log(`📱 QR Code generated for session: ${sessionId}`);

            const sessionData = activeSessions.get(sessionId);
            if (sessionData) {
                sessionData.qrCode = qr;
                sessionData.status = 'qr_pending';
            }

            // تحديث قاعدة البيانات
            await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.whatsAppSession.update({
                    where: { id: sessionId },
                    data: { status: 'QR_PENDING' }
                });
            }, 5);

            // إرسال QR عبر Socket.IO
            if (io) {
                // إرسال للـ company room
                io.to(`company_${companyId}`).emit('whatsapp:qr', {
                    sessionId,
                    qr
                });
                // إرسال لجميع المتصلين (fallback)
                io.emit('whatsapp:qr', {
                    sessionId,
                    companyId,
                    qr
                });
                console.log(`📤 QR Code sent via Socket.IO for session: ${sessionId}`);
            }

            // تسجيل الحدث
            await logEvent(sessionId, companyId, 'qr_generated', { qr: 'generated' });
        }

        // معالجة حالة الاتصال
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            let shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            // 🛡️ Bad MAC Error Auto-Recovery
            // If the error is related to crypto/mac issues, we must Force Logout
            // otherwise it will loop forever.
            if (lastDisconnect?.error?.message?.includes('Bad MAC')) {
                console.error(`🚨 [CRITICAL] Session ${sessionId} has corrupted crypto keys (Bad MAC). Forcing logout.`);
                shouldReconnect = false; // Do not reconnect

                // Force cleanup
                try {
                    await deleteSession(sessionId);
                    console.log(`🧹 Corrupted session ${sessionId} deleted.`);
                } catch (cleanupError) {
                    console.error('❌ Failed to clean up corrupted session:', cleanupError);
                }
            }

            console.log(`🔌 Connection closed for session ${sessionId}, status: ${statusCode}, reconnect: ${shouldReconnect}`);

            // تحديث الحالة
            const sessionData = activeSessions.get(sessionId);
            if (sessionData) {
                sessionData.status = 'disconnected';
            }

            // تحديث قاعدة البيانات
            await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.whatsAppSession.update({
                    where: { id: sessionId },
                    data: {
                        status: statusCode === DisconnectReason.loggedOut ? 'LOGGED_OUT' : 'DISCONNECTED',
                        lastDisconnectedAt: new Date()
                    }
                });
            }, 5);

            // إرسال حدث الانقطاع
            io?.to(`company_${companyId}`).emit('whatsapp:connection', {
                sessionId,
                status: 'disconnected',
                reason: statusCode
            });

            // تسجيل الحدث
            await logEvent(sessionId, companyId, 'disconnected', { statusCode, shouldReconnect }, 'warning');

            // إعادة الاتصال إذا لزم الأمر
            if (shouldReconnect) {
                console.log(`🔄 Attempting to reconnect session ${sessionId}...`);
                setTimeout(() => {
                    reconnectSession(sessionId, companyId);
                }, 5000);
            } else {
                // حذف الجلسة من الذاكرة
                activeSessions.delete(sessionId);
            }
        } else if (connection === 'open') {
            console.log(`✅ WhatsApp connected for session: ${sessionId}`);

            // الحصول على معلومات المستخدم
            const user = sock.user;
            const phoneNumber = user?.id?.split(':')[0] || user?.id?.split('@')[0];

            // تحديث الحالة
            const sessionData = activeSessions.get(sessionId);
            if (sessionData) {
                sessionData.status = 'connected';
                sessionData.phoneNumber = phoneNumber;
                sessionData.qrCode = null;
            }

            // تحديث قاعدة البيانات
            await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.whatsAppSession.update({
                    where: { id: sessionId },
                    data: {
                        status: 'CONNECTED',
                        phoneNumber,
                        lastConnectedAt: new Date()
                    }
                });
            }, 5);

            // ✅ Sync Profile Automatically
            syncProfile(sessionId).catch(err => console.error(`Failed to auto-sync profile for ${sessionId}:`, err.message));

            // إرسال حدث الاتصال
            io?.to(`company_${companyId}`).emit('whatsapp:connection', {
                sessionId,
                status: 'connected',
                phoneNumber
            });

            // تسجيل الحدث
            await logEvent(sessionId, companyId, 'connected', { phoneNumber });
        }
    } catch (error) {
        console.error(`❌ Error handling connection update for ${sessionId}:`, error);
        await logEvent(sessionId, companyId, 'error', { error: error.message }, 'error');
    }
}

/**
 * معالجة الرسائل الواردة
 */
async function handleIncomingMessages(sessionId, companyId, m, sock) {
    const { messages, type } = m;
    const io = getIO();

    if (type !== 'notify') return;

    for (const msg of messages) {
        try {
            // تجاهل الرسائل القديمة
            if (msg.messageTimestamp < Date.now() / 1000 - 60) continue;

            // DEBUG: Log incoming message key
            await logEvent(sessionId, companyId, 'debug_incoming_msg', {
                key: msg.key,
                pushName: msg.pushName
            });

            let remoteJid = msg.key.remoteJid;
            const fromMe = msg.key.fromMe;
            const messageId = msg.key.id;

            // Handle @lid (Linked Device ID)
            if (remoteJid && remoteJid.includes('@lid')) {
                // Try to find the phone number JID from participant or senderPn (specific to LIDs)
                const phoneJid = msg.key.participant || msg.key.senderPn;

                // FIX: Only use participant/senderPn if it's NOT from me.
                // If it IS from me, participant is likely myself, which we don't want as remoteJid.
                if (!fromMe && phoneJid && phoneJid.includes('@s.whatsapp.net')) {
                    remoteJid = phoneJid;
                } else if (fromMe) {
                    // For outgoing messages, we want to avoid using the LID if possible, 
                    // but we definitely don't want to use our own JID (participant).
                    // If we can't resolve the LID to a Phone JID here, we keep the LID 
                    // (or rely on the fact that sendText already created the message with the correct Phone JID).
                    console.log(`⚠️ Outgoing message to LID ${remoteJid}. Keeping LID to avoid self-assignment.`);
                } else {
                    // If we can't find the phone number, skip this message to avoid creating ghost contacts
                    console.log(`⚠️ Skipping message from LID without participant/senderPn: ${remoteJid}`);
                    continue;
                }
            }

            // Normalize JID (only for non-group, non-broadcast, and already valid-looking JIDs)
            if (remoteJid && !remoteJid.includes('@g.us') && remoteJid !== 'status@broadcast' && remoteJid.includes('@s.whatsapp.net')) {
                const bareJid = remoteJid.split('@')[0].split(':')[0];
                const cleaned = bareJid.replace(/\D/g, '');
                remoteJid = `${cleaned}@s.whatsapp.net`;
            }

            // معالجة رسائل الحالة (Status Updates)
            if (remoteJid === 'status@broadcast') {
                console.log('📸 Received status update');
                await handleStatusUpdate(sessionId, companyId, msg, sock);
                continue; // Skip normal message processing
            }

            // استخراج محتوى الرسالة
            const messageContent = await extractMessageContent(msg, sock, sessionId);
            if (!messageContent) continue;

            // console.log(`📩 New message in session ${sessionId}: ${messageContent.type} from ${remoteJid}`);

            // حفظ الرسالة في قاعدة البيانات
            // حفظ الرسالة في قاعدة البيانات
            const savedMessage = await getSharedPrismaClient().whatsAppMessage.upsert({
                where: { messageId },
                update: {
                    status: 'SENT', // تأكيد الحالة
                    messageType: messageContent.type,
                    content: messageContent.text,
                    mediaUrl: messageContent.mediaUrl,
                    mediaType: messageContent.mediaType,
                    mediaMimeType: messageContent.mimetype,
                    mediaFileName: messageContent.fileName,
                    quotedMessageId: messageContent.quotedId,
                    quotedContent: messageContent.quotedText,
                    metadata: JSON.stringify(msg),
                    participant: msg.key.participant, // تحديث المشارك
                    updatedAt: new Date()
                },
                create: {
                    sessionId,
                    remoteJid,
                    messageId,
                    fromMe,
                    participant: msg.key.participant, // حفظ المشارك
                    messageType: messageContent.type,
                    content: messageContent.text,
                    mediaUrl: messageContent.mediaUrl,
                    mediaType: messageContent.mediaType,
                    mediaMimeType: messageContent.mimetype,
                    mediaFileName: messageContent.fileName,
                    quotedMessageId: messageContent.quotedId,
                    quotedContent: messageContent.quotedText,
                    timestamp: new Date(msg.messageTimestamp * 1000),
                    metadata: JSON.stringify(msg),
                    updatedAt: new Date()
                }
            });

            // ✅ SYNC TO MAIN CRM (Persistent Storage)
            let syncedCustomer = null;
            try {
                const syncResult = await WhatsAppSyncService.syncMessage(
                    companyId,
                    remoteJid,
                    {
                        type: messageContent.type,
                        content: messageContent.text,
                        mediaUrl: messageContent.mediaUrl,
                        mediaType: messageContent.mediaType,
                        mediaMimeType: messageContent.mimetype,
                        mediaFileName: messageContent.fileName,
                        timestamp: new Date(msg.messageTimestamp * 1000),
                        pushName: msg.pushName
                    },
                    true // isIncoming
                );
                syncedCustomer = syncResult?.customer;
            } catch (syncErr) {
                console.error('Failed to sync incoming message to CRM:', syncErr);
            }

            // تحديث أو إنشاء جهة الاتصال
            const contact = await updateOrCreateContact(sessionId, remoteJid, msg, sock, {
                isOutgoing: fromMe,
                customerId: syncedCustomer?.id
            });

            // إذا كانت رسالة مجموعة، نحفظ المرسل كجهة اتصال أيضاً
            if (remoteJid.endsWith('@g.us') && msg.key.participant) {
                await updateOrCreateContact(sessionId, msg.key.participant, msg, sock, {
                    isOutgoing: false,
                    isGroupParticipant: true,
                    // Group participants might need their own customer entry? 
                    // For now, we skip syncing group participants to CRM customers implicitly 
                    // unless they send a direct message.
                });
            }

            // إرسال الرسالة عبر Socket.IO
            // console.log(`🔌 [DEBUG] Emitting whatsapp:message:new to company_${companyId}`, {
            //     sessionId,
            //     messageId: savedMessage.id
            // });
            io?.to(`company_${companyId}`).emit('whatsapp:message:new', {
                sessionId,
                message: savedMessage,
                raw: msg
            });

            // 🔔 إنشاء إشعار للرسالة الجديدة (فقط للرسائل الواردة)
            if (!fromMe) {
                try {
                    // جلب إعدادات الإشعارات
                    const settings = await executeWithRetry(async () => {
                        const prisma = getSharedPrismaClient();
                        return await prisma.whatsAppSettings.findUnique({
                            where: { companyId }
                        });
                    });

                    // الإشعارات مفعلة افتراضياً إذا لم تكن موجودة
                    const notificationsEnabled = settings?.browserNotifications !== false;
                    const soundEnabled = settings?.notificationSound !== false;

                    const contactName = contact?.name || contact?.pushName || remoteJid.split('@')[0];
                    const notificationContent = messageContent.text
                        ? (messageContent.text.length > 50 ? messageContent.text.substring(0, 50) + '...' : messageContent.text)
                        : (messageContent.type === 'IMAGE' ? '📷 صورة' :
                            messageContent.type === 'VIDEO' ? '🎥 فيديو' :
                                messageContent.type === 'AUDIO' ? '🎵 صوت' :
                                    messageContent.type === 'DOCUMENT' ? '📎 ملف' : 'رسالة جديدة');

                    // إنشاء إشعار في قاعدة البيانات إذا كانت الإشعارات مفعلة
                    if (notificationsEnabled) {
                        try {
                            const notifData = JSON.stringify({
                                sessionId,
                                messageId: savedMessage.id,
                                remoteJid,
                                contactId: contact?.id,
                                messageType: messageContent.type
                            });

                            await getSharedPrismaClient().notification.create({
                                data: {
                                    companyId,
                                    userId: null,
                                    type: 'new_message',
                                    title: `رسالة جديدة من ${contactName}`,
                                    message: notificationContent,
                                    data: notifData,
                                    updatedAt: new Date()
                                }
                            });
                        } catch (e) {
                            console.error('Error creating notification:', e);
                        }
                    }

                    // إرسال إشعار عبر Socket دائماً (Frontend يتحقق من الإعدادات)
                    io?.to(`company_${companyId}`).emit('whatsapp:notification:new', {
                        sessionId,
                        contactName,
                        message: notificationContent,
                        messageType: messageContent.type,
                        timestamp: savedMessage.timestamp,
                        soundEnabled,
                        notificationsEnabled
                    });

                    // console.log(`🔔 [NOTIFICATION] Sent WhatsApp message notification for company ${companyId}`, {
                    //     contactName,
                    //     messageType: messageContent.type,
                    //     notificationsEnabled,
                    //     soundEnabled
                    // });
                } catch (notifError) {
                    console.error('❌ [NOTIFICATION] Error creating WhatsApp message notification:', notifError);
                }
            }

            // معالجة AI إذا كان مفعلاً
            if (!fromMe) {
                await processAIResponse(sessionId, companyId, savedMessage, sock);
            }

        } catch (error) {
            console.error(`❌ Error processing message:`, error);
            await logEvent(sessionId, companyId, 'message_error', { error: error.message }, 'error');
        }
    }
}

/**
 * معالجة تحديثات الحالة (Status Updates)
 */
async function handleStatusUpdate(sessionId, companyId, msg, sock) {
    try {
        const io = getIO();
        const messageId = msg.key.id;

        // Get the actual sender (participant in status updates)
        const remoteJid = msg.key.participant || msg.pushName;

        if (!remoteJid) {
            console.log('⚠️ Status update without participant, skipping');
            return;
        }

        // Extract status content
        const messageContent = await extractMessageContent(msg, sock, sessionId);
        if (!messageContent) return;

        // Calculate expiration (24 hours from now)
        const timestamp = new Date(msg.messageTimestamp * 1000);
        const expiresAt = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000);

        // Save to database
        const savedStatus = await getSharedPrismaClient().whatsAppStatus.upsert({
            where: { messageId },
            update: {
                type: messageContent.type,
                content: messageContent.text,
                mediaUrl: messageContent.mediaUrl,
                mediaType: messageContent.mediaType,
                mediaMimeType: messageContent.mimetype,
                timestamp,
                expiresAt,
                metadata: JSON.stringify(msg)
            },
            create: {
                sessionId,
                remoteJid,
                messageId,
                type: messageContent.type,
                content: messageContent.text,
                mediaUrl: messageContent.mediaUrl,
                mediaType: messageContent.mediaType,
                mediaMimeType: messageContent.mimetype,
                timestamp,
                expiresAt,
                metadata: JSON.stringify(msg)
            }
        });

        console.log(`📸 Saved status update: ${savedStatus.id} (expires in 24h)`);

        // Emit socket event
        io?.to(`company_${companyId}`).emit('whatsapp:status:new', {
            sessionId,
            status: savedStatus
        });

    } catch (error) {
        console.error('❌ Error processing status update:', error);
        await logEvent(sessionId, companyId, 'status_error', { error: error.message }, 'error');
    }
}


/**
 * استخراج محتوى الرسالة
 */
/**
 * استخراج محتوى الرسالة
 */
async function extractMessageContent(msg, sock, sessionId) {
    const message = msg.message;
    if (!message) return null;

    // Lazy load to avoid circular dependency
    const WhatsAppMediaHandler = require('./WhatsAppMediaHandler');

    let type = 'TEXT';
    let text = null;
    let mediaUrl = null;
    let mediaType = null;
    let mimetype = null;
    let fileName = null;
    let quotedId = null;
    let quotedText = null;

    // نص عادي
    if (message.conversation) {
        text = message.conversation;
    }
    // نص موسع
    else if (message.extendedTextMessage) {
        text = message.extendedTextMessage.text;
        if (message.extendedTextMessage.contextInfo?.quotedMessage) {
            quotedId = message.extendedTextMessage.contextInfo.stanzaId;
            quotedText = message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
                message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text;
        }
    }
    // صورة
    else if (message.imageMessage) {
        type = 'IMAGE';
        text = message.imageMessage.caption;
        mimetype = message.imageMessage.mimetype;
        try {
            const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
            if (media) {
                mediaUrl = media.url;
                mediaType = 'image';
                fileName = media.fileName;
            }
        } catch (e) {
            console.error('Failed to download image:', e);
        }
    }
    // فيديو
    else if (message.videoMessage) {
        type = 'VIDEO';
        text = message.videoMessage.caption;
        mimetype = message.videoMessage.mimetype;
        try {
            const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
            if (media) {
                mediaUrl = media.url;
                mediaType = 'video';
                fileName = media.fileName;
            }
        } catch (e) {
            console.error('Failed to download video:', e);
        }
    }
    // صوت
    else if (message.audioMessage) {
        type = 'AUDIO';
        mimetype = message.audioMessage.mimetype;
        try {
            const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
            if (media) {
                mediaUrl = media.url;
                mediaType = 'audio';
                fileName = media.fileName;
            }
        } catch (e) {
            console.error('Failed to download audio:', e);
        }
    }
    // ملف
    else if (message.documentMessage) {
        type = 'DOCUMENT';
        text = message.documentMessage.caption;
        mimetype = message.documentMessage.mimetype;
        fileName = message.documentMessage.fileName;
        try {
            const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
            if (media) {
                mediaUrl = media.url;
                mediaType = 'document';
                // Keep original filename if available
                if (!fileName) fileName = media.fileName;
            }
        } catch (e) {
            console.error('Failed to download document:', e);
        }
    }
    // ستيكر
    else if (message.stickerMessage) {
        type = 'STICKER';
        mimetype = message.stickerMessage.mimetype;
        try {
            const media = await WhatsAppMediaHandler.downloadMedia(msg, sessionId);
            if (media) {
                mediaUrl = media.url;
                mediaType = 'sticker';
                fileName = media.fileName;
            }
        } catch (e) {
            console.error('Failed to download sticker:', e);
        }
    }
    // موقع
    else if (message.locationMessage) {
        type = 'LOCATION';
        text = JSON.stringify({
            latitude: message.locationMessage.degreesLatitude,
            longitude: message.locationMessage.degreesLongitude,
            address: message.locationMessage.address,
            name: message.locationMessage.name
        });
    }
    // جهة اتصال
    else if (message.contactMessage) {
        type = 'CONTACT';
        text = message.contactMessage.displayName;
    }
    // تفاعل
    else if (message.reactionMessage) {
        type = 'REACTION';
        text = message.reactionMessage.text;
    }
    // أزرار تفاعلية
    else if (message.buttonsMessage) {
        type = 'BUTTONS';
        text = message.buttonsMessage.contentText || message.buttonsMessage.text;
    }
    // قائمة
    else if (message.listMessage) {
        type = 'LIST';
        text = message.listMessage.description || message.listMessage.title;
    }
    // منتج (قد يكون في templateMessage)
    else if (message.templateMessage) {
        type = 'TEMPLATE';
        text = message.templateMessage.hydratedTemplate?.hydratedContentText ||
            message.templateMessage.hydratedTemplate?.templateId;
    }
    else {
        return null;
    }

    return { type, text, mediaUrl, mediaType, mimetype, fileName, quotedId, quotedText };
}

/**
 * تحديث أو إنشاء جهة اتصال
 */
/**
 * تحديث أو إنشاء جهة اتصال
 */
async function updateOrCreateContact(sessionId, remoteJid, msg, sock, options = {}) {
    try {
        const { isOutgoing = false, isGroupParticipant = false, customerId } = options;

        // Ensure JID is normalized using the same logic as MessageHandler
        const isGroup = remoteJid.endsWith('@g.us');
        const isLid = remoteJid.includes('@lid');
        let normalizedJid = remoteJid;
        let phoneNumber = null;

        if (isGroup) {
            // Keep group JID as is, do not try to extract phone number
            normalizedJid = remoteJid;
            phoneNumber = null; // Groups don't have a phone number
        } else if (isLid) {
            // Keep LID as is, do not extract phone number
            normalizedJid = remoteJid;
            phoneNumber = null;
        } else {
            // Standard normalization for users
            // Remove device info (e.g. :12) and ensure @s.whatsapp.net
            const bareJid = remoteJid.split('@')[0].split(':')[0];
            // Remove non-numeric chars
            const cleaned = bareJid.replace(/\D/g, '');
            normalizedJid = `${cleaned}@s.whatsapp.net`;
            phoneNumber = cleaned;
        }

        // Use normalizedJid for database operations
        remoteJid = normalizedJid;

        let pushName = msg.pushName;

        // إذا كانت مجموعة، نحاول الحصول على اسم المجموعة
        if (isGroup) {
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid);
                pushName = groupMetadata.subject;
            } catch (e) {
                // تجاهل الخطأ إذا فشل جلب بيانات المجموعة
                console.log('Failed to fetch group metadata for:', remoteJid);
            }
        } else if (isOutgoing) {
            // FIX: If outgoing message, msg.pushName is MY name.
            // We should NOT use it to update the contact (recipient).
            pushName = undefined;
        }

        // محاولة الحصول على صورة البروفايل
        let profilePicUrl = null;
        try {
            profilePicUrl = await sock.profilePictureUrl(remoteJid, 'image');
        } catch (e) {
            // تجاهل الخطأ إذا لم تكن الصورة متاحة
        }

        const updateData = {
            profilePicUrl,
        };

        // Link to Customer if provided
        if (customerId) {
            updateData.customerId = customerId;
        }

        // Only update pushName if it's defined (i.e., not outgoing or it's a group)
        if (pushName) {
            updateData.pushName = pushName;
        }

        // Only update chat metadata if it's NOT a background participant update
        if (!isGroupParticipant) {
            updateData.lastMessageAt = new Date();
            updateData.totalMessages = { increment: 1 };

            // Only increment unreadCount if it's an incoming message
            if (!isOutgoing) {
                updateData.unreadCount = { increment: 1 };
            }
        }

        const createData = {
            sessionId,
            jid: remoteJid,
            phoneNumber,
            pushName: pushName || null, // Use null if undefined (outgoing)
            profilePicUrl,
            lastMessageAt: new Date(),
            unreadCount: (!isOutgoing && !isGroupParticipant) ? 1 : 0,
            totalMessages: 1,
            isGroup,
            customerId
        };

        const contact = await getSharedPrismaClient().whatsAppContact.upsert({
            where: {
                sessionId_jid: {
                    sessionId,
                    jid: remoteJid
                }
            },
            update: {
                ...updateData,
                updatedAt: new Date()
            },
            create: {
                ...createData,
                whatsapp_sessions: {
                    connect: { id: sessionId }
                },
                updatedAt: new Date()
            }
        });

        return contact;
    } catch (error) {
        console.error('❌ Error updating contact:', error);
        return null;
    }
}

/**
 * معالجة رد AI
 */
async function processAIResponse(sessionId, companyId, message, sock) {
    try {
        // جلب إعدادات الجلسة
        const session = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.whatsAppSession.findUnique({
                where: { id: sessionId }
            });
        }, 7);

        if (!session?.aiEnabled) return;

        // استيراد خدمة AI
        const WhatsAppAIIntegration = require('./WhatsAppAIIntegration');

        // معالجة الرد
        await WhatsAppAIIntegration.processMessage(sessionId, companyId, message, sock, session);

    } catch (error) {
        console.error('❌ Error processing AI response:', error);
    }
}

/**
 * معالجة تحديث حالة الرسائل
 */
async function handleMessageStatusUpdate(sessionId, companyId, updates) {
    const io = getIO();

    for (const update of updates) {
        try {
            const { key, update: statusUpdate } = update;

            if (statusUpdate.status) {
                const statusMap = {
                    1: 'PENDING',
                    2: 'SENT',
                    3: 'DELIVERED',
                    4: 'READ'
                };

                const status = statusMap[statusUpdate.status] || 'SENT';

                await getSharedPrismaClient().whatsAppMessage.updateMany({
                    where: { messageId: key.id },
                    data: { status }
                });

                io?.to(`company_${companyId}`).emit('whatsapp:message:status', {
                    sessionId,
                    messageId: key.id,
                    status
                });
            }
        } catch (error) {
            console.error('❌ Error updating message status:', error);
        }
    }
}

/**
 * معالجة تحديث المجموعات
 */
async function handleGroupsUpdate(sessionId, companyId, updates) {
    // يمكن إضافة منطق معالجة المجموعات هنا
    console.log(`📢 Groups update for session ${sessionId}:`, updates);
}

/**
 * معالجة تحديث جهات الاتصال
 */
async function handleContactsUpdate(sessionId, companyId, updates) {
    for (const update of updates) {
        try {
            if (update.id) {
                await getSharedPrismaClient().whatsAppContact.updateMany({
                    where: {
                        sessionId,
                        jid: update.id
                    },
                    data: {
                        name: update.notify || update.name,
                        profilePicUrl: update.imgUrl
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error updating contact:', error);
        }
    }
}

/**
 * معالجة تحديث الحضور
 */
async function handlePresenceUpdate(sessionId, companyId, update) {
    const io = getIO();

    io?.to(`company_${companyId}`).emit('whatsapp:presence', {
        sessionId,
        jid: update.id,
        presence: update.presences
    });
}

/**
 * معالجة تحديثات المكالمات
 */
async function handleCallUpdate(sessionId, companyId, update) {
    const io = getIO();

    try {
        // تسجيل الحدث
        await logEvent(sessionId, companyId, 'call_update', {
            callId: update.id,
            status: update.status,
            from: update.from
        });

        // إرسال عبر Socket.IO
        io?.to(`company_${companyId}`).emit('whatsapp:call:update', {
            sessionId,
            callId: update.id,
            status: update.status,
            from: update.from,
            timestamp: new Date()
        });

        // معالجة حالات محددة
        if (update.status === 'reject') {
            await logEvent(sessionId, companyId, 'call_reject', {
                callId: update.id,
                from: update.from
            }, 'info');
        } else if (update.status === 'timeout') {
            await logEvent(sessionId, companyId, 'call_timeout', {
                callId: update.id,
                from: update.from
            }, 'info');
        }
    } catch (error) {
        console.error('❌ Error handling call update:', error);
    }
}

/**
 * إعادة الاتصال بجلسة
 */
async function reconnectSession(sessionId, companyId) {
    try {
        // حذف الجلسة القديمة
        activeSessions.delete(sessionId);

        // إنشاء جلسة جديدة
        await createSession(sessionId, companyId);
    } catch (error) {
        console.error(`❌ Error reconnecting session ${sessionId}:`, error);
    }
}

/**
 * إرسال رسالة نصية
 */
async function sendTextMessage(sessionId, to, text, options = {}) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    const result = await session.sock.sendMessage(jid, {
        text,
        ...options
    });

    // إذا تم تمرير userId، قم بتحديث الرسالة
    if (options.userId && result.key.id) {
        try {
            await getSharedPrismaClient().whatsAppMessage.upsert({
                where: { messageId: result.key.id },
                update: { senderId: options.userId },
                create: {
                    sessionId,
                    remoteJid: jid,
                    messageId: result.key.id,
                    fromMe: true,
                    messageType: 'TEXT',
                    content: text,
                    timestamp: new Date(),
                    senderId: options.userId,
                    status: 'SENT'
                }
            });
        } catch (e) {
            console.error('Failed to save senderId for message:', e);
        }
    }

    return result;
}

/**
 * إرسال رسالة وسائط
 */
async function sendMediaMessage(sessionId, to, media, options = {}) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    const result = await session.sock.sendMessage(jid, media, options);

    // إذا تم تمرير userId، قم بتحديث الرسالة
    if (options.userId && result.key.id) {
        try {
            await getSharedPrismaClient().whatsAppMessage.upsert({
                where: { messageId: result.key.id },
                update: { senderId: options.userId },
                create: {
                    sessionId,
                    remoteJid: jid,
                    messageId: result.key.id,
                    fromMe: true,
                    messageType: 'IMAGE', // افتراضي، سيتم تحديثه لاحقاً
                    timestamp: new Date(),
                    senderId: options.userId,
                    status: 'SENT'
                }
            });
        } catch (e) {
            console.error('Failed to save senderId for media message:', e);
        }
    }

    return result;
}

/**
 * تحديد الرسائل كمقروءة
 */
async function markAsRead(sessionId, remoteJid, messageKeys) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    try {
        if (typeof session.sock.readMessages === 'function') {
            await session.sock.readMessages(messageKeys);
        } else if (typeof session.sock.chatModify === 'function') {
            // For chatModify we need the last message key usually
            // If messageKeys is passed, we can use the last one
            const lastKey = messageKeys[messageKeys.length - 1];
            if (lastKey) {
                await session.sock.chatModify({
                    markRead: true,
                    lastMessages: [{ key: lastKey }]
                }, remoteJid);
            }
        }
    } catch (e) {
        console.warn('Failed to mark read on socket:', e);
    }

    // تحديث قاعدة البيانات
    await getSharedPrismaClient().whatsAppContact.updateMany({
        where: {
            sessionId,
            jid: remoteJid
        },
        data: {
            unreadCount: 0
        }
    });
}

/**
 * إرسال حالة الكتابة
 */
async function sendTyping(sessionId, to, isTyping = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') return;

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    await session.sock.sendPresenceUpdate(isTyping ? 'composing' : 'paused', jid);
}

/**
 * تعديل رسالة
 */
async function editMessage(sessionId, to, key, newText) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    await session.sock.sendMessage(jid, {
        text: newText,
        edit: key
    });
}

/**
 * حذف رسالة (للجميع)
 */
async function deleteMessage(sessionId, to, key) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    await session.sock.sendMessage(jid, {
        delete: key
    });
}

/**
 * إعادة توجيه رسالة
 */
async function forwardMessage(sessionId, to, message) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    await session.sock.sendMessage(jid, {
        forward: message
    });
}

/**
 * أرشفة/إلغاء أرشفة محادثة
 */
async function archiveChat(sessionId, jid, archive = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ archive }, jid);
}

/**
 * تثبيت/إلغاء تثبيت محادثة
 */
async function pinChat(sessionId, jid, pin = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ pin }, jid);
}

/**
 * كتم/إلغاء كتم محادثة
 */
async function muteChat(sessionId, jid, mute = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    // mute for 8 hours if true, or unmute (null)
    const muteTime = mute ? 8 * 60 * 60 * 1000 : null;
    await session.sock.chatModify({ mute: muteTime }, jid);
}

/**
 * تحديد كغير مقروء
 */
async function markChatUnread(sessionId, jid, unread = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ markRead: !unread }, jid);
}

/**
 * إرسال تفاعل (Reaction)
 */
async function sendReaction(sessionId, to, key, emoji) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    await session.sock.sendMessage(jid, {
        react: {
            text: emoji,
            key: key
        }
    });
}

/**
 * الحصول على جلسة نشطة
 */
function getSession(sessionId) {
    return activeSessions.get(sessionId);
}

/**
 * الحصول على كل الجلسات النشطة لشركة
 */
function getCompanySessions(companyId) {
    const sessions = [];
    for (const [id, session] of activeSessions) {
        if (session.companyId === companyId) {
            sessions.push({
                sessionId: id,
                status: session.status,
                phoneNumber: session.phoneNumber,
                qrCode: session.qrCode
            });
        }
    }
    return sessions;
}

/**
 * إغلاق جلسة
 */
async function closeSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (session) {
        try {
            await session.sock.logout();
        } catch (e) {
            // تجاهل الخطأ
        }
        activeSessions.delete(sessionId);
    }

    // تحديث قاعدة البيانات
    await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: {
                status: 'DISCONNECTED',
                lastDisconnectedAt: new Date()
            }
        });
    }, 5);
}

/**
 * حذف جلسة نهائياً
 */
async function deleteSession(sessionId) {
    await closeSession(sessionId);

    // حذف ملفات الجلسة
    const sessionPath = getSessionPath(sessionId);
    try {
        await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (e) {
        // تجاهل الخطأ
    }

    // حذف من قاعدة البيانات
    await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.whatsAppSession.delete({
            where: { id: sessionId }
        });
    }, 5);
}



/**
 * استعادة الجلسات عند بدء السيرفر
 */
async function restoreAllSessions() {
    try {
        console.log('🔄 Restoring WhatsApp sessions...');

        await initSessionsDirectory();

        // جلب الجلسات النشطة من قاعدة البيانات
        const sessions = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            if (!prisma || !prisma.whatsAppSession) {
                throw new Error('Prisma client not initialized');
            }
            return await prisma.whatsAppSession.findMany({
                where: {
                    status: {
                        in: ['CONNECTED', 'DISCONNECTED']
                    }
                }
            });
        }, 'WhatsAppManager', 7);

        for (const session of sessions) {
            try {
                await createSession(session.id, session.companyId);
                console.log(`✅ Restored session: ${session.id}`);
            } catch (error) {
                console.error(`❌ Failed to restore session ${session.id}:`, error);
            }
        }

        console.log(`📱 Restored ${sessions.length} WhatsApp sessions`);
    } catch (error) {
        console.error('❌ Error restoring sessions:', error);
    }
}



/**
 * أرشفة/ إلغاء أرشفة محادثة
 */
async function archiveChat(sessionId, jid, archive = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ archive }, jid);
}

/**
 * تثبيت/إلغاء تثبيت محادثة
 */
async function pinChat(sessionId, jid, pin = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ pin }, jid);
}

/**
 * كتم/إلغاء كتم محادثة
 */
async function muteChat(sessionId, jid, mute = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    // mute for 8 hours if true, or unmute (null)
    const muteTime = mute ? 8 * 60 * 60 * 1000 : null;
    await session.sock.chatModify({ mute: muteTime }, jid);
}

/**
 * تحديد كغير مقروء
 */
async function markChatUnread(sessionId, jid, unread = true) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    await session.sock.chatModify({ markRead: !unread }, jid);
}

/**
 * مسح محتوى المحادثة
 */
async function clearChat(sessionId, jid) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    // Baileys uses chatModify with delete: true and lastMessages to clear chat
    await session.sock.chatModify({
        delete: true,
        lastMessages: [{
            key: { remoteJid: jid, fromMe: true, id: 'AAA' },
            messageTimestamp: Math.floor(Date.now() / 1000)
        }]
    }, jid);
}

/**
 * إرسال تفاعل (Reaction)
 */
async function sendReaction(sessionId, to, key, emoji) {
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'connected') {
        throw new Error('Session not connected');
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    await session.sock.sendMessage(jid, {
        react: {
            text: emoji,
            key: key
        }
    });
}

/**
 * تحديث أو إنشاء جهة اتصال (Public)
 */
async function updateContact(sessionId, remoteJid, msg, sock, options = {}) {
    return await updateOrCreateContact(sessionId, remoteJid, msg, sock, options);
}

/**
 * الحصول على جلسة نشطة
 */
function getSession(sessionId) {
    return activeSessions.get(sessionId);
}

/**
 * الحصول على كل الجلسات النشطة لشركة
 */
function getCompanySessions(companyId) {
    const sessions = [];
    for (const [id, session] of activeSessions) {
        if (session.companyId === companyId) {
            sessions.push({
                sessionId: id,
                status: session.status,
                phoneNumber: session.phoneNumber,
                qrCode: session.qrCode
            });
        }
    }
    return sessions;
}

/**
 * إغلاق جلسة
 */
async function closeSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (session) {
        try {
            await session.sock.logout();
        } catch (e) {
            // تجاهل الخطأ
        }
        activeSessions.delete(sessionId);
    }

    // تحديث قاعدة البيانات
    await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: {
                status: 'DISCONNECTED',
                lastDisconnectedAt: new Date()
            }
        });
    }, 5);
}

/**
 * حذف جلسة نهائياً
 */
async function deleteSession(sessionId) {
    await closeSession(sessionId);

    // حذف ملفات الجلسة
    const sessionPath = getSessionPath(sessionId);
    try {
        await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (e) {
        // تجاهل الخطأ
    }

    // حذف من قاعدة البيانات
    await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.whatsAppSession.delete({
            where: { id: sessionId }
        });
    }, 5);
}

/**
 * تسجيل حدث
 */
async function logEvent(sessionId, companyId, eventType, eventData, level = 'info') {
    try {
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();

            // Check if the model exists before trying to use it
            if (!prisma.whatsAppEventLog) {
                // Model missing from schema, log to console instead
                if (process.env.NODE_ENV === 'development') {
                    console.log(`📝 [WhatsApp Event] ${eventType} (session: ${sessionId}):`, eventData);
                }
                return null;
            }

            return await prisma.whatsAppEventLog.create({
                data: {
                    sessionId,
                    companyId,
                    eventType,
                    eventData: JSON.stringify(eventData),
                    level
                }
            });
        }, 3);
    } catch (error) {
        if (isPermissionError(error)) {
            // Silently handle permission errors - they're expected if DB user lacks INSERT permissions
            // Only log in development mode
            if (process.env.NODE_ENV === 'development') {
                console.warn(`⚠️ [DB-PERMISSION] Cannot log WhatsApp event: ${getPermissionErrorMessage(error)}`);
            }
        } else {
            console.error('❌ Error logging event:', error);
        }
    }
}

/**
 * استعادة الجلسات عند بدء السيرفر
 */
async function restoreAllSessions() {
    try {
        console.log('🔄 Restoring WhatsApp sessions...');

        await initSessionsDirectory();

        // جلب الجلسات النشطة من قاعدة البيانات
        const sessions = await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            if (!prisma || !prisma.whatsAppSession) {
                throw new Error('Prisma client not initialized');
            }
            return await prisma.whatsAppSession.findMany({
                where: {
                    status: {
                        in: ['CONNECTED', 'DISCONNECTED']
                    }
                }
            });
        }, 'WhatsAppManager', 7);

        for (const session of sessions) {
            try {
                await createSession(session.id, session.companyId);
                console.log(`✅ Restored session: ${session.id}`);
            } catch (error) {
                console.error(`❌ Failed to restore session ${session.id}:`, error);
            }
        }

        console.log(`📱 Restored ${sessions.length} WhatsApp sessions`);
    } catch (error) {
        console.error('❌ Error restoring sessions:', error);
    }
}


/**
 * إنشاء مجموعة جديدة
 */
async function createGroup(sessionId, subject, participants) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const group = await session.sock.groupCreate(subject, participants);
        console.log(`👥 Group created: ${group.id}`);
        return group;
    } catch (error) {
        console.error('❌ Error creating group:', error);
        throw error;
    }
}

/**
 * تحديث المشاركين في المجموعة (إضافة، حذف، ترقية، خفض رتبة)
 * action: 'add' | 'remove' | 'promote' | 'demote'
 */
async function updateGroupParticipants(sessionId, jid, participants, action) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const response = await session.sock.groupParticipantsUpdate(jid, participants, action);
        console.log(`👥 Group participants updated (${action}): ${jid}`);
        return response;
    } catch (error) {
        console.error(`❌ Error updating group participants (${action}):`, error);
        throw error;
    }
}

/**
 * جلب بيانات المجموعة
 */
async function getGroupMetadata(sessionId, jid) {
    console.log(`🔍 Getting group metadata for ${jid} using session ${sessionId}`);
    const session = getSession(sessionId);

    if (!session) {
        console.error(`❌ Session not found: ${sessionId}`);
        throw new Error('Session not found');
    }

    if (!session.sock) {
        console.error(`❌ Session socket not initialized for: ${sessionId}`);
        throw new Error('Session socket not initialized');
    }

    try {
        console.log(`📡 Calling groupMetadata for ${jid}...`);
        const metadata = await session.sock.groupMetadata(jid);
        console.log(`✅ Group metadata retrieved for ${jid}`);
        return metadata;
    } catch (error) {
        console.error(`❌ Error getting group metadata for ${jid}:`, error);
        // Log more details if available
        if (error.data) console.error('Error data:', error.data);
        throw error;
    }
}

/**
 * تحديث اسم المجموعة
 */
async function updateGroupSubject(sessionId, jid, subject) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupSubjectUpdate(jid, subject);
        console.log(`📝 Group subject updated: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating group subject:', error);
        throw error;
    }
}

/**
 * تحديث وصف المجموعة
 */
async function updateGroupDescription(sessionId, jid, description) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupUpdateDescription(jid, description);
        console.log(`📝 Group description updated: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating group description:', error);
        throw error;
    }
}

/**
 * تحديث إعدادات المجموعة
 * settings: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'
 */
async function updateGroupSettings(sessionId, jid, settings) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupSettingUpdate(jid, settings);
        console.log(`⚙️ Group settings updated: ${jid} -> ${settings}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating group settings:', error);
        throw error;
    }
}

/**
 * مغادرة المجموعة
 */
async function leaveGroup(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupLeave(jid);
        console.log(`👋 Left group: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error leaving group:', error);
        throw error;
    }
}

/**
 * الحصول على رابط دعوة المجموعة
 */
async function getGroupInviteCode(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const code = await session.sock.groupInviteCode(jid);
        return code;
    } catch (error) {
        console.error('❌ Error getting group invite code:', error);
        throw error;
    }
}

/**
 * إلغاء رابط دعوة المجموعة
 */
async function revokeGroupInviteCode(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const code = await session.sock.groupRevokeInvite(jid);
        return code;
    } catch (error) {
        console.error('❌ Error revoking group invite code:', error);
        throw error;
    }
}

/**
 * الحصول على بيانات المجموعة (المشاركين، الوصف، الإعدادات)
 */
async function getGroupMetadata(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const metadata = await session.sock.groupMetadata(jid);
        return metadata;
    } catch (error) {
        console.error('❌ Error getting group metadata:', error);
        throw error;
    }
}

/**
 * حظر جهة اتصال
 */
async function blockContact(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateBlockStatus(jid, 'block');
        console.log(`🚫 Blocked contact: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error blocking contact:', error);
        throw error;
    }
}

/**
 * إلغاء حظر جهة اتصال
 */
async function unblockContact(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateBlockStatus(jid, 'unblock');
        console.log(`✅ Unblocked contact: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error unblocking contact:', error);
        throw error;
    }
}

/**
 * تحديث حالة الملف الشخصي (About)
 */
async function updateProfileStatus(sessionId, status) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateProfileStatus(status);
        console.log(`📝 Profile status updated`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating profile status:', error);
        throw error;
    }
}

/**
 * تحديث اسم الملف الشخصي (Push Name)
 */
async function updateProfileName(sessionId, name) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateProfileName(name);
        console.log(`📝 Profile name updated: ${name}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating profile name:', error);
        throw error;
    }
}

/**
 * تحديث صورة الملف الشخصي
 */
async function updateProfilePicture(sessionId, jid, content) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateProfilePicture(jid, content);
        console.log(`🖼️ Profile picture updated for: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating profile picture:', error);
        throw error;
    }
}

/**
 * التحقق من وجود الرقم على واتساب
 */
async function onWhatsApp(sessionId, number) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const [result] = await session.sock.onWhatsApp(number);
        return result;
    } catch (error) {
        console.error('❌ Error checking number on WhatsApp:', error);
        throw error;
    }
}

// ==================== Business Profile Features ====================

/**
 * الحصول على ملف الأعمال
 */
async function getBusinessProfile(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const profile = await session.sock.getBusinessProfile(session.sock.user.id);
        return profile;
    } catch (error) {
        console.error('❌ Error getting business profile:', error);
        throw error;
    }
}

/**
 * تعيين ملف الأعمال
 */
async function setBusinessProfile(sessionId, profileData) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.setBusinessProfile(profileData);
        console.log('✅ Business profile set');
        return { success: true };
    } catch (error) {
        console.error('❌ Error setting business profile:', error);
        throw error;
    }
}

/**
 * تحديث ملف الأعمال
 */
async function updateBusinessProfile(sessionId, profileData) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.updateBusinessProfile(profileData);
        console.log('✅ Business profile updated');
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating business profile:', error);
        throw error;
    }
}

/**
 * الحصول على ساعات العمل
 */
async function getBusinessHours(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const hours = await session.sock.getBusinessHours(session.sock.user.id);
        return hours;
    } catch (error) {
        console.error('❌ Error getting business hours:', error);
        throw error;
    }
}

/**
 * تعيين ساعات العمل
 */
async function setBusinessHours(sessionId, hours) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.setBusinessHours(hours);
        console.log('✅ Business hours set');
        return { success: true };
    } catch (error) {
        console.error('❌ Error setting business hours:', error);
        throw error;
    }
}

// ==================== Broadcast Features ====================

/**
 * إرسال رسالة بث جماعي
 */
async function sendBroadcast(sessionId, jids, message) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const results = await session.sock.sendBroadcast(jids, message);
        console.log(`📢 Broadcast sent to ${jids.length} recipients`);
        return results;
    } catch (error) {
        console.error('❌ Error sending broadcast:', error);
        throw error;
    }
}

/**
 * إنشاء قائمة بث
 */
async function createBroadcastList(sessionId, name, jids) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const list = await session.sock.createBroadcastList(name, jids);
        console.log(`📢 Broadcast list created: ${name}`);
        return list;
    } catch (error) {
        console.error('❌ Error creating broadcast list:', error);
        throw error;
    }
}

/**
 * جلب قوائم البث
 */
async function getBroadcastLists(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const lists = await session.sock.getBroadcastLists();
        return lists;
    } catch (error) {
        console.error('❌ Error getting broadcast lists:', error);
        throw error;
    }
}

// ==================== Labels Features ====================

/**
 * إضافة علامة للمحادثة
 */
async function labelChat(sessionId, jid, labelId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.labelChat(jid, labelId);
        console.log(`🏷️ Chat labeled: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error labeling chat:', error);
        throw error;
    }
}

/**
 * جلب العلامات
 */
async function getLabels(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const labels = await session.sock.getLabels();
        return labels;
    } catch (error) {
        console.error('❌ Error getting labels:', error);
        throw error;
    }
}

/**
 * إنشاء علامة جديدة
 */
async function createLabel(sessionId, name, color) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const label = await session.sock.createLabel(name, color);
        console.log(`🏷️ Label created: ${name}`);
        return label;
    } catch (error) {
        console.error('❌ Error creating label:', error);
        throw error;
    }
}

/**
 * حذف علامة
 */
async function deleteLabel(sessionId, labelId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.deleteLabel(labelId);
        console.log(`🏷️ Label deleted: ${labelId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting label:', error);
        throw error;
    }
}

// ==================== Starred Messages Features ====================

/**
 * تمييز رسالة
 */
async function starMessage(sessionId, key) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.starMessage(key);
        console.log('⭐ Message starred');
        return { success: true };
    } catch (error) {
        console.error('❌ Error starring message:', error);
        throw error;
    }
}

/**
 * إلغاء تمييز رسالة
 */
async function unstarMessage(sessionId, key) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.unstarMessage(key);
        console.log('⭐ Message unstarred');
        return { success: true };
    } catch (error) {
        console.error('❌ Error unstarring message:', error);
        throw error;
    }
}

/**
 * جلب الرسائل المميزة
 */
async function getStarredMessages(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const messages = await session.sock.getStarredMessages(jid);
        return messages;
    } catch (error) {
        console.error('❌ Error getting starred messages:', error);
        throw error;
    }
}

// ==================== Privacy Features ====================

/**
 * جلب قائمة المحظورين
 */
async function fetchBlocklist(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const blocklist = await session.sock.fetchBlocklist();
        return blocklist;
    } catch (error) {
        console.error('❌ Error fetching blocklist:', error);
        throw error;
    }
}

/**
 * جلب إعدادات الخصوصية
 */
async function fetchPrivacySettings(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const settings = await session.sock.fetchPrivacySettings();
        return settings;
    } catch (error) {
        console.error('❌ Error fetching privacy settings:', error);
        throw error;
    }
}

/**
 * تعيين إعدادات الخصوصية
 */
async function setPrivacy(sessionId, settings) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.setPrivacy(settings);
        console.log('🔒 Privacy settings updated');
        return { success: true };
    } catch (error) {
        console.error('❌ Error setting privacy:', error);
        throw error;
    }
}

// ==================== Advanced Group Features ====================

/**
 * جلب جميع المجموعات التي يشارك فيها المستخدم
 */
async function groupFetchAllParticipating(sessionId) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const groups = await session.sock.groupFetchAllParticipating();
        return groups;
    } catch (error) {
        console.error('❌ Error fetching all groups:', error);
        throw error;
    }
}

/**
 * تفعيل/تعطيل الرسائل المؤقتة في المجموعة
 */
async function groupToggleEphemeral(sessionId, jid, ephemeral) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupToggleEphemeral(jid, ephemeral);
        console.log(`⏱️ Group ephemeral ${ephemeral ? 'enabled' : 'disabled'}: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error toggling group ephemeral:', error);
        throw error;
    }
}

/**
 * تحديث صورة المجموعة
 */
async function groupUpdatePicture(sessionId, jid, picture) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupUpdatePicture(jid, picture);
        console.log(`🖼️ Group picture updated: ${jid}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating group picture:', error);
        throw error;
    }
}

/**
 * قبول دعوة للمجموعة
 */
async function groupInviteAccept(sessionId, inviteCode) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const result = await session.sock.groupInviteAccept(inviteCode);
        console.log('✅ Group invite accepted');
        return result;
    } catch (error) {
        console.error('❌ Error accepting group invite:', error);
        throw error;
    }
}

/**
 * رفض دعوة للمجموعة
 */
async function groupInviteReject(sessionId, inviteCode) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.groupInviteReject(inviteCode);
        console.log('❌ Group invite rejected');
        return { success: true };
    } catch (error) {
        console.error('❌ Error rejecting group invite:', error);
        throw error;
    }
}

/**
 * معلومات عن رابط الدعوة
 */
async function groupInviteInfo(sessionId, inviteCode) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const info = await session.sock.groupInviteInfo(inviteCode);
        return info;
    } catch (error) {
        console.error('❌ Error getting group invite info:', error);
        throw error;
    }
}

// ==================== Status Features ====================

/**
 * الحصول على حالة مستخدم معين
 */
async function getStatus(sessionId, jid) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const status = await session.sock.getStatus(jid);
        return status;
    } catch (error) {
        console.error('❌ Error getting status:', error);
        throw error;
    }
}

/**
 * تعيين حالة المستخدم
 */
async function setStatus(sessionId, status) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        await session.sock.setStatus(status);
        console.log('✅ Status set');
        return { success: true };
    } catch (error) {
        console.error('❌ Error setting status:', error);
        throw error;
    }
}

// ==================== URL Info ====================

/**
 * الحصول على معلومات رابط
 */
async function getUrlInfo(sessionId, url) {
    const session = getSession(sessionId);
    if (!session) throw new Error('Session not found');

    try {
        const info = await session.sock.getUrlInfo(url);
        return info;
    } catch (error) {
        console.error('❌ Error getting URL info:', error);
        throw error;
    }
}




/**
 * مزامنة الملف الشخصي (جلب من واتساب وحفظ في قاعدة البيانات)
 */
async function syncProfile(sessionId) {
    const session = getSession(sessionId);
    if (!session || !session.sock?.user) {
        console.warn(`⚠️ Cannot sync profile for session ${sessionId}: Session not ready`);
        return null;
    }

    const jid = session.sock.user.id;
    const cleanJid = jid.split(':')[0] + '@s.whatsapp.net';

    try {
        console.log(`🔄 Syncing profile for session ${sessionId}...`);

        // 1. Get Status
        let status = '';
        try {
            const statusData = await session.sock.fetchStatus(cleanJid);
            status = statusData?.status || '';
        } catch (err) {
            console.warn(`⚠️ Failed to fetch status for ${sessionId}:`, err.message);
        }

        // 2. Get Profile Picture
        let profilePicUrl = null;
        try {
            profilePicUrl = await session.sock.profilePictureUrl(cleanJid, 'image');
        } catch (err) {
            // It's common to not have a profile pic or fail to fetch it
        }

        // 3. Get Name
        const name = session.sock.user.name || session.sock.user.notify || '';

        // 4. Update Database
        await safeQuery(async () => {
            const prisma = getSharedPrismaClient();
            return await prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: {
                    profileName: name,
                    profileStatus: status,
                    profilePictureUrl: profilePicUrl
                }
            });

        });

        console.log(`✅ Profile synced for session ${sessionId}`);

        return {
            name,
            status,
            profilePicUrl
        };
    } catch (error) {
        console.error('❌ Error syncing profile:', error);
        throw error;
    }
}

/**
 * الحصول على الملف الشخصي (من قاعدة البيانات)
 */
async function getProfile(sessionId) {
    // Try to get from database first
    const sessionData = await safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.whatsAppSession.findUnique({
            where: { id: sessionId },
            select: {
                profileName: true,
                profileStatus: true,
                profilePictureUrl: true
            }
        });

        if (sessionData && (sessionData.profileName || sessionData.profileStatus)) {
            return {
                name: sessionData.profileName,
                status: sessionData.profileStatus,
                profilePicUrl: sessionData.profilePictureUrl
            };
        }

        // If not in DB, try to sync
        return await syncProfile(sessionId);
    });

    return sessionData;
}

/**
 * الحصول على كل الجلسات النشطة (للتصحيح)
 */
function getAllSessions() {
    const sessions = {};
    for (const [id, session] of activeSessions) {
        sessions[id] = {
            status: session.status,
            hasSocket: !!session.sock,
            isDeleted: false
        };
    }
    return sessions;
}

/**
 * قطع اتصال كل الجلسات (عند إيقاف السيرفر)
 */
async function disconnectAllSessions() {
    console.log('🛑 Disconnecting all WhatsApp sessions...');
    for (const [sessionId, session] of activeSessions) {
        try {
            if (session.sock) {
                await session.sock.end(new Error('Server shutting down'));
            }
        } catch (error) {
            console.error(`❌ Error disconnecting session ${sessionId}:`, error);
        }
    }
    activeSessions.clear();
    console.log('✅ All sessions disconnected');
}

module.exports = {
    // Core
    createSession,
    getSession,
    deleteSession,
    closeSession,
    getAllSessions,
    disconnectAllSessions,

    // Connection
    reconnectSession,

    // Messages
    sendMessage: sendTextMessage,
    sendMedia: sendMediaMessage,
    markAsRead,
    sendReaction,
    editMessage,
    deleteMessage,
    forwardMessage,
    sendTyping,

    // Chats
    archiveChat,
    pinChat,
    muteChat,
    markChatUnread,
    clearChat,

    // Contacts
    updateContact,
    blockContact,
    unblockContact,

    // Groups
    createGroup,
    getGroupMetadata,
    updateGroupSubject,
    updateGroupDescription,
    updateGroupSettings,
    updateGroupParticipants,
    leaveGroup,
    getGroupInviteCode,
    revokeGroupInviteCode,
    groupFetchAllParticipating,
    groupToggleEphemeral,
    groupUpdatePicture,
    groupInviteAccept,
    groupInviteReject,
    groupInviteInfo,

    // Business
    getBusinessProfile,
    setBusinessProfile,
    updateBusinessProfile,
    getBusinessHours,
    setBusinessHours,
    getProfile,
    syncProfile,

    // Broadcast
    sendBroadcast,
    createBroadcastList,
    getBroadcastLists,

    // Labels
    labelChat,
    getLabels,
    createLabel,
    deleteLabel,

    // Starred Messages
    starMessage,
    unstarMessage,
    getStarredMessages,

    // Privacy
    fetchBlocklist,
    fetchPrivacySettings,
    setPrivacy,
    checkNumber: onWhatsApp, // Export as checkNumber to match controller usage or just onWhatsApp
    onWhatsApp,

    // Status
    getStatus,
    setStatus,

    // URL Info
    getUrlInfo,

    // System
    // System
    restoreAllSessions,
    logEvent
};


