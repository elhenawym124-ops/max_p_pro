-- Migration: Add Telegram Userbot Fields
-- Date: 2025-01-26
-- Description: Add telegram_configs table with support for both BOT and USERBOT types

-- Create telegram_configs table
CREATE TABLE IF NOT EXISTS `telegram_configs` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'BOT' COMMENT 'BOT or USERBOT',
  `label` VARCHAR(191) NOT NULL DEFAULT 'Official Bot' COMMENT 'Friendly Name',
  `botToken` TEXT NULL COMMENT 'Encrypted Token (for BOT type)',
  `botName` VARCHAR(191) NULL,
  `botUsername` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT false,
  `sessionString` TEXT NULL COMMENT 'Telegram session string (for USERBOT)',
  `clientSession` TEXT NULL COMMENT 'Deprecated - use sessionString instead',
  `clientPhone` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `telegram_configs_companyId_type_key` (`companyId`, `type`),
  INDEX `telegram_configs_companyId_idx` (`companyId`),
  INDEX `telegram_configs_type_idx` (`type`),
  CONSTRAINT `telegram_configs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add telegramId to customers table if not exists
ALTER TABLE `customers` 
ADD COLUMN IF NOT EXISTS `telegramId` VARCHAR(191) NULL AFTER `whatsappId`;

-- Add unique constraint for telegramId + companyId if not exists
CREATE UNIQUE INDEX IF NOT EXISTS `customer_telegram_company` ON `customers` (`telegramId`, `companyId`);
