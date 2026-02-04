/**
 * 🤖 WhatsApp AI Integration Service
 * تكامل الذكاء الصناعي مع WhatsApp
 * 
 * المميزات:
 * - الرد التلقائي باستخدام AI Agent
 * - اقتراح الردود الذكية
 * - تحليل المشاعر
 * - ملخص المحادثات
 * - تكامل مع RAG للمنتجات
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
const WhatsAppManager = require('./WhatsAppManager');
const socketService = require('../socketService');
const getIO = () => socketService.getIO();

/**
 * معالجة رسالة واردة وتوليد رد AI
 * @param {string} sessionId - معرف الجلسة
 * @param {string} companyId - معرف الشركة
 * @param {object} message - الرسالة المحفوظة
 * @param {object} sock - WhatsApp socket
 * @param {object} sessionConfig - إعدادات الجلسة
 */
async function processMessage(sessionId, companyId, message, sock, sessionConfig) {
    try {
        // التحقق من تفعيل AI
        if (!sessionConfig.aiEnabled) {
            console.log(`🤖 AI disabled for session ${sessionId}`);
            return;
        }

        // التحقق من ساعات العمل
        if (sessionConfig.workingHoursEnabled) {
            const isWorkingHours = checkWorkingHours(sessionConfig.workingHours);
            if (!isWorkingHours) {
                // إرسال رسالة عدم التواجد
                if (sessionConfig.awayMessage) {
                    await sendAwayMessage(sessionId, message.remoteJid, sessionConfig.awayMessage);
                }
                return;
            }
        }

        // جلب إعدادات AI للشركة
        const prisma = getSharedPrismaClient();

        // التحقق من وجود جدول إعدادات AI
        if (!prisma.aiSetting) {
            console.log(`⚠️ AI Setting table missing. AI features disabled for company ${companyId}`);
            return;
        }

        const aiSettings = await prisma.aiSetting.findUnique({
            where: { companyId }
        });

        if (!aiSettings?.autoReplyEnabled) {
            console.log(`🤖 Auto-reply disabled for company ${companyId}`);
            // يمكن إرسال اقتراح بدلاً من الرد التلقائي
            if (sessionConfig.aiMode === 'suggest') {
                await generateSuggestion(sessionId, companyId, message);
            }
            return;
        }

        // التحقق من نوع الرسالة
        if (message.messageType !== 'TEXT') {
            // معالجة الوسائط بشكل مختلف
            await handleMediaMessage(sessionId, companyId, message, sock, sessionConfig);
            return;
        }

        // توليد الرد
        const aiResponse = await generateAIResponse(sessionId, companyId, message, aiSettings);

        if (!aiResponse) {
            console.log(`🤖 No AI response generated for message ${message.id}`);
            return;
        }

        // تحديد طريقة الإرسال
        if (sessionConfig.autoReply || sessionConfig.aiMode === 'auto') {
            // إرسال الرد تلقائياً
            await sendAIResponse(sessionId, message.remoteJid, aiResponse, message.id);
        } else {
            // إرسال اقتراح للمستخدم
            await sendSuggestion(sessionId, companyId, message.remoteJid, aiResponse);
        }

    } catch (error) {
        console.error('❌ Error processing AI message:', error);
        await WhatsAppManager.logEvent(sessionId, companyId, 'ai_error', { error: error.message }, 'error');
    }
}

/**
 * توليد رد AI
 */
