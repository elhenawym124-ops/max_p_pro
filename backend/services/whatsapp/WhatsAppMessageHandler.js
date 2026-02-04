/**
 * 💬 WhatsApp Message Handler Service
 * معالجة إرسال واستقبال الرسائل
 * 
 * المميزات:
 * - إرسال رسائل نصية ووسائط
 * - معالجة الردود والاقتباسات
 * - إدارة حالة الرسائل
 * - دعم الردود السريعة
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues // ❌ Removed to prevent early loading issues
const WhatsAppManager = require('./WhatsAppManager');
const WhatsAppSyncService = require('./WhatsAppSyncService');
const socketService = require('../socketService');
const getIO = () => socketService.getIO();
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');

/**
 * إرسال رسالة نصية
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {string} text - نص الرسالة
 * @param {object} options - خيارات إضافية
 */
async function sendText(sessionId, to, text, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        console.log(`🔍 [DEBUG] sendText: Retrieving session ${sessionId}`, {
            exists: !!session,
            status: session?.status,
            isConnected: session?.status === 'connected'
        });

        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        // إرسال حالة الكتابة
        await WhatsAppManager.sendTyping(sessionId, jid, true);

        // تأخير بسيط لمحاكاة الكتابة
        await delay(Math.min(text.length * 20, 2000));

        // إرسال الرسالة
        const messageOptions = {
            text
        };

        // إضافة الاقتباس إذا وجد
        if (options.quotedMessageId) {
            messageOptions.quoted = {
                key: {
                    remoteJid: jid,
                    id: options.quotedMessageId
                }
            };
        }

        const result = await session.sock.sendMessage(jid, messageOptions);

        // إيقاف حالة الكتابة
        await WhatsAppManager.sendTyping(sessionId, jid, false);

        // حفظ الرسالة في قاعدة البيانات
        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'TEXT',
            content: text,
            quotedMessageId: options.quotedMessageId,
            interactiveData: options.interactiveData ? JSON.stringify(options.interactiveData) : null,
            isAIResponse: options.isAIResponse || false,
            aiConfidence: options.aiConfidence
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending text message:', error);
        throw error;
    }
}

/**
 * إرسال صورة
 */
async function sendImage(sessionId, to, imageSource, caption = '', options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            image: imageSource.buffer || { url: imageSource.filePath || imageSource.url },
            caption,
            mimetype: imageSource.mimetype || 'image/jpeg'
        };

        if (options.quotedMessageId) {
            messageOptions.quoted = {
                key: { remoteJid: jid, id: options.quotedMessageId }
            };
        }

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'IMAGE',
            content: caption,
            mediaUrl: imageSource.url,
            mediaType: 'image',
            mediaMimeType: imageSource.mimetype,
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending image:', error);
        throw error;
    }
}

/**
 * إرسال فيديو
 */
async function sendVideo(sessionId, to, videoSource, caption = '', options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            video: videoSource.buffer || { url: videoSource.filePath || videoSource.url },
            caption,
            mimetype: videoSource.mimetype || 'video/mp4'
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'VIDEO',
            content: caption,
            mediaUrl: videoSource.url,
            mediaType: 'video',
            mediaMimeType: videoSource.mimetype
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending video:', error);
        throw error;
    }
}

/**
 * إرسال ملف صوتي
 */
async function sendAudio(sessionId, to, audioSource, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            audio: audioSource.buffer || { url: audioSource.filePath || audioSource.url },
            mimetype: audioSource.mimetype || 'audio/mp4',
            ptt: options.ptt || false // voice note
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'AUDIO',
            mediaUrl: audioSource.url,
            mediaType: 'audio',
            mediaMimeType: audioSource.mimetype
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending audio:', error);
        throw error;
    }
}

/**
 * إرسال ملف/مستند
 */
