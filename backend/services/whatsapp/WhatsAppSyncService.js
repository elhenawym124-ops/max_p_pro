const { getSharedPrismaClient } = require('../sharedDatabase');

/**
 * خدمة مزامنة واتساب مع نظام CRM المركزي
 * WhatsAppSyncService
 */
const WhatsAppSyncService = {
    /**
     * العثور على عميل أو إنشاؤه بناءً على رقم الهاتف
     */
    async findOrCreateCustomer(companyId, phoneNumber, pushName, profilePicUrl) {
        const prisma = getSharedPrismaClient();

        // تنظيف رقم الهاتف
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        // البحث عن العميل
        let customer = await prisma.customer.findFirst({
            where: {
                companyId,
                OR: [
                    { phone: cleanPhone },
                    { whatsappId: cleanPhone }
                ]
            }
        });

        // إذا لم يوجد، نقوم بإنشائه
        if (!customer) {
            console.log(`👤 Creating new customer for phone: ${cleanPhone}`);
            customer = await prisma.customer.create({
                data: {
                    companyId,
                    firstName: pushName || 'WhatsApp User',
                    lastName: '',
                    phone: cleanPhone,
                    whatsappId: cleanPhone,
                    avatar: profilePicUrl,
                    status: 'LEAD'
                }
            });
        } else {
            // تحديث البيانات إذا لزم الأمر (مثل الصورة)
            if (profilePicUrl && !customer.avatar) {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { avatar: profilePicUrl }
                });
            }
        }

        return customer;
    },

    /**
     * العثور على محادثة نشطة أو إنشاؤها
     */
    async findOrCreateConversation(companyId, customerId) {
        const prisma = getSharedPrismaClient();

        // البحث عن محادثة واتساب نشطة
        let conversation = await prisma.conversation.findFirst({
            where: {
                companyId,
                customerId,
                channel: 'WHATSAPP',
                status: 'ACTIVE'
            }
        });

        // إذا لم توجد، ننشئ واحدة جديدة
        if (!conversation) {
            console.log(`💬 Creating new conversation for customer: ${customerId}`);
            conversation = await prisma.conversation.create({
                data: {
                    companyId,
                    customerId,
                    channel: 'WHATSAPP',
                    status: 'ACTIVE',
                    subject: 'WhatsApp Conversation',
                    lastMessageAt: new Date(),
                    unreadCount: 0
                }
            });
        }

        return conversation;
    },

    /**
     * مزامنة رسالة (واردة أو صادرة)
     */
    async syncMessage(companyId, remoteJid, messageData, isIncoming) {
        try {
            const prisma = getSharedPrismaClient();

            // استخراج رقم الهاتف
            const phoneNumber = remoteJid.split('@')[0].replace(/\D/g, '');

            // 1. ضمان وجود العميل
            const customer = await this.findOrCreateCustomer(
                companyId,
                phoneNumber,
                messageData.pushName,
                messageData.profilePicUrl
            );

            // 2. ضمان وجود المحادثة
            const conversation = await this.findOrCreateConversation(companyId, customer.id);

            // 3. إنشاء الرسالة المركزية
            const message = await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    type: this.mapMessageType(messageData.type),
                    content: messageData.content || '',
                    attachments: messageData.mediaUrl ? JSON.stringify({
                        url: messageData.mediaUrl,
                        type: messageData.mediaType,
                        mime: messageData.mediaMimeType,
                        name: messageData.mediaFileName
                    }) : null,
                    isFromCustomer: isIncoming,
                    senderId: isIncoming ? null : messageData.senderId, // If outgoing, who sent it?
                    createdAt: messageData.timestamp || new Date(),
                    isRead: !isIncoming // Outgoing is implicitly read
                }
            });

            // 4. تحديث المحادثة (Last Message)
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    lastMessageAt: new Date(),
                    lastMessagePreview: this.truncatePreview(messageData.content, messageData.type),
                    // زيادة عدد غير المقروء فقط للرسائل الواردة
                    unreadCount: isIncoming ? { increment: 1 } : undefined
                }
            });

            console.log(`✅ Synced WhatsApp message to CRM: ${message.id}`);
            return { customer, conversation, message };

        } catch (error) {
            console.error('❌ Error syncing to central DB:', error);
            // Non-blocking error - we don't want to stop the main flow
            return null;
        }
    },

    /**
     * تحويل نوع الرسالة من واتساب للنظام
     */
    mapMessageType(whatsAppType) {
        const typeMap = {
            'text': 'TEXT',
            'image': 'IMAGE',
            'video': 'VIDEO',
            'audio': 'AUDIO',
            'voice': 'AUDIO',
            'document': 'DOCUMENT',
            'location': 'LOCATION',
            'sticker': 'IMAGE', // Fallback
            'template': 'TEMPLATE',
            'interactive': 'INTERACTIVE'
        };
        return typeMap[whatsAppType] || 'TEXT';
    },

    /**
     * اختصار نص المعاينة
     */
    truncatePreview(content, type) {
        if (!content && type !== 'text') return `[${type.toUpperCase()}]`;
        return content && content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
};

module.exports = WhatsAppSyncService;
