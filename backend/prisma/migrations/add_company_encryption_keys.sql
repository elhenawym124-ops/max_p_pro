-- Migration: Add Company Encryption Keys Table
-- لتخزين مفاتيح التشفير الخاصة بكل شركة

CREATE TABLE IF NOT EXISTS `company_encryption_keys` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `encryptedKey` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `rotatedAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `company_encryption_keys_companyId_key` (`companyId`),
  INDEX `company_encryption_keys_companyId_idx` (`companyId`),
  
  CONSTRAINT `company_encryption_keys_companyId_fkey` 
    FOREIGN KEY (`companyId`) 
    REFERENCES `companies`(`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
