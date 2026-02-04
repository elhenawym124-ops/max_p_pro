-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚀 Telegram Advanced Features Migration
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1️⃣ Auto-Reply Rules
CREATE TABLE IF NOT EXISTS `telegram_auto_reply_rules` (
  `id` VARCHAR(191) NOT NULL,
  `userbotConfigId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `triggerType` ENUM('KEYWORD', 'REGEX', 'ALL', 'TIME_BASED') DEFAULT 'KEYWORD',
  `triggerValue` TEXT,
  `response` TEXT NOT NULL,
  `isActive` BOOLEAN DEFAULT true,
  `priority` INT DEFAULT 0,
  `workingHoursOnly` BOOLEAN DEFAULT false,
  `startTime` TIME NULL,
  `endTime` TIME NULL,
  `daysOfWeek` JSON NULL,
  `maxUsesPerUser` INT NULL,
  `cooldownMinutes` INT DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_userbot_config` (`userbotConfigId`),
  INDEX `idx_company` (`companyId`),
  INDEX `idx_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2️⃣ Bulk Messages
CREATE TABLE IF NOT EXISTS `telegram_bulk_messages` (
  `id` VARCHAR(191) NOT NULL,
  `userbotConfigId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `recipients` JSON NOT NULL,
  `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
  `totalRecipients` INT DEFAULT 0,
  `sentCount` INT DEFAULT 0,
  `failedCount` INT DEFAULT 0,
  `delayBetweenMessages` INT DEFAULT 2000,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_userbot_config` (`userbotConfigId`),
  INDEX `idx_company` (`companyId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by` (`createdBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3️⃣ Bulk Message Logs
CREATE TABLE IF NOT EXISTS `telegram_bulk_message_logs` (
  `id` VARCHAR(191) NOT NULL,
  `bulkMessageId` VARCHAR(191) NOT NULL,
  `recipient` VARCHAR(255) NOT NULL,
  `status` ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
  `error` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_bulk_message` (`bulkMessageId`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4️⃣ Scheduled Messages
CREATE TABLE IF NOT EXISTS `telegram_scheduled_messages` (
  `id` VARCHAR(191) NOT NULL,
  `userbotConfigId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `chatId` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `mediaUrl` TEXT NULL,
  `mediaType` ENUM('PHOTO', 'VIDEO', 'DOCUMENT', 'AUDIO') NULL,
  `scheduledTime` DATETIME(3) NOT NULL,
  `status` ENUM('PENDING', 'SENT', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
  `sentAt` DATETIME(3) NULL,
  `error` TEXT NULL,
  `recurring` BOOLEAN DEFAULT false,
  `recurringPattern` VARCHAR(50) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_userbot_config` (`userbotConfigId`),
  INDEX `idx_company` (`companyId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_scheduled_time` (`scheduledTime`),
  INDEX `idx_created_by` (`createdBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5️⃣ Telegram Contacts (Scraped)
CREATE TABLE IF NOT EXISTS `telegram_contacts` (
  `id` VARCHAR(191) NOT NULL,
  `userbotConfigId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `telegramId` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(255) NULL,
  `lastName` VARCHAR(255) NULL,
  `username` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `isBot` BOOLEAN DEFAULT false,
  `isPremium` BOOLEAN DEFAULT false,
  `source` VARCHAR(255) NULL,
  `sourceGroupId` VARCHAR(255) NULL,
  `tags` JSON NULL,
  `notes` TEXT NULL,
  `lastSeen` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_telegram_contact` (`telegramId`, `companyId`),
  INDEX `idx_userbot_config` (`userbotConfigId`),
  INDEX `idx_company` (`companyId`),
  INDEX `idx_username` (`username`),
  INDEX `idx_source_group` (`sourceGroupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6️⃣ Telegram Groups/Channels
CREATE TABLE IF NOT EXISTS `telegram_groups` (
  `id` VARCHAR(191) NOT NULL,
  `userbotConfigId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `telegramId` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NULL,
  `type` ENUM('GROUP', 'SUPERGROUP', 'CHANNEL') NOT NULL,
  `memberCount` INT DEFAULT 0,
  `description` TEXT NULL,
  `isPublic` BOOLEAN DEFAULT false,
  `inviteLink` TEXT NULL,
  `createdBy` VARCHAR(191) NULL,
  `managedByUs` BOOLEAN DEFAULT false,
  `autoModeration` BOOLEAN DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_telegram_group` (`telegramId`, `companyId`),
  INDEX `idx_userbot_config` (`userbotConfigId`),
  INDEX `idx_company` (`companyId`),
  INDEX `idx_type` (`type`),
  INDEX `idx_managed` (`managedByUs`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7️⃣ Auto-Forward Rules
CREATE TABLE IF NOT EXISTS `telegram_forward_rules` (
  `id` VARCHAR(191) NOT NULL,
  `userbotConfigId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sourceChats` JSON NOT NULL,
  `targetChat` VARCHAR(255) NOT NULL,
  `filterKeywords` JSON NULL,
  `filterMediaTypes` JSON NULL,
  `isActive` BOOLEAN DEFAULT true,
  `forwardCount` INT DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_userbot_config` (`userbotConfigId`),
  INDEX `idx_company` (`companyId`),
  INDEX `idx_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8️⃣ User Activity Logs
CREATE TABLE IF NOT EXISTS `telegram_user_activity` (
  `id` VARCHAR(191) NOT NULL,
  `userbotConfigId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_userbot_config` (`userbotConfigId`),
  INDEX `idx_company` (`companyId`),
  INDEX `idx_user` (`userId`),
  INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9️⃣ Auto-Reply Usage Tracking
CREATE TABLE IF NOT EXISTS `telegram_auto_reply_usage` (
  `id` VARCHAR(191) NOT NULL,
  `ruleId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_rule` (`ruleId`),
  INDEX `idx_user` (`userId`),
  INDEX `idx_used_at` (`usedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 🔟 Bot Metrics
CREATE TABLE IF NOT EXISTS `telegram_bot_metrics` (
  `id` VARCHAR(191) NOT NULL,
  `configId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `event` VARCHAR(100) NOT NULL,
  `metadata` JSON NULL,
  `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_config` (`configId`),
  INDEX `idx_company` (`companyId`),
  INDEX `idx_event` (`event`),
  INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
