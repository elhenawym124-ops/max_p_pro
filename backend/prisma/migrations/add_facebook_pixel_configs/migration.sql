-- CreateTable
CREATE TABLE `facebook_pixel_configs` (
    `id` VARCHAR(191) NOT NULL,
    `storefrontSettingsId` VARCHAR(191) NOT NULL,
    `pixelId` VARCHAR(191) NOT NULL,
    `pixelName` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `trackPageView` BOOLEAN NOT NULL DEFAULT true,
    `trackViewContent` BOOLEAN NOT NULL DEFAULT true,
    `trackAddToCart` BOOLEAN NOT NULL DEFAULT true,
    `trackInitiateCheckout` BOOLEAN NOT NULL DEFAULT true,
    `trackPurchase` BOOLEAN NOT NULL DEFAULT true,
    `trackSearch` BOOLEAN NOT NULL DEFAULT true,
    `trackAddToWishlist` BOOLEAN NOT NULL DEFAULT false,
    `trackLead` BOOLEAN NOT NULL DEFAULT false,
    `trackCompleteRegistration` BOOLEAN NOT NULL DEFAULT false,
    `lastTestAt` DATETIME(3) NULL,
    `lastTestResult` VARCHAR(191) NULL DEFAULT 'not_tested',
    `lastEventSentAt` DATETIME(3) NULL,
    `totalEventsSent` INTEGER NOT NULL DEFAULT 0,
    `errorCount` INTEGER NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `tokenStatus` VARCHAR(191) NULL DEFAULT 'unknown',
    `tokenExpiresAt` DATETIME(3) NULL,
    `eventMatchQuality` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `facebook_pixel_configs_storefrontSettingsId_pixelId_key`(`storefrontSettingsId`, `pixelId`),
    INDEX `facebook_pixel_configs_storefrontSettingsId_idx`(`storefrontSettingsId`),
    INDEX `facebook_pixel_configs_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `facebook_pixel_configs` ADD CONSTRAINT `facebook_pixel_configs_storefrontSettingsId_fkey` FOREIGN KEY (`storefrontSettingsId`) REFERENCES `storefront_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
