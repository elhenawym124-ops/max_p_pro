-- Migration: Add Userbot API Credentials
-- Date: 2025-01-26
-- Description: Add apiId and apiHash fields to telegram_configs table for USERBOT authentication

-- Add apiId column for Telegram API ID
ALTER TABLE `telegram_configs` 
ADD COLUMN `apiId` TEXT NULL COMMENT 'Telegram API ID (for USERBOT type)' AFTER `botUsername`;

-- Add apiHash column for Telegram API Hash
ALTER TABLE `telegram_configs` 
ADD COLUMN `apiHash` TEXT NULL COMMENT 'Telegram API Hash (for USERBOT type)' AFTER `apiId`;
