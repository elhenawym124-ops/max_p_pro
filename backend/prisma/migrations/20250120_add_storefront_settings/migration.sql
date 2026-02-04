-- CreateTable
CREATE TABLE `storefront_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    
    -- Quick View Settings
    `quickViewEnabled` BOOLEAN NOT NULL DEFAULT true,
    `quickViewShowAddToCart` BOOLEAN NOT NULL DEFAULT true,
    `quickViewShowWishlist` BOOLEAN NOT NULL DEFAULT true,
    
    -- Product Comparison Settings
    `comparisonEnabled` BOOLEAN NOT NULL DEFAULT true,
    `maxComparisonProducts` INT NOT NULL DEFAULT 4,
    `comparisonShowPrice` BOOLEAN NOT NULL DEFAULT true,
    `comparisonShowSpecs` BOOLEAN NOT NULL DEFAULT true,
    
    -- Wishlist Settings
    `wishlistEnabled` BOOLEAN NOT NULL DEFAULT true,
    `wishlistRequireLogin` BOOLEAN NOT NULL DEFAULT false,
    `wishlistMaxItems` INT NOT NULL DEFAULT 100,
    
    -- Advanced Filters Settings
    `advancedFiltersEnabled` BOOLEAN NOT NULL DEFAULT true,
    `filterByPrice` BOOLEAN NOT NULL DEFAULT true,
    `filterByRating` BOOLEAN NOT NULL DEFAULT true,
    `filterByBrand` BOOLEAN NOT NULL DEFAULT false,
    `filterByAttributes` BOOLEAN NOT NULL DEFAULT true,
    
    -- Reviews & Ratings Settings
    `reviewsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `reviewsRequirePurchase` BOOLEAN NOT NULL DEFAULT false,
    `reviewsModerationEnabled` BOOLEAN NOT NULL DEFAULT true,
    `reviewsShowRating` BOOLEAN NOT NULL DEFAULT true,
    `minRatingToDisplay` INT NOT NULL DEFAULT 1,
    
    -- Countdown Timer Settings
    `countdownEnabled` BOOLEAN NOT NULL DEFAULT true,
    `countdownShowOnProduct` BOOLEAN NOT NULL DEFAULT true,
    `countdownShowOnListing` BOOLEAN NOT NULL DEFAULT false,
    
    -- Back in Stock Settings
    `backInStockEnabled` BOOLEAN NOT NULL DEFAULT true,
    `backInStockNotifyEmail` BOOLEAN NOT NULL DEFAULT true,
    `backInStockNotifySMS` BOOLEAN NOT NULL DEFAULT false,
    
    -- Recently Viewed Settings
    `recentlyViewedEnabled` BOOLEAN NOT NULL DEFAULT true,
    `recentlyViewedCount` INT NOT NULL DEFAULT 8,
    `recentlyViewedDays` INT NOT NULL DEFAULT 30,
    
    -- Image Zoom Settings
    `imageZoomEnabled` BOOLEAN NOT NULL DEFAULT true,
    `imageZoomType` VARCHAR(191) NOT NULL DEFAULT 'hover',
    
    -- Product Videos Settings
    `productVideosEnabled` BOOLEAN NOT NULL DEFAULT true,
    `videoAutoplay` BOOLEAN NOT NULL DEFAULT false,
    `videoShowControls` BOOLEAN NOT NULL DEFAULT true,
    
    -- Size Guide Settings
    `sizeGuideEnabled` BOOLEAN NOT NULL DEFAULT true,
    `sizeGuideShowOnProduct` BOOLEAN NOT NULL DEFAULT true,
    
    -- Social Sharing Settings
    `socialSharingEnabled` BOOLEAN NOT NULL DEFAULT true,
    `shareFacebook` BOOLEAN NOT NULL DEFAULT true,
    `shareTwitter` BOOLEAN NOT NULL DEFAULT true,
    `shareWhatsApp` BOOLEAN NOT NULL DEFAULT true,
    `shareTelegram` BOOLEAN NOT NULL DEFAULT true,
    
    -- Product Badges Settings
    `badgesEnabled` BOOLEAN NOT NULL DEFAULT true,
    `badgeNew` BOOLEAN NOT NULL DEFAULT true,
    `badgeBestSeller` BOOLEAN NOT NULL DEFAULT true,
    `badgeOnSale` BOOLEAN NOT NULL DEFAULT true,
    `badgeOutOfStock` BOOLEAN NOT NULL DEFAULT true,
    
    -- Product Tabs Settings
    `tabsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `tabDescription` BOOLEAN NOT NULL DEFAULT true,
    `tabSpecifications` BOOLEAN NOT NULL DEFAULT true,
    `tabReviews` BOOLEAN NOT NULL DEFAULT true,
    `tabShipping` BOOLEAN NOT NULL DEFAULT true,
    
    -- Sticky Add to Cart Settings
    `stickyAddToCartEnabled` BOOLEAN NOT NULL DEFAULT true,
    `stickyShowOnMobile` BOOLEAN NOT NULL DEFAULT true,
    `stickyShowOnDesktop` BOOLEAN NOT NULL DEFAULT true,
    
    -- SEO Settings
    `seoEnabled` BOOLEAN NOT NULL DEFAULT true,
    `seoMetaDescription` BOOLEAN NOT NULL DEFAULT true,
    `seoStructuredData` BOOLEAN NOT NULL DEFAULT true,
    `seoSitemap` BOOLEAN NOT NULL DEFAULT true,
    `seoOpenGraph` BOOLEAN NOT NULL DEFAULT true,
    
    -- Multi-language Settings
    `multiLanguageEnabled` BOOLEAN NOT NULL DEFAULT false,
    `defaultLanguage` VARCHAR(191) NOT NULL DEFAULT 'ar',
    `supportedLanguages` JSON NULL,
    
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `storefront_settings_companyId_key`(`companyId`),
    INDEX `storefront_settings_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `storefront_settings` ADD CONSTRAINT `storefront_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

