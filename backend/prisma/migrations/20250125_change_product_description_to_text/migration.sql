-- AlterTable: Change product description from VARCHAR to TEXT to support longer descriptions
ALTER TABLE `products` 
MODIFY COLUMN `description` TEXT NULL;

