-- Add sizeGuide column to products table
-- Run this SQL directly on your database if migration commands don't work

ALTER TABLE `products` ADD COLUMN `sizeGuide` TEXT NULL COMMENT 'دليل المقاسات';

