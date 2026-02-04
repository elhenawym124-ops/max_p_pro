-- CreateEnum: WhatsAppSessionStatus
-- Note: MySQL doesn't support CREATE TYPE, enums are defined inline in column definitions

-- CreateTable: whatsapp_sessions
CREATE TABLE `whatsapp_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `status` ENUM('CONNECTED', 'DISCONNECTED', 'QR_PENDING', 'CONNECTING', 'LOGGED_OUT') NOT NULL DEFAULT 'DISCONNECTED',
    `lastConnectedAt` DATETIME(3) NULL,
    `lastDisconnectedAt` DATETIME(3) NULL,
    `authState` LONGTEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `aiEnabled` BOOLEAN NOT NULL DEFAULT true,
    `autoReply` BOOLEAN NOT NULL DEFAULT false,
    `aiMode` VARCHAR(191) NOT NULL DEFAULT 'suggest',
    `welcomeMessage` TEXT NULL,
    `awayMessage` TEXT NULL,
    `workingHoursEnabled` BOOLEAN NOT NULL DEFAULT false,
    `workingHours` TEXT NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `whatsapp_sessions_companyId_idx`(`companyId`),
    INDEX `whatsapp_sessions_status_idx`(`status`),
    INDEX `whatsapp_sessions_phoneNumber_idx`(`phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: whatsapp_messages
CREATE TABLE `whatsapp_messages` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `remoteJid` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `fromMe` BOOLEAN NOT NULL,
    `messageType` ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'REACTION', 'POLL', 'TEMPLATE', 'BUTTONS', 'LIST', 'PRODUCT', 'INTERACTIVE') NOT NULL DEFAULT 'TEXT',
    `content` TEXT NULL,
    `mediaUrl` TEXT NULL,
    `mediaType` VARCHAR(191) NULL,
    `mediaMimeType` VARCHAR(191) NULL,
    `mediaSize` INTEGER NULL,
    `mediaFileName` VARCHAR(191) NULL,
    `quotedMessageId` VARCHAR(191) NULL,
    `quotedContent` TEXT NULL,
    `status` ENUM('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'SENT',
    `timestamp` DATETIME(3) NOT NULL,
    `isAIResponse` BOOLEAN NOT NULL DEFAULT false,
    `aiConfidence` DOUBLE NULL,
    `interactiveData` TEXT NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `whatsapp_messages_messageId_key`(`messageId`),
    INDEX `whatsapp_messages_sessionId_idx`(`sessionId`),
    INDEX `whatsapp_messages_remoteJid_idx`(`remoteJid`),
    INDEX `whatsapp_messages_timestamp_idx`(`timestamp`),
    INDEX `whatsapp_messages_sessionId_remoteJid_idx`(`sessionId`, `remoteJid`),
    INDEX `whatsapp_messages_sessionId_timestamp_idx`(`sessionId`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: whatsapp_contacts
CREATE TABLE `whatsapp_contacts` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `jid` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `pushName` VARCHAR(191) NULL,
    `profilePicUrl` TEXT NULL,
    `isGroup` BOOLEAN NOT NULL DEFAULT false,
    `isBlocked` BOOLEAN NOT NULL DEFAULT false,
    `customerId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL DEFAULT 'LEAD',
    `tags` TEXT NULL,
    `notes` TEXT NULL,
    `lastMessageAt` DATETIME(3) NULL,
    `unreadCount` INTEGER NOT NULL DEFAULT 0,
    `totalMessages` INTEGER NOT NULL DEFAULT 0,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `isMuted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `whatsapp_contacts_sessionId_jid_key`(`sessionId`, `jid`),
    INDEX `whatsapp_contacts_sessionId_idx`(`sessionId`),
    INDEX `whatsapp_contacts_phoneNumber_idx`(`phoneNumber`),
    INDEX `whatsapp_contacts_customerId_idx`(`customerId`),
    INDEX `whatsapp_contacts_lastMessageAt_idx`(`lastMessageAt`),
    INDEX `whatsapp_contacts_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: whatsapp_quick_replies
CREATE TABLE `whatsapp_quick_replies` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `shortcut` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'general',
    `variables` TEXT NULL,
    `mediaUrl` TEXT NULL,
    `mediaType` VARCHAR(191) NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `lastUsedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `whatsapp_quick_replies_companyId_shortcut_key`(`companyId`, `shortcut`),
    INDEX `whatsapp_quick_replies_companyId_idx`(`companyId`),
    INDEX `whatsapp_quick_replies_category_idx`(`category`),
    INDEX `whatsapp_quick_replies_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: whatsapp_settings
CREATE TABLE `whatsapp_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `maxSessions` INTEGER NOT NULL DEFAULT 3,
    `notificationSound` BOOLEAN NOT NULL DEFAULT true,
    `browserNotifications` BOOLEAN NOT NULL DEFAULT true,
    `defaultAIMode` VARCHAR(191) NOT NULL DEFAULT 'suggest',
    `aiWelcomeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `aiAwayEnabled` BOOLEAN NOT NULL DEFAULT false,
    `maxImageSize` INTEGER NOT NULL DEFAULT 16,
    `maxVideoSize` INTEGER NOT NULL DEFAULT 64,
    `maxDocumentSize` INTEGER NOT NULL DEFAULT 100,
    `autoCompressImages` BOOLEAN NOT NULL DEFAULT true,
    `autoArchiveDays` INTEGER NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `whatsapp_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: whatsapp_event_logs
CREATE TABLE `whatsapp_event_logs` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `eventData` TEXT NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT 'info',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `whatsapp_event_logs_sessionId_idx`(`sessionId`),
    INDEX `whatsapp_event_logs_companyId_idx`(`companyId`),
    INDEX `whatsapp_event_logs_eventType_idx`(`eventType`),
    INDEX `whatsapp_event_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: whatsapp_sessions -> companies
ALTER TABLE `whatsapp_sessions` ADD CONSTRAINT `whatsapp_sessions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: whatsapp_messages -> whatsapp_sessions
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `whatsapp_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: whatsapp_contacts -> whatsapp_sessions
ALTER TABLE `whatsapp_contacts` ADD CONSTRAINT `whatsapp_contacts_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `whatsapp_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: whatsapp_contacts -> customers
ALTER TABLE `whatsapp_contacts` ADD CONSTRAINT `whatsapp_contacts_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: whatsapp_quick_replies -> companies
ALTER TABLE `whatsapp_quick_replies` ADD CONSTRAINT `whatsapp_quick_replies_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: whatsapp_settings -> companies
ALTER TABLE `whatsapp_settings` ADD CONSTRAINT `whatsapp_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
