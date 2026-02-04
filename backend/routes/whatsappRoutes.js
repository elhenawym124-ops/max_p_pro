/**
 * 📱 WhatsApp Routes
 * مسارات API لنظام WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controller/whatsappController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const multer = require('multer');
const path = require('path');

// إعداد multer لرفع الملفات
// إعداد multer لرفع الملفات
const MIME_TYPE_MAP = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'video/quicktime': 'mov',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/amr': 'amr',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/whatsapp/temp'));
    },
    filename: (req, file, cb) => {
        const ext = MIME_TYPE_MAP[file.mimetype] || 'bin';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}.${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max
    },
    fileFilter: (req, file, cb) => {
        if (MIME_TYPE_MAP[file.mimetype]) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم'), false);
        }
    }
});

// Logging middleware
router.use((req, res, next) => {
    console.log(`📱 WhatsApp Router: ${req.method} ${req.path}`);
    next();
});

// Test route
router.get('/test', (req, res) => res.json({ message: 'WhatsApp router is working' }));

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 إدارة الجلسات
// ═══════════════════════════════════════════════════════════════════════════════

// إنشاء جلسة جديدة
router.get('/sessions/debug', whatsappController.getDebugSessions);
router.post('/sessions', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.createSession);

// جلب كل الجلسات
router.get('/sessions', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getSessions);

// جلب جلسة محددة
router.get('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getSession);

// تحديث جلسة
router.put('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateSession);

// حذف جلسة
router.delete('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.deleteSession);

// بدء الاتصال بجلسة
router.post('/sessions/:id/connect', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.connectSession);

// قطع الاتصال بجلسة
router.post('/sessions/:id/disconnect', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.disconnectSession);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 المحادثات والرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// جلب المحادثات
router.get('/conversations', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getConversations);

// جلب رسائل محادثة
router.get('/conversations/:jid/messages', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getMessages);

// إرسال رسالة نصية
router.post('/messages/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendMessage);

// إرسال وسائط
router.post('/messages/send-media', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendMedia);

// رفع وإرسال ملف
router.post('/messages/upload-send', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم رفع ملف' });
        }

        const { sessionId, to, caption } = req.body;
        const { WhatsAppMediaHandler, WhatsAppMessageHandler } = require('../services/whatsapp');

        // رفع الملف
        const media = await WhatsAppMediaHandler.uploadMedia(
            req.file.path,
            req.file.mimetype,
            req.file.originalname
        );

        // تحديد نوع الوسائط
        let message;
        switch (media.type) {
            case 'image':
                message = await WhatsAppMessageHandler.sendImage(sessionId, to, media, caption);
                break;
            case 'video':
                message = await WhatsAppMessageHandler.sendVideo(sessionId, to, media, caption);
                break;
            case 'audio':
                message = await WhatsAppMessageHandler.sendAudio(sessionId, to, media);
                break;
            default:
                message = await WhatsAppMessageHandler.sendDocument(sessionId, to, {
                    ...media,
                    fileName: req.file.originalname
                }, { caption });
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error uploading and sending:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء رفع وإرسال الملف' });
    }
});

// تحديد الرسائل كمقروءة
router.post('/messages/read', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.markAsRead);

// إرسال رسالة بأزرار تفاعلية
router.post('/messages/send-buttons', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendButtons);

// إرسال رسالة بقائمة
router.post('/messages/send-list', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendList);

// إرسال منتج
router.post('/messages/send-product', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendProduct);

// إرسال تفاعل (Reaction)
router.post('/messages/send-reaction', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendReaction);

// ═══════════════════════════════════════════════════════════════════════════════
// 📸 الحالات (Status Updates)
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الحالات
router.get('/:sessionId/statuses', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getStatuses);

// نشر حالة جديدة
router.post('/:sessionId/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), upload.single('media'), whatsappController.postStatus);

// تحديد الحالة كمشاهدة
router.put('/:sessionId/status/:statusId/view', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.markStatusViewed);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 جهات الاتصال
// ═══════════════════════════════════════════════════════════════════════════════

// تحديث جهة اتصال
router.put('/contacts/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateContact);

// ربط جهة اتصال بعميل
router.post('/contacts/:id/link-customer', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.linkCustomer);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الردود السريعة
router.get('/quick-replies', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getQuickReplies);

// إنشاء رد سريع
router.post('/quick-replies', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.createQuickReply);

// تحديث رد سريع
router.put('/quick-replies/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateQuickReply);

// حذف رد سريع
router.delete('/quick-replies/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.deleteQuickReply);

// إرسال رد سريع
router.post('/quick-replies/:id/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendQuickReply);

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ الإعدادات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الإعدادات
router.get('/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getSettings);

// تحديث الإعدادات
router.put('/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateSettings);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 المجموعات
// ═══════════════════════════════════════════════════════════════════════════════

// إنشاء مجموعة
router.post('/groups', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.createGroup);

// جلب بيانات مجموعة
router.get('/groups/:jid', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getGroupMetadata);

// تحديث اسم المجموعة
router.put('/groups/:jid/subject', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateGroupSubject);

// تحديث وصف المجموعة
router.put('/groups/:jid/description', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateGroupDescription);

// تحديث إعدادات المجموعة
router.put('/groups/:jid/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateGroupSettings);

// إضافة/إزالة مشاركين
router.put('/groups/:jid/participants', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateGroupParticipants);

// الخروج من المجموعة
router.post('/groups/:jid/leave', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.leaveGroup);

// جلب رابط الدعوة
router.get('/groups/:jid/invite-code', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getGroupInviteCode);

// إلغاء رابط الدعوة
router.post('/groups/:jid/revoke-invite', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.revokeGroupInviteCode);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الإحصائيات
router.get('/stats', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 إدارة الرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// تعديل رسالة
router.post('/messages/edit', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.editMessage);

// حذف رسالة
router.post('/messages/delete', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.deleteMessage);

// إعادة توجيه رسالة
router.post('/messages/forward', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.forwardMessage);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 إدارة المحادثات
// ═══════════════════════════════════════════════════════════════════════════════

// أرشفة محادثة
router.post('/chats/archive', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.archiveChat);

// تثبيت محادثة
router.post('/chats/pin', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.pinChat);

// كتم محادثة
router.post('/chats/mute', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.muteChat);

// تحديد كغير مقروء
router.post('/chats/unread', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.markChatUnread);

// حذف محادثة
router.post('/chats/delete', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.deleteChat);

// مسح محتوى المحادثة
router.post('/chats/clear', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.clearChat);

// Migration endpoint
router.post('/migrate-auth', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.migrateAuthToDatabase);

router.put('/groups/:jid/description', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateGroupDescription);

// تحديث إعدادات المجموعة
router.put('/groups/:jid/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateGroupSettings);

// مغادرة المجموعة
router.post('/groups/:jid/leave', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.leaveGroup);

// الحصول على رابط الدعوة
router.get('/groups/:jid/invite-code', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getGroupInviteCode);

// إلغاء رابط الدعوة
router.post('/groups/:jid/revoke-invite', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.revokeGroupInviteCode);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 الخصوصية والحظر
// ═══════════════════════════════════════════════════════════════════════════════

// حظر جهة اتصال
router.post('/contacts/block', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.blockContact);

// إلغاء حظر جهة اتصال
router.post('/contacts/unblock', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.unblockContact);

// التحقق من الرقم
router.post('/check-number', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.checkNumber);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 الملف الشخصي
// ═══════════════════════════════════════════════════════════════════════════════

// مزامنة الملف الشخصي
router.post('/profile/sync', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.syncProfile);

// جلب الملف الشخصي
router.get('/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getProfile);

// تحديث الملف الشخصي
router.post('/profile/update', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), upload.single('picture'), whatsappController.updateProfile);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏢 Business Profile
// ═══════════════════════════════════════════════════════════════════════════════

// جلب ملف الأعمال
router.get('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getBusinessProfile);

// تعيين ملف الأعمال
router.post('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.setBusinessProfile);

// تحديث ملف الأعمال
router.put('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.updateBusinessProfile);

// جلب ساعات العمل
router.get('/business/hours', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getBusinessHours);

// تعيين ساعات العمل
router.post('/business/hours', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.setBusinessHours);

// ═══════════════════════════════════════════════════════════════════════════════
// 📢 البث (Broadcast)
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال بث جماعي
router.post('/broadcast/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendBroadcast);

// إنشاء قائمة بث
router.post('/broadcast/lists', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.createBroadcastList);

// جلب قوائم البث
router.get('/broadcast/lists', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getBroadcastLists);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ العلامات (Labels)
// ═══════════════════════════════════════════════════════════════════════════════

// إضافة علامة للمحادثة
router.post('/labels/chat', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.labelChat);

// جلب العلامات
router.get('/labels', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getLabels);

// إنشاء علامة جديدة
router.post('/labels', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.createLabel);

// حذف علامة
router.delete('/labels/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.deleteLabel);

// ═══════════════════════════════════════════════════════════════════════════════
// ⭐ الرسائل المميزة (Starred Messages)
// ═══════════════════════════════════════════════════════════════════════════════

// تمييز رسالة
router.post('/messages/star', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.starMessage);

// إلغاء تمييز رسالة
router.post('/messages/unstar', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.unstarMessage);

// جلب الرسائل المميزة
router.get('/messages/starred', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getStarredMessages);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 الخصوصية المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════

// جلب قائمة المحظورين
router.get('/privacy/blocklist', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.fetchBlocklist);

// جلب إعدادات الخصوصية
router.get('/privacy/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.fetchPrivacySettings);

// تعيين إعدادات الخصوصية
router.post('/privacy/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.setPrivacy);

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 ميزات المجموعات المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع المجموعات
router.get('/groups/all', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.groupFetchAllParticipating);

// تفعيل/تعطيل الرسائل المؤقتة
router.post('/groups/:jid/ephemeral', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.groupToggleEphemeral);

// تحديث صورة المجموعة
router.post('/groups/:jid/picture', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.groupUpdatePicture);

// قبول دعوة للمجموعة
router.post('/groups/invite/accept', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.groupInviteAccept);

// رفض دعوة للمجموعة
router.post('/groups/invite/reject', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.groupInviteReject);

// معلومات عن رابط الدعوة
router.get('/groups/invite/info', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.groupInviteInfo);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الحالة (Status)
// ═══════════════════════════════════════════════════════════════════════════════

// جلب حالة مستخدم
router.get('/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getStatus);

// تعيين حالة المستخدم
router.post('/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.setStatus);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 معلومات الرابط
// ═══════════════════════════════════════════════════════════════════════════════

// الحصول على معلومات رابط
router.get('/url/info', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getUrlInfo);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الاستطلاعات والطلبات
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال استطلاع
router.post('/messages/send-poll', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendPoll);

// إرسال طلب
router.post('/messages/send-order', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendOrder);

// إرسال كتالوج
router.post('/messages/send-catalog', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendCatalog);

// جلب الكتالوج
router.get('/catalog', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getCatalog);

// جلب المنتجات
router.get('/products', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getProducts);

// جلب السلة
router.get('/cart', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getCart);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 قوالب الرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال رسالة قالب
router.post('/messages/send-template', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.sendTemplateMessage);

// جلب قوالب الرسائل
router.get('/templates', verifyToken.authenticateToken, checkAppAccess('whatsapp-integration'), whatsappController.getMessageTemplate);

module.exports = router;