async function generateAIResponse(sessionId, companyId, message, aiSettings) {
    try {
        // جلب سياق المحادثة
        const conversationContext = await getConversationContext(sessionId, message.remoteJid);

        // جلب معلومات العميل
        const customerInfo = await getCustomerInfo(sessionId, message.remoteJid, companyId);

        // استيراد خدمة AI Agent
        let aiAgentService;
        try {
            aiAgentService = require('../aiAgentService');
        } catch (e) {
            console.error('❌ AI Agent service not available:', e);
            return null;
        }

        // بناء السياق
        const context = {
            companyId,
            channel: 'WHATSAPP',
            customerName: customerInfo?.name || customerInfo?.pushName || 'العميل',
            customerPhone: customerInfo?.phoneNumber,
            conversationHistory: conversationContext,
            aiSettings
        };

        // توليد الرد باحترافية (Modern API)
        const aiAgentResponse = await aiAgentService.processCustomerMessage({
            content: message.content,
            conversationId: message.remoteJid,
            senderId: message.remoteJid,
            platform: 'whatsapp',
            companyId: companyId,
            customerData: customerInfo,
            channel: 'WHATSAPP'
        });

        if (!aiAgentResponse || !aiAgentResponse.success) {
            console.log(`🤖 AI processing failed:`, aiAgentResponse?.error || 'Unknown error');
            return null;
        }

        return {
            text: aiAgentResponse.content,
            images: aiAgentResponse.images || [],
            confidence: aiAgentResponse.confidence || 0.8,
            intent: aiAgentResponse.intent,
            sentiment: aiAgentResponse.sentiment,
            suggestedProducts: aiAgentResponse.suggestedProducts
        };

    } catch (error) {
        console.error('❌ Error generating AI response:', error);
        return null;
    }
}

/**
 * إرسال رد AI
 */
async function sendAIResponse(sessionId, to, aiResponse, originalMessageId) {
    try {
        // 1. إرسال النص (إذا وجد)
        let sentMessage = null;
        if (aiResponse.text) {
            console.log(`🤖 Sending AI text response to ${to}`);
            sentMessage = await WhatsAppMessageHandler.sendText(sessionId, to, aiResponse.text, {
                quotedMessageId: originalMessageId,
                isAIResponse: true,
                aiConfidence: aiResponse.confidence
            });
        }

        // 2. إرسال الصور (إذا وجدت)
        if (aiResponse.images && aiResponse.images.length > 0) {
            console.log(`📸 Sending ${aiResponse.images.length} images to ${to}`);
            for (const img of aiResponse.images) {
                try {
                    await WhatsAppMessageHandler.sendImage(sessionId, to, { url: img.url }, img.caption || '', {
                        quotedMessageId: originalMessageId,
                        isAIResponse: true
                    });
                } catch (imgError) {
                    console.error('❌ Failed to send AI image:', imgError.message);
                }
            }
        }

        // 3. إرسال المنتجات المقترحة (RAG legacy compatibility)
        if (aiResponse.suggestedProducts?.length > 0) {
            await sendProductSuggestions(sessionId, to, aiResponse.suggestedProducts);
        }

        return sentMessage;
    } catch (error) {
        console.error('❌ Error sending AI response:', error);
        throw error;
    }
}

/**
 * إرسال اقتراح للمستخدم (بدون إرسال تلقائي)
 */
async function sendSuggestion(sessionId, companyId, remoteJid, aiResponse) {
    const io = getIO();

    io?.to(`company_${companyId}`).emit('whatsapp:ai:suggestion', {
        sessionId,
        remoteJid,
        suggestion: {
            text: aiResponse.text,
            confidence: aiResponse.confidence,
            intent: aiResponse.intent,
            sentiment: aiResponse.sentiment
        }
    });
}

/**
 * توليد اقتراح فقط
 */
async function generateSuggestion(sessionId, companyId, message) {
    try {
        const aiSettings = await getSharedPrismaClient().aiSetting.findUnique({
            where: { companyId }
        });

        const aiResponse = await generateAIResponse(sessionId, companyId, message, aiSettings);

        if (aiResponse) {
            await sendSuggestion(sessionId, companyId, message.remoteJid, aiResponse);
        }
    } catch (error) {
        console.error('❌ Error generating suggestion:', error);
    }
}

/**
 * معالجة رسائل الوسائط
 */
