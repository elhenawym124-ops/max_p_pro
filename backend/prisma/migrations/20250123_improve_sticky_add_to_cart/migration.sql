-- Improve Sticky Add to Cart Settings
ALTER TABLE `storefront_settings` 
ADD COLUMN `stickyScrollThreshold` INT NOT NULL DEFAULT 300 COMMENT 'مسافة التمرير قبل الظهور',
ADD COLUMN `stickyShowBuyNow` BOOLEAN NOT NULL DEFAULT true COMMENT 'إظهار زر شراء الآن',
ADD COLUMN `stickyTrackAnalytics` BOOLEAN NOT NULL DEFAULT true COMMENT 'تتبع التحليلات',
ADD COLUMN `stickyAutoScrollToCheckout` BOOLEAN NOT NULL DEFAULT false COMMENT 'التمرير التلقائي لصفحة الشراء';

