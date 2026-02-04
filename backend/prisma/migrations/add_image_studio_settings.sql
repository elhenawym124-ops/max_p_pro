-- Migration: Add Image Studio Settings
-- Description: إضافة جدول إعدادات استديو توليد الصور (Nano Banana)

-- جدول إعدادات الاستديو (يديره السوبر أدمن فقط)
CREATE TABLE `image_studio_settings` (
  `id` VARCHAR(191) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `basicModelName` VARCHAR(191) NOT NULL DEFAULT 'gemini-2.5-flash-image',
  `proModelName` VARCHAR(191) NOT NULL DEFAULT 'gemini-3-pro-image-preview',
  `defaultModel` VARCHAR(191) NOT NULL DEFAULT 'basic',
  `maxImagesPerRequest` INT NOT NULL DEFAULT 1,
  `maxRequestsPerDay` INT NOT NULL DEFAULT 50,
  `allowedCompanies` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- جدول استخدام الاستديو لكل شركة
CREATE TABLE `image_studio_usage` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `basicImagesCount` INT NOT NULL DEFAULT 0,
  `proImagesCount` INT NOT NULL DEFAULT 0,
  `totalImagesCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `image_studio_usage_companyId_idx`(`companyId`),
  INDEX `image_studio_usage_date_idx`(`date`),
  UNIQUE INDEX `image_studio_usage_companyId_date_key`(`companyId`, `date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- جدول سجل توليد الصور
CREATE TABLE `image_studio_history` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `prompt` TEXT NOT NULL,
  `modelType` VARCHAR(191) NOT NULL,
  `modelName` VARCHAR(191) NOT NULL,
  `imageUrl` VARCHAR(500) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `errorMessage` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `image_studio_history_companyId_idx`(`companyId`),
  INDEX `image_studio_history_userId_idx`(`userId`),
  INDEX `image_studio_history_status_idx`(`status`),
  INDEX `image_studio_history_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys
ALTER TABLE `image_studio_usage` ADD CONSTRAINT `image_studio_usage_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `image_studio_history` ADD CONSTRAINT `image_studio_history_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `image_studio_history` ADD CONSTRAINT `image_studio_history_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default settings
INSERT INTO `image_studio_settings` (`id`, `enabled`, `basicModelName`, `proModelName`, `defaultModel`, `maxImagesPerRequest`, `maxRequestsPerDay`)
VALUES ('default_studio_settings', true, 'gemini-2.5-flash-image', 'gemini-3-pro-image-preview', 'basic', 1, 50);