async function handleMediaMessage(sessionId, companyId, message, sock, sessionConfig) {
    try {
        // تحليل الصورة إذا كانت صورة
        if (message.messageType === 'IMAGE') {
            // يمكن استخدام multimodal AI لتحليل الصورة
            const io = getIO();
            io?.to(`company_${companyId}`).emit('whatsapp:ai:media', {
                sessionId,
                remoteJid: message.remoteJid,
                mediaType: 'image',
                message: 'تم استلام صورة - يمكن تحليلها'
            });
        }

        // إرسال رد افتراضي للوسائط
        if (sessionConfig.autoReply) {
            const mediaResponses = {
                IMAGE: 'شكراً لإرسال الصورة! سأراجعها وأرد عليك قريباً 📷',
                VIDEO: 'شكراً لإرسال الفيديو! سأراجعه وأرد عليك قريباً 🎥',
                AUDIO: 'شكراً لإرسال الرسالة الصوتية! سأستمع إليها وأرد عليك قريباً 🎤',
                DOCUMENT: 'شكراً لإرسال الملف! سأراجعه وأرد عليك قريباً 📄',
                LOCATION: 'شكراً لمشاركة موقعك! 📍'
            };

            const response = mediaResponses[message.messageType];
            if (response) {
                await WhatsAppMessageHandler.sendText(sessionId, message.remoteJid, response, {
                    isAIResponse: true
                });
            }
        }
    } catch (error) {
        console.error('❌ Error handling media message:', error);
    }
}

/**
 * إرسال رسالة عدم التواجد
 */
async function sendAwayMessage(sessionId, to, awayMessage) {
    try {
        // التحقق من عدم إرسال رسالة عدم التواجد مؤخراً
        const recentAwayMessage = await getSharedPrismaClient().whatsAppMessage.findFirst({
            where: {
                sessionId,
                remoteJid: to,
                fromMe: true,
                content: awayMessage,
                timestamp: {
                    gte: new Date(Date.now() - 60 * 60 * 1000) // آخر ساعة
                }
            }
        });

        if (recentAwayMessage) {
            console.log(`⏰ Away message already sent to ${to} recently`);
            return;
        }

        await WhatsAppMessageHandler.sendText(sessionId, to, awayMessage, {
            isAIResponse: true
        });

        console.log(`⏰ Away message sent to ${to}`);
    } catch (error) {
        console.error('❌ Error sending away message:', error);
    }
}

/**
 * إرسال رسالة ترحيب
 */
async function sendWelcomeMessage(sessionId, to, welcomeMessage) {
    try {
        // التحقق من أن هذه أول رسالة من هذا الرقم
        const existingMessages = await getSharedPrismaClient().whatsAppMessage.count({
            where: {
                sessionId,
                remoteJid: to
            }
        });

        if (existingMessages > 1) {
            return; // ليست أول محادثة
        }

        await WhatsAppMessageHandler.sendText(sessionId, to, welcomeMessage, {
            isAIResponse: true
        });

        console.log(`👋 Welcome message sent to ${to}`);
    } catch (error) {
        console.error('❌ Error sending welcome message:', error);
    }
}

/**
 * إرسال اقتراحات المنتجات
 */
async function sendProductSuggestions(sessionId, to, products) {
    try {
        if (!products || products.length === 0) return;

        // بناء رسالة المنتجات
        let message = '🛍️ *منتجات قد تهمك:*\n\n';

        for (const product of products.slice(0, 3)) {
            message += `📦 *${product.name}*\n`;
            message += `💰 السعر: ${product.price} جنيه\n`;
            if (product.description) {
                message += `📝 ${product.description.substring(0, 100)}...\n`;
            }
            message += '\n';
        }

        await WhatsAppMessageHandler.sendText(sessionId, to, message, {
            isAIResponse: true
        });

    } catch (error) {
        console.error('❌ Error sending product suggestions:', error);
    }
}

/**
 * جلب سياق المحادثة
 */
async function getConversationContext(sessionId, remoteJid, limit = 10) {
    try {
        const messages = await getSharedPrismaClient().whatsAppMessage.findMany({
            where: {
                sessionId,
                remoteJid
            },
            orderBy: { timestamp: 'desc' },
            take: limit
        });

        return messages.reverse().map(msg => ({
            role: msg.fromMe ? 'assistant' : 'user',
            content: msg.content || `[${msg.messageType}]`,
            timestamp: msg.timestamp
        }));
    } catch (error) {
        console.error('❌ Error getting conversation context:', error);
        return [];
    }
}

/**
 * جلب معلومات العميل
 */
