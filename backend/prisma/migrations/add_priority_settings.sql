-- إضافة جدول إعدادات الأولوية
-- Add Priority Settings Table

-- إضافة أعمدة جديدة لجدول aiSettings
ALTER TABLE `aiSettings` ADD COLUMN `promptPriority` ENUM('high', 'medium', 'low') DEFAULT 'high';
ALTER TABLE `aiSettings` ADD COLUMN `patternsPriority` ENUM('high', 'medium', 'low') DEFAULT 'medium';
ALTER TABLE `aiSettings` ADD COLUMN `conflictResolution` ENUM('prompt_wins', 'patterns_win', 'merge_smart') DEFAULT 'merge_smart';
ALTER TABLE `aiSettings` ADD COLUMN `enforcePersonality` BOOLEAN DEFAULT true;
ALTER TABLE `aiSettings` ADD COLUMN `enforceLanguageStyle` BOOLEAN DEFAULT true;
ALTER TABLE `aiSettings` ADD COLUMN `autoDetectConflicts` BOOLEAN DEFAULT true;
ALTER TABLE `aiSettings` ADD COLUMN `conflictReports` BOOLEAN DEFAULT true;

-- إنشاء جدول تقارير التعارض
CREATE TABLE IF NOT EXISTS `conflictReports` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NULL,
  `conflictType` ENUM('language_style', 'personality', 'word_choice', 'response_style') NOT NULL,
  `promptContent` TEXT NOT NULL,
  `patternsInvolved` JSON NOT NULL,
  `conflictDetails` JSON NOT NULL,
  `resolutionApplied` ENUM('prompt_wins', 'patterns_win', 'merge_smart') NOT NULL,
  `resolutionResult` TEXT NULL,
  `severity` ENUM('low', 'medium', 'high') DEFAULT 'medium',
  `resolved` BOOLEAN DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  INDEX `conflictReports_companyId_idx` (`companyId`),
  INDEX `conflictReports_conversationId_idx` (`conversationId`),
  INDEX `conflictReports_conflictType_idx` (`conflictType`),
  INDEX `conflictReports_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- إنشاء جدول إحصائيات الأولوية
CREATE TABLE IF NOT EXISTS `priorityStats` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `promptWins` INT DEFAULT 0,
  `patternsWins` INT DEFAULT 0,
  `smartMerges` INT DEFAULT 0,
  `totalConflicts` INT DEFAULT 0,
  `conflictsByType` JSON NULL,
  `averageResolutionTime` FLOAT NULL,
  `successRate` FLOAT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `priorityStats_companyId_date_key` (`companyId`, `date`),
  INDEX `priorityStats_companyId_idx` (`companyId`),
  INDEX `priorityStats_date_idx` (`date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- تحديث الشركات الموجودة بالإعدادات الافتراضية
UPDATE `aiSettings` 
SET 
  `promptPriority` = 'high',
  `patternsPriority` = 'medium',
  `conflictResolution` = 'merge_smart',
  `enforcePersonality` = true,
  `enforceLanguageStyle` = true,
  `autoDetectConflicts` = true,
  `conflictReports` = true
WHERE `promptPriority` IS NULL;
