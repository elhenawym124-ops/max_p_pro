/**
 * 📱 WhatsApp Controller
 * API endpoints لإدارة WhatsApp
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const fs = require('fs');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const { Prisma } = require('@prisma/client');
const {
    WhatsAppManager,
    WhatsAppMessageHandler,
    WhatsAppMediaHandler,
    WhatsAppAIIntegration
} = require('../services/whatsapp');

// Validate URL to prevent SSRF
const isValidUrl = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 إدارة الجلسات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء جلسة جديدة
 * POST /api/whatsapp/sessions
 */
async function createSession(req, res) {
    try {
        const { companyId } = req.user;
        const { name, aiEnabled = true, autoReply = false, aiMode = 'suggest' } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'اسم الجلسة مطلوب' });
        }

        // التحقق من عدد الجلسات
        const settings = await getSharedPrismaClient().whatsAppSettings.findUnique({
            where: { companyId }
        });

        const maxSessions = settings?.maxSessions || 3;
        const currentSessions = await getSharedPrismaClient().whatsAppSession.count({
            where: { companyId }
        });

        if (currentSessions >= maxSessions) {
            return res.status(400).json({
                error: `لقد وصلت للحد الأقصى من الجلسات (${maxSessions})`
            });
        }

        // إنشاء الجلسة في قاعدة البيانات
        const session = await getSharedPrismaClient().whatsAppSession.create({
            data: {
                companyId,
                name,
                aiEnabled,
                autoReply,
                aiMode,
                status: 'DISCONNECTED',
                updatedAt: new Date()
            }
        });

        // بدء الاتصال
        await WhatsAppManager.createSession(session.id, companyId);

        res.status(201).json({
            success: true,
            session
        });
    } catch (error) {
        console.error('❌ Error creating session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الجلسة' });
    }
}

/**
 * جلب كل الجلسات
 * GET /api/whatsapp/sessions
 */
async function getSessions(req, res) {
    try {
        const { companyId } = req.user;

        const sessions = await getSharedPrismaClient().whatsAppSession.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        whatsapp_messages: true,
                        whatsapp_contacts: true
                    }
                }
            }
        });

        // إضافة معلومات الجلسات النشطة
        const sessionsWithStatus = sessions.map(session => {
            const activeSession = WhatsAppManager.getSession(session.id);
            return {
                ...session,
                liveStatus: activeSession?.status || 'disconnected',
                qrCode: activeSession?.qrCode || null
            };
        });

        res.json({ sessions: sessionsWithStatus });
    } catch (error) {
        console.error('❌ Error getting sessions:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الجلسات' });
    }
}

/**
 * جلب جلسة محددة
 * GET /api/whatsapp/sessions/:id
 */
async function getSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId },
            include: {
                _count: {
                    select: {
                        messages: true,
                        contacts: true
                    }
                }
            }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const activeSession = WhatsAppManager.getSession(id);

        res.json({
            session: {
                ...session,
                liveStatus: activeSession?.status || 'disconnected',
                qrCode: activeSession?.qrCode || null
            }
        });
    } catch (error) {
        console.error('❌ Error getting session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الجلسة' });
    }
}

/**
 * تحديث جلسة
 * PUT /api/whatsapp/sessions/:id
 */
async function updateSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            name,
            aiEnabled,
            autoReply,
            aiMode,
            welcomeMessage,
            awayMessage,
            workingHoursEnabled,
            workingHours,
            isDefault
        } = req.body;

        // التحقق من الملكية
        const existingSession = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!existingSession) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // إذا تم تعيينها كافتراضية، إلغاء الافتراضية من الجلسات الأخرى
        if (isDefault) {
            await getSharedPrismaClient().whatsAppSession.updateMany({
                where: { companyId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const session = await getSharedPrismaClient().whatsAppSession.update({
            where: { id },
            data: {
                name,
                aiEnabled,
                autoReply,
                aiMode,
                welcomeMessage,
                awayMessage,
                workingHoursEnabled,
                workingHours: workingHours ? JSON.stringify(workingHours) : undefined,
                isDefault
            }
        });

        res.json({ success: true, session });
    } catch (error) {
        console.error('❌ Error updating session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الجلسة' });
    }
}

/**
 * حذف جلسة
 * DELETE /api/whatsapp/sessions/:id
 */
async function deleteSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // حذف الجلسة
        await WhatsAppManager.deleteSession(id);

        res.json({ success: true, message: 'تم حذف الجلسة بنجاح' });
    } catch (error) {
        console.error('❌ Error deleting session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف الجلسة' });
    }
}

/**
 * بدء الاتصال بجلسة
 * POST /api/whatsapp/sessions/:id/connect
 */
async function connectSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // بدء الاتصال
        await WhatsAppManager.createSession(id, companyId);

        res.json({ success: true, message: 'جاري الاتصال...' });
    } catch (error) {
        console.error('❌ Error connecting session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء الاتصال' });
    }
}

/**
 * قطع الاتصال بجلسة
 * POST /api/whatsapp/sessions/:id/disconnect
 */
async function disconnectSession(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // قطع الاتصال
        await WhatsAppManager.closeSession(id);

        res.json({ success: true, message: 'تم قطع الاتصال' });
    } catch (error) {
        console.error('❌ Error disconnecting session:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء قطع الاتصال' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 المحادثات والرسائل
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب المحادثات (جهات الاتصال)
 * GET /api/whatsapp/conversations
 */
async function getConversations(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, page = 1, limit = 50, search, category, archived } = req.query;

        // تحسين: استخدام Promise.all لجلب الجلسات والعدد الكلي إذا أمكن، لكن هنا نحتاج الجلسات أولاً لبناء الاستعلام
        const sessionIds = (sessionId && sessionId !== 'all')
            ? [sessionId]
            : (await getSharedPrismaClient().whatsAppSession.findMany({
                where: { companyId },
                select: { id: true }
            })).map(s => s.id);

        const where = {
            sessionId: { in: sessionIds },
            isArchived: archived === 'true'
        };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { pushName: { contains: search } },
                { phoneNumber: { contains: search } }
            ];
        }

        if (category) {
            where.category = category;
        }

        // تحسين: تشغيل استعلام المحادثات والعدد الكلي بشكل متزامن
        const [contacts, total] = await Promise.all([
            getSharedPrismaClient().whatsAppContact.findMany({
                where,
                orderBy: [
                    { isPinned: 'desc' },
                    { lastMessageAt: 'desc' }
                ],
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                select: {
                    id: true,
                    sessionId: true,
                    jid: true,
                    phoneNumber: true,
                    name: true,
                    pushName: true,
                    profilePicUrl: true,
                    isGroup: true,
                    category: true,
                    unreadCount: true,
                    lastMessageAt: true,
                    isArchived: true,
                    isPinned: true,
                    isMuted: true,
                    whatsapp_sessions: {
                        select: { name: true, phoneNumber: true }
                    },
                    customer: {
                        select: { firstName: true, lastName: true, status: true }
                    }
                }
            }),
            getSharedPrismaClient().whatsAppContact.count({ where })
        ]);

        // جلب آخر رسالة لكل محادثة (Optimized Batch Query)
        let lastMessages = [];
        if (contacts.length > 0) {
            const jids = contacts.map(c => c.jid);

            // 1. Get the latest timestamp for each JID
            // This is much faster than fetching full messages
            const latestMessageStats = await getSharedPrismaClient().whatsAppMessage.groupBy({
                by: ['remoteJid'],
                where: {
                    sessionId: { in: sessionIds },
                    remoteJid: { in: jids }
                },
                _max: {
                    timestamp: true
                }
            });

            // 2. Build a filter to get the actual messages
            // We match (remoteJid + timestamp) to get the specific message
            // Note: In rare cases of exact same timestamp, we might get duplicates, but we handle that below
            const conditions = latestMessageStats.map(stat => ({
                remoteJid: stat.remoteJid,
                timestamp: stat._max.timestamp
            })).filter(c => c.timestamp); // Ensure timestamp exists

            if (conditions.length > 0) {
                lastMessages = await getSharedPrismaClient().whatsAppMessage.findMany({
                    where: {
                        sessionId: { in: sessionIds },
                        OR: conditions
                    },
                    select: {
                        remoteJid: true,
                        content: true,
                        messageType: true,
                        fromMe: true,
                        timestamp: true,
                        status: true
                    }
                });
            }
        }

        const lastMessagesMap = new Map(lastMessages.map(m => [m.remoteJid, m]));

        const conversationsWithLastMessage = contacts.map(contact => ({
            ...contact,
            session: contact.whatsapp_sessions, // Map whatsapp_sessions to session for frontend compatibility
            lastMessage: lastMessagesMap.get(contact.jid) || null
        }));

        res.json({
            conversations: conversationsWithLastMessage,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ Error getting conversations:', error);
        // Log full error stack
        console.error(error.stack);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب المحادثات', details: error.message });
    }
}

