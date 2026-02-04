-- CreateTable
CREATE TABLE IF NOT EXISTS `whatsapp_statuses` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `remoteJid` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'POLL', 'PRODUCT', 'ORDER', 'CATALOG', 'INTERACTIVE', 'BUTTON_REPLY', 'LIST_REPLY', 'TEMPLATE') NOT NULL DEFAULT 'TEXT',
    `content` TEXT NULL,
    `mediaUrl` TEXT NULL,
    `mediaType` VARCHAR(191) NULL,
    `mediaMimeType` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `isViewed` BOOLEAN NOT NULL DEFAULT false,
    `viewedAt` DATETIME(3) NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `whatsapp_statuses_messageId_key`(`messageId`),
    INDEX `whatsapp_statuses_sessionId_idx`(`sessionId`),
    INDEX `whatsapp_statuses_remoteJid_idx`(`remoteJid`),
    INDEX `whatsapp_statuses_timestamp_idx`(`timestamp`),
    INDEX `whatsapp_statuses_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `whatsapp_statuses` ADD CONSTRAINT `whatsapp_statuses_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `whatsapp_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
