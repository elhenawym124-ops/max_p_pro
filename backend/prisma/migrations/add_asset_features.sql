-- Add new fields to assets table
ALTER TABLE `assets` 
ADD COLUMN `branchId` VARCHAR(191) NULL AFTER `location`,
ADD COLUMN `warrantyStartDate` DATETIME(3) NULL,
ADD COLUMN `warrantyEndDate` DATETIME(3) NULL,
ADD COLUMN `warrantyMonths` INT NULL,
ADD COLUMN `warrantyProvider` VARCHAR(191) NULL,
ADD COLUMN `depreciationMethod` VARCHAR(191) NULL DEFAULT 'STRAIGHT_LINE',
ADD COLUMN `usefulLifeYears` INT NULL DEFAULT 5,
ADD COLUMN `salvageValue` DECIMAL(12,2) NULL,
ADD COLUMN `currentBookValue` DECIMAL(12,2) NULL,
ADD INDEX `assets_branchId_idx` (`branchId`);

-- Create asset_custody_history table
CREATE TABLE `asset_custody_history` (
  `id` VARCHAR(191) NOT NULL,
  `assetId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `assignedBy` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `returnedAt` DATETIME(3) NULL,
  `returnCondition` ENUM('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED') NULL,
  `notes` TEXT NULL,
  `documentUrl` VARCHAR(191) NULL,
  `signatureUrl` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `asset_custody_history_assetId_idx` (`assetId`),
  INDEX `asset_custody_history_userId_idx` (`userId`),
  INDEX `asset_custody_history_assignedBy_idx` (`assignedBy`),
  CONSTRAINT `asset_custody_history_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create asset_requests table
CREATE TABLE `asset_requests` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `assetId` VARCHAR(191) NULL,
  `requestedBy` VARCHAR(191) NOT NULL,
  `assetType` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NULL,
  `reason` TEXT NOT NULL,
  `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `approvedBy` VARCHAR(191) NULL,
  `approvedAt` DATETIME(3) NULL,
  `rejectedBy` VARCHAR(191) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `rejectionReason` TEXT NULL,
  `fulfilledBy` VARCHAR(191) NULL,
  `fulfilledAt` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `asset_requests_companyId_idx` (`companyId`),
  INDEX `asset_requests_assetId_idx` (`assetId`),
  INDEX `asset_requests_requestedBy_idx` (`requestedBy`),
  INDEX `asset_requests_status_idx` (`status`),
  CONSTRAINT `asset_requests_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create asset_audits table
CREATE TABLE `asset_audits` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `assetId` VARCHAR(191) NULL,
  `auditName` VARCHAR(191) NOT NULL,
  `auditDate` DATETIME(3) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'IN_PROGRESS',
  `conductedBy` VARCHAR(191) NOT NULL,
  `assetFound` BOOLEAN NULL,
  `assetCondition` ENUM('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED') NULL,
  `discrepancy` TEXT NULL,
  `notes` TEXT NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `asset_audits_companyId_idx` (`companyId`),
  INDEX `asset_audits_assetId_idx` (`assetId`),
  INDEX `asset_audits_status_idx` (`status`),
  CONSTRAINT `asset_audits_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create asset_attachments table
CREATE TABLE `asset_attachments` (
  `id` VARCHAR(191) NOT NULL,
  `assetId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileUrl` VARCHAR(191) NOT NULL,
  `fileSize` INT NULL,
  `mimeType` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `uploadedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `asset_attachments_assetId_idx` (`assetId`),
  INDEX `asset_attachments_type_idx` (`type`),
  CONSTRAINT `asset_attachments_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
