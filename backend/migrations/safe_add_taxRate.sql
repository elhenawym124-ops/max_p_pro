-- Safe migration to add taxRate column to hr_settings table
-- This script checks if the column exists before adding it

-- Check if column exists and add it only if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'hr_settings';
SET @columnname = 'taxRate';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT ''Column already exists'' AS message;',
  'ALTER TABLE `hr_settings` ADD COLUMN `taxRate` DECIMAL(5,2) DEFAULT 0.00 NOT NULL;'
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verify the column was added
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  COLUMN_DEFAULT, 
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE 
  TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'hr_settings'
  AND COLUMN_NAME = 'taxRate';
