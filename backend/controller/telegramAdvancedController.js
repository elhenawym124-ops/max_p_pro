const telegramUserbotService = require('../services/TelegramUserbotService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 Telegram Advanced Features Controller
// ═══════════════════════════════════════════════════════════════════════════════

// --- 1️⃣ Auto-Reply Rules ---

exports.getAutoReplyRules = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId } = req.params;

        const rules = await getSharedPrismaClient().telegramAutoReplyRule.findMany({
            where: { companyId, userbotConfigId },
            orderBy: { priority: 'desc' }
        });

        res.json({ success: true, data: rules });
    } catch (error) {
        console.error('Error getting auto-reply rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createAutoReplyRule = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId } = req.params;
        const { name, triggerType, triggerValue, response, workingHoursOnly, startTime, endTime, daysOfWeek, priority } = req.body;

        const rule = await getSharedPrismaClient().telegramAutoReplyRule.create({
            data: {
                id: crypto.randomUUID(),
                userbotConfigId,
                companyId,
                name,
                triggerType,
                triggerValue,
                response,
                workingHoursOnly: workingHoursOnly || false,
                startTime,
                endTime,
                daysOfWeek: daysOfWeek || [],
                priority: priority || 0,
                isActive: true
            }
        });

        await telegramUserbotService.setupAutoReply(userbotConfigId, companyId);

        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('Error creating auto-reply rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateAutoReplyRule = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { ruleId } = req.params;
        const updates = req.body;

        const rule = await getSharedPrismaClient().telegramAutoReplyRule.update({
            where: { id: ruleId },
            data: updates
        });

        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('Error updating auto-reply rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteAutoReplyRule = async (req, res) => {
    try {
        const { ruleId } = req.params;

        await getSharedPrismaClient().telegramAutoReplyRule.delete({
            where: { id: ruleId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting auto-reply rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 2️⃣ Bulk Messaging ---

exports.getBulkMessages = async (req, res) => {
    try {
        const { companyId } = req.user;

        const bulkMessages = await getSharedPrismaClient().telegramBulkMessage.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json({ success: true, data: bulkMessages });
    } catch (error) {
        console.error('Error getting bulk messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createBulkMessage = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { userbotConfigId, name, message, recipients, delayBetweenMessages } = req.body;

        const bulkMessage = await getSharedPrismaClient().telegramBulkMessage.create({
            data: {
                id: crypto.randomUUID(),
                userbotConfigId,
                companyId,
                name,
                message,
                recipients,
                totalRecipients: recipients.length,
                delayBetweenMessages: delayBetweenMessages || 2000,
                createdBy: userId,
                status: 'PENDING'
            }
        });

        telegramUserbotService.sendBulkMessages(userbotConfigId, companyId, bulkMessage.id)
            .catch(err => console.error('Bulk message error:', err));

        res.json({ success: true, data: bulkMessage });
    } catch (error) {
        console.error('Error creating bulk message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getBulkMessageStatus = async (req, res) => {
    try {
        const { bulkMessageId } = req.params;

        const bulkMessage = await getSharedPrismaClient().telegramBulkMessage.findUnique({
            where: { id: bulkMessageId }
        });

        const logs = await getSharedPrismaClient().telegramBulkMessageLog.findMany({
            where: { bulkMessageId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: { bulkMessage, logs } });
    } catch (error) {
        console.error('Error getting bulk message status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancelBulkMessage = async (req, res) => {
    try {
        const { bulkMessageId } = req.params;

        await getSharedPrismaClient().telegramBulkMessage.update({
            where: { id: bulkMessageId },
            data: { status: 'CANCELLED' }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error cancelling bulk message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 3️⃣ Scheduled Messages ---

exports.getScheduledMessages = async (req, res) => {
    try {
        const { companyId } = req.user;

        const messages = await getSharedPrismaClient().telegramScheduledMessage.findMany({
            where: { companyId },
            orderBy: { scheduledTime: 'asc' }
        });

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error getting scheduled messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createScheduledMessage = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { userbotConfigId, chatId, message, scheduledTime, recurring, recurringPattern } = req.body;

        const scheduled = await getSharedPrismaClient().telegramScheduledMessage.create({
            data: {
                id: crypto.randomUUID(),
                userbotConfigId,
                companyId,
                chatId,
                message,
                scheduledTime: new Date(scheduledTime),
                recurring: recurring || false,
                recurringPattern,
                createdBy: userId,
                status: 'PENDING'
            }
        });

        res.json({ success: true, data: scheduled });
    } catch (error) {
        console.error('Error creating scheduled message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancelScheduledMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        await getSharedPrismaClient().telegramScheduledMessage.update({
            where: { id: messageId },
            data: { status: 'CANCELLED' }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error cancelling scheduled message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 4️⃣ Group Management ---

exports.getGroups = async (req, res) => {
    try {
        const { companyId } = req.user;

        const groups = await getSharedPrismaClient().telegramGroup.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: groups });
    } catch (error) {
        console.error('Error getting groups:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createChannel = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, title, about, isPublic } = req.body;

        const result = await telegramUserbotService.createChannel(
            userbotConfigId,
            companyId,
            title,
            about,
            isPublic
        );

        res.json(result);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, title, users } = req.body;

        const result = await telegramUserbotService.createGroup(
            userbotConfigId,
            companyId,
            title,
            users
        );

        res.json(result);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addMembersToGroup = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, groupId, userIds } = req.body;

        const result = await telegramUserbotService.addMembersToGroup(
            userbotConfigId,
            companyId,
            groupId,
            userIds
        );

        res.json(result);
    } catch (error) {
        console.error('Error adding members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getGroupMembers = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, groupId } = req.params;
        const { saveToDb } = req.query;

        const result = await telegramUserbotService.getGroupMembers(
            userbotConfigId,
            companyId,
            groupId,
            saveToDb === 'true'
        );

        res.json(result);
    } catch (error) {
        console.error('Error getting group members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 5️⃣ Contacts ---

exports.getContacts = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { search, source } = req.query;

        const where = { companyId };
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { username: { contains: search } }
            ];
        }
        if (source) {
            where.source = source;
        }

        const contacts = await getSharedPrismaClient().telegramContact.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json({ success: true, data: contacts });
    } catch (error) {
        console.error('Error getting contacts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateContact = async (req, res) => {
    try {
        const { contactId } = req.params;
        const { tags, notes } = req.body;

        const contact = await getSharedPrismaClient().telegramContact.update({
            where: { id: contactId },
            data: { tags, notes }
        });

        res.json({ success: true, data: contact });
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 6️⃣ Forward Rules ---

exports.getForwardRules = async (req, res) => {
    try {
        const { companyId } = req.user;

        const rules = await getSharedPrismaClient().telegramForwardRule.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: rules });
    } catch (error) {
        console.error('Error getting forward rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createForwardRule = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, name, sourceChats, targetChat, filterKeywords, filterMediaTypes } = req.body;

        const rule = await getSharedPrismaClient().telegramForwardRule.create({
            data: {
                id: crypto.randomUUID(),
                userbotConfigId,
                companyId,
                name,
                sourceChats,
                targetChat,
                filterKeywords,
                filterMediaTypes,
                isActive: true
            }
        });

        await telegramUserbotService.setupAutoForward(userbotConfigId, companyId, rule.id);

        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('Error creating forward rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.toggleForwardRule = async (req, res) => {
    try {
        const { ruleId } = req.params;
        const { isActive } = req.body;

        const rule = await getSharedPrismaClient().telegramForwardRule.update({
            where: { id: ruleId },
            data: { isActive }
        });

        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('Error toggling forward rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- 7️⃣ Search ---

exports.searchMessages = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { userbotConfigId, chatId, query, limit } = req.query;

        const result = await telegramUserbotService.searchMessages(
            userbotConfigId,
            companyId,
            chatId,
            query,
            parseInt(limit) || 100
        );

        res.json(result);
    } catch (error) {
        console.error('Error searching messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
