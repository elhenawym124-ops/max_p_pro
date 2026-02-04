-- 🛒 WooCommerce Settings Table
CREATE TABLE IF NOT EXISTS `woocommerce_settings` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  
  -- Connection Settings
  `storeUrl` VARCHAR(191) NOT NULL,
  `consumerKey` TEXT NOT NULL,
  `consumerSecret` TEXT NOT NULL,
  
  -- Sync Settings
  `syncEnabled` BOOLEAN NOT NULL DEFAULT false,
  `syncDirection` VARCHAR(191) NOT NULL DEFAULT 'both',
  `syncInterval` INTEGER NOT NULL DEFAULT 15,
  
  -- Webhook Settings
  `webhookSecret` TEXT NULL,
  `webhookEnabled` BOOLEAN NOT NULL DEFAULT false,
  `webhookOrderCreated` VARCHAR(191) NULL,
  `webhookOrderUpdated` VARCHAR(191) NULL,
  
  -- Status Mapping
  `statusMapping` TEXT NULL,
  
  -- Last Sync Info
  `lastSyncAt` DATETIME(3) NULL,
  `lastSyncStatus` VARCHAR(191) NULL DEFAULT 'never',
  `lastSyncMessage` TEXT NULL,
  
  -- Metadata
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `woocommerce_settings_companyId_key`(`companyId`),
  CONSTRAINT `woocommerce_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 📋 WooCommerce Sync Log Table
CREATE TABLE IF NOT EXISTS `woocommerce_sync_logs` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  
  -- Sync Details
  `syncType` VARCHAR(191) NOT NULL,
  `syncDirection` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  
  -- Results
  `totalItems` INTEGER NOT NULL DEFAULT 0,
  `successCount` INTEGER NOT NULL DEFAULT 0,
  `failedCount` INTEGER NOT NULL DEFAULT 0,
  `skippedCount` INTEGER NOT NULL DEFAULT 0,
  
  -- Error Details
  `errorMessage` TEXT NULL,
  `errorDetails` TEXT NULL,
  
  -- Timing
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `duration` INTEGER NULL,
  
  -- Metadata
  `triggeredBy` VARCHAR(191) NULL,
  `metadata` TEXT NULL,
  
  PRIMARY KEY (`id`),
  INDEX `woocommerce_sync_logs_companyId_idx`(`companyId`),
  INDEX `woocommerce_sync_logs_syncType_idx`(`syncType`),
  INDEX `woocommerce_sync_logs_status_idx`(`status`),
  INDEX `woocommerce_sync_logs_startedAt_idx`(`startedAt`),
  CONSTRAINT `woocommerce_sync_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 🛒 Add WooCommerce fields to orders table
ALTER TABLE `orders` 
  ADD COLUMN IF NOT EXISTS `wooCommerceId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `wooCommerceOrderKey` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `wooCommerceStatus` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `wooCommerceDateCreated` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `wooCommerceUrl` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `syncedFromWoo` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `syncedToWoo` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `lastSyncAt` DATETIME(3) NULL;

-- Add index for WooCommerce ID lookup
CREATE INDEX IF NOT EXISTS `orders_wooCommerceId_idx` ON `orders`(`wooCommerceId`);

-- 📦 Add WooCommerce fields to products table
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `wooCommerceId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `syncedFromWoo` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `syncedToWoo` BOOLEAN NOT NULL DEFAULT false;

-- Add index for WooCommerce product ID lookup
CREATE INDEX IF NOT EXISTS `products_wooCommerceId_idx` ON `products`(`wooCommerceId`);
