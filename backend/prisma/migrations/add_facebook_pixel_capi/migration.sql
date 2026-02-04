-- Migration: Add Facebook Pixel & Conversions API fields to StorefrontSettings
-- Created: 2025-11-21

-- ==========================================
-- 📊 Facebook Pixel Settings (Browser-side)
-- ==========================================
ALTER TABLE `storefront_settings` 
ADD COLUMN `facebookPixelEnabled` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `facebookPixelId` VARCHAR(20) NULL,
ADD COLUMN `pixelTrackPageView` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `pixelTrackViewContent` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `pixelTrackAddToCart` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `pixelTrackInitiateCheckout` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `pixelTrackPurchase` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `pixelTrackSearch` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `pixelTrackAddToWishlist` BOOLEAN NOT NULL DEFAULT false;

-- ==========================================
-- 🚀 Facebook Conversions API (Server-side)
-- ==========================================
ALTER TABLE `storefront_settings` 
ADD COLUMN `facebookConvApiEnabled` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `facebookConvApiToken` TEXT NULL,
ADD COLUMN `facebookConvApiTestCode` VARCHAR(100) NULL,
ADD COLUMN `capiTrackPageView` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `capiTrackViewContent` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `capiTrackAddToCart` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `capiTrackInitiateCheckout` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `capiTrackPurchase` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `capiTrackSearch` BOOLEAN NOT NULL DEFAULT true;

-- ==========================================
-- ⚙️ Advanced Settings
-- ==========================================
ALTER TABLE `storefront_settings` 
ADD COLUMN `eventDeduplicationEnabled` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `eventMatchQualityTarget` INT NOT NULL DEFAULT 8,
ADD COLUMN `gdprCompliant` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `hashUserData` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN `lastPixelTest` DATETIME NULL,
ADD COLUMN `lastCapiTest` DATETIME NULL,
ADD COLUMN `pixelStatus` VARCHAR(50) DEFAULT 'not_configured',
ADD COLUMN `capiStatus` VARCHAR(50) DEFAULT 'not_configured';

-- ==========================================
-- 📊 Add Indexes for Performance
-- ==========================================
CREATE INDEX `idx_storefront_settings_pixel_enabled` ON `storefront_settings`(`facebookPixelEnabled`);
CREATE INDEX `idx_storefront_settings_capi_enabled` ON `storefront_settings`(`facebookConvApiEnabled`);

-- ==========================================
-- ✅ Migration Complete
-- ==========================================
-- Total fields added: 26
-- Indexes added: 2
-- Estimated time: < 1 second for small databases