/**
 * جلب رسائل محادثة
 * GET /api/whatsapp/conversations/:jid/messages
 */
async function getMessages(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, page = 1, limit = 50 } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'معرف الجلسة مطلوب' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppMessageHandler.getMessages(sessionId, jid, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error getting messages:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الرسائل' });
    }
}

/**
 * إرسال رسالة
 * POST /api/whatsapp/messages/send
 */
async function sendMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, text, quotedMessageId } = req.body;

        if (!sessionId || !to || !text) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendText(sessionId, to, text, {
            quotedMessageId
        });

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ أثناء إرسال الرسالة' });
    }
}

/**
 * إرسال وسائط
 * POST /api/whatsapp/messages/send-media
 */
async function sendMedia(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, mediaType, mediaUrl, caption } = req.body;

        if (!sessionId || !to || !mediaType || !mediaUrl) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        if (!isValidUrl(mediaUrl)) {
            return res.status(400).json({ error: 'رابط الوسائط غير صالح' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        let message;
        const mediaSource = { url: mediaUrl };

        switch (mediaType) {
            case 'image':
                message = await WhatsAppMessageHandler.sendImage(sessionId, to, mediaSource, caption);
                break;
            case 'video':
                message = await WhatsAppMessageHandler.sendVideo(sessionId, to, mediaSource, caption);
                break;
            case 'audio':
                message = await WhatsAppMessageHandler.sendAudio(sessionId, to, mediaSource);
                break;
            case 'document':
                message = await WhatsAppMessageHandler.sendDocument(sessionId, to, mediaSource, { caption });
                break;
            default:
                return res.status(400).json({ error: 'نوع الوسائط غير مدعوم' });
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending media:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الوسائط' });
    }
}

/**
 * تحديد الرسائل كمقروءة
 * POST /api/whatsapp/messages/read
 */
async function markAsRead(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, remoteJid } = req.body;

        if (!sessionId || !remoteJid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppMessageHandler.markAsRead(sessionId, remoteJid);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marking as read:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

/**
 * إرسال رسالة بأزرار تفاعلية
 * POST /api/whatsapp/messages/send-buttons
 */
async function sendButtons(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, text, buttons, footer, header } = req.body;

        if (!sessionId || !to || !text || !buttons || !Array.isArray(buttons)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        if (buttons.length > 3) {
            return res.status(400).json({ error: 'الحد الأقصى للأزرار هو 3' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendButtons(
            sessionId,
            to,
            text,
            buttons,
            { footer, header }
        );

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending buttons:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الأزرار' });
    }
}

/**
 * إرسال رسالة بقائمة
 * POST /api/whatsapp/messages/send-list
 */
async function sendList(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, text, buttonText, sections, title, footer, description } = req.body;

        if (!sessionId || !to || !text || !buttonText || !sections || !Array.isArray(sections)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        if (sections.length > 10) {
            return res.status(400).json({ error: 'الحد الأقصى للأقسام هو 10' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendList(
            sessionId,
            to,
            text,
            buttonText,
            sections,
            { title, footer, description }
        );

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending list:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال القائمة' });
    }
}

/**
 * إرسال منتج
 * POST /api/whatsapp/messages/send-product
 */
async function sendProduct(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, product, buttons, footer } = req.body;

        if (!sessionId || !to || !product || !product.name) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        if (product.imageUrl && !isValidUrl(product.imageUrl)) {
            return res.status(400).json({ error: 'رابط صورة المنتج غير صالح' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendProduct(
            sessionId,
            to,
            product,
            { buttons, footer }
        );

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending product:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال المنتج' });
    }
}

/**
 * إرسال تفاعل (Reaction)
 * POST /api/whatsapp/messages/send-reaction
 */
async function sendReaction(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, messageId, emoji } = req.body;

        if (!sessionId || !to || !messageId || !emoji) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppMessageHandler.sendReaction(
            sessionId,
            to,
            messageId,
            emoji
        );

        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error sending reaction:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال التفاعل' });
    }
}

/**
 * تعديل رسالة
 * POST /api/whatsapp/messages/edit
 */
async function editMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, key, newText } = req.body;

        if (!sessionId || !to || !key || !newText) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.editMessage(sessionId, to, key, newText);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error editing message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعديل الرسالة' });
    }
}

/**
 * حذف رسالة
 * POST /api/whatsapp/messages/delete
 */
async function deleteMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, key } = req.body;

        if (!sessionId || !to || !key) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.deleteMessage(sessionId, to, key);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف الرسالة' });
    }
}

/**
 * إعادة توجيه رسالة
 * POST /api/whatsapp/messages/forward
 */
async function forwardMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, message } = req.body;

        if (!sessionId || !to || !message) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.forwardMessage(sessionId, to, message);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error forwarding message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إعادة توجيه الرسالة' });
    }
}

/**
 * أرشفة محادثة
 * POST /api/whatsapp/chats/archive
 */
async function archiveChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, archive } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.archiveChat(sessionId, jid, archive);

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId, jid },
            data: { isArchived: archive }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error archiving chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء أرشفة المحادثة' });
    }
}

/**
 * تثبيت محادثة
 * POST /api/whatsapp/chats/pin
 */
async function pinChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, pin } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.pinChat(sessionId, jid, pin);

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId, jid },
            data: { isPinned: pin }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error pinning chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تثبيت المحادثة' });
    }
}

/**
 * كتم محادثة
 * POST /api/whatsapp/chats/mute
 */
async function muteChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, mute } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.muteChat(sessionId, jid, mute);

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId, jid },
            data: { isMuted: mute }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error muting chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء كتم المحادثة' });
    }
}

/**
 * تحديد كغير مقروء
 * POST /api/whatsapp/chats/unread
 */
