-- Add taxRate column to hr_settings table
ALTER TABLE `hr_settings` ADD COLUMN `taxRate` DECIMAL(5,2) DEFAULT 0.00 NOT NULL;

-- If you need to rollback
-- ALTER TABLE `hr_settings` DROP COLUMN `taxRate`;
