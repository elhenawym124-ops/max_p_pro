-- Add customDomain field to Company table
ALTER TABLE `Company` ADD COLUMN `customDomain` VARCHAR(191) NULL UNIQUE AFTER `slug`;