async function markChatUnread(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, unread } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.markChatUnread(sessionId, jid, unread);

        // Update local DB if needed (optional, as unread count comes from messages usually)
        if (unread) {
            await getSharedPrismaClient().whatsAppContact.updateMany({
                where: { sessionId, jid },
                data: { unreadCount: { increment: 1 } } // Artificial increment
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marking chat unread:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

/**
 * حذف محادثة
 * POST /api/whatsapp/chats/delete
 */
async function deleteChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // Delete from Baileys (Clear chat)
        const activeSession = WhatsAppManager.getSession(sessionId);
        if (activeSession?.status === 'connected') {
            try {
                await activeSession.sock.chatModify({
                    delete: true,
                    lastMessages: [{
                        key: { remoteJid: jid, fromMe: true, id: 'AAA' },
                        messageTimestamp: Math.floor(Date.now() / 1000)
                    }]
                }, jid);
            } catch (baileysError) {
                console.error('⚠️ Error deleting chat from Baileys (continuing with DB delete):', baileysError);
                // Continue with DB deletion even if Baileys fails
            }
        }

        // Delete from DB
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
            where: { sessionId, remoteJid: jid }
        });

        await getSharedPrismaClient().whatsAppContact.deleteMany({
            where: { sessionId, jid }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف المحادثة' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 جهات الاتصال
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * تحديث جهة اتصال
 * PUT /api/whatsapp/contacts/:id
 */
async function updateContact(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { name, category, tags, notes, customerId, isArchived, isPinned, isMuted } = req.body;

        // التحقق من الملكية
        const contact = await getSharedPrismaClient().whatsAppContact.findFirst({
            where: { id },
            include: {
                whatsapp_sessions: { select: { companyId: true } }
            }
        });

        if (!contact || contact.whatsapp_sessions.companyId !== companyId) {
            return res.status(404).json({ error: 'جهة الاتصال غير موجودة' });
        }

        const updatedContact = await getSharedPrismaClient().whatsAppContact.update({
            where: { id },
            data: {
                name,
                category,
                tags: tags ? JSON.stringify(tags) : undefined,
                notes,
                customerId,
                isArchived,
                isPinned,
                isMuted
            }
        });

        res.json({ success: true, contact: updatedContact });
    } catch (error) {
        console.error('❌ Error updating contact:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث جهة الاتصال' });
    }
}

/**
 * ربط جهة اتصال بعميل
 * POST /api/whatsapp/contacts/:id/link-customer
 */
async function linkCustomer(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { customerId } = req.body;

        // التحقق من الملكية
        const contact = await getSharedPrismaClient().whatsAppContact.findFirst({
            where: { id },
            include: {
                whatsapp_sessions: { select: { companyId: true } }
            }
        });

        if (!contact || contact.whatsapp_sessions.companyId !== companyId) {
            return res.status(404).json({ error: 'جهة الاتصال غير موجودة' });
        }

        // التحقق من العميل
        const customer = await getSharedPrismaClient().customer.findFirst({
            where: { id: customerId, companyId }
        });

        if (!customer) {
            return res.status(404).json({ error: 'العميل غير موجود' });
        }

        const updatedContact = await getSharedPrismaClient().whatsAppContact.update({
            where: { id },
            data: { customerId },
            include: { customer: true }
        });

        res.json({ success: true, contact: updatedContact });
    } catch (error) {
        console.error('❌ Error linking customer:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء ربط العميل' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب الردود السريعة
 * GET /api/whatsapp/quick-replies
 */
async function getQuickReplies(req, res) {
    try {
        const { companyId } = req.user;
        const { category } = req.query;

        const where = { companyId, isActive: true };
        if (category) where.category = category;

        const quickReplies = await getSharedPrismaClient().whatsAppQuickReply.findMany({
            where,
            orderBy: [
                { sortOrder: 'asc' },
                { usageCount: 'desc' }
            ]
        });

        res.json({ quickReplies });
    } catch (error) {
        console.error('❌ Error getting quick replies:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الردود السريعة' });
    }
}

/**
 * إنشاء رد سريع
 * POST /api/whatsapp/quick-replies
 */
async function createQuickReply(req, res) {
    try {
        const { companyId } = req.user;
        const { title, shortcut, content, category, variables, mediaUrl, mediaType } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'العنوان والمحتوى مطلوبان' });
        }

        if (mediaUrl && !isValidUrl(mediaUrl)) {
            return res.status(400).json({ error: 'رابط الوسائط غير صالح' });
        }

        const quickReply = await getSharedPrismaClient().whatsAppQuickReply.create({
            data: {
                companyId,
                title,
                shortcut,
                content,
                category: category || 'general',
                variables: variables ? JSON.stringify(variables) : null,
                mediaUrl,
                mediaType
            }
        });

        res.status(201).json({ success: true, quickReply });
    } catch (error) {
        console.error('❌ Error creating quick reply:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الرد السريع' });
    }
}

/**
 * تحديث رد سريع
 * PUT /api/whatsapp/quick-replies/:id
 */
async function updateQuickReply(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { title, shortcut, content, category, variables, mediaUrl, mediaType, isActive, sortOrder } = req.body;

        if (mediaUrl && !isValidUrl(mediaUrl)) {
            return res.status(400).json({ error: 'رابط الوسائط غير صالح' });
        }

        // التحقق من الملكية
        const existing = await getSharedPrismaClient().whatsAppQuickReply.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'الرد السريع غير موجود' });
        }

        const quickReply = await getSharedPrismaClient().whatsAppQuickReply.update({
            where: { id },
            data: {
                title,
                shortcut,
                content,
                category,
                variables: variables ? JSON.stringify(variables) : undefined,
                mediaUrl,
                mediaType,
                isActive,
                sortOrder
            }
        });

        res.json({ success: true, quickReply });
    } catch (error) {
        console.error('❌ Error updating quick reply:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الرد السريع' });
    }
}

/**
 * حذف رد سريع
 * DELETE /api/whatsapp/quick-replies/:id
 */
async function deleteQuickReply(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // التحقق من الملكية
        const existing = await getSharedPrismaClient().whatsAppQuickReply.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'الرد السريع غير موجود' });
        }

        await getSharedPrismaClient().whatsAppQuickReply.delete({ where: { id } });

        res.json({ success: true, message: 'تم حذف الرد السريع' });
    } catch (error) {
        console.error('❌ Error deleting quick reply:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف الرد السريع' });
    }
}

/**
 * إرسال رد سريع
 * POST /api/whatsapp/quick-replies/:id/send
 */
