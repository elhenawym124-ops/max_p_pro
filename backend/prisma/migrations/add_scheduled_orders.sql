-- Migration: Add Scheduled Orders Feature
-- Date: 2026-01-18
-- Description: Adds fields for scheduled order functionality

-- Step 1: Add new columns
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `scheduledDeliveryDate` DATETIME NULL,
ADD COLUMN IF NOT EXISTS `isScheduled` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS `scheduledNotes` TEXT NULL,
ADD COLUMN IF NOT EXISTS `autoTransitionEnabled` BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS `scheduledTransitionedAt` DATETIME NULL

-- Verify the changes
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'orders' 
-- AND COLUMN_NAME IN ('scheduledDeliveryDate', 'isScheduled', 'scheduledNotes', 'autoTransitionEnabled', 'scheduledTransitionedAt');
