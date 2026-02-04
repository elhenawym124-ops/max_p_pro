-- Migration: Add Facebook Ads Tables
-- Date: 2025-01-23
-- Description: Add tables for Facebook Ads Management (Campaigns, AdSets, Ads, Insights)

-- Add facebookAdsAccessToken column to companies table
ALTER TABLE `companies` 
ADD COLUMN `facebookAdsAccessToken` TEXT NULL COMMENT 'Facebook Access Token for Ads Management API' AFTER `facebookPixelAccessToken`;

-- Create facebook_ad_accounts table
CREATE TABLE IF NOT EXISTS `facebook_ad_accounts` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `timezone` VARCHAR(191) NULL,
  `accessToken` TEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `settings` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `facebook_ad_accounts_companyId_accountId_key` (`companyId`, `accountId`),
  INDEX `facebook_ad_accounts_companyId_idx` (`companyId`),
  INDEX `facebook_ad_accounts_accountId_idx` (`accountId`),
  CONSTRAINT `facebook_ad_accounts_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create facebook_campaigns table
CREATE TABLE IF NOT EXISTS `facebook_campaigns` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `adAccountId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `objective` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PAUSED',
  `facebookCampaignId` VARCHAR(191) NULL,
  `budgetType` VARCHAR(191) NOT NULL,
  `budgetAmount` DOUBLE NOT NULL,
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `pixelId` VARCHAR(191) NULL,
  `settings` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `lastSyncAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `facebook_campaigns_companyId_idx` (`companyId`),
  INDEX `facebook_campaigns_status_idx` (`status`),
  INDEX `facebook_campaigns_facebookCampaignId_idx` (`facebookCampaignId`),
  INDEX `facebook_campaigns_adAccountId_idx` (`adAccountId`),
  CONSTRAINT `facebook_campaigns_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `facebook_campaigns_adAccountId_fkey` FOREIGN KEY (`adAccountId`) REFERENCES `facebook_ad_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create facebook_adsets table
CREATE TABLE IF NOT EXISTS `facebook_adsets` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PAUSED',
  `facebookAdSetId` VARCHAR(191) NULL,
  `targeting` TEXT NULL,
  `ageMin` INT NULL,
  `ageMax` INT NULL,
  `genders` TEXT NULL,
  `locations` TEXT NULL,
  `interests` TEXT NULL,
  `behaviors` TEXT NULL,
  `customAudiences` TEXT NULL,
  `lookalikeAudiences` TEXT NULL,
  `budgetType` VARCHAR(191) NOT NULL,
  `budgetAmount` DOUBLE NOT NULL,
  `optimizationGoal` VARCHAR(191) NULL,
  `billingEvent` VARCHAR(191) NULL,
  `settings` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `lastSyncAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `facebook_adsets_campaignId_idx` (`campaignId`),
  INDEX `facebook_adsets_status_idx` (`status`),
  INDEX `facebook_adsets_facebookAdSetId_idx` (`facebookAdSetId`),
  CONSTRAINT `facebook_adsets_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `facebook_campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create facebook_ads table
CREATE TABLE IF NOT EXISTS `facebook_ads` (
  `id` VARCHAR(191) NOT NULL,
  `adSetId` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PAUSED',
  `facebookAdId` VARCHAR(191) NULL,
  `creativeType` VARCHAR(191) NOT NULL,
  `primaryText` TEXT NOT NULL,
  `headline` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `callToAction` VARCHAR(191) NULL,
  `imageUrl` VARCHAR(191) NULL,
  `videoUrl` VARCHAR(191) NULL,
  `imageHash` VARCHAR(191) NULL,
  `videoId` VARCHAR(191) NULL,
  `linkUrl` VARCHAR(191) NULL,
  `productId` VARCHAR(191) NULL,
  `creative` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `lastSyncAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `facebook_ads_adSetId_idx` (`adSetId`),
  INDEX `facebook_ads_companyId_idx` (`companyId`),
  INDEX `facebook_ads_status_idx` (`status`),
  INDEX `facebook_ads_facebookAdId_idx` (`facebookAdId`),
  CONSTRAINT `facebook_ads_adSetId_fkey` FOREIGN KEY (`adSetId`) REFERENCES `facebook_adsets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create facebook_ad_insights table
CREATE TABLE IF NOT EXISTS `facebook_ad_insights` (
  `id` VARCHAR(191) NOT NULL,
  `adId` VARCHAR(191) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `impressions` INT NOT NULL DEFAULT 0,
  `clicks` INT NOT NULL DEFAULT 0,
  `ctr` DOUBLE NOT NULL DEFAULT 0,
  `cpc` DOUBLE NOT NULL DEFAULT 0,
  `spend` DOUBLE NOT NULL DEFAULT 0,
  `conversions` INT NOT NULL DEFAULT 0,
  `cpa` DOUBLE NOT NULL DEFAULT 0,
  `reach` INT NOT NULL DEFAULT 0,
  `frequency` DOUBLE NOT NULL DEFAULT 0,
  `linkClicks` INT NOT NULL DEFAULT 0,
  `costPerLinkClick` DOUBLE NOT NULL DEFAULT 0,
  `landingPageViews` INT NOT NULL DEFAULT 0,
  `purchases` INT NOT NULL DEFAULT 0,
  `purchaseValue` DOUBLE NOT NULL DEFAULT 0,
  `roas` DOUBLE NOT NULL DEFAULT 0,
  `breakdown` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `facebook_ad_insights_adId_date_key` (`adId`, `date`),
  INDEX `facebook_ad_insights_adId_idx` (`adId`),
  INDEX `facebook_ad_insights_date_idx` (`date`),
  CONSTRAINT `facebook_ad_insights_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `facebook_ads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