async function sendQuickReply(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { sessionId, to, variables } = req.body;

        // التحقق من الملكية
        const quickReply = await getSharedPrismaClient().whatsAppQuickReply.findFirst({
            where: { id, companyId }
        });

        if (!quickReply) {
            return res.status(404).json({ error: 'الرد السريع غير موجود' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendQuickReply(sessionId, to, id, variables || {});

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending quick reply:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الرد السريع' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ الإعدادات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب الإعدادات
 * GET /api/whatsapp/settings
 */
async function getSettings(req, res) {
    try {
        const { companyId } = req.user;

        let settings = await getSharedPrismaClient().whatsAppSettings.findUnique({
            where: { companyId }
        });

        // إنشاء إعدادات افتراضية إذا لم تكن موجودة
        if (!settings) {
            settings = await getSharedPrismaClient().whatsAppSettings.create({
                data: { companyId }
            });
        }

        res.json({ settings });
    } catch (error) {
        console.error('❌ Error getting settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الإعدادات' });
    }
}

/**
 * تحديث الإعدادات
 * PUT /api/whatsapp/settings
 */
async function updateSettings(req, res) {
    try {
        const { companyId } = req.user;
        const {
            isEnabled,
            maxSessions,
            notificationSound,
            browserNotifications,
            defaultAIMode,
            aiWelcomeEnabled,
            aiAwayEnabled,
            maxImageSize,
            maxVideoSize,
            maxDocumentSize,
            autoCompressImages,
            autoArchiveDays
        } = req.body;

        const settings = await getSharedPrismaClient().whatsAppSettings.upsert({
            where: { companyId },
            update: {
                isEnabled,
                maxSessions,
                notificationSound,
                browserNotifications,
                defaultAIMode,
                aiWelcomeEnabled,
                aiAwayEnabled,
                maxImageSize,
                maxVideoSize,
                maxDocumentSize,
                autoCompressImages,
                autoArchiveDays
            },
            create: {
                companyId,
                isEnabled,
                maxSessions,
                notificationSound,
                browserNotifications,
                defaultAIMode,
                aiWelcomeEnabled,
                aiAwayEnabled,
                maxImageSize,
                maxVideoSize,
                maxDocumentSize,
                autoCompressImages,
                autoArchiveDays
            }
        });

        res.json({ success: true, settings });
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الإعدادات' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب الإحصائيات
 * GET /api/whatsapp/stats
 */
async function getStats(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, period = '7d' } = req.query;

        // حساب التاريخ
        const periodDays = parseInt(period) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        // جلب معرفات الجلسات
        const sessionIds = sessionId
            ? [sessionId]
            : (await getSharedPrismaClient().whatsAppSession.findMany({
                where: { companyId },
                select: { id: true }
            })).map(s => s.id);

        // إحصائيات الرسائل
        const totalMessages = await getSharedPrismaClient().whatsAppMessage.count({
            where: {
                sessionId: { in: sessionIds },
                timestamp: { gte: startDate }
            }
        });

        const sentMessages = await getSharedPrismaClient().whatsAppMessage.count({
            where: {
                sessionId: { in: sessionIds },
                fromMe: true,
                timestamp: { gte: startDate }
            }
        });

        const receivedMessages = totalMessages - sentMessages;

        const aiResponses = await getSharedPrismaClient().whatsAppMessage.count({
            where: {
                sessionId: { in: sessionIds },
                isAIResponse: true,
                timestamp: { gte: startDate }
            }
        });

        // إحصائيات المحادثات
        const totalConversations = await getSharedPrismaClient().whatsAppContact.count({
            where: { sessionId: { in: sessionIds } }
        });

        const activeConversations = await getSharedPrismaClient().whatsAppContact.count({
            where: {
                sessionId: { in: sessionIds },
                lastMessageAt: { gte: startDate }
            }
        });

        // إحصائيات يومية
        let dailyStats = [];

        if (sessionIds.length > 0) {
            dailyStats = await getSharedPrismaClient().$queryRaw`
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as total,
                    SUM(CASE WHEN fromMe = true THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN fromMe = false THEN 1 ELSE 0 END) as received
                FROM whatsapp_messages
                WHERE sessionId IN (${getSharedPrismaClient().join(sessionIds)})
                AND timestamp >= ${startDate}
                GROUP BY DATE(timestamp)
                ORDER BY date
            `.catch((e) => {
                console.error('Error in daily stats query:', e);
                return [];
            });

            // Convert BigInt to Number
            dailyStats = dailyStats.map(stat => ({
                date: stat.date,
                total: Number(stat.total || 0),
                sent: Number(stat.sent || 0),
                received: Number(stat.received || 0)
            }));
        }

        res.json({
            stats: {
                messages: {
                    total: totalMessages,
                    sent: sentMessages,
                    received: receivedMessages,
                    aiResponses
                },
                conversations: {
                    total: totalConversations,
                    active: activeConversations
                },
                daily: dailyStats
            }
        });
    } catch (error) {
        console.error('❌ Error getting stats:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
    }
}

/**
 * تعديل رسالة
 * POST /api/whatsapp/messages/edit
 */
async function editMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, key, newText } = req.body;

        if (!sessionId || !to || !key || !newText) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.editMessage(sessionId, to, key, newText);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error editing message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعديل الرسالة' });
    }
}

/**
 * حذف رسالة
 * POST /api/whatsapp/messages/delete
 */
async function deleteMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, key } = req.body;

        if (!sessionId || !to || !key) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.deleteMessage(sessionId, to, key);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف الرسالة' });
    }
}

/**
 * إعادة توجيه رسالة
 * POST /api/whatsapp/messages/forward
 */
async function forwardMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, message } = req.body;

        if (!sessionId || !to || !message) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        // التحقق من الملكية
        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.forwardMessage(sessionId, to, message);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error forwarding message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إعادة توجيه الرسالة' });
    }
}

/**
 * أرشفة محادثة
 * POST /api/whatsapp/chats/archive
 */
async function archiveChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, archive } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.archiveChat(sessionId, jid, archive);

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId, jid },
            data: { isArchived: archive }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error archiving chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء أرشفة المحادثة' });
    }
}

/**
 * تثبيت محادثة
 * POST /api/whatsapp/chats/pin
 */
async function pinChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, pin } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.pinChat(sessionId, jid, pin);

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId, jid },
            data: { isPinned: pin }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error pinning chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تثبيت المحادثة' });
    }
}

/**
 * كتم محادثة
 * POST /api/whatsapp/chats/mute
 */
async function muteChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, mute } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.muteChat(sessionId, jid, mute);

        // Update local DB
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: { sessionId, jid },
            data: { isMuted: mute }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error muting chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء كتم المحادثة' });
    }
}

/**
 * تحديد كغير مقروء
 * POST /api/whatsapp/chats/unread
 */
async function markChatUnread(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, unread } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.markChatUnread(sessionId, jid, unread);

        // Update local DB if needed (optional, as unread count comes from messages usually)
        if (unread) {
            await getSharedPrismaClient().whatsAppContact.updateMany({
                where: { sessionId, jid },
                data: { unreadCount: { increment: 1 } } // Artificial increment
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marking chat unread:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

/**
 * مسح محادثة
 * POST /api/whatsapp/chats/clear
 */
async function clearChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // Clear chat from Baileys
        const activeSession = WhatsAppManager.getSession(sessionId);
        if (activeSession?.status === 'connected') {
            await WhatsAppManager.clearChat(sessionId, jid);
        }

        // Delete messages from local DB
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
            where: { sessionId, remoteJid: jid }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error clearing chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء مسح المحادثة' });
    }
}

/**
 * حذف محادثة
 * POST /api/whatsapp/chats/delete
 */
async function deleteChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        // Delete from Baileys (Clear chat)
        const activeSession = WhatsAppManager.getSession(sessionId);
        if (activeSession?.status === 'connected') {
            try {
                await activeSession.sock.chatModify({
                    delete: true,
                    lastMessages: [{
                        key: { remoteJid: jid, fromMe: true, id: 'AAA' },
                        messageTimestamp: Math.floor(Date.now() / 1000)
                    }]
                }, jid);
            } catch (baileysError) {
                console.error('⚠️ Error deleting chat from Baileys (continuing with DB delete):', baileysError);
                // Continue with DB deletion even if Baileys fails
            }
        }

        // Delete from DB
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
            where: { sessionId, remoteJid: jid }
        });

        await getSharedPrismaClient().whatsAppContact.deleteMany({
            where: { sessionId, jid }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف المحادثة' });
    }
}

