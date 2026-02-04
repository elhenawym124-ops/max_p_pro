-- Migration: Add Central Keys Support
-- This migration adds support for central (shared) API keys that can be used by all companies

-- Step 1: Add useCentralKeys column to companies table
ALTER TABLE `companies` 
ADD COLUMN `useCentralKeys` BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Modify gemini_keys table to support central keys
-- First, we need to modify companyId to be nullable
ALTER TABLE `gemini_keys` 
MODIFY COLUMN `companyId` VARCHAR(191) NULL;

-- Step 3: Add keyType column with default value COMPANY
ALTER TABLE `gemini_keys` 
ADD COLUMN `keyType` ENUM('COMPANY', 'CENTRAL') NOT NULL DEFAULT 'COMPANY';

-- Step 4: Update existing keys to have keyType = COMPANY
UPDATE `gemini_keys` 
SET `keyType` = 'COMPANY' 
WHERE `keyType` IS NULL OR `keyType` = '';

-- Step 5: Add index for keyType and isActive for better query performance
CREATE INDEX `gemini_keys_keyType_isActive_idx` ON `gemini_keys`(`keyType`, `isActive`);

-- Step 6: Update foreign key constraint to allow NULL values
-- Note: MySQL requires dropping existing constraint first if it exists
-- Check and drop existing foreign key constraint
SET @constraint_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'gemini_keys' 
  AND CONSTRAINT_NAME = 'gemini_keys_companyId_fkey'
);

SET @sql = IF(@constraint_exists > 0,
  'ALTER TABLE `gemini_keys` DROP FOREIGN KEY `gemini_keys_companyId_fkey`',
  'SELECT "Foreign key constraint does not exist"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Re-add foreign key with ON DELETE CASCADE and allowing NULL
ALTER TABLE `gemini_keys` 
ADD CONSTRAINT `gemini_keys_companyId_fkey` 
FOREIGN KEY (`companyId`) 
REFERENCES `companies`(`id`) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Verification queries (commented out - run manually if needed)
-- SELECT COUNT(*) as total_keys FROM gemini_keys;
-- SELECT COUNT(*) as company_keys FROM gemini_keys WHERE keyType = 'COMPANY';
-- SELECT COUNT(*) as central_keys FROM gemini_keys WHERE keyType = 'CENTRAL';
-- SELECT COUNT(*) as companies_using_central FROM companies WHERE useCentralKeys = true;

