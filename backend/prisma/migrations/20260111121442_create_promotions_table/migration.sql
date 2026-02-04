-- CreateTable
CREATE TABLE `hr_promotions` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `fromPositionId` VARCHAR(191) NULL,
    `toPositionId` VARCHAR(191) NOT NULL,
    `fromPositionName` VARCHAR(191) NULL,
    `toPositionName` VARCHAR(191) NOT NULL,
    `fromSalary` DECIMAL(12, 2) NULL,
    `toSalary` DECIMAL(12, 2) NULL,
    `promotionDate` DATE NOT NULL,
    `effectiveDate` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `hr_promotions_companyId_idx`(`companyId`),
    INDEX `hr_promotions_employeeId_idx`(`employeeId`),
    INDEX `hr_promotions_promotionDate_idx`(`promotionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hr_promotions` ADD CONSTRAINT `hr_promotions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_promotions` ADD CONSTRAINT `hr_promotions_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `hr_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_promotions` ADD CONSTRAINT `hr_promotions_fromPositionId_fkey` FOREIGN KEY (`fromPositionId`) REFERENCES `hr_positions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_promotions` ADD CONSTRAINT `hr_promotions_toPositionId_fkey` FOREIGN KEY (`toPositionId`) REFERENCES `hr_positions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