/**
 * نقل بيانات المصادقة من الملفات إلى قاعدة البيانات
 * POST /api/whatsapp/migrate-auth
 */
async function migrateAuthToDatabase(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.body;

        const path = require('path');
        const fs = require('fs').promises;
        const fsSync = require('fs');

        const SESSIONS_DIR = path.join(__dirname, '../data/whatsapp-sessions');

        async function readJsonFile(filePath) {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                return JSON.parse(content);
            } catch (error) {
                return null;
            }
        }

        async function migrateSession(sessionId) {
            const sessionPath = path.join(SESSIONS_DIR, sessionId);

            if (!fsSync.existsSync(sessionPath)) {
                return { success: false, error: 'Session directory not found' };
            }

            const files = await fs.readdir(sessionPath);
            let authState = { creds: null, keys: {} };

            // creds.json
            const credsPath = path.join(sessionPath, 'creds.json');
            if (fsSync.existsSync(credsPath)) {
                const creds = await readJsonFile(credsPath);
                if (creds) authState.creds = creds;
            }

            // sessions
            const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.json'));
            if (sessionFiles.length > 0) {
                authState.keys['session'] = {};
                for (const file of sessionFiles) {
                    const data = await readJsonFile(path.join(sessionPath, file));
                    if (data) {
                        const id = file.replace('session-', '').replace('.json', '');
                        authState.keys['session'][id] = data;
                    }
                }
            }

            // pre-keys
            const preKeyFiles = files.filter(f => f.startsWith('pre-key-') && f.endsWith('.json'));
            if (preKeyFiles.length > 0) {
                authState.keys['pre-key'] = {};
                for (const file of preKeyFiles) {
                    const data = await readJsonFile(path.join(sessionPath, file));
                    if (data) {
                        const id = file.replace('pre-key-', '').replace('.json', '');
                        authState.keys['pre-key'][id] = data;
                    }
                }
            }

            // sender-keys
            const senderKeyFiles = files.filter(f => f.startsWith('sender-key-') && f.endsWith('.json'));
            if (senderKeyFiles.length > 0) {
                authState.keys['sender-key'] = {};
                for (const file of senderKeyFiles) {
                    const data = await readJsonFile(path.join(sessionPath, file));
                    if (data) {
                        const id = file.replace('sender-key-', '').replace('.json', '');
                        authState.keys['sender-key'][id] = data;
                    }
                }
            }

            // Save to database
            await getSharedPrismaClient().whatsAppSession.update({
                where: { id: sessionId },
                data: {
                    authState: JSON.stringify(authState),
                    updatedAt: new Date()
                }
            });

            return { success: true };
        }

        if (sessionId) {
            // Migrate single session
            const session = await getSharedPrismaClient().whatsAppSession.findFirst({
                where: { id: sessionId, companyId }
            });

            if (!session) {
                return res.status(404).json({ error: 'الجلسة غير موجودة' });
            }

            const result = await migrateSession(sessionId);
            res.json(result);
        } else {
            // Migrate all sessions
            const sessions = await getSharedPrismaClient().whatsAppSession.findMany({
                where: { companyId },
                select: { id: true, name: true }
            });

            let success = 0;
            let failed = 0;
            const results = [];

            for (const session of sessions) {
                const result = await migrateSession(session.id);
                if (result.success) {
                    success++;
                } else {
                    failed++;
                }
                results.push({ sessionId: session.id, name: session.name, ...result });
            }

            res.json({
                success: true,
                summary: { total: sessions.length, success, failed },
                results
            });
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء نقل البيانات' });
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 👥 إدارة المجموعات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إنشاء مجموعة
 * POST /api/whatsapp/groups/create
 */
async function createGroup(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, subject, participants } = req.body;

        if (!sessionId || !subject || !participants || !Array.isArray(participants)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const group = await WhatsAppManager.createGroup(sessionId, subject, participants);
        res.json({ success: true, group });
    } catch (error) {
        console.error('❌ Error creating group:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء المجموعة' });
    }
}

/**
 * الحصول على بيانات المجموعة
 * GET /api/whatsapp/groups/:jid
 */
async function getGroupMetadata(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const metadata = await WhatsAppManager.getGroupMetadata(sessionId, jid);
        res.json({ success: true, metadata });
    } catch (error) {
        console.error('❌ Error fetching group metadata:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات المجموعة' });
    }
}

/**
 * تحديث المشاركين
 * POST /api/whatsapp/groups/:jid/participants
 */
async function updateGroupParticipants(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, participants, action } = req.body;

        if (!sessionId || !participants || !action) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });

        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const result = await WhatsAppManager.updateGroupParticipants(sessionId, jid, participants, action);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error updating participants:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث المشاركين' });
    }
}

/**
 * تحديث اسم المجموعة
 * PUT /api/whatsapp/groups/:jid/subject
 */
async function updateGroupSubject(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, subject } = req.body;

        if (!sessionId || !subject) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        await WhatsAppManager.updateGroupSubject(sessionId, jid, subject);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating subject:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث اسم المجموعة' });
    }
}

/**
 * تحديث وصف المجموعة
 * PUT /api/whatsapp/groups/:jid/description
 */
async function updateGroupDescription(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, description } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        await WhatsAppManager.updateGroupDescription(sessionId, jid, description);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating description:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث وصف المجموعة' });
    }
}

/**
 * تحديث إعدادات المجموعة
 * PUT /api/whatsapp/groups/:jid/settings
 */
async function updateGroupSettings(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, settings } = req.body;

        if (!sessionId || !settings) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        await WhatsAppManager.updateGroupSettings(sessionId, jid, settings);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث إعدادات المجموعة' });
    }
}

/**
 * مغادرة المجموعة
 * POST /api/whatsapp/groups/:jid/leave
 */
async function leaveGroup(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        await WhatsAppManager.leaveGroup(sessionId, jid);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error leaving group:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء مغادرة المجموعة' });
    }
}

/**
 * الحصول على رابط الدعوة
 * GET /api/whatsapp/groups/:jid/invite-code
 */
async function getGroupInviteCode(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const code = await WhatsAppManager.getGroupInviteCode(sessionId, jid);
        res.json({ success: true, code });
    } catch (error) {
        console.error('❌ Error getting invite code:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب رابط الدعوة' });
    }
}

/**
 * إلغاء رابط الدعوة
 * POST /api/whatsapp/groups/:jid/revoke-invite
 */
async function revokeGroupInviteCode(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const code = await WhatsAppManager.revokeGroupInviteCode(sessionId, jid);
        res.json({ success: true, code });
    } catch (error) {
        console.error('❌ Error revoking invite code:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إلغاء رابط الدعوة' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 الخصوصية والحظر
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * حظر جهة اتصال
 * POST /api/whatsapp/contacts/block
 */
async function blockContact(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        await WhatsAppManager.blockContact(sessionId, jid);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error blocking contact:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حظر جهة الاتصال' });
    }
}

/**
 * إلغاء حظر جهة اتصال
 * POST /api/whatsapp/contacts/unblock
 */
async function unblockContact(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        await WhatsAppManager.unblockContact(sessionId, jid);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error unblocking contact:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إلغاء حظر جهة الاتصال' });
    }
}

