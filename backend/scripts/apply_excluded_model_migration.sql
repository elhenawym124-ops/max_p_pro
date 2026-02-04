-- Migration script to add ExcludedModel table
-- Run this script directly on your MySQL database if Prisma migrate doesn't work

CREATE TABLE IF NOT EXISTS `excluded_models` (
    `id` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `keyId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `excludedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `retryAt` DATETIME(3) NOT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `lastRetryAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (`id`),
    INDEX `idx_model_key`(`modelName`, `keyId`),
    INDEX `idx_retry_at`(`retryAt`),
    INDEX `idx_company_id`(`companyId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

