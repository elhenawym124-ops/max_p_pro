-- Add sale dates to products table
ALTER TABLE `products` 
ADD COLUMN `saleStartDate` DATETIME NULL COMMENT 'تاريخ بداية العرض/الخصم',
ADD COLUMN `saleEndDate` DATETIME NULL COMMENT 'تاريخ انتهاء العرض/الخصم';