/**
 * التحقق من الرقم
 * POST /api/whatsapp/check-number
 */
async function checkNumber(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, number } = req.body;

        if (!sessionId || !number) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const result = await WhatsAppManager.onWhatsApp(sessionId, number);
        res.json({ success: true, exists: !!result, jid: result?.jid });
    } catch (error) {
        console.error('❌ Error checking number:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء التحقق من الرقم' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 الملف الشخصي
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * الحصول على الملف الشخصي
 * GET /api/whatsapp/profile
 */
async function getProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const profile = await WhatsAppManager.getProfile(sessionId, companyId);
        res.json({ success: true, profile });
    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الملف الشخصي' });
    }
}

/**
 * مزامنة الملف الشخصي يدوياً
 * POST /api/whatsapp/profile/sync
 */
async function syncProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        const profile = await WhatsAppManager.syncProfile(sessionId);
        if (!profile) {
            return res.status(400).json({ error: 'تعذر مزامنة الملف الشخصي (قد تكون الجلسة غير متصلة)' });
        }

        res.json({ success: true, profile });
    } catch (error) {
        console.error('❌ Error syncing profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء مزامنة الملف الشخصي' });
    }
}

/**
 * تحديث الملف الشخصي
 * POST /api/whatsapp/profile/update
 */
async function updateProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, name, status, picture } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({ where: { id: sessionId, companyId } });
        if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });

        if (name) await WhatsAppManager.updateProfileName(sessionId, name);
        if (status) await WhatsAppManager.updateProfileStatus(sessionId, status);

        if (req.file || picture) {
            const sessionObj = WhatsAppManager.getSession(sessionId);
            if (!sessionObj?.sock?.user) {
                return res.status(400).json({ error: 'الجلسة غير متصلة' });
            }
            // Get JID from session user
            const jid = (sessionObj.sock.user.id || sessionObj.sock.user.jid).split(':')[0] + '@s.whatsapp.net';

            if (req.file) {
                const imageBuffer = fs.readFileSync(req.file.path);
                await WhatsAppManager.updateProfilePicture(sessionId, jid, imageBuffer);
                // Clean up temp file
                try { fs.unlinkSync(req.file.path); } catch (e) { }
            } else if (picture) {
                await WhatsAppManager.updateProfilePicture(sessionId, jid, { url: picture });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الملف الشخصي' });
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👥 إدارة المجموعات
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * إنشاء مجموعة
 * POST /api/whatsapp/groups
 */
async function createGroup(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, subject, participants } = req.body;

        if (!sessionId || !subject || !participants || !Array.isArray(participants)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const group = await WhatsAppManager.createGroup(sessionId, subject, participants);
        res.json({ success: true, group });
    } catch (error) {
        console.error('❌ Error creating group:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء المجموعة' });
    }
}

/**
 * جلب بيانات مجموعة
 * GET /api/whatsapp/groups/:jid
 */
async function getGroupMetadata(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const metadata = await WhatsAppManager.getGroupMetadata(sessionId, jid);
        res.json({ success: true, metadata });
    } catch (error) {
        console.error('❌ Error fetching group metadata:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات المجموعة' });
    }
}

/**
 * تحديث اسم المجموعة
 * PUT /api/whatsapp/groups/:jid/subject
 */
async function updateGroupSubject(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, subject } = req.body;

        if (!sessionId || !jid || !subject) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.updateGroupSubject(sessionId, jid, subject);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating group subject:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث اسم المجموعة' });
    }
}

/**
 * تحديث وصف المجموعة
 * PUT /api/whatsapp/groups/:jid/description
 */
async function updateGroupDescription(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, description } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.updateGroupDescription(sessionId, jid, description);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating group description:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث وصف المجموعة' });
    }
}

/**
 * تحديث إعدادات المجموعة
 * PUT /api/whatsapp/groups/:jid/settings
 */
async function updateGroupSettings(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, setting, value } = req.body;

        if (!sessionId || !jid || !setting) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.updateGroupSettings(sessionId, jid, setting, value);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating group settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث إعدادات المجموعة' });
    }
}

/**
 * تحديث مشاركي المجموعة
 * PUT /api/whatsapp/groups/:jid/participants
 */
async function updateGroupParticipants(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId, action, participants } = req.body;

        if (!sessionId || !jid || !action || !participants) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.updateGroupParticipants(sessionId, jid, action, participants);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating group participants:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث مشاركي المجموعة' });
    }
}

/**
 * الخروج من المجموعة
 * POST /api/whatsapp/groups/:jid/leave
 */
async function leaveGroup(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await WhatsAppManager.leaveGroup(sessionId, jid);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error leaving group:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء الخروج من المجموعة' });
    }
}

/**
 * جلب رابط الدعوة
 * GET /api/whatsapp/groups/:jid/invite-code
 */
async function getGroupInviteCode(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const code = await WhatsAppManager.getGroupInviteCode(sessionId, jid);
        res.json({ success: true, code });
    } catch (error) {
        console.error('❌ Error fetching invite code:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب رابط الدعوة' });
    }
}

/**
 * إلغاء رابط الدعوة
 * POST /api/whatsapp/groups/:jid/revoke-invite
 */
async function revokeGroupInviteCode(req, res) {
    try {
        const { companyId } = req.user;
        const { jid } = req.params;
        const { sessionId } = req.body;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const code = await WhatsAppManager.revokeGroupInviteCode(sessionId, jid);
        res.json({ success: true, code });
    } catch (error) {
        console.error('❌ Error revoking invite code:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إلغاء رابط الدعوة' });
    }
}

// ==================== Business Profile Controllers ====================

async function getBusinessProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const profile = await WhatsAppManager.getBusinessProfile(sessionId);
        res.json({ success: true, profile });
    } catch (error) {
        console.error('❌ Error getting business profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب ملف الأعمال' });
    }
}

async function setBusinessProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, profileData } = req.body;

        if (!sessionId || !profileData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.setBusinessProfile(sessionId, profileData);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error setting business profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعيين ملف الأعمال' });
    }
}

async function updateBusinessProfile(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, profileData } = req.body;

        if (!sessionId || !profileData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.updateBusinessProfile(sessionId, profileData);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error updating business profile:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث ملف الأعمال' });
    }
}

async function getBusinessHours(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const hours = await WhatsAppManager.getBusinessHours(sessionId);
        res.json({ success: true, hours });
    } catch (error) {
        console.error('❌ Error getting business hours:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب ساعات العمل' });
    }
}

async function setBusinessHours(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, hours } = req.body;

        if (!sessionId || !hours) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.setBusinessHours(sessionId, hours);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error setting business hours:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعيين ساعات العمل' });
    }
}

// ==================== Broadcast Controllers ====================

async function sendBroadcast(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jids, message } = req.body;

        if (!sessionId || !jids || !Array.isArray(jids) || !message) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const results = await WhatsAppManager.sendBroadcast(sessionId, jids, message);
        res.json({ success: true, results });
    } catch (error) {
        console.error('❌ Error sending broadcast:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال البث' });
    }
}

async function createBroadcastList(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, name, jids } = req.body;

        if (!sessionId || !name || !jids || !Array.isArray(jids)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const list = await WhatsAppManager.createBroadcastList(sessionId, name, jids);
        res.json({ success: true, list });
    } catch (error) {
        console.error('❌ Error creating broadcast list:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء قائمة البث' });
    }
}