async function sendDocument(sessionId, to, documentSource, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            document: documentSource.buffer || { url: documentSource.filePath || documentSource.url },
            mimetype: documentSource.mimetype || 'application/pdf',
            fileName: documentSource.fileName || 'document',
            caption: options.caption
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'DOCUMENT',
            content: options.caption,
            mediaUrl: documentSource.url,
            mediaType: 'document',
            mediaMimeType: documentSource.mimetype,
            mediaFileName: documentSource.fileName
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending document:', error);
        throw error;
    }
}

/**
 * إرسال موقع
 */
async function sendLocation(sessionId, to, latitude, longitude, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            location: {
                degreesLatitude: latitude,
                degreesLongitude: longitude,
                name: options.name,
                address: options.address
            }
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'LOCATION',
            content: `${latitude},${longitude}`
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending location:', error);
        throw error;
    }
}

/**
 * إرسال جهة اتصال
 */
async function sendContact(sessionId, to, contact, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contact.fullName}
TEL;type=CELL;type=VOICE;waid=${contact.phoneNumber}:+${contact.phoneNumber}
END:VCARD`;

        const messageOptions = {
            contacts: {
                displayName: contact.fullName,
                contacts: [{ vcard }]
            }
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'CONTACT',
            content: contact.fullName
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending contact:', error);
        throw error;
    }
}

/**
 * إرسال تفاعل (Reaction)
 */
async function sendReaction(sessionId, to, messageId, emoji) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const result = await session.sock.sendMessage(jid, {
            react: {
                text: emoji,
                key: {
                    remoteJid: jid,
                    id: messageId
                }
            }
        });

        return result;
    } catch (error) {
        console.error('❌ Error sending reaction:', error);
        throw error;
    }
}

/**
 * إرسال رسالة بأزرار تفاعلية (Interactive Buttons)
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {string} text - نص الرسالة
 * @param {Array} buttons - مصفوفة الأزرار [{id, text}]
 * @param {object} options - خيارات إضافية
 */
async function sendButtons(sessionId, to, text, buttons, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        // التحقق من عدد الأزرار (حد أقصى 3)
        if (buttons.length > 3) {
            throw new Error('الحد الأقصى للأزرار هو 3');
        }

        // تحويل الأزرار إلى تنسيق Baileys
        const buttonRows = buttons.map(btn => ({
            id: btn.id || btn.text,
            title: btn.text
        }));

        const messageOptions = {
            text,
            buttons: buttonRows,
            footer: options.footer,
            headerType: options.headerType || 1 // 1 = text
        };

        // إضافة header إذا كان موجود
        if (options.header) {
            messageOptions.title = options.header;
        }

        const result = await session.sock.sendMessage(jid, messageOptions);

        // حفظ الرسالة في قاعدة البيانات
        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'BUTTONS',
            content: text,
            interactiveData: JSON.stringify({ buttons, footer: options.footer, header: options.header }),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending buttons:', error);
        throw error;
    }
}

/**
 * إرسال رسالة بقائمة (List)
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {string} text - نص الرسالة
 * @param {string} buttonText - نص الزر الرئيسي
 * @param {Array} sections - مصفوفة الأقسام [{title, rows: [{id, title, description}]}]
 * @param {object} options - خيارات إضافية
 */
async function sendList(sessionId, to, text, buttonText, sections, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        // التحقق من عدد الأقسام (حد أقصى 10)
        if (sections.length > 10) {
            throw new Error('الحد الأقصى للأقسام هو 10');
        }

        // التحقق من عدد الصفوف في كل قسم (حد أقصى 10)
        for (const section of sections) {
            if (section.rows && section.rows.length > 10) {
                throw new Error('الحد الأقصى للصفوف في كل قسم هو 10');
            }
        }

        const messageOptions = {
            text,
            sections,
            buttonText,
            title: options.title || text,
            footer: options.footer,
            description: options.description
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        // حفظ الرسالة في قاعدة البيانات
        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'LIST',
            content: text,
            interactiveData: JSON.stringify({ buttonText, sections, title: options.title, footer: options.footer }),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending list:', error);
        throw error;
    }
}

/**
 * إرسال منتج (Product)
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {object} product - بيانات المنتج
 * @param {object} options - خيارات إضافية
 */
async function sendProduct(sessionId, to, product, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        // بناء رسالة المنتج
        const messageOptions = {
            text: `*${product.name}*\n\n${product.description || ''}\n\n💰 السعر: ${product.price || 'غير محدد'}`,
            footer: options.footer || 'منتج من متجرنا'
        };

        // إضافة صورة المنتج إذا كانت موجودة
        if (product.imageUrl) {
            messageOptions.image = { url: product.imageUrl };
        }

        // إضافة أزرار تفاعلية
        if (options.buttons && options.buttons.length > 0) {
            const buttonRows = options.buttons.map(btn => ({
                id: btn.id || btn.text,
                title: btn.text
            }));
            messageOptions.buttons = buttonRows;
        }

        const result = await session.sock.sendMessage(jid, messageOptions);

        // حفظ الرسالة في قاعدة البيانات
        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'PRODUCT',
            content: `${product.name} - ${product.price || ''}`,
            mediaUrl: product.imageUrl,
            interactiveData: JSON.stringify({ product, buttons: options.buttons }),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });



        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending product:', error);
        throw error;
    }
}

/**
 * إرسال رد سريع
 */
async function sendQuickReply(sessionId, to, quickReplyId, variables = {}) {
    try {
        // جلب الرد السريع
        const quickReply = await getSharedPrismaClient().whatsAppQuickReply.findUnique({
            where: { id: quickReplyId }
        });

        if (!quickReply) {
            throw new Error('الرد السريع غير موجود');
        }

        // استبدال المتغيرات
        let content = quickReply.content;
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`{${key}}`, 'g'), value);
        }

        // إرسال الرسالة
        const result = await sendText(sessionId, to, content);

        // تحديث إحصائيات الرد السريع
        await getSharedPrismaClient().whatsAppQuickReply.update({
            where: { id: quickReplyId },
            data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date()
            }
        });

        return result;
    } catch (error) {
        console.error('❌ Error sending quick reply:', error);
        throw error;
    }
}

/**
 * جلب الرسائل من محادثة
 */
async function getMessages(sessionId, remoteJid, options = {}) {
    try {
        const { page = 1, limit = 50, before, after } = options;

        const where = {
            sessionId,
            remoteJid
        };

        if (before) {
            where.timestamp = { lt: new Date(before) };
        }
        if (after) {
            where.timestamp = { gt: new Date(after) };
        }

        const messages = await getSharedPrismaClient().whatsAppMessage.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        });

        const total = await getSharedPrismaClient().whatsAppMessage.count({ where });

        return {
            messages: messages.reverse(),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('❌ Error getting messages:', error);
        throw error;
    }
}

/**
 * حذف رسالة
 */
async function deleteMessage(sessionId, remoteJid, messageId, forEveryone = false) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(remoteJid);

        if (forEveryone) {
            await session.sock.sendMessage(jid, {
                delete: {
                    remoteJid: jid,
                    id: messageId,
                    participant: undefined
                }
            });
        }

        // حذف من قاعدة البيانات
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
            where: { messageId }
        });

        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting message:', error);
        throw error;
    }
}

/**
 * تحديد الرسائل كمقروءة
 */
async function markAsRead(sessionId, remoteJid) {
    try {
        const session = WhatsAppManager.getSession(sessionId);

        // We don't throw error if session is not connected, we just skip socket update
        // and proceed to update database so the UI reflects the read status.

        const jid = formatJid(remoteJid);

        // جلب آخر رسالة غير مقروءة
        const lastMessage = await getSharedPrismaClient().whatsAppMessage.findFirst({
            where: {
                sessionId,
                remoteJid: jid,
                fromMe: false,
                status: { not: 'READ' }
            },
            orderBy: { timestamp: 'desc' }
        });

        if (lastMessage) {
            if (session && session.status === 'connected') {
                try {
                    // محاولة استخدام readMessages أولاً
                    if (typeof session.sock.readMessages === 'function') {
                        await session.sock.readMessages([{
                            remoteJid: jid,
                            id: lastMessage.messageId,
                            fromMe: false
                        }]);
                    }
                    // استخدام chatModify كبديل
                    else if (typeof session.sock.chatModify === 'function') {
                        await session.sock.chatModify({
                            markRead: true,
                            lastMessages: [{
                                key: {
                                    remoteJid: jid,
                                    id: lastMessage.messageId,
                                    fromMe: false
                                }
                            }]
                        }, jid);
                    }
                } catch (sockError) {
                    console.warn('⚠️ Error in socket read/modify, continuing to DB update:', sockError.message);
                }
            }
        }

        // تحديث قاعدة البيانات
        try {
            await getSharedPrismaClient().whatsAppMessage.updateMany({
                where: {
                    sessionId,
                    remoteJid: jid,
                    fromMe: false
                },
                data: { status: 'READ' }
            });
        } catch (updateError) {
            if (isPermissionError(updateError)) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`⚠️ [DB-PERMISSION] Cannot mark WhatsApp messages as read: ${getPermissionErrorMessage(updateError)}`);
                }
            } else {
                throw updateError;
            }
        }

        try {
            await getSharedPrismaClient().whatsAppContact.updateMany({
                where: {
                    sessionId,
                    jid
                },
                data: { unreadCount: 0 }
            });
        } catch (updateError) {
            if (isPermissionError(updateError)) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`⚠️ [DB-PERMISSION] Cannot update WhatsApp contact unread count: ${getPermissionErrorMessage(updateError)}`);
                }
            } else {
                throw updateError;
            }
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error marking as read:', error);
        throw error;
    }
}

/**
 * حفظ رسالة صادرة
 */
async function saveOutgoingMessage(sessionId, remoteJid, data, options = {}) {
    const savedMessage = await getSharedPrismaClient().whatsAppMessage.upsert({
        where: { messageId: data.messageId },
        update: {
            sessionId,
            remoteJid,
            fromMe: true,
            messageType: data.type,
            content: data.content,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            mediaMimeType: data.mediaMimeType,
            mediaFileName: data.mediaFileName,
            quotedMessageId: data.quotedMessageId,
            interactiveData: data.interactiveData,
            status: 'SENT',
            timestamp: new Date(),
            isAIResponse: data.isAIResponse || false,
            aiConfidence: data.aiConfidence,
            updatedAt: new Date()
        },
        create: {
            sessionId,
            remoteJid,
            messageId: data.messageId,
            fromMe: true,
            messageType: data.type,
            content: data.content,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            mediaMimeType: data.mediaMimeType,
            mediaFileName: data.mediaFileName,
            quotedMessageId: data.quotedMessageId,
            interactiveData: data.interactiveData,
            status: 'SENT',
            timestamp: new Date(),
            isAIResponse: data.isAIResponse || false,
            aiConfidence: data.aiConfidence,
            updatedAt: new Date()
        }
    });

    // Emit socket event
    try {
        const io = getIO();
        let companyId = options.companyId;

        if (!companyId) {
            const session = await getSharedPrismaClient().whatsAppSession.findUnique({
                where: { id: sessionId },
                select: { companyId: true }
            });
            companyId = session?.companyId;
        }

        if (companyId) {
            // ✅ SYNC TO MAIN CRM (Persistent Storage)
            try {
                await WhatsAppSyncService.syncMessage(
                    companyId,
                    remoteJid,
                    {
                        type: data.type, // RAW WhatsApp type
                        content: data.content,
                        mediaUrl: data.mediaUrl,
                        mediaType: data.mediaType,
                        mediaMimeType: data.mediaMimeType,
                        mediaFileName: data.mediaFileName,
                        timestamp: new Date(),
                        senderId: options.senderId // Pass if available
                    },
                    false // isIncoming = false
                );
            } catch (syncErr) {
                console.error('Failed to sync outgoing message to CRM:', syncErr);
            }

            console.log(`🔌 [DEBUG] Emitting whatsapp:message:sent to company_${companyId}`, {
                sessionId,
                messageId: savedMessage.id
            });
            io?.to(`company_${companyId}`).emit('whatsapp:message:sent', {
                sessionId,
                message: savedMessage
            });
        }
    } catch (e) {
        console.error('Error emitting socket event:', e);
    }

    return savedMessage;
}

/**
 * تنسيق JID
 */
function formatJid(to) {
    if (!to) return to;
    // Remove device info (e.g. :12) and ensure @s.whatsapp.net
    const bareJid = to.split('@')[0].split(':')[0];
    // Remove non-numeric chars
    const cleaned = bareJid.replace(/\D/g, '');
    return `${cleaned}@s.whatsapp.net`;
}

/**
 * تأخير
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Poll Features ====================

/**
 * إرسال استطلاع
 */
async function sendPoll(sessionId, to, pollData, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            poll: {
                name: pollData.name,
                selectableCount: pollData.selectableCount || 1,
                values: pollData.values || []
            }
        };

        if (options.quotedMessageId) {
            messageOptions.quoted = {
                key: {
                    remoteJid: jid,
                    id: options.quotedMessageId
                }
            };
        }

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'POLL',
            content: pollData.name,
            interactiveData: JSON.stringify(pollData),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending poll:', error);
        throw error;
    }
}

// ==================== Order & Catalog Features ====================

/**
 * إرسال طلب (لحسابات Business)
 */
async function sendOrder(sessionId, to, orderData, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            order: orderData
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'PRODUCT',
            content: `طلب: ${orderData.orderId || ''}`,
            interactiveData: JSON.stringify(orderData),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending order:', error);
        throw error;
    }
}

/**
 * إرسال كتالوج (لحسابات Business)
 */
async function sendCatalog(sessionId, to, catalogData, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            catalog: catalogData
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'PRODUCT',
            content: 'كتالوج المنتجات',
            interactiveData: JSON.stringify(catalogData),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending catalog:', error);
        throw error;
    }
}

/**
 * الحصول على الكتالوج
 */
async function getCatalog(sessionId) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const catalog = await session.sock.getCatalog();
        return catalog;
    } catch (error) {
        console.error('❌ Error getting catalog:', error);
        throw error;
    }
}

/**
 * الحصول على المنتجات
 */
async function getProducts(sessionId, catalogId) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const products = await session.sock.getProducts(catalogId);
        return products;
    } catch (error) {
        console.error('❌ Error getting products:', error);
        throw error;
    }
}

/**
 * الحصول على السلة
 */
async function getCart(sessionId, cartId) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const cart = await session.sock.getCart(cartId);
        return cart;
    } catch (error) {
        console.error('❌ Error getting cart:', error);
        throw error;
    }
}

// ==================== Template Messages ====================

/**
 * إرسال رسالة قالب (لحسابات Business)
 */
async function sendTemplateMessage(sessionId, to, templateId, parameters = {}, options = {}) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const jid = formatJid(to);

        const messageOptions = {
            template: {
                id: templateId,
                params: parameters
            }
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'TEMPLATE',
            content: `Template: ${templateId}`,
            interactiveData: JSON.stringify({ templateId, parameters }),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending template message:', error);
        throw error;
    }
}

/**
 * الحصول على قوالب الرسائل
 */
async function getMessageTemplate(sessionId) {
    try {
        const session = WhatsAppManager.getSession(sessionId);
        if (!session || session.status !== 'connected') {
            throw new Error('الجلسة غير متصلة');
        }

        const templates = await session.sock.getMessageTemplate();
        return templates;
    } catch (error) {
        console.error('❌ Error getting message templates:', error);
        throw error;
    }
}

module.exports = {
    sendText,
    sendImage,
    sendVideo,
    sendAudio,
    sendDocument,
    sendLocation,
    sendContact,
    sendReaction,
    sendQuickReply,
    sendButtons,
    sendList,
    sendProduct,
    getMessages,
    deleteMessage,
    markAsRead,
    formatJid,
    // Poll & Order Features
    sendPoll,
    sendOrder,
    sendCatalog,
    getCatalog,
    getProducts,
    getCart,
    // Template Messages
    sendTemplateMessage,
    getMessageTemplate
};


