-- ✨ إضافة الحقول المتقدمة لجدول ai_settings
-- Advanced AI Settings Migration
-- التاريخ: 27 أكتوبر 2025

-- إعدادات AI المتقدمة الجديدة
ALTER TABLE `ai_settings` ADD COLUMN `aiTemperature` DOUBLE NULL DEFAULT 0.7;
ALTER TABLE `ai_settings` ADD COLUMN `aiTopP` DOUBLE NULL DEFAULT 0.9;
ALTER TABLE `ai_settings` ADD COLUMN `aiTopK` INT NULL DEFAULT 40;
ALTER TABLE `ai_settings` ADD COLUMN `aiMaxTokens` INT NULL DEFAULT 1024;
ALTER TABLE `ai_settings` ADD COLUMN `aiResponseStyle` VARCHAR(191) NULL DEFAULT 'balanced';

-- إعدادات السلوك الذكي
ALTER TABLE `ai_settings` ADD COLUMN `enableDiversityCheck` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `ai_settings` ADD COLUMN `enableToneAdaptation` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `ai_settings` ADD COLUMN `enableEmotionalResponse` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `ai_settings` ADD COLUMN `enableSmartSuggestions` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ai_settings` ADD COLUMN `enableLongTermMemory` BOOLEAN NOT NULL DEFAULT false;

-- إعدادات متقدمة
ALTER TABLE `ai_settings` ADD COLUMN `maxMessagesPerConversation` INT NULL DEFAULT 50;
ALTER TABLE `ai_settings` ADD COLUMN `memoryRetentionDays` INT NULL DEFAULT 30;
ALTER TABLE `ai_settings` ADD COLUMN `enablePatternApplication` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `ai_settings` ADD COLUMN `patternPriority` VARCHAR(191) NULL DEFAULT 'balanced';

-- إعدادات الجودة
ALTER TABLE `ai_settings` ADD COLUMN `minQualityScore` DOUBLE NULL DEFAULT 70;
ALTER TABLE `ai_settings` ADD COLUMN `enableLowQualityAlerts` BOOLEAN NOT NULL DEFAULT true;
