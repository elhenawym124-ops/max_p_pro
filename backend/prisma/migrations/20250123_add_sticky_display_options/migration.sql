-- Add display options for Sticky Add to Cart
ALTER TABLE `storefront_settings` 
ADD COLUMN `stickyShowAddToCartButton` BOOLEAN NOT NULL DEFAULT true COMMENT 'إظهار زر أضف للسلة',
ADD COLUMN `stickyShowQuantity` BOOLEAN NOT NULL DEFAULT true COMMENT 'إظهار اختيار الكمية',
ADD COLUMN `stickyShowProductImage` BOOLEAN NOT NULL DEFAULT true COMMENT 'إظهار صورة المنتج',
ADD COLUMN `stickyShowProductName` BOOLEAN NOT NULL DEFAULT true COMMENT 'إظهار اسم المنتج';