async function getCustomerInfo(sessionId, remoteJid, companyId) {
    try {
        // جلب جهة الاتصال
        const contact = await getSharedPrismaClient().whatsAppContact.findUnique({
            where: {
                sessionId_jid: {
                    sessionId,
                    jid: remoteJid
                }
            },
            include: {
                customer: true
            }
        });

        if (contact?.customer) {
            return {
                ...contact,
                name: `${contact.customer.firstName} ${contact.customer.lastName}`.trim(),
                email: contact.customer.email,
                status: contact.customer.status
            };
        }

        return contact;
    } catch (error) {
        console.error('❌ Error getting customer info:', error);
        return null;
    }
}

/**
 * التحقق من ساعات العمل
 */
function checkWorkingHours(workingHoursJson) {
    try {
        if (!workingHoursJson) return true;

        const workingHours = typeof workingHoursJson === 'string'
            ? JSON.parse(workingHoursJson)
            : workingHoursJson;

        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday
        const currentTime = now.getHours() * 60 + now.getMinutes();

        // التحقق من اليوم
        if (workingHours.days && !workingHours.days.includes(currentDay)) {
            return false;
        }

        // التحقق من الوقت
        if (workingHours.start && workingHours.end) {
            const [startHour, startMin] = workingHours.start.split(':').map(Number);
            const [endHour, endMin] = workingHours.end.split(':').map(Number);

            const startTime = startHour * 60 + startMin;
            const endTime = endHour * 60 + endMin;

            if (currentTime < startTime || currentTime > endTime) {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('❌ Error checking working hours:', error);
        return true;
    }
}

/**
 * تحليل مشاعر الرسالة
 */
async function analyzeSentiment(text) {
    try {
        // تحليل بسيط للمشاعر
        const positiveWords = ['شكرا', 'ممتاز', 'رائع', 'جميل', 'حلو', 'تمام', 'أحسنت'];
        const negativeWords = ['سيء', 'مشكلة', 'زعلان', 'غضبان', 'مش كويس', 'وحش'];

        const lowerText = text.toLowerCase();

        let positiveScore = 0;
        let negativeScore = 0;

        for (const word of positiveWords) {
            if (lowerText.includes(word)) positiveScore++;
        }

        for (const word of negativeWords) {
            if (lowerText.includes(word)) negativeScore++;
        }

        if (positiveScore > negativeScore) return 'positive';
        if (negativeScore > positiveScore) return 'negative';
        return 'neutral';
    } catch (error) {
        return 'neutral';
    }
}

/**
 * توليد ملخص للمحادثة
 */
async function generateConversationSummary(sessionId, remoteJid, companyId) {
    try {
        const context = await getConversationContext(sessionId, remoteJid, 50);

        if (context.length === 0) {
            return 'لا توجد رسائل في هذه المحادثة';
        }

        // ملخص بسيط
        const customerMessages = context.filter(m => m.role === 'user').length;
        const agentMessages = context.filter(m => m.role === 'assistant').length;
        const firstMessage = context[0];
        const lastMessage = context[context.length - 1];

        return {
            totalMessages: context.length,
            customerMessages,
            agentMessages,
            startedAt: firstMessage.timestamp,
            lastMessageAt: lastMessage.timestamp,
            topics: extractTopics(context)
        };
    } catch (error) {
        console.error('❌ Error generating summary:', error);
        return null;
    }
}

/**
 * استخراج المواضيع من المحادثة
 */
function extractTopics(messages) {
    const topics = new Set();
    const keywords = {
        'سعر': 'استفسار عن السعر',
        'طلب': 'طلب شراء',
        'شحن': 'استفسار عن الشحن',
        'مشكلة': 'شكوى',
        'استرجاع': 'طلب استرجاع',
        'منتج': 'استفسار عن منتج'
    };

    for (const msg of messages) {
        if (msg.role === 'user' && msg.content) {
            for (const [keyword, topic] of Object.entries(keywords)) {
                if (msg.content.includes(keyword)) {
                    topics.add(topic);
                }
            }
        }
    }

    return Array.from(topics);
}

module.exports = {
    processMessage,
    generateAIResponse,
    sendAIResponse,
    sendSuggestion,
    generateSuggestion,
    handleMediaMessage,
    sendAwayMessage,
    sendWelcomeMessage,
    sendProductSuggestions,
    getConversationContext,
    getCustomerInfo,
    checkWorkingHours,
    analyzeSentiment,
    generateConversationSummary
};