async function getBroadcastLists(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const lists = await WhatsAppManager.getBroadcastLists(sessionId);
        res.json({ success: true, lists });
    } catch (error) {
        console.error('❌ Error getting broadcast lists:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب قوائم البث' });
    }
}

// ==================== Labels Controllers ====================

async function labelChat(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, labelId } = req.body;

        if (!sessionId || !jid || !labelId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.labelChat(sessionId, jid, labelId);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error labeling chat:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إضافة علامة للمحادثة' });
    }
}

async function getLabels(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const labels = await WhatsAppManager.getLabels(sessionId);
        res.json({ success: true, labels });
    } catch (error) {
        console.error('❌ Error getting labels:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب العلامات' });
    }
}

async function createLabel(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, name, color } = req.body;

        if (!sessionId || !name) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const label = await WhatsAppManager.createLabel(sessionId, name, color);
        res.json({ success: true, label });
    } catch (error) {
        console.error('❌ Error creating label:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء علامة' });
    }
}

async function deleteLabel(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, labelId } = req.body;

        if (!sessionId || !labelId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.deleteLabel(sessionId, labelId);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error deleting label:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف علامة' });
    }
}

// ==================== Starred Messages Controllers ====================

async function starMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, key } = req.body;

        if (!sessionId || !key) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.starMessage(sessionId, key);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error starring message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تمييز الرسالة' });
    }
}

async function unstarMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, key } = req.body;

        if (!sessionId || !key) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.unstarMessage(sessionId, key);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error unstarring message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إلغاء تمييز الرسالة' });
    }
}

async function getStarredMessages(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const messages = await WhatsAppManager.getStarredMessages(sessionId, jid);
        res.json({ success: true, messages });
    } catch (error) {
        console.error('❌ Error getting starred messages:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الرسائل المميزة' });
    }
}

// ==================== Privacy Controllers ====================

async function fetchBlocklist(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const blocklist = await WhatsAppManager.fetchBlocklist(sessionId);
        res.json({ success: true, blocklist });
    } catch (error) {
        console.error('❌ Error fetching blocklist:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المحظورين' });
    }
}

async function fetchPrivacySettings(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const settings = await WhatsAppManager.fetchPrivacySettings(sessionId);
        res.json({ success: true, settings });
    } catch (error) {
        console.error('❌ Error fetching privacy settings:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب إعدادات الخصوصية' });
    }
}

async function setPrivacy(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, settings } = req.body;

        if (!sessionId || !settings) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.setPrivacy(sessionId, settings);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error setting privacy:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعيين إعدادات الخصوصية' });
    }
}

// ==================== Advanced Group Features Controllers ====================

async function groupFetchAllParticipating(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const groups = await WhatsAppManager.groupFetchAllParticipating(sessionId);
        res.json({ success: true, groups });
    } catch (error) {
        console.error('❌ Error fetching all groups:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب جميع المجموعات' });
    }
}

async function groupToggleEphemeral(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, ephemeral } = req.body;

        if (!sessionId || !jid || typeof ephemeral !== 'boolean') {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.groupToggleEphemeral(sessionId, jid, ephemeral);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error toggling group ephemeral:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تفعيل/تعطيل الرسائل المؤقتة' });
    }
}

async function groupUpdatePicture(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid, picture } = req.body;

        if (!sessionId || !jid || !picture) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.groupUpdatePicture(sessionId, jid, picture);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error updating group picture:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث صورة المجموعة' });
    }
}

async function groupInviteAccept(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, inviteCode } = req.body;

        if (!sessionId || !inviteCode) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.groupInviteAccept(sessionId, inviteCode);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error accepting group invite:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء قبول دعوة المجموعة' });
    }
}

async function groupInviteReject(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, inviteCode } = req.body;

        if (!sessionId || !inviteCode) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.groupInviteReject(sessionId, inviteCode);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error rejecting group invite:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء رفض دعوة المجموعة' });
    }
}

async function groupInviteInfo(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, inviteCode } = req.query;

        if (!sessionId || !inviteCode) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const info = await WhatsAppManager.groupInviteInfo(sessionId, inviteCode);
        res.json({ success: true, info });
    } catch (error) {
        console.error('❌ Error getting group invite info:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب معلومات الدعوة' });
    }
}

// ==================== Status Controllers ====================

async function getStatus(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, jid } = req.query;

        if (!sessionId || !jid) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const status = await WhatsAppManager.getStatus(sessionId, jid);
        res.json({ success: true, status });
    } catch (error) {
        console.error('❌ Error getting status:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الحالة' });
    }
}

async function setStatus(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, status } = req.body;

        if (!sessionId || !status) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const result = await WhatsAppManager.setStatus(sessionId, status);
        res.json({ success: true, result });
    } catch (error) {
        console.error('❌ Error setting status:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعيين الحالة' });
    }
}

// ==================== URL Info Controller ====================

async function getUrlInfo(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, url } = req.query;

        if (!sessionId || !url) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const info = await WhatsAppManager.getUrlInfo(sessionId, url);
        res.json({ success: true, info });
    } catch (error) {
        console.error('❌ Error getting URL info:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب معلومات الرابط' });
    }
}

// ==================== Poll & Order Controllers ====================

async function sendPoll(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, pollData } = req.body;

        if (!sessionId || !to || !pollData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendPoll(sessionId, to, pollData);
        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending poll:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الاستطلاع' });
    }
}

async function sendOrder(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, orderData } = req.body;

        if (!sessionId || !to || !orderData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendOrder(sessionId, to, orderData);
        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending order:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الطلب' });
    }
}

async function sendCatalog(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, catalogData } = req.body;

        if (!sessionId || !to || !catalogData) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendCatalog(sessionId, to, catalogData);
        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending catalog:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الكتالوج' });
    }
}

async function getCatalog(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const catalog = await WhatsAppMessageHandler.getCatalog(sessionId);
        res.json({ success: true, catalog });
    } catch (error) {
        console.error('❌ Error getting catalog:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب الكتالوج' });
    }
}

async function getProducts(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, catalogId } = req.query;

        if (!sessionId || !catalogId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const products = await WhatsAppMessageHandler.getProducts(sessionId, catalogId);
        res.json({ success: true, products });
    } catch (error) {
        console.error('❌ Error getting products:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب المنتجات' });
    }
}

async function getCart(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, cartId } = req.query;

        if (!sessionId || !cartId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const cart = await WhatsAppMessageHandler.getCart(sessionId, cartId);
        res.json({ success: true, cart });
    } catch (error) {
        console.error('❌ Error getting cart:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب السلة' });
    }
}

// ==================== Template Messages Controllers ====================

async function sendTemplateMessage(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, to, templateId, parameters } = req.body;

        if (!sessionId || !to || !templateId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const message = await WhatsAppMessageHandler.sendTemplateMessage(sessionId, to, templateId, parameters || {});
        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error sending template message:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال رسالة القالب' });
    }
}

async function getMessageTemplate(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const templates = await WhatsAppMessageHandler.getMessageTemplate(sessionId);
        res.json({ success: true, templates });
    } catch (error) {
        console.error('❌ Error getting message templates:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب قوالب الرسائل' });
    }
}

