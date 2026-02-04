-- Add taxRate column to hr_settings table
ALTER TABLE `hr_settings` ADD COLUMN `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;