module.exports = {
    // Sessions
    createSession,
    getSessions,
    getSession,
    updateSession,
    deleteSession,
    connectSession,
    disconnectSession,

    // Conversations & Messages
    getConversations,
    getMessages,
    sendMessage,
    sendMedia,
    markAsRead,
    sendButtons,
    sendList,
    sendProduct,
    sendReaction,

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

    // Contacts
    updateContact,
    linkCustomer,

    // Quick Replies
    getQuickReplies,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    sendQuickReply,

    // Settings
    getSettings,
    updateSettings,

    // Stats
    getStats,

    // Message Management
    editMessage,
    deleteMessage,
    forwardMessage,

    // Chat Management
    archiveChat,
    pinChat,
    muteChat,
    markChatUnread,
    clearChat,
    deleteChat,

    // Migration
    migrateAuthToDatabase,

    // Groups
    createGroup,
    updateGroupParticipants,
    updateGroupSubject,
    updateGroupDescription,
    updateGroupSettings,
    leaveGroup,
    getGroupInviteCode,
    revokeGroupInviteCode,

    // Privacy & Profile
    blockContact,
    unblockContact,
    checkNumber,
    updateProfile,
    getGroupMetadata,
    getProfile,

    // Business Profile
    getBusinessProfile,
    setBusinessProfile,
    updateBusinessProfile,
    getBusinessHours,
    setBusinessHours,

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

    // Privacy Advanced
    fetchBlocklist,
    fetchPrivacySettings,
    setPrivacy,

    // Advanced Group Features
    groupFetchAllParticipating,
    groupToggleEphemeral,
    groupUpdatePicture,
    groupInviteAccept,
    groupInviteReject,
    groupInviteInfo,

    // Status
    getStatus,
    setStatus,

    // URL Info
    getUrlInfo,

    // Poll & Order
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

/**
 * الحصول على جلسات WhatsApp للتصحيح (Debug)
 */
async function getDebugSessions(req, res) {
    try {
        console.log('🔍 Debugging WhatsApp sessions...');

        // 1. Get all sessions from DB (ignore companyId for debug to see everything)
        const dbSessions = await getSharedPrismaClient().whatsAppSession.findMany({
            select: {
                id: true,
                name: true,
                status: true,
                companyId: true
            }
        });

        // 2. Get in-memory sessions
        const memorySessions = WhatsAppManager.getAllSessions();

        // 3. Compare
        const sessions = dbSessions.map(session => {
            const memorySession = memorySessions[session.id];
            const inMemory = !!memorySession;

            return {
                id: session.id,
                name: session.name,
                companyId: session.companyId,
                dbStatus: session.status,
                memoryStatus: inMemory ? memorySession.status : 'NOT_IN_MEMORY',
                socketReady: inMemory ? (memorySession.hasSocket ? 'YES' : 'NO') : 'N/A',
                isConsistent: inMemory ? (session.status === memorySession.status) : (session.status === 'DISCONNECTED' || session.status === 'LOGGED_OUT')
            };
        });

        res.json({
            success: true,
            totalDb: dbSessions.length,
            totalMemory: Object.keys(memorySessions).length,
            sessions
        });
    } catch (error) {
        console.error('❌ Error in debug sessions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    // Sessions
    createSession,
    getSessions,
    getSession,
    updateSession,
    deleteSession,
    connectSession,
    disconnectSession,

    // Conversations & Messages
    getConversations,
    getMessages,
    sendMessage,
    sendMedia,
    markAsRead,
    sendButtons,
    sendList,
    sendProduct,
    sendReaction,

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

    // Contacts
    updateContact,
    linkCustomer,

    // Quick Replies
    getQuickReplies,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    sendQuickReply,

    // Settings
    getSettings,
    updateSettings,

    // Stats
    getStats,

    // Message Management
    editMessage,
    deleteMessage,
    forwardMessage,

    // Chat Management
    archiveChat,
    pinChat,
    muteChat,
    markChatUnread,
    clearChat,
    deleteChat,

    // Migration
    migrateAuthToDatabase,

    // Privacy & Profile
    blockContact,
    unblockContact,
    checkNumber,
    updateProfile,
    getProfile,
    syncProfile,

    // Business Profile
    getBusinessProfile,
    setBusinessProfile,
    updateBusinessProfile,
    getBusinessHours,
    setBusinessHours,

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

    // Privacy Advanced
    fetchBlocklist,
    fetchPrivacySettings,
    setPrivacy,

    // Advanced Group Features
    groupFetchAllParticipating,
    groupToggleEphemeral,
    groupUpdatePicture,
    groupInviteAccept,
    groupInviteReject,
    groupInviteInfo,

    // Status
    getStatus,
    setStatus,

    // URL Info
    getUrlInfo,

    // Poll & Order
    sendPoll,
    sendOrder,
    sendCatalog,
    getCatalog,
    getProducts,
    getCart,

    // Template Messages
    sendTemplateMessage,
    getMessageTemplate,
    getDebugSessions,

    // Status Updates
    getStatuses,
    postStatus,
    markStatusViewed
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📸 Status Updates (الحالات)
// ═══════════════════════════════════════════════════════════════════════════════

async function getStatuses(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.params;

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const statuses = await getSharedPrismaClient().whatsAppStatus.findMany({
            where: {
                sessionId,
                expiresAt: { gte: new Date() }
            },
            orderBy: { timestamp: 'desc' },
            include: { whatsapp_sessions: { select: { name: true } } }
        });

        res.json({ success: true, statuses });
    } catch (error) {
        console.error('❌ Error getting statuses:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

async function postStatus(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId } = req.params;
        const { content } = req.body;
        const mediaFile = req.file;

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const sessionManager = WhatsAppManager.getSession(sessionId);
        if (!sessionManager || sessionManager.status !== 'connected') {
            return res.status(400).json({ error: 'الجلسة غير متصلة' });
        }

        let statusData = { type: 'TEXT', content: content || '' };

        if (mediaFile) {
            const media = await WhatsAppMediaHandler.uploadMedia(
                mediaFile.path,
                mediaFile.mimetype,
                mediaFile.originalname
            );
            statusData = {
                type: media.type.toUpperCase(),
                content: content || '',
                mediaUrl: media.url,
                mediaMimeType: media.mimetype
            };
        }

        const jid = 'status@broadcast';
        let result = await sessionManager.sock.sendMessage(jid,
            statusData.type === 'TEXT' ? { text: statusData.content } :
                statusData.type === 'IMAGE' ? { image: { url: statusData.mediaUrl }, caption: statusData.content } :
                    { video: { url: statusData.mediaUrl }, caption: statusData.content }
        );

        const timestamp = new Date();
        const expiresAt = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000);

        const savedStatus = await getSharedPrismaClient().whatsAppStatus.create({
            data: {
                sessionId,
                remoteJid: session.phoneNumber || 'me',
                messageId: result.key.id,
                type: statusData.type,
                content: statusData.content,
                mediaUrl: statusData.mediaUrl,
                mediaMimeType: statusData.mediaMimeType,
                timestamp,
                expiresAt
            }
        });

        res.json({ success: true, status: savedStatus });
    } catch (error) {
        console.error('❌ Error posting status:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}

async function markStatusViewed(req, res) {
    try {
        const { companyId } = req.user;
        const { sessionId, statusId } = req.params;

        const session = await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { id: sessionId, companyId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        const status = await getSharedPrismaClient().whatsAppStatus.update({
            where: { id: statusId },
            data: {
                isViewed: true,
                viewedAt: new Date()
            }
        });

        res.json({ success: true, status });
    } catch (error) {
        console.error('❌ Error marking status:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
}



